/* ============================================================
   prestazioni.js — ottimizzazione automatica.
   Misura i fotogrammi al secondo e adatta la risoluzione di disegno: se il gioco scende sotto i ~45 fps
   abbassa la risoluzione (e, al limite, la qualità delle ombre); se c'è margine la rialza.
   Scorciatoia: tasto G alterna "Auto" e "Massima qualità"; il livello corrente è in window.__perf.
   Usa solo window.__game (renderer, composer).
   ============================================================ */
const g = window.__game;
if (!g || !g.renderer || !g.composer) console.warn('prestazioni.js: window.__game non pronto');
else {
  const { renderer, composer, THREE } = g;
  const MAX = Math.min(devicePixelRatio, 1.75), MIN = 0.7;
  let ratio = MAX, auto = true, acc = 0, n = 0, last = performance.now(), calm = 0, shadowLow = false;
  const sun = (() => { let s = null; g.scene.traverse(o => { if (!s && o.isDirectionalLight && o.castShadow) s = o; }); return s; })();
  const apply = r => {
    ratio = Math.max(MIN, Math.min(MAX, r));
    renderer.setPixelRatio(ratio); composer.setPixelRatio(ratio); composer.setSize(innerWidth, innerHeight); renderer.setSize(innerWidth, innerHeight);
  };
  const setShadow = low => {
    if (!sun || low === shadowLow) return; shadowLow = low;
    sun.shadow.mapSize.set(low ? 1024 : 2048, low ? 1024 : 2048); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  };
  function tick(now) {
    requestAnimationFrame(tick);
    const dt = now - last; last = now; if (dt > 250 || document.hidden) return;       // pause e cambi di scheda non contano
    acc += dt; n++;
    if (acc < 1500 || !auto || g.G.state === 'loading') return;
    const fps = n / (acc / 1000); acc = 0; n = 0;
    if (fps < 45) { calm = 0; if (ratio > MIN + 0.01) apply(ratio - (fps < 30 ? 0.3 : 0.15)); else setShadow(true); }
    else if (fps > 57) { if (++calm >= 4) { calm = 0; if (shadowLow) setShadow(false); else if (ratio < MAX - 0.01) apply(ratio + 0.15); } }
    else calm = 0;
    window.__perf.fps = Math.round(fps); window.__perf.ratio = +ratio.toFixed(2);
  }
  addEventListener('keydown', e => { if (e.key === 'g' || e.key === 'G') { auto = !auto; if (!auto) { apply(MAX); setShadow(false); } g.toast && g.toast(auto ? '<b>Qualità automatica</b>' : '<b>Qualità massima fissa</b>', '#7ab4ff', 2200); window.__perf.auto = auto; } });
  window.__perf = { fps: 0, ratio: +ratio.toFixed(2), auto };
  requestAnimationFrame(tick);
}
