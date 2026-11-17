// All sound is synthesized with WebAudio: no audio files, nothing fetched.
// Engine hum, sirens, gunshots, pickups, jingles and a small bass-driven
// music loop, all built from oscillators and filtered noise. C cycles three
// radio stations, each its own bass line and tempo.

import { RADIO_STATIONS } from './config.js';

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
  let station = 0; // index into RADIO_STATIONS

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

  // The current station's 8-step bass + hat loop; C moves to the next one.
  function musicTick() {
    if (!musicOn || !ctx || muted) return;
    const st = RADIO_STATIONS[station];
    const s = step % 8;
    const f = st.bass[s];
    if (f) blip(f, 0.32, 'triangle', 0.16);
    const lead = st.lead[s];
    if (lead) blip(lead, 0.18, 'sine', 0.05);
    if (s % 2 === 0) noiseBurst(0.03, 0.05, 6000);
    step += 1;
  }

  function stationInterval() {
    return Math.round(60000 / RADIO_STATIONS[station].bpm / 2);
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
      musicTimer = window.setInterval(musicTick, stationInterval());
    },
    stopMusic() {
      musicOn = false;
      if (musicTimer) window.clearInterval(musicTimer);
      musicTimer = null;
    },
    // Cycle the radio; returns the station name for the HUD.
    cycleRadio() {
      station = (station + 1) % RADIO_STATIONS.length;
      if (musicTimer) {
        window.clearInterval(musicTimer);
        musicTimer = window.setInterval(musicTick, stationInterval());
      }
      return RADIO_STATIONS[station].name;
    },
    get radioName() {
      return RADIO_STATIONS[station].name;
    },
    setStation(i) {
      station = ((i % RADIO_STATIONS.length) + RADIO_STATIONS.length) % RADIO_STATIONS.length;
    },
    pickup() { blip(880, 0.12, 'sine', 0.18, 1320); },
    cash() {
      blip(988, 0.09, 'sine', 0.16);
      window.setTimeout(() => blip(1319, 0.14, 'sine', 0.16), 80);
    },
    gunshot() { noiseBurst(0.14, 0.5, 2400); blip(160, 0.08, 'square', 0.2, 60); },
    shotgun() { noiseBurst(0.25, 0.6, 1200); blip(110, 0.18, 'square', 0.28, 45); },
    reload() { blip(1200, 0.04, 'square', 0.08); window.setTimeout(() => blip(900, 0.05, 'square', 0.08), 90); },
    nitro() { noiseBurst(0.5, 0.25, 5000); blip(220, 0.4, 'sawtooth', 0.08, 880); },
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
    // A traffic horn from down the street: two-tone, quieter than the player's.
    honk() { blip(330, 0.16, 'square', 0.05, 330); window.setTimeout(() => blip(415, 0.16, 'square', 0.05), 140); },
    click() { blip(660, 0.05, 'sine', 0.12); },
  };
}
