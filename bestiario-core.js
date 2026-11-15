/* ============================================================
   bestiario-core.js — i mostri veri della Divina Commedia, modellati e animati a mano
   (nessun file esterno: tutta geometria, texture e animazioni generate qui).

   Minosse (Inf. V), Cerbero (Inf. VI), Caronte (Inf. III), le Arpie (Inf. XIII),
   le Furie (Inf. IX), il Minotauro (Inf. XII), i Malebranche (Inf. XXI-XXII).

   Ogni modello è un oggetto { scene, anims, height, minY } come quelli di main.js, quindi si
   usa con makeActor() senza toccare il resto. Convenzioni: il mostro guarda verso +Z, i piedi
   stanno a y=0, i nodi animati hanno un nome (hips, spine, head, jaw, shL, elL, hipL, kneeL…).
   I nodi che iniziano per "fx_" sono punti di emissione per bestiario.js (fiamme, bava, fumo).
   Usato da bestiario.js (gioco) e bestiario-lab.html (galleria).
   ============================================================ */
import * as THREE from 'three';
import { mergeGeometries } from './lib/jsm/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2;
const clamp01 = x => Math.max(0, Math.min(1, x));
const ss = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };   // smoothstep
const SN = (base, amp, f = 1, ph = 0) => t => base + amp * Math.sin(TAU * (f * t + ph));          // onda periodica

/* ---------------- rumore e texture della pelle ---------------- */
function hash(i, j, s) { let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(s, 1442695041)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
const md = (a, p) => ((a % p) + p) % p;
function vnoise(x, y, px, py, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(md(xi, px), md(yi, py), s), b = hash(md(xi + 1, px), md(yi, py), s), c = hash(md(xi, px), md(yi + 1, py), s), d = hash(md(xi + 1, px), md(yi + 1, py), s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, px, py, s, o = 4) { let a = 0, amp = 0.5, f = 1, sum = 0; for (let i = 0; i < o; i++) { a += amp * vnoise(x * f, y * f, px * f, py * f, s + i * 17); sum += amp; amp *= 0.5; f *= 2; } return a / sum; }

const TEX = new Map();
/* kind: leather | fur | scale | cloth | bone | wood | feather — c0 scuro, c1 chiaro (esadecimali) */
function skinTex(kind, c0, c1, seed = 1, size = 256) {
  const key = [kind, c0, c1, seed, size].join('|'); if (TEX.has(key)) return TEX.get(key);
  const A = new THREE.Color(c0), B = new THREE.Color(c1);
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = size; return c; };
  const cc = mk(), cb = mk(), xc = cc.getContext('2d'), xb = cb.getContext('2d');
  const ic = xc.createImageData(size, size), ib = xb.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size; let h = 0.5, dark = 0;
    if (kind === 'leather') {
      const n = fbm(u * 8, v * 8, 8, 8, seed), cr = Math.abs(fbm(u * 6, v * 6, 6, 6, seed + 9) - 0.5) * 2, ridge = 1 - ss(0, 0.07, cr);
      h = n * 0.75 + (1 - ridge) * 0.25; dark = ridge * 0.28 + (1 - n) * 0.18;
    } else if (kind === 'fur') {
      const n1 = fbm(u * 48, v * 6, 48, 6, seed, 3), n2 = fbm(u * 8, v * 2, 8, 2, seed + 5, 3); h = n1 * 0.7 + n2 * 0.3; dark = (1 - n1) * 0.25;
    } else if (kind === 'feather') {
      const n1 = fbm(u * 24, v * 3, 24, 3, seed, 3), st = 0.5 + 0.5 * Math.sin(TAU * (u * 24 + n1 * 1.5)); h = n1 * 0.5 + st * 0.5; dark = (1 - st) * 0.2;
    } else if (kind === 'scale') {
      const rows = 14, row = Math.floor(v * rows), cu = (((u * rows + (row % 2) * 0.5) % 1) + 1) % 1 - 0.5, cv = ((v * rows) % 1) - 0.5;
      const d = Math.sqrt(cu * cu + cv * cv * 1.3); h = 1 - ss(0.18, 0.62, d) * 0.9; h += (fbm(u * 10, v * 10, 10, 10, seed, 2) - 0.5) * 0.25; dark = ss(0.35, 0.6, d) * 0.5;
    } else if (kind === 'cloth') {
      const wv = 0.5 + 0.2 * Math.sin(TAU * u * 16) + 0.2 * Math.sin(TAU * v * 16), st = fbm(u * 5, v * 5, 5, 5, seed, 4);
      h = wv * 0.4 + st * 0.6; dark = (1 - st) * 0.45;
    } else if (kind === 'bone') {
      const n = fbm(u * 5, v * 5, 5, 5, seed, 4), st = 0.5 + 0.5 * Math.sin(TAU * (v * 14 + n * 2)); h = n * 0.6 + st * 0.4; dark = (1 - n) * 0.3;
    } else if (kind === 'wood') {
      const n = fbm(u * 3, v * 40, 3, 40, seed, 3); h = n; dark = (1 - n) * 0.35 + (hash(Math.floor(u * 30), Math.floor(v * 4), seed) > 0.93 ? 0.3 : 0);
    }
    const k = (y * size + x) * 4, m = clamp01(h);
    const r = (A.r + (B.r - A.r) * m) * (1 - dark), g = (A.g + (B.g - A.g) * m) * (1 - dark), b = (A.b + (B.b - A.b) * m) * (1 - dark);
    ic.data[k] = Math.pow(r, 1 / 2.2) * 255; ic.data[k + 1] = Math.pow(g, 1 / 2.2) * 255; ic.data[k + 2] = Math.pow(b, 1 / 2.2) * 255; ic.data[k + 3] = 255;   // da lineare a sRGB
    const bh = clamp01(h - dark * 0.6) * 255; ib.data[k] = ib.data[k + 1] = ib.data[k + 2] = bh; ib.data[k + 3] = 255;
  }
  xc.putImageData(ic, 0, 0); xb.putImageData(ib, 0, 0);
  const map = new THREE.CanvasTexture(cc), bump = new THREE.CanvasTexture(cb);
  for (const t of [map, bump]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; }
  map.colorSpace = THREE.SRGBColorSpace;
  const r = { map, bump }; TEX.set(key, r); return r;
}
const MATS = new Map();
function sm(kind, c0, c1, o = {}) {
  const key = kind + c0 + c1 + JSON.stringify(o); if (MATS.has(key)) return MATS.get(key);
  const t = skinTex(kind, c0, c1, o.seed || 1), rep = o.rep || 1;
  if (rep !== 1) { /* le texture sono condivise: la ripetizione si fa dalle UV, non qui */ }
  const m = new THREE.MeshStandardMaterial({ map: t.map, bumpMap: t.bump, bumpScale: o.bump != null ? o.bump : 2.2, roughness: o.rough != null ? o.rough : 0.8, metalness: o.metal || 0,
    side: o.double ? THREE.DoubleSide : THREE.FrontSide, flatShading: !!o.flat, vertexColors: true });
  if (o.color != null) m.color.set(o.color);
  MATS.set(key, m); return m;
}
const basic = (hex, k = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), fog: false });
const plain = (hex, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: hex, roughness: 0.6, vertexColors: true }, o));

/* ---------------- geometria ---------------- */
function ones(geo) { if (!geo.attributes.color) { const n = geo.attributes.position.count; geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3)); } return geo; }
function M(geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) { const m = new THREE.Mesh(ones(geo), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; return m; }
function N(name, x = 0, y = 0, z = 0, ...kids) { const o = new THREE.Group(); o.name = name; o.position.set(x, y, z); for (const k of kids) if (k) o.add(k); return o; }
/* ellissoide con rilievi: carne, muscoli, crani */
function blobGeo(rx, ry, rz, { seg = 20, amp = 0.06, f = 2.2, s = 1 } = {}) {
  const geo = new THREE.SphereGeometry(1, seg, Math.max(8, (seg * 0.7) | 0)), p = geo.attributes.position, nr = geo.attributes.normal, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const d = 1 + amp * (Math.sin(x * f * 3 + s) * Math.cos(y * f * 2.6 + s * 2) + Math.sin(z * f * 3.3 + x * f + s * 3) * 0.7);
    p.setXYZ(i, x * rx * d, y * ry * d, z * rz * d);
    const nx = x / rx, ny = y / ry, nz = z / rz, l = Math.hypot(nx, ny, nz) || 1; nr.setXYZ(i, nx / l, ny / l, nz / l);
    const ao = (0.52 + 0.48 * clamp01(ny / l * 0.5 + 0.5)) * (0.9 + 0.1 * d); col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = ao;     // ombra finta: sotto è più scuro
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}
/* arto rastremato che pende da y=0 verso il basso, con il rigonfiamento del muscolo */
function limbGeo(len, r0, r1, bulge = 0.16, seg = 12, up = false) {
  const geo = new THREE.CylinderGeometry(r0, r1, len, seg, 6, false); geo.translate(0, -len / 2, 0);
  const p = geo.attributes.position, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const t = -p.getY(i) / len, k = 1 + bulge * Math.sin(Math.PI * clamp01(t)); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k);
    const ao = 0.62 + 0.38 * Math.pow(Math.sin(Math.PI * clamp01(t)), 0.5); col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = ao;           // più scuro alle giunture
  }
  geo.computeVertexNormals(); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  if (up) geo.rotateX(Math.PI);
  return geo;
}
/* tubo che segue una curva e si assottiglia (corna, code, serpenti) */
function taperTube(curve, r0, r1, n = 24, rad = 8) {
  const fr = curve.computeFrenetFrames(n, false), pos = [], nor = [], uv = [], idx = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, P = curve.getPointAt(t), r = r0 + (r1 - r0) * t, Nn = fr.normals[i], B = fr.binormals[i];
    for (let j = 0; j <= rad; j++) {
      const a = j / rad * TAU, s = Math.sin(a), c = -Math.cos(a);
      const nx = c * Nn.x + s * B.x, ny = c * Nn.y + s * B.y, nz = c * Nn.z + s * B.z;
      pos.push(P.x + nx * r, P.y + ny * r, P.z + nz * r); nor.push(nx, ny, nz); uv.push(j / rad, t * 3);
    }
  }
  for (let i = 1; i <= n; i++) for (let j = 1; j <= rad; j++) {
    const a = (rad + 1) * (i - 1) + (j - 1), b = (rad + 1) * i + (j - 1), c = (rad + 1) * i + j, d = (rad + 1) * (i - 1) + j; idx.push(a, b, d, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  return g;
}
const curveOf = pts => new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
/* ciuffi (barba, criniera, setole): coni rovesciati con una curva, fusi in un'unica geometria */
function strandsGeo(list) {
  const gs = [], m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
  for (const s of list) {
    const g = new THREE.ConeGeometry(s.r, s.len, 5, 4); g.rotateX(Math.PI); g.translate(0, -s.len / 2, 0);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const t = -p.getY(i) / s.len; p.setX(i, p.getX(i) + (s.bend || 0) * t * t); p.setZ(i, p.getZ(i) + (s.bz || 0) * t * t); }
    g.computeVertexNormals(); { const n = g.attributes.position.count, c = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const t = clamp01(-g.attributes.position.getY(i) / s.len); c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = 0.45 + 0.55 * t; } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); }
    e.set(s.rot[0], s.rot[1], s.rot[2]); q.setFromEuler(e); m.compose(new THREE.Vector3(...s.pos), q, one); g.applyMatrix4(m); gs.push(g);
  }
  return mergeGeometries(gs);
}
/* rng ripetibile */
const rng = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

const GLOW_TEX = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
})();
/* occhio: sferetta accesa + alone additivo (il bagliore lo riprende il bloom del gioco) */
function eye(parent, x, y, z, r, hex, k = 3.5, halo = 6) {
  const m = M(new THREE.SphereGeometry(r, 10, 8), basic(hex, k), x, y, z); m.castShadow = false; m.name = 'eyeball';
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW_TEX, color: new THREE.Color(hex), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  sp.scale.setScalar(r * halo); sp.position.set(x, y, z + r * 0.4); sp.userData.eye = true; sp.name = 'eyeglow';
  parent.add(m, sp); return m;
}
function fxn(parent, name, x, y, z, kind, extra) { const o = new THREE.Object3D(); o.name = 'fx_' + name; o.position.set(x, y, z); o.userData.kind = kind; Object.assign(o.userData, extra || {}); parent.add(o); return o; }

/* ---------------- animazioni ---------------- */
function clip(name, dur, specs, n = 18) {
  const times = [], tr = [];
  for (let i = 0; i <= n; i++) times.push(i / n * dur);
  for (const [node, prop, fn] of specs) {
    const vals = times.map((_, i) => fn(i / n));
    tr.push(new THREE.NumberKeyframeTrack(`${node}.${prop}`, times, vals));
  }
  return new THREE.AnimationClip(name, dur, tr);
}

/* ---------------- sagome comuni ---------------- */
function claws(parent, n, spread, len, r, mat, x = 0, y = 0, z = 0, down = true) {
  for (let i = 0; i < n; i++) {
    const a = (i - (n - 1) / 2) * spread, g = new THREE.ConeGeometry(r, len, 6); g.translate(0, down ? -len / 2 : len / 2, 0);
    const c = M(g, mat, x + Math.sin(a) * 0.12 * len * 1.4, y, z + Math.cos(a) * 0.02); c.rotation.z = -a * 0.6; c.rotation.x = 0.25; parent.add(c);
  }
}
function tooth(len, r, mat, up = false) { const g = new THREE.ConeGeometry(r, len, 6); g.translate(0, up ? -len / 2 : len / 2, 0); const m = new THREE.Mesh(g, mat); m.castShadow = false; return m; }   // punta in su (up=false) o in giù

/* ============================================================
   SCHELETRO UMANOIDE: usato da Minosse, Caronte, Malebranca, Minotauro, Furia
   ============================================================ */
function humanoid(o) {
  const { skin, thigh, shin, torso, hipW, chest, shW, upper, fore, hunch = 0.2, digi = false, thighR = 0.3, armR = 0.22, footH = 0.12, handS = 1, claw = 0.2, clawMat, bodyMat = skin, legSkin = skin, bulge = 0.18 } = o;
  const t = digi ? 0.45 : 0.12, s = digi ? 0.95 : 0.2;
  const hipsY = thigh * Math.cos(t) + shin * Math.cos(s - t) + footH;
  const root = N('root'), hips = N('hips', 0, hipsY, 0), spine = N('spine', 0, 0.12, 0), chestN = N('chest', 0, torso * 0.55, 0.03);
  root.add(hips); hips.add(spine); spine.rotation.x = hunch;
  hips.add(M(blobGeo(hipW * 1.05, 0.34 * (torso / 1.6 + 0.4), hipW * 0.78, { amp: 0.05, s: 2 }), bodyMat, 0, 0.02, 0));
  spine.add(M(blobGeo(chest[0], chest[1] * (torso / 1.6 + 0.2), chest[2], { seg: 24, amp: 0.05, s: 3 }), bodyMat, 0, torso * 0.52, 0.03));
  spine.add(M(blobGeo(chest[0] * 0.62, torso * 0.34, chest[2] * 0.66, { amp: 0.05, s: 5 }), bodyMat, 0, torso * 0.12, 0.02));          // vita stretta
  if (!o.slim) for (const sd of [-1, 1]) {
    spine.add(M(blobGeo(chest[0] * 0.5, chest[1] * 0.3, chest[2] * 0.5, { amp: 0.05, s: 15 }), bodyMat, sd * chest[0] * 0.5, torso * 0.66, chest[2] * 0.55));   // pettorali
    spine.add(M(blobGeo(chest[0] * 0.55, chest[1] * 0.3, chest[2] * 0.6, { amp: 0.05, s: 16 }), bodyMat, sd * chest[0] * 0.42, torso * 0.97, -0.02, 0, 0, sd * 0.5));   // trapezi
    spine.add(M(blobGeo(chest[0] * 0.3, torso * 0.2, chest[2] * 0.4, { amp: 0.05, s: 17 }), bodyMat, sd * chest[0] * 0.34, torso * 0.32, chest[2] * 0.5));          // addominali
  }
  const neck = N('neck', 0, torso * 0.97, 0.08), head = N('head', 0, o.neckL || 0.3, 0.06);
  spine.add(neck); neck.add(head); neck.add(M(new THREE.CylinderGeometry(o.neckR || 0.22, (o.neckR || 0.22) * 1.25, (o.neckL || 0.3) + 0.15, 10), bodyMat, 0, (o.neckL || 0.3) / 2 - 0.02, 0.03));
  neck.rotation.x = 0.1; head.rotation.x = -0.06;
  for (const sd of [-1, 1]) {
    const L = sd < 0 ? 'L' : 'R';
    const sh = N('sh' + L, sd * shW, torso * 0.9, 0.0), el = N('el' + L, 0, -upper, 0), wr = N('wr' + L, 0, -fore, 0);
    sh.add(M(blobGeo(armR * 1.4, armR * 1.3, armR * 1.35, { amp: 0.07, s: 7 }), bodyMat, 0, 0.02, 0));                                 // spalla
    sh.add(M(limbGeo(upper, armR * 1.05, armR * 0.8, bulge * 0.5), bodyMat)); el.add(M(blobGeo(armR * 1.0, armR * 1.0, armR * 1.0, { amp: 0.03 }), bodyMat)); el.add(M(limbGeo(fore, armR * 0.85, armR * 0.6, bulge * 0.4), bodyMat));
    sh.rotation.z = sd * 0.1; sh.rotation.x = -0.06; el.rotation.x = -0.35;
    const hand = M(blobGeo(armR * 0.9 * handS, armR * 1.15 * handS, armR * 0.55 * handS, { amp: 0.05 }), skin, 0, -armR * 0.7, 0.0); wr.add(hand);
    claws(wr, 4, 0.34, claw, armR * 0.12 * handS + 0.01, clawMat || skin, 0, -armR * 1.5 * handS, armR * 0.25);
    if (!o.slim) sh.add(M(blobGeo(armR * 1.15, upper * 0.3, armR * 1.15, { amp: 0.05, s: 18 }), bodyMat, 0, -upper * 0.38, armR * 0.1));          // bicipite
    if (!o.slim) el.add(M(blobGeo(armR * 1.0, fore * 0.28, armR * 0.95, { amp: 0.05, s: 19 }), bodyMat, 0, -fore * 0.3, 0));                      // avambraccio
    sh.add(el); el.add(wr); spine.add(sh);
    const hp = N('hip' + L, sd * hipW * 0.58, -0.06, 0), kn = N('knee' + L, 0, -thigh, 0), an = N('ank' + L, 0, -shin, 0);
    hp.add(M(blobGeo(thighR * 1.15, thighR * 1.1, thighR * 1.15, { amp: 0.05, s: 9 }), legSkin, 0, -0.02, 0)); hp.add(M(limbGeo(thigh, thighR * 1.1, thighR * 0.72, 0.22), legSkin));
    kn.add(M(blobGeo(thighR * 0.8, thighR * 0.8, thighR * 0.8, { amp: 0.03 }), legSkin)); kn.add(M(limbGeo(shin, thighR * 0.72, thighR * 0.5, 0.12), legSkin));
    if (!o.slim) hp.add(M(blobGeo(thighR * 1.05, thigh * 0.3, thighR * 1.1, { amp: 0.05, s: 20 }), legSkin, 0, -thigh * 0.4, thighR * 0.15));
    if (!o.slim) kn.add(M(blobGeo(thighR * 0.7, shin * 0.25, thighR * 0.8, { amp: 0.05, s: 21 }), legSkin, 0, -shin * 0.25, -thighR * 0.3));   // polpaccio
    hp.rotation.x = -t; kn.rotation.x = s; an.rotation.x = t - s;
    if (digi) {                                                                                                                       // zoccolo
      an.add(M(blobGeo(thighR * 0.62, 0.15, thighR * 1.0, { amp: 0.04 }), clawMat || skin, 0, -0.07, thighR * 0.34));
    } else an.add(M(blobGeo(thighR * 0.62, 0.1, thighR * 1.25, { amp: 0.04 }), legSkin, 0, -0.05, thighR * 0.5));
    hp.add(kn); kn.add(an); hips.add(hp);
  }
  spine.add(chestN);
  return { root, hips, spine, head, neck, hipsY, rest: { t, s } };
}

/* animazioni comuni degli umanoidi */
function humanoidClips(root, o = {}) {
  const nd = n => root.getObjectByName(n), rot = (n, a) => nd(n).rotation[a], py = nd('hips').position.y;
  const raise = o.raise != null ? o.raise : -2.35, slam = o.slam != null ? o.slam : -0.45, amp = o.amp || 1;
  const has = n => !!nd(n);
  const arms = (fn, key) => ['shL', 'shR'].filter(has).map(n => [n, key, fn(n)]);
  const idle = [
    ['hips', 'position[y]', SN(py, 0.035 * amp, 1)], ['spine', 'rotation[x]', SN(rot('spine', 'x'), 0.03, 1, 0.1)], ['head', 'rotation[y]', SN(0, 0.12, 0.5)], ['head', 'rotation[x]', SN(rot('head', 'x'), 0.05, 1, 0.3)],
    ['shL', 'rotation[x]', SN(rot('shL', 'x'), 0.05, 1, 0.2)], ['shR', 'rotation[x]', SN(rot('shR', 'x'), 0.05, 1, 0.5)], ['elL', 'rotation[x]', SN(rot('elL', 'x'), 0.06, 1, 0.4)], ['elR', 'rotation[x]', SN(rot('elR', 'x'), 0.06, 1, 0.7)]
  ];
  const lk = n => has(n) ? [[n, 'rotation[x]', SN(rot(n, 'x'), 0.04, 2, 0.2)]] : [];
  const stride = o.stride || 0.75, run = [
    ['hips', 'position[y]', t => py + 0.09 * amp * Math.cos(TAU * 2 * t) - 0.05], ['hips', 'rotation[z]', SN(0, 0.05, 1)], ['hips', 'rotation[y]', SN(0, 0.08, 1)],
    ['spine', 'rotation[x]', SN(rot('spine', 'x') + 0.14, 0.04, 2)], ['spine', 'rotation[y]', SN(0, -0.1, 1)], ['head', 'rotation[x]', SN(rot('head', 'x') - 0.1, 0.05, 2)],
    ['hipL', 'rotation[x]', SN(rot('hipL', 'x'), stride, 1, 0)], ['hipR', 'rotation[x]', SN(rot('hipR', 'x'), stride, 1, 0.5)],
    ['kneeL', 'rotation[x]', t => rot('kneeL', 'x') + 0.7 * Math.max(0, Math.sin(TAU * (t + 0.12)))], ['kneeR', 'rotation[x]', t => rot('kneeR', 'x') + 0.7 * Math.max(0, Math.sin(TAU * (t + 0.62)))],
    ['shL', 'rotation[x]', SN(rot('shL', 'x'), 0.65, 1, 0.5)], ['shR', 'rotation[x]', SN(rot('shR', 'x'), 0.65, 1, 0)], ['elL', 'rotation[x]', SN(rot('elL', 'x') - 0.4, 0.2, 1, 0.5)], ['elR', 'rotation[x]', SN(rot('elR', 'x') - 0.4, 0.2, 1, 0)]
  ];
  const atkSh = k => t => { const r0 = rot(k, 'x'); return r0 + (raise - r0) * ss(0.05, 0.55, t) * (1 - ss(0.62, 0.78, t)) + (slam - r0) * ss(0.62, 0.78, t) * (1 - ss(0.88, 1, t)); };
  const atk = [
    ['spine', 'rotation[x]', t => rot('spine', 'x') - 0.45 * ss(0.05, 0.55, t) * (1 - ss(0.62, 0.78, t)) + 0.55 * ss(0.62, 0.78, t) * (1 - ss(0.88, 1, t))],
    ['hips', 'position[y]', t => py - 0.2 * ss(0.62, 0.78, t) * (1 - ss(0.88, 1, t))], ['head', 'rotation[x]', t => rot('head', 'x') + 0.3 * ss(0.62, 0.78, t) * (1 - ss(0.88, 1, t))],
    ['hipL', 'rotation[x]', t => rot('hipL', 'x') - 0.25 * ss(0.62, 0.78, t) * (1 - ss(0.9, 1, t))], ['kneeL', 'rotation[x]', t => rot('kneeL', 'x') + 0.2 * ss(0.62, 0.78, t) * (1 - ss(0.9, 1, t))],
    ...arms(atkSh, 'rotation[x]'),
    ['elL', 'rotation[x]', t => rot('elL', 'x') - 0.2 - 0.4 * ss(0.05, 0.5, t) * (1 - ss(0.62, 0.78, t))], ['elR', 'rotation[x]', t => rot('elR', 'x') - 0.2 - 0.4 * ss(0.05, 0.5, t) * (1 - ss(0.62, 0.78, t))]
  ];
  const hit = [['spine', 'rotation[x]', t => rot('spine', 'x') - 0.32 * Math.sin(Math.PI * Math.min(1, t * 1.15)) ], ['head', 'rotation[x]', t => rot('head', 'x') - 0.4 * Math.sin(Math.PI * Math.min(1, t * 1.15))],
    ['hips', 'position[y]', t => py - 0.07 * Math.sin(Math.PI * t)], ['shL', 'rotation[x]', t => rot('shL', 'x') + 0.5 * Math.sin(Math.PI * t)], ['shR', 'rotation[x]', t => rot('shR', 'x') + 0.5 * Math.sin(Math.PI * t)]];
  const fall = o.fall || -1.5, death = [
    ['root', 'rotation[x]', t => fall * ss(0.28, 0.85, t)], ['hips', 'position[y]', t => py - (py * 0.45) * ss(0, 0.32, t) - 0.1 * ss(0.5, 1, t)],
    ['kneeL', 'rotation[x]', t => rot('kneeL', 'x') + 0.9 * ss(0, 0.32, t)], ['kneeR', 'rotation[x]', t => rot('kneeR', 'x') + 1.0 * ss(0, 0.32, t)],
    ['hipL', 'rotation[x]', t => rot('hipL', 'x') - 0.4 * ss(0, 0.32, t)], ['hipR', 'rotation[x]', t => rot('hipR', 'x') - 0.5 * ss(0, 0.32, t)],
    ['shL', 'rotation[x]', t => rot('shL', 'x') + 0.7 * ss(0.2, 0.9, t)], ['shR', 'rotation[x]', t => rot('shR', 'x') + 0.9 * ss(0.2, 0.9, t)], ['shL', 'rotation[z]', t => rot('shL', 'z') - 0.6 * ss(0.3, 1, t)], ['shR', 'rotation[z]', t => rot('shR', 'z') + 0.6 * ss(0.3, 1, t)],
    ['head', 'rotation[x]', t => rot('head', 'x') - 0.45 * ss(0.3, 0.9, t)], ['spine', 'rotation[x]', t => rot('spine', 'x') + 0.4 * ss(0, 0.3, t)]
  ];
  return [clip('Idle', 2.6, idle), clip('Running', o.runDur || 0.72, run), clip('Punch', o.atkDur || 0.85, atk, 26), clip('HitReact', 0.38, hit, 10), clip('Death', 1.7, death, 28)];
}
const ONCE = new Set(['HitReact', 'Death']);

/* ============================================================
   MINOSSE — "stavvi Minòs orribilmente, e ringhia: essamina le colpe ne l'intrata;
   giudica e manda secondo ch'avvinghia" (Inf. V). Giudice con testa di belva, corna,
   criniera, mantello a brandelli e la coda avvolta intorno al corpo.
   ============================================================ */
function buildMinosse() {
  const skin = sm('leather', 0x180a08, 0x5e3a30, { seed: 3, bump: 3 }), horn = sm('bone', 0x1c120d, 0x9a8466, { seed: 4, rough: 0.5, bump: 3 }),
    mane = sm('fur', 0x0c0810, 0x44324e, { seed: 6, bump: 1.5 }), robe = sm('cloth', 0x120a1a, 0x4a2c5e, { seed: 8, double: true, rough: 0.95 }), claw = sm('bone', 0x120c0a, 0x5a4a3a, { seed: 5, rough: 0.4 });
  const H = 5.8, h = humanoid({ skin, thigh: 1.45, shin: 1.5, torso: 1.9, hipW: 0.95, chest: [1.05, 1.0, 0.8], shW: 1.32, upper: 1.5, fore: 1.55, hunch: 0.34, digi: true, thighR: 0.46, armR: 0.27, handS: 1.5, claw: 0.5, clawMat: claw, footH: 0.2, neckL: 0.5, neckR: 0.3 });
  const { root, spine, head } = h; head.scale.setScalar(1.3);
  /* testa di belva */
  head.add(M(blobGeo(0.52, 0.56, 0.66, { seg: 24, amp: 0.05, s: 11 }), skin, 0, 0.12, 0.2));
  head.add(M(blobGeo(0.36, 0.3, 0.55, { amp: 0.04, s: 12 }), skin, 0, -0.1, 0.78));                                                    // muso
  head.add(M(blobGeo(0.52, 0.13, 0.3, { amp: 0.05, s: 13 }), skin, 0, 0.36, 0.56));                                                    // arcata
  for (const s of [-1, 1]) { head.add(M(new THREE.SphereGeometry(0.06, 8, 6), plain(0x050202), s * 0.1, -0.02, 1.27)); head.add(M(blobGeo(0.1, 0.16, 0.09, {}), skin, s * 0.5, 0.28, 0.02, 0, 0, s * 0.8)); }
  const jaw = N('jaw', 0, -0.26, 0.4); jaw.rotation.x = 0.32; jaw.add(M(blobGeo(0.31, 0.15, 0.5, { amp: 0.04, s: 14 }), skin, 0, -0.06, 0.4));
  const inner = plain(0x3a0508, { emissive: 0x200000 });
  jaw.add(M(blobGeo(0.24, 0.05, 0.4, {}), inner, 0, 0.0, 0.4));
  for (const s of [-1, 1]) { const a = tooth(0.34, 0.06, horn, true); a.position.set(s * 0.2, 0.02, 0.8); jaw.add(a); for (let i = 0; i < 4; i++) { const t = tooth(0.1, 0.03, horn, true); t.position.set(s * (0.07 + i * 0.045), 0.0, 0.88 - i * 0.14 + 0.1); jaw.add(t); } }
  head.add(jaw);
  for (const s of [-1, 1]) { const a = tooth(0.3, 0.06, horn, false); a.position.set(s * 0.2, -0.28, 1.0); a.rotation.x = -0.1; head.add(a); for (let i = 0; i < 4; i++) { const t = tooth(0.1, 0.03, horn, false); t.position.set(s * (0.07 + i * 0.05), -0.25, 1.05 - i * 0.14); head.add(t); } }
  eye(head, -0.25, 0.22, 0.62, 0.075, 0xc060ff); eye(head, 0.25, 0.22, 0.62, 0.075, 0xc060ff);
  for (const s of [-1, 1]) head.add(M(taperTube(curveOf([[s * 0.34, 0.4, 0.05], [s * 0.62, 0.62, -0.12], [s * 0.78, 1.1, -0.05], [s * 0.62, 1.62, 0.28]]), 0.13, 0.015, 20, 8), horn));      // corna
  fxn(head, 'hornL', -0.62, 1.62, 0.28, 'flame'); fxn(head, 'hornR', 0.62, 1.62, 0.28, 'flame');
  fxn(head, 'noseL', -0.1, -0.06, 1.3, 'breath'); fxn(head, 'noseR', 0.1, -0.06, 1.3, 'breath'); fxn(head, 'mouth', 0, -0.2, 1.0, 'breath');
  /* criniera e barba */
  const R = rng(7), st = [];
  for (let i = 0; i < 70; i++) { const a = R() * Math.PI - Math.PI / 2 + (R() < 0.5 ? 0 : 0), side = R() * 2 - 1; st.push({ pos: [side * 0.4, 0.15 + R() * 0.3, -0.35 + R() * 0.3], rot: [0.1 + R() * 0.25, 0, side * 0.35], len: 0.9 + R() * 0.9, r: 0.05, bend: -0.3 * side + R() * 0.15, bz: -0.5 - R() * 0.4 }); }
  for (let i = 0; i < 40; i++) { const side = R() * 2 - 1; st.push({ pos: [side * 0.28, -0.3, 0.4 + R() * 0.3], rot: [R() * 0.2, 0, side * 0.2], len: 0.7 + R() * 0.8, r: 0.045, bend: side * 0.1, bz: -0.1 - R() * 0.25 }); }
  head.add(M(strandsGeo(st), mane));
  /* mantello a brandelli dalle spalle */
  const cg = new THREE.CylinderGeometry(1.35, 2.15, 3.1, 28, 8, true, Math.PI * 0.22, Math.PI * 1.56), cp = cg.attributes.position;
  for (let i = 0; i < cp.count; i++) { const y = cp.getY(i), t = (1.55 - y) / 3.1; if (t > 0.75) cp.setY(i, y - Math.abs(Math.sin(i * 12.9898) * 0.5) * (t - 0.7) * 2.2 * (i % 2 ? 1 : 0.2)); cp.setX(i, cp.getX(i) * (1 + Math.sin(i * 0.37 + y * 2) * 0.04)); }
  cg.computeVertexNormals();
  const cloak = N('cloak', 0, 1.7, -0.18, M(cg, robe, 0, -1.4, 0)); cloak.rotation.x = 0.1; spine.add(cloak);
  /* la coda: avvolta due volte intorno al torso, poi la punta uncinata */
  const pts = [[0, -0.05, -0.55], [0.5, 0.0, -0.95]];
  for (let k = 0; k <= 18; k++) { const a = -Math.PI * 0.6 + k / 18 * TAU * 2.1, y = 0.1 + k / 18 * 1.55, rr = 1.08 + 0.05 * Math.sin(k); pts.push([Math.sin(a) * rr * 1.08, y, Math.cos(a) * (rr * 0.88) - 0.0]); }
  pts.push([0.7, 2.0, 0.85], [0.9, 2.5, 0.6], [0.6, 2.85, 0.5], [0.35, 2.7, 0.62]);
  spine.add(M(taperTube(curveOf(pts), 0.17, 0.035, 110, 8), skin, 0, 0, 0));
  const barb = new THREE.ConeGeometry(0.1, 0.42, 6); barb.translate(0, 0.21, 0); spine.add(M(barb, claw, 0.35, 2.7, 0.62, -0.5, 0, 0.6));
  fxn(spine, 'tail', 0.3, 2.9, 0.7, 'flame');
  fxn(spine, 'chest', 0, 1.2, 0.6, 'ember');
  const anims = humanoidClips(root, { raise: -2.5, slam: -0.35, amp: 1.2 });
  return { scene: root, anims, height: H, name: 'Minosse' };
}

/* ============================================================
   CERBERO — "Cerbero, fiera crudele e diversa, con tre gole caninamente latra...
   Li occhi ha vermigli, la barba unta e atra, e 'l ventre largo, e unghiate le mani"
   ============================================================ */
function dogHead(fur, tongueMat, tooth_, S = 1) {
  const g = N('headRoot'), skull = M(blobGeo(0.55 * S, 0.5 * S, 0.66 * S, { seg: 22, amp: 0.05, s: 21 }), fur, 0, 0.05 * S, 0.1 * S);
  g.add(skull, M(blobGeo(0.36 * S, 0.3 * S, 0.62 * S, { amp: 0.04, s: 22 }), fur, 0, -0.07 * S, 0.78 * S), M(blobGeo(0.11 * S, 0.08 * S, 0.09 * S, { amp: 0.02 }), plain(0x050303, { roughness: 0.25 }), 0, 0.08 * S, 1.36 * S));
  g.add(M(blobGeo(0.5 * S, 0.14 * S, 0.3 * S, { amp: 0.05, s: 23 }), fur, 0, 0.3 * S, 0.5 * S));
  for (const s of [-1, 1]) {                                                                                                              // orecchie ripiegate
    const e = new THREE.ConeGeometry(0.2 * S, 0.62 * S, 5); e.translate(0, -0.3 * S, 0); g.add(M(e, fur, s * 0.42 * S, 0.34 * S, -0.1 * S, 0.4, 0, s * 0.9));
    g.add(M(blobGeo(0.07 * S, 0.1 * S, 0.1 * S), plain(0x090404), s * 0.14 * S, 0.1 * S, 1.43 * S));
  }
  const jaw = N('jaw', 0, -0.2 * S, 0.3 * S); jaw.rotation.x = 0.5;
  jaw.add(M(blobGeo(0.3 * S, 0.12 * S, 0.5 * S, { amp: 0.04, s: 24 }), fur, 0, -0.05 * S, 0.45 * S));
  jaw.add(M(blobGeo(0.24 * S, 0.04 * S, 0.45 * S), plain(0x3a0508, { emissive: 0x240000 }), 0, 0.03 * S, 0.45 * S));
  jaw.add(M(blobGeo(0.17 * S, 0.06 * S, 0.45 * S, { amp: 0.04 }), tongueMat, 0, 0.03 * S, 0.5 * S));
  for (const s of [-1, 1]) { const a = tooth(0.26 * S, 0.055 * S, tooth_, true); a.position.set(s * 0.2 * S, 0.04 * S, 0.88 * S); jaw.add(a); for (let i = 0; i < 4; i++) { const t = tooth(0.1 * S, 0.03 * S, tooth_, true); t.position.set(s * (0.06 + i * 0.05) * S, 0.03 * S, (0.95 - i * 0.14) * S); jaw.add(t); } }
  g.add(jaw);
  for (const s of [-1, 1]) { const a = tooth(0.28 * S, 0.06 * S, tooth_, false); a.position.set(s * 0.2 * S, -0.22 * S, 1.02 * S); g.add(a); for (let i = 0; i < 4; i++) { const t = tooth(0.1 * S, 0.03 * S, tooth_, false); t.position.set(s * (0.06 + i * 0.05) * S, -0.2 * S, (1.05 - i * 0.14) * S); g.add(t); } }
  eye(g, -0.26 * S, 0.2 * S, 0.7 * S, 0.075 * S, 0xff2a10, 3.8); eye(g, 0.26 * S, 0.2 * S, 0.7 * S, 0.075 * S, 0xff2a10, 3.8);
  return { g, jaw };
}
function buildCerbero() {
  const fur = sm('fur', 0x120c08, 0x5a4630, { seed: 31, bump: 2.5, rough: 0.7 }), mud = sm('leather', 0x1a1008, 0x4a3822, { seed: 33, bump: 2, rough: 0.55 }), claw = sm('bone', 0x16100a, 0x6a5a40, { seed: 34, rough: 0.4 }),
    tongue = plain(0x9a2c3a, { roughness: 0.4 }), ivory = plain(0xd8cfaa, { roughness: 0.35 }), tail = sm('scale', 0x0a2410, 0x3a7a34, { seed: 35, rough: 0.45, bump: 2 });
  const H = 6.6, root = N('root'), body = N('body', 0, 3.25, 0); root.add(body);
  body.add(M(blobGeo(1.15, 1.1, 2.4, { seg: 26, amp: 0.05, s: 41 }), fur, 0, 0.05, 0.0), M(blobGeo(1.35, 1.55, 1.4, { seg: 26, amp: 0.05, s: 42 }), fur, 0, 0.15, 1.35), M(blobGeo(1.3, 1.25, 1.35, { amp: 0.05, s: 43 }), fur, 0, 0.05, -1.55),
    M(blobGeo(0.95, 0.75, 1.6, { amp: 0.07, s: 44 }), mud, 0, -0.7, 0.2));                                                                    // il ventre largo
  /* pelo irto sulla schiena e fango sulle zampe */
  const R = rng(13), st = [];
  for (let i = 0; i < 90; i++) { const z = -2.2 + R() * 4.6, x = (R() - 0.5) * 1.6; st.push({ pos: [x, 1.25 + (1 - Math.abs(z) / 3) * 0.2, z], rot: [Math.PI + 0.9 + R() * 0.3 - (z > 0 ? 0.3 : 0), 0, (R() - 0.5) * 0.6], len: 0.5 + R() * 0.6, r: 0.07, bend: (R() - 0.5) * 0.2, bz: 0.1 }); }
  body.add(M(strandsGeo(st.map(s => ({ ...s, rot: [-0.7 - R() * 0.4, 0, s.rot[2]] }))), fur));
  const legs = [];
  for (const [side, zf, name] of [[-1, 1.5, 'fL'], [1, 1.5, 'fR'], [-1, -1.7, 'hL'], [1, -1.7, 'hR']]) {
    const front = zf > 0, up = front ? 1.5 : 1.7, lo = front ? 1.5 : 1.7;
    const sh = N('s' + name, side * 1.0, front ? -0.2 : -0.35, zf), el = N('e' + name, 0, -up, 0), pw = N('p' + name, 0, -lo, 0);
    sh.add(M(blobGeo(0.7, 0.7, 0.75, { amp: 0.05, s: 45 }), fur, 0, 0, 0), M(limbGeo(up, 0.62, 0.42, 0.18), fur)); el.add(M(blobGeo(0.42, 0.42, 0.45, {}), fur), M(limbGeo(lo, 0.42, 0.3, 0.1), mud));
    pw.add(M(blobGeo(0.4, 0.22, 0.6, { amp: 0.05 }), mud, 0, -0.1, 0.22)); claws(pw, 4, 0.34, 0.34, 0.07, claw, 0, -0.18, 0.7);
    sh.rotation.x = front ? -0.22 : -0.5; el.rotation.x = front ? 0.42 : 1.0; pw.rotation.x = front ? -0.2 : -0.5;
    sh.add(el); el.add(pw); body.add(sh); legs.push(name);
  }
  /* le tre teste, ognuna sul suo collo */
  const bases = [[-0.95, 0.5, 2.0, 0.55, 0.25], [0, 0.85, 2.3, 0.38, 0], [0.95, 0.5, 2.0, 0.55, -0.25]];
  bases.forEach(([x, y, z, tilt, side], i) => {
    const a = N('nk' + i + 'a', x, y, z), b = N('nk' + i + 'b', 0, 1.25, 0), hd = N('hd' + i, 0, 1.2, 0);
    a.rotation.set(tilt, 0, -side * 1.3); b.rotation.set(-0.3, 0, side * 0.9); hd.rotation.x = 0.55;
    a.add(M(blobGeo(0.62, 0.35, 0.62), fur, 0, 0, 0), M(limbGeo(1.3, 0.6, 0.46, 0.1, 12, true), fur, 0, 0, 0));
    b.add(M(limbGeo(1.25, 0.46, 0.4, 0.08, 12, true), fur));
    const st2 = []; for (let k = 0; k < 24; k++) st2.push({ pos: [(R() - 0.5) * 0.7, 0.2 + R() * 1.1, -0.2 - R() * 0.3], rot: [Math.PI - 0.6, 0, (R() - 0.5) * 0.8], len: 0.4 + R() * 0.4, r: 0.06, bend: (R() - 0.5) * 0.2, bz: -0.1 });
    a.add(M(strandsGeo(st2.map(s => ({ ...s, rot: [-1.0, 0, s.rot[2]] }))), fur, 0, 0, 0));
    const dh = dogHead(fur, tongue, ivory, 1.3); hd.add(dh.g); dh.jaw.name = 'jaw' + i; dh.g.name = 'h' + i;
    fxn(hd, 'mouth' + i, 0, -0.35, 1.2, 'breath'); fxn(hd, 'drool' + i, side * 0.1 + 0.12, -0.45, 1.05, 'drool'); fxn(hd, 'drool' + i + 'b', -0.14, -0.45, 1.1, 'drool'); fxn(hd, 'nose' + i, 0, 0.1, 1.4, 'breath');
    b.add(hd); a.add(b); body.add(a);
  });
  /* coda di serpe */
  const tl = N('tailRoot', 0, 0.3, -2.7); tl.rotation.x = -1.05; body.add(tl);
  let par = tl; const segs = 8;
  for (let i = 0; i < segs; i++) {
    const s = N('tl' + i, 0, i ? 0.62 : 0, 0), r0 = 0.3 - i * 0.025; s.add(M(limbGeo(0.7, r0, Math.max(0.09, r0 - 0.03), 0.05, 8, true), tail)); par.add(s); par = s;
  }
  par.add(M(blobGeo(0.2, 0.17, 0.3, {}), tail, 0, 0.78, 0), M(new THREE.SphereGeometry(0.03, 6, 6), basic(0xffd040, 3), 0.1, 0.9, 0.18), M(new THREE.SphereGeometry(0.03, 6, 6), basic(0xffd040, 3), -0.1, 0.9, 0.18));
  par.rotation.x = 0.6; fxn(par, 'tail', 0, 0.9, 0.1, 'ember');
  fxn(body, 'back', 0, 1.3, 0, 'mud');
  const clips = cerberoClips(root, segs);
  return { scene: root, anims: clips, height: H, name: 'Cerbero' };
}
function cerberoClips(root, segs) {
  const nd = n => root.getObjectByName(n), rot = (n, a) => nd(n).rotation[a], by = nd('body').position.y;
  const legs = (fn) => ['fL', 'fR', 'hL', 'hR'].flatMap(n => fn(n));
  const heads = fn => [0, 1, 2].flatMap(i => fn(i));
  const tailW = (a, f) => Array.from({ length: segs }, (_, i) => [`tl${i}`, 'rotation[z]', SN(0, a * (1 + i * 0.12), f, -i * 0.11)]);
  const idle = [
    ['body', 'position[y]', SN(by, 0.04, 1)], ['body', 'scale[y]', SN(1, 0.012, 1)], ...legs(n => []),
    ...heads(i => [[`nk${i}a`, 'rotation[x]', SN(rot(`nk${i}a`, 'x'), 0.07, 0.5, i * 0.33)], [`nk${i}a`, 'rotation[z]', SN(rot(`nk${i}a`, 'z'), 0.1, 0.5, i * 0.31 + 0.1)], [`nk${i}b`, 'rotation[x]', SN(rot(`nk${i}b`, 'x'), 0.1, 1, i * 0.4)],
      [`hd${i}`, 'rotation[y]', SN(0, 0.22, 0.5, i * 0.5)], [`hd${i}`, 'rotation[x]', SN(rot(`hd${i}`, 'x'), 0.07, 1, i * 0.2)], [`jaw${i}`, 'rotation[x]', SN(0.45, 0.15, 1.5, i * 0.3)]]), ...tailW(0.35, 1)
  ];
  const gal = (n, ph) => t => rot(n, 'x') + 0.62 * Math.sin(TAU * (t + ph));
  const run = [
    ['body', 'position[y]', t => by + 0.14 * Math.abs(Math.sin(TAU * t)) - 0.08], ['body', 'rotation[x]', SN(0.04, 0.05, 2, 0.1)], ['body', 'rotation[z]', SN(0, 0.03, 1)],
    ['sfL', 'rotation[x]', gal('sfL', 0)], ['sfR', 'rotation[x]', gal('sfR', 0.12)], ['shL', 'rotation[x]', gal('shL', 0.5)], ['shR', 'rotation[x]', gal('shR', 0.62)],
    ['efL', 'rotation[x]', t => rot('efL', 'x') + 0.5 * Math.max(0, Math.sin(TAU * (t - 0.25)))], ['efR', 'rotation[x]', t => rot('efR', 'x') + 0.5 * Math.max(0, Math.sin(TAU * (t - 0.13)))],
    ['ehL', 'rotation[x]', t => rot('ehL', 'x') + 0.5 * Math.max(0, Math.sin(TAU * (t + 0.25)))], ['ehR', 'rotation[x]', t => rot('ehR', 'x') + 0.5 * Math.max(0, Math.sin(TAU * (t + 0.37)))],
    ...heads(i => [[`nk${i}a`, 'rotation[x]', SN(rot(`nk${i}a`, 'x'), 0.12, 2, i * 0.2)], [`hd${i}`, 'rotation[x]', SN(rot(`hd${i}`, 'x'), 0.1, 2, 0.3)], [`jaw${i}`, 'rotation[x]', SN(0.6, 0.25, 2, i * 0.3)], [`nk${i}a`, 'rotation[z]', SN(rot(`nk${i}a`, 'z'), 0.07, 1, i * 0.33)]]), ...tailW(0.5, 2)
  ];
  const atk = [   // sulle zampe posteriori, poi lo scatto delle tre teste
    ['body', 'rotation[x]', t => -0.34 * ss(0.05, 0.5, t) * (1 - ss(0.58, 0.72, t)) + 0.12 * ss(0.62, 0.78, t) * (1 - ss(0.9, 1, t))], ['body', 'position[y]', t => by + 0.5 * ss(0.05, 0.5, t) * (1 - ss(0.58, 0.72, t))],
    ['sfL', 'rotation[x]', t => rot('sfL', 'x') - 1.0 * ss(0.05, 0.5, t) * (1 - ss(0.58, 0.72, t))], ['sfR', 'rotation[x]', t => rot('sfR', 'x') - 1.2 * ss(0.05, 0.5, t) * (1 - ss(0.58, 0.72, t))],
    ...heads(i => [[`nk${i}a`, 'rotation[x]', t => rot(`nk${i}a`, 'x') - 0.35 * ss(0.05, 0.5, t) * (1 - ss(0.58, 0.7, t)) + 0.6 * ss(0.6, 0.76, t) * (1 - ss(0.88, 1, t))],
      [`nk${i}b`, 'rotation[x]', t => rot(`nk${i}b`, 'x') + 0.5 * ss(0.6, 0.76, t) * (1 - ss(0.88, 1, t))], [`jaw${i}`, 'rotation[x]', t => 0.4 + 0.75 * ss(0.5, 0.74, t) * (1 - ss(0.9, 1, t))],
      [`hd${i}`, 'rotation[x]', t => rot(`hd${i}`, 'x') + 0.35 * ss(0.6, 0.76, t) * (1 - ss(0.9, 1, t))]]), ...tailW(0.7, 3)
  ];
  const hit = [['body', 'rotation[x]', t => -0.14 * Math.sin(Math.PI * t)], ...heads(i => [[`nk${i}a`, 'rotation[x]', t => rot(`nk${i}a`, 'x') - 0.4 * Math.sin(Math.PI * t)], [`jaw${i}`, 'rotation[x]', t => 0.5 + 0.5 * Math.sin(Math.PI * t)]])];
  const death = [
    ['body', 'position[y]', t => by - 1.8 * ss(0, 0.5, t)], ['root', 'rotation[z]', t => 1.38 * ss(0.3, 0.9, t)], ['body', 'rotation[x]', t => 0.1 * ss(0.3, 1, t)],
    ...legs(n => [[`s${n}`, 'rotation[z]', t => (n.endsWith('L') ? -0.9 : 0.9) * ss(0.1, 0.8, t)]]),
    ...heads(i => [[`nk${i}a`, 'rotation[x]', t => rot(`nk${i}a`, 'x') + 0.9 * ss(0.15, 0.8, t)], [`nk${i}b`, 'rotation[x]', t => rot(`nk${i}b`, 'x') + 0.6 * ss(0.2, 0.9, t)], [`jaw${i}`, 'rotation[x]', t => 0.5 + 0.5 * ss(0.3, 0.8, t)], [`hd${i}`, 'rotation[x]', t => rot(`hd${i}`, 'x') + 0.4 * ss(0.3, 1, t)]])
  ];
  return [clip('Idle', 3.0, idle, 24), clip('Running', 0.62, run, 24), clip('Punch', 0.9, atk, 28), clip('HitReact', 0.4, hit, 10), clip('Death', 1.9, death, 28)];
}

/* ============================================================
   CARONTE — "un vecchio, bianco per antico pelo... lanose gote, che 'ntorno a li occhi
   avea di fiamme rote... batte col remo qualunque s'adagia" (Inf. III)
   ============================================================ */
function buildCaronte() {
  const skin = sm('leather', 0x3a352c, 0xb0a890, { seed: 51, bump: 2.5, rough: 0.85 }), hair = sm('fur', 0x8a8678, 0xf2f0ea, { seed: 52, bump: 1.2, rough: 0.9 }), robe = sm('cloth', 0x0e0b09, 0x40342a, { seed: 53, double: true, rough: 0.95 }),
    wood = sm('wood', 0x24160a, 0x7a5a34, { seed: 54, rough: 0.7, bump: 2.5 }), bone = sm('bone', 0x4a4030, 0xc8bea0, { seed: 55, rough: 0.5 });
  const H = 3.6, h = humanoid({ skin: skin, thigh: 0.9, shin: 0.95, torso: 1.25, hipW: 0.52, chest: [0.62, 0.62, 0.4], shW: 0.74, upper: 0.95, fore: 1.0, hunch: 0.5, thighR: 0.18, armR: 0.14, handS: 1.3, claw: 0.18, clawMat: bone, neckL: 0.28, neckR: 0.13, footH: 0.1 });
  const { root, hips, spine, head } = h;
  /* tonaca e mantello cenciosi */
  const rg = new THREE.CylinderGeometry(0.55, 1.1, 2.2, 22, 8, true), rp = rg.attributes.position;
  for (let i = 0; i < rp.count; i++) { const y = rp.getY(i), t = (1.1 - y) / 2.2; if (t > 0.8) rp.setY(i, y - Math.abs(Math.sin(i * 7.3)) * 0.34 * (i % 2 ? 1 : 0.3)); }
  rg.computeVertexNormals(); hips.add(M(rg, robe, 0, -0.95, 0.04));
  const cg = new THREE.CylinderGeometry(0.85, 1.25, 2.2, 22, 6, true, Math.PI * 0.2, Math.PI * 1.6), cp = cg.attributes.position;
  for (let i = 0; i < cp.count; i++) { const y = cp.getY(i), t = (1.1 - y) / 2.2; if (t > 0.78) cp.setY(i, y - Math.abs(Math.sin(i * 5.1)) * 0.5 * (i % 2 ? 1 : 0.2)); }
  cg.computeVertexNormals(); spine.add(M(cg, robe, 0, 0.1, -0.15));
  /* testa: vecchio scarno, naso adunco, barba lanosa */
  head.add(M(blobGeo(0.27, 0.32, 0.31, { seg: 22, amp: 0.04, s: 61 }), skin, 0, 0.1, 0.06));
  head.add(M(blobGeo(0.09, 0.11, 0.18, { amp: 0.03 }), skin, 0, 0.0, 0.34, 0.4, 0, 0));                                                // naso aquilino
  head.add(M(blobGeo(0.27, 0.07, 0.14, { amp: 0.05, s: 62 }), skin, 0, 0.2, 0.24));
  const jaw = N('jaw', 0, -0.08, 0.1); jaw.rotation.x = 0.1; jaw.add(M(blobGeo(0.17, 0.1, 0.2, { amp: 0.04 }), skin, 0, -0.1, 0.12)); head.add(jaw);
  for (const s of [-1, 1]) {
    eye(head, s * 0.11, 0.17, 0.3, 0.045, 0xff9a20, 4.5, 8);
    const ring = M(new THREE.TorusGeometry(0.085, 0.014, 6, 16), basic(0xff5a10, 3), s * 0.11, 0.17, 0.3); ring.castShadow = false; ring.name = 'ring'; head.add(ring);          // le rote di fiamme intorno agli occhi
  }
  const R = rng(17), st = [];
  for (let i = 0; i < 90; i++) { const sd = R() * 2 - 1; st.push({ pos: [sd * 0.2, -0.12 + R() * 0.12, 0.12 + R() * 0.22], rot: [0.1 + R() * 0.2, 0, sd * 0.3], len: 0.55 + R() * 0.7, r: 0.032, bend: sd * 0.12, bz: 0.12 + R() * 0.15 }); }
  for (let i = 0; i < 80; i++) { const sd = R() * 2 - 1; st.push({ pos: [sd * 0.24, 0.25 + R() * 0.15, -0.18 - R() * 0.1], rot: [0.0, 0, sd * 0.4], len: 0.7 + R() * 0.8, r: 0.03, bend: sd * 0.2, bz: -0.25 }); }
  head.add(M(strandsGeo(st), hair));
  fxn(head, 'eyes', 0, 0.17, 0.34, 'ember'); fxn(head, 'mouth', 0, -0.12, 0.3, 'breath');
  /* il remo */
  const oar = N('oar', 0, -0.2, 0.0); oar.rotation.set(Math.PI / 2 - 0.2, 0.2, 0);
  oar.add(M(new THREE.CylinderGeometry(0.055, 0.07, 3.6, 10), wood, 0, 0.9, 0), M(blobGeo(0.34, 0.8, 0.07, { amp: 0.03 }), wood, 0, 2.95, 0), M(new THREE.TorusGeometry(0.075, 0.02, 6, 10), plain(0x1a1a1c, { metalness: 0.7 }), 0, 0.2, 0, Math.PI / 2, 0, 0));
  const wr = root.getObjectByName('wrR'); wr.add(oar);
  fxn(oar, 'blade', 0, 3.3, 0, 'drip'); fxn(spine, 'mist', 0, 0.6, 0, 'mist');
  const anims = humanoidClips(root, { raise: -2.9, slam: -0.2, amp: 0.8, stride: 0.5, runDur: 0.9 });
  return { scene: root, anims, height: H, name: 'Caronte' };
}

/* ============================================================
   FURIA (Aletto, Megera, Tisifone) — "con idre verdissime eran cinte; serpentelli e ceraste
   avean per crespe, onde le fiere tempie erano avvinte" (Inf. IX)
   ============================================================ */
function buildFuria() {
  const skin = sm('leather', 0x1e2a24, 0x7a9484, { seed: 71, bump: 2, rough: 0.7 }), rag = sm('cloth', 0x2a0606, 0x8a1c16, { seed: 72, double: true, rough: 0.95 }), snake = sm('scale', 0x062a10, 0x4aa850, { seed: 73, rough: 0.4, bump: 2.5 }),
    claw = sm('bone', 0x1a1612, 0x7a6a50, { seed: 74, rough: 0.4 });
  const H = 3.6, h = humanoid({ skin, thigh: 0.85, shin: 0.9, torso: 1.1, hipW: 0.42, chest: [0.5, 0.55, 0.32], shW: 0.56, upper: 0.95, fore: 1.05, hunch: 0.15, thighR: 0.14, armR: 0.125, handS: 1.3, claw: 0.34, clawMat: claw, neckL: 0.3, neckR: 0.09, footH: 0.1, bulge: 0.08, slim: true });
  const { root, hips, spine, head } = h;
  const sk = new THREE.CylinderGeometry(0.4, 0.95, 1.9, 22, 8, true), sp = sk.attributes.position;
  for (let i = 0; i < sp.count; i++) { const y = sp.getY(i), t = (0.95 - y) / 1.9; if (t > 0.7) sp.setY(i, y - Math.abs(Math.sin(i * 6.1)) * 0.5 * (i % 2 ? 1 : 0.15)); }
  sk.computeVertexNormals(); hips.add(M(sk, rag, 0, -0.8, 0.02));
  spine.add(M(blobGeo(0.52, 0.6, 0.34, { amp: 0.03 }), rag, 0, 0.6, 0.02));                                                           // busto stracciato
  head.add(M(blobGeo(0.2, 0.26, 0.22, { seg: 22, amp: 0.03, s: 81 }), skin, 0, 0.08, 0.05), M(blobGeo(0.06, 0.07, 0.1), skin, 0, -0.01, 0.26));
  const jaw = N('jaw', 0, -0.1, 0.08); jaw.rotation.x = 0.3; jaw.add(M(blobGeo(0.13, 0.07, 0.15), skin, 0, -0.06, 0.1), M(blobGeo(0.09, 0.025, 0.12), plain(0x400508), 0, 0, 0.1)); head.add(jaw);
  for (const s of [-1, 1]) { const t = tooth(0.07, 0.015, claw, true); t.position.set(s * 0.05, 0.01, 0.18); jaw.add(t); }
  eye(head, -0.085, 0.12, 0.2, 0.04, 0x60ff60, 4.5, 8); eye(head, 0.085, 0.12, 0.2, 0.04, 0x60ff60, 4.5, 8);
  fxn(head, 'eyes', 0, 0.12, 0.24, 'ember'); fxn(head, 'mouth', 0, -0.15, 0.2, 'drip');
  /* capelli di serpenti: ogni serpente è una catena di nodi che ondeggia */
  const snakes = 11;
  for (let i = 0; i < snakes; i++) {
    const a = i / snakes * TAU, hr = N('hair' + i, Math.sin(a) * 0.15, 0.25 + Math.cos(a) * 0.04 * 0, Math.cos(a) * 0.14 - 0.02);
    hr.rotation.set(Math.cos(a) * 0.9 - 0.2, 0, -Math.sin(a) * 0.9); head.add(hr);
    let par = hr;
    for (let k = 0; k < 5; k++) { const sg = N(`hs${i}_${k}`, 0, k ? 0.22 : 0, 0), r0 = 0.04 - k * 0.005; sg.add(M(limbGeo(0.24, r0, Math.max(0.012, r0 - 0.006), 0.04, 6, true), snake)); par.add(sg); par = sg; sg.rotation.x = 0.25; }
    par.add(M(blobGeo(0.04, 0.03, 0.065, {}), snake, 0, 0.27, 0.0, 0.6), M(new THREE.SphereGeometry(0.012, 5, 5), basic(0xffe040, 3), 0.02, 0.28, 0.04), M(new THREE.SphereGeometry(0.012, 5, 5), basic(0xffe040, 3), -0.02, 0.28, 0.04));
  }
  fxn(head, 'hairtop', 0, 0.55, 0, 'wisp');
  /* un serpente sul braccio */
  fxn(spine, 'chest', 0, 0.6, 0.3, 'drip');
  const anims = humanoidClips(root, { raise: -2.2, slam: -0.4, amp: 1.1, stride: 0.7, runDur: 0.62 });
  const nodes = []; for (let i = 0; i < snakes; i++) for (let k = 0; k < 5; k++) nodes.push([`hs${i}_${k}`, i, k]);
  for (const c of anims) {
    const sped = c.name === 'Running' || c.name === 'Punch';
    const per = c.duration, add = nodes.flatMap(([n, i, k]) => {
      const n2 = 14, times = Array.from({ length: n2 + 1 }, (_, q) => q / n2 * per);
      const tz = times.map((_, q) => 0.5 * Math.sin(TAU * ((sped ? 2.5 : 1) * q / n2 + i * 0.17 + k * 0.14))), tx = times.map((_, q) => 0.25 + 0.28 * Math.sin(TAU * (q / n2 + i * 0.23 + k * 0.1)));
      return [new THREE.NumberKeyframeTrack(`${n}.rotation[z]`, times, tz), new THREE.NumberKeyframeTrack(`${n}.rotation[x]`, times, tx)];
    });
    c.tracks.push(...add);
  }
  return { scene: root, anims, height: H, name: 'Furia' };
}

/* ============================================================
   MINOTAURO — "l'infamia di Creti... che si morse sé come quei cui l'ira dentro fiacca" (Inf. XII)
   ============================================================ */
function buildMinotauro() {
  const fur = sm('fur', 0x1c0e08, 0x70482c, { seed: 91, bump: 2.5, rough: 0.8 }), skin = sm('leather', 0x3a2016, 0x95593f, { seed: 92, bump: 2.5, rough: 0.75 }), horn = sm('bone', 0x32261a, 0xe8dcc0, { seed: 93, rough: 0.35, bump: 2.5 }),
    wood = sm('wood', 0x1c1008, 0x5a3c22, { seed: 94, rough: 0.8, bump: 3 }), cloth = sm('cloth', 0x180c06, 0x50301c, { seed: 95, double: true, rough: 0.95 }), iron = plain(0x2a2a2e, { metalness: 0.8, roughness: 0.4 });
  const H = 3.4, h = humanoid({ skin, bodyMat: skin, legSkin: fur, thigh: 0.85, shin: 0.9, torso: 1.2, hipW: 0.62, chest: [0.82, 0.74, 0.5], shW: 0.9, upper: 0.85, fore: 0.9, hunch: 0.3, digi: true, thighR: 0.3, armR: 0.25, handS: 1.2, claw: 0.1, clawMat: horn, neckL: 0.3, neckR: 0.3, footH: 0.14, bulge: 0.25 });
  const { root, hips, spine, head } = h;
  spine.add(M(blobGeo(0.6, 0.55, 0.45, { amp: 0.06, s: 99 }), fur, 0, 1.15, -0.2));                                                      // gobba pelosa
  hips.add(M(new THREE.CylinderGeometry(0.65, 0.78, 0.55, 14, 3, true), cloth, 0, -0.2, 0.0));
  /* testa taurina */
  head.add(M(blobGeo(0.38, 0.42, 0.5, { seg: 22, amp: 0.05, s: 101 }), fur, 0, 0.1, 0.18), M(blobGeo(0.26, 0.24, 0.42, { amp: 0.04, s: 102 }), skin, 0, -0.1, 0.64), M(blobGeo(0.4, 0.1, 0.22, { amp: 0.04 }), fur, 0, 0.32, 0.4));
  for (const s of [-1, 1]) {
    head.add(M(new THREE.SphereGeometry(0.045, 8, 6), plain(0x050202), s * 0.1, -0.06, 1.02), M(blobGeo(0.07, 0.07, 0.09), plain(0x1a0a08), s * 0.1, -0.06, 1.02));
    head.add(M(blobGeo(0.12, 0.2, 0.06, { amp: 0.02 }), fur, s * 0.48, 0.25, -0.06, 0.1, 0, s * 1.05));                                   // orecchie
    head.add(M(taperTube(curveOf([[s * 0.32, 0.34, 0.12], [s * 0.7, 0.34, 0.1], [s * 0.95, 0.62, 0.28], [s * 0.85, 1.05, 0.55]]), 0.1, 0.015, 20, 8), horn));
  }
  head.add(M(new THREE.TorusGeometry(0.085, 0.017, 6, 12), iron, 0, -0.25, 0.98, Math.PI / 2, 0, 0));                                       // anello al naso
  const jaw = N('jaw', 0, -0.2, 0.3); jaw.rotation.x = 0.2; jaw.add(M(blobGeo(0.2, 0.09, 0.32, { amp: 0.03 }), skin, 0, -0.04, 0.34)); head.add(jaw);
  eye(head, -0.2, 0.2, 0.46, 0.055, 0xff3a14, 4, 6); eye(head, 0.2, 0.2, 0.46, 0.055, 0xff3a14, 4, 6);
  fxn(head, 'noseL', -0.1, -0.06, 1.06, 'breath'); fxn(head, 'noseR', 0.1, -0.06, 1.06, 'breath');
  const R = rng(23), st = [];
  for (let i = 0; i < 40; i++) st.push({ pos: [(R() - 0.5) * 0.5, 0.35 + R() * 0.1, 0.0 + R() * 0.3], rot: [0.3, 0, (R() - 0.5) * 0.3], len: 0.2 + R() * 0.2, r: 0.035, bend: (R() - 0.5) * 0.1, bz: -0.1 });
  head.add(M(strandsGeo(st), fur));
  /* mazza chiodata */
  const club = N('club', 0, -0.2, 0.05); club.rotation.set(Math.PI / 2 - 0.3, 0.1, 0);
  club.add(M(limbGeo(1.9, 0.07, 0.26, 0.05, 10, true), wood, 0, 0.0, 0), M(new THREE.SphereGeometry(0.26, 10, 8), wood, 0, 1.9, 0));
  for (let i = 0; i < 14; i++) { const a = rng(i + 3)() * TAU, y = 1.25 + (i % 5) * 0.16, sp = tooth(0.2, 0.045, iron, false); sp.position.set(Math.sin(a) * 0.2, y, Math.cos(a) * 0.2); sp.lookAt(Math.sin(a) * 9, y, Math.cos(a) * 9); sp.rotateX(Math.PI / 2); club.add(sp); }
  root.getObjectByName('wrR').add(club);
  fxn(spine, 'dust', 0, 0.3, 0, 'ember');
  const anims = humanoidClips(root, { raise: -2.3, slam: -0.5, amp: 1.0, stride: 0.7, runDur: 0.68 });
  return { scene: root, anims, height: H, name: 'Minotauro' };
}

/* ============================================================
   MALEBRANCA — i diavoli della bolgia dei barattieri (Inf. XXI-XXII): alati, neri, con l'uncino
   ============================================================ */
function buildMalebranca() {
  const skin = sm('leather', 0x120508, 0x5a1a1c, { seed: 111, bump: 2.5, rough: 0.6 }), mem = sm('leather', 0x2a0806, 0x7a1c10, { seed: 112, double: true, rough: 0.7, bump: 1 }), horn = sm('bone', 0x140c08, 0x6a5a40, { seed: 113, rough: 0.4 }),
    iron = plain(0x34343a, { metalness: 0.85, roughness: 0.35 }), wood = sm('wood', 0x1a0e06, 0x4a3018, { seed: 114, rough: 0.8 });
  const H = 1.7, h = humanoid({ skin, thigh: 0.48, shin: 0.5, torso: 0.62, hipW: 0.27, chest: [0.3, 0.3, 0.2], shW: 0.36, upper: 0.5, fore: 0.52, hunch: 0.35, digi: true, thighR: 0.1, armR: 0.075, handS: 1.3, claw: 0.14, clawMat: horn, neckL: 0.12, neckR: 0.07, footH: 0.07, bulge: 0.12 });
  const { root, spine, head } = h;
  head.add(M(blobGeo(0.16, 0.17, 0.19, { amp: 0.03, s: 121 }), skin, 0, 0.05, 0.05), M(blobGeo(0.09, 0.08, 0.17, { amp: 0.03 }), skin, 0, -0.03, 0.22), M(blobGeo(0.17, 0.04, 0.09), skin, 0, 0.12, 0.15));
  const jaw = N('jaw', 0, -0.07, 0.05); jaw.rotation.x = 0.3; jaw.add(M(blobGeo(0.08, 0.05, 0.14), skin, 0, -0.03, 0.12)); head.add(jaw);
  for (const s of [-1, 1]) {
    head.add(M(taperTube(curveOf([[s * 0.1, 0.13, 0.02], [s * 0.2, 0.25, -0.02], [s * 0.2, 0.42, 0.06]]), 0.035, 0.006, 10, 6), horn));
    const e = new THREE.ConeGeometry(0.06, 0.28, 5); e.translate(0, 0.14, 0); head.add(M(e, skin, s * 0.17, 0.08, -0.04, 0, 0, -s * 1.2));                  // orecchie a punta
    const t = tooth(0.06, 0.012, horn, true); t.position.set(s * 0.04, 0.0, 0.17); jaw.add(t);
  }
  eye(head, -0.075, 0.09, 0.17, 0.032, 0xffd020, 4, 7); eye(head, 0.075, 0.09, 0.17, 0.032, 0xffd020, 4, 7);
  /* ali di pipistrello: ossa e membrana */
  for (const s of [-1, 1]) {
    const w = N(s < 0 ? 'wingL' : 'wingR', s * 0.12, 0.45, -0.15), w2 = N(s < 0 ? 'wing2L' : 'wing2R', s * 0.55, 0, 0);
    const bone = (x0, y0, x1, y1, r) => M(taperTube(curveOf([[x0, y0, 0], [(x0 + x1) / 2, (y0 + y1) / 2 + 0.02, 0], [x1, y1, 0]]), r, r * 0.4, 8, 5), skin);
    w.add(bone(0, 0, s * 0.55, 0.05, 0.026)); w2.add(bone(0, 0, s * 0.55, 0.3, 0.02), bone(0, 0, s * 0.62, -0.12, 0.014), bone(0, 0, s * 0.35, -0.4, 0.012));
    const shp = new THREE.Shape(); shp.moveTo(0, 0); shp.lineTo(s * 0.55, 0.05); shp.lineTo(s * 1.1, 0.35); shp.lineTo(s * 1.18, -0.14); shp.lineTo(s * 0.96, -0.1); shp.lineTo(s * 0.9, -0.5); shp.lineTo(s * 0.7, -0.3); shp.lineTo(s * 0.5, -0.62); shp.lineTo(s * 0.18, -0.5); shp.lineTo(0.02, -0.32); shp.closePath();
    const mg = new THREE.ShapeGeometry(shp); w.add(M(mg, mem, 0, 0, 0)); w.add(w2);
    w.rotation.set(0.1, s * 0.5, s * 0.35); spine.add(w);
  }
  /* coda con la punta a freccia */
  const tp = N('tailRoot', 0, 0.08, -0.22); tp.rotation.x = -1.3; root.getObjectByName('hips').add(tp);
  let par = tp; for (let i = 0; i < 4; i++) { const s = N('tl' + i, 0, i ? 0.24 : 0, 0); s.add(M(limbGeo(0.26, 0.05 - i * 0.008, 0.04 - i * 0.008, 0.02, 6, true), skin)); par.add(s); par = s; s.rotation.x = 0.35; }
  const arrow = new THREE.ConeGeometry(0.07, 0.2, 4); arrow.translate(0, 0.35, 0); par.add(M(arrow, horn));
  /* forcone con l'uncino */
  const fork = N('fork', 0, -0.1, 0.0); fork.rotation.set(Math.PI / 2 - 0.5, 0.0, 0);
  fork.add(M(new THREE.CylinderGeometry(0.022, 0.026, 2.1, 8), wood, 0, 0.6, 0));
  for (const s of [-1, 0, 1]) { const pr = taperTube(curveOf([[s * 0.1, 1.62, 0], [s * 0.1 + s * 0.02, 1.82, 0], [s * 0.1, 2.05, 0]]), 0.016, 0.004, 6, 5); fork.add(M(pr, iron)); }
  fork.add(M(new THREE.TorusGeometry(0.1, 0.014, 6, 12, Math.PI), iron, 0, 1.64, 0, 0, 0, Math.PI));
  const hook = taperTube(curveOf([[0, 1.9, 0], [0.16, 2.0, 0.0], [0.22, 1.86, 0], [0.12, 1.72, 0]]), 0.014, 0.004, 8, 5); fork.add(M(hook, iron));
  root.getObjectByName('wrR').add(fork);
  fxn(fork, 'tip', 0, 2.1, 0, 'flame'); fxn(spine, 'back', 0, 0.4, -0.1, 'ember');
  const anims = humanoidClips(root, { raise: -2.1, slam: -0.3, amp: 0.8, stride: 0.8, runDur: 0.5 });
  /* le ali battono a ogni animazione */
  const flap = (amp, f) => [['wingL', 'rotation[z]', SN(-0.35, -amp, f)], ['wingR', 'rotation[z]', SN(0.35, amp, f)], ['wing2L', 'rotation[z]', SN(0, -amp * 0.7, f, 0.15)], ['wing2R', 'rotation[z]', SN(0, amp * 0.7, f, 0.15)]];
  for (const c of anims) { const f = c.name === 'Running' ? 2.5 : c.name === 'Idle' ? 1 : 1.5; const per = c.duration, n2 = 16, times = Array.from({ length: n2 + 1 }, (_, q) => q / n2 * per);
    for (const [n, p, fn] of flap(c.name === 'Death' ? 0.1 : 0.55, f)) c.tracks.push(new THREE.NumberKeyframeTrack(`${n}.${p}`, times, times.map((_, q) => fn(q / n2 * (c.name === 'Idle' ? 1 : 1))))); }
  return { scene: root, anims, height: H, name: 'Malebranca' };
}

/* ============================================================
   ARPIA — "Quivi le brutte Arpie lor nidi fanno... ali late, e colli e visi umani,
   piè con artigli, e pennuto 'l gran ventre" (Inf. XIII)
   ============================================================ */
function buildArpia() {
  const plum = sm('feather', 0x07080e, 0x2a3c66, { seed: 131, bump: 2, rough: 0.55 }), skin = sm('leather', 0x56624f, 0xb2bca6, { seed: 132, bump: 1.5, rough: 0.7 }), hair = sm('fur', 0x04040a, 0x242034, { seed: 133, bump: 1, rough: 0.7 }),
    claw = sm('bone', 0x1a140e, 0x7a6a50, { seed: 134, rough: 0.4 }), fea = new THREE.MeshStandardMaterial({ color: 0x1a2640, roughness: 0.5, side: THREE.DoubleSide, metalness: 0.15 });
  const fg = new THREE.Shape(); fg.moveTo(0, 0); fg.quadraticCurveTo(0.06, 0.45, 0, 0.9); fg.quadraticCurveTo(-0.06, 0.45, 0, 0);
  const fgeo = new THREE.ShapeGeometry(fg, 6); fgeo.rotateX(-Math.PI / 2);                                                         // la piuma si allunga verso -Z (indietro)
  const H = 1.7, root = N('root'), hips = N('hips', 0, 0.8, 0), body = N('body', 0, 0, 0); root.add(hips); hips.add(body);
  body.add(M(blobGeo(0.26, 0.42, 0.25, { seg: 22, amp: 0.05, s: 141 }), plum, 0, 0.14, 0), M(blobGeo(0.22, 0.26, 0.22, { amp: 0.05, s: 142 }), plum, 0, -0.3, -0.06));
  /* petto piumato: ciuffi di penne */
  const R = rng(5), st = []; for (let i = 0; i < 60; i++) { const a = R() * TAU, y = R() * 0.9 - 0.5; st.push({ pos: [Math.sin(a) * 0.3, y, Math.cos(a) * 0.3 * 0.9], rot: [Math.PI - 0.0, a, 0], len: 0.2 + R() * 0.2, r: 0.045, bend: 0.0, bz: 0.09 }); }
  body.add(M(strandsGeo(st.map(s => ({ ...s, rot: [-0.5 - R() * 0.3, s.rot[1], 0] }))), plum));
  const neck = N('neck', 0, 0.5, 0.05), head = N('head', 0, 0.36, 0.05); head.scale.setScalar(1.35); body.add(neck); neck.add(head); neck.rotation.x = 0.2; head.rotation.x = -0.1;
  neck.add(M(new THREE.CylinderGeometry(0.065, 0.1, 0.5, 8), skin, 0, 0.16, 0));
  head.add(M(blobGeo(0.15, 0.18, 0.16, { seg: 20, amp: 0.03, s: 143 }), skin, 0, 0.07, 0.03), M(blobGeo(0.04, 0.05, 0.07), skin, 0, 0.0, 0.17));
  const jaw = N('jaw', 0, -0.07, 0.04); jaw.rotation.x = 0.45; jaw.add(M(blobGeo(0.1, 0.045, 0.11), skin, 0, -0.03, 0.08), M(blobGeo(0.07, 0.02, 0.09), plain(0x380508), 0, 0, 0.08)); head.add(jaw);
  for (const s of [-1, 1]) { const t = tooth(0.05, 0.011, claw, true); t.position.set(s * 0.035, 0.0, 0.12); jaw.add(t); }
  eye(head, -0.065, 0.11, 0.14, 0.03, 0x60b0ff, 4, 8); eye(head, 0.065, 0.11, 0.14, 0.03, 0x60b0ff, 4, 8);
  const hst = []; for (let i = 0; i < 70; i++) { const sd = R() * 2 - 1; hst.push({ pos: [sd * 0.13, 0.2 - R() * 0.12, -0.04 - R() * 0.1], rot: [0.35 + R() * 0.2, 0, sd * 0.5], len: 0.5 + R() * 0.6, r: 0.016, bend: sd * 0.12, bz: -0.18 - R() * 0.2 }); }
  head.add(M(strandsGeo(hst), hair));
  fxn(head, 'mouth', 0, -0.09, 0.14, 'drip'); fxn(body, 'feathers', 0, 0.4, -0.2, 'feather');
  /* ali: ossa + penne a ventaglio */
  for (const s of [-1, 1]) {
    const wing = N(s < 0 ? 'wingL' : 'wingR', s * 0.28, 0.4, -0.04), fore = N(s < 0 ? 'foreL' : 'foreR', s * 0.5, 0, 0);
    const bone = (len, r) => M(taperTube(curveOf([[0, 0, 0], [s * len * 0.5, 0.03, 0], [s * len, 0, 0]]), r, r * 0.6, 8, 6), plum);
    wing.add(bone(0.5, 0.045)); fore.add(bone(0.55, 0.035));
    for (let i = 0; i < 9; i++) {                                                                                                     // penne remiganti: lunghe verso la punta, spazzate indietro
      const len = 0.5 + 0.4 * Math.sin(i / 8 * Math.PI * 0.85 + 0.35), pf = M(fgeo, fea);
      pf.scale.set(1.6, 1, len / 0.9); pf.position.set(s * (0.04 + i * 0.07), 0, 0); pf.rotation.y = -s * (i - 2) * 0.07; fore.add(pf);
    }
    for (let i = 0; i < 6; i++) { const pf = M(fgeo, fea); pf.scale.set(1.5, 1, (0.42 - i * 0.025) / 0.9); pf.position.set(s * (0.05 + i * 0.1), 0, 0); pf.rotation.y = -s * i * 0.03; wing.add(pf); }
    wing.add(fore); wing.rotation.set(0, s * 0.3, s * 0.5); body.add(wing);
  }
  /* zampe d'uccello con artigli */
  for (const s of [-1, 1]) {
    const L = s < 0 ? 'L' : 'R', hp = N('hip' + L, s * 0.15, -0.35, -0.05), kn = N('knee' + L, 0, -0.3, 0), an = N('ank' + L, 0, -0.3, 0);
    hp.add(M(limbGeo(0.3, 0.09, 0.05, 0.3, 8), plum)); kn.add(M(limbGeo(0.3, 0.05, 0.03, 0.05, 8), skin)); an.add(M(blobGeo(0.05, 0.03, 0.1), skin, 0, -0.02, 0.05));
    for (let i = -1; i <= 1; i++) { const t = new THREE.ConeGeometry(0.018, 0.2, 5); t.rotateX(Math.PI / 2); t.translate(0, 0, 0.1); const m = M(t, claw, 0, -0.03, 0.08, 0.2, i * 0.35, 0); an.add(m); }
    const hb = new THREE.ConeGeometry(0.018, 0.14, 5); hb.rotateX(-Math.PI / 2); an.add(M(hb, claw, 0, -0.03, -0.05));
    hp.rotation.x = -0.35; kn.rotation.x = 0.7; an.rotation.x = -0.35; hp.add(kn); kn.add(an); hips.add(hp);
  }
  const tail = N('tailRoot', 0, -0.3, -0.25); tail.rotation.x = 0.5; body.add(tail);
  for (let i = 0; i < 5; i++) { const pf = M(fgeo, fea); pf.scale.set(1.8, 1, 0.4 / 0.9); pf.rotation.y = (i - 2) * 0.22; tail.add(pf); }
  const rest = n => root.getObjectByName(n).rotation;
  const wingsFlap = (amp, f, base = 0.5) => [['wingL', 'rotation[z]', t => -(base + amp * Math.sin(TAU * f * t))], ['wingR', 'rotation[z]', t => base + amp * Math.sin(TAU * f * t)], ['foreL', 'rotation[z]', t => -(0.25 * amp * Math.sin(TAU * f * t + 0.8))], ['foreR', 'rotation[z]', t => 0.25 * amp * Math.sin(TAU * f * t + 0.8)]];
  const idle = [['hips', 'position[y]', SN(0.8, 0.04, 1)], ...wingsFlap(0.35, 1, 0.6), ['head', 'rotation[y]', SN(0, 0.3, 0.5)], ['jaw', 'rotation[x]', SN(0.35, 0.2, 2)]];
  const run = [['hips', 'position[y]', t => 0.95 + 0.12 * Math.sin(TAU * 2 * t)], ['body', 'rotation[x]', SN(0.5, 0.06, 2)], ...wingsFlap(0.9, 2, 0.1),
    ['hipL', 'rotation[x]', SN(-0.5, 0.5, 1)], ['hipR', 'rotation[x]', SN(-0.5, 0.5, 1, 0.5)], ['kneeL', 'rotation[x]', SN(0.8, 0.4, 1, 0.2)], ['kneeR', 'rotation[x]', SN(0.8, 0.4, 1, 0.7)], ['jaw', 'rotation[x]', SN(0.5, 0.2, 2)], ['head', 'rotation[x]', SN(-0.25, 0.05, 2)]];
  const atk = [['body', 'rotation[x]', t => 0.5 * ss(0.05, 0.6, t) - 0.9 * ss(0.62, 0.8, t) * (1 - ss(0.9, 1, t)) * 0 + 0.35 * ss(0.62, 0.8, t) * (1 - ss(0.9, 1, t))], ['hips', 'position[y]', t => 0.8 + 0.3 * ss(0.05, 0.6, t) * (1 - ss(0.62, 0.76, t))],
    ...wingsFlap(1.0, 2.5, 0.2), ['jaw', 'rotation[x]', t => 0.3 + 0.8 * ss(0.5, 0.78, t) * (1 - ss(0.9, 1, t))], ['hipL', 'rotation[x]', t => -0.35 - 0.9 * ss(0.5, 0.76, t) * (1 - ss(0.9, 1, t))], ['hipR', 'rotation[x]', t => -0.35 - 0.9 * ss(0.5, 0.76, t) * (1 - ss(0.9, 1, t))],
    ['head', 'rotation[x]', t => -0.1 + 0.45 * ss(0.6, 0.78, t) * (1 - ss(0.9, 1, t))]];
  const hit = [['body', 'rotation[x]', t => -0.4 * Math.sin(Math.PI * t)], ['hips', 'position[y]', t => 0.8 + 0.08 * Math.sin(Math.PI * t)], ['head', 'rotation[x]', t => -0.1 - 0.5 * Math.sin(Math.PI * t)], ...wingsFlap(0.3, 1, 0.9)];
  const death = [['root', 'rotation[x]', t => -1.45 * ss(0.15, 0.7, t)], ['hips', 'position[y]', t => 0.8 - 0.3 * ss(0, 0.6, t)], ...wingsFlap(0.0, 1, 0.5).map(([n, p, f]) => [n, p, t => f(0) * (1 - ss(0, 0.5, t)) * 0 + (n.endsWith('L') ? -1 : 1) * (n.startsWith('wing') ? 1.2 : 0.5) * ss(0.2, 0.9, t)]), ['jaw', 'rotation[x]', t => 0.4 + 0.5 * ss(0.2, 0.8, t)]];
  const anims = [clip('Idle', 2.0, idle), clip('Running', 0.5, run), clip('Punch', 0.7, atk, 24), clip('HitReact', 0.35, hit, 10), clip('Death', 1.4, death, 24)];
  return { scene: root, anims, height: H, name: 'Arpia' };
}


/* ============================================================
   ANIMA TRASCINATA — "come li stornei ne portan l'ali nel freddo tempo, a schiera larga e piena, così quel fiato li spiriti mali" (Inf. V)
   Spettro semitrasparente che si dissolve in una coda di nebbia, con le braccia tese.
   ============================================================ */
function buildAnima() {
  const ghost = plain(0xb8aaff, { transparent: true, opacity: 0.62, emissive: 0x4a3aa0, emissiveIntensity: 0.9, roughness: 0.5, depthWrite: false });
  const H = 1.7, h = humanoid({ skin: ghost, thigh: 0.5, shin: 0.5, torso: 0.7, hipW: 0.26, chest: [0.3, 0.32, 0.2], shW: 0.36, upper: 0.5, fore: 0.55, hunch: 0.25, thighR: 0.09, armR: 0.07, handS: 1.5, claw: 0.1, neckL: 0.12, neckR: 0.06, footH: 0.05, slim: true });
  const { root, hips, head } = h;
  for (const n of ['hipL', 'hipR']) root.getObjectByName(n).visible = false;                           // le gambe si sciolgono nella nebbia
  const tail = new THREE.ConeGeometry(0.32, 1.1, 14, 4, true); tail.rotateX(Math.PI); const tp = tail.attributes.position;
  for (let i = 0; i < tp.count; i++) { const y = tp.getY(i); tp.setX(i, tp.getX(i) * (1 + Math.sin(i * 3.1) * 0.12)); tp.setZ(i, tp.getZ(i) + (0.55 - y) * 0.12); }
  tail.computeVertexNormals(); hips.add(M(tail, new THREE.MeshStandardMaterial({ color: 0x9a8cf0, transparent: true, opacity: 0.38, emissive: 0x3a2a90, side: THREE.DoubleSide, depthWrite: false, vertexColors: true }), 0, -0.45, -0.05));
  head.add(M(blobGeo(0.14, 0.17, 0.15, { amp: 0.04, s: 211 }), ghost, 0, 0.06, 0.04));
  const jaw = N('jaw', 0, -0.05, 0.05); jaw.rotation.x = 0.55; jaw.add(M(blobGeo(0.07, 0.05, 0.08), plain(0x14082a, { transparent: true, opacity: 0.8 }), 0, -0.03, 0.06)); head.add(jaw);
  eye(head, -0.055, 0.09, 0.12, 0.03, 0xe8e0ff, 4, 9); eye(head, 0.055, 0.09, 0.12, 0.03, 0xe8e0ff, 4, 9);
  fxn(head, 'eyes', 0, 0.1, 0.1, 'wisp'); fxn(hips, 'trail', 0, -0.6, -0.1, 'wisp'); fxn(hips, 'tear', 0, 0.9, 0.15, 'drip');
  const anims = humanoidClips(root, { raise: -1.6, slam: -0.5, amp: 1.6, stride: 0.15, runDur: 0.9, fall: -0.6 });
  return { scene: root, anims, height: H, name: 'Anima' };
}

/* ============================================================
   INGORDO — "Voi cittadini mi chiamaste Ciacco: per la dannosa colpa de la gola, come tu vedi, a la pioggia mi fiacco" (Inf. VI)
   ============================================================ */
function buildIngordo() {
  const skin = sm('leather', 0x2a3022, 0x8a9a6a, { seed: 221, bump: 3, rough: 0.55 }), mud = sm('leather', 0x1a1408, 0x4a3a1c, { seed: 222, bump: 3, rough: 0.5 }), claw = sm('bone', 0x1a140c, 0x6a5a40, { seed: 223 });
  const H = 3.0, h = humanoid({ skin, bodyMat: skin, legSkin: mud, thigh: 0.75, shin: 0.8, torso: 1.2, hipW: 0.7, chest: [0.8, 0.7, 0.62], shW: 0.9, upper: 0.85, fore: 0.9, hunch: 0.35, thighR: 0.34, armR: 0.26, handS: 1.3, claw: 0.14, clawMat: claw, neckL: 0.18, neckR: 0.4, footH: 0.12, bulge: 0.2 });
  const { root, spine, head } = h;
  spine.add(M(blobGeo(1.0, 0.85, 0.95, { seg: 24, amp: 0.07, s: 224 }), skin, 0, 0.35, 0.38), M(blobGeo(0.7, 0.4, 0.6, { amp: 0.08, s: 225 }), mud, 0, 0.05, 0.55));     // il ventre enorme
  head.add(M(blobGeo(0.34, 0.3, 0.36, { seg: 22, amp: 0.06, s: 226 }), skin, 0, 0.08, 0.06), M(blobGeo(0.3, 0.1, 0.2), mud, 0, 0.0, -0.1));
  const jaw = N('jaw', 0, -0.12, 0.08); jaw.rotation.x = 0.6; jaw.add(M(blobGeo(0.27, 0.1, 0.28, { amp: 0.04 }), skin, 0, -0.04, 0.16), M(blobGeo(0.2, 0.04, 0.22), plain(0x3a0508, { emissive: 0x1a0000 }), 0, 0.02, 0.16), M(blobGeo(0.12, 0.05, 0.2), plain(0x9a3040), 0, 0.03, 0.2)); head.add(jaw);
  for (let i = 0; i < 6; i++) { const t = tooth(0.08, 0.025, claw, true); t.position.set((i - 2.5) * 0.07, 0.0, 0.3); jaw.add(t); }
  eye(head, -0.13, 0.14, 0.3, 0.045, 0xc8ff60, 3.8, 6); eye(head, 0.13, 0.14, 0.3, 0.045, 0xc8ff60, 3.8, 6);
  fxn(head, 'mouth', 0, -0.2, 0.3, 'drool'); fxn(head, 'mouth2', 0.1, -0.2, 0.3, 'drool'); fxn(spine, 'mud', 0, 0.5, 0.4, 'drip');
  const anims = humanoidClips(root, { raise: -2.0, slam: -0.4, amp: 1.2, stride: 0.55, runDur: 0.85 });
  return { scene: root, anims, height: H, name: 'Ingordo' };
}

/* ============================================================
   SEMIRAMIDE — "L'altra è Semiramìs, di cui si legge che succedette a Nino e fu sua sposa" (Inf. V)
   Regina in veste magenta con corona d'oro, capelli al vento e scettro.
   ============================================================ */
function buildSemiramide() {
  const skin = sm('leather', 0x4a3a40, 0xd8b8b8, { seed: 231, bump: 1.4, rough: 0.6 }), gown = sm('cloth', 0x2a0620, 0xc0307a, { seed: 232, double: true, rough: 0.7 }), gold = plain(0xe8b838, { metalness: 0.9, roughness: 0.28 }),
    hair = sm('fur', 0x08040c, 0x3a2040, { seed: 233, bump: 1 }), nail = plain(0xe8b838, { metalness: 0.9, roughness: 0.3 });
  const H = 3.6, h = humanoid({ skin, thigh: 0.85, shin: 0.9, torso: 1.15, hipW: 0.44, chest: [0.52, 0.58, 0.34], shW: 0.58, upper: 0.95, fore: 1.05, hunch: 0.04, thighR: 0.13, armR: 0.11, handS: 1.3, claw: 0.3, clawMat: nail, neckL: 0.34, neckR: 0.09, footH: 0.1, bulge: 0.08, slim: true });
  const { root, hips, spine, head } = h;
  const gg = new THREE.CylinderGeometry(0.42, 1.35, 2.1, 30, 10, true), gp = gg.attributes.position;
  for (let i = 0; i < gp.count; i++) { const y = gp.getY(i), a = Math.atan2(gp.getX(i), gp.getZ(i)), t = (1.05 - y) / 2.1; const w = 1 + t * t * 0.18 * Math.sin(a * 7 + y * 3); gp.setX(i, gp.getX(i) * w); gp.setZ(i, gp.getZ(i) * w); if (t > 0.85) gp.setY(i, y - Math.abs(Math.sin(i * 5.7)) * 0.2); }
  gg.computeVertexNormals(); hips.add(M(gg, gown, 0, -0.9, 0.02));
  spine.add(M(blobGeo(0.54, 0.62, 0.36, { amp: 0.03, s: 234 }), gown, 0, 0.62, 0.02));
  hips.add(M(new THREE.TorusGeometry(0.43, 0.04, 8, 28), gold, 0, 0.12, 0, Math.PI / 2, 0, 0));                  // cintura d'oro
  head.add(M(blobGeo(0.2, 0.26, 0.22, { seg: 22, amp: 0.03, s: 235 }), skin, 0, 0.08, 0.05), M(blobGeo(0.05, 0.06, 0.09), skin, 0, -0.01, 0.26));
  const jaw = N('jaw', 0, -0.1, 0.08); jaw.rotation.x = 0.22; jaw.add(M(blobGeo(0.12, 0.06, 0.14), skin, 0, -0.06, 0.1), M(blobGeo(0.09, 0.02, 0.1), plain(0xa02050), 0, 0, 0.1)); head.add(jaw);
  eye(head, -0.085, 0.12, 0.2, 0.04, 0xff60d0, 4.5, 8); eye(head, 0.085, 0.12, 0.2, 0.04, 0xff60d0, 4.5, 8);
  const crown = N('crown', 0, 0.3, 0.02); crown.add(M(new THREE.TorusGeometry(0.19, 0.03, 8, 24), gold, 0, 0, 0, Math.PI / 2, 0, 0));
  for (let i = 0; i < 7; i++) { const a = i / 7 * TAU, sp = new THREE.ConeGeometry(0.035, 0.2 + (i % 2) * 0.1, 6); crown.add(M(sp, gold, Math.sin(a) * 0.19, 0.12, Math.cos(a) * 0.19)); crown.add(M(new THREE.SphereGeometry(0.03, 8, 6), basic(0xff40b0, 2.8), Math.sin(a) * 0.19, 0.24 + (i % 2) * 0.1, Math.cos(a) * 0.19)); }
  head.add(crown);
  const R = rng(41), st = [];
  for (let i = 0; i < 90; i++) { const sd = R() * 2 - 1; st.push({ pos: [sd * 0.17, 0.22 - R() * 0.12, -0.03 - R() * 0.12], rot: [0.5 + R() * 0.3, 0, sd * 0.4], len: 0.9 + R() * 1.1, r: 0.02, bend: sd * 0.3, bz: -0.9 - R() * 0.7 }); }
  head.add(M(strandsGeo(st), hair));                                                                                 // capelli spinti all'indietro dalla bufera
  const scepter = N('scepter', 0, -0.2, 0.05); scepter.rotation.set(Math.PI / 2 - 0.3, 0, 0);
  scepter.add(M(new THREE.CylinderGeometry(0.03, 0.035, 2.4, 8), gold, 0, 0.8, 0), M(new THREE.OctahedronGeometry(0.16, 0), basic(0xff40c0, 2.8), 0, 2.15, 0), M(new THREE.TorusGeometry(0.14, 0.02, 6, 14), gold, 0, 2.15, 0));
  root.getObjectByName('wrR').add(scepter);
  fxn(scepter, 'gem', 0, 2.15, 0, 'flame'); fxn(head, 'hair', 0, 0.3, -0.3, 'wisp'); fxn(spine, 'wind', 0, 0.8, -0.4, 'wisp');
  const anims = humanoidClips(root, { raise: -2.4, slam: -0.3, amp: 1.0, stride: 0.5, runDur: 0.85 });
  return { scene: root, anims, height: H, name: 'Semiramide' };
}

/* ============================================================
   SEGUGIO INFERNALE — i cani della palude, figli di Cerbero (Inf. VI): magri, fangosi, occhi di brace
   ============================================================ */
function buildSegugio() {
  const fur = sm('fur', 0x100a06, 0x4a3822, { seed: 241, bump: 2.5, rough: 0.7 }), mud = sm('leather', 0x1a1008, 0x4a3822, { seed: 242, bump: 2, rough: 0.55 }), claw = sm('bone', 0x16100a, 0x6a5a40, { seed: 243 }),
    tongue = plain(0x9a2c3a, { roughness: 0.4 }), ivory = plain(0xd8cfaa, { roughness: 0.35 });
  const H = 1.3, root = N('root'), body = N('body', 0, 0.78, 0); root.add(body);
  body.add(M(blobGeo(0.34, 0.3, 0.75, { seg: 20, amp: 0.05, s: 251 }), fur, 0, 0, 0), M(blobGeo(0.38, 0.38, 0.4, { amp: 0.05, s: 252 }), fur, 0, 0.05, 0.4), M(blobGeo(0.34, 0.32, 0.35, { amp: 0.05, s: 253 }), mud, 0, 0, -0.5));
  const R = rng(9), st = []; for (let i = 0; i < 40; i++) st.push({ pos: [(R() - 0.5) * 0.3, 0.3, -0.6 + R() * 1.2], rot: [-0.8 - R() * 0.3, 0, (R() - 0.5) * 0.5], len: 0.18 + R() * 0.2, r: 0.03, bend: 0, bz: 0.04 });
  body.add(M(strandsGeo(st), fur));
  for (const [sd, zf, nm] of [[-1, 0.42, 'fL'], [1, 0.42, 'fR'], [-1, -0.45, 'hL'], [1, -0.45, 'hR']]) {
    const front = zf > 0, up = front ? 0.4 : 0.45, lo = front ? 0.4 : 0.45;
    const sh = N('s' + nm, sd * 0.24, -0.05, zf), el = N('e' + nm, 0, -up, 0), pw = N('p' + nm, 0, -lo, 0);
    sh.add(M(limbGeo(up, 0.13, 0.09, 0.12, 8), fur)); el.add(M(limbGeo(lo, 0.09, 0.06, 0.05, 8), mud)); pw.add(M(blobGeo(0.08, 0.05, 0.13), mud, 0, -0.03, 0.05)); claws(pw, 3, 0.4, 0.09, 0.02, claw, 0, -0.05, 0.15);
    sh.rotation.x = front ? -0.2 : -0.45; el.rotation.x = front ? 0.4 : 0.9; pw.rotation.x = front ? -0.2 : -0.45; sh.add(el); el.add(pw); body.add(sh);
  }
  const neck = N('neck', 0, 0.12, 0.62), head = N('head', 0, 0.28, 0.1); neck.rotation.x = 0.5; body.add(neck); neck.add(M(limbGeo(0.3, 0.2, 0.15, 0.05, 8, true), fur)); neck.add(head); head.rotation.x = 0.55;
  const dh = dogHead(fur, tongue, ivory, 0.36); head.add(dh.g); dh.jaw.name = 'jaw'; fxn(head, 'mouth', 0, -0.1, 0.4, 'drool'); fxn(head, 'mouth2', 0.04, -0.1, 0.4, 'drool');
  const tl = N('tail', 0, 0.1, -0.7); tl.rotation.x = -0.9; tl.add(M(limbGeo(0.5, 0.07, 0.02, 0.02, 6, true), fur)); body.add(tl);
  const nd = n => root.getObjectByName(n), rot = (n, a) => nd(n).rotation[a], by = 0.78;
  const gal = (n, ph) => t => rot(n, 'x') + 0.7 * Math.sin(TAU * (t + ph));
  const idle = [['body', 'position[y]', SN(by, 0.015, 1)], ['neck', 'rotation[y]', SN(0, 0.3, 0.5)], ['jaw', 'rotation[x]', SN(0.3, 0.2, 1.5)], ['tail', 'rotation[z]', SN(0, 0.4, 2)]];
  const run = [['body', 'position[y]', t => by + 0.07 * Math.abs(Math.sin(TAU * t)) - 0.04], ['body', 'rotation[x]', SN(0.05, 0.08, 1)], ['sfL', 'rotation[x]', gal('sfL', 0)], ['sfR', 'rotation[x]', gal('sfR', 0.1)], ['shL', 'rotation[x]', gal('shL', 0.5)], ['shR', 'rotation[x]', gal('shR', 0.6)],
    ['efL', 'rotation[x]', t => rot('efL', 'x') + 0.5 * Math.max(0, Math.sin(TAU * (t - 0.25)))], ['efR', 'rotation[x]', t => rot('efR', 'x') + 0.5 * Math.max(0, Math.sin(TAU * (t - 0.15)))], ['jaw', 'rotation[x]', SN(0.5, 0.2, 2)], ['tail', 'rotation[z]', SN(0, 0.5, 2)]];
  const atk = [['body', 'rotation[x]', t => -0.25 * ss(0.05, 0.5, t) * (1 - ss(0.55, 0.7, t)) + 0.18 * ss(0.62, 0.78, t) * (1 - ss(0.9, 1, t))], ['neck', 'rotation[x]', t => 0.5 - 0.3 * ss(0.05, 0.5, t) + 0.7 * ss(0.6, 0.76, t) * (1 - ss(0.9, 1, t))], ['jaw', 'rotation[x]', t => 0.3 + 0.9 * ss(0.5, 0.74, t) * (1 - ss(0.9, 1, t))]];
  const hit = [['body', 'rotation[x]', t => -0.3 * Math.sin(Math.PI * t)], ['jaw', 'rotation[x]', t => 0.4 + 0.6 * Math.sin(Math.PI * t)]];
  const death = [['body', 'position[y]', t => by - 0.4 * ss(0, 0.5, t)], ['root', 'rotation[z]', t => 1.4 * ss(0.2, 0.8, t)], ['jaw', 'rotation[x]', t => 0.4 + 0.5 * ss(0.2, 0.8, t)]];
  const anims = [clip('Idle', 1.6, idle), clip('Running', 0.4, run), clip('Punch', 0.45, atk, 20), clip('HitReact', 0.3, hit, 8), clip('Death', 1.2, death, 20)];
  return { scene: root, anims, height: H, name: 'Segugio' };
}

/* ---------------- tutti ---------------- */
export function buildBestiary() {
  const out = {};
  const defs = { mMinosse: buildMinosse, mCerbero: buildCerbero, mCaronte: buildCaronte, mFuria: buildFuria, mMinotauro: buildMinotauro, mMalebranca: buildMalebranca, mArpia: buildArpia, mAnima: buildAnima, mIngordo: buildIngordo, mSemiramide: buildSemiramide, mSegugio: buildSegugio };
  for (const [k, fn] of Object.entries(defs)) {
    try { const m = fn(); out[k] = { scene: m.scene, anims: m.anims, height: m.height, minY: 0, name: m.name }; }
    catch (e) { console.error('bestiario: errore nel modello', k, e); }
  }
  return out;
}
export { ONCE, GLOW_TEX };
