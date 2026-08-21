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

// Lightweight listener subscription system to avoid root React state re-rendering
type AudioMetricsCallback = (metrics: AudioMetrics) => void;
const audioMetricsListeners = new Set<AudioMetricsCallback>();

export const subscribeAudioMetrics = (callback: AudioMetricsCallback) => {
  audioMetricsListeners.add(callback);
  return () => {
    audioMetricsListeners.delete(callback);
  };
};

export const emitAudioMetrics = (metrics: AudioMetrics) => {
  audioMetricsListeners.forEach((fn) => fn(metrics));
};

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
      u_audio_time: gl.getUniformLocation(program, 'u_audio_time'),
      u_zoom: gl.getUniformLocation(program, 'u_zoom'),
      u_offset: gl.getUniformLocation(program, 'u_offset'),
      u_c: gl.getUniformLocation(program, 'u_c'),
      u_iterations: gl.getUniformLocation(program, 'u_iterations'),
      u_color_base: gl.getUniformLocation(program, 'u_color_base'),
      u_audio_low: gl.getUniformLocation(program, 'u_audio_low'),
      u_audio_mid: gl.getUniformLocation(program, 'u_audio_mid'),
      u_audio_high: gl.getUniformLocation(program, 'u_audio_high'),
      u_audio_sub: gl.getUniformLocation(program, 'u_audio_sub'),
      u_audio_kick: gl.getUniformLocation(program, 'u_audio_kick'),
      u_audio_snare: gl.getUniformLocation(program, 'u_audio_snare'),
      u_audio_pres: gl.getUniformLocation(program, 'u_audio_pres'),
      u_audio_treb: gl.getUniformLocation(program, 'u_audio_treb'),
      u_audio_air: gl.getUniformLocation(program, 'u_audio_air'),
      u_beat_kick: gl.getUniformLocation(program, 'u_beat_kick'),
      u_beat_snare: gl.getUniformLocation(program, 'u_beat_snare'),
      u_geometry_mode: gl.getUniformLocation(program, 'u_geometry_mode'),
      u_fx_mode: gl.getUniformLocation(program, 'u_fx_mode'),
      u_kaleidoscope_folds: gl.getUniformLocation(program, 'u_kaleidoscope_folds'),
      u_rot_speed: gl.getUniformLocation(program, 'u_rot_speed'),
      u_glow_intensity: gl.getUniformLocation(program, 'u_glow_intensity'),
    };

    // DPR Clamping to prevent GPU fill-rate exhaustion on 4K / Retina screens
    const handleResize = () => {
      if (canvas && gl) {
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        canvas.width = Math.floor(window.innerWidth * dpr);
        canvas.height = Math.floor(window.innerHeight * dpr);
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();

    let dataArray: Uint8Array | null = null;
    let prevDataArray: Uint8Array | null = null;
    let smoothedLow = 0, smoothedMid = 0, smoothedHigh = 0;
    let smoothedSub = 0, smoothedKick = 0, smoothedSnare = 0, smoothedPres = 0, smoothedTreb = 0, smoothedAir = 0;
    
    let kickTrigger = 0;
    let snareTrigger = 0;
    let kickFluxMean = 0.05;
    let snareFluxMean = 0.05;

    let lastKickTime = 0;
    let lastSnareTime = 0;
    let lastFrameTime = performance.now();
    let lastMetricsEmitTime = 0;
    let audioTime = 0;

    const render = () => {
      const gl = glRef.current;
      const program = programRef.current;
      const locs = locationsRef.current;
      const currentProps = propsRef.current;
      
      if (!gl || !program) {
        requestRef.current = requestAnimationFrame(render);
        return;
      }

      const nowMs = performance.now();
      const dt = Math.min(0.1, Math.max(0.001, (nowMs - lastFrameTime) * 0.001));
      lastFrameTime = nowMs;

      const time = (Date.now() - startTimeRef.current) * 0.001;
      
      if (canvasRef.current) {
        gl.uniform2f(locs.u_resolution, canvasRef.current.width, canvasRef.current.height);
      }

      let subVal = 0, kickVal = 0, lowMidVal = 0, snareVal = 0, presVal = 0, trebVal = 0, airVal = 0;
      let isKickBeat = false, isSnareBeat = false;

      if (currentProps.analyser) {
        if (!dataArray || dataArray.length !== currentProps.analyser.frequencyBinCount) {
          dataArray = new Uint8Array(currentProps.analyser.frequencyBinCount);
          prevDataArray = new Uint8Array(currentProps.analyser.frequencyBinCount);
        }
        currentProps.analyser.getByteFrequencyData(dataArray);

        let subSum = 0, kickSum = 0, lowMidSum = 0, snareSum = 0, presSum = 0, trebSum = 0, airSum = 0;
        let kickFlux = 0;
        let snareFlux = 0;
        const inv255 = 1.0 / 255.0;

        // Sub-bass (Bins 1..3)
        for (let i = 1; i <= 3; i++) {
          const rawVal = dataArray[i] * inv255;
          const val = rawVal * (0.85 + 0.15 * rawVal);
          const flux = Math.max(0, rawVal - (prevDataArray ? prevDataArray[i] * inv255 : 0));
          subSum += val;
          kickFlux += flux * 1.6;
        }

        // Kick Punch (Bins 4..12)
        for (let i = 4; i <= 12; i++) {
          const rawVal = dataArray[i] * inv255;
          const val = rawVal * (0.85 + 0.15 * rawVal);
          const flux = Math.max(0, rawVal - (prevDataArray ? prevDataArray[i] * inv255 : 0));
          kickSum += val;
          kickFlux += flux * 1.2;
        }

        // Low Mids (Bins 13..38)
        for (let i = 13; i <= 38; i++) {
          const rawVal = dataArray[i] * inv255;
          lowMidSum += rawVal * (0.85 + 0.15 * rawVal);
        }

        // Snare Attack & Body (Bins 39..116)
        for (let i = 39; i <= 116; i++) {
          const rawVal = dataArray[i] * inv255;
          const val = rawVal * (0.85 + 0.15 * rawVal);
          const flux = Math.max(0, rawVal - (prevDataArray ? prevDataArray[i] * inv255 : 0));
          snareSum += val;
          snareFlux += flux * 1.3;
        }

        // Presence (Bins 117..278 - sampled with step 2 for performance)
        for (let i = 117; i <= 278; i += 2) {
          const rawVal = dataArray[i] * inv255;
          const val = rawVal * (0.85 + 0.15 * rawVal);
          const flux = Math.max(0, rawVal - (prevDataArray ? prevDataArray[i] * inv255 : 0));
          presSum += val * 2.0;
          snareFlux += flux * 1.6;
        }

        // Treble (Bins 279..557 - sampled with step 2)
        for (let i = 279; i <= 557; i += 2) {
          const rawVal = dataArray[i] * inv255;
          trebSum += rawVal * (0.85 + 0.15 * rawVal) * 2.0;
        }

        // Air / Brilliance (Bins 558..930 - sampled with step 3)
        for (let i = 558; i <= 930; i += 3) {
          const rawVal = dataArray[i] * inv255;
          airSum += rawVal * (0.85 + 0.15 * rawVal) * 3.0;
        }

        if (prevDataArray && dataArray) {
          prevDataArray.set(dataArray);
        }

        const gain = currentProps.sensitivity * 0.45;
        subVal = (subSum / 3.0) * gain;
        kickVal = (kickSum / 9.0) * gain;
        lowMidVal = (lowMidSum / 26.0) * gain * 1.1;
        snareVal = (snareSum / 78.0) * gain * 1.25;
        presVal = (presSum / 162.0) * gain * 1.45;
        trebVal = (trebSum / 279.0) * gain * 1.75;
        airVal = (airSum / 373.0) * gain * 2.1;

        // Spectral Flux Adaptive Onset Detection (Acoustic Transient Tracking)
        kickFluxMean = kickFluxMean * 0.88 + kickFlux * 0.12;
        snareFluxMean = snareFluxMean * 0.88 + snareFlux * 0.12;

        const kickMinThreshold = Math.max(0.12, (kickFluxMean * 1.4) / Math.max(0.25, currentProps.sensitivity));
        const snareMinThreshold = Math.max(0.09, (snareFluxMean * 1.4) / Math.max(0.25, currentProps.sensitivity));

        if (kickFlux > kickMinThreshold && (nowMs - lastKickTime > 110)) {
          isKickBeat = true;
          kickTrigger = 1.0;
          lastKickTime = nowMs;
        }

        if (snareFlux > snareMinThreshold && (nowMs - lastSnareTime > 90)) {
          isSnareBeat = true;
          snareTrigger = 1.0;
          lastSnareTime = nowMs;
        }
      }

      // Delta-time independent exponential decay on transient beat triggers
      kickTrigger *= Math.exp(-9.5 * dt);
      snareTrigger *= Math.exp(-9.5 * dt);

      // Dynamic targets for all 7 frequency bands
      const targetSub = Math.min(1.3, subVal);
      const targetKick = Math.min(1.3, kickVal);
      const targetMid = Math.min(1.3, lowMidVal);
      const targetSnare = Math.min(1.3, snareVal);
      const targetPres = Math.min(1.3, presVal);
      const targetTreb = Math.min(1.3, trebVal);
      const targetAir = Math.min(1.3, airVal);

      // Frame-rate independent dual-speed exponential smoothing (Instant Attack + Liquid Decay)
      const expLerp = (cur: number, target: number, attackRate = 34.0, decayRate = 6.8) => {
        const rate = target > cur ? attackRate : decayRate;
        return cur + (target - cur) * (1.0 - Math.exp(-rate * dt));
      };

      smoothedSub = expLerp(smoothedSub, targetSub, 36.0, 5.8);
      smoothedKick = expLerp(smoothedKick, targetKick, 34.0, 6.2);
      smoothedMid = expLerp(smoothedMid, targetMid, 30.0, 6.8);
      smoothedSnare = expLerp(smoothedSnare, targetSnare, 32.0, 6.8);
      smoothedPres = expLerp(smoothedPres, targetPres, 28.0, 7.2);
      smoothedTreb = expLerp(smoothedTreb, targetTreb, 28.0, 7.2);
      smoothedAir = expLerp(smoothedAir, targetAir, 28.0, 7.2);

      smoothedLow = (smoothedSub * 0.5 + smoothedKick * 0.5);
      smoothedHigh = (smoothedPres * 0.3 + smoothedTreb * 0.4 + smoothedAir * 0.3);

      // Kinetic Audio Momentum / Phase Velocity Accumulator
      const kineticVelocity = 0.8 + smoothedKick * 1.8 + smoothedSub * 1.2 + kickTrigger * 0.8;
      audioTime += kineticVelocity * dt * currentProps.rotSpeed;

      // Broadcast real-time audio metrics to isolated subscriber HUDs (~30 FPS)
      if (nowMs - lastMetricsEmitTime >= 33) {
        lastMetricsEmitTime = nowMs;
        const metrics: AudioMetrics = {
          sub: smoothedSub,
          kick: smoothedKick,
          lowMid: smoothedMid,
          snare: smoothedSnare,
          presence: smoothedPres,
          treble: smoothedTreb,
          air: smoothedAir,
          isKickBeat,
          isSnareBeat,
          kickIntensity: kickTrigger,
          snareIntensity: snareTrigger
        };
        emitAudioMetrics(metrics);
        if (currentProps.onAudioMetricsUpdate) {
          currentProps.onAudioMetricsUpdate(metrics);
        }
      }

      gl.uniform1f(locs.u_time, time);
      gl.uniform1f(locs.u_audio_time, audioTime);
      gl.uniform1f(locs.u_zoom, currentProps.zoom);
      gl.uniform2f(locs.u_offset, currentProps.offsetX, currentProps.offsetY);
      gl.uniform2f(locs.u_c, currentProps.juliaC.x, currentProps.juliaC.y);
      gl.uniform1i(locs.u_iterations, currentProps.iterations);
      gl.uniform3f(locs.u_color_base, currentProps.colorBase.h, currentProps.colorBase.s, currentProps.colorBase.l);
      
      gl.uniform1f(locs.u_audio_low, smoothedLow);
      gl.uniform1f(locs.u_audio_mid, smoothedMid);
      gl.uniform1f(locs.u_audio_high, smoothedHigh);
      
      // Pass all 7 continuous metrics to WebGL shader
      gl.uniform1f(locs.u_audio_sub, smoothedSub);
      gl.uniform1f(locs.u_audio_kick, smoothedKick);
      gl.uniform1f(locs.u_audio_snare, smoothedSnare);
      gl.uniform1f(locs.u_audio_pres, smoothedPres);
      gl.uniform1f(locs.u_audio_treb, smoothedTreb);
      gl.uniform1f(locs.u_audio_air, smoothedAir);

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

    // Complete WebGL Context Cleanup & Resource Deallocation on Unmount
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(requestRef.current);
      if (gl) {
        if (programRef.current) {
          if (vertexShader) gl.detachShader(programRef.current, vertexShader);
          if (fragmentShader) gl.detachShader(programRef.current, fragmentShader);
          gl.deleteProgram(programRef.current);
          programRef.current = null;
        }
        if (vertexShader) gl.deleteShader(vertexShader);
        if (fragmentShader) gl.deleteShader(fragmentShader);
        if (positionBuffer) gl.deleteBuffer(positionBuffer);
      }
    };
  }, [canvasRef]);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed top-0 left-0 w-full h-full -z-10"
    />
  );
};
