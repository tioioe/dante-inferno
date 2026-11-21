/* ============================================================
   music.js — collega la colonna sonora agli stati del gioco.
   titolo · selva (intro) · esplorazione · combattimento · Minosse · vittoria · caduta
   Tasto N = musica on/off (M silenzia tutto l'audio).
   ============================================================ */
import { createMusic } from './music-engine.js';

const sound = window.__sound;
if (!sound) console.warn('music.js: window.__sound non pronto (audio.js deve caricarsi prima)');
else {
  const music = window.__music = createMusic(sound);
  let combat = false, holdUntil = 0;

  /* abbassa la musica ogni volta che parte una lettura del canto (assets/voce/…): intro, Canto I e cinematiche dei cerchi */
  (function () {
    const proto = HTMLAudioElement.prototype, orig = proto.play; let n = 0;
    proto.play = function () {
      const a = this;
      if (/\/voce\//.test(a.src || '') && !a.__duck) {
        a.__duck = true; n++; music.duck(0.28, 0.5);
        const off = () => { if (!a.__duck) return; a.__duck = false; n--; if (n <= 0) { n = 0; music.duck(1, 1.4); } };
        a.addEventListener('pause', off); a.addEventListener('ended', off); a.addEventListener('error', off);
      }
      return orig.apply(this, arguments);
    };
  })();

  function pick(G, P) {
    const st = G.state;
    if (st === 'title') return 'title';
    if (st === 'intro') return 'forest';
    if (st === 'dead') return 'dead';
    if (st === 'win') return 'win';
    let awake = 0, boss = false;
    for (const e of G.enemies || []) {
      if (e.dead || e.state === 'idle') continue;
      if (e.T && e.T.boss) boss = true;
      if (Math.hypot(e.pos.x - P.pos.x, e.pos.z - P.pos.z) < 26) awake++;
    }
    const inten = Math.min(1, awake / 6 + (boss ? 0.5 : 0)), t = performance.now();
    music.setIntensity(inten);
    if (boss) return 'boss';
    if (!combat && inten > 0.3) { combat = true; holdUntil = t + 5000; }          // entra in combattimento
    else if (combat && inten < 0.12 && t > holdUntil) combat = false;           // esce solo dopo qualche secondo di calma
    return combat ? 'combat' : 'explore';
  }

  setInterval(() => {
    const G = window.__G, P = window.__P;
    if (!G || !P || !sound.ctx || !sound.master) return;                         // serve un gesto dell'utente per sbloccare l'audio
    const want = pick(G, P);
    if (!music.playing) { if (music.start(want)) sound.noDrums = true; }          // la musica ha i suoi tamburi: spengo quelli vecchi
    else music.setState(want);
  }, 250);

  addEventListener('keydown', e => {
    if (e.key.toLowerCase() === 'n' && !e.repeat) {
      music.setMuted(!music.muted);
      try { window.__game && window.__game.toast(music.muted ? '<b>Musica disattivata</b><small>N per riattivarla</small>' : '<b>Musica attiva</b>', '#c8a040', 1800); } catch (err) {}
    }
  });
}
