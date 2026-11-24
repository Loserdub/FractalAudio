type Hit = { band: number; time: number; strength: number };
export const transientQueues = new WeakMap<AnalyserNode, Hit[]>();

export async function attachTransientDetector(ctx: AudioContext, analyser: AnalyserNode) {
  if (!ctx.audioWorklet) return;
  try {
    await ctx.audioWorklet.addModule(new URL('../audio/transient-detector.js', import.meta.url));
    if (ctx.state === 'closed') return;
    const node = new AudioWorkletNode(ctx, 'transient-detector', { channelCount: 1, channelCountMode: 'explicit' });
    const queue: Hit[] = [];
    node.port.onmessage = ({ data }) => {
      if (queue.length >= 64) queue.shift();
      queue.push(data);
    };
    analyser.connect(node);
    node.connect(ctx.destination); // Processor output is silent.
    transientQueues.set(analyser, queue);
  } catch {
    // AudioMotion retains spectrum-based onset detection when worklets are unavailable.
  }
}
