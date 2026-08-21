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
  // 18-Band Psychoacoustic Spectrum & Feature Descriptors
  bands: number[];
  spectralCentroid: number;
  spectralFlatness: number;
  energyFlux: number;
}

// 18 ISO/Mel-Spaced Frequency Bands with Custom Ballistics & Acoustic Weights
const BAND_DEFINITIONS = [
  { name: 'Sub 1', start: 1, end: 2, attack: 38.0, decay: 5.5, weight: 1.4 },      // 20-45 Hz
  { name: 'Sub 2', start: 3, end: 4, attack: 38.0, decay: 5.8, weight: 1.3 },      // 45-85 Hz
  { name: 'Kick 1', start: 5, end: 6, attack: 44.0, decay: 6.2, weight: 1.25 },    // 85-130 Hz
  { name: 'Kick 2', start: 7, end: 9, attack: 44.0, decay: 6.5, weight: 1.2 },     // 130-195 Hz
  { name: 'Bass Low', start: 10, end: 13, attack: 36.0, decay: 6.8, weight: 1.15 }, // 195-280 Hz
  { name: 'Bass Mid', start: 14, end: 19, attack: 34.0, decay: 7.0, weight: 1.1 },  // 280-410 Hz
  { name: 'Mid Low', start: 20, end: 27, attack: 32.0, decay: 7.2, weight: 1.1 },   // 410-580 Hz
  { name: 'Mid Warmth', start: 28, end: 38, attack: 32.0, decay: 7.2, weight: 1.15 },// 580-820 Hz
  { name: 'Snare Body', start: 39, end: 54, attack: 42.0, decay: 7.5, weight: 1.2 }, // 820-1.16 kHz
  { name: 'Vocal Low', start: 55, end: 77, attack: 34.0, decay: 7.5, weight: 1.25 },// 1.16-1.65 kHz
  { name: 'Vocal Mid', start: 78, end: 110, attack: 34.0, decay: 7.8, weight: 1.35 },// 1.65-2.37 kHz
  { name: 'Snare Snap', start: 111, end: 155, attack: 42.0, decay: 7.8, weight: 1.45 },// 2.37-3.34 kHz
  { name: 'Pres Low', start: 156, end: 220, attack: 30.0, decay: 8.0, weight: 1.55 }, // 3.34-4.74 kHz
  { name: 'Pres High', start: 221, end: 310, attack: 30.0, decay: 8.0, weight: 1.7 }, // 4.74-6.68 kHz
  { name: 'Treb Low', start: 311, end: 440, attack: 28.0, decay: 8.2, weight: 1.85 }, // 6.68-9.47 kHz
  { name: 'Treb High', start: 441, end: 620, attack: 28.0, decay: 8.5, weight: 2.05 }, // 9.47-13.35 kHz
  { name: 'Air Low', start: 621, end: 775, attack: 26.0, decay: 8.8, weight: 2.3 },   // 13.35-16.7 kHz
  { name: 'Air High', start: 776, end: 930, attack: 26.0, decay: 9.0, weight: 2.6 }   // 16.7-20.0 kHz
];

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
      u_bands: gl.getUniformLocation(program, 'u_bands'),
      u_spectral_centroid: gl.getUniformLocation(program, 'u_spectral_centroid'),
      u_spectral_flatness: gl.getUniformLocation(program, 'u_spectral_flatness'),
      u_energy_flux: gl.getUniformLocation(program, 'u_energy_flux'),
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
    
    // 18-Band Envelope Followers & Feature Trackers
    const smoothedBands = new Float32Array(18);
    let smoothedCentroid = 0.3;
    let smoothedFlatness = 0.2;
    let smoothedFlux = 0.0;
    
    let kickTrigger = 0;
    let snareTrigger = 0;
    let kickFluxMean = 0.05;
    let snareFluxMean = 0.05;

    // AGC (Automatic Gain Control) Dynamic Floor/Peak Normalizer
    let agcPeak = 0.40;
    let agcFloor = 0.01;

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

      let isKickBeat = false, isSnareBeat = false;
      const rawBands = new Float32Array(18);

      if (currentProps.analyser) {
        if (!dataArray || dataArray.length !== currentProps.analyser.frequencyBinCount) {
          dataArray = new Uint8Array(currentProps.analyser.frequencyBinCount);
          prevDataArray = new Uint8Array(currentProps.analyser.frequencyBinCount);
        }
        currentProps.analyser.getByteFrequencyData(dataArray);

        const inv255 = 1.0 / 255.0;
        let weightedFreqSum = 0;
        let totalEnergySum = 0;
        let logEnergySum = 0;
        let totalSpectralFlux = 0;
        let activeBinCount = 0;

        let kickFlux = 0;
        let snareFlux = 0;

        // 1. Calculate 18-Band Mel Energies & Spectral Descriptors
        for (let b = 0; b < 18; b++) {
          const def = BAND_DEFINITIONS[b];
          let bandEnergy = 0;
          const count = (def.end - def.start + 1);

          for (let i = def.start; i <= def.end; i++) {
            const rawVal = dataArray[i] * inv255;
            const val = rawVal * (0.85 + 0.15 * rawVal);
            bandEnergy += val;

            const prevRaw = prevDataArray ? prevDataArray[i] * inv255 : 0;
            const binFlux = Math.max(0, rawVal - prevRaw);
            totalSpectralFlux += binFlux;

            // Kick flux in Bands 1..3
            if (b >= 1 && b <= 3) {
              kickFlux += binFlux * 1.4;
            }
            // Snare flux in Bands 8..11
            if (b >= 8 && b <= 11) {
              snareFlux += binFlux * 1.3;
            }

            // Spectral Centroid & Flatness accumulators
            weightedFreqSum += i * rawVal;
            totalEnergySum += rawVal;
            logEnergySum += Math.log(Math.max(1e-5, rawVal));
            activeBinCount++;
          }

          rawBands[b] = (bandEnergy / count) * def.weight;
        }

        if (prevDataArray && dataArray) {
          prevDataArray.set(dataArray);
        }

        // 2. Dynamic Auto-Gain Control (AGC) with smooth rolling window
        const frameRms = totalEnergySum / Math.max(1, activeBinCount);
        agcPeak = Math.max(0.12, Math.max(agcPeak * 0.9988, frameRms));
        agcFloor = Math.min(agcFloor * 1.0015, frameRms * 0.4);
        const dynamicSpread = Math.max(0.06, agcPeak - agcFloor);
        const agcMultiplier = Math.min(3.8, 0.40 / dynamicSpread) * (currentProps.sensitivity * 0.5);

        // Apply AGC to 18 bands
        for (let b = 0; b < 18; b++) {
          rawBands[b] = Math.min(1.4, rawBands[b] * agcMultiplier);
        }

        // 3. Timbral Feature Extraction
        // Spectral Centroid (Normalized 0..1 mass balance)
        const targetCentroid = totalEnergySum > 0.01 
          ? Math.min(1.0, (weightedFreqSum / totalEnergySum) / 280.0) 
          : 0.25;
        smoothedCentroid += (targetCentroid - smoothedCentroid) * (1.0 - Math.exp(-12.0 * dt));

        // Spectral Flatness (Wiener entropy: tonality vs noise)
        const geomMean = Math.exp(logEnergySum / Math.max(1, activeBinCount));
        const arithMean = totalEnergySum / Math.max(1, activeBinCount);
        const targetFlatness = arithMean > 0.005 ? Math.min(1.0, geomMean / arithMean) : 0.15;
        smoothedFlatness += (targetFlatness - smoothedFlatness) * (1.0 - Math.exp(-14.0 * dt));

        // Spectral Flux transient energy
        smoothedFlux += (totalSpectralFlux * 0.08 - smoothedFlux) * (1.0 - Math.exp(-24.0 * dt));

        // 4. Adaptive Transient Beat Triggers
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

      // 5. Multi-Rate Exponential Envelope Followers per Band
      for (let b = 0; b < 18; b++) {
        const def = BAND_DEFINITIONS[b];
        const target = rawBands[b];
        const cur = smoothedBands[b];
        const rate = target > cur ? def.attack : def.decay;
        smoothedBands[b] = cur + (target - cur) * (1.0 - Math.exp(-rate * dt));
      }

      // Composite backwards-compatible legacy bands
      const smoothedSub = (smoothedBands[0] + smoothedBands[1]) * 0.5;
      const smoothedKick = (smoothedBands[2] + smoothedBands[3]) * 0.5;
      const smoothedMid = (smoothedBands[6] + smoothedBands[7] + smoothedBands[8]) / 3.0;
      const smoothedSnare = (smoothedBands[9] + smoothedBands[10] + smoothedBands[11]) / 3.0;
      const smoothedPres = (smoothedBands[12] + smoothedBands[13]) * 0.5;
      const smoothedTreb = (smoothedBands[14] + smoothedBands[15]) * 0.5;
      const smoothedAir = (smoothedBands[16] + smoothedBands[17]) * 0.5;

      const smoothedLow = (smoothedSub * 0.5 + smoothedKick * 0.5);
      const smoothedHigh = (smoothedPres * 0.3 + smoothedTreb * 0.4 + smoothedAir * 0.3);

      // Kinetic Audio Momentum / Phase Velocity Accumulator
      const kineticVelocity = 0.8 + smoothedKick * 1.8 + smoothedSub * 1.2 + kickTrigger * 0.8;
      audioTime += kineticVelocity * dt * currentProps.rotSpeed;

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
          isKickBeat,
          isSnareBeat,
          kickIntensity: kickTrigger,
          snareIntensity: snareTrigger,
          bands: Array.from(smoothedBands),
          spectralCentroid: smoothedCentroid,
          spectralFlatness: smoothedFlatness,
          energyFlux: smoothedFlux
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
      
      // Pass all continuous legacy metrics
      gl.uniform1f(locs.u_audio_sub, smoothedSub);
      gl.uniform1f(locs.u_audio_kick, smoothedKick);
      gl.uniform1f(locs.u_audio_snare, smoothedSnare);
      gl.uniform1f(locs.u_audio_pres, smoothedPres);
      gl.uniform1f(locs.u_audio_treb, smoothedTreb);
      gl.uniform1f(locs.u_audio_air, smoothedAir);

      // Pass 18-band Mel spectrum & high-level acoustic descriptors
      if (locs.u_bands) {
        gl.uniform1fv(locs.u_bands, smoothedBands);
      }
      if (locs.u_spectral_centroid) {
        gl.uniform1f(locs.u_spectral_centroid, smoothedCentroid);
      }
      if (locs.u_spectral_flatness) {
        gl.uniform1f(locs.u_spectral_flatness, smoothedFlatness);
      }
      if (locs.u_energy_flux) {
        gl.uniform1f(locs.u_energy_flux, smoothedFlux);
      }

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
