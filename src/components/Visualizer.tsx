import React, { useEffect, useRef } from 'react';
import { vertexShaderSource, fragmentShaderSource } from '../shaders/fractal';

export interface AudioMetrics {
  sub: number;
  kick: number;
  lowMid: number;
  snare: number;
  presence: number;
  treble: number;
  air: number;
  isKickBeat: boolean;
  isSnareBeat: boolean;
  kickIntensity: number;
  snareIntensity: number;
}

interface VisualizerProps {
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
  analyser: AnalyserNode | null;
  zoom: number;
  offsetX: number;
  offsetY: number;
  iterations: number;
  colorBase: { h: number; s: number; l: number };
  juliaC: { x: number; y: number };
  sensitivity: number;
  geometryMode: number;
  fxMode: number;
  kaleidoscopeFolds: number;
  rotSpeed: number;
  glowIntensity: number;
  onAudioMetricsUpdate?: (metrics: AudioMetrics) => void;
}

export const Visualizer: React.FC<VisualizerProps> = (props) => {
  const internalCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = props.canvasRef || internalCanvasRef;

  const requestRef = useRef<number>(0);
  const startTimeRef = useRef<number>(Date.now());
  
  const propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
  }, [props]);

  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const locationsRef = useRef<Record<string, WebGLUniformLocation | null>>({});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }
    glRef.current = gl;

    const createShader = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return;
    }
    
    gl.useProgram(program);
    programRef.current = program;

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    locationsRef.current = {
      u_resolution: gl.getUniformLocation(program, 'u_resolution'),
      u_time: gl.getUniformLocation(program, 'u_time'),
      u_zoom: gl.getUniformLocation(program, 'u_zoom'),
      u_offset: gl.getUniformLocation(program, 'u_offset'),
      u_c: gl.getUniformLocation(program, 'u_c'),
      u_iterations: gl.getUniformLocation(program, 'u_iterations'),
      u_color_base: gl.getUniformLocation(program, 'u_color_base'),
      u_audio_low: gl.getUniformLocation(program, 'u_audio_low'),
      u_audio_mid: gl.getUniformLocation(program, 'u_audio_mid'),
      u_audio_high: gl.getUniformLocation(program, 'u_audio_high'),
      u_audio_sub: gl.getUniformLocation(program, 'u_audio_sub'),
      u_audio_snare: gl.getUniformLocation(program, 'u_audio_snare'),
      u_beat_kick: gl.getUniformLocation(program, 'u_beat_kick'),
      u_beat_snare: gl.getUniformLocation(program, 'u_beat_snare'),
      u_geometry_mode: gl.getUniformLocation(program, 'u_geometry_mode'),
      u_fx_mode: gl.getUniformLocation(program, 'u_fx_mode'),
      u_kaleidoscope_folds: gl.getUniformLocation(program, 'u_kaleidoscope_folds'),
      u_rot_speed: gl.getUniformLocation(program, 'u_rot_speed'),
      u_glow_intensity: gl.getUniformLocation(program, 'u_glow_intensity'),
    };

    const handleResize = () => {
      if (canvas && gl) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();

    let dataArray: Uint8Array | null = null;
    let smoothedLow = 0, smoothedMid = 0, smoothedHigh = 0;
    let smoothedSub = 0, smoothedSnare = 0;
    
    let kickTrigger = 0;
    let snareTrigger = 0;

    const HISTORY_SIZE = 43;
    const historySub: number[] = new Array(HISTORY_SIZE).fill(0);
    const historySnare: number[] = new Array(HISTORY_SIZE).fill(0);
    let historyIdx = 0;

    let lastKickTime = 0;
    let lastSnareTime = 0;

    const render = () => {
      const gl = glRef.current;
      const program = programRef.current;
      const locs = locationsRef.current;
      const currentProps = propsRef.current;
      
      if (!gl || !program) {
        requestRef.current = requestAnimationFrame(render);
        return;
      }

      const time = (Date.now() - startTimeRef.current) * 0.001;
      const nowMs = Date.now();
      
      if (canvasRef.current) {
        gl.uniform2f(locs.u_resolution, canvasRef.current.width, canvasRef.current.height);
      }

      let subVal = 0, kickVal = 0, lowMidVal = 0, snareVal = 0, presVal = 0, trebVal = 0, airVal = 0;
      let isKickBeat = false, isSnareBeat = false;

      if (currentProps.analyser) {
        if (!dataArray || dataArray.length !== currentProps.analyser.frequencyBinCount) {
          dataArray = new Uint8Array(currentProps.analyser.frequencyBinCount);
        }
        currentProps.analyser.getByteFrequencyData(dataArray);

        let subSum = 0, kickSum = 0, lowMidSum = 0, snareSum = 0, presSum = 0, trebSum = 0, airSum = 0;

        for (let i = 1; i < 930; i++) {
          const val = Math.pow(dataArray[i] / 255.0, 1.4);

          if (i <= 3) subSum += val;
          else if (i <= 7) kickSum += val;
          else if (i <= 23) lowMidSum += val;
          else if (i <= 93) snareSum += val;
          else if (i <= 232) presSum += val;
          else if (i <= 465) trebSum += val;
          else if (i <= 930) airSum += val;
        }

        subVal = (subSum / 3) * currentProps.sensitivity;
        kickVal = (kickSum / 4) * currentProps.sensitivity;
        lowMidVal = (lowMidSum / 16) * currentProps.sensitivity;
        snareVal = (snareSum / 70) * currentProps.sensitivity;
        presVal = (presSum / 139) * currentProps.sensitivity;
        trebVal = (trebSum / 233) * currentProps.sensitivity;
        airVal = (airSum / 465) * currentProps.sensitivity;

        const avgSub = historySub.reduce((a, b) => a + b, 0) / HISTORY_SIZE;
        const avgSnare = historySnare.reduce((a, b) => a + b, 0) / HISTORY_SIZE;

        historySub[historyIdx] = subVal + kickVal;
        historySnare[historyIdx] = snareSum;
        historyIdx = (historyIdx + 1) % HISTORY_SIZE;

        if ((subVal + kickVal) > Math.max(0.15, avgSub * 1.45) && (nowMs - lastKickTime > 180)) {
          isKickBeat = true;
          kickTrigger = 1.0;
          lastKickTime = nowMs;
        }

        if ((snareVal + presVal) > Math.max(0.12, avgSnare * 1.55) && (nowMs - lastSnareTime > 140)) {
          isSnareBeat = true;
          snareTrigger = 1.0;
          lastSnareTime = nowMs;
        }
      }

      kickTrigger *= 0.88;
      snareTrigger *= 0.88;

      const targetLow = (subVal * 0.5 + kickVal * 0.5);
      const targetMid = (lowMidVal * 0.4 + snareVal * 0.6);
      const targetHigh = (presVal * 0.3 + trebVal * 0.4 + airVal * 0.3);

      smoothedLow += (targetLow - smoothedLow) * 0.2;
      smoothedMid += (targetMid - smoothedMid) * 0.2;
      smoothedHigh += (targetHigh - smoothedHigh) * 0.2;
      smoothedSub += (subVal - smoothedSub) * 0.2;
      smoothedSnare += (snareVal - smoothedSnare) * 0.2;

      if (currentProps.onAudioMetricsUpdate) {
        currentProps.onAudioMetricsUpdate({
          sub: smoothedSub,
          kick: kickVal,
          lowMid: lowMidVal,
          snare: smoothedSnare,
          presence: presVal,
          treble: trebVal,
          air: airVal,
          isKickBeat,
          isSnareBeat,
          kickIntensity: kickTrigger,
          snareIntensity: snareTrigger
        });
      }

      gl.uniform1f(locs.u_time, time);
      gl.uniform1f(locs.u_zoom, currentProps.zoom);
      gl.uniform2f(locs.u_offset, currentProps.offsetX, currentProps.offsetY);
      gl.uniform2f(locs.u_c, currentProps.juliaC.x, currentProps.juliaC.y);
      gl.uniform1i(locs.u_iterations, currentProps.iterations);
      gl.uniform3f(locs.u_color_base, currentProps.colorBase.h, currentProps.colorBase.s, currentProps.colorBase.l);
      
      gl.uniform1f(locs.u_audio_low, smoothedLow);
      gl.uniform1f(locs.u_audio_mid, smoothedMid);
      gl.uniform1f(locs.u_audio_high, smoothedHigh);
      gl.uniform1f(locs.u_audio_sub, smoothedSub);
      gl.uniform1f(locs.u_audio_snare, smoothedSnare);
      gl.uniform1f(locs.u_beat_kick, kickTrigger);
      gl.uniform1f(locs.u_beat_snare, snareTrigger);

      gl.uniform1i(locs.u_geometry_mode, currentProps.geometryMode);
      gl.uniform1i(locs.u_fx_mode, currentProps.fxMode);
      gl.uniform1f(locs.u_kaleidoscope_folds, currentProps.kaleidoscopeFolds);
      gl.uniform1f(locs.u_rot_speed, currentProps.rotSpeed);
      gl.uniform1f(locs.u_glow_intensity, currentProps.glowIntensity);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      
      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(requestRef.current);
    };
  }, [canvasRef]);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed top-0 left-0 w-full h-full -z-10"
    />
  );
};
