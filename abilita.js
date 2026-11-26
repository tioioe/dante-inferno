/* ============================================================
   abilita.js — le abilità crescono coi livelli, come nei MOBA:
   ogni livello dà 1 punto; sei tu a scegliere quale abilità sbloccare
   o potenziare (grado 1-5). Si spende col "+" sullo slot o con Maiusc + tasto.
   Usa solo window.__game. main.js legge i gradi da window.__abi.r.
   ============================================================ */
const g = window.__game;
if (g) {
  const { P, G, toast } = g, $ = id => document.getElementById(id);
  const KEY = 'dante_abi_v1', MAXR = 5;
  const SK = [
    { k: 'fire', slot: 's1', name: 'Fuoco', key: 'Q', up: 'danno +25%, ricarica −0,1 s' },
    { k: 'turb', slot: 's2', name: 'Turbina', key: '1', up: 'danno +20%, raggio +0,25, ricarica −0,2 s' },
    { k: 'nova', slot: 's3', name: 'Onda', key: '2', up: 'danno +20%, raggio +0,5, stordimento +0,15 s, ricarica −0,7 s' },
    { k: 'dash', slot: 's4', name: 'Scatto', key: 'Spazio', up: 'ricarica −0,1 s, invulnerabilità +0,06 s' }
  ];
  const A = window.__abi = { r: { fire: 0, turb: 0, nova: 0, dash: 0 }, get points() { return P.level - spent(); }, learn };
  const spent = () => A.r.fire + A.r.turb + A.r.nova + A.r.dash;
  try { const d = JSON.parse(localStorage.getItem(KEY) || 'null'); if (d && d.r) for (const k in A.r) A.r[k] = Math.min(MAXR, d.r[k] | 0); } catch (e) {}

  const st = document.createElement('style');
  st.textContent = `.slot.abi-lock{filter:grayscale(1) brightness(.55)}
  .slot .abi-pips{position:absolute;left:0;right:0;top:2px;font-size:8px;letter-spacing:1px;color:#ffd070;text-shadow:0 0 3px #000;pointer-events:none}
  .slot .abi-plus{position:absolute;right:1px;top:1px;width:22px;height:22px;border-radius:50%;background:#e8a020;color:#1a0c04;font:700 18px/21px sans-serif;text-align:center;cursor:pointer;pointer-events:auto;box-shadow:0 0 8px #ffb030;animation:abip 1s infinite;z-index:3}
  @keyframes abip{50%{transform:scale(1.18);box-shadow:0 0 16px #ffd070}}
  #abinote{position:fixed;left:50%;bottom:104px;transform:translateX(-50%);font:700 13px var(--f-label,sans-serif);letter-spacing:.1em;color:#ffd070;text-shadow:0 0 8px #000,0 0 14px #000;pointer-events:none;opacity:0;transition:opacity .4s}`;
  document.head.appendChild(st);
  const note = document.createElement('div'); note.id = 'abinote'; document.body.appendChild(note);

  const els = {};
  for (const s of SK) {
    const slot = $(s.slot); if (!slot) continue;
    const pips = document.createElement('span'); pips.className = 'abi-pips'; slot.appendChild(pips);
    const plus = document.createElement('div'); plus.className = 'abi-plus'; plus.textContent = '+'; plus.style.display = 'none'; slot.appendChild(plus);
    for (const ev of ['mousedown', 'mouseup', 'click']) plus.addEventListener(ev, e => { e.stopPropagation(); if (ev === 'click') learn(s.k); }, true);
    els[s.k] = { slot, pips, plus };
  }
  function learn(k) {
    if (!(k in A.r) || A.points <= 0 || A.r[k] >= MAXR) return false;
    A.r[k]++; save(); refresh();
    const s = SK.find(x => x.k === k);
    toast(`<b>${s.name} — grado ${A.r[k]}</b><small>${A.r[k] === 1 ? 'Abilità sbloccata (' + s.key + ')' : s.up}</small>`, '#ffd070', 2600);
    try { g.sfx.level && g.sfx.level(); } catch (e) {}
    g.emit(P.pos.x, 1.2, P.pos.z, 30, 0xffd070, 5, 5, 0.8);
    return true;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify({ r: A.r, lvl: P.level })); } catch (e) {} }
  let lastSig = '';
  function refresh() {
    const pts = A.points, sig = pts + '|' + Object.values(A.r).join(',');
    if (sig === lastSig) return; lastSig = sig;
    for (const s of SK) {
      const e = els[s.k]; if (!e) continue; const r = A.r[s.k];
      e.slot.classList.toggle('abi-lock', r === 0);
      e.pips.textContent = '●'.repeat(r) + '○'.repeat(MAXR - r);
      e.plus.style.display = pts > 0 && r < MAXR ? 'block' : 'none';
    }
    note.textContent = pts > 0 ? `${pts} punt${pts > 1 ? 'i' : 'o'} abilità — clicca + (o Maiusc + tasto)` : '';
    note.style.opacity = pts > 0 ? 1 : 0;
  }
  // Maiusc + tasto dell'abilità = spendi un punto (senza lanciarla)
  const KEYMAP = { q: 'fire', 1: 'turb', 2: 'nova', ' ': 'dash' };
  addEventListener('keydown', e => {
    if (!e.shiftKey || G.state !== 'play') return;
    const k = KEYMAP[e.key.toLowerCase()] || KEYMAP[{ '!': '1', '"': '2' }[e.key]];
    if (!k) return;
    e.stopImmediatePropagation(); e.preventDefault(); learn(k);
  }, true);
  // la nuova partita (livello 1) azzera i gradi; il caricamento li ripristina solo se coerenti col livello
  setInterval(() => {
    if (spent() > P.level) { for (const k in A.r) A.r[k] = 0; save(); }
    const before = A.points; refresh();
    if (G.state === 'play' && before > 0 && !A._told) { A._told = true; toast('<b>Scegli le tue abilità</b><small>Ogni livello dà un punto: clicca il + sullo slot, oppure Maiusc + tasto. Il primo punto sblocca un’abilità.</small>', '#ffd070', 7000); }
  }, 400);
  setInterval(save, 5000);
}
