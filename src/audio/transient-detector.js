/* Audio-thread onset detector. Send only attacks across the worklet port. */
const FLOORS = [0.009, 0.006, 0.004];
const REFRACTORY = [0.095, 0.075, 0.045];

class TransientDetector extends AudioWorkletProcessor {
  constructor() {
    super();
    this.low = this.body = this.top = this.count = 0;
    this.window = Math.round(sampleRate * 0.006);
    this.filters = [165, 820, 4600].map(hz => 1 - Math.exp(-2 * Math.PI * hz / sampleRate));
    this.energy = new Float64Array(3);
    this.baseline = new Float64Array(3);
    this.last = [-1, -1, -1];
  }

  process(inputs) {
    const channels = inputs[0];
    if (!channels?.length) return true;
    const samples = channels[0];
    for (let i = 0; i < samples.length; i++) {
      const x = samples[i];
      this.low += this.filters[0] * (x - this.low);
      this.body += this.filters[1] * (x - this.body);
      this.top += this.filters[2] * (x - this.top);
      this.energy[0] += this.low ** 2;
      this.energy[1] += (this.top - this.body) ** 2;
      this.energy[2] += (x - this.top) ** 2;
      if (++this.count < this.window) continue;
      const time = (currentFrame + i) / sampleRate;
      const strongest = Math.sqrt(Math.max(...this.energy) / this.count);
      for (let band = 0; band < 3; band++) {
        const level = Math.sqrt(this.energy[band] / this.count);
        const rise = level - this.baseline[band] * 1.55;
        const floor = FLOORS[band];
        if (rise > floor && level >= strongest * 0.58 && time - this.last[band] > REFRACTORY[band]) {
          this.port.postMessage({ band, time, strength: Math.min(1, Math.sqrt(rise) * 2.5) });
          this.last[band] = time;
        }
        this.baseline[band] += (level - this.baseline[band]) * (level > this.baseline[band] ? 0.38 : 0.12);
        this.energy[band] = 0;
      }
      this.count = 0;
    }
    return true;
  }
}
registerProcessor('transient-detector', TransientDetector);
