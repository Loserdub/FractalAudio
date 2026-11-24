import { transientQueues } from './transients';
import { damp } from './Dampener';

const BAND_EDGES_HZ = [20, 45, 85, 130, 195, 280, 410, 580, 820, 1160, 1650, 2370, 3340, 4740, 6680, 9470, 13350, 16700, 20000];
const BAND_WEIGHTS = [1.4, 1.3, 1.25, 1.2, 1.15, 1.1, 1.1, 1.15, 1.2, 1.25, 1.35, 1.45, 1.55, 1.7, 1.85, 2.05, 2.3, 2.6];
const SAMPLE_PERIOD_MS = 1000 / 30;

function envelope(value: number, target: number, dt: number, attack: number, release: number): number {
  return damp(value, target, dt, target > value ? attack : release);
}

function hitStrength(flux: number, threshold: number): number {
  return Math.min(1, 0.36 + (flux - threshold) * 5);
}

export class AudioMotion {
  readonly bands = new Float32Array(BAND_WEIGHTS.length);
  readonly historyRow: Uint8Array;
  readonly fxWaves = new Float32Array(4);
  readonly kickWaves = new Float32Array(4);
  hat = 0;
  private hits: {band: number; time: number; strength: number}[] = [];
  private sourceStart = 0;
  centroid = 0.25;
  flatness = 0.15;
  flux = 0;
  kick = 0;
  snare = 0;
  kickDetected = false;
  snareDetected = false;

  private readonly targets = new Float32Array(BAND_WEIGHTS.length);
  private readonly historyLevels: Float32Array;
  private analyser: AnalyserNode | null = null;
  private resetKey = -1;
  private spectrum = new Uint8Array(0);
  private previous = new Uint8Array(0);
  private waveform = new Float32Array(0);
  private nextSample = 0;
  private previousSample = 0;
  private seeded = false;
  private kickMean = 0;
  private snareMean = 0;
  private level = 0.06;
  private kickPeak = 0;
  private snarePeak = 0;
  private centroidTarget = 0.25;
  private flatnessTarget = 0.15;
  private fluxTarget = 0;
  private lastKick = -Infinity;
  private previousKick = -Infinity;
  private lastSnare = -Infinity;
  private lastKickStrength = 0;
  private previousKickStrength = 0;

  constructor(historyWidth: number) {
    this.historyRow = new Uint8Array(historyWidth);
    this.historyLevels = new Float32Array(historyWidth);
  }

  // The display interpolates envelopes every frame. Spectrum and history share a 30 Hz clock.
  update(analyser: AnalyserNode | null, resetKey: number, now: number, dt: number, sensitivity: number, response: number): number {
    if (analyser !== this.analyser || resetKey !== this.resetKey) {
      this.analyser = analyser;
      this.resetKey = resetKey;
      this.sourceStart = analyser?.context.currentTime ?? 0;
      this.hits.length = 0;
      this.lastKick = this.previousKick = this.lastSnare = -Infinity;
      this.kick = this.snare = this.hat = this.kickPeak = this.snarePeak = 0;
      this.kickDetected = this.snareDetected = false;
      this.seeded = false;
      this.kickMean = 0;
      this.snareMean = 0;
      this.level = 0.06;
      if (analyser && this.spectrum.length !== analyser.frequencyBinCount) {
        this.spectrum = new Uint8Array(analyser.frequencyBinCount);
        this.previous = new Uint8Array(analyser.frequencyBinCount);
        this.waveform = new Float32Array(analyser.fftSize);
      }
    }

    if (this.previousSample === 0) this.nextSample = now;
    let historySteps = 0;
    const sampleLateness = now - this.nextSample + 0.5;
    if (sampleLateness >= 0) {
      historySteps = Math.floor(sampleLateness / SAMPLE_PERIOD_MS) + 1;
      this.nextSample += historySteps * SAMPLE_PERIOD_MS;
      const sampleDt = Math.min(0.15, Math.max(0.016, (now - this.previousSample) / 1000));
      this.previousSample = now;
      if (historySteps > 3) this.seeded = false;
      this.sample(analyser, now, sampleDt, sensitivity);
    }

    for (let i = 0; i < this.bands.length; i++) {
      const attack = (i < 6 ? 0.045 : i < 12 ? 0.065 : 0.030) * (0.65 + response);
      const release = (i < 6 ? 0.24 : i < 12 ? 0.32 : 0.14) * (0.65 + response);
      this.bands[i] = envelope(this.bands[i], this.targets[i], dt, attack, release);
    }

    this.centroid = damp(this.centroid, this.centroidTarget, dt, 0.24);
    this.flatness = damp(this.flatness, this.flatnessTarget, dt, 0.28);
    this.flux = envelope(this.flux, this.fluxTarget, dt, 0.06, 0.24);
    this.kick = envelope(this.kick, this.kickPeak, dt, 0.022, 0.12);
    this.snare = envelope(this.snare, this.snarePeak, dt, 0.020, 0.105);
    this.kickPeak *= Math.exp(-dt / 0.10);
    this.snarePeak *= Math.exp(-dt / 0.085);
    const queue = analyser && transientQueues.get(analyser);
    if (queue) {
      const clock = analyser.context.currentTime;
      for (const hit of queue) {
        const age = clock - hit.time;
        if (hit.time < this.sourceStart || age > 0.35) continue;
        this.hits.push(hit);
        if (hit.band === 0) {
          this.previousKick = this.lastKick;
          this.previousKickStrength = this.lastKickStrength;
          this.lastKick = now - Math.max(0, age) * 1000;
          this.lastKickStrength = Math.min(1, hit.strength * sensitivity);
          this.kickDetected = true;
        } else if (hit.band === 1) this.snareDetected = true;
      }
      queue.length = 0;
      while (this.hits.length && clock - this.hits[0].time > 0.65) this.hits.shift();
      this.kick = this.snare = this.hat = 0;
      // Evaluate each critically damped impulse at its actual audio-clock age.
      for (const hit of this.hits) {
        const age = Math.max(0, clock - hit.time) * 44 / (0.65 + response);
        const displacement = hit.strength * sensitivity * age * Math.exp(1 - age);
        if (hit.band === 0) this.kick = Math.min(1, this.kick + displacement);
        else if (hit.band === 1) this.snare = Math.min(1, this.snare + displacement);
        else this.hat = Math.min(1, this.hat + displacement);
      }
    } else this.hat = this.bands[15] * this.flux;
    this.writeWave(0, now, this.lastKick, this.lastKickStrength);
    this.writeWave(2, now, this.previousKick, this.previousKickStrength);

    const lifetime = 0.35 + response * 0.8;
    for (let i = 0; i < 2; i++) {
      const age = Math.max(0, (now - (i ? this.previousKick : this.lastKick)) / 1000);
      const strength = i ? this.previousKickStrength : this.lastKickStrength;
      this.fxWaves[i * 2] = Math.min(age, lifetime);
      this.fxWaves[i * 2 + 1] = strength * Math.max(0, 1 - age / lifetime);
    }
    return historySteps;
  }

  private sample(analyser: AnalyserNode | null, now: number, dt: number, sensitivity: number) {
    let audible = false;
    if (analyser) {
      analyser.getFloatTimeDomainData(this.waveform);
      let squares = 0;
      for (const sample of this.waveform) squares += sample * sample;
      audible = squares / this.waveform.length > 0.0015 ** 2;
    }

    if (analyser && audible) {
      analyser.getByteFrequencyData(this.spectrum);
      const binHz = analyser.context.sampleRate / analyser.fftSize;
      const maxBin = this.spectrum.length;
      let total = 0;
      let logTotal = 0;
      let weighted = 0;
      let count = 0;
      let flux = 0;
      let kickFlux = 0;
      let snareFlux = 0;
      let kickBins = 0;
      let snareBins = 0;

      for (let band = 0; band < this.targets.length; band++) {
        const start = Math.min(maxBin, Math.ceil(BAND_EDGES_HZ[band] / binHz));
        const end = Math.min(maxBin, Math.ceil(BAND_EDGES_HZ[band + 1] / binHz));
        let energy = 0;
        for (let bin = start; bin < end; bin++) {
          const hz = bin * binHz;
          const value = this.spectrum[bin] / 255;
          const rise = Math.max(0, value - Math.max(0.14, this.previous[bin] / 255));
          energy += value * value;
          total += value;
          logTotal += Math.log(Math.max(1e-5, value));
          weighted += value * hz;
          flux += rise;
          count++;
          if (hz >= 35 && hz < 165) {
            kickFlux += rise;
            kickBins++;
          }
          if (hz >= 820 && hz < 4600) {
            snareFlux += rise;
            snareBins++;
          }
        }
        this.targets[band] = Math.sqrt(energy / Math.max(1, end - start)) * BAND_WEIGHTS[band];
      }

      const mean = total / Math.max(1, count);
      this.level = envelope(this.level, mean, dt, 0.45, 2.0);
      const gain = sensitivity * Math.min(1.7, 0.20 / Math.max(0.06, this.level));
      for (let i = 0; i < this.targets.length; i++) {
        const strength = Math.max(0, this.targets[i] - 0.10) * gain;
        this.targets[i] = strength / (0.8 + strength);
      }

      this.centroidTarget = total > 0.01 ? Math.min(1, weighted / total / 6000) : 0.25;
      this.flatnessTarget = mean > 0.005 ? Math.min(1, Math.exp(logTotal / count) / mean) : 0.15;
      const fluxScale = Math.min(1.4, SAMPLE_PERIOD_MS / 1000 / dt);
      this.fluxTarget = this.seeded ? Math.min(1, 12 * flux * fluxScale / Math.max(1, count)) : 0;
      if (this.seeded && !transientQueues.has(analyser)) {
        this.detectHits(kickFlux * fluxScale / Math.max(1, kickBins), snareFlux * fluxScale / Math.max(1, snareBins), now, dt, sensitivity);
      }
      this.previous.set(this.spectrum);
      this.seeded = true;
    } else {
      this.targets.fill(0);
      this.spectrum.fill(0);
      this.previous.fill(0);
      this.centroidTarget = 0.25;
      this.flatnessTarget = 0.15;
      this.fluxTarget = 0;
      // Keep an established baseline through quiet gaps so the next beat can trigger.
      this.kickMean = damp(this.kickMean, 0, dt, 0.5);
      this.snareMean = damp(this.snareMean, 0, dt, 0.5);
    }

    for (let i = 0; i < this.historyRow.length; i++) {
      const start = Math.floor(i * this.spectrum.length / this.historyRow.length);
      const end = Math.floor((i + 1) * this.spectrum.length / this.historyRow.length);
      let energy = 0;
      for (let bin = start; bin < end; bin++) energy += this.spectrum[bin] / 255;
      const target = Math.max(0, (energy / Math.max(1, end - start) - 0.12) / 0.88);
      const level = envelope(this.historyLevels[i], target, dt, 0.055, 0.18);
      this.historyLevels[i] = level;
      this.historyRow[i] = Math.round(level * 255);
    }
  }

  private detectHits(kickFlux: number, snareFlux: number, now: number, dt: number, sensitivity: number) {
    const kickThreshold = 0.050 + this.kickMean * 1.65;
    const snareThreshold = 0.045 + this.snareMean * 2.0 + kickFlux * 0.25;
    if (kickFlux > kickThreshold && now - this.lastKick >= 135) {
      this.kickDetected = true;
      this.previousKick = this.lastKick;
      this.previousKickStrength = this.lastKickStrength;
      this.lastKick = now;
      this.lastKickStrength = Math.min(1, hitStrength(kickFlux, kickThreshold) * sensitivity / 1.4);
      this.kickPeak = Math.max(this.kickPeak, this.lastKickStrength);
    }
    if (snareFlux > snareThreshold && now - this.lastSnare >= 105) {
      this.snareDetected = true;
      this.lastSnare = now;
      this.snarePeak = Math.max(this.snarePeak, Math.min(1, hitStrength(snareFlux, snareThreshold) * sensitivity / 1.4));
    }
    this.kickMean = damp(this.kickMean, kickFlux, dt, 0.40);
    this.snareMean = damp(this.snareMean, snareFlux, dt, 0.40);
  }

  private writeWave(index: number, now: number, time: number, strength: number) {
    const age = Math.min(0.28, (now - time) / 1000);
    const attack = Math.min(1, age / 0.025);
    const release = Math.min(1, (0.28 - age) / 0.11);
    this.kickWaves[index] = age;
    this.kickWaves[index + 1] = strength * attack * release;
  }
}
