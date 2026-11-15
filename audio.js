/* ============================================================
   audio.js — collega il motore audio al gioco.
   Sostituisce gli effetti di main.js e aggiunge: passi, battito a vita bassa,
   tamburi di combattimento, corno di Minosse, ambiente. Tasto M = silenzio.
   ============================================================ */
import { createSound } from './audio-engine.js';

const sound = createSound();
window.__sound = sound;

/* il browser vuole un gesto dell'utente prima di far partire l'audio */
const unlock = () => { sound.init(); };
['pointerdown', 'keydown'].forEach(ev => addEventListener(ev, unlock, { passive: true }));

addEventListener('keydown', e => {
  if (e.key.toLowerCase() === 'm' && !e.repeat) { sound.setMuted(!sound.muted); try { window.__game && window.__game.toast(sound.muted ? '<b>Audio disattivato</b><small>M per riattivarlo</small>' : '<b>Audio attivo</b>', '#c8a040', 1800); } catch (e) {} }
});

/* sostituisce gli effetti (main.js li chiama tramite l'oggetto sfx condiviso) */
function hookGame() {
  const g = window.__game; if (!g || !g.sfx) return false;
  const map = ['slash', 'hit', 'crit', 'fire', 'hurt', 'die', 'dash', 'ok', 'bad', 'loot', 'rare', 'level', 'nova', 'boom', 'potion', 'gate'];
  for (const k of map) g.sfx[k] = () => sound[k]();
  g.sfx.turbine = () => sound.turbine();
  g.tone = (...a) => sound.tone(...a);        // usato dall'intro: passi e battito
  return true;
}
const hookTimer = setInterval(() => { if (hookGame()) { clearInterval(hookTimer); } }, 100);

/* ---------- ciclo di controllo: ambiente, passi, battito, tamburi ---------- */
let stepAcc = 0, hbAcc = 0, drumAcc = 0, hornDone = false, last = performance.now();
setInterval(() => {
  const nowT = performance.now(), dt = Math.min(0.25, (nowT - last) / 1000); last = nowT;
  const G = window.__G, P = window.__P; if (!G || !P || !sound.ctx) return;
  const st = G.state;
  if (st === 'intro' || st === 'play' || st === 'dead') sound.startAmbient(); else if (st === 'win') sound.stopAmbient();

  // passi di Dante
  if (st === 'play' && !P.dead) {
    const sp = Math.hypot(P.vel.x, P.vel.z);
    if (sp > 1.5) { stepAcc += dt * (0.8 + sp / 7.6 * 1.6); if (stepAcc > 1) { stepAcc = 0; sound.step(); } } else stepAcc = 0.7;
    // battito col respiro corto sotto il 30% di vita
    if (P.hp / P.max < 0.3) { hbAcc += dt; if (hbAcc > 0.95) { hbAcc = 0; sound.heartbeat(); } } else hbAcc = 0.7;
  }

  // tensione: dannati svegli vicini → bordone più aperto e tamburi
  let awake = 0, boss = null;
  for (const e of G.enemies || []) {
    if (e.dead || e.state === 'idle') continue;
    if (e.T && e.T.boss) boss = e;
    if (Math.hypot(e.pos.x - P.pos.x, e.pos.z - P.pos.z) < 26) awake++;
  }
  const inten = st === 'play' ? Math.min(1, awake / 6 + (boss ? 0.5 : 0)) : 0;
  sound.setIntensity(inten);
  if (inten > 0.3 && !sound.noDrums) { drumAcc += dt; const period = boss ? 0.55 : 0.85; if (drumAcc > period) { drumAcc = 0; sound.drum(boss ? 1 : 0.7); } } else drumAcc = 0;
  if (boss && !hornDone) { hornDone = true; sound.horn(); }
}, 80);
