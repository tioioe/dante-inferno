/* ============================================================================
   EDITOR DELLE MAPPE — vista dall'alto: x verso destra, z verso il basso.
   Le modifiche si salvano da sole nel browser (il gioco le usa subito);
   "Salva maps.js" le scrive anche nel file, così restano nel progetto.
   NB: expand() ripete la logica delle forme di main.js (expandShapes): tienile allineate.
   ============================================================================ */
import { MAPS as BASE } from './maps.js';

const CW = 4.6, KEY = 'dante_maps_override';
const $ = s => document.querySelector(s);
const clone = o => JSON.parse(JSON.stringify(o));
const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hexOf = n => '#' + (n >>> 0).toString(16).padStart(6, '0');
const numOf = h => parseInt(h.slice(1), 16);
const TITLES = { 1: 'CERCHIO I — LIMBO', 2: 'CERCHIO II — I LUSSURIOSI', 3: 'CERCHIO III — I GOLOSI' };
const SHAPES = ['circle', 'lobes', 'cross', 'hall', 'peanut', 'islands', 'ring', 'custom'];
const SHAPE_NAMES = { circle: 'Disco', lobes: 'Trifoglio', cross: 'Croce', hall: 'Sala lunga', peanut: 'Due sale unite', islands: 'Isole con ponti', ring: 'Arena con buca', custom: 'Libera (capsule)' };
const TEXS = { '': '(pietra procedurale)', slate_floor_02: 'Ardesia', volcanic_rock_tiles: 'Roccia vulcanica', dark_rock_02: 'Roccia scura', cobblestone_floor_06: 'Ciottoli', castle_brick_broken_06: 'Mattoni rotti', marble_tiles: 'Marmo a piastrelle', marble_cliff_03: 'Scogliera di marmo' };
const DECORS = ['pillars', 'ruins', 'obelisks', 'crystals', 'statues', 'avenue', 'none'];
const DECOR_NAMES = { pillars: 'Colonne', ruins: 'Muri sbrecciati', obelisks: 'Obelischi', crystals: 'Cristalli', statues: 'Statue', avenue: 'Viale di colonne', none: 'Nessuno' };
const PROPS = { pillar: 'Colonna', obelisk: 'Obelisco', crystal: 'Cristalli', statue: 'Statua', ruin: 'Muro', dais: 'Pedana', brazier: 'Braciere' };
const PROP_COL = { pillar: '#b0a49a', obelisk: '#e0b070', crystal: '#7a9aff', statue: '#c8c0d0', ruin: '#9a8a7a', dais: '#d0a060', brazier: '#ff8a30' };

/* ---------- dati ---------- */
let DATA = clone(BASE);
try { const raw = localStorage.getItem(KEY); if (raw) { const o = JSON.parse(raw); for (const k of Object.keys(o)) if (Array.isArray(o[k]) && o[k].length) DATA[k] = o[k]; } } catch (e) { console.warn(e); }
const S = { circle: '1', sel: 0, selProp: -1, selCap: -1, selSpot: -1, cam: { x: 80, z: 0, zoom: 3 }, drag: null, place: null, hist: [], hi: -1, world: null, mouse: { x: 0, z: 0 }, space: false, saved: 'none', saveT: 0 };
const list = () => DATA[S.circle];
const cur = () => list()[S.sel];

/* ---------- geometria (stessa logica del gioco) ---------- */
function capDist(s, x, z) {
  const vx = s.bx - s.ax, vz = s.bz - s.az, l2 = vx * vx + vz * vz, t = l2 > 0 ? clamp(((x - s.ax) * vx + (z - s.az) * vz) / l2, 0, 1) : 0;
  return Math.hypot(x - (s.ax + vx * t), z - (s.az + vz * t));
}
const inShapes = (c, x, z, m = 0) => c.S.some(s => capDist(s, x, z) <= s.w - m);
function expand(c) {
  const r = c.r, fwd = c.toNext !== null ? c.toNext : c.toPrev + Math.PI;
  const dx = Math.sin(fwd), dz = Math.cos(fwd), px = Math.cos(fwd), pz = -Math.sin(fwd);
  const cap = (ax, az, bx, bz, w) => ({ ax: c.x + ax, az: c.z + az, bx: c.x + bx, bz: c.z + bz, w });
  const out = []; let spots = null;
  if (c.shapes) c.shapes.forEach(([ax, az, bx, bz, w]) => out.push(cap(ax, az, bx, bz, w)));
  else switch (c.shape || 'circle') {
    case 'lobes': out.push(cap(0, 0, 0, 0, r * 0.46)); for (let k = 0; k < 3; k++) { const a = fwd + k * 2.0944, x = Math.sin(a) * r * 0.5, z = Math.cos(a) * r * 0.5; out.push(cap(x, z, x, z, r * 0.5)); } break;
    case 'cross': { const w = r * 0.3, e = r - w; out.push(cap(-dx * e, -dz * e, dx * e, dz * e, w), cap(-px * r * 0.72, -pz * r * 0.72, px * r * 0.72, pz * r * 0.72, w)); break; }
    case 'hall': out.push(cap(-dx * r * 0.5, -dz * r * 0.5, dx * r * 0.5, dz * r * 0.5, r * 0.5)); break;
    case 'peanut': { const o = r * 0.45; out.push(cap(dx * o, dz * o, dx * o, dz * o, r * 0.55), cap(-dx * o, -dz * o, -dx * o, -dz * o, r * 0.55), cap(-dx * o, -dz * o, dx * o, dz * o, r * 0.3)); break; }
    case 'islands': { out.push(cap(0, 0, 0, 0, r * 0.32)); spots = []; for (let k = 0; k < 3; k++) { const a = fwd + k * 2.0944, sx = Math.sin(a) * r * 0.62, sz = Math.cos(a) * r * 0.62; out.push(cap(sx, sz, sx, sz, r * 0.28), cap(0, 0, sx, sz, 1.6)); spots.push([sx, sz]); } break; }
    case 'ring': out.push(cap(0, 0, 0, 0, r)); break;
    default: out.push(cap(0, 0, 0, 0, r));
  }
  c.S = out;
  const pit = c.pit || (c.shape === 'ring' && !c.shapes ? [0, 0, r * 0.3] : null);
  c.pitA = pit ? { x: c.x + pit[0], z: c.z + pit[1], r: pit[2] } : null;
  c.spotsDef = spots || [0, 1, 2].map(i => { const a = c.toPrev + 2.0944 * (i + 0.5) + 0.2; return [Math.sin(a) * r * 0.5, Math.cos(a) * r * 0.5]; });
}
function computeWorld() {
  const chs = list().map((d, i) => Object.assign({}, d, { i }));
  chs.forEach((c, i) => {
    c.toPrev = i > 0 ? Math.atan2(chs[i - 1].x - c.x, chs[i - 1].z - c.z) : Math.PI;
    c.toNext = i < chs.length - 1 ? Math.atan2(chs[i + 1].x - c.x, chs[i + 1].z - c.z) : null;
    expand(c);
  });
  const links = [];
  for (let i = 0; i < chs.length - 1; i++) {
    const a = chs[i], b = chs[i + 1], dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz) || 1;
    const l = { a, b, dx: dx / L, dz: dz / L, L };
    let t = 0; while (t < 80 && inShapes(a, a.x + l.dx * t, a.z + l.dz * t)) t += 0.25;
    l.ed = Math.max(2, t - 0.25); l.gx = a.x + l.dx * (l.ed + 0.2); l.gz = a.z + l.dz * (l.ed + 0.2); links.push(l);
  }
  S.world = { chs, links };
}

/* ---------- canvas ---------- */
const cv = $('#cv'), ctx = cv.getContext('2d');
let W = 0, H = 0;
function resize() { const r = cv.parentElement.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2); W = r.width; H = r.height; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); draw(); }
const X = x => (x - S.cam.x) * S.cam.zoom + W / 2, Z = z => (z - S.cam.z) * S.cam.zoom + H / 2;
const wx = px => (px - W / 2) / S.cam.zoom + S.cam.x, wz = py => (py - H / 2) / S.cam.zoom + S.cam.z;
const mul = (hex, f) => { const c = [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255]; return c.map((v, i) => Math.round(v * f[i] / 255)); };
function fillOf(c) { const f = mul(c.floor === undefined ? 0xffffff : c.floor, [78, 66, 62]); return `rgb(${f[0]},${f[1]},${f[2]})`; }
function capsule(s, extra, color) {
  ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1, (2 * s.w + extra) * S.cam.zoom);
  ctx.beginPath(); ctx.moveTo(X(s.ax), Z(s.az)); ctx.lineTo(X(s.bx) + 0.01, Z(s.bz)); ctx.stroke();
}
function drawProp(p, cx, cz, hi) {
  const x = X(cx + p.x), z = Z(cz + p.z), r = Math.max(4, (p.r || 1.2) * S.cam.zoom * (p.t === 'dais' ? 1 : 0.9)), col = PROP_COL[p.t] || '#fff';
  ctx.fillStyle = col; ctx.strokeStyle = hi ? '#fff' : '#000'; ctx.lineWidth = hi ? 2 : 1;
  ctx.beginPath();
  if (p.t === 'obelisk') { ctx.moveTo(x, z - r * 1.2); ctx.lineTo(x + r, z); ctx.lineTo(x, z + r * 1.2); ctx.lineTo(x - r, z); ctx.closePath(); }
  else if (p.t === 'crystal') { ctx.moveTo(x, z - r * 1.3); ctx.lineTo(x + r, z + r); ctx.lineTo(x - r, z + r); ctx.closePath(); }
  else if (p.t === 'ruin') { ctx.save(); ctx.translate(x, z); ctx.rotate(-(p.a || 0)); ctx.rect(-(p.L || 4.5) * S.cam.zoom / 2, -r * 0.4, (p.L || 4.5) * S.cam.zoom, r * 0.8); ctx.restore(); }
  else if (p.t === 'dais') { ctx.arc(x, z, (p.r || 5) * S.cam.zoom, 0, 6.283); ctx.globalAlpha = 0.35; ctx.fill(); ctx.globalAlpha = 1; ctx.stroke(); return; }
  else ctx.arc(x, z, r, 0, 6.283);
  ctx.fill(); ctx.stroke();
}
function handle(x, z, color = '#ffd070', sq = false) {
  ctx.fillStyle = color; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.beginPath();
  if (sq) ctx.rect(X(x) - 6, Z(z) - 6, 12, 12); else ctx.arc(X(x), Z(z), 6, 0, 6.283);
  ctx.fill(); ctx.stroke();
}
function draw() {
  if (!S.world) return;
  ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#0a0606'; ctx.fillRect(0, 0, W, H);
  const g = 10 * S.cam.zoom;                                                          // griglia da 10 unità
  ctx.strokeStyle = '#1a1210'; ctx.lineWidth = 1; ctx.beginPath();
  for (let x = ((-S.cam.x * S.cam.zoom + W / 2) % g + g) % g; x < W; x += g) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = ((-S.cam.z * S.cam.zoom + H / 2) % g + g) % g; y < H; y += g) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();
  const { chs, links } = S.world;
  for (const l of links) {                                                            // corridoi
    ctx.strokeStyle = '#2e2420'; ctx.lineCap = 'butt'; ctx.lineWidth = CW * 2 * S.cam.zoom;
    ctx.beginPath(); ctx.moveTo(X(l.a.x), Z(l.a.z)); ctx.lineTo(X(l.b.x), Z(l.b.z)); ctx.stroke();
    ctx.strokeStyle = '#ff6a30'; ctx.lineWidth = 3; ctx.beginPath();                  // cancello
    ctx.moveTo(X(l.gx - l.dz * CW), Z(l.gz + l.dx * CW)); ctx.lineTo(X(l.gx + l.dz * CW), Z(l.gz - l.dx * CW)); ctx.stroke();
  }
  chs.forEach((c, i) => {
    const ring = hexOf(c.ring === undefined ? 0xff3a10 : c.ring);
    for (const s of c.S) capsule(s, 0.7, ring);                                       // bordo = capsule più grande sotto
    for (const s of c.S) capsule(s, 0, fillOf(c));
    if (c.pitA) {
      ctx.fillStyle = c.abyss ? '#120e2c' : '#c24a14'; ctx.strokeStyle = ring; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(X(c.pitA.x), Z(c.pitA.z), c.pitA.r * S.cam.zoom, 0, 6.283); ctx.fill(); ctx.stroke();
    }
    if (i === S.sel) {                                                                // evidenzia la camera selezionata
      ctx.globalAlpha = 0.18; for (const s of c.S) capsule(s, 0, '#ffd070'); ctx.globalAlpha = 1;
    }
    (c.props || []).forEach((p, pi) => drawProp(p, c.x, c.z, i === S.sel && pi === S.selProp));
    ctx.fillStyle = i === S.sel ? '#ffd070' : '#d8c4a4'; ctx.font = `${i === S.sel ? 'bold ' : ''}13px Georgia`; ctx.textAlign = 'center';
    ctx.fillText(`${i + 1}. ${c.name || '(senza nome)'}`, X(c.x), Z(c.z) - (c.r + 2) * S.cam.zoom * 0.0 - 4);
    ctx.fillStyle = '#9a8468'; ctx.font = '11px Georgia';
    ctx.fillText(`${SHAPE_NAMES[c.shapes ? 'custom' : c.shape || 'circle']} · ${c.decor === undefined ? 'colonne' : DECOR_NAMES[c.decor] || c.decor}`, X(c.x), Z(c.z) + 11);
    if (i === 0) { ctx.fillStyle = '#8ad07a'; ctx.fillText('▶ partenza', X(c.x), Z(c.z) + 24); }
    if (i === chs.length - 1) { ctx.fillStyle = '#c080ff'; ctx.fillText('◆ boss e portale', X(c.x), Z(c.z) + 24); }
    if (i === 2 || c.spots) {                                                          // bracieri dell'enigma
      const sp = c.spots || c.spotsDef;
      if (i === 2) sp.forEach(([dx, dz], si) => { ctx.fillStyle = '#ffc030'; ctx.strokeStyle = si === S.selSpot && i === S.sel ? '#fff' : '#000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(c.x + dx), Z(c.z + dz) - 7); ctx.lineTo(X(c.x + dx) + 7, Z(c.z + dz)); ctx.lineTo(X(c.x + dx), Z(c.z + dz) + 7); ctx.lineTo(X(c.x + dx) - 7, Z(c.z + dz)); ctx.closePath(); ctx.fill(); ctx.stroke(); });
    }
  });
  // maniglie della camera selezionata
  const c = S.world.chs[S.sel]; if (!c) return;
  handle(c.x, c.z, '#ffd070', true);
  if (c.shapes) c.shapes.forEach(([ax, az, bx, bz, w], i) => { const hi = i === S.selCap; handle(c.x + ax, c.z + az, hi ? '#fff' : '#7ad0ff'); if (ax !== bx || az !== bz) handle(c.x + bx, c.z + bz, hi ? '#fff' : '#7ad0ff'); });
  else handle(c.x + c.r, c.z, '#7ad0ff');
  if (c.pitA) { handle(c.pitA.x, c.pitA.z, '#ff9a5a', true); handle(c.pitA.x + c.pitA.r, c.pitA.z, '#ff9a5a'); }
  if (S.place) { ctx.fillStyle = PROP_COL[S.place]; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(X(S.mouse.x), Z(S.mouse.z), 9, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1; }
}

/* ---------- interazione ---------- */
const near = (px, pz, x, z, r = 9) => Math.hypot(X(x) - px, Z(z) - pz) <= r;
function pick(px, pz) {
  const c = S.world.chs[S.sel], d = cur();
  if (c) {
    if (c.pitA) {
      if (near(px, pz, c.pitA.x + c.pitA.r, c.pitA.z)) return { k: 'pitR' };
      if (near(px, pz, c.pitA.x, c.pitA.z)) return { k: 'pit' };
    }
    if (d.shapes) for (let i = 0; i < d.shapes.length; i++) {
      const [ax, az, bx, bz] = d.shapes[i];
      if (near(px, pz, c.x + ax, c.z + az)) return { k: 'capA', i }; if ((ax !== bx || az !== bz) && near(px, pz, c.x + bx, c.z + bz)) return { k: 'capB', i };
    } else if (near(px, pz, c.x + c.r, c.z)) return { k: 'radius' };
    if (S.sel === 2) { const sp = d.spots || c.spotsDef; for (let i = 0; i < sp.length; i++) if (near(px, pz, c.x + sp[i][0], c.z + sp[i][1], 10)) return { k: 'spot', i }; }
    const pr = d.props || []; for (let i = pr.length - 1; i >= 0; i--) if (near(px, pz, c.x + pr[i].x, c.z + pr[i].z, Math.max(10, (pr[i].r || 1.2) * S.cam.zoom))) return { k: 'prop', i };
    if (near(px, pz, c.x, c.z, 10)) return { k: 'chamber', i: S.sel };
  }
  for (let i = S.world.chs.length - 1; i >= 0; i--) if (inShapes(S.world.chs[i], wx(px), wz(pz))) return { k: 'chamber', i };
  return null;
}
const snap = v => S.drag && S.drag.alt ? v : Math.round(v * 2) / 2;
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerdown', e => {
  const r = cv.getBoundingClientRect(), px = e.clientX - r.left, pz = e.clientY - r.top, x = wx(px), z = wz(pz);
  cv.setPointerCapture(e.pointerId);
  if (e.button === 1 || e.button === 2 || S.space) { S.drag = { k: 'pan', px, pz, cam: { ...S.cam } }; return; }
  if (S.place) {                                                                      // piazza un arredo con un clic
    const d = cur(); (d.props = d.props || []).push({ t: S.place, x: round(x - d.x, 1), z: round(z - d.z, 1) }); S.selProp = d.props.length - 1;
    commit(); renderPanel(); return;
  }
  const h = pick(px, pz);
  if (!h) { S.drag = { k: 'pan', px, pz, cam: { ...S.cam } }; return; }
  if (h.k === 'chamber' && h.i !== S.sel) { S.sel = h.i; S.selProp = S.selCap = S.selSpot = -1; renderPanel(); }
  const d = cur();
  if (h.k === 'chamber') S.drag = { k: 'chamber', ox: x - d.x, oz: z - d.z };
  else if (h.k === 'prop') { S.selProp = h.i; S.drag = { k: 'prop', i: h.i, ox: x - (d.x + d.props[h.i].x), oz: z - (d.z + d.props[h.i].z) }; renderPanel(); }
  else if (h.k === 'spot') { S.selSpot = h.i; if (!d.spots) d.spots = clone(S.world.chs[S.sel].spotsDef); S.drag = { k: 'spot', i: h.i }; renderPanel(); }
  else if (h.k === 'capA' || h.k === 'capB') { S.selCap = h.i; S.drag = { k: h.k, i: h.i }; renderPanel(); }
  else S.drag = { k: h.k };
  S.drag.alt = e.altKey; draw();
});
cv.addEventListener('pointermove', e => {
  const r = cv.getBoundingClientRect(), px = e.clientX - r.left, pz = e.clientY - r.top, x = wx(px), z = wz(pz);
  S.mouse = { x, z }; $('#stPos').textContent = `x ${x.toFixed(1)}   z ${z.toFixed(1)}   zoom ${S.cam.zoom.toFixed(1)}`;
  const D = S.drag, d = list()[S.sel];
  if (!D) { if (S.place) draw(); return; }
  D.alt = e.altKey; D.moved = true;
  if (D.k === 'pan') { S.cam.x = D.cam.x - (px - D.px) / S.cam.zoom; S.cam.z = D.cam.z - (pz - D.pz) / S.cam.zoom; draw(); return; }
  if (D.k === 'chamber') { d.x = snap(x - D.ox); d.z = snap(z - D.oz); }
  else if (D.k === 'radius') d.r = clamp(Math.round(Math.hypot(x - d.x, z - d.z) * 2) / 2, 6, 45);
  else if (D.k === 'prop') { d.props[D.i].x = round(snap(x - D.ox) - d.x, 1); d.props[D.i].z = round(snap(z - D.oz) - d.z, 1); }
  else if (D.k === 'spot') d.spots[D.i] = [round(snap(x) - d.x, 1), round(snap(z) - d.z, 1)];
  else if (D.k === 'capA') { const s = d.shapes[D.i], circ = s[0] === s[2] && s[1] === s[3]; s[0] = round(snap(x) - d.x, 1); s[1] = round(snap(z) - d.z, 1); if (circ) { s[2] = s[0]; s[3] = s[1]; } }
  else if (D.k === 'capB') { const s = d.shapes[D.i]; s[2] = round(snap(x) - d.x, 1); s[3] = round(snap(z) - d.z, 1); }
  else if (D.k === 'pit') { const c = S.world.chs[S.sel]; const p = d.pit || [c.pitA.x - d.x, c.pitA.z - d.z, c.pitA.r]; d.pit = [round(snap(x) - d.x, 1), round(snap(z) - d.z, 1), p[2]]; }
  else if (D.k === 'pitR') { const c = S.world.chs[S.sel]; const p = d.pit || [c.pitA.x - d.x, c.pitA.z - d.z, c.pitA.r]; d.pit = [p[0], p[1], clamp(round(Math.hypot(x - (d.x + p[0]), z - (d.z + p[1])), 1), 1.5, 30)]; }
  refresh(); syncPanel();
});
cv.addEventListener('pointerup', e => { const D = S.drag; S.drag = null; if (D && D.moved && D.k !== 'pan') commit(); });
cv.addEventListener('wheel', e => {
  e.preventDefault(); const r = cv.getBoundingClientRect(), px = e.clientX - r.left, pz = e.clientY - r.top, bx = wx(px), bz = wz(pz);
  S.cam.zoom = clamp(S.cam.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12), 0.6, 14);
  S.cam.x = bx - (px - W / 2) / S.cam.zoom; S.cam.z = bz - (pz - H / 2) / S.cam.zoom; draw();
}, { passive: false });
addEventListener('keydown', e => {
  if (e.target.matches('input,select,textarea')) return;
  if (e.code === 'Space') { S.space = true; e.preventDefault(); }
  if (e.key === 'Escape') { S.place = null; renderPanel(); hint(); draw(); }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
  if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y')) { e.preventDefault(); redo(); }
  if (e.key === 'Delete' || e.key === 'Backspace') { const d = cur(); if (S.selProp >= 0 && d.props && d.props[S.selProp]) { d.props.splice(S.selProp, 1); S.selProp = -1; commit(); renderPanel(); } }
  if (e.key.toLowerCase() === 'f') fit();
});
addEventListener('keyup', e => { if (e.code === 'Space') S.space = false; });
function fit() {
  const l = list(); const xs = l.map(c => c.x), zs = l.map(c => c.z), pad = 30;
  const x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad, z0 = Math.min(...zs) - pad, z1 = Math.max(...zs) + pad;
  S.cam.x = (x0 + x1) / 2; S.cam.z = (z0 + z1) / 2; S.cam.zoom = clamp(Math.min(W / (x1 - x0), H / (z1 - z0)), 0.6, 14); draw();
}

/* ---------- storia, salvataggio, avvisi ---------- */
const snapshot = () => JSON.stringify({ DATA, circle: S.circle, sel: S.sel });
function commit() {
  const s = snapshot(); if (S.hist[S.hi] === s) { refresh(); return; }
  S.hist = S.hist.slice(0, S.hi + 1); S.hist.push(s); if (S.hist.length > 150) S.hist.shift(); S.hi = S.hist.length - 1;
  refresh(); saveLater();
}
function restore(i) {
  S.hi = i; const o = JSON.parse(S.hist[i]); DATA = o.DATA; S.circle = o.circle; S.sel = clamp(o.sel, 0, list().length - 1); S.selProp = S.selCap = S.selSpot = -1;
  refresh(); renderTabs(); renderPanel(); saveLater();
}
const undo = () => { if (S.hi > 0) restore(S.hi - 1); };
const redo = () => { if (S.hi < S.hist.length - 1) restore(S.hi + 1); };
function saveLater() { S.saved = 'pending'; status(); clearTimeout(S.saveT); S.saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(DATA)); S.saved = 'browser'; } catch (e) { S.saved = 'error'; } status(); }, 250); }
function status() {
  $('#stSave').innerHTML = S.saved === 'browser' ? '<span class="ok">● Salvato nel browser: il gioco usa già queste mappe</span>' : S.saved === 'pending' ? '… salvo' : S.saved === 'file' ? '<span class="ok">● Scritto su maps.js</span>' : S.saved === 'error' ? '<span class="warn">Salvataggio nel browser non riuscito</span>' : 'Nessuna modifica';
  const w = warnings(); $('#stWarn').innerHTML = w.length ? `<span class="warn">⚠ ${w.join(' · ')}</span>` : '';
}
function warnings() {
  const w = [], { chs, links } = S.world;
  if (chs.length < 2) w.push('servono almeno 2 camere');
  links.forEach((l, i) => { if (l.L < l.a.r + l.b.r + 4) w.push(`camere ${i + 1}–${i + 2} troppo vicine`); });
  chs.forEach((c, i) => { (c.props || []).forEach(p => { if (p.t !== 'dais' && !inShapes(c, c.x + p.x, c.z + p.z, 0.5)) w.push(`arredo fuori forma in camera ${i + 1}`); }); });
  return [...new Set(w)];
}
function refresh() { computeWorld(); draw(); status(); }
function hint() {
  $('#hint').textContent = S.place ? `Clic sulla mappa per piazzare: ${PROPS[S.place]}. Esc per finire.` :
    'Trascina una camera per spostarla · maniglia azzurra = dimensione · rotella = zoom · spazio o tasto destro + trascina = sposta la vista · Alt = senza griglia · F = inquadra tutto · Canc = elimina arredo';
}

/* ---------- salvataggio su maps.js ---------- */
const fmtNum = v => String(round(v));
const fmtProp = p => '{ ' + Object.entries(p).map(([k, v]) => `${k}: ${typeof v === 'string' ? `'${v}'` : fmtNum(v)}`).join(', ') + ' }';
function fmtChamber(c) {
  const hex = n => '0x' + (n >>> 0).toString(16).padStart(6, '0'), q = s => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  const a = [`name: ${q(c.name || '')}`, `x: ${fmtNum(c.x)}`, `z: ${fmtNum(c.z)}`, `r: ${fmtNum(c.r)}`];
  if (c.shapes) a.push(`shapes: ${JSON.stringify(c.shapes.map(s => s.map(v => round(v))))}`); else if (c.shape) a.push(`shape: ${q(c.shape)}`);
  if (c.decor !== undefined) a.push(`decor: ${q(c.decor)}`); if (c.n !== undefined) a.push(`n: ${fmtNum(c.n)}`);
  if (c.abyss) a.push('abyss: true');
  const tx = []; for (const k of ['tex', 'cliff', 'wall', 'path']) if (c[k]) tx.push(`${k}: ${q(c[k])}`);
  if (c.ts !== undefined) tx.push(`ts: ${fmtNum(c.ts)}`); if (c.bright !== undefined) tx.push(`bright: ${fmtNum(c.bright)}`);
  if (c.cliffTint !== undefined) tx.push(`cliffTint: ${hex(c.cliffTint)}`); if (c.wet !== undefined) tx.push(`wet: ${fmtNum(c.wet)}`);
  if (c.pitColor !== undefined) tx.push(`pitColor: ${hex(c.pitColor)}`);
  const l2 = []; if (tx.length) l2.push(tx.join(', '));
  const cols = []; if (c.stone !== undefined) cols.push(`stone: ${hex(c.stone)}`); if (c.floor !== undefined) cols.push(`floor: ${hex(c.floor)}`); if (c.ring !== undefined) cols.push(`ring: ${hex(c.ring)}`);
  if (c.pit) cols.push(`pit: ${JSON.stringify(c.pit.map(v => round(v)))}`); if (c.spots) cols.push(`spots: ${JSON.stringify(c.spots.map(s => s.map(v => round(v))))}`);
  if (cols.length) l2.push(cols.join(', '));
  let s = '    { ' + a.join(', ');
  if (l2.length) s += ',\n      ' + l2.join(',\n      ');
  if (c.props && c.props.length) s += ',\n      props: [' + c.props.map(fmtProp).join(', ') + ']';
  return s + ' }';
}
async function makeFile() {
  let header = '/* maps.js — scritto dall\'editor delle mappe */\n\n';
  try { const t = await (await fetch('./maps.js?' + Date.now(), { cache: 'no-store' })).text(); const i = t.indexOf('export const MAPS'); if (i > 0) header = t.slice(0, i); } catch (e) { /* intestazione di riserva */ }
  let body = 'export const MAPS = {\n';
  const keys = Object.keys(DATA).sort();
  keys.forEach((k, ki) => { body += `  /* ---------------- ${TITLES[k] || 'CERCHIO ' + k} ---------------- */\n  ${k}: [\n` + DATA[k].map(fmtChamber).join(',\n\n') + '\n  ]' + (ki < keys.length - 1 ? ',\n\n' : '\n'); });
  return header + body + '};\n';
}
async function saveFile() {
  const text = await makeFile();
  try {
    if (window.showSaveFilePicker) {
      const h = await showSaveFilePicker({ suggestedName: 'maps.js', types: [{ description: 'JavaScript', accept: { 'text/javascript': ['.js'] } }] });
      const w = await h.createWritable(); await w.write(text); await w.close(); S.saved = 'file'; status(); return;
    }
    throw new Error('noapi');
  } catch (e) {
    if (e && e.name === 'AbortError') return;
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/javascript' })); a.download = 'maps.js'; a.click();
    alert('Ho scaricato maps.js: copialo nella cartella del gioco al posto del vecchio (D:\\DanteInferno\\maps.js).');
  }
}
window.__editor = { S, DATA: () => DATA, makeFile, commit, computeWorld };

/* ---------- pannello ---------- */
function renderTabs() {
  $('#tabs').innerHTML = Object.keys(DATA).sort().map(k => `<button data-circle="${k}" class="${k === S.circle ? 'on' : ''}">Cerchio ${k === '1' ? 'I' : k === '2' ? 'II' : k === '3' ? 'III' : k}</button>`).join('');
}
const opt = (obj, v) => Object.entries(obj).map(([k, n]) => `<option value="${k}" ${k === v ? 'selected' : ''}>${n}</option>`).join('');
function renderPanel() {
  const d = cur(), c = S.world.chs[S.sel], side = $('#side'); if (!d) { side.innerHTML = ''; return; }
  const shape = d.shapes ? 'custom' : d.shape || 'circle', auto = d.n === undefined;
  const pit = d.pit || (shape === 'ring' ? c.pitA && [c.pitA.x - d.x, c.pitA.z - d.z, c.pitA.r] : null);
  let h = `<h2>Camera ${S.sel + 1} di ${list().length}</h2>
    <label>Nome <input type="text" data-f="name" value="${(d.name || '').replace(/"/g, '&quot;')}"></label>
    <div class="row"><label>X <input type="number" step="0.5" data-f="x" value="${d.x}"></label><label>Z <input type="number" step="0.5" data-f="z" value="${d.z}"></label></div>
    <label>Dimensione (raggio) <span id="rv">${d.r}</span><input type="range" min="8" max="40" step="0.5" data-f="r" value="${d.r}"></label>
    <label>Forma <select data-f="shape">${opt(SHAPE_NAMES, shape)}</select></label>`;
  if (shape === 'custom') {
    h += `<div class="note">Forma libera: ogni riga è una capsula (A→B, con larghezza). Un disco ha A = B. Trascina le maniglie azzurre sulla mappa.</div><div class="list">` +
      d.shapes.map((s, i) => `<div class="item" style="${i === S.selCap ? 'background:#2a1c14' : ''}" data-capsel="${i}">${[0, 1, 2, 3, 4].map(k => `<input type="number" step="0.5" title="${['ax', 'az', 'bx', 'bz', 'larghezza'][k]}" data-cap="${i}" data-k="${k}" value="${s[k]}">`).join('')}<button data-act="capdel" data-i="${i}">✕</button></div>`).join('') +
      `</div><button data-act="capadd">+ Capsula</button>`;
  }
  h += `<div class="chk"><input type="checkbox" id="pitOn" data-act="pit" ${pit ? 'checked' : ''}><label for="pitOn" style="margin:0;color:inherit">Buca al centro (abisso o lava)</label></div>`;
  if (pit) h += `<div class="row"><label>Raggio buca <input type="number" step="0.5" data-pit="2" value="${round(pit[2], 1)}"></label><label>dx <input type="number" step="0.5" data-pit="0" value="${round(pit[0], 1)}"></label><label>dz <input type="number" step="0.5" data-pit="1" value="${round(pit[1], 1)}"></label></div>
      <div class="chk"><input type="checkbox" id="abyss" data-f="abyss" ${d.abyss ? 'checked' : ''}><label for="abyss" style="margin:0;color:inherit">Vuoto invece di lava</label></div>
      ${d.abyss ? `<label>Colore della buca <input type="color" data-f="pitColor" value="${hexOf(d.pitColor === undefined ? 0x120e2c : d.pitColor)}"></label>` : ''}`;
  if (S.sel === 2) {
    h += `<div class="chk"><input type="checkbox" id="spotsOn" data-act="spots" ${d.spots ? 'checked' : ''}><label for="spotsOn" style="margin:0;color:inherit">Bracieri dell'enigma a mano (rombi gialli)</label></div>`;
  }
  h += `<h2>Arredi</h2>
    <label>Arredo casuale <select data-f="decor">${opt(DECOR_NAMES, d.decor === undefined ? 'pillars' : d.decor)}</select></label>
    <div class="row"><div class="chk"><input type="checkbox" id="nauto" data-act="nauto" ${auto ? 'checked' : ''}><label for="nauto" style="margin:0;color:inherit">Quantità automatica</label></div><label style="${auto ? 'opacity:.4' : ''}">Pezzi <input type="number" min="0" max="30" data-f="n" value="${auto ? '' : d.n}" ${auto ? 'disabled' : ''}></label></div>
    <div class="note">Gli arredi casuali li piazza il gioco con un seme fisso (escono sempre uguali). Per posizioni esatte, scegli "Nessuno" e aggiungili a mano qui sotto.</div>
    <div>${Object.entries(PROPS).map(([k, n]) => `<span class="chip" data-place="${k}" style="${S.place === k ? 'border-color:#ffd070;background:#4a3010' : ''}">+ ${n}</span>`).join('')}</div>`;
  const pr = d.props || [];
  if (pr.length) h += `<div class="list">` + pr.map((p, i) => `<div class="item" data-propsel="${i}" style="${i === S.selProp ? 'background:#2a1c14' : ''}"><select data-prop="${i}" data-k="t">${opt(PROPS, p.t)}</select><input type="number" step="0.5" data-prop="${i}" data-k="x" value="${p.x}"><input type="number" step="0.5" data-prop="${i}" data-k="z" value="${p.z}"><button data-act="propdel" data-i="${i}">✕</button></div>`).join('') + `</div>`;
  h += `<h2>Texture (materiali reali)</h2>
    <label>Pavimento <select data-f="tex">${opt(TEXS, d.tex || '')}</select></label>
    <label>Pareti della piattaforma <select data-f="cliff">${opt(TEXS, d.cliff || '')}</select></label>
    <label>Colonne, muri, statue <select data-f="wall">${opt(TEXS, d.wall || '')}</select></label>
    <label>Corridoio in uscita <select data-f="path">${opt(TEXS, d.path || '')}</select></label>
    <div class="row"><label>Grandezza piastrella <span>${d.ts === undefined ? 6 : d.ts}</span><input type="range" min="3" max="16" step="0.5" data-f="ts" value="${d.ts === undefined ? 6 : d.ts}"></label>
    <label>Luminosità <span>${d.bright === undefined ? 1.7 : d.bright}</span><input type="range" min="0.8" max="3.5" step="0.1" data-f="bright" value="${d.bright === undefined ? 1.7 : d.bright}"></label></div>
    <div class="row"><label>Tinta pareti <input type="color" data-f="cliffTint" value="${hexOf(d.cliffTint === undefined ? 0x8a7a72 : d.cliffTint)}"></label>
    <label>Bagnato <span>${d.wet === undefined ? 0 : d.wet}</span><input type="range" min="0" max="1" step="0.05" data-f="wet" value="${d.wet === undefined ? 0 : d.wet}"></label></div>
    <div class="note">Le texture (rilievo e rugosità comprese) vengono da assets/tex. Il gioco mostra l'anteprima solo nel gioco: qui vedi forme e posizioni.</div>
  <h2>Colori</h2>
    <div class="row"><label>Pietra arredi <input type="color" data-f="stone" value="${hexOf(d.stone === undefined ? 0x3a2a28 : d.stone)}"></label>
    <label>Pavimento <input type="color" data-f="floor" value="${hexOf(d.floor === undefined ? 0xffffff : d.floor)}"></label>
    <label>Bordi <input type="color" data-f="ring" value="${hexOf(d.ring === undefined ? 0xff3a10 : d.ring)}"></label></div>`;
  if (S.circle === '1' && S.sel === 0) h += `<div class="note">La Selva Oscura: gli alberi li aggiunge story.js e si aspetta un disco. Meglio lasciarla come "Disco".</div>`;
  if (S.sel === list().length - 1) h += `<div class="note">Ultima camera: qui compaiono il boss e il portale.</div>`;
  side.innerHTML = h;
}
function syncPanel() {
  const d = cur(); if (!d) return;
  document.querySelectorAll('#side [data-f]').forEach(el => { if (document.activeElement === el) return; const f = el.dataset.f; if (f === 'x' || f === 'z' || f === 'r') el.value = d[f]; });
  const rv = $('#rv'); if (rv) rv.textContent = d.r;
}
const side = $('#side');
function setField(el) {
  const d = cur(), f = el.dataset.f; if (!f) return false;
  if (el.type === 'checkbox') d[f] = el.checked || undefined;
  else if (el.type === 'color') d[f] = numOf(el.value);
  else if (el.type === 'number' || el.type === 'range') { if (el.value === '') return true; d[f] = parseFloat(el.value); }
  else d[f] = el.value;
  if (f === 'abyss' && !el.checked) delete d.abyss;
  if (['tex', 'cliff', 'wall', 'path'].includes(f) && !el.value) delete d[f];
  if (f === 'shape') {
    const c = S.world.chs[S.sel];
    if (el.value === 'custom') { if (!d.shapes) d.shapes = c.S.map(s => [round(s.ax - d.x, 1), round(s.az - d.z, 1), round(s.bx - d.x, 1), round(s.bz - d.z, 1), round(s.w, 1)]); d.shape = 'custom'; }
    else { delete d.shapes; d.shape = el.value; S.selCap = -1; }
    renderPanel();
  }
  if (f === 'decor' && d.decor === 'pillars') { /* esplicito: va bene */ }
  return true;
}
side.addEventListener('input', e => {
  const el = e.target, d = cur();
  if (el.dataset.f) { if (el.dataset.f === 'shape') return; setField(el); refresh(); syncPanel(); }
  else if (el.dataset.cap !== undefined) { d.shapes[+el.dataset.cap][+el.dataset.k] = parseFloat(el.value) || 0; refresh(); }
  else if (el.dataset.prop !== undefined && el.dataset.k !== 't') { d.props[+el.dataset.prop][el.dataset.k] = parseFloat(el.value) || 0; refresh(); }
  else if (el.dataset.pit !== undefined) { const c = S.world.chs[S.sel]; const p = d.pit ? d.pit.slice() : [c.pitA.x - d.x, c.pitA.z - d.z, c.pitA.r]; p[+el.dataset.pit] = parseFloat(el.value) || 0; d.pit = p; refresh(); }
});
side.addEventListener('change', e => {
  const el = e.target, d = cur();
  if (el.dataset.f === 'shape') setField(el);
  else if (el.dataset.f) setField(el);
  else if (el.dataset.prop !== undefined && el.dataset.k === 't') d.props[+el.dataset.prop].t = el.value;
  else if (el.dataset.act === 'pit') { if (el.checked) d.pit = [0, 0, round(d.r * 0.3, 1)]; else { delete d.pit; if (d.shape === 'ring') { d.shape = 'circle'; } } renderPanel(); }
  else if (el.dataset.act === 'spots') { if (el.checked) d.spots = clone(S.world.chs[S.sel].spotsDef.map(s => s.map(v => round(v, 1)))); else delete d.spots; renderPanel(); }
  else if (el.dataset.act === 'nauto') { if (el.checked) delete d.n; else d.n = 6; renderPanel(); }
  commit(); if (el.dataset.f === 'decor') renderPanel();
});
side.addEventListener('click', e => {
  const t = e.target.closest('[data-act],[data-place],[data-propsel],[data-capsel]'), d = cur(); if (!t) return;
  if (t.dataset.place) { S.place = S.place === t.dataset.place ? null : t.dataset.place; hint(); renderPanel(); draw(); return; }
  if (t.dataset.act === 'propdel') { d.props.splice(+t.dataset.i, 1); S.selProp = -1; commit(); renderPanel(); return; }
  if (t.dataset.act === 'capdel') { if (d.shapes.length > 1) { d.shapes.splice(+t.dataset.i, 1); S.selCap = -1; commit(); renderPanel(); } return; }
  if (t.dataset.act === 'capadd') { d.shapes.push([0, 0, 0, 0, 6]); S.selCap = d.shapes.length - 1; commit(); renderPanel(); return; }
  if (t.dataset.propsel !== undefined && e.target.tagName === 'DIV') { S.selProp = +t.dataset.propsel; draw(); renderPanel(); }
  if (t.dataset.capsel !== undefined && e.target.tagName === 'DIV') { S.selCap = +t.dataset.capsel; draw(); renderPanel(); }
});

/* ---------- barra ---------- */
$('#tabs').addEventListener('click', e => { const b = e.target.closest('[data-circle]'); if (!b) return; S.circle = b.dataset.circle; S.sel = 0; S.selProp = S.selCap = S.selSpot = -1; S.place = null; refresh(); renderTabs(); renderPanel(); fit(); hint(); });
$('#bAdd').onclick = () => {
  const l = list(), d = cur(), n = clone(d); n.name = 'Nuova camera'; n.x = d.x + 40; n.z = d.z; delete n.props; delete n.spots;
  if (S.sel === 0 && S.circle === '1') { n.shape = 'circle'; }
  l.splice(S.sel + 1, 0, n); S.sel++; S.selProp = S.selCap = S.selSpot = -1; commit(); renderPanel(); fit();
};
$('#bDel').onclick = () => { const l = list(); if (l.length <= 2) { alert('Servono almeno due camere.'); return; } if (!confirm(`Eliminare la camera "${cur().name}"?`)) return; l.splice(S.sel, 1); S.sel = Math.min(S.sel, l.length - 1); S.selProp = -1; commit(); renderPanel(); };
$('#bUndo').onclick = undo; $('#bRedo').onclick = redo;
$('#bPlay').onclick = () => { clearTimeout(S.saveT); try { localStorage.setItem(KEY, JSON.stringify(DATA)); } catch (e) { /* ignora */ } window.open('./index.html', 'dante_game'); };
$('#bSave').onclick = saveFile;
$('#bReset').onclick = () => { if (!confirm('Tornare alle mappe di maps.js? Le modifiche non salvate nel file andranno perse.')) return; localStorage.removeItem(KEY); DATA = clone(BASE); S.circle = '1'; S.sel = 0; S.hist = []; S.hi = -1; S.saved = 'none'; refresh(); S.hist = [snapshot()]; S.hi = 0; renderTabs(); renderPanel(); fit(); };
addEventListener('resize', resize);

/* ---------- avvio ---------- */
computeWorld(); S.hist = [snapshot()]; S.hi = 0; renderTabs(); renderPanel(); hint(); resize(); fit(); status();
