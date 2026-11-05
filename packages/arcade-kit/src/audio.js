// The tone engine behind the synthesised arcade audio. The AudioContext is created
// lazily on the first user gesture (unlock), because browsers block audio before any
// interaction.

export function createToneEngine() {
  let ac = null;
  let muted = false;

  function unlock() {
    if (!ac) {
      try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { ac = null; }
    }
    if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
    return ac;
  }

  function tone(f, t0, dur, type, vol, slide, force) {
    if (!ac || (muted && !force)) return;
    const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + t0;
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ac.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  return {
    unlock,
    tone,
    get context() { return ac; },
    get muted() { return muted; },
    setMuted(m) { muted = !!m; },
    destroy() { if (ac) { ac.close().catch(() => {}); ac = null; } },
  };
}
