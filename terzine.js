/* ============================================================
   terzine.js — la voce di Dante nel gioco (lettura Liber Liber, CC BY-NC-SA 4.0)
   - quando muori devi ascoltare 3 terzine del canto del cerchio prima di poter risorgere
   - ogni pozione bevuta è accompagnata da una terzina
   Ogni volta compaiono il testo (verso per verso, a tempo con la voce) e la parafrasi.
   Usa solo window.__game.
   ============================================================ */
import { TERZINE } from './terzine-data.js';
const g = window.__game;
if (g) {
  const { G } = g, $ = id => document.getElementById(id);
  const st = document.createElement('style');
  st.textContent = `#terz{position:fixed;left:50%;bottom:7%;transform:translateX(-50%);width:min(900px,88vw);text-align:center;z-index:100000;pointer-events:none;opacity:0;transition:opacity .6s;padding:22px 34px;text-shadow:0 0 12px #000,0 0 26px #000;background:radial-gradient(ellipse at center,rgba(0,0,0,.82),rgba(0,0,0,.5) 58%,rgba(0,0,0,0) 80%)}
  #terz i{display:block;font:italic 27px/1.5 var(--f-body,serif);color:#ffd9a0;opacity:0;transition:opacity .7s}
  #terz span{display:block;margin-top:12px;font:17px/1.5 var(--f-body,serif);color:#cdb08c}
  #terz small{display:block;margin-top:8px;font:700 11px var(--f-label,sans-serif);letter-spacing:.14em;color:#8a7a62}`;
  document.head.appendChild(st);
  const box = document.createElement('div'); box.id = 'terz'; box.innerHTML = '<div class="ln"></div><span></span><small></small>'; document.body.appendChild(box);
  const cursor = { 4: 0, 5: 0, 6: 0 };
  let au = null, busy = false, timer = 0;

  const cantoOf = () => ({ 1: 4, 2: 5, 3: 6 }[G.circle || 1] || 4);
  const NAME = { 4: 'Inferno · Canto IV', 5: 'Inferno · Canto V', 6: 'Inferno · Canto VI' };

  function show(c, T) {
    box.firstChild.innerHTML = T.v.map(x => '<i>' + x + '</i>').join('');
    box.children[1].textContent = T.p; box.children[2].textContent = NAME[c] + ' · voce: Jenna Veniero, Liber Liber';
    box.style.opacity = 1;
  }
  function lines(T, t) { [...box.firstChild.children].forEach((el, j) => { el.style.opacity = t >= T.l[j] - 0.1 ? 1 : 0; }); }

  /* legge le terzine indicate in sequenza (una clip ciascuna, niente salti nell'audio); done() a fine lettura anche se l'audio non parte */
  function leggi(c, idxs, done) {
    busy = true; clearInterval(timer); if (au) { try { au.pause(); } catch (e) {} au = null; }
    let i = 0, t = 0, cur = null, ok = true;
    const next = () => {
      if (i >= idxs.length) { clearInterval(timer); busy = false; box.style.opacity = 0; if (done) done(); return; }
      cur = TERZINE[c][idxs[i]]; i++; t = 0; show(c, cur); lines(cur, 0);
      try { au = new Audio(cur.f); au.volume = 0.95; au.addEventListener('error', () => { ok = false; }); const p = au.play(); if (p && p.catch) p.catch(() => { ok = false; }); } catch (e) { ok = false; au = null; }
    };
    next();
    timer = setInterval(() => {
      if (!cur) return;
      if (ok && au && au.readyState >= 2 && !au.paused) t = au.currentTime; else if (!ok || !au) t += 0.05 * 0.9;   // senza audio i tempi corrono da soli
      else t += 0;                                                                                            // in caricamento
      lines(cur, t);
      if ((au && au.ended) || t >= cur.d + 0.1) next();
    }, 50);
  }
  const take = (c, n) => { const out = []; for (let k = 0; k < n; k++) { out.push(cursor[c] % 9); cursor[c]++; } return out; };

  // pozione = una terzina
  window.__terz = { potion() { if (busy || G.state === 'dead') return; const c = cantoOf(); leggi(c, take(c, 1)); }, get busy() { return busy; } };

  // morte = tre terzine prima di poter risorgere
  let deadSeen = false;
  setInterval(() => {
    if (G.state !== 'dead') { deadSeen = false; return; }
    if (deadSeen) return; deadSeen = true;
    const rez = $('rez'); if (!rez) return;
    const lab = rez.textContent; rez.disabled = true; rez.style.opacity = 0.45; rez.style.cursor = 'wait'; rez.textContent = 'ASCOLTA IL CANTO…';
    const c = cantoOf();
    if (busy) { try { clearInterval(timer); } catch (e) {} busy = false; }
    leggi(c, take(c, 3), () => { rez.disabled = false; rez.style.opacity = 1; rez.style.cursor = ''; rez.textContent = lab; });
  }, 120);
}
