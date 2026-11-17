// All sound is synthesized with WebAudio: no audio files, nothing fetched.
// Engine hum, sirens, gunshots, pickups, jingles and a small bass-driven
// music loop, all built from oscillators and filtered noise.

export function createAudio() {
  let ctx = null;
  let master = null;
  let musicTimer = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let musicOn = false;
  let muted = false;
  let step = 0;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext ?? window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch {
      return false;
    }
    return true;
  }

  function unlock() {
    if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  function blip(freq, dur, type, vol, slideTo) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noiseBurst(dur, vol, filterFreq) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(t);
  }

  // A tiny 8-step bass + hat loop, 112 BPM, minor-key sunset groove.
  const BASS = [55, 0, 55, 65.41, 55, 0, 49, 58.27];
  function musicTick() {
    if (!musicOn || !ctx || muted) return;
    const s = step % 8;
    const f = BASS[s];
    if (f) blip(f, 0.32, 'triangle', 0.16);
    if (s % 2 === 0) noiseBurst(0.03, 0.05, 6000);
    if (s === 0 || s === 4) blip(220, 0.1, 'sine', 0.05, 330);
    step += 1;
  }

  return {
    unlock,
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    get muted() {
      return muted;
    },
    startMusic() {
      if (!ensure() || musicTimer) return;
      musicOn = true;
      musicTimer = window.setInterval(musicTick, 268); // ~112 BPM eighth notes
    },
    stopMusic() {
      musicOn = false;
      if (musicTimer) window.clearInterval(musicTimer);
      musicTimer = null;
    },
    pickup() { blip(880, 0.12, 'sine', 0.18, 1320); },
    cash() {
      blip(988, 0.09, 'sine', 0.16);
      window.setTimeout(() => blip(1319, 0.14, 'sine', 0.16), 80);
    },
    gunshot() { noiseBurst(0.14, 0.5, 2400); blip(160, 0.08, 'square', 0.2, 60); },
    punch() { noiseBurst(0.08, 0.3, 900); },
    crash() { noiseBurst(0.3, 0.5, 500); blip(90, 0.25, 'sawtooth', 0.2, 40); },
    sirenStart() {
      if (!ensure() || sirenOsc || muted) return;
      sirenOsc = ctx.createOscillator();
      sirenGain = ctx.createGain();
      sirenOsc.type = 'sine';
      sirenOsc.frequency.value = 700;
      sirenGain.gain.value = 0.0;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.9;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 220;
      lfo.connect(lfoGain);
      lfoGain.connect(sirenOsc.frequency);
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
      lfo.start();
      sirenGain.gain.linearRampToValueAtTime(0.045, ctx.currentTime + 0.6);
      sirenOsc._lfo = lfo;
    },
    sirenStop() {
      if (!sirenOsc) return;
      try {
        sirenGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
        const osc = sirenOsc;
        const lfo = sirenOsc._lfo;
        window.setTimeout(() => { try { osc.stop(); lfo.stop(); } catch { /* already stopped */ } }, 400);
      } catch { /* ignore */ }
      sirenOsc = null;
      sirenGain = null;
    },
    engineStart() {
      if (!ensure() || engineOsc) return;
      engineOsc = ctx.createOscillator();
      engineGain = ctx.createGain();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain.gain.value = 0.0;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      engineOsc.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
    },
    engineSet(speedRatio, on) {
      if (!engineOsc || !ctx) return;
      const t = ctx.currentTime;
      engineGain.gain.setTargetAtTime(on && !muted ? 0.05 + speedRatio * 0.05 : 0, t, 0.1);
      engineOsc.frequency.setTargetAtTime(50 + speedRatio * 130, t, 0.08);
    },
    engineStop() {
      if (!engineOsc) return;
      try { engineOsc.stop(); } catch { /* ignore */ }
      engineOsc = null;
      engineGain = null;
    },
    missionComplete() {
      [523, 659, 784, 1047].forEach((f, i) => window.setTimeout(() => blip(f, 0.22, 'triangle', 0.2), i * 110));
    },
    missionFail() {
      [392, 330, 262].forEach((f, i) => window.setTimeout(() => blip(f, 0.3, 'sawtooth', 0.12), i * 140));
    },
    busted() {
      [440, 440, 349].forEach((f, i) => window.setTimeout(() => blip(f, 0.25, 'square', 0.14), i * 160));
    },
    horn() { blip(370, 0.18, 'square', 0.1, 370); },
    click() { blip(660, 0.05, 'sine', 0.12); },
  };
}
