/* ============================================================
   music-engine.js — colonna sonora sintetizzata dal vivo.
   Accordi in Re minore (Dm · Si♭ · Sol m · La), coro di sinusoidi/denti di sega
   con formanti, campane col motivo del "Dies irae" (canto medievale, pubblico
   dominio), tamburi, ostinato d'archi e ottoni. Sette brani che si fondono:
   titolo, selva, esplorazione, combattimento, boss, vittoria, caduta.
   ============================================================ */
const rand = (a, b) => a + Math.random() * (b - a);
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const CHORDS = [
  { name: 'Re minore',  pad: [50, 57, 62, 65], bass: 38, ost: [0, 7, 12, 7, 0, 3, 7, 10] },
  { name: 'Si bemolle', pad: [46, 53, 58, 62], bass: 34, ost: [0, 7, 12, 7, 0, 4, 7, 11] },
  { name: 'Sol minore', pad: [55, 58, 62, 67], bass: 31, ost: [0, 7, 12, 7, 0, 3, 7, 10] },
  { name: 'La maggiore', pad: [45, 52, 57, 61], bass: 33, ost: [0, 7, 12, 7, 0, 4, 7, 12] }
];
const MAJOR = { name: 'Re maggiore', pad: [50, 57, 62, 66], bass: 38, ost: [0, 7, 12, 7, 0, 4, 7, 12] };
const DIES_IRAE = [65, 64, 65, 62, 64, 61, 62];            // fa-mi-fa-re-mi-do♯-re: il motivo del giudizio

/* gain per livello (pad, bass, bell, perc, ost, brass) e tempo, per ogni brano */
export const TRACKS = {
  title:   { label: 'Titolo',        bpm: 54, pad: 0.9,  bass: 0.45, bell: 1.0,  perc: 0,    ost: 0,   brass: 0, bellEvery: 32 },
  forest:  { label: 'Selva oscura',  bpm: 48, pad: 0.45, bass: 0.3,  bell: 0.55, perc: 0,    ost: 0,   brass: 0, bellEvery: 48 },
  explore: { label: 'Esplorazione',  bpm: 58, pad: 0.6,  bass: 0.5,  bell: 0.55, perc: 0,    ost: 0,   brass: 0, bellEvery: 32 },
  combat:  { label: 'Combattimento', bpm: 92, pad: 0.5,  bass: 0.8,  bell: 0.18, perc: 0.85, ost: 0.8, brass: 0, bellEvery: 64 },
  boss:    { label: 'Minosse',       bpm: 76, pad: 0.65, bass: 0.9,  bell: 0.12, perc: 1.0,  ost: 0.55, brass: 1, bellEvery: 64 },
  win:     { label: 'Vittoria',      bpm: 60, pad: 1.5,  bass: 0.5,  bell: 1.0,  perc: 0,    ost: 0,   brass: 0, bellEvery: 16, major: true },
  dead:    { label: 'Caduta',        bpm: 50, pad: 0.12, bass: 0.15, bell: 0,    perc: 0,    ost: 0,   brass: 0, bellEvery: 9999 }
};

const MUL = { pad: 2.4, bass: 1.8, bell: 1.8, perc: 0.8, ost: 1.6, brass: 1.5 };      // bilanciamento dei livelli

export function createMusic(sound) {
  const M = { state: null, intensity: 0, vol: 1, playing: false, muted: false, duckK: 1 };
  let ctx, out, send, noiseBuf, timer, step = 0, nextT = 0;
  const L = {};                                              // livelli: nome → GainNode

  M.start = (state = 'explore') => {
    if (M.playing || !sound.ctx || !sound.master) return false;
    ctx = sound.ctx;
    out = ctx.createGain(); out.gain.value = M.muted ? 0 : M.vol * M.duckK; out.connect(sound.master);
    send = ctx.createGain(); send.gain.value = 0.6; out.connect(send); send.connect(sound.verbIn);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    for (const n of ['pad', 'bass', 'bell', 'perc', 'ost', 'brass']) { L[n] = ctx.createGain(); L[n].gain.value = 0; L[n].connect(out); }
    M.playing = true; nextT = ctx.currentTime + 0.1; step = 0;
    M.setState(state, true);
    timer = setInterval(sched, 90);
    return true;
  };
  M.stop = () => { if (!M.playing) return; M.playing = false; clearInterval(timer); out.gain.setTargetAtTime(0, ctx.currentTime, 0.8); };
  M.setMuted = m => { M.muted = m; if (out) out.gain.setTargetAtTime(m ? 0 : M.vol * M.duckK, ctx.currentTime, 0.15); };
  /* abbassa la musica (k<1) mentre parla una voce, poi la riporta a 1 */
  M.duck = (k, tc = 0.45) => { M.duckK = k; if (out && !M.muted) out.gain.setTargetAtTime(M.vol * k, ctx.currentTime, tc); };
  M.setVolume = v => { M.vol = v; if (out && !M.muted) out.gain.setTargetAtTime(v * M.duckK, ctx.currentTime, 0.15); };
  M.setIntensity = x => { M.intensity = clamp(x, 0, 1); };
  M.setState = (name, instant = false) => {
    if (!TRACKS[name] || (M.state === name && !instant)) return; M.state = name;
    if (!M.playing) return; const t = ctx.currentTime, tr = TRACKS[name];
    for (const n of Object.keys(L)) L[n].gain.setTargetAtTime(tr[n] * MUL[n], t, instant ? 0.05 : name === 'dead' ? 0.5 : 1.8);
  };
  M.info = () => {
    const tr = TRACKS[M.state] || TRACKS.explore, ch = tr.major ? MAJOR : CHORDS[Math.floor(step / 16) % 4];
    return { state: M.state, label: tr.label, bpm: tr.bpm, chord: ch.name, beat: Math.floor(step / 2) % 4 + 1, bar: Math.floor(step / 8) + 1 };
  };

  /* ---------- voci ---------- */
  const bp = (f, q) => { const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = q; return b; };
  function choir(t, m, dur, vol) {                          // "aah": dente di sega con due formanti e vibrato lento
    const f = mtof(m), o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = rand(-8, 8);
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = rand(4.6, 5.8); lg.gain.value = f * 0.007; lfo.connect(lg); lg.connect(o.frequency);
    const g = ctx.createGain(), f1 = bp(780, 4), f2 = bp(1180, 5), g2 = ctx.createGain(); g2.gain.value = 0.55;
    o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g2); g2.connect(g);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(1.8, dur * 0.4)); g.gain.setValueAtTime(vol, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 1.6);
    g.connect(L.pad); o.start(t); lfo.start(t); o.stop(t + dur + 1.7); lfo.stop(t + dur + 1.7);
  }
  function sine(t, m, dur, vol, dest, type = 'sine', lp = null, a = 0.4) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = mtof(m);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let n = o; if (lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; o.connect(f); n = f; }
    n.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
  }
  function bell(t, m, vol) {
    const f = mtof(m);
    for (const [mul, v, d] of [[1, 1, 2.6], [2.76, 0.35, 1.4], [5.4, 0.12, 0.8]]) {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f * mul;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol * v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(L.bell); o.start(t); o.stop(t + d + 0.05);
    }
  }
  function noise(t, dur, type, f0, vol, dest) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = f0;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t, rand(0, 1.5)); s.stop(t + dur + 0.05);
  }
  const kick = (t, v) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.22);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.9 * v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); o.connect(g); g.connect(L.perc); o.start(t); o.stop(t + 0.35); noise(t, 0.05, 'lowpass', 600, 0.25 * v, L.perc); };
  const taiko = (t, v, f = 70) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(f * 1.5, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.25);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.8 * v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9); o.connect(g); g.connect(L.perc); o.start(t); o.stop(t + 1); noise(t, 0.12, 'bandpass', 380, 0.3 * v, L.perc); };
  const tick = (t, v) => noise(t, 0.05, 'highpass', 4500 + rand(0, 1500), 0.1 * v, L.perc);

  /* ---------- sequencer: una croma per passo, 8 passi per battuta, 2 battute per accordo ---------- */
  function sched() {
    if (!M.playing) return; const t0 = ctx.currentTime; if (nextT < t0) nextT = t0 + 0.05;
    while (nextT < t0 + 0.55) { playStep(step, nextT); nextT += 60 / (TRACKS[M.state] || TRACKS.explore).bpm / 2; step++; }
  }
  function playStep(s, t) {
    const tr = TRACKS[M.state] || TRACKS.explore, sd = 60 / tr.bpm / 2, ch = tr.major ? MAJOR : CHORDS[Math.floor(s / 16) % 4];
    const inten = 0.55 + 0.45 * M.intensity;
    // coro e bordone all'inizio di ogni accordo
    if (s % 16 === 0 && (tr.pad > 0.03 || tr.bass > 0.03)) {
      const dur = sd * 16;
      if (tr.pad > 0.03) ch.pad.forEach((m, i) => choir(t + i * 0.12, m, dur, 0.05));
      if (tr.bass > 0.03) { sine(t, ch.bass, dur + 1, 0.3, L.bass, 'sine', null, 1.2); sine(t, ch.bass + 12, dur, 0.1, L.bass, 'triangle', 500, 1.6); }
    }
    // basso pulsante e ostinato di archi nei brani d'azione
    if (tr.perc > 0.03 && s % 2 === 0) sine(t, ch.bass, sd * 1.6, 0.34, L.bass, 'sawtooth', 320, 0.01);
    if (tr.ost > 0.03 && (M.state === 'combat' || s % 2 === 0)) {
      const m = ch.bass + 12 + ch.ost[s % 8], o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = mtof(m); f.type = 'lowpass'; f.frequency.setValueAtTime(500 + M.intensity * 1500, t); f.frequency.exponentialRampToValueAtTime(260, t + sd * 0.9);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.1, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + sd * 0.95);
      o.connect(f); f.connect(g); g.connect(L.ost); o.start(t); o.stop(t + sd + 0.05);
    }
    // percussioni
    if (tr.perc > 0.03) {
      if (M.state === 'boss') { if (s % 8 === 0 || s % 8 === 4) kick(t, inten); if (s % 8 === 2 || s % 8 === 6) taiko(t, inten * 0.8, 62); if (s % 32 === 0) taiko(t, 1, 45); }
      else { if (s % 8 === 0 || s % 8 === 4) kick(t, inten); if (s % 8 === 6) taiko(t, 0.7 * inten, 80); if (s % 8 === 3 || s % 8 === 7) tick(t, inten); tick(t, 0.5 * inten); }
    }
    // ottoni del boss: accordo di potenza e motivo del giudizio, due ottave sotto
    if (tr.brass > 0.03) {
      if (s % 16 === 0) for (const off of [0, 7, 12]) {
        const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = mtof(ch.bass + 12 + off); o.detune.value = rand(-6, 6);
        f.type = 'lowpass'; f.frequency.setValueAtTime(220, t); f.frequency.linearRampToValueAtTime(900, t + sd * 8);
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.14, t + sd * 5); g.gain.exponentialRampToValueAtTime(0.0001, t + sd * 14); o.connect(f); f.connect(g); g.connect(L.brass); o.start(t); o.stop(t + sd * 14 + 0.1);
      }
      if (s % 64 === 0) DIES_IRAE.forEach((m, i) => sine(t + i * sd * 3, m - 24, sd * 2.8, 0.2, L.brass, 'sawtooth', 800, 0.06));
    }
    // campane: motivo del "Dies irae" ogni tanto, note sparse nella selva
    if (tr.bell > 0.03) {
      if (s % tr.bellEvery === 0) {
        const n = M.state === 'forest' ? 4 : DIES_IRAE.length;
        for (let i = 0; i < n; i++) bell(t + i * sd * 2.2, DIES_IRAE[i] + 12, 0.1);
        if (M.state === 'title' || tr.major) bell(t + 0.01, 74, 0.05);
      } else if (s % 8 === 4 && Math.random() < 0.3) bell(t, [74, 77, 81, 69, 72][Math.floor(Math.random() * 5)], 0.06);
    }
  }
  return M;
}
