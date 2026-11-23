import React, { useEffect, useRef } from 'react';
import { vertexShaderSource, fragmentShaderSource } from '../shaders/fractal';
import { AudioMotion } from '../utils/AudioMotion';
import { Dampener } from '../utils/Dampener';

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
  // 18-Band Psychoacoustic Spectrum & Feature Descriptors
  bands: number[];
  spectralCentroid: number;
  spectralFlatness: number;
  energyFlux: number;
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
  analysisRevision: number;
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
  onRenderFrame?: (canvas: HTMLCanvasElement) => void;
}

export const Visualizer: React.FC<VisualizerProps> = (props) => {
  const internalCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = props.canvasRef || internalCanvasRef;

  const requestRef = useRef<number>(0);
  
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

    const gl = canvas.getContext('webgl', {
      preserveDrawingBuffer: false,
      antialias: false,
      powerPreference: 'high-performance'
    });
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
      u_motion_time: gl.getUniformLocation(program, 'u_motion_time'),
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
      u_bands: gl.getUniformLocation(program, 'u_bands[0]'),
      u_spectral_centroid: gl.getUniformLocation(program, 'u_spectral_centroid'),
      u_spectral_flatness: gl.getUniformLocation(program, 'u_spectral_flatness'),
      u_energy_flux: gl.getUniformLocation(program, 'u_energy_flux'),
      u_beat_kick: gl.getUniformLocation(program, 'u_beat_kick'),
      u_beat_snare: gl.getUniformLocation(program, 'u_beat_snare'),
      u_geometry_mode: gl.getUniformLocation(program, 'u_geometry_mode'),
      u_fx_mode: gl.getUniformLocation(program, 'u_fx_mode'),
      u_kaleidoscope_folds: gl.getUniformLocation(program, 'u_kaleidoscope_folds'),
      u_glow_intensity: gl.getUniformLocation(program, 'u_glow_intensity'),
      u_audio_history: gl.getUniformLocation(program, 'u_audio_history'),
      u_history_offset: gl.getUniformLocation(program, 'u_history_offset'),
      u_kick_waves: gl.getUniformLocation(program, 'u_kick_waves'),
    };

    // 256x64 8-Bit Luminance Audio History Circular Ring Buffer Texture (Power-of-Two WebGL 1.0)
    const historyWidth = 256;
    const historyHeight = 64;
    const audio = new AudioMotion(historyWidth);
    let historyHead = 0;
    let lastHistoryTime = 0;
    const clearHistory = new Uint8Array(historyWidth * historyHeight);
    const previousHistoryRow = new Uint8Array(historyWidth);

    const audioTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, audioTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.LUMINANCE, historyWidth, historyHeight, 0,
      gl.LUMINANCE, gl.UNSIGNED_BYTE, clearHistory
    );

    // Keep frame delivery steady when a scene or recording pushes the GPU.
    let quality = 1;
    let budgetStart = performance.now();
    let budgetFrames = 0;
    let recoveryWindows = 0;

    const handleResize = () => {
      if (canvas && gl) {
        // Limit DPR to 1.0 (no retina rendering) to save fill-rate
        const dpr = Math.min(window.devicePixelRatio || 1, 1.0);
        const rawW = window.innerWidth * dpr;
        const rawH = window.innerHeight * dpr;
        
        // Cap max rendering dimensions to 720p equivalent
        const maxDim = 1280;
        const scale = Math.min(1, maxDim / Math.max(rawW, rawH)) * quality;
        
        const width = Math.max(320, Math.floor(rawW * scale));
        const height = Math.max(240, Math.floor(rawH * scale));
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
          gl.viewport(0, 0, width, height);
        }
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();

    const motionSpeed = new Dampener(propsRef.current.rotSpeed, 5);
    let lastFrameTime = performance.now();
    let lastMetricsEmitTime = 0;
    let motionTime = 0;

    const render = (nowMs: number) => {
      const gl = glRef.current;
      const program = programRef.current;
      const locs = locationsRef.current;
      const currentProps = propsRef.current;
      
      if (!gl || !program) {
        requestRef.current = requestAnimationFrame(render);
        return;
      }

      const frameMs = nowMs - lastFrameTime;
      const dt = Math.min(0.067, Math.max(0, frameMs * 0.001));
      lastFrameTime = nowMs;

      if (!document.hidden && frameMs < 200) budgetFrames++;
      if (nowMs - budgetStart >= 1000) {
        const frameMsAverage = (nowMs - budgetStart) / budgetFrames;
        recoveryWindows = frameMsAverage < 18 ? recoveryWindows + 1 : 0;
        const previousQuality = quality;
        if (!document.hidden && budgetFrames >= 8) {
          if (frameMsAverage > 22) quality = Math.max(0.62, quality * 0.85);
          if (recoveryWindows >= 3) {
            quality = Math.min(1, quality + 0.07);
            recoveryWindows = 0;
          }
        }
        if (quality !== previousQuality) handleResize();
        budgetStart = nowMs;
        budgetFrames = 0;
      }

      motionTime += motionSpeed.update(currentProps.rotSpeed, dt) * dt * 0.7;

      if (canvasRef.current) {
        gl.uniform2f(locs.u_resolution, canvasRef.current.width, canvasRef.current.height);
      }

      const historySteps = audio.update(currentProps.analyser, currentProps.analysisRevision, nowMs, dt, currentProps.sensitivity);
      const bands = audio.bands;
      const smoothedSub = (bands[0] + bands[1]) * 0.5;
      const smoothedKick = (bands[2] + bands[3]) * 0.5;
      const smoothedMid = (bands[6] + bands[7] + bands[8]) / 3;
      const smoothedSnare = (bands[9] + bands[10] + bands[11]) / 3;
      const smoothedPres = (bands[12] + bands[13]) * 0.5;
      const smoothedTreb = (bands[14] + bands[15]) * 0.5;
      const smoothedAir = (bands[16] + bands[17]) * 0.5;
      const smoothedLow = (smoothedSub + smoothedKick) * 0.5;
      const smoothedHigh = smoothedPres * 0.3 + smoothedTreb * 0.4 + smoothedAir * 0.3;

      if (historySteps > 0) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, audioTexture);
        if (historySteps >= historyHeight) {
          gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, historyWidth, historyHeight,
            gl.LUMINANCE, gl.UNSIGNED_BYTE, clearHistory);
          historyHead = (historyHead + historySteps) % historyHeight;
        } else {
          // Hold the last sample in slots skipped by a slow frame.
          for (let i = 1; i < historySteps; i++) {
            historyHead = (historyHead + 1) % historyHeight;
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, historyHead, historyWidth, 1,
              gl.LUMINANCE, gl.UNSIGNED_BYTE, previousHistoryRow);
          }
          historyHead = (historyHead + 1) % historyHeight;
        }
        lastHistoryTime = nowMs;
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, historyHead, historyWidth, 1,
          gl.LUMINANCE, gl.UNSIGNED_BYTE, audio.historyRow);
        previousHistoryRow.set(audio.historyRow);
      }
      // Interpolate older samples as they travel across the surface between texture uploads.
      const historyFraction = Math.min(1, (nowMs - lastHistoryTime) * 0.03);
      gl.uniform1i(locs.u_audio_history, 0);
      gl.uniform1f(locs.u_history_offset, (historyHead + 0.5 + historyFraction) / historyHeight);

      // Broadcast real-time 18-band metrics to isolated subscriber HUDs (~30 FPS)
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
          isKickBeat: audio.kickDetected,
          isSnareBeat: audio.snareDetected,
          kickIntensity: audio.kick,
          snareIntensity: audio.snare,
          bands: Array.from(bands),
          spectralCentroid: audio.centroid,
          spectralFlatness: audio.flatness,
          energyFlux: audio.flux
        };
        audio.kickDetected = false;
        audio.snareDetected = false;
        emitAudioMetrics(metrics);
        if (currentProps.onAudioMetricsUpdate) {
          currentProps.onAudioMetricsUpdate(metrics);
        }
      }

      gl.uniform1f(locs.u_motion_time, motionTime);
      gl.uniform1f(locs.u_zoom, Math.max(0.08, currentProps.zoom));
      gl.uniform2f(locs.u_offset, currentProps.offsetX, currentProps.offsetY);
      gl.uniform2f(locs.u_c, currentProps.juliaC.x, currentProps.juliaC.y);
      gl.uniform1i(locs.u_iterations, currentProps.iterations);
      gl.uniform3f(locs.u_color_base, currentProps.colorBase.h, currentProps.colorBase.s, currentProps.colorBase.l);
      
      gl.uniform1f(locs.u_audio_low, smoothedLow);
      gl.uniform1f(locs.u_audio_mid, smoothedMid);
      gl.uniform1f(locs.u_audio_high, smoothedHigh);
      
      // Pass all continuous legacy metrics
      gl.uniform1f(locs.u_audio_sub, smoothedSub);
      gl.uniform1f(locs.u_audio_kick, smoothedKick);
      gl.uniform1f(locs.u_audio_snare, smoothedSnare);
      gl.uniform1f(locs.u_audio_pres, smoothedPres);
      gl.uniform1f(locs.u_audio_treb, smoothedTreb);
      gl.uniform1f(locs.u_audio_air, smoothedAir);

      // Pass 18-band Mel spectrum & high-level acoustic descriptors
      if (locs.u_bands) {
        gl.uniform1fv(locs.u_bands, bands);
      }
      if (locs.u_spectral_centroid) {
        gl.uniform1f(locs.u_spectral_centroid, audio.centroid);
      }
      if (locs.u_spectral_flatness) {
        gl.uniform1f(locs.u_spectral_flatness, audio.flatness);
      }
      if (locs.u_energy_flux) {
        gl.uniform1f(locs.u_energy_flux, audio.flux);
      }

      gl.uniform1f(locs.u_beat_kick, audio.kick);
      gl.uniform1f(locs.u_beat_snare, audio.snare);
      gl.uniform4fv(locs.u_kick_waves, audio.kickWaves);

      gl.uniform1i(locs.u_geometry_mode, currentProps.geometryMode);
      gl.uniform1i(locs.u_fx_mode, currentProps.fxMode);
      gl.uniform1f(locs.u_kaleidoscope_folds, currentProps.kaleidoscopeFolds);
      gl.uniform1f(locs.u_glow_intensity, currentProps.glowIntensity);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      if (propsRef.current.onRenderFrame && canvasRef.current) {
        propsRef.current.onRenderFrame(canvasRef.current);
      }
      
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
        if (audioTexture) gl.deleteTexture(audioTexture);
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
