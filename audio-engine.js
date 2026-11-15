/* ============================================================
   audio-engine.js — suoni del gioco, tutti sintetizzati (WebAudio).
   Niente file audio: rumore filtrato, oscillatori, riverbero a caverna.
   Usato dal gioco (audio.js) e dal laboratorio (audio-lab.html).
   ============================================================ */
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function createSound() {
  const S = { ctx: null, muted: false, vol: 0.85, amb: null, intensity: 0 };
  let master, comp, bus, verbIn, noiseBuf, analyser;

  /* ---------- avvio (dopo un gesto dell'utente) ---------- */
  S.init = () => {
    if (S.ctx) { if (S.ctx.state === 'suspended') S.ctx.resume(); return S.ctx; }
    const ctx = S.ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = S.muted ? 0 : S.vol; S.master = master;
    comp = ctx.createDynamicsCompressor();
    Object.assign(comp, {}); comp.threshold.value = -16; comp.knee.value = 24; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.2;
    analyser = ctx.createAnalyser(); analyser.fftSize = 2048; S.analyser = analyser;
    master.connect(comp); comp.connect(analyser); analyser.connect(ctx.destination);
    bus = ctx.createGain(); bus.gain.value = 1; bus.connect(master);
    // rumore bianco in loop e riverbero a caverna (impulso generato)
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const len = Math.floor(ctx.sampleRate * 2.8), imp = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const ch = imp.getChannelData(c); for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    const verb = ctx.createConvolver(); verb.buffer = imp;
    verbIn = ctx.createGain(); verbIn.gain.value = 1; S.verbIn = verbIn;
    const verbOut = ctx.createGain(); verbOut.gain.value = 0.55;
    const verbLp = ctx.createBiquadFilter(); verbLp.type = 'lowpass'; verbLp.frequency.value = 3800;
    verbIn.connect(verb); verb.connect(verbLp); verbLp.connect(verbOut); verbOut.connect(master);
    return ctx;
  };
  S.setMuted = m => { S.muted = m; if (master) master.gain.setTargetAtTime(m ? 0 : S.vol, S.ctx.currentTime, 0.05); };
  S.setVolume = v => { S.vol = v; if (master && !S.muted) master.gain.setTargetAtTime(v, S.ctx.currentTime, 0.05); };
  const now = () => S.ctx.currentTime;

  /* ---------- mattoni ---------- */
  function route(node, wet = 0.15, pan = 0) {
    let last = node;
    if (pan && S.ctx.createStereoPanner) { const p = S.ctx.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); node.connect(p); last = p; }
    last.connect(bus);
    if (wet > 0) { const s = S.ctx.createGain(); s.gain.value = wet; last.connect(s); s.connect(verbIn); }
  }
  function noise(t, dur, o = {}) {
    const { type = 'bandpass', f0 = 1000, f1 = null, q = 1, peak = 0.3, a = 0.005, wet = 0.12, pan = 0 } = o;
    const ctx = S.ctx, src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t);
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); route(g, wet, pan); src.start(t, rand(0, 1.5)); src.stop(t + dur + 0.05);
  }
  function osc(t, dur, o = {}) {
    const { type = 'sine', f0 = 440, f1 = null, peak = 0.2, a = 0.004, wet = 0.12, pan = 0, lp = null, detune = 0 } = o;
    const ctx = S.ctx, v = ctx.createOscillator(); v.type = type; v.detune.value = detune; v.frequency.setValueAtTime(f0, t);
    if (f1) v.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let n = v; if (lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; v.connect(f); n = f; }
    n.connect(g); route(g, wet, pan); v.start(t); v.stop(t + dur + 0.05);
  }
  const ping = (t, f, dur, peak, wet = 0.4) => { osc(t, dur, { f0: f, peak, a: 0.002, wet }); osc(t, dur * 0.6, { f0: f * 2.76, peak: peak * 0.35, a: 0.002, wet }); };   // campana
  const ready = () => { if (!S.ctx) return false; if (S.ctx.state === 'suspended') S.ctx.resume(); return true; };

  /* ---------- combattimento ---------- */
  S.slash = () => { if (!ready()) return; const t = now(), pan = rand(-0.3, 0.3);
    noise(t, 0.22, { type: 'bandpass', f0: 2600, f1: 480, q: 0.9, peak: 0.4, a: 0.018, wet: 0.1, pan });
    noise(t, 0.12, { type: 'highpass', f0: 3600, peak: 0.12, a: 0.01 });
    osc(t, 0.15, { type: 'triangle', f0: 280, f1: 90, peak: 0.12 }); };
  S.hit = () => { if (!ready()) return; const t = now(), p = rand(0.9, 1.15), pan = rand(-0.4, 0.4);
    osc(t, 0.2, { f0: 150 * p, f1: 46, peak: 0.6, pan });
    noise(t, 0.1, { type: 'lowpass', f0: 2400, f1: 280, peak: 0.5, a: 0.002, pan });
    osc(t, 0.08, { type: 'square', f0: 330 * p, f1: 110, peak: 0.1, lp: 1800 });
    noise(t + 0.012, 0.05, { type: 'highpass', f0: 4800, peak: 0.16 }); };
  S.crit = () => { if (!ready()) return; S.hit(); const t = now();
    ping(t, 1760, 0.7, 0.15, 0.5); ping(t + 0.03, 2349, 0.5, 0.09, 0.5);
    osc(t, 0.45, { f0: 70, f1: 30, peak: 0.34 }); noise(t, 0.2, { type: 'highpass', f0: 5200, peak: 0.14, wet: 0.3 }); };
  S.fire = () => { if (!ready()) return; const t = now();
    noise(t, 0.55, { type: 'bandpass', f0: 280, f1: 2700, q: 1.2, peak: 0.6, a: 0.1, wet: 0.25 });
    osc(t, 0.5, { type: 'sawtooth', f0: 170, f1: 520, peak: 0.13, lp: 1400, a: 0.08, wet: 0.25 });
    for (let i = 0; i < 9; i++) noise(t + rand(0, 0.45), 0.025, { type: 'highpass', f0: 3200, peak: 0.2, pan: rand(-0.6, 0.6) }); };
  S.turbine = () => { if (!ready()) return; const t = now();
    for (let i = 0; i < 3; i++) noise(t + i * 0.27, 0.3, { type: 'bandpass', f0: 500, f1: 2200 + i * 300, q: 1.1, peak: 0.55, a: 0.05, pan: (i - 1) * 0.5 });
    osc(t, 0.9, { type: 'sawtooth', f0: 90, f1: 180, peak: 0.2, lp: 700, a: 0.2 }); };
  S.nova = () => { if (!ready()) return; const t = now();
    osc(t, 0.8, { f0: 115, f1: 28, peak: 0.62, wet: 0.35 });
    noise(t, 0.65, { type: 'lowpass', f0: 1900, f1: 120, peak: 0.6, a: 0.004, wet: 0.4 });
    osc(t, 0.7, { type: 'triangle', f0: 900, f1: 1900, peak: 0.09, wet: 0.6 });
    ping(t + 0.05, 1320, 1.0, 0.12, 0.7);
    for (let i = 0; i < 10; i++) noise(t + rand(0, 0.5), 0.03, { type: 'highpass', f0: 3000, peak: 0.16, pan: rand(-0.8, 0.8) }); };
  S.boom = () => { if (!ready()) return; const t = now();
    osc(t, 1.0, { f0: 82, f1: 24, peak: 0.7, wet: 0.45 });
    noise(t, 0.85, { type: 'lowpass', f0: 950, f1: 70, peak: 0.7, a: 0.003, wet: 0.5 }); };
  S.hurt = () => { if (!ready()) return; const t = now();
    osc(t, 0.4, { type: 'sawtooth', f0: 125, f1: 52, peak: 0.34, lp: 650 });
    osc(t, 0.22, { f0: 95, f1: 38, peak: 0.42 });
    noise(t, 0.16, { type: 'lowpass', f0: 1500, f1: 200, peak: 0.36, a: 0.002 }); };
  S.die = () => { if (!ready()) return; const t = now(), pan = rand(-0.5, 0.5);
    osc(t, 0.5, { type: 'sawtooth', f0: 540, f1: 85, peak: 0.22, lp: 2200, detune: -8, pan });
    osc(t, 0.5, { type: 'sawtooth', f0: 520, f1: 80, peak: 0.18, lp: 1800, detune: 9, pan });
    noise(t, 0.45, { type: 'bandpass', f0: 1900, f1: 260, q: 1, peak: 0.3, pan });
    osc(t + 0.05, 0.3, { f0: 110, f1: 40, peak: 0.4 }); };
  S.dash = () => { if (!ready()) return; const t = now();
    noise(t, 0.26, { type: 'bandpass', f0: 380, f1: 3200, q: 0.8, peak: 0.6, a: 0.03, wet: 0.1 });
    osc(t, 0.16, { type: 'triangle', f0: 200, f1: 620, peak: 0.08 }); };

  /* ---------- mondo e interfaccia ---------- */
  S.ok = () => { if (!ready()) return; const t = now();
    [523.25, 659.25, 784, 1046.5].forEach((f, i) => ping(t + i * 0.09, f, 1.3, 0.16, 0.55)); };
  S.bad = () => { if (!ready()) return; const t = now();
    osc(t, 0.8, { type: 'sawtooth', f0: 98, f1: 66, peak: 0.28, lp: 420, wet: 0.35 });
    osc(t, 0.8, { type: 'sawtooth', f0: 104, f1: 62, peak: 0.24, lp: 400, wet: 0.35 });
    noise(t, 0.7, { type: 'lowpass', f0: 240, peak: 0.3, a: 0.05 }); };
  S.loot = () => { if (!ready()) return; const t = now();
    ping(t, 1318.5, 0.35, 0.15, 0.3); ping(t + 0.08, 1760, 0.45, 0.14, 0.35);
    noise(t, 0.12, { type: 'highpass', f0: 6000, peak: 0.1 }); };
  S.rare = () => { if (!ready()) return; const t = now();
    [659.25, 880, 1108.7, 1480, 1760].forEach((f, i) => ping(t + i * 0.075, f, 0.9, 0.17, 0.6));
    noise(t, 0.9, { type: 'highpass', f0: 5000, f1: 9000, peak: 0.12, a: 0.35, wet: 0.6 }); };
  S.level = () => { if (!ready()) return; const t = now();
    [220, 277.18, 329.63, 440, 554.37].forEach((f, i) => {
      const ctx = S.ctx, v = ctx.createOscillator(), g = ctx.createGain(); v.type = 'sine'; v.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.12, t + 0.35 + i * 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
      v.connect(g); route(g, 0.8); v.start(t); v.stop(t + 2.5); });
    [880, 1108.7, 1318.5, 1760].forEach((f, i) => ping(t + 0.3 + i * 0.1, f, 1.1, 0.1, 0.7)); };
  S.potion = () => { if (!ready()) return; const t = now();
    for (let i = 0; i < 5; i++) { const f = rand(320, 720); osc(t + i * 0.06, 0.09, { f0: f, f1: f * 1.9, peak: 0.22, a: 0.01 }); }
    ping(t + 0.3, 987.77, 0.8, 0.1, 0.5); };
  S.gate = () => { if (!ready()) return; const t = now();
    noise(t, 1.1, { type: 'lowpass', f0: 520, peak: 0.38, a: 0.12, wet: 0.35 });
    osc(t, 1.15, { type: 'sawtooth', f0: 64, f1: 46, peak: 0.28, lp: 320, wet: 0.3 });
    for (let i = 0; i < 6; i++) ping(t + rand(0, 0.9), rand(2200, 3400), 0.18, 0.05, 0.3);
    setTimeout(() => S.ok(), 550); };
  S.step = () => { if (!ready()) return; const t = now();
    noise(t, 0.08, { type: 'lowpass', f0: rand(240, 380), peak: 0.26, a: 0.002, wet: 0.08, pan: rand(-0.15, 0.15) });
    osc(t, 0.08, { f0: rand(72, 98), f1: 44, peak: 0.2 }); };
  S.heartbeat = () => { if (!ready()) return; const t = now();
    osc(t, 0.14, { f0: 62, f1: 38, peak: 0.55, wet: 0.05 }); osc(t + 0.2, 0.12, { f0: 56, f1: 36, peak: 0.38, wet: 0.05 }); };
  S.drum = (power = 1) => { if (!ready()) return; const t = now();
    osc(t, 0.3, { f0: 88, f1: 36, peak: 0.55 * power, wet: 0.3 }); noise(t, 0.09, { type: 'lowpass', f0: 420, peak: 0.28 * power, wet: 0.3 }); };
  S.horn = () => { if (!ready()) return; const t = now();                     // corno cupo: ingresso del boss
    [55, 82.4, 110.2].forEach((f, i) => {
      const ctx = S.ctx, v = ctx.createOscillator(), g = ctx.createGain(), l = ctx.createBiquadFilter(); v.type = 'sawtooth'; v.frequency.value = f; l.type = 'lowpass'; l.frequency.setValueAtTime(180, t); l.frequency.linearRampToValueAtTime(700, t + 1.6);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.45 / (i + 1), t + 1.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
      v.connect(l); l.connect(g); route(g, 0.7); v.start(t); v.stop(t + 3.3); }); };
  S.tone = (f = 440, d = 0.2, type = 'sine', v = 0.08, slide = 0) => {       // compatibilità col vecchio tone()
    if (!ready() || d > 2) return; const t = now();
    osc(t, d, { type: type === 'square' ? 'triangle' : type, f0: f, f1: slide ? Math.max(30, f + slide) : null, peak: v * 2.2, lp: 2400 }); };

  /* ---------- ambiente: bordone, vento, crepitii, lamenti lontani ---------- */
  S.startAmbient = () => {
    if (!ready() || S.amb) return; const ctx = S.ctx, t = now();
    const out = ctx.createGain(); out.gain.setValueAtTime(0.0001, t); out.gain.linearRampToValueAtTime(0.55, t + 5); route(out, 0.35);
    const nodes = [];
    const lowDrone = (f, type, vol, lp) => {
      const v = ctx.createOscillator(), g = ctx.createGain(), l = ctx.createBiquadFilter(); v.type = type; v.frequency.value = f; l.type = 'lowpass'; l.frequency.value = lp; g.gain.value = vol;
      v.connect(l); l.connect(g); g.connect(out); v.start(); nodes.push(v); return l; };
    lowDrone(55, 'sine', 0.5, 400); lowDrone(55.35, 'sine', 0.4, 400); lowDrone(82.4, 'sine', 0.22, 400);
    const sawF = lowDrone(55.2, 'sawtooth', 0.16, 200);
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 90; lfo.connect(lg); lg.connect(sawF.frequency); lfo.start(); nodes.push(lfo);
    // vento
    const w = ctx.createBufferSource(); w.buffer = noiseBuf; w.loop = true; const wf = ctx.createBiquadFilter(); wf.type = 'bandpass'; wf.Q.value = 0.6; wf.frequency.value = 520;
    const wg = ctx.createGain(); wg.gain.value = 0.09; w.connect(wf); wf.connect(wg); wg.connect(out); w.start(); nodes.push(w);
    const wl = ctx.createOscillator(), wlg = ctx.createGain(), wlf = ctx.createGain(); wl.frequency.value = 0.11; wlg.gain.value = 0.06; wlf.gain.value = 260; wl.connect(wlg); wlg.connect(wg.gain); wl.connect(wlf); wlf.connect(wf.frequency); wl.start(); nodes.push(wl);
    // intensità di combattimento: il bordone si apre
    const tension = ctx.createGain(); tension.gain.value = 0; const th = ctx.createOscillator(); th.type = 'sawtooth'; th.frequency.value = 110.4; const thf = ctx.createBiquadFilter(); thf.type = 'lowpass'; thf.frequency.value = 500;
    th.connect(thf); thf.connect(tension); tension.connect(out); th.start(); nodes.push(th);
    const timers = [];
    const crackle = () => { if (!S.amb) return; const tt = now(); noise(tt, 0.02, { type: 'highpass', f0: rand(2500, 5000), peak: rand(0.03, 0.08), pan: rand(-0.9, 0.9), wet: 0.1 }); timers.push(setTimeout(crackle, rand(350, 2400))); };
    const moan = () => {                                                       // lamento lontano: "sospiri che l'aura etterna facevan tremare"
      if (!S.amb) return; const tt = now(), f = rand(120, 190), pan = rand(-0.8, 0.8);
      const v = ctx.createOscillator(), g = ctx.createGain(), b = ctx.createBiquadFilter(); v.type = 'sawtooth'; v.frequency.setValueAtTime(f, tt); v.frequency.linearRampToValueAtTime(f * 0.82, tt + 3.4);
      b.type = 'bandpass'; b.frequency.value = 620; b.Q.value = 3; g.gain.setValueAtTime(0.0001, tt); g.gain.linearRampToValueAtTime(0.07, tt + 1.4); g.gain.exponentialRampToValueAtTime(0.0001, tt + 3.6);
      v.connect(b); b.connect(g); route(g, 0.9, pan); v.start(tt); v.stop(tt + 3.7); timers.push(setTimeout(moan, rand(14000, 30000))); };
    timers.push(setTimeout(crackle, 800), setTimeout(moan, rand(6000, 12000)));
    S.amb = { out, tension, nodes, timers };
  };
  S.stopAmbient = () => {
    if (!S.amb) return; const a = S.amb; S.amb = null; const t = now();
    a.out.gain.cancelScheduledValues(t); a.out.gain.setTargetAtTime(0.0001, t, 0.6); a.timers.forEach(clearTimeout);
    setTimeout(() => a.nodes.forEach(n => { try { n.stop(); } catch (e) {} }), 2500);
  };
  S.setIntensity = x => { S.intensity = x; if (S.amb) S.amb.tension.gain.setTargetAtTime(0.16 * x, now(), 0.6); };

  S.level01 = () => { if (!S.analyser) return 0; const d = new Uint8Array(S.analyser.fftSize); S.analyser.getByteTimeDomainData(d); let m = 0; for (const v of d) m = Math.max(m, Math.abs(v - 128)); return m / 128; };
  return S;
}
