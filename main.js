import * as THREE from 'three';
import { GLTFLoader } from './lib/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from './lib/jsm/utils/SkeletonUtils.js';
import { EffectComposer } from './lib/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from './lib/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './lib/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from './lib/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from './lib/jsm/postprocessing/OutputPass.js';
import { MAPS, OVERRIDDEN } from './mapsload.js';

/* ================= utilità ================= */
const $ = id => document.getElementById(id);
const V3 = THREE.Vector3;
const R = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 6.283185; while (d < -Math.PI) d += 6.283185; return d; };
const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const rng = mulberry(1337);
const Rs = (a, b) => a + rng() * (b - a);
const col = (hex, k = 1) => new THREE.Color(hex).multiplyScalar(k);

/* ================= renderer / post ================= */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.domElement.id = 'gl';
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0e0305);
scene.fog = new THREE.FogExp2(0x120808, 0.016);
const camera = new THREE.PerspectiveCamera(34, innerWidth / innerHeight, 1, 260);
const CAM_OFF = new V3(11, 19, 11);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.8, 0.65, 0.78));
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uHurt: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime; uniform float uHurt; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
    void main(){
      vec2 c = vUv - 0.5; float r = dot(c,c);
      vec2 off = c * r * 0.012;
      vec3 col = vec3(texture2D(tDiffuse, vUv+off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv-off).b);
      col *= smoothstep(0.95, 0.16, r * 1.9);
      col = mix(col, col * vec3(1.12,0.93,0.86), 0.35);
      col += (hash(vUv*vec2(1920.,1080.)+uTime) - 0.5) * 0.03;
      col = mix(col, vec3(col.r*1.6+0.15, col.g*0.3, col.b*0.3), uHurt);
      gl_FragColor = vec4(col, 1.0);
    }`
});
composer.addPass(grade);
composer.addPass(new OutputPass());

/* ================= luci ================= */
scene.add(new THREE.HemisphereLight(0xb8a39a, 0x16100f, 0.85));
const rim = new THREE.DirectionalLight(0x5a78ff, 0.8);
rim.position.set(-18, 14, -16); scene.add(rim);
const sun = new THREE.DirectionalLight(0xffd8bc, 1.7);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
const SH = 30;
Object.assign(sun.shadow.camera, { left: -SH, right: SH, top: SH, bottom: -SH, near: 1, far: 120 });
sun.shadow.bias = -0.0006;
scene.add(sun, sun.target);
const SUN_DIR = new V3(14, 30, 8).normalize();
const sunRight = new V3().crossVectors(new V3(0, 1, 0), SUN_DIR).normalize();
const sunUp = new V3().crossVectors(SUN_DIR, sunRight).normalize();
function followSun(c) {                       // ombre ancorate alla griglia dei texel: niente sfarfallio
  const texel = (2 * SH) / 2048;
  const a = Math.round(c.dot(sunRight) / texel) * texel, b = Math.round(c.dot(sunUp) / texel) * texel;
  const d = c.dot(SUN_DIR);
  const ctr = new V3().addScaledVector(sunRight, a).addScaledVector(sunUp, b).addScaledVector(SUN_DIR, d);
  sun.target.position.copy(ctr); sun.position.copy(ctr).addScaledVector(SUN_DIR, 60);
}
const torch = new THREE.PointLight(0xff7a30, 55, 15, 2);
scene.add(torch);
const lightPool = [];                         // 5 luci riposizionate sui bracieri più vicini
for (let i = 0; i < 5; i++) { const l = new THREE.PointLight(0xff5a1a, 0, 28, 2); scene.add(l); lightPool.push(l); }

/* ================= texture ================= */
function stoneTex() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#322b29'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) {
    const v = 26 + (Math.random() * 36 | 0);
    g.fillStyle = `rgb(${v + 6},${v + 2},${v})`;
    g.fillRect(Math.random() * 512, Math.random() * 512, Math.random() * 18 + 2, Math.random() * 18 + 2);
  }
  g.strokeStyle = '#0d0606'; g.lineWidth = 5;
  for (let i = 0; i <= 512; i += 128) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.stroke();
    g.beginPath(); g.moveTo(0, i); g.lineTo(512, i); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
const STONE = stoneTex();
function stoneFor(rx, ry) { const t = STONE.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return t; }
function lavaTex() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#7a1604'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * 256, y = Math.random() * 256, r = R(8, 34);
    for (const [ox, oy] of [[0, 0], [-256, 0], [256, 0], [0, -256], [0, 256]]) {
      const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
      gr.addColorStop(0, 'rgba(255,190,60,.95)'); gr.addColorStop(.45, 'rgba(255,90,20,.6)'); gr.addColorStop(1, 'rgba(120,20,4,0)');
      g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(40, 40); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const lavaMap = lavaTex();
/* lava vera: magma che scorre (rumore a più strati), croste scure con bordi incandescenti; i valori oltre 1 accendono il bloom */
const lavaFlow = new THREE.ShaderMaterial({
  uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 } }]), fog: true,
  vertexShader: `varying vec3 vW;
    #include <fog_pars_vertex>
    void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
    }`,
  fragmentShader: `uniform float uTime; varying vec3 vW;
    #include <fog_pars_fragment>
    float h(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
    float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 5; i++) { s += a * n(p); p = p * 2.03 + vec2(1.7, 9.2); a *= .5; } return s; }
    void main(){
      vec2 p = vW.xz * 0.11; float t = uTime * 0.04;
      vec2 q = vec2(fbm(p + vec2(0., t)), fbm(p + vec2(5.2, 1.3) - vec2(t, 0.)));
      float f = fbm(p + 2.2 * q + vec2(t * .6, -t * .4));
      float cells = fbm(p * 1.7 - q * 1.4 + t * .3);
      float crust = smoothstep(0.50, 0.66, cells);
      float heat = smoothstep(0.28, 0.78, f);
      vec3 magma = mix(vec3(0.55, 0.06, 0.01), vec3(1.0, 0.38, 0.05), heat);
      magma = mix(magma, vec3(1.0, 0.8, 0.4), pow(heat, 3.0) * 0.5);
      vec3 col = mix(magma * 1.15, vec3(0.04, 0.02, 0.018), crust * 0.86);
      float edge = smoothstep(0.46, 0.54, cells) * (1. - smoothstep(0.54, 0.62, cells));
      col += vec3(1.0, 0.4, 0.08) * edge * 1.2;
      gl_FragColor = vec4(col, 1.0);
      #include <fog_fragment>
    }`
});
const abyssMat = new THREE.MeshBasicMaterial({ color: 0x171435 });
const lava = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), lavaFlow);
lava.rotation.x = -Math.PI / 2; lava.position.y = -3.2; scene.add(lava);
const HALO_TEX = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,60,20,.9)'); gr.addColorStop(0.5, 'rgba(255,40,10,.35)'); gr.addColorStop(1, 'rgba(255,20,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
})();

/* ================= mondo: camere + corridoi (avanzamento lineare) ================= */
/* Le mappe sono dati puri in maps.js. Qui si trasformano in forme calpestabili e in geometria. */
const CW = 4.6;                               // mezza larghezza dei corridoi
const CH = MAPS[1].map(d => Object.assign({}, d));
const LINKS = [];

/* ---- materiali PBR: texture CC0 di Poly Haven (assets/tex) con diffusa, normal map e rugosità ---- */
const wLoader = new THREE.TextureLoader();
const BT = {};
function useTex(file, srgb, rx, ry, cb) {
  const e = BT[file] || (BT[file] = { tex: null, cbs: [] });
  const go = t => { const c = t.clone(); c.needsUpdate = true; c.repeat.set(rx, ry); cb(c); };
  if (e.tex) return go(e.tex);
  e.cbs.push(go);
  if (!e.loading) {
    e.loading = true;
    wLoader.load('./assets/tex/' + file, t => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      e.tex = t; e.cbs.splice(0).forEach(f => f(t));
    }, undefined, () => console.warn('texture non trovata:', file));
  }
}
function pbr(name, rx, ry, o = {}) {
  const mat = new THREE.MeshStandardMaterial({ color: o.color === undefined ? 0xffffff : o.color, roughness: o.rough === undefined ? 1 : o.rough, metalness: 0 });
  mat.normalScale.set(o.ns || 1, o.ns || 1);
  useTex(`${name}_diff.jpg`, true, rx, ry, c => { mat.map = c; mat.needsUpdate = true; });
  useTex(`${name}_nor.jpg`, false, rx, ry, c => { mat.normalMap = c; mat.needsUpdate = true; });
  useTex(`${name}_rough.jpg`, false, rx, ry, c => { mat.roughnessMap = c; mat.needsUpdate = true; });
  return mat;
}
const NOISE_GLSL = `
  varying vec3 vWp;
  float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }`;
function worldPosHook(mat, key, colorCode) {                       // aggiunge la posizione nel mondo e modula il colore di base
  mat.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>' + NOISE_GLSL)
      .replace('#include <map_fragment>', '#include <map_fragment>\n' + colorCode);
  };
  mat.customProgramCacheKey = () => key;
  return mat;
}
/* pavimento: macchie di sporco e consumo a più scale, così la texture non si vede ripetere */
const tiled = mat => worldPosHook(mat, 'floorVar', `
  float n1 = vn(vWp.xz * 0.045), n2 = vn(vWp.xz * 0.21 + 7.3), n3 = vn(vWp.xz * 0.9 + 2.1);
  diffuseColor.rgb *= mix(0.6, 1.3, n1) * mix(0.84, 1.14, n2) * mix(0.93, 1.07, n3);`);
/* pareti della piattaforma: più scure in profondità, con strisce di variazione */
const shaded = mat => worldPosHook(mat, 'cliffShade', `
  float dp = smoothstep(-3.0, -0.1, vWp.y);
  diffuseColor.rgb *= mix(0.16, 1.0, dp) * mix(0.75, 1.2, vn(vec2(vWp.x * 0.3 + vWp.z * 0.3, vWp.y * 1.4)));`);
const BLOTCH = (() => {                                               // macchia morbida e irregolare per sporco e sangue
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  for (let i = 0; i < 9; i++) {
    const x = 64 + (Math.random() - 0.5) * 50, y = 64 + (Math.random() - 0.5) * 50, r = 18 + Math.random() * 30;
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(c);
})();

/* forme calpestabili = capsule {ax,az,bx,bz,w} (un disco ha a = b) */
function capT(s, x, z) { const vx = s.bx - s.ax, vz = s.bz - s.az, l2 = vx * vx + vz * vz; return l2 > 0 ? clamp(((x - s.ax) * vx + (z - s.az) * vz) / l2, 0, 1) : 0; }
function capDist(s, x, z) { const t = capT(s, x, z); return Math.hypot(x - (s.ax + (s.bx - s.ax) * t), z - (s.az + (s.bz - s.az) * t)); }
function inShapes(c, x, z, m = 0) { for (const s of c.S) if (capDist(s, x, z) <= s.w - m) return true; return false; }
function expandShapes(c) {
  const r = c.r, fwd = c.toNext !== null ? c.toNext : c.toPrev + Math.PI;     // asse verso l'uscita
  const dx = Math.sin(fwd), dz = Math.cos(fwd), px = Math.cos(fwd), pz = -Math.sin(fwd);
  const cap = (ax, az, bx, bz, w) => ({ ax: c.x + ax, az: c.z + az, bx: c.x + bx, bz: c.z + bz, w });
  const S = [];
  if (c.shapes) c.shapes.forEach(([ax, az, bx, bz, w]) => S.push(cap(ax, az, bx, bz, w)));
  else switch (c.shape || 'circle') {
    case 'lobes':                                                              // trifoglio: un lobo punta all'uscita
      S.push(cap(0, 0, 0, 0, r * 0.46));
      for (let k = 0; k < 3; k++) { const a = fwd + k * 2.0944, x = Math.sin(a) * r * 0.5, z = Math.cos(a) * r * 0.5; S.push(cap(x, z, x, z, r * 0.5)); }
      break;
    case 'cross': {                                                            // croce: un braccio punta all'uscita
      const w = r * 0.3, e = r - w;
      S.push(cap(-dx * e, -dz * e, dx * e, dz * e, w), cap(-px * r * 0.72, -pz * r * 0.72, px * r * 0.72, pz * r * 0.72, w));
      break;
    }
    case 'hall': S.push(cap(-dx * r * 0.5, -dz * r * 0.5, dx * r * 0.5, dz * r * 0.5, r * 0.5)); break;
    case 'peanut': {
      const o = r * 0.45;
      S.push(cap(dx * o, dz * o, dx * o, dz * o, r * 0.55), cap(-dx * o, -dz * o, -dx * o, -dz * o, r * 0.55), cap(-dx * o, -dz * o, dx * o, dz * o, r * 0.3));
      break;
    }
    case 'islands': {                                                          // isola centrale + 3 isole unite da ponti stretti
      S.push(cap(0, 0, 0, 0, r * 0.32));
      const spots = [];
      for (let k = 0; k < 3; k++) {
        const a = fwd + k * 2.0944, sx = Math.sin(a) * r * 0.62, sz = Math.cos(a) * r * 0.62;
        S.push(cap(sx, sz, sx, sz, r * 0.28), cap(0, 0, sx, sz, 1.6)); spots.push([sx, sz]);
      }
      if (!c.spots) c.spots = spots;
      break;
    }
    case 'ring': S.push(cap(0, 0, 0, 0, r)); if (!c.pit) c.pit = [0, 0, r * 0.3]; break;
    default: S.push(cap(0, 0, 0, 0, r));
  }
  c.S = S;
  c.pitA = c.pit ? { x: c.x + c.pit[0], z: c.z + c.pit[1], r: c.pit[2] } : null;
}
function indexWorld() {                         // (ri)costruisce indici, corridoi, forme e direzioni: serve a ogni nuovo cerchio
  LINKS.length = 0;
  CH.forEach((c, i) => { c.i = i; c.spawned = false; });
  for (let i = 0; i < CH.length - 1; i++) {
    const a = CH[i], b = CH[i + 1], dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz);
    LINKS.push({ i, a, b, dx: dx / L, dz: dz / L, L, open: false, gate: null });
  }
  CH.forEach((c, i) => {                         // direzione verso l'ingresso (camera precedente) e l'uscita
    c.toPrev = i > 0 ? Math.atan2(CH[i - 1].x - c.x, CH[i - 1].z - c.z) : Math.PI;
    c.toNext = i < CH.length - 1 ? Math.atan2(CH[i + 1].x - c.x, CH[i + 1].z - c.z) : null;
    expandShapes(c);
  });
  for (const l of LINKS) {                       // dove finisce la camera lungo il corridoio: lì sta il cancello
    let t = 0; while (t < 80 && inShapes(l.a, l.a.x + l.dx * t, l.a.z + l.dz * t, 0)) t += 0.25;
    l.ed = Math.max(2, t - 0.25);
  }
}
indexWorld();

/* area calpestabile = unione di capsule (camere + corridoi aperti) meno le buche */
function nearestWalk(pos, ra) {
  let best = Infinity, bx = pos.x, bz = pos.z, inside = false;
  scan: {
    for (const c of CH) for (const s of c.S) {
      const t = capT(s, pos.x, pos.z), qx = s.ax + (s.bx - s.ax) * t, qz = s.az + (s.bz - s.az) * t;
      const d = Math.hypot(pos.x - qx, pos.z - qz), lim = s.w - ra;
      if (d <= lim) { inside = true; break scan; }
      const dd = d - lim; if (dd < best) { best = dd; bx = qx + (pos.x - qx) / d * lim; bz = qz + (pos.z - qz) / d * lim; }
    }
    for (const l of LINKS) {
      if (!l.open) continue;
      const t = clamp((pos.x - l.a.x) * l.dx + (pos.z - l.a.z) * l.dz, 0, l.L);
      const qx = l.a.x + l.dx * t, qz = l.a.z + l.dz * t;
      const d = Math.hypot(pos.x - qx, pos.z - qz), lim = CW - ra;
      if (d <= lim) { inside = true; break scan; }
      const dd = d - lim; if (dd < best) { best = dd; bx = qx + (pos.x - qx) / d * lim; bz = qz + (pos.z - qz) / d * lim; }
    }
  }
  if (!inside) { pos.x = bx; pos.z = bz; }
  for (const c of CH) if (c.pitA) {              // la buca non si calpesta: si viene spinti fuori dal bordo
    const dx = pos.x - c.pitA.x, dz = pos.z - c.pitA.z, d = Math.hypot(dx, dz), lim = c.pitA.r + ra;
    if (d < lim) { const k = d > 1e-4 ? lim / d : 0; pos.x = c.pitA.x + (d > 1e-4 ? dx * k : lim); pos.z = c.pitA.z + (d > 1e-4 ? dz * k : 0); }
  }
}
function chamberAt(x, z) { for (const c of CH) if (inShapes(c, x, z, 0.3)) return c.i; return -1; }

const pillarMat = new THREE.MeshStandardMaterial({ color: 0x3a2a28, roughness: 0.95 });
const rockMat = new THREE.MeshStandardMaterial({ color: 0x241616, roughness: 1 });
const FLAME_MAT = new THREE.MeshBasicMaterial({ color: col(0xff7a1a, 2.4) });
const CRYSTAL_MAT = new THREE.MeshStandardMaterial({ color: 0x8aa0ff, emissive: 0x3a50ff, emissiveIntensity: 1.8, roughness: 0.25, metalness: 0.1 });
const obstacles = [], braziers = [];
function addBrazier(x, z, big = true) {
  const s = big ? 1 : 0.6;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.25 * s, 0.4 * s, 1.0 * s, 8), pillarMat);
  stem.position.set(x, 0.5 * s, z); scene.add(stem);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.9 * s, 0.5 * s, 1.0 * s, 10), pillarMat);
  bowl.position.set(x, 1.0 * s, z); bowl.castShadow = true; scene.add(bowl);
  braziers.push({ x, z, y: 3 * s, s, ph: Math.random() * 9, acc: 0, glowT: 0 });
  obstacles.push({ x, z, r: 1.0 * s });
}
function awayFromMouths(c, ang, d) {
  if (d < 0.5 * c.r) return true;
  if (Math.abs(angDiff(ang, c.toPrev)) < 0.6) return false;
  if (c.toNext !== null && Math.abs(angDiff(ang, c.toNext)) < 0.6) return false;
  return true;
}

/* bordo luminoso che segue la forma: un nastro lungo il perimetro, tranne dove una forma entra in un'altra */
function rimMesh(c) {
  const pos = [], W = 0.07, Y = 0.03;
  c.S.forEach((s, si) => {
    const pts = [], L = Math.hypot(s.bx - s.ax, s.bz - s.az), w = s.w - 0.25;
    if (L < 1e-3) for (let i = 0; i <= 96; i++) { const a = i / 96 * 6.28319; pts.push([s.ax + Math.sin(a) * w, s.az + Math.cos(a) * w]); }
    else {
      const dx = (s.bx - s.ax) / L, dz = (s.bz - s.az) / L, nx = -dz, nz = dx, base = Math.atan2(nx, nz);
      for (let u = 0; u <= L; u += 1) pts.push([s.ax + dx * u + nx * w, s.az + dz * u + nz * w]);
      for (let i = 0; i <= 24; i++) { const a = base + i / 24 * Math.PI; pts.push([s.bx + Math.sin(a) * w, s.bz + Math.cos(a) * w]); }
      for (let u = L; u >= 0; u -= 1) pts.push([s.ax + dx * u - nx * w, s.az + dz * u - nz * w]);
      for (let i = 0; i <= 24; i++) { const a = base + Math.PI + i / 24 * Math.PI; pts.push([s.ax + Math.sin(a) * w, s.az + Math.cos(a) * w]); }
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
      if (c.S.some((o, oi) => oi !== si && capDist(o, mx, mz) < o.w - 0.1)) continue;      // dentro un'altra forma: niente linea
      if (c.pitA && Math.hypot(mx - c.pitA.x, mz - c.pitA.z) < c.pitA.r + 0.3) continue;
      const ex = x1 - x0, ez = z1 - z0, el = Math.hypot(ex, ez) || 1, qx = -ez / el * W, qz = ex / el * W;
      pos.push(x0 + qx, Y, z0 + qz, x0 - qx, Y, z0 - qz, x1 + qx, Y, z1 + qz, x1 + qx, Y, z1 + qz, x0 - qx, Y, z0 - qz, x1 - qx, Y, z1 - qz);
    }
  });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: col(c.ring || 0xff3a10, 2.4), side: THREE.DoubleSide, fog: false }));
}

/* arredi */
function addProp(type, x, z, st, o = {}) {
  const add = (m, cast = true) => { m.castShadow = m.receiveShadow = cast; scene.add(m); return m; };
  switch (type) {
    case 'pillar': {
      const r = o.r || Rs(0.95, 1.35), h = o.h || Rs(2, 6.5);
      add(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.92, r, h, 14), st)).position.set(x, h / 2, z);
      add(new THREE.Mesh(new THREE.CylinderGeometry(r * 1.35, r * 1.5, 0.45, 14), st)).position.set(x, 0.22, z);
      obstacles.push({ x, z, r: r * 1.4 }); return;
    }
    case 'obelisk': {
      const h = o.h || Rs(6, 9.5), w = Rs(0.7, 1.0);
      const m = add(new THREE.Mesh(new THREE.CylinderGeometry(w * 0.28, w, h, 4), st)); m.position.set(x, h / 2, z); m.rotation.y = Math.PI / 4 + Rs(-0.2, 0.2);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(w * 0.3, 1.2, 4), new THREE.MeshStandardMaterial({ color: 0xffd0a0, emissive: 0xff8a30, emissiveIntensity: 1.6 }));
      tip.position.set(x, h + 0.5, z); tip.rotation.y = m.rotation.y; scene.add(tip);
      add(new THREE.Mesh(new THREE.BoxGeometry(w * 2.8, 0.5, w * 2.8), st)).position.set(x, 0.25, z);
      obstacles.push({ x, z, r: w * 1.5 }); return;
    }
    case 'crystal': {
      const n = 3 + Math.floor(Rs(0, 3));
      for (let k = 0; k < n; k++) {
        const h = Rs(1.6, 5), r = Rs(0.35, 0.8), a = Rs(0, 6.283), d = k ? Rs(0.5, 1.4) : 0;
        const m = add(new THREE.Mesh(new THREE.ConeGeometry(r, h, 5), CRYSTAL_MAT), false);
        m.position.set(x + Math.sin(a) * d, h / 2, z + Math.cos(a) * d); m.rotation.set(Rs(-0.3, 0.3), Rs(0, 3), Rs(-0.3, 0.3));
      }
      obstacles.push({ x, z, r: 1.4 }); return;
    }
    case 'statue': {                                                           // figura in pietra: base, veste, testa, braccia alzate
      const s = o.s || Rs(0.9, 1.25);
      add(new THREE.Mesh(new THREE.BoxGeometry(1.7 * s, 0.7, 1.7 * s), st)).position.set(x, 0.35, z);
      const body = add(new THREE.Mesh(new THREE.ConeGeometry(0.62 * s, 2.5 * s, 8), st)); body.position.set(x, 0.7 + 1.25 * s, z);
      add(new THREE.Mesh(new THREE.SphereGeometry(0.3 * s, 10, 8), st)).position.set(x, 0.7 + 2.65 * s, z);
      for (const sd of [-1, 1]) {
        const arm = add(new THREE.Mesh(new THREE.CylinderGeometry(0.09 * s, 0.12 * s, 1.5 * s, 6), st));
        arm.position.set(x + sd * 0.55 * s, 0.7 + 2.3 * s, z); arm.rotation.z = -sd * 0.55;
      }
      body.rotation.y = Rs(0, 6.28); obstacles.push({ x, z, r: 1.15 * s }); return;
    }
    case 'ruin': {                                                             // muro sbrecciato
      const L = o.L || Rs(3.6, 5.6), h = Rs(1.4, 3.3), a = o.a !== undefined ? o.a : Rs(0, 3.14);
      const m = add(new THREE.Mesh(new THREE.BoxGeometry(L, h, 0.85), st)); m.position.set(x, h / 2, z); m.rotation.y = a;
      const top = add(new THREE.Mesh(new THREE.BoxGeometry(L * 0.45, h * 0.5, 0.8), st)); top.position.set(x + Math.cos(a) * L * 0.2, h + h * 0.2, z - Math.sin(a) * L * 0.2); top.rotation.set(Rs(-0.25, 0.25), a, Rs(-0.3, 0.3));
      for (const k of [-0.34, 0, 0.34]) obstacles.push({ x: x + Math.cos(a) * L * k, z: z - Math.sin(a) * L * k, r: 0.95 });
      return;
    }
    case 'dais': {
      const r = o.r || 5;
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.08, 0.5, 40), st); m.position.set(x, 0.25, z); m.receiveShadow = true; scene.add(m);
      const rg = new THREE.Mesh(new THREE.RingGeometry(r * 0.78, r * 0.82, 64), new THREE.MeshBasicMaterial({ color: col(o.ring || 0xffb060, 2.2), side: THREE.DoubleSide, fog: false }));
      rg.rotation.x = -Math.PI / 2; rg.position.set(x, 0.52, z); scene.add(rg); return;
    }
    case 'brazier': addBrazier(x, z, o.big !== false); return;
  }
}
const PROP_R = { pillars: 1.9, ruins: 3.0, obelisks: 1.7, crystals: 1.9, statues: 1.6 };
const PROP_T = { pillars: 'pillar', ruins: 'ruin', obelisks: 'obelisk', crystals: 'crystal', statues: 'statue' };
const DENSITY = { circle: 1, lobes: 0.8, cross: 0.6, hall: 0.8, peanut: 0.85, islands: 0.4, ring: 0.8 };
function decorate(c) {
  const st = c.wall ? pbr(c.wall, 1.6, 1.6, { color: new THREE.Color(c.stone || 0x3a2a28).lerp(new THREE.Color(0xffffff), 0.55).getHex(), ns: 1.3 })
    : new THREE.MeshStandardMaterial({ color: c.stone || 0x3a2a28, roughness: 0.95 });
  const spots = (c.spots || []).map(([dx, dz]) => [c.x + dx, c.z + dz]);
  const taken = [];
  for (const p of (c.props || [])) addProp(p.t, c.x + p.x, c.z + p.z, st, p);                // arredi a mano
  const style = c.decor || 'pillars';
  const rr = PROP_R[style] || 1.8;
  const free = (x, z, mg) => inShapes(c, x, z, mg) &&
    (!c.pitA || Math.hypot(x - c.pitA.x, z - c.pitA.z) > c.pitA.r + 2.2 + rr * 0.5) &&
    !spots.some(([sx, sz]) => Math.hypot(x - sx, z - sz) < 3.6 + rr * 0.5) &&
    !taken.some(([tx, tz]) => Math.hypot(tx - x, tz - z) < rr + 1.8);
  if (style === 'avenue') {                                                              // due file di colonne lungo l'asse del percorso
    const fwd = c.toNext !== null ? c.toNext : c.toPrev + Math.PI, dx = Math.sin(fwd), dz = Math.cos(fwd), px = Math.cos(fwd), pz = -Math.sin(fwd);
    const lat = c.r * 0.36;
    for (let t = -c.r * 0.78; t <= c.r * 0.78; t += c.r * 0.26) for (const sd of [-1, 1]) {
      const x = c.x + dx * t + px * lat * sd, z = c.z + dz * t + pz * lat * sd;
      if (!inShapes(c, x, z, 1.8) || Math.hypot(x - c.x, z - c.z) < 3) continue;
      addProp('pillar', x, z, st, { h: Rs(4.5, 7), r: 1.0 }); taken.push([x, z]);
    }
  } else if (style !== 'none') {
    const n = c.n !== undefined ? c.n : Math.floor(c.r / 3.4 * (DENSITY[c.shape || 'circle'] ?? 0.7));
    let tries = 0, placed = 0;
    while (placed < n && tries++ < 260) {
      const ang = Rs(0, 6.283), d = Rs(0.12, 1.0) * c.r, x = c.x + Math.sin(ang) * d, z = c.z + Math.cos(ang) * d;
      if (!awayFromMouths(c, ang, d) || !free(x, z, 1.8)) continue;
      addProp(PROP_T[style], x, z, st); taken.push([x, z]); placed++;
    }
  }
  // bracieri sul bordo: scelti sulle forme, mai davanti agli ingressi e mai sulla buca
  let bt = 0, bp = 0; const want = c.shape === 'islands' ? 3 : 4, mine = [];
  while (bp < want && bt++ < 120) {
    const s = c.S[Math.floor(Rs(0, c.S.length))], a = Rs(0, 6.283);
    if (s.w < 3.5) continue;
    const cx = s.ax + (s.bx - s.ax) * Rs(0, 1), cz = s.az + (s.bz - s.az) * Rs(0, 1);
    const x = cx + Math.sin(a) * (s.w - 1.3), z = cz + Math.cos(a) * (s.w - 1.3);
    const ang = Math.atan2(x - c.x, z - c.z), d = Math.hypot(x - c.x, z - c.z);
    if (!inShapes(c, x, z, 0.9) || !awayFromMouths(c, ang, d + c.r * 0.5)) continue;
    if (c.pitA && Math.hypot(x - c.pitA.x, z - c.pitA.z) < c.pitA.r + 2) continue;
    if (mine.some(([mx, mz]) => Math.hypot(mx - x, mz - z) < 7) || taken.some(([tx, tz]) => Math.hypot(tx - x, tz - z) < 2.6)) continue;
    addBrazier(x, z); mine.push([x, z]); bp++;
  }
  // macerie decorative
  for (let k = 0; k < 14; k++) {
    const ang = Rs(0, 6.283), d = Rs(0.1, 1.0) * c.r, x = c.x + Math.sin(ang) * d, z = c.z + Math.cos(ang) * d;
    if (!inShapes(c, x, z, 0.6)) continue;
    const s = Rs(0.2, 0.55), m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockMat);
    m.position.set(x, s * 0.4, z); m.rotation.set(Rs(0, 3), Rs(0, 3), 0); m.castShadow = true; scene.add(m);
  }
}
/* macchie di sporco, cenere e sangue sparse sul pavimento: rompono la monotonia e raccontano il luogo */
function scatterGrime(c) {
  const geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);
  const n = Math.round(c.r * 1.3);
  for (let k = 0; k < n; k++) {
    const ang = Rs(0, 6.283), d = Math.sqrt(Rs(0, 1)) * c.r, x = c.x + Math.sin(ang) * d, z = c.z + Math.cos(ang) * d;
    if (!inShapes(c, x, z, 1.2) || (c.pitA && Math.hypot(x - c.pitA.x, z - c.pitA.z) < c.pitA.r + 1)) continue;
    const s = Rs(2.4, 7.5), blood = Rs(0, 1) < (c.abyss ? 0.06 : 0.22);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: BLOTCH, color: blood ? 0x4a0808 : c.abyss ? 0x07061a : 0x060302, transparent: true, opacity: Rs(0.22, 0.55),
      depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    m.position.set(x, 0.012 + 0.0004 * k, z); m.scale.set(s, 1, s * Rs(0.6, 1.25)); m.rotation.y = Rs(0, 6.283); scene.add(m);
  }
}
const ABYSS_MAT = (color = 0x120e2c) => new THREE.MeshBasicMaterial({ color, fog: false });
function buildWorld() {
  CH.forEach(c => {
    const ts = c.ts || 6, dark = new THREE.MeshStandardMaterial({ color: 0x1c0e0e, roughness: 1 });
    const cliffTint = c.cliffTint !== undefined ? c.cliffTint : 0x8a7a72;
    const cliffMat = (rx, ry) => c.cliff ? shaded(pbr(c.cliff, rx, ry, { color: cliffTint, ns: 1.5 })) : dark;
    const top = (rx, ry) => c.tex ? tiled(pbr(c.tex, rx, ry, { color: new THREE.Color(c.floor === undefined ? 0xffffff : c.floor).multiplyScalar(c.bright || 1.7), ns: 1.1, rough: c.wet ? 1 - 0.6 * c.wet : 1 }))
      : new THREE.MeshStandardMaterial({ map: stoneFor(rx, ry), color: c.floor || 0xffffff, roughness: 0.92 });
    c.S.forEach((s, k) => {                                                                // pavimento di ogni forma (sfalsato di poco: niente sfarfallio)
      const L = Math.hypot(s.bx - s.ax, s.bz - s.az), y = -1.5 - 0.004 * k;
      if (L < 1e-3) {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(s.w, s.w * 0.82, 3, 64), [cliffMat(Math.PI * 2 * s.w / 8, 0.4), top(s.w * 2 / ts, s.w * 2 / ts), dark]);
        m.position.set(s.ax, y, s.az); m.receiveShadow = true; scene.add(m);
      } else {
        const dx = (s.bx - s.ax) / L, dz = (s.bz - s.az) / L;
        const m = new THREE.Mesh(new THREE.BoxGeometry(s.w * 2, 3, L), [cliffMat(L / 8, 0.4), cliffMat(L / 8, 0.4), top(s.w * 2 / ts, L / ts), dark, cliffMat(s.w / 4, 0.4), cliffMat(s.w / 4, 0.4)]);
        m.position.set((s.ax + s.bx) / 2, y, (s.az + s.bz) / 2); m.rotation.y = Math.atan2(dx, dz); m.receiveShadow = true; scene.add(m);
        for (const [ex, ez] of [[s.ax, s.az], [s.bx, s.bz]]) {
          const e = new THREE.Mesh(new THREE.CylinderGeometry(s.w, s.w * 0.82, 3, 48), [cliffMat(Math.PI * 2 * s.w / 8, 0.4), top(s.w * 2 / ts, s.w * 2 / ts), dark]);
          e.position.set(ex, y, ez); e.receiveShadow = true; scene.add(e);
        }
      }
    });
    scatterGrime(c);
    scene.add(rimMesh(c));
    // anelli rituali al centro (solo se il centro è calpestabile e non c'è la buca)
    if (!c.pitA && inShapes(c, c.x, c.z, 2)) {
      const maxR = Math.min(c.r * 0.5, Math.max(...c.S.map(s => capDist(s, c.x, c.z) <= s.w ? s.w : 0)) - 0.6);
      for (const [rr, k] of [[maxR, 1.6], [maxR * 0.6, 1.2]]) {
        if (rr < 1.5) continue;
        const ring = new THREE.Mesh(new THREE.RingGeometry(rr - 0.07, rr + 0.07, 96), new THREE.MeshBasicMaterial({ color: col(c.ring || 0xff3a10, k), side: THREE.DoubleSide, fog: false }));
        ring.rotation.x = -Math.PI / 2; ring.position.set(c.x, 0.03, c.z); scene.add(ring);
      }
    }
    if (c.pitA) {                                                                          // buca: lava o abisso, con bordo luminoso
      const p = c.pitA;
      const disc = new THREE.Mesh(new THREE.CircleGeometry(p.r, 48), c.abyss ? ABYSS_MAT(c.pitColor) : lavaFlow);
      disc.rotation.x = -Math.PI / 2; disc.position.set(p.x, 0.05, p.z); scene.add(disc);
      const rim = new THREE.Mesh(new THREE.RingGeometry(p.r, p.r + 0.4, 64), new THREE.MeshBasicMaterial({ color: col(c.ring || 0xff3a10, 3), side: THREE.DoubleSide, fog: false }));
      rim.rotation.x = -Math.PI / 2; rim.position.set(p.x, 0.07, p.z); scene.add(rim);
    }
    decorate(c);
  });
  LINKS.forEach(l => {                            // corridoio: pavimento + torce + cancello
    const len = l.L;
    const pathName = l.a.path || (l.a.tex ? 'cobblestone_floor_06' : null), pts = 5;       // corridoio: ciottoli di default
    const pathMat = pathName ? tiled(pbr(pathName, CW * 2 / pts, len / pts, { color: l.a.pathTint !== undefined ? l.a.pathTint : 0xa8a09a, ns: 1.2 }))
      : new THREE.MeshStandardMaterial({ map: stoneFor(CW * 2 / 5, len / 5), color: l.a.floor || 0xffffff, roughness: 0.92 });
    const sideMat = l.a.cliff ? () => shaded(pbr(l.a.cliff, len / 8, 0.4, { color: l.a.cliffTint !== undefined ? l.a.cliffTint : 0x8a7a72, ns: 1.5 })) : () => rockMat;
    const m = new THREE.Mesh(new THREE.BoxGeometry(CW * 2, 3, len), [sideMat(), sideMat(), pathMat, rockMat, rockMat, rockMat]);
    m.position.set(l.a.x + l.dx * len / 2, -1.58, l.a.z + l.dz * len / 2);
    m.rotation.y = Math.atan2(l.dx, l.dz); m.receiveShadow = true; scene.add(m);
    for (let s = l.ed + 6; s < len - 12; s += 16) for (const side of [-1, 1]) {
      addBrazier(l.a.x + l.dx * s + -l.dz * side * (CW - 0.9), l.a.z + l.dz * s + l.dx * side * (CW - 0.9), false);
    }
    // cancello di fuoco: dove finisce la camera di partenza
    const gx = l.a.x + l.dx * (l.ed + 0.2), gz = l.a.z + l.dz * (l.ed + 0.2);
    const gc = document.createElement('canvas'); gc.width = 64; gc.height = 256;
    const g = gc.getContext('2d'); const gr = g.createLinearGradient(0, 256, 0, 0);
    gr.addColorStop(0, 'rgba(255,220,120,1)'); gr.addColorStop(0.4, 'rgba(255,90,20,.8)'); gr.addColorStop(1, 'rgba(255,40,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,200,${R(0.05, 0.25)})`; g.fillRect(R(0, 60), R(0, 256), R(1, 4), R(10, 60)); }
    const gt = new THREE.CanvasTexture(gc); gt.wrapS = THREE.RepeatWrapping; gt.repeat.set(3, 1);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(CW * 2, 7), new THREE.MeshBasicMaterial({
      map: gt, color: col(0xffffff, 1.8), transparent: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    wall.position.set(gx, 3.5, gz); wall.rotation.y = Math.atan2(l.dx, l.dz);
    const gate = new THREE.Group(); gate.add(wall); gate.userData.tex = gt;
    for (const side of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 7.5, 8), pillarMat);
      p.position.set(gx + -l.dz * side * CW, 3.7, gz + l.dx * side * CW); p.castShadow = true; gate.add(p);
    }
    scene.add(gate); l.gate = gate; l.gx = gx; l.gz = gz;
  });
}
buildWorld();

/* ================= effetti: emettitori di sprite (texture Kenney CC0) ================= */
const texLoader = new THREE.TextureLoader();
const FXT = {};
const ftex = n => FXT[n] || (FXT[n] = texLoader.load('./assets/fx/' + n + '.png'));
const fxScale = { value: 1 };
function setFxScale() { fxScale.value = innerHeight * renderer.getPixelRatio() / (2 * Math.tan(camera.fov * Math.PI / 360)); }
setFxScale();

class Emitter {
  constructor(tex, additive, max, bounce = false) {
    this.max = max; this.i = 0; this.bounce = bounce;
    const f = n => new Float32Array(max * n);
    this.pos = f(3).fill(-999); this.vel = f(3); this.colA = f(4); this.base = f(4); this.size = f(1);
    this.s0 = f(1); this.s1 = f(1); this.rot = f(1); this.rv = f(1); this.life = f(1); this.maxLife = f(1).fill(1);
    this.grav = f(1); this.drag = f(1);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.colA, 4));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    g.setAttribute('aRot', new THREE.BufferAttribute(this.rot, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: ftex(tex) }, uScale: fxScale, uAdd: { value: additive ? 1 : 0 } },
      vertexShader: `attribute vec4 aColor; attribute float aSize; attribute float aRot; uniform float uScale;
        varying vec4 vColor; varying float vRot;
        void main(){ vColor = aColor; vRot = aRot; vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = min(aSize * uScale / max(-mv.z, 0.1), 600.0); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D map; uniform float uAdd; varying vec4 vColor; varying float vRot;
        void main(){ vec2 c = vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y) - 0.5;
          float s = sin(vRot), co = cos(vRot); c = vec2(co*c.x - s*c.y, s*c.x + co*c.y) + 0.5;
          float m = texture2D(map, c).r;
          if (uAdd > 0.5) gl_FragColor = vec4(vColor.rgb * m * 0.5, vColor.a);
          else gl_FragColor = vec4(vColor.rgb, m * vColor.a); }`,
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending
    });
    this.points = new THREE.Points(g, mat); this.points.frustumCulled = false; scene.add(this.points);
    this.geo = g;
  }
  spawn(x, y, z, vx, vy, vz, life, s0, s1, r, g, b, a, rv = 0, grav = 0, drag = 0) {
    const i = this.i++ % this.max, k = i * 3, c = i * 4;
    this.pos[k] = x; this.pos[k + 1] = y; this.pos[k + 2] = z; this.vel[k] = vx; this.vel[k + 1] = vy; this.vel[k + 2] = vz;
    this.life[i] = this.maxLife[i] = life; this.s0[i] = s0; this.s1[i] = s1; this.size[i] = s0;
    this.base[c] = r; this.base[c + 1] = g; this.base[c + 2] = b; this.base[c + 3] = a;
    this.rot[i] = Math.random() * 6.283; this.rv[i] = rv; this.grav[i] = grav; this.drag[i] = drag;
  }
  update(dt) {
    for (let i = 0; i < this.max; i++) {
      const k = i * 3, c = i * 4;
      if (this.life[i] <= 0) { if (this.size[i] !== 0) { this.size[i] = 0; this.pos[k + 1] = -999; } continue; }
      this.life[i] -= dt;
      const t = 1 - this.life[i] / this.maxLife[i];
      if (this.drag[i]) { const d = Math.exp(-this.drag[i] * dt); this.vel[k] *= d; this.vel[k + 1] *= d; this.vel[k + 2] *= d; }
      this.vel[k + 1] -= this.grav[i] * dt;
      this.pos[k] += this.vel[k] * dt; this.pos[k + 1] += this.vel[k + 1] * dt; this.pos[k + 2] += this.vel[k + 2] * dt;
      if (this.bounce && this.pos[k + 1] < 0.02) { this.pos[k + 1] = 0.02; this.vel[k + 1] *= -0.3; this.vel[k] *= 0.6; this.vel[k + 2] *= 0.6; }
      this.size[i] = this.s0[i] + (this.s1[i] - this.s0[i]) * t; this.rot[i] += this.rv[i] * dt;
      const env = Math.min(1, t / 0.08) * Math.min(1, (1 - t) / 0.5);
      this.colA[c] = this.base[c]; this.colA[c + 1] = this.base[c + 1]; this.colA[c + 2] = this.base[c + 2]; this.colA[c + 3] = this.base[c + 3] * env;
    }
    const a = this.geo.attributes;
    a.position.needsUpdate = a.aColor.needsUpdate = a.aSize.needsUpdate = a.aRot.needsUpdate = true;
  }
}
const fxSpark = new Emitter('spark_01', true, 1000, true);   // scintille, braci, riflessi
const fxFire = new Emitter('fire_01', true, 500);            // sbuffi di fuoco
const fxFlame = new Emitter('flame_05', true, 500);          // fiamme alte dei bracieri
const fxSmoke = new Emitter('smoke_08', false, 320);         // fumo scuro
const fxGlow = new Emitter('circle_05', true, 200);          // bagliori morbidi
let pIdx = 0; const tmpC = new THREE.Color();
/* compatibilità: emit() = scintille colorate */
function emit(x, y, z, n, color, spd = 5, up = 3, life = 0.6) {
  tmpC.set(color);
  for (let k = 0; k < n; k++) {
    const a = Math.random() * 6.283, s = R(0.3, 1) * spd;
    fxSpark.spawn(x, y, z, Math.cos(a) * s, R(0.2, 1) * up, Math.sin(a) * s, life * R(0.6, 1.3), R(0.35, 0.6), 0.05,
      tmpC.r * 2.2, tmpC.g * 2.2, tmpC.b * 2.2, 1, R(-8, 8), 9, 0.4);
  }
}
function fireBurst(x, y, z, n = 10, s = 1, color = 0xff7a20, smoke = true) {
  tmpC.set(color);
  for (let k = 0; k < n; k++) {
    const a = Math.random() * 6.283, sp = R(0.3, 1.6) * s;
    fxFire.spawn(x + R(-0.2, 0.2) * s, y, z + R(-0.2, 0.2) * s, Math.cos(a) * sp, R(1.5, 4) * s, Math.sin(a) * sp, R(0.45, 0.9),
      R(1.0, 1.7) * s, 0.35 * s, tmpC.r * 1.8, tmpC.g * 1.8, tmpC.b * 1.8, 0.85, R(-2, 2), -1.2, 1.2);
  }
  if (smoke) for (let k = 0; k < Math.ceil(n / 3); k++) {
    const a = Math.random() * 6.283, sp = R(0.2, 1) * s;
    fxSmoke.spawn(x, y + 0.3, z, Math.cos(a) * sp, R(1, 2.4) * s, Math.sin(a) * sp, R(1.0, 1.8), R(0.8, 1.3) * s, R(2.4, 3.8) * s, 0.1, 0.085, 0.08, 0.55, R(-0.6, 0.6), -0.6, 1.5);
  }
}
function flash(x, y, z, size, color, life = 0.18, a = 0.5) {
  tmpC.set(color); fxGlow.spawn(x, y, z, 0, 0, 0, life, size * 0.6, size * 0.9, tmpC.r * 1.1, tmpC.g * 1.1, tmpC.b * 1.1, a);
}
function updateParticles(dt) { fxSpark.update(dt); fxFire.update(dt); fxFlame.update(dt); fxSmoke.update(dt); fxGlow.update(dt); }
function addRing(x, z, tex, color, r, dur, opts = {}) {            // sagome di terra animate (rune, onde d'urto, vortici)
  const geo = new THREE.PlaneGeometry(2, 2); geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: ftex(tex), color: col(color, opts.k || 2.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  m.position.set(x, opts.y || 0.12, z); scene.add(m);
  G.rings.push({ m, t: 0, dur, r, follow: !!opts.follow, spin: opts.spin || 0, grow: opts.grow !== false });
}

/* ================= audio ================= */
let actx;
function tone(f, d, type = 'square', v = 0.08, slide = 0) {
  if (!actx) return;
  const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime;
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
  o.connect(g).connect(actx.destination); o.start(t); o.stop(t + d);
}
const sfx = {
  slash: () => tone(500, 0.16, 'sawtooth', 0.07, -380),
  hit: () => tone(140, 0.12, 'square', 0.1, -80),
  crit: () => { tone(700, 0.1, 'square', 0.08, -300); tone(120, 0.2, 'sawtooth', 0.1, -60); },
  fire: () => tone(220, 0.35, 'sawtooth', 0.07, 500),
  hurt: () => tone(90, 0.3, 'sawtooth', 0.14, -40),
  die: () => tone(260, 0.3, 'triangle', 0.09, -200),
  dash: () => tone(300, 0.14, 'triangle', 0.06, 300),
  ok: () => { tone(520, 0.2, 'triangle', 0.1); setTimeout(() => tone(780, 0.3, 'triangle', 0.1), 120); },
  bad: () => tone(110, 0.5, 'sawtooth', 0.12, -50),
  loot: () => { tone(880, 0.12, 'triangle', 0.08); setTimeout(() => tone(1320, 0.2, 'triangle', 0.08), 90); },
  rare: () => { [660, 880, 1100, 1480].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'triangle', 0.09), i * 90)); },
  level: () => { [440, 550, 660, 880].forEach((f, i) => setTimeout(() => tone(f, 0.35, 'triangle', 0.1), i * 110)); },
  nova: () => tone(160, 0.5, 'sawtooth', 0.12, 400),
  boom: () => tone(70, 0.6, 'sawtooth', 0.18, -30),
  potion: () => tone(400, 0.3, 'sine', 0.1, 500),
  gate: () => { tone(90, 0.8, 'sawtooth', 0.14, 60); setTimeout(() => sfx.ok(), 300); }
};

/* ================= modelli e attori ================= */
const loader = new GLTFLoader();
const models = {};
async function loadModel(name, url) {
  const gltf = await loader.loadAsync(url);
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse(o => { if (o.isSkinnedMesh) o.skeleton.update(); });
  const box = new THREE.Box3().setFromObject(gltf.scene, true);
  models[name] = { scene: gltf.scene, anims: gltf.animations, height: box.max.y - box.min.y, minY: box.min.y };
}
function makeActor(src, h, opts = {}) {
  const root = new THREE.Group();
  const model = SkeletonUtils.clone(src.scene);
  const s = h / src.height;
  model.scale.setScalar(s); model.position.y = -src.minY * s; model.rotation.y = opts.yaw || 0;
  root.add(model);
  const mats = [];
  model.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true; o.frustumCulled = false;
    o.material = o.material.clone();
    if (opts.tint != null) {
      o.material.color.set(opts.tint);
      if (o.material.emissive) o.material.emissive.set(opts.emis != null ? opts.emis : opts.tint).multiplyScalar(opts.emisK != null ? opts.emisK : 0.18);
    } else if (opts.emis != null && o.material.emissive) {      // modelli veri: niente tinta, solo un alone emissivo
      o.material.emissive.set(opts.emis).multiplyScalar(opts.emisK != null ? opts.emisK : 0.15);
    }
    if (o.material.emissive) { o.userData.baseEm = o.material.emissive.clone(); mats.push(o.material); }
  });
  const mixer = new THREE.AnimationMixer(model);
  const act = {};
  src.anims.forEach(c => act[c.name] = mixer.clipAction(c));
  if (act.Run && !act.Running) act.Running = act.Run;           // nomi clip diversi tra i pacchetti
  return { root, model, mixer, act, mats, cur: null, wings: [] };
}
function play(a, name, fade = 0.18, once = false) {
  if (a.cur === name) return;
  const n = a.act[name]; if (!n) return;
  const prev = a.cur ? a.act[a.cur] : null;
  n.reset(); n.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); n.clampWhenFinished = once;
  n.play();
  if (prev) prev.crossFadeTo(n, fade, false);
  a.cur = name;
}
function flashActor(a, k) { for (const m of a.mats) m.emissive.setRGB(k, k * 0.85, k * 0.7); }

const HORN_MAT = new THREE.MeshStandardMaterial({ color: 0x1c0c08, roughness: 0.45, metalness: 0.3, emissive: 0x5a1200 });
const EYE_MAT = new THREE.MeshBasicMaterial({ color: col(0xffe040, 4) });
function addHorns(act, k) {
  let head = null;
  act.model.traverse(o => { if (!head && o.isBone && /head/i.test(o.name)) head = o; });
  if (!head) return;
  act.root.updateMatrixWorld(true);
  const ws = new V3(); head.getWorldScale(ws);
  const hq = new THREE.Quaternion(), rq = new THREE.Quaternion();
  head.getWorldQuaternion(hq); act.root.getWorldQuaternion(rq);
  const g = new THREE.Group(); g.scale.setScalar(1 / ws.x); g.quaternion.copy(hq).invert().multiply(rq);
  for (const s of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.11 * k, 0.85 * k, 8), HORN_MAT);
    horn.position.set(s * 0.26 * k, 0.5 * k, 0); horn.rotation.z = -s * 0.6; horn.rotation.x = -0.3; horn.castShadow = true;
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045 * k, 8, 6), EYE_MAT);
    eye.position.set(s * 0.1 * k, 0.26 * k, 0.2 * k);
    g.add(horn, eye);
  }
  head.add(g);
}
const WING_GEO = (() => {
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.lineTo(0.35, 0.7); s.lineTo(1.0, 0.9); s.lineTo(0.82, 0.42);
  s.lineTo(0.7, 0.58); s.lineTo(0.58, 0.18); s.lineTo(0.42, 0.3); s.lineTo(0.3, -0.1); s.closePath();
  return new THREE.ShapeGeometry(s);
})();
const WING_MAT = new THREE.MeshStandardMaterial({ color: 0x3a0707, emissive: 0x2a0300, roughness: 0.8, side: THREE.DoubleSide });
function addWings(act, h) {
  for (const s of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(s * 0.1 * h, 0.62 * h, -0.22 * h);
    const w = new THREE.Mesh(WING_GEO, WING_MAT); w.scale.set(s * 0.95 * h, 0.95 * h, 1); w.castShadow = true;
    piv.add(w); act.root.add(piv); act.wings.push({ piv, s });
  }
}

/* ================= stato ================= */
const keys = {};
const mouse = { x: innerWidth / 2, y: innerHeight / 2, down: false, right: false };
const G = { state: 'loading', kills: 0, enemies: [], shots: [], arcs: [], tele: [], loot: [], rings: [], time: 0, msgT: 0,
  stage: 0, reached: 0, pedestals: [], enigma: null, bossDead: false, portal: null, minimapT: 0, lightT: 0 };
const P = {
  level: 1, xp: 0, hp: 100, max: 100, fede: 20, maxF: 100, potions: 3, potCd: 0,
  pos: new V3(0, 0, 3), vel: new V3(), face: 0, aim: 0, aimPt: new V3(),
  atkCd: 0, atkT: 0, fireCd: 0, dashCd: 0, dashT: 0, dashDir: new V3(), inv: 0, dead: false,
  spinT: 0, spinHit: 0, turbCd: 0, novaCd: 0, actor: null, sword: null, ch: 0, checkpoint: new V3(0, 0, 3),
  gear: { weapon: null, armor: null, amulet: null }, stats: { wdmg: 0, hp: 0, dr: 0, crit: 0.05, spd: 0 }
};
window.__G = G; window.__P = P; window.__THREE = THREE; window.__CH = CH; window.__LINKS = LINKS;

const TYPES = {
  imp:   { model: 'mDemon', name: 'Dannato', hp: 20, speed: 5.0, h: 1.5, r: 0.55, dmg: 8, tint: 0xa8301a, reach: 1.5, wind: 0.45, xp: 8, poise: 0.2 },
  brute: { model: 'mOrcSkull', name: 'Bruto Infernale', hp: 80, speed: 3.2, h: 2.7, r: 0.95, dmg: 17, tint: 0x40100c, reach: 2.2, wind: 0.65, xp: 26, poise: 0.1 },
  elite: { model: 'mBlueDemon', name: 'Campione Infernale', hp: 300, speed: 3.9, h: 3.5, r: 1.15, dmg: 22, tint: 0x7a4010, emis: 0xff8a20, emisK: 0.35, glow: 0xffb040,
           reach: 2.7, wind: 0.6, xp: 95, poise: 0.06, elite: true, slam: 7, slamR: 3.8, slamD: 18 },
  boss:  { model: 'mDemon', tintReal: 0x8a50c8, name: 'MINOSSE, GIUDICE DELLE ANIME', hp: 800, speed: 3.5, h: 5.8, r: 1.9, dmg: 20, tint: 0x2a0a30, emis: 0x8a20c0, emisK: 0.3, glow: 0xc060ff,
           reach: 3.7, wind: 0.85, xp: 500, poise: 0, boss: true, slam: 5, slamR: 5.5, slamD: 18 }
};
const PACKS = { 0: { imp: 5 }, 1: { imp: 9, brute: 3 }, 2: { imp: 6, brute: 1 }, 3: { imp: 9, brute: 3, elite: 1 }, 4: { boss: 1 } };

/* ================= HUD ================= */
function say(text, ms = 4500) { const m = $('msg'); m.textContent = text; m.style.opacity = 1; G.msgT = ms / 1000; }
let bannerTO;
function banner(t, s) {
  $('bt').textContent = t; $('bs').textContent = s || ''; $('banner').style.opacity = 1;
  clearTimeout(bannerTO); bannerTO = setTimeout(() => $('banner').style.opacity = 0, 3200);
}
function toast(html, color = '#888', ms = 7000) {
  const t = document.createElement('div'); t.className = 'toast'; t.style.borderColor = color; t.innerHTML = html;
  const box = $('toasts'); box.appendChild(t);
  while (box.children.length > 5) box.removeChild(box.firstChild);
  setTimeout(() => { t.style.opacity = 0; setTimeout(() => t.remove(), 900); }, ms);
}
let hurtK = 0;
const hurtFlash = () => { hurtK = 0.55; };
const dnPool = [];
function popup(x, y, z, text, cls = '') {
  const d = document.createElement('div'); d.className = 'dn ' + cls; d.textContent = text;
  $('dmg').appendChild(d);
  dnPool.push({ d, p: new V3(x + R(-0.3, 0.3), y, z + R(-0.3, 0.3)), t: 0, life: cls === 'crit' ? 1.1 : 0.85 });
  if (dnPool.length > 40) { const o = dnPool.shift(); o.d.remove(); }
}
const _v = new V3();
function toScreen(p) {
  _v.copy(p).project(camera);
  return { x: (_v.x * 0.5 + 0.5) * innerWidth, y: (-_v.y * 0.5 + 0.5) * innerHeight, ok: _v.z < 1 };
}
function updateOverlays(dt) {
  for (let i = dnPool.length - 1; i >= 0; i--) {
    const o = dnPool[i]; o.t += dt; o.p.y += dt * 1.6;
    const s = toScreen(o.p);
    o.d.style.left = s.x + 'px'; o.d.style.top = s.y + 'px'; o.d.style.opacity = clamp(1.6 - o.t / o.life * 1.6, 0, 1);
    if (o.t > o.life) { o.d.remove(); dnPool.splice(i, 1); }
  }
  for (const e of G.enemies) {
    if (!e.bar) continue;
    e.barT = Math.max(0, e.barT - dt);
    const show = !e.dead && !e.T.boss && (e.barT > 0 || (e.T.elite && e.state !== 'idle'));
    e.bar.style.display = show ? 'block' : 'none';
    if (show) {
      const s = toScreen(_v.set(e.pos.x, e.T.h + 0.5, e.pos.z));
      e.bar.style.left = s.x + 'px'; e.bar.style.top = s.y + 'px'; e.bar.firstChild.style.width = Math.max(0, e.hp / e.T.hp * 100) + '%';
    }
  }
}
function xpNeed(l) { return Math.round(40 * Math.pow(l, 1.45)); }
function updateHUD() {
  $('hpfill').style.height = clamp(P.hp / P.max, 0, 1) * 100 + '%';
  $('resfill').style.height = clamp(P.fede / P.maxF, 0, 1) * 100 + '%';
  $('hptxt').textContent = Math.ceil(Math.max(0, P.hp)) + '/' + P.max;
  $('restxt').textContent = Math.floor(P.fede);
  $('xp').style.width = clamp(P.xp / xpNeed(P.level), 0, 1) * 100 + '%';
  $('lvl').textContent = 'Lv ' + P.level;
  const cd = (id, v, max, cost) => {
    const s = $(id); s.lastChild.style.height = clamp(v / max, 0, 1) * 100 + '%';
    s.classList.toggle('nofede', cost > P.fede);
  };
  cd('s0', P.atkCd, 0.38, 0); cd('s1', P.fireCd, 1.0, 12); cd('s2', P.turbCd, 2.0, 30);
  cd('s3', P.novaCd, 7.0, 25); cd('s4', P.dashCd, 0.9, 0); cd('s5', P.potCd, 4.0, 0);
  $('pcnt').textContent = P.potions;
}
function objectiveText() {
  const st = G.stage, alive = G.enemies.filter(e => !e.dead && e.ch === st).length;
  if (st >= CH.length - 1) return G.bossDead ? 'Entra nel portale' : 'Sconfiggi ' + CINFO().bossShort;
  if (LINKS[st].open) return 'Prosegui nel corridoio →';
  if (alive > 0) return `Abbatti i dannati (${alive} rimasti)`;
  if (st === 2) return G.enigma && G.enigma.started ? 'Risolvi l’enigma di Virgilio (H: aiuto)' : 'Abbatti i dannati';
  return 'Apri il varco';
}
function drawMinimap() {
  const c = $('mm'), g = c.getContext('2d'), W = c.width, S = 0.9;
  g.clearRect(0, 0, W, W);
  g.fillStyle = '#0a0405'; g.fillRect(0, 0, W, W);
  g.save(); g.translate(W / 2, W / 2); g.scale(S, S);
  // vista ruotata come la camera isometrica: la direzione "su" dello schermo è (-1,0,-1)
  const px = P.pos.x, pz = P.pos.z;
  const proj = (x, z) => { const dx = x - px, dz = z - pz; return [(dx - dz) * 0.7071 * 0.9, (dx + dz) * 0.7071 * 0.9]; };
  g.lineCap = 'round';
  g.strokeStyle = '#4a3a34'; g.fillStyle = '#4a3a34';
  for (const l of LINKS) {
    const [x1, y1] = proj(l.a.x, l.a.z), [x2, y2] = proj(l.b.x, l.b.z);
    g.lineWidth = CW * 2 * 0.9 * (l.open ? 1 : 1); g.strokeStyle = l.open ? '#5a463e' : '#2c211f';
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
  }
  for (const c2 of CH) {
    g.strokeStyle = g.fillStyle = c2.i <= G.reached ? '#5a463e' : '#2c211f'; g.lineCap = 'round';
    for (const s of c2.S) {                                                      // ogni camera ha la sua forma
      const [ax, ay] = proj(s.ax, s.az), [bx, by] = proj(s.bx, s.bz);
      g.lineWidth = s.w * 1.8; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
      if (ax === bx && ay === by) { g.beginPath(); g.arc(ax, ay, s.w * 0.9, 0, 6.283); g.fill(); }
    }
    if (c2.pitA) { const [qx, qy] = proj(c2.pitA.x, c2.pitA.z); g.fillStyle = '#0a0405'; g.beginPath(); g.arc(qx, qy, c2.pitA.r * 0.9, 0, 6.283); g.fill(); }
  }
  for (const l of LINKS) if (!l.open) { const [x, y] = proj(l.gx, l.gz); g.fillStyle = '#ff4a20'; g.fillRect(x - 5, y - 5, 10, 10); }
  for (const e of G.enemies) if (!e.dead) { const [x, y] = proj(e.pos.x, e.pos.z); g.fillStyle = e.T.boss ? '#c060ff' : e.T.elite ? '#ffb040' : '#ff3a2a'; g.beginPath(); g.arc(x, y, e.T.boss ? 5 : 2.6, 0, 6.283); g.fill(); }
  for (const l of G.loot) { const [x, y] = proj(l.x, l.z); g.fillStyle = '#' + l.color.toString(16).padStart(6, '0'); g.fillRect(x - 2, y - 2, 4, 4); }
  if (window.__bottino && window.__bottino.drawMini) window.__bottino.drawMini(g, proj);      // casse sulla minimappa
  g.restore();
  g.fillStyle = '#ffe0a0'; g.beginPath(); g.moveTo(W / 2, W / 2 - 6); g.lineTo(W / 2 + 5, W / 2 + 5); g.lineTo(W / 2 - 5, W / 2 + 5); g.closePath(); g.fill();
}

/* ================= oggetti (loot) ================= */
const RAR = [
  { n: 'Comune', c: 0xdddddd, m: 1, w: 55 }, { n: 'Magico', c: 0x5a8aff, m: 1.35, w: 28 },
  { n: 'Raro', c: 0xffe04a, m: 1.8, w: 13 }, { n: 'Leggendario', c: 0xff7a1a, m: 2.6, w: 4 }
];
const NAMES = {
  weapon: ['Spada di Ciacco', 'Lama del Limbo', 'Brando di Francesca', 'Spada del Veltro', 'Fendente di Farinata'],
  armor: ['Veste del Pellegrino', 'Cotta di Catone', 'Corazza di Stige', 'Manto di Brunetto', 'Usbergo del Dannato'],
  amulet: ['Sigillo di Virgilio', 'Amuleto di Beatrice', 'Talismano dei Saggi', 'Medaglia di Stazio', 'Monile di Matelda']
};
const LEGEND = { weapon: 'Lama di Beatrice', armor: 'Mantello di Virgilio', amulet: 'Occhio di Lucifero' };
function genItem(ilvl, bonus = 0, forceSlot = null) {
  let roll = Math.min(99.9, Math.random() * 100 + bonus * 18), ri = 0, acc = 0;
  for (let i = 0; i < RAR.length; i++) { acc += RAR[i].w; if (roll < acc) { ri = i; break; } ri = i; }
  ri = clamp(ri, 0, 3);
  const slot = forceSlot || ['weapon', 'armor', 'amulet'][Math.floor(Math.random() * 3)], r = RAR[ri], k = r.m * (0.85 + Math.random() * 0.3);
  const it = { slot, ri, color: r.c, rarity: r.n, name: ri === 3 ? LEGEND[slot] : NAMES[slot][Math.floor(Math.random() * 5)], ilvl };
  if (slot === 'weapon') { it.wdmg = Math.round((2 + ilvl * 0.9) * k); if (ri >= 2) it.crit = +(0.03 * k).toFixed(3); }
  if (slot === 'armor') { it.hp = Math.round((8 + ilvl * 4) * k); it.dr = +Math.min(0.5, 0.025 * k * (1 + ilvl * 0.08)).toFixed(3); }
  if (slot === 'amulet') { it.crit = +(0.02 * k).toFixed(3); it.spd = +(0.02 * k).toFixed(3); if (ri >= 2) it.hp = Math.round(8 * ilvl * 0.5 * k); }
  return it;
}
const itemScore = it => !it ? 0 : (it.wdmg || 0) * 2 + (it.hp || 0) / 8 + (it.dr || 0) * 120 + (it.crit || 0) * 200 + (it.spd || 0) * 120;
function itemLines(it) {
  const L = [];
  if (it.wdmg) L.push(`+${it.wdmg} danno`);
  if (it.hp) L.push(`+${it.hp} vita`);
  if (it.dr) L.push(`${(it.dr * 100).toFixed(1)}% riduzione danni`);
  if (it.crit) L.push(`+${(it.crit * 100).toFixed(1)}% critico`);
  if (it.spd) L.push(`+${(it.spd * 100).toFixed(1)}% velocità`);
  return L.join(' · ');
}
const hexs = c => '#' + c.toString(16).padStart(6, '0');
function recomputeStats() {
  const s = { wdmg: 0, hp: 0, dr: 0, crit: 0.05, spd: 0 };
  for (const it of Object.values(P.gear)) if (it) { s.wdmg += it.wdmg || 0; s.hp += it.hp || 0; s.dr += it.dr || 0; s.crit += it.crit || 0; s.spd += it.spd || 0; }
  s.dr = Math.min(0.6, s.dr); P.stats = s;
  const oldMax = P.max; P.max = 100 + (P.level - 1) * 14 + s.hp; P.hp = Math.min(P.max, P.hp + Math.max(0, P.max - oldMax));
  renderInv();
}
function renderInv() {
  const s = P.stats, row = (lab, it) => `<p><b>${lab}:</b> ` + (it ? `<span style="color:${hexs(it.color)}">${it.name}</span> <small>(${it.rarity})</small><br><small>${itemLines(it)}</small>` : '<small>— vuoto —</small>') + '</p>';
  $('inv').innerHTML = `<h3>DANTE — Livello ${P.level}</h3>${row('Arma', P.gear.weapon)}${row('Armatura', P.gear.armor)}${row('Amuleto', P.gear.amulet)}
    <p><small>Danno base ${(6 + s.wdmg).toFixed(0)} · Critico ${(s.crit * 100).toFixed(1)}% · Riduzione ${(s.dr * 100).toFixed(1)}% · Velocità +${(s.spd * 100).toFixed(1)}%<br>Vita ${P.max} · Pozioni ${P.potions}<br>(Tab per chiudere)</small></p>`;
}
function dropItem(x, z, ilvl, bonus, slot = null) {
  const it = genItem(ilvl, bonus, slot);
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), new THREE.MeshBasicMaterial({ color: col(it.color, 2.5) }));
  gem.position.y = 0.9; g.add(gem);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.1, it.ri >= 2 ? 11 : 7, 8, 1, true), new THREE.MeshBasicMaterial({
    color: col(it.color, 1.8), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.y = it.ri >= 2 ? 5.5 : 3.5; g.add(beam);
  scene.add(g); G.loot.push({ kind: 'item', item: it, g, gem, x, z, color: it.color, t: 0 });
  emit(x, 0.6, z, 14 + it.ri * 8, it.color, 3, 5, 0.8);
  if (it.ri >= 2) sfx.rare();
}
function dropPotion(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const fl = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), new THREE.MeshBasicMaterial({ color: col(0xff2a2a, 2.2) }));
  fl.position.y = 0.7; g.add(fl);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.12, 3, 8, 1, true), new THREE.MeshBasicMaterial({
    color: col(0xff2020, 1.6), transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.y = 1.7; g.add(beam);
  scene.add(g); G.loot.push({ kind: 'potion', g, gem: fl, x, z, color: 0xff3030, t: 0 });
}
function pickup(l) {
  scene.remove(l.g); l.dead = true;
  if (l.kind === 'potion') { P.potions = Math.min(5, P.potions + 1); sfx.loot(); popup(P.pos.x, 2, P.pos.z, '+1 Pozione', 'heal'); return; }
  const it = l.item, cur = P.gear[it.slot];
  sfx.loot();
  if (window.__bottino && window.__bottino.take(it, cur)) return;     // zaino e potenziamenti: bottino.js
  if (itemScore(it) > itemScore(cur)) {
    P.gear[it.slot] = it; recomputeStats();
    toast(`<b style="color:${hexs(it.color)}">${it.name}</b> <small>${it.rarity} · Equipaggiato</small><small>${itemLines(it)}</small>`, hexs(it.color));
  } else {
    toast(`<span style="color:${hexs(it.color)}">${it.name}</span> <small>${it.rarity} · peggiore dell’equipaggiato, scartato</small>`, '#555', 4000);
  }
}
function addXp(n) {
  P.xp += n;
  while (P.xp >= xpNeed(P.level)) {
    P.xp -= xpNeed(P.level); P.level++;
    P.hp = P.max = 100 + (P.level - 1) * 14 + P.stats.hp; sfx.level();
    banner('LIVELLO ' + P.level, 'per correr miglior acque alza le vele');
    emit(P.pos.x, 1, P.pos.z, 80, 0xffd070, 8, 9, 1.3);
    addRing(P.pos.x, P.pos.z, 'magic_02', 0xffd070, 9, 1.1, { k: 3, y: 0.1, spin: 1.5 });
    addRing(P.pos.x, P.pos.z, 'circle_03', 0xfff0b0, 9, 0.8, { k: 3, y: 0.13 });
    flash(P.pos.x, 1.5, P.pos.z, 10, 0xffd070, 0.5);
    recomputeStats();
  }
}

/* ================= giocatore ================= */
function buildSword() {
  const piv = new THREE.Group();
  const flame = new THREE.MeshStandardMaterial({ color: 0xffb060, emissive: 0xff5a10, emissiveIntensity: 3.2, metalness: 0.6, roughness: 0.3 });
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.04, 1.5), flame); blade.position.z = 0.95; blade.castShadow = true;
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.08, 0.1), new THREE.MeshStandardMaterial({ color: 0x8a5a20, metalness: 0.8, roughness: 0.4 })); guard.position.z = 0.2;
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 8), new THREE.MeshStandardMaterial({ color: 0x2a1408 }));
  grip.rotation.x = Math.PI / 2; grip.position.z = 0.03;
  piv.add(blade, guard, grip); return piv;
}
function initPlayer() {
  P.actor = makeActor(models.dante, 1.8);
  scene.add(P.actor.root); play(P.actor, 'Idle');
  P.sword = buildSword(); P.sword.position.set(0.38, 1.05, 0.25); P.actor.root.add(P.sword);
  const cloak = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.4, 10, 1, true), new THREE.MeshStandardMaterial({ color: 0x8a1210, roughness: 0.9, side: THREE.DoubleSide }));
  cloak.position.set(0, 0.95, -0.2); cloak.rotation.x = 0.12; cloak.castShadow = true; P.actor.root.add(cloak);
  const wreath = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 6, 14), new THREE.MeshStandardMaterial({ color: 0x3a7a2a, roughness: 0.8 }));
  wreath.rotation.x = Math.PI / 2; wreath.position.set(0, 1.78, 0.02); P.actor.root.add(wreath);
  recomputeStats(); P.hp = P.max;
}
const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new V3(0, 1, 0), 0);
function updateAim() {
  ndc.set(mouse.x / innerWidth * 2 - 1, -(mouse.y / innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  if (raycaster.ray.intersectPlane(plane, P.aimPt)) P.aim = Math.atan2(P.aimPt.x - P.pos.x, P.aimPt.z - P.pos.z);
}
function dmgRoll(mult) {
  const base = (6 + P.stats.wdmg) * (1 + 0.1 * (P.level - 1)) * mult * R(0.9, 1.1);
  const crit = Math.random() < P.stats.crit;
  return { dmg: Math.round(crit ? base * 2 : base), crit };
}
const gainFede = n => { P.fede = Math.min(P.maxF, P.fede + n); };
const ARC_GEO = new THREE.PlaneGeometry(7.4, 4.2); ARC_GEO.rotateX(-Math.PI / 2);
function slash() {
  if (P.atkCd > 0 || P.dead || P.dashT > 0 || P.spinT > 0) return;
  P.atkCd = 0.38; P.atkT = 0.24; P.face = P.aim;
  P.vel.x += Math.sin(P.aim) * 5; P.vel.z += Math.cos(P.aim) * 5; sfx.slash();
  const arc = new THREE.Mesh(ARC_GEO, new THREE.MeshBasicMaterial({ map: ftex('slash_04'), color: col(0xffa040, 3.2), transparent: true, opacity: 1, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  arc.position.set(P.pos.x + Math.sin(P.aim) * 1.7, 0.95, P.pos.z + Math.cos(P.aim) * 1.7); arc.rotation.y = P.aim + Math.PI;
  scene.add(arc); G.arcs.push({ m: arc, t: 0.22, aim: P.aim });
  for (let k = 0; k < 10; k++) { const a = P.aim + R(-1, 1); fxSpark.spawn(P.pos.x + Math.sin(a) * 2.3, 1.0, P.pos.z + Math.cos(a) * 2.3, Math.sin(a) * R(2, 6), R(0.5, 2), Math.cos(a) * R(2, 6), R(0.25, 0.5), 0.4, 0.05, 3.2, 1.6, 0.5, 1, 0, 4, 0.5); }
  for (const e of G.enemies) {
    if (e.dead) continue;
    const dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z, d = Math.hypot(dx, dz);
    if (d < 3.3 + e.T.r && Math.abs(angDiff(Math.atan2(dx, dz), P.aim)) < 1.2) { const r = dmgRoll(1); hitEnemy(e, r.dmg, dx / (d || 1), dz / (d || 1), 11, r.crit); gainFede(7); }
  }
}
function fire() {
  if (P.fireCd > 0 || P.dead || P.fede < 12) return;
  P.fede -= 12; P.fireCd = 1.0; P.face = P.aim; sfx.fire();
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8), new THREE.MeshBasicMaterial({ color: col(0xffa030, 3) }));
  const dir = new V3(Math.sin(P.aim), 0, Math.cos(P.aim));
  m.position.set(P.pos.x + dir.x, 1.1, P.pos.z + dir.z);
  scene.add(m); G.shots.push({ m, dir, life: 1.0, hit: new Set() });
}
function turbine() {
  if (P.turbCd > 0 || P.dead || P.fede < 30 || P.spinT > 0) return;
  P.fede -= 30; P.turbCd = 2.0; P.spinT = 0.9; P.spinHit = 0; sfx.nova();
  addRing(P.pos.x, P.pos.z, 'twirl_01', 0xff8a30, 4.3, 0.9, { follow: true, spin: -14, grow: false, k: 3, y: 0.3 });
  addRing(P.pos.x, P.pos.z, 'twirl_02', 0xffc060, 3.6, 0.9, { follow: true, spin: -9, grow: false, k: 2.4, y: 0.5 });
}
function nova() {
  if (P.novaCd > 0 || P.dead || P.fede < 25) return;
  P.fede -= 25; P.novaCd = 7.0; sfx.nova(); sfx.boom();
  addRing(P.pos.x, P.pos.z, 'magic_02', 0x9ac8ff, 7.6, 0.55, { k: 3 });
  addRing(P.pos.x, P.pos.z, 'circle_03', 0xc8e4ff, 7.6, 0.4, { k: 3, y: 0.14 });
  flash(P.pos.x, 1.2, P.pos.z, 9, 0x7ab4ff, 0.3);
  emit(P.pos.x, 0.5, P.pos.z, 60, 0x9ac8ff, 10, 2, 0.7);
  for (const e of G.enemies) {
    if (e.dead) continue;
    const dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z, d = Math.hypot(dx, dz);
    if (d < 7.5 + e.T.r) { const r = dmgRoll(1.4); hitEnemy(e, r.dmg, dx / (d || 1), dz / (d || 1), 17, r.crit); if (!e.T.boss) { e.stun = 0.9; e.state = 'recover'; e.st = 0.9; } }
  }
}
function dash() {
  if (P.dashCd > 0 || P.dead || P.spinT > 0) return;
  const mv = moveVec();
  P.dashDir.copy(mv.lengthSq() > 0 ? mv : new V3(Math.sin(P.aim), 0, Math.cos(P.aim)));
  P.dashT = 0.18; P.dashCd = 0.9; P.inv = 0.3; sfx.dash();
  emit(P.pos.x, 0.3, P.pos.z, 14, 0xffaa60, 3, 1.5, 0.4);
}
function usePotion() {
  if (P.potCd > 0 || P.potions <= 0 || P.dead || P.hp >= P.max) return;
  P.potions--; P.potCd = 4; const h = Math.round(P.max * 0.4); P.hp = Math.min(P.max, P.hp + h);
  sfx.potion(); popup(P.pos.x, 2.2, P.pos.z, '+' + h, 'heal'); emit(P.pos.x, 1, P.pos.z, 24, 0x6aff8a, 3, 4, 0.8);
}
function moveVec() {
  const f = (keys.w ? 1 : 0) - (keys.s ? 1 : 0), r = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
  const v = new V3(-f + r, 0, -f - r); return v.lengthSq() > 0 ? v.normalize() : v;
}
function hurtPlayer(dmg) {
  if (P.inv > 0 || P.dead || G.state === 'win') return;
  dmg = Math.max(1, Math.round(dmg * (window.__diff || 1) * (1 - P.stats.dr)));      // difficoltà scelta nel menu di pausa (bottino.js)
  P.hp -= dmg; P.inv = 0.7; sfx.hurt(); hurtFlash();
  popup(P.pos.x, 2.2, P.pos.z, '-' + dmg, 'hurt');
  emit(P.pos.x, 1.2, P.pos.z, 18, 0xff2010, 4, 3);
  if (P.hp <= 0) {
    P.hp = 0; P.dead = true; G.state = 'dead';
    $('title').innerHTML = `<h1>CADUTO</h1><h2>«Lasciate ogne speranza, voi ch'intrate»</h2><p>Dannati abbattuti: ${G.kills} · Livello ${P.level}</p>
      <button id="rez">RISORGI AL CHECKPOINT</button>`;
    $('title').style.display = 'flex';
    $('rez').onclick = respawn;
  }
}
function respawn() {
  P.dead = false; P.hp = P.max; P.fede = 30; P.potions = Math.max(P.potions, 3); P.inv = 2;
  P.pos.copy(P.checkpoint); P.vel.set(0, 0, 0); P.actor.root.rotation.x = 0; P.actor.root.visible = true;
  G.state = 'play'; $('title').style.display = 'none';
  for (const e of G.enemies) if (!e.dead && e.state !== 'idle') { e.state = 'chase'; e.hp = Math.min(e.T.hp, e.hp + e.T.hp * (e.T.boss ? 0 : 0.3)); }       // morire non rigenera il boss
  say('Virgilio: «Non temer; ché ’l nostro passo non ci può tòrre alcuno.»  —  Non temere: nessuno può toglierci il cammino. Rialzati.', 6000);
}
function updatePlayer(dt) {
  P.atkCd = Math.max(0, P.atkCd - dt); P.fireCd = Math.max(0, P.fireCd - dt); P.turbCd = Math.max(0, P.turbCd - dt);
  P.novaCd = Math.max(0, P.novaCd - dt); P.dashCd = Math.max(0, P.dashCd - dt); P.inv = Math.max(0, P.inv - dt);
  P.potCd = Math.max(0, P.potCd - dt); P.atkT = Math.max(0, P.atkT - dt);
  gainFede(dt * 1.2);
  const a = P.actor;
  if (P.dead) { a.root.rotation.x = Math.max(-Math.PI / 2, a.root.rotation.x - dt * 4); a.mixer.update(dt); return; }
  updateAim();
  const mv = moveVec();
  const spd = 7.6 * (1 + P.stats.spd) * (P.spinT > 0 ? 0.55 : P.atkT > 0 ? 0.42 : 1);
  if (P.dashT > 0) { P.dashT -= dt; P.vel.copy(P.dashDir).multiplyScalar(24); }
  else P.vel.lerp(mv.clone().multiplyScalar(spd), 1 - Math.exp(-14 * dt));
  P.pos.addScaledVector(P.vel, dt);
  resolveWorld(P.pos, 0.5);
  if (P.spinT > 0) {                              // Turbine di Fuoco: tre colpi ad area
    P.spinT -= dt;
    const k = 1 - P.spinT / 0.9;
    if (P.spinHit < 3 && k >= 0.15 + P.spinHit * 0.3) {
      P.spinHit++;
      emit(P.pos.x, 1, P.pos.z, 26, 0xffa040, 9, 2, 0.5); fireBurst(P.pos.x, 0.6, P.pos.z, 6, 1.1, 0xff8a30, false);
      for (const e of G.enemies) {
        if (e.dead) continue;
        const dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z, d = Math.hypot(dx, dz);
        if (d < 3.9 + e.T.r) { const r = dmgRoll(0.7); hitEnemy(e, r.dmg, dx / (d || 1), dz / (d || 1), 7, r.crit); }
      }
    }
  } else if (mouse.down) slash();
  if (P.spinT <= 0 && (mouse.right || keys.q)) fire();
  if (P.spinT <= 0) P.face += angDiff(P.aim, P.face) * (1 - Math.exp(-18 * dt));
  a.root.position.copy(P.pos);
  a.root.rotation.y = P.face + (P.spinT > 0 ? (1 - P.spinT / 0.9) * 12.566 : 0);
  play(a, mv.lengthSq() > 0 || P.dashT > 0 ? 'Run' : 'Idle');
  const sw = P.sword;
  if (P.spinT > 0) sw.rotation.set(0.05, 0.3, 0);
  else if (P.atkT > 0) { const k = 1 - P.atkT / 0.24, e = k * k * (3 - 2 * k); sw.rotation.set(0.08, 1.5 - 3.0 * e, 0); }
  else sw.rotation.set(1.05, 0.25, 0.1);
  a.root.visible = P.inv > 0 ? Math.floor(G.time * 22) % 2 === 0 : true;
  a.mixer.update(dt);
  torch.position.set(P.pos.x, 2.6, P.pos.z);
  // spada fiammeggiante: sbuffi di fuoco e scintille lungo la lama
  a.root.updateMatrixWorld(true);
  P.swordAcc = (P.swordAcc || 0) + dt * (P.atkT > 0 || P.spinT > 0 ? 80 : 28);
  while (P.swordAcc >= 1) {
    P.swordAcc -= 1;
    const tip = P.sword.localToWorld(new V3(0, 0, R(0.5, 1.7)));
    fxFire.spawn(tip.x, tip.y, tip.z, R(-0.3, 0.3), R(0.5, 1.4), R(-0.3, 0.3), 0.36, 0.6, 0.12, 2.4, 0.9, 0.22, 0.8, R(-3, 3), -0.6, 1.5);
    if (Math.random() < 0.25) fxSpark.spawn(tip.x, tip.y, tip.z, R(-1, 1), R(1, 3), R(-1, 1), R(0.4, 0.9), 0.3, 0.04, 3.2, 1.5, 0.4, 1, 0, 5, 0.4);
  }
}

/* ================= nemici ================= */
function resolveWorld(pos, r) {
  for (const o of obstacles) {
    const dx = pos.x - o.x, dz = pos.z - o.z; if (Math.abs(dx) > 8 || Math.abs(dz) > 8) continue;
    const d = Math.hypot(dx, dz), min = r + o.r;
    if (d < min && d > 1e-4) { pos.x = o.x + dx / d * min; pos.z = o.z + dz / d * min; }
  }
  nearestWalk(pos, r);
}
function spawnEnemy(type, x, z, ch, sc = ch + ((G.circle || 1) - 1) * 4) {
  // i nemici si rafforzano camera dopo camera: +30% vita, +12% danni per camera (copia per-nemico, così barre e fasi restano coerenti)
  const T = Object.assign({}, TYPES[type]); T.hp = Math.round(T.hp * (1 + 0.3 * sc)); T.dmg = Math.round(T.dmg * (1 + 0.12 * sc));
  const real = !!models[T.model];                               // modelli Quaternius se caricati, altrimenti il robot di riserva
  const act = makeActor(real ? models[T.model] : models.demon, T.h, real ? { tint: T.tintReal, emis: T.emis, emisK: T.emisK } : { tint: T.tint, emis: T.emis, emisK: T.emisK });
  const e = { type, T, ch, actor: act, hp: T.hp, pos: new V3(x, 0, z), kv: new V3(), face: R(0, 6.28), state: 'idle', st: 0,
    cd: R(0, 0.6), stun: 0, dead: false, deadT: 0, flash: 0, barT: 0, slamCd: T.slam ? R(2, T.slam) : 99, summonCd: 14 };
  act.root.position.copy(e.pos); scene.add(act.root);
  if (!real) { addHorns(act, T.h / 1.5); addWings(act, T.h); }
  e.halo = new THREE.Mesh(new THREE.PlaneGeometry(T.r * 4.4, T.r * 4.4), new THREE.MeshBasicMaterial({
    map: HALO_TEX, color: T.glow || 0xffffff, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
  e.halo.rotation.x = -Math.PI / 2; scene.add(e.halo);
  if (!T.boss) {
    e.bar = document.createElement('div'); e.bar.className = 'eb' + (T.elite ? ' elite' : ''); e.bar.innerHTML = '<i></i>'; $('bars').appendChild(e.bar);
  }
  play(act, 'Idle'); G.enemies.push(e);
  emit(x, 0.3, z, 20, 0xff5a1a, 4, 4, 0.7);
  return e;
}
function spawnPack(i) {
  const c = CH[i]; c.spawned = true;
  const list = [];
  for (const [t, n] of Object.entries(PACKS[i])) for (let k = 0; k < n; k++) list.push(t);
  if (PACKS[i].boss) {
    const a = c.toPrev + Math.PI, bp = new V3(c.x + Math.sin(a) * c.r * 0.45, 0, c.z + Math.cos(a) * c.r * 0.45); resolveWorld(bp, 2);
    spawnEnemy(BOSS_BY[G.circle || 1], bp.x, bp.z, i); return;
  }
  const k = Math.max(1, Math.ceil(list.length / 4)), centers = [];
  for (let j = 0; j < k; j++) {
    let a, d, tries = 0;
    do { a = Rs(0, 6.283); d = Rs(0.25, 0.62) * c.r; } while (Math.abs(angDiff(a, c.toPrev)) < 0.8 && tries++ < 20);
    centers.push([c.x + Math.sin(a) * d, c.z + Math.cos(a) * d]);
  }
  list.forEach((t, idx) => {
    const [cx, cz] = centers[idx % k];
    const p = new V3(cx + R(-2.8, 2.8), 0, cz + R(-2.8, 2.8)); resolveWorld(p, TYPES[t].r);
    spawnEnemy(t, p.x, p.z, i);
  });
}
function wake(e) { if (e.state === 'idle') { e.state = 'chase'; play(e.actor, 'Running'); } }
function hitEnemy(e, dmg, dx, dz, kb, crit = false) {
  if (e.dead) return;
  e.hp -= dmg; e.flash = 1; e.barT = 4; wake(e);
  // stordimento: non interrompe un colpo già in fase finale (altrimenti la spada li blocca per sempre)
  if (e.T.poise > 0 && !(e.state === 'wind' && e.st < 0.25)) { e.stun = e.T.poise; e.state = 'recover'; e.st = e.T.poise; if (e.actor.act.HitReact) { e.actor.cur = null; play(e.actor, 'HitReact', 0.05, true); } }
  const kbm = e.T.boss ? 0.15 : e.T.elite ? 0.5 : 1;
  e.kv.x += dx * kb * kbm; e.kv.z += dz * kb * kbm;
  crit ? sfx.crit() : sfx.hit();
  popup(e.pos.x, e.T.h + 0.3, e.pos.z, String(dmg), crit ? 'crit' : '');
  emit(e.pos.x, 1.0, e.pos.z, crit ? 26 : 14, crit ? 0xffd040 : 0xff2a10, 6, 4);
  flash(e.pos.x, 1.2, e.pos.z, crit ? 4.2 : 2.4, crit ? 0xffd060 : 0xff6a30, 0.14);
  if (crit) emit(e.pos.x, 1.2, e.pos.z, 10, 0xffffff, 8, 5, 0.4);
  if (e.hp <= 0) killEnemy(e);
}
function killEnemy(e) {
  e.dead = true; G.kills++; sfx.die();
  play(e.actor, 'Death', 0.1, true);
  e.actor.wings.forEach(w => w.piv.visible = false);
  emit(e.pos.x, 1.0, e.pos.z, e.T.boss ? 140 : 40, 0xff7a20, 7, 6, 0.9);
  const ds = e.T.boss ? 3.2 : e.T.elite ? 1.9 : e.type === 'brute' ? 1.5 : 1;
  fireBurst(e.pos.x, 0.6, e.pos.z, Math.round(14 * ds), ds, e.T.boss ? 0xb060ff : 0xff6a20);
  flash(e.pos.x, 1.2, e.pos.z, 6 * ds, e.T.boss ? 0xa060ff : 0xff7a30, 0.35);
  addRing(e.pos.x, e.pos.z, 'circle_03', e.T.boss ? 0xb080ff : 0xff6a30, 3.2 * ds, 0.5, { k: 2.4, y: 0.1 });
  popup(e.pos.x, e.T.h + 1, e.pos.z, `+${e.T.xp} XP`, 'xp');
  addXp(e.T.xp);
  const il = P.level + G.stage;
  if (e.T.boss) { G.bossDead = true; for (let i = 0; i < 3; i++) dropItem(e.pos.x + R(-3, 3), e.pos.z + R(-3, 3), il + 2, 3); dropPotion(e.pos.x + 1, e.pos.z); onBossDead(e); }
  else if (e.T.elite) {
    for (let i = 0; i < 2; i++) dropItem(e.pos.x + R(-1.5, 1.5), e.pos.z + R(-1.5, 1.5), il + 1, 1.5, ['weapon', 'armor'][i]);   // il campione lascia sempre arma e armatura
    dropPotion(e.pos.x, e.pos.z + 1);
  }
  else {
    const ch = e.type === 'brute' ? 0.38 : 0.13;
    if (Math.random() < ch) dropItem(e.pos.x, e.pos.z, il, 0);
    else if (Math.random() < 0.1) dropPotion(e.pos.x, e.pos.z);
  }
}
function addTele(x, z, r, dur, dmg, owner) {
  const grp = new THREE.Group(); grp.position.set(x, 0.06, z);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 48), new THREE.MeshBasicMaterial({ color: col(0xff3010, 2.5), transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  const fill = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: col(0xff2008, 1.4), transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  ring.rotation.x = fill.rotation.x = -Math.PI / 2; ring.scale.setScalar(r); fill.scale.setScalar(0.01);
  const rg = new THREE.PlaneGeometry(2, 2); rg.rotateX(-Math.PI / 2);
  const rune = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ map: ftex('magic_02'), color: col(0xff3010, 2.2), transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  rune.scale.setScalar(r * 1.05); rune.position.y = 0.02;
  grp.add(ring, fill, rune); scene.add(grp);
  G.tele.push({ grp, fill, rune, x, z, r, t: 0, dur, dmg, owner });
}
function updateTele(dt) {
  for (const t of G.tele) {
    t.t += dt; t.fill.scale.setScalar(Math.max(0.01, t.r * t.t / t.dur)); t.rune.rotation.y += dt * 1.2;
    if (Math.random() < dt * 30) { const a = Math.random() * 6.283, rr = t.r * R(0.3, 1); fxSpark.spawn(t.x + Math.sin(a) * rr, 0.1, t.z + Math.cos(a) * rr, 0, R(1.5, 3), 0, R(0.4, 0.8), 0.35, 0.05, 3, 0.9, 0.3, 1, 0, 0, 0); }
    if (t.t >= t.dur) {
      t.dead = true; scene.remove(t.grp); sfx.boom();
      emit(t.x, 0.5, t.z, 70, 0xff6a20, 11, 9, 0.8);
      fireBurst(t.x, 0.4, t.z, Math.round(10 + t.r * 3), t.r / 3.5, 0xff6a20);
      flash(t.x, 1.0, t.z, t.r * 2.2, 0xff6a30, 0.3);
      addRing(t.x, t.z, 'circle_03', 0xff7a30, t.r * 1.25, 0.45, { k: 3 });
      if (!P.dead && Math.hypot(P.pos.x - t.x, P.pos.z - t.z) < t.r) { hurtPlayer(t.dmg); P.vel.x += (P.pos.x - t.x) * 2; P.vel.z += (P.pos.z - t.z) * 2; }
    }
  }
  G.tele = G.tele.filter(t => !t.dead);
}
function updateEnemies(dt) {
  const near = G.enemies.filter(e => !e.dead && e.state !== 'idle');
  for (const e of G.enemies) {
    const A = e.actor;
    if (e.dead) {
      e.deadT += dt;
      if (e.deadT > 1.6) A.root.position.y -= dt * 1.0;
      if (e.deadT > 3.4) { scene.remove(A.root); scene.remove(e.halo); if (e.bar) e.bar.remove(); e.gone = true; }
      A.mixer.update(dt); flashActor(A, 0); e.halo.material.opacity = 0; continue;
    }
    const dx = P.pos.x - e.pos.x, dz = P.pos.z - e.pos.z, dist = Math.hypot(dx, dz) || 1e-3;
    if (e.state === 'idle') {
      if (dist < 12 && !P.dead) wake(e);                               // il branco si accorge di te
      else { if (dist < 34) A.mixer.update(dt); e.halo.position.set(e.pos.x, 0.05, e.pos.z);   /* i nemici addormentati lontani non animano */ e.halo.material.opacity = 0.35; A.root.rotation.y = e.face; continue; }
    }
    e.flash = Math.max(0, e.flash - dt * 6); flashActor(A, e.flash * 0.9);
    const want = Math.atan2(dx, dz);
    e.cd = Math.max(0, e.cd - dt);
    if (e.state === 'chase') {
      e.face += angDiff(want, e.face) * (1 - Math.exp(-10 * dt));
      const sp = e.T.speed * (e.T.boss && e.hp < e.T.hp * 0.3 ? 1.3 : 1);
      if (dist > e.T.reach * 0.85) { e.pos.x += dx / dist * sp * dt; e.pos.z += dz / dist * sp * dt; play(A, 'Running'); }
      if (dist < e.T.reach && e.cd <= 0 && !P.dead) { e.state = 'wind'; e.st = e.T.wind; play(A, 'Punch', 0.1); }
    } else if (e.state === 'wind') {
      e.face += angDiff(want, e.face) * (1 - Math.exp(-6 * dt));
      e.st -= dt;
      if (e.st <= 0) {
        if (dist < e.T.reach + 0.8) hurtPlayer(e.T.dmg);
        e.state = 'recover'; e.st = 0.55; e.cd = 0.9; play(A, 'Idle', 0.15);
      }
    } else if (e.state === 'recover') {
      e.st -= dt; if (e.st <= 0) { e.state = 'chase'; play(A, 'Running'); }
    }
    // abilità speciali di campioni e boss
    if (e.T.slam && !P.dead && dist < 18) {
      e.slamCd -= dt;
      if (e.slamCd <= 0) {
        const fast = e.T.boss && e.hp < e.T.hp * 0.5;
        addTele(P.pos.x, P.pos.z, e.T.slamR, fast ? 1.0 : 1.3, e.T.slamD, e);
        if (e.T.boss && fast) addTele(P.pos.x + R(-6, 6), P.pos.z + R(-6, 6), e.T.slamR * 0.8, 1.2, e.T.slamD * 0.8, e);
        if (e.T.heads) for (let k = 1; k < e.T.heads; k++) addTele(P.pos.x + R(-9, 9), P.pos.z + R(-9, 9), e.T.slamR * 0.7, 1.25 + k * 0.25, e.T.slamD * 0.7, e);   // le altre teste di Cerbero
        e.slamCd = e.T.slam * (fast ? 0.7 : 1) + R(0, 1.5);
      }
    }
    if (e.T.boss && !P.dead) {
      e.summonCd -= dt;
      if (e.summonCd <= 0) {
        e.summonCd = e.hp < e.T.hp * 0.5 ? 16 : 22; say(e.T.gale ? 'Semiramide: «A vizio di lussuria fu sì rotta…»' : 'Minosse: «Non t’inganni l’ampiezza de l’intrare!»', 2500);
        for (let i = 0; i < 3; i++) {
          const a = R(0, 6.28), p = new V3(e.pos.x + Math.sin(a) * 5, 0, e.pos.z + Math.cos(a) * 5); resolveWorld(p, 0.55);
          const m = spawnEnemy(e.T.summon || 'imp', p.x, p.z, e.ch, 2 + ((G.circle || 1) - 1) * 4); wake(m);   // richiami di livello medio
        }
      }
      if (e.T.gale) {                                                          // Semiramide: la bufera ti trascina verso di lei
        e.galeCd = (e.galeCd === undefined ? 9 : e.galeCd) - dt;
        if (e.galeCd <= 0 && G.wind && G.wind.phase === 'calm') { e.galeCd = e.hp < e.T.hp * 0.5 ? 11 : 16; startGust(Math.atan2(e.pos.x - P.pos.x, e.pos.z - P.pos.z)); }
      }
      if (e.T.mud) {                                                           // Cerbero: la fanghiglia si allarga sotto i tuoi piedi
        e.mudCd = (e.mudCd === undefined ? 7 : e.mudCd) - dt;
        if (e.mudCd <= 0) { e.mudCd = e.hp < e.T.hp * 0.5 ? 8 : 12; addMud(P.pos.x, P.pos.z, 4.6, 12); say('Cerbero: «…caninamente latra sovra la gente che quivi è sommersa.»', 2500); }
      }
    }
    e.pos.x += e.kv.x * dt; e.pos.z += e.kv.z * dt; e.kv.multiplyScalar(Math.exp(-9 * dt));
    for (const o of near) {
      if (o === e || o.dead) continue;
      const ox = e.pos.x - o.pos.x, oz = e.pos.z - o.pos.z; if (Math.abs(ox) > 4 || Math.abs(oz) > 4) continue;
      const d = Math.hypot(ox, oz), min = e.T.r + o.T.r;
      if (d < min && d > 1e-4) { const push = (min - d) * 0.5; e.pos.x += ox / d * push; e.pos.z += oz / d * push; }
    }
    const px = e.pos.x - P.pos.x, pz = e.pos.z - P.pos.z, pd = Math.hypot(px, pz), pm = e.T.r + 0.5;
    if (pd < pm && pd > 1e-4) { e.pos.x = P.pos.x + px / pd * pm; e.pos.z = P.pos.z + pz / pd * pm; }
    resolveWorld(e.pos, e.T.r);
    A.root.position.copy(e.pos); A.root.rotation.y = e.face;
    const fl = Math.sin(G.time * 9 + e.pos.x * 3) * 0.35 + 0.35;
    for (const w of A.wings) { w.piv.rotation.y = w.s * (0.5 + fl * 0.6); w.piv.rotation.z = w.s * -0.2 * fl; }
    e.halo.position.set(e.pos.x, 0.05, e.pos.z); e.halo.material.opacity = 0.5 + Math.sin(G.time * 7 + e.pos.x) * 0.1;
    if (e.T.elite || e.T.boss) {                                         // aura infuocata di campioni e boss
      e.aura = (e.aura || 0) + dt * (e.T.boss ? 46 : 24);
      while (e.aura >= 1) {
        e.aura -= 1; const a = Math.random() * 6.283, rr = e.T.r * R(0.5, 1.5);
        const c = e.T.boss ? [1.5, 0.5, 2.6] : [2.4, 1.4, 0.3];
        fxFire.spawn(e.pos.x + Math.sin(a) * rr, 0.15, e.pos.z + Math.cos(a) * rr, 0, R(1.4, 3.4), 0, R(0.6, 1.1), e.T.r * 0.9, e.T.r * 0.25, c[0], c[1], c[2], 0.7, R(-1, 1), -0.6, 0.8);
      }
    }
    A.mixer.update(dt);
  }
  G.enemies = G.enemies.filter(e => !e.gone);
}
function updateShots(dt) {
  for (const s of G.shots) {
    s.life -= dt; s.m.position.addScaledVector(s.dir, 26 * dt);
    { const sp = s.m.position;
      fxFire.spawn(sp.x, 1.1, sp.z, R(-0.4, 0.4), R(0.2, 1), R(-0.4, 0.4), 0.4, 1.3, 0.3, 2.6, 1.0, 0.3, 0.8, R(-2, 2), 0, 1);
      fxGlow.spawn(sp.x, 1.1, sp.z, 0, 0, 0, 0.07, 2.4, 2.8, 2.2, 0.9, 0.3, 0.9);
      if (Math.random() < 0.6) fxSpark.spawn(sp.x, 1.1, sp.z, R(-1.5, 1.5), R(0.5, 2.5), R(-1.5, 1.5), R(0.3, 0.6), 0.4, 0.05, 3.2, 1.4, 0.4, 1, 0, 6, 0.4); }
    for (const e of G.enemies) {
      if (e.dead || s.hit.has(e)) continue;
      if (Math.hypot(e.pos.x - s.m.position.x, e.pos.z - s.m.position.z) < e.T.r + 0.45) { s.hit.add(e); const r = dmgRoll(2.2); hitEnemy(e, r.dmg, s.dir.x, s.dir.z, 9, r.crit); }
    }
    for (const o of obstacles) if (Math.hypot(o.x - s.m.position.x, o.z - s.m.position.z) < o.r) s.life = 0;
    if (s.life <= 0) { scene.remove(s.m); s.dead = true; emit(s.m.position.x, 1, s.m.position.z, 16, 0xffa040, 5, 3); fireBurst(s.m.position.x, 0.8, s.m.position.z, 6, 0.8, 0xff8a30, false); flash(s.m.position.x, 1.1, s.m.position.z, 3.4, 0xff8a30, 0.2); }
  }
  G.shots = G.shots.filter(s => !s.dead);
  for (const a of G.arcs) {
    a.t -= dt; const k = 1 - Math.max(0, a.t) / 0.22;
    a.m.material.opacity = Math.max(0, 1 - k * k); a.m.scale.setScalar(0.85 + k * 0.35);
    a.m.position.x = P.pos.x + Math.sin(a.aim) * (1.7 + k * 0.6); a.m.position.z = P.pos.z + Math.cos(a.aim) * (1.7 + k * 0.6);
    if (a.t <= 0) { scene.remove(a.m); a.dead = true; }
  }
  G.arcs = G.arcs.filter(a => !a.dead);
  for (const r of G.rings) {
    r.t += dt; const k = r.t / r.dur;
    r.m.scale.setScalar(r.grow ? 0.5 + k * r.r : r.r);
    r.m.material.opacity = r.grow ? Math.max(0, 1 - k) : Math.min(1, k * 6) * Math.min(1, (1 - k) * 4);
    if (r.follow) { r.m.position.x = P.pos.x; r.m.position.z = P.pos.z; }
    if (r.spin) r.m.rotation.y += r.spin * dt;
    if (k >= 1) { scene.remove(r.m); r.dead = true; }
  }
  G.rings = G.rings.filter(r => !r.dead);
}
function updateLoot(dt) {
  for (const l of G.loot) {
    l.t += dt; l.gem.position.y = 0.9 + Math.sin(l.t * 3) * 0.12; l.gem.rotation.y += dt * 2;
    l.glT = (l.glT || 0) - dt;
    if (l.glT <= 0) {
      l.glT = 0.13; tmpC.set(l.color);
      fxGlow.spawn(l.x, 0.5, l.z, 0, 0, 0, 0.34, 2.2, 3.4, tmpC.r * 2, tmpC.g * 2, tmpC.b * 2, 0.5);
      fxSpark.spawn(l.x + R(-0.3, 0.3), 0.4, l.z + R(-0.3, 0.3), 0, R(1.2, 2.6), 0, R(0.7, 1.2), 0.3, 0.04, tmpC.r * 3, tmpC.g * 3, tmpC.b * 3, 1, 0, 0, 0.2);
    }
    if (!P.dead && Math.hypot(P.pos.x - l.x, P.pos.z - l.z) < 1.9) pickup(l);
  }
  G.loot = G.loot.filter(l => !l.dead);
}

/* ================= progressione lineare: camere, cancelli, enigma, boss ================= */
function openGate(i) {
  const l = LINKS[i]; if (l.open) return;
  l.open = true; sfx.gate();
  emit(l.gx, 2, l.gz, 90, 0xffa040, 10, 10, 1.1);
  scene.remove(l.gate);
  if (i === 0 && (G.circle || 1) === 1) say('«Per me si va ne la città dolente, per me si va ne l’etterno dolore, per me si va tra la perduta gente.»  —  Da qui si entra nella città del dolore, nel dolore eterno, tra le anime perdute.', 9000);
  else say('Il varco si apre. «Andiam, ché la via lunga ne sospigne.»  —  Andiamo, il cammino è lungo e ci incalza.', 4500);
  G.stage = i + 1;
}
function enterChamber(i) {
  const c = CH[i];
  if (i > G.reached) {
    G.reached = i; banner(c.name.toUpperCase(), `${CINFO().tag} — ${i + 1}/${CH.length}`);
    $('zname').textContent = CINFO().title; $('zsub').textContent = c.name;
    P.checkpoint.set(c.x + Math.sin(c.toPrev) * (c.r * 0.55), 0, c.z + Math.cos(c.toPrev) * (c.r * 0.55)); resolveWorld(P.checkpoint, 0.8);
    P.potions = Math.max(P.potions, 3);
    toast('<b>Checkpoint raggiunto</b><small>Le pozioni sono state rifornite</small>', '#c8a040', 4000);
    if (G.circle === 2) { circle2Enter(i); return; }
    if (G.circle === 3) { circle3Enter(i); return; }
    if (i === 4) {                                                       // Inferno V: Minosse e il rimprovero di Virgilio
      say('Minosse: «O tu che vieni al doloroso ospizio… guarda com’entri e di cui tu ti fide; non t’inganni l’ampiezza de l’intrare!»  —  Attento a chi ti guidi: non farti ingannare dalla larghezza della porta.', 7500);
      setTimeout(() => G.state === 'play' && say('Virgilio: «Non impedir lo suo fatale andare: vuolsi così colà dove si puote ciò che si vuole, e più non dimandare.»  —  Non ostacolare il suo cammino: così è voluto, e non chiedere altro.', 8000), 7800);
    }
    if (i === 3) say('Virgilio: «…non avea pianto mai che di sospiri, che l’aura etterna facevan tremare.»  —  Qui non c’è pianto, solo sospiri che fanno tremare l’aria eterna. Attento al campione infernale.', 8000);
    if (i === 1) say('Virgilio: «Or discendiam qua giù nel cieco mondo.»  —  Scendiamo ora in questo mondo cieco. I dannati ti hanno sentito: tienili a bada.', 6500);
  }
}
function setupPedestals() {
  const c = CH[2], vals = ENIG().labels.slice().sort(() => Math.random() - 0.5);
  vals.forEach((v, i) => {
    const a = c.toPrev + 2.0944 * (i + 0.5) + 0.2, sp = c.spots && c.spots[i];                      // le isole portano i loro bracieri
    const x = sp ? c.x + sp[0] : c.x + Math.sin(a) * c.r * 0.5, z = sp ? c.z + sp[1] : c.z + Math.cos(a) * c.r * 0.5;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.25, 0.7, 12), pillarMat);
    base.position.set(x, 0.35, z); base.castShadow = base.receiveShadow = true; scene.add(base);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), new THREE.MeshBasicMaterial({ color: 0x552211 }));
    orb.position.set(x, 1.35, z); scene.add(orb);
    const lab = labelSprite(String(v)); lab.position.set(x, 2.6, z); scene.add(lab);
    G.pedestals.push({ x, z, v, lit: false, dwell: 0, orb, base, lab });
  });
  G.enigma = { next: ENIG().order.slice(), step: 0, hint: 0, started: false, solved: false, lock: 0 };
}
function labelSprite(text) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  g.font = `bold ${text.length > 3 ? 40 : 76}px Georgia`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 8; g.strokeStyle = '#200'; g.strokeText(text, 128, 68); g.fillStyle = '#ffd9a0'; g.fillText(text, 128, 68);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), fog: false, depthWrite: false }));
  s.scale.set(3.6, 1.8, 1); return s;
}
function updateEnigma(dt) {
  const en = G.enigma; if (!en || en.solved || !en.started) return;
  en.lock = Math.max(0, en.lock - dt);
  for (const p of G.pedestals) {
    if (p.lit) { p.orb.scale.setScalar(1 + Math.sin(G.time * 6) * 0.08); continue; }
    const on = Math.hypot(P.pos.x - p.x, P.pos.z - p.z) < 1.7;
    p.dwell = on ? p.dwell + dt : 0;
    p.orb.material.color.setHex(on && en.lock <= 0 ? 0xaa6622 : 0x552211);
    if (p.dwell > 0.4 && en.lock <= 0) {                                // devi fermarti un attimo sul braciere
      if (p.v === en.next[en.step]) {
        p.lit = true; p.orb.material.color.set(col(0xffc030, 2)); en.step++; sfx.ok(); emit(p.x, 1.4, p.z, 30, 0xffc030, 4, 5, 0.8);
        if (en.step === en.next.length) { en.solved = true; say('I bracieri ardono insieme: le catene del varco si spezzano.', 4000); openGate(2); }
      } else {
        sfx.bad(); hurtFlash(); en.step = 0; en.lock = 1.5; p.dwell = 0;
        G.pedestals.forEach(q => { q.lit = false; q.orb.material.color.set(0x552211); q.orb.scale.setScalar(1); });
        say('Ordine sbagliato! I bracieri si spengono e i dannati ridono…', 3500);
        for (let k = 0; k < 3; k++) { const a = R(0, 6.28), pp = new V3(P.pos.x + Math.sin(a) * 7, 0, P.pos.z + Math.cos(a) * 7); resolveWorld(pp, 0.55); wake(spawnEnemy('imp', pp.x, pp.z, 2)); }
      }
    }
  }
}
function onBossDead(e) {
  say(CINFO().bossDead, 7000);
  const c = CH[4], a = c.toPrev + Math.PI, pp = new V3(c.x + Math.sin(a) * c.r * 0.55, 0, c.z + Math.cos(a) * c.r * 0.55); resolveWorld(pp, 2.4);
  const x = pp.x, z = pp.z;
  const grp = new THREE.Group(); grp.position.set(x, 0, z);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.22, 12, 40), new THREE.MeshBasicMaterial({ color: col(0xa070ff, 2.6) }));
  ring.position.y = 2.6; grp.add(ring);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(2.3, 40), new THREE.MeshBasicMaterial({ map: ftex('twirl_02'), color: col(0x9a60ff, 3), transparent: true, opacity: 0.9, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
  disc.position.y = 2.6; grp.add(disc);
  scene.add(grp); G.portal = { grp, x, z, ring, disc };
}
function updateStages(dt) {
  // spawn dei branchi per vicinanza (solo la camera in cui stai o la prossima)
  for (const c of CH) if (!c.spawned && Math.hypot(P.pos.x - c.x, P.pos.z - c.z) < c.r + 55) {
    if (c.i === 2) setupPedestals();
    spawnPack(c.i);
  }
  const ch = chamberAt(P.pos.x, P.pos.z);
  if (ch >= 0) { P.ch = ch; enterChamber(ch); }
  const st = G.stage;
  if (st < CH.length - 1 && !LINKS[st].open) {
    const alive = G.enemies.filter(e => !e.dead && e.ch === st).length;
    if (CH[st].spawned && alive === 0) {
      if (st === 2) {
        if (!G.enigma.started) {
          G.enigma.started = true;
          say(ENIG().riddle, 11000);
        }
      } else openGate(st);
    }
  }
  for (const l of LINKS) if (!l.open && l.gate) {
    l.gate.userData.tex.offset.y -= dt * 0.8;
    if (Math.abs(l.gx - P.pos.x) < 45 && Math.abs(l.gz - P.pos.z) < 45) {
      l.gacc = (l.gacc || 0) + dt * 36;
      while (l.gacc >= 1) {
        l.gacc -= 1; const s = R(-CW, CW);
        fxFlame.spawn(l.gx - l.dz * s, 0.4, l.gz + l.dx * s, 0, R(2, 4.5), 0, R(0.5, 0.95), 2.4, 0.6, 2.6, 1.1, 0.3, 0.85, 0, -0.5, 0.4);
      }
    }
  }
  if (G.portal) {
    G.portal.ring.rotation.z += dt * 1.5; G.portal.disc.rotation.z -= dt * 2.2; G.portal.disc.scale.setScalar(1 + Math.sin(G.time * 5) * 0.05);
    if (Math.random() < 0.5) { const a = Math.random() * 6.283; fxSpark.spawn(G.portal.x + Math.sin(a) * 2.4, 2.6 + Math.cos(a) * 2.4, G.portal.z, 0, 0.5, 0, R(0.7, 1.3), 0.35, 0.05, 1.8, 0.9, 3.2, 1, 0, -1, 0.5); }
    if (Math.hypot(P.pos.x - G.portal.x, P.pos.z - G.portal.z) < 2 && G.state === 'play') portalEnter();
  }
}
function win() {
  G.state = 'win';
  const I = CINFO();
  $('title').innerHTML = `<h1>${I.winTitle}</h1><h2>${I.winVerse}</h2>
    <p>${I.bossShort} è stat${['Minosse', 'Cerbero'].includes(I.bossShort) ? 'o' : 'a'} sconfitt${['Minosse', 'Cerbero'].includes(I.bossShort) ? 'o' : 'a'} · Dannati abbattuti: ${G.kills} · Livello ${P.level}</p>
    <p>${I.winNext}</p><button onclick="location.reload()">RIGIOCA</button>`;
  $('title').style.display = 'flex';
}

/* ================= Cerchio II: i Lussuriosi (la bufera infernal) ================= */
const FLAMEC = [2.6, 1.15, 0.28];                       // colore delle fiamme dei bracieri (cambia per cerchio)
const CINFO_ = {
  1: { tag: 'CERCHIO I · LIMBO', title: 'Cerchio I — Limbo', bossShort: 'Minosse',
       bossDead: 'Minosse cade. Virgilio: «Così discesi del cerchio primaio giù nel secondo.»  —  Un varco si apre: si scende dal primo cerchio nel secondo.',
       winTitle: 'CERCHIO SUPERATO', winVerse: '«Così discesi del cerchio primaio giù nel secondo…»', winNext: '' },
  2: { tag: 'CERCHIO II · I LUSSURIOSI', title: 'Cerchio II — I Lussuriosi', bossShort: 'Semiramide',
       bossDead: 'Semiramide cade e la bufera si placa. Virgilio: «Andiam, ché la via lunga ne sospigne.»  —  Andiamo: il cammino è lungo e continua verso il terzo cerchio.',
       winTitle: 'SECONDO CERCHIO SUPERATO', winVerse: '«…e caddi come corpo morto cade.»', winNext: 'Prossimo: il Terzo Cerchio — i Golosi' },
  3: { tag: 'CERCHIO III · I GOLOSI', title: 'Cerchio III — I Golosi', bossShort: 'Cerbero',
       bossDead: 'Cerbero cade nel fango. Virgilio: «Noi aggirammo a tondo quella strada…»  —  Giriamo attorno a quella strada: il cammino scende ancora, verso il quarto cerchio.',
       winTitle: 'TERZO CERCHIO SUPERATO', winVerse: '«…quivi trovammo Pluto, il gran nemico.»', winNext: 'Prossimo: il Quarto Cerchio — gli Avari e i Prodighi (in arrivo)' }
};
const CINFO = () => CINFO_[G.circle || 1];
const ENIGMAS = {
  1: { labels: [9, 3, 33], order: [3, 9, 33],
       riddle: 'Virgilio: «Una porta chiusa. Accendi i bracieri nell’ordine in cui compaiono: la Trinità, i cerchi dell’Inferno, i canti di una cantica.»  (H per un aiuto)',
       hints: ['Virgilio: «Tre sono le Persone divine. Nove i cerchi infernali.»',
               'Virgilio: «Ogni cantica ha trentatré canti, oltre al proemio. Dal minore al maggiore, figlio.»',
               'Virgilio: «Prima 3, poi 9, infine 33. Fermati sul braciere.»'] },
  2: { labels: ['Elena', 'Didone', 'Cleopatra'], order: ['Elena', 'Didone', 'Cleopatra'],
       riddle: 'Virgilio: «Elle son le regine che qui la bufera trascina. Accendi i bracieri nell’ordine in cui vissero: dalla più antica alla più recente.»  (H per un aiuto)',
       hints: ['Virgilio: «Una causò la guerra di Troia, una fondò Cartagine, una amò Antonio.»',
               'Virgilio: «Prima viene Troia, poi Cartagine, infine l’Egitto dei Tolomei e Roma.»',
               'Virgilio: «Elena, poi Didone, infine Cleopatra. Fermati sul braciere.»'] },
  3: { labels: ['Superbia', 'Invidia', 'Avarizia'], order: ['Superbia', 'Invidia', 'Avarizia'],
       riddle: 'Virgilio: «Ciacco ti ha detto delle tre faville che accendono i cuori di Firenze. Accendi i bracieri nell’ordine in cui le nomina.»  (H per un aiuto)',
       hints: ['Virgilio: «Una fu il peccato di Lucifero, una quello di Caino, una quello di chi ama l’oro più di tutto.»',
               'Virgilio: «Ciacco le nomina dalla più alta alla più meschina: prima l’orgoglio, poi il rancore, poi l’oro.»',
               'Virgilio: «Superbia, invidia e avarizia sono le tre faville. Fermati sul braciere.»'] }
};
const ENIG = () => ENIGMAS[G.circle || 1];
const THEMES = {
  1: { bg: 0x0e0305, fog: 0x120808, fogD: 0.016, lava: 0xffffff, lavaK: 1.4, rim: 0x5a78ff, sky: 0xb8a39a, gnd: 0x16100f, flame: [2.6, 1.15, 0.28], lamp: 0xff5a1a },
  2: { bg: 0x070812, fog: 0x0b0a1c, fogD: 0.0175, lava: 0x171435, lavaK: 1.0, noLavaMap: true, rim: 0xb070ff, sky: 0x8a96c8, gnd: 0x0e0e1c, flame: [0.55, 1.1, 2.6], lamp: 0x5a8aff },
  3: { bg: 0x070a07, fog: 0x0a110c, fogD: 0.0195, lava: 0x2a2314, lavaK: 1.0, noLavaMap: true, rim: 0x8aaa78, sky: 0x8ea28a, gnd: 0x0c100c, flame: [0.7, 1.5, 0.35], lamp: 0x78d050 }
};
function applyTheme(n) {
  const t = THEMES[n], hemi = scene.children.find(o => o.isHemisphereLight);
  scene.background.set(t.bg); scene.fog.color.set(t.fog); scene.fog.density = t.fogD;
  lava.material = t.noLavaMap ? abyssMat : lavaFlow;                                         // niente lava: un abisso viola
  abyssMat.color.set(t.lava).multiplyScalar(t.lavaK); rim.color.set(t.rim);
  if (hemi) { hemi.color.set(t.sky); hemi.groundColor.set(t.gnd); }
  FLAMEC[0] = t.flame[0]; FLAMEC[1] = t.flame[1]; FLAMEC[2] = t.flame[2];
  lightPool.forEach(l => l.color.set(t.lamp));
}
Object.assign(TYPES, {
  harpy:  { model: 'mBirb', name: 'Arpia', hp: 12, speed: 6.6, h: 1.7, r: 0.55, dmg: 7, reach: 1.5, wind: 0.4, xp: 11, poise: 0.2, emis: 0x4aa0ff, emisK: 0.3, glow: 0x60a8ff },
  soul:   { model: 'mAlien', name: 'Anima Trascinata', hp: 20, speed: 5.0, h: 1.6, r: 0.55, dmg: 9, reach: 1.5, wind: 0.45, xp: 14, poise: 0.25, glow: 0x9a80ff },
  guard:  { model: 'mYeti', name: 'Guardiano della Bufera', hp: 62, speed: 3.3, h: 2.8, r: 0.95, dmg: 20, reach: 2.2, wind: 0.65, xp: 34, poise: 0.14, glow: 0x6a90ff },
  elite2: { model: 'mBlueDemon', name: 'Campione della Tempesta', hp: 210, speed: 4.0, h: 3.6, r: 1.15, dmg: 26, reach: 2.7, wind: 0.6, xp: 120, poise: 0.06,
            elite: true, slam: 6, slamR: 4, slamD: 24, emis: 0x40a0ff, emisK: 0.35, glow: 0x70b8ff },
  boss2:  { model: 'mBlueDemon', tintReal: 0xd070b0, name: 'SEMIRAMIDE, REGINA DEI LUSSURIOSI', hp: 1500, speed: 3.7, h: 6.0, r: 1.95, dmg: 36, reach: 3.8, wind: 0.8, xp: 650, poise: 0,
            boss: true, slam: 4.6, slamR: 5.8, slamD: 32, emis: 0xc040a0, emisK: 0.3, glow: 0xff70c8, summon: 'harpy', gale: true }
});
const PACKS2 = { 0: { harpy: 5, soul: 2 }, 1: { soul: 6, harpy: 4, guard: 2 }, 2: { soul: 5, harpy: 3, guard: 1 }, 3: { harpy: 8, soul: 6, guard: 4, elite2: 1 }, 4: { boss: 1 } };

/* vento a raffiche: calma → preavviso → raffica; spinge giocatore e nemici in una direzione */
function arrowFor(dir) {                                   // direzione del mondo → freccia sullo schermo isometrico
  const dx = Math.sin(dir), dz = Math.cos(dir);
  const sx = (dx - dz) * 0.7071, sy = (-dx - dz) * 0.7071;  // destra schermo = (1,0,-1), su schermo = (-1,0,-1)
  const k = ((Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) % 8) + 8) % 8;
  return ['→', '↗', '↑', '↖', '←', '↙', '↓', '↘'][k];
}
function startGust(dir) {
  const W = G.wind; if (!W) return;
  W.dir = dir; W.phase = 'warn'; W.t = 1.6; tone(120, 1.4, 'sawtooth', 0.05, 200);
}
function updateWind(dt) {
  if (G.circle !== 2) return;
  const W = G.wind || (G.wind = { phase: 'calm', t: 5, dir: 0, force: 0, acc: 0, lt: R(4, 8), flashT: 0 });
  if (!W.hemi) W.hemi = scene.children.find(o => o.isHemisphereLight);
  if (W.base === undefined && W.hemi) W.base = W.hemi.intensity;
  if (!$('wind')) { const d = document.createElement('div'); d.id = 'wind'; d.style.cssText = 'margin-top:6px;font-size:15px;color:#9ac8ff;text-shadow:0 0 6px #000'; $('zone').appendChild(d); }
  W.t -= dt;
  const sheltered = chamberAt(P.pos.x, P.pos.z) === 2;                 // la Sala delle Regine è al riparo: qui si risolve l'enigma in pace
  if (sheltered) { if (W.phase !== 'calm') { W.phase = 'calm'; W.t = 3; } else W.t = Math.max(W.t, 1.5); }
  if (W.phase === 'calm' && W.t <= 0) startGust(R(0, 6.283));
  else if (W.phase === 'warn' && W.t <= 0) { W.phase = 'gust'; W.t = 3.6; }
  else if (W.phase === 'gust' && W.t <= 0) { W.phase = 'calm'; W.t = R(5, 8); }
  W.force = W.phase === 'gust' ? clamp(Math.min((3.6 - W.t) / 0.4, W.t / 0.4), 0, 1) : 0;
  const dx = Math.sin(W.dir), dz = Math.cos(W.dir);
  if (W.force > 0) {
    if (!P.dead) { P.pos.x += dx * 8.5 * W.force * dt; P.pos.z += dz * 8.5 * W.force * dt; resolveWorld(P.pos, 0.5); }
    for (const e of G.enemies) if (!e.dead && e.state !== 'idle' && !e.T.boss) { e.pos.x += dx * 5 * W.force * dt; e.pos.z += dz * 5 * W.force * dt; resolveWorld(e.pos, e.T.r); }
  }
  const rate = W.phase === 'gust' ? 110 * W.force : W.phase === 'warn' ? 30 : 7;       // striature di vento
  W.acc += dt * rate;
  while (W.acc >= 1) {
    W.acc -= 1;
    const sp = W.phase === 'gust' ? R(22, 34) : W.phase === 'warn' ? R(10, 16) : R(2, 4);
    fxSpark.spawn(P.pos.x + R(-24, 24), R(0.4, 3.8), P.pos.z + R(-24, 24), dx * sp, 0, dz * sp, R(0.45, 0.8), 0.22, 0.08, 1.2, 1.7, 2.6, 0.7, 0, 0, 0);
  }
  W.lt -= dt;                                                                           // lampi nella bufera
  if (W.lt <= 0) { W.lt = R(5, 11); W.flashT = 0.16; tone(55, 0.9, 'sawtooth', 0.15, -20); }
  if (W.hemi && W.base !== undefined) { W.flashT = Math.max(0, W.flashT - dt); W.hemi.intensity = W.base + 0.9 * (W.flashT / 0.16); }
  const txt = W.phase === 'gust' ? `RAFFICA ${arrowFor(W.dir)}` : W.phase === 'warn' ? `Vento in arrivo ${arrowFor(W.dir)}` : sheltered ? 'Vento: al riparo' : 'Vento: calmo';
  const wEl = $('wind'); if (wEl.textContent !== txt) { wEl.textContent = txt; wEl.style.color = W.phase === 'gust' ? '#ff9a7a' : '#9ac8ff'; }
}
/* vortici di anime: orbitano nelle camere, attirano e feriscono */
function addTornados(c, n) {
  if (!G.tornados) G.tornados = [];
  for (let k = 0; k < n; k++) {
    const geo = new THREE.PlaneGeometry(2, 2); geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: ftex('twirl_01'), color: col(0xa080ff, 2.4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    m.scale.setScalar(2.8); m.position.y = 0.15; scene.add(m);
    G.tornados.push({ c, ph: R(0, 6.28) + k * 2.1, rho: c.r * R(0.25, 0.5), w: R(0.35, 0.6) * (k % 2 ? 1 : -1), x: c.x, z: c.z, m, hitCd: 0, acc: 0 });
  }
}
function updateHazards(dt) {
  if (!G.tornados) return;
  for (const t of G.tornados) {
    t.ph += t.w * dt; t.x = t.c.x + Math.sin(t.ph) * t.rho; t.z = t.c.z + Math.cos(t.ph) * t.rho;
    { const tp = new V3(t.x, 0, t.z); nearestWalk(tp, 0.8); t.x = tp.x; t.z = tp.z; }                // i vortici restano sul pavimento della camera
    if (Math.abs(t.x - P.pos.x) > 55 || Math.abs(t.z - P.pos.z) > 55) { t.m.visible = false; continue; }
    t.m.visible = true; t.m.position.set(t.x, 0.15, t.z); t.m.rotation.y += dt * 6;
    t.acc += dt * 40;
    while (t.acc >= 1) {
      t.acc -= 1; const a = R(0, 6.28), rr = R(0.3, 2.2);
      fxSmoke.spawn(t.x + Math.sin(a) * rr, 0.2, t.z + Math.cos(a) * rr, Math.cos(a) * 3, R(3, 6), -Math.sin(a) * 3, R(0.7, 1.2), 0.9, 2.2, 0.16, 0.12, 0.3, 0.5, R(-1, 1), -1, 0.3);
      if (Math.random() < 0.4) fxSpark.spawn(t.x + Math.sin(a) * rr, 0.3, t.z + Math.cos(a) * rr, Math.cos(a) * 4, R(4, 8), -Math.sin(a) * 4, R(0.5, 0.9), 0.3, 0.05, 1.4, 1.2, 3, 1, 0, 0, 0.2);
    }
    if (P.dead) continue;
    const d = Math.hypot(P.pos.x - t.x, P.pos.z - t.z) || 1e-3;
    if (d < 6) { P.pos.x += (t.x - P.pos.x) / d * 3.2 * dt; P.pos.z += (t.z - P.pos.z) / d * 3.2 * dt; resolveWorld(P.pos, 0.5); }
    t.hitCd -= dt;
    if (d < 2.3 && t.hitCd <= 0) { t.hitCd = 0.6; hurtPlayer(9); }
  }
}
function circle2Enter(i) {
  if (i === 0) say('«La bufera infernal, che mai non resta, mena li spirti con la sua rapina; voltando e percotendo li molesta.»  —  La bufera dell’inferno non si ferma mai: trascina le anime nel suo turbine, le rivolta e le percuote.', 9000);
  if (i === 1) { addTornados(CH[1], 2); say('Virgilio: «Io venni in loco d’ogne luce muto, che mugghia come fa mar per tempesta…»  —  Giungo in un luogo muto di ogni luce, che ruggisce come il mare in tempesta. Attento ai vortici!', 8000); }
  if (i === 2) say('Virgilio: «Elena vedi, per cui tanto reo tempo si volse…»  —  Vedi Elena, per cui il tempo fu così funesto. Sconfiggi i custodi della sala.', 7000);
  if (i === 3) { addTornados(CH[3], 3); say('Virgilio: «Quando giungon davanti a la ruina, quivi le strida, il compianto, il lamento…»  —  Davanti alla frana, qui sono le grida, il pianto, il lamento. Un campione della tempesta ti attende.', 8500); }
  if (i === 4) { addTornados(CH[4], 3); say('Semiramide: «A vizio di lussuria fu sì rotta, che libito fé licito in sua legge…»  —  Fu talmente rotta al vizio che rese lecito il piacere nelle sue leggi. Attenta, Dante: la bufera ti attira!', 9000); }
}
/* ================= Cerchio III: i Golosi (pioggia eterna, fango, Cerbero) ================= */
const BOSS_BY = { 1: 'boss', 2: 'boss2', 3: 'boss3' };
Object.assign(TYPES, {
  hound:   { model: 'mDino', tintReal: 0x8a6a4a, name: 'Cane Infernale', hp: 14, speed: 7.4, h: 1.3, r: 0.5, dmg: 7, reach: 1.4, wind: 0.35, xp: 12, poise: 0.2, glow: 0xa08040 },
  wretch:  { model: 'mTribal', tintReal: 0x7a9a5a, name: 'Anima Fangosa', hp: 26, speed: 4.4, h: 1.7, r: 0.6, dmg: 10, reach: 1.5, wind: 0.45, xp: 15, poise: 0.28, glow: 0x78b050 },
  glutton: { model: 'mOrcSkull', tintReal: 0x8aa070, name: 'Ingordo', hp: 78, speed: 3.1, h: 3.0, r: 1.0, dmg: 22, reach: 2.3, wind: 0.7, xp: 38, poise: 0.14, glow: 0x80b060 },
  elite3:  { model: 'mOrc', tintReal: 0x6a7a4a, name: 'Divoratore', hp: 260, speed: 3.9, h: 3.9, r: 1.2, dmg: 28, reach: 2.8, wind: 0.6, xp: 140, poise: 0.06,
             elite: true, slam: 6.5, slamR: 4.4, slamD: 26, emis: 0x60b030, emisK: 0.3, glow: 0x90d050 },
  boss3:   { model: 'mDemon', tintReal: 0x6a4a30, name: 'CERBERO, IL GRAN VERME', hp: 1800, speed: 3.8, h: 6.6, r: 2.1, dmg: 38, reach: 4.0, wind: 0.85, xp: 800, poise: 0,
             boss: true, slam: 4.2, slamR: 5.4, slamD: 30, heads: 3, mud: true, emis: 0x8a3010, emisK: 0.35, glow: 0xff7030, summon: 'hound' }
});
const PACKS3 = { 0: { hound: 6, wretch: 3 }, 1: { wretch: 6, hound: 5, glutton: 2 }, 2: { wretch: 5, hound: 3, glutton: 1 }, 3: { hound: 8, wretch: 6, glutton: 4, elite3: 1 }, 4: { boss: 1 } };
const PACKS_BY = { 2: PACKS2, 3: PACKS3 };
const fxRain = new Emitter('trace_01', true, 900);                  // strisce di pioggia
function addMud(x, z, r, life = Infinity) {                         // pozza di fango: rallenta chi ci cammina dentro
  if (!G.mud) G.mud = [];
  const geo = new THREE.CircleGeometry(r, 40); geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x4c3a20, roughness: 0.16, metalness: 0.15, transparent: true, opacity: 0.92,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
  mesh.position.set(x, 0.02, z); mesh.receiveShadow = true; scene.add(mesh);
  G.mud.push({ x, z, r, t: life, mesh });
}
function addMudField(c, n) {
  const spots = (c.spots || []).map(([dx, dz]) => [c.x + dx, c.z + dz]);
  let tries = 0, placed = 0;
  while (placed < n && tries++ < 160) {
    const ang = R(0, 6.283), d = Math.sqrt(R(0, 1)) * c.r * 0.95, x = c.x + Math.sin(ang) * d, z = c.z + Math.cos(ang) * d, r = R(2.4, 4.4);
    if (!inShapes(c, x, z, r * 0.55) || !awayFromMouths(c, ang, d)) continue;
    if (c.pitA && Math.hypot(x - c.pitA.x, z - c.pitA.z) < c.pitA.r + r + 1) continue;
    if (spots.some(([sx, sz]) => Math.hypot(x - sx, z - sz) < r + 3)) continue;
    if ((G.mud || []).some(m => Math.hypot(m.x - x, m.z - z) < m.r + r + 1)) continue;
    addMud(x, z, r); placed++;
  }
}
function updateSwamp(dt) {
  fxRain.update(dt);
  if (G.circle !== 3) return;
  // pioggia eterna, maladetta, fredda e greve
  G.rainAcc = (G.rainAcc || 0) + dt * 150;
  while (G.rainAcc >= 1) {
    G.rainAcc -= 1; const y = R(12, 20), vy = -38;
    fxRain.spawn(P.pos.x + R(-24, 24), y, P.pos.z + R(-24, 24), 2, vy, -2, (y - 0.3) / -vy, 2.1, 2.1, 1.2, 1.5, 2.2, 0.65, 0, 0, 0);
    fxRain.rot[(fxRain.i - 1) % fxRain.max] = 0;                    // la striscia resta verticale
  }
  G.splashAcc = (G.splashAcc || 0) + dt * 40;
  while (G.splashAcc >= 1) { G.splashAcc -= 1; fxSpark.spawn(P.pos.x + R(-20, 20), 0.1, P.pos.z + R(-20, 20), R(-1, 1), R(1, 2.5), R(-1, 1), 0.3, 0.2, 0.02, 0.8, 1, 1.4, 0.7, 0, 8, 0.5); }
  // fango
  let inMud = false;
  for (const m of (G.mud || [])) {
    if (m.t !== Infinity) { m.t -= dt; if (m.t < 2) m.mesh.material.opacity = 0.92 * Math.max(0, m.t / 2); if (m.t <= 0) { scene.remove(m.mesh); m.dead = true; continue; } }
    if (!P.dead && Math.hypot(P.pos.x - m.x, P.pos.z - m.z) < m.r - 0.3) inMud = true;
  }
  if (G.mud) G.mud = G.mud.filter(m => !m.dead);
  if (inMud && !P.dead) {
    P.pos.x -= P.vel.x * dt * 0.55; P.pos.z -= P.vel.z * dt * 0.55; resolveWorld(P.pos, 0.5);   // passo rallentato
    if (Math.random() < dt * 22) fxSmoke.spawn(P.pos.x, 0.15, P.pos.z, R(-1, 1), R(0.5, 1.5), R(-1, 1), 0.6, 0.5, 1.3, 0.16, 0.11, 0.06, 0.55, 0, 0, 1);
    if (!G.mudToast) { G.mudToast = true; toast('<b>Fango</b><small>Le pozze rallentano il tuo passo</small>', '#a08050', 4500); }
  }
  // grandine: cerchi di avvertimento sopra e attorno a Dante, tranne nella sala di Ciacco (al riparo)
  G.hailT = (G.hailT === undefined ? 8 : G.hailT) - dt;
  if (G.hailT <= 0 && !P.dead && chamberAt(P.pos.x, P.pos.z) !== 2) {
    G.hailT = R(9, 13); popup(P.pos.x, 3, P.pos.z, 'GRANDINE!', 'hurt');
    for (let k = 0; k < 7; k++) { const hp = new V3(P.pos.x + R(-10, 10), 0, P.pos.z + R(-10, 10)); nearestWalk(hp, 0.5); addTele(hp.x, hp.z, 1.6, 1.0 + k * 0.1, 12, null); }
  }
}
function circle3Enter(i) {
  const n = [3, 6, 0, 6, 5][i] || 0; if (n) addMudField(CH[i], n);
  if (i === 0) say('«Grandine grossa, acqua tinta e neve per l’aere tenebroso si riversa; pute la terra che questo riceve.»  —  Grandine grossa, acqua sporca e neve cadono dall’aria buia; la terra che le accoglie puzza.', 9000);
  if (i === 1) say('Virgilio: «Cerbero, fiera crudele e diversa, con tre gole caninamente latra sovra la gente che quivi è sommersa.»  —  Cerbero, belva crudele e mostruosa, latra con tre gole sulle anime sommerse. Attento al fango!', 9000);
  if (i === 2) say('Ciacco: «Voi cittadini mi chiamaste Ciacco: per la dannosa colpa de la gola, come tu vedi, a la pioggia mi fiacco.»  —  Voi fiorentini mi chiamaste Ciacco: per la colpa della gola, come vedi, mi accascio sotto la pioggia.', 9000);
  if (i === 3) say('Virgilio: «Noi passavam su per l’ombre che adona la greve pioggia, e ponavam le piante sovra lor vanità che par persona.»  —  Passiamo sulle ombre piegate dalla pioggia pesante, calpestando la loro vanità che sembra persona. Un divoratore ti attende.', 9500);
  if (i === 4) say('Virgilio: «Cerbero, il gran vermo, la bocca aperse e mostrocci le sanne; non avea membro che tenesse fermo.»  —  Cerbero, il grande verme, aprì la bocca e mostrò le zanne; non aveva membro che stesse fermo. Le sue tre teste colpiranno insieme!', 10000);
}

/* transizione dal portale del primo cerchio */
const fadeEl = () => $('fade') || (() => { const d = document.createElement('div'); d.id = 'fade'; d.style.cssText = 'position:fixed;inset:0;background:#000;pointer-events:none;opacity:0;z-index:5'; document.body.appendChild(d); return d; })();
const LAST_CIRCLE = 3;
function portalEnter() { if ((G.circle || 1) >= LAST_CIRCLE) win(); else startCircle((G.circle || 1) + 1); }
function startCircle(n) {
  G.state = 'transition'; G.trans = { t: 0, phase: 0, to: n };
  const f = fadeEl(); f.style.transition = 'opacity 1.2s'; f.style.opacity = 1;
}
const startCircle2 = () => startCircle(2), startCircle3 = () => startCircle(3);
function updateTransition(dt) {
  const T = G.trans; if (!T) { G.state = 'play'; return; }
  T.t += dt;
  if (T.phase === 0 && T.t > 1.4) { switchToCircle(T.to || 2); T.phase = 1; T.t = 0; fadeEl().style.opacity = 0; }
  else if (T.phase === 1 && T.t > 1.3) { G.state = 'play'; G.trans = null; }
}
const switchToCircle2 = () => switchToCircle(2);
function switchToCircle(n) {
  for (const e of G.enemies) { scene.remove(e.actor.root); scene.remove(e.halo); if (e.bar) e.bar.remove(); }
  G.enemies.length = 0;
  for (const l of G.loot) scene.remove(l.g); G.loot.length = 0;
  for (const t of G.tele) scene.remove(t.grp); G.tele.length = 0;
  for (const s of G.shots) scene.remove(s.m); G.shots.length = 0;
  for (const r of G.rings) scene.remove(r.m); G.rings.length = 0;
  for (const a of G.arcs) scene.remove(a.m); G.arcs.length = 0;
  for (const p of G.pedestals) { scene.remove(p.orb); scene.remove(p.base); scene.remove(p.lab); }
  G.pedestals = []; G.enigma = null;
  if (G.portal) { scene.remove(G.portal.grp); G.portal = null; }
  for (const t of (G.tornados || [])) scene.remove(t.m);                        // vortici e fango del cerchio precedente
  for (const m of (G.mud || [])) scene.remove(m.mesh);
  G.circle = n; G.stage = 0; G.reached = -1; G.bossDead = false; G.tornados = []; G.wind = null; G.mud = []; G.hailT = 8;
  CH.length = 0; MAPS[n].forEach(d => CH.push(Object.assign({}, d)));            // le mappe vengono da maps.js
  indexWorld(); buildWorld();
  for (const k of Object.keys(PACKS)) delete PACKS[k]; Object.assign(PACKS, PACKS_BY[n]);
  applyTheme(n);
  P.pos.set(CH[0].x, 0, CH[0].z + 3); P.vel.set(0, 0, 0); P.checkpoint.copy(P.pos); camTarget.copy(P.pos);
  P.hp = P.max; P.fede = 60; P.potions = Math.max(P.potions, 3); P.inv = 2; P.dead = false;
  banner('CERCHIO ' + ['', 'I', 'II', 'III'][n], CINFO_[n].title.split('— ')[1].toUpperCase());
}
window.__c2 = { startCircle2, switchToCircle2, startGust, get wind() { return G.wind; } };
window.__c3 = { startCircle3, startCircle, switchToCircle, addMud, get mud() { return G.mud; } };

/* ================= ciclo principale ================= */
const camTarget = new V3();
function updateCamera(dt) {
  camTarget.lerp(window.__focus || P.pos, 1 - Math.exp(-7 * dt));
  camera.position.copy(camTarget).addScaledVector(CAM_OFF, window.__zoom || 1);
  camera.lookAt(camTarget);
  followSun(camTarget);
}
function updateLights(dt) {
  G.lightT -= dt;
  if (G.lightT <= 0) {
    G.lightT = 0.3;
    const sorted = braziers.slice().sort((a, b) => Math.hypot(a.x - P.pos.x, a.z - P.pos.z) - Math.hypot(b.x - P.pos.x, b.z - P.pos.z));
    lightPool.forEach((l, i) => { const b = sorted[i]; l.userData.b = b; if (b) l.position.set(b.x, b.y, b.z); });
  }
  lightPool.forEach(l => { const b = l.userData.b; if (!b) return; const f = 1 + Math.sin(G.time * 9 + b.ph) * 0.12 + Math.sin(G.time * 23 + b.ph) * 0.06; l.intensity = 90 * f; });
  // fiamme vere dei bracieri (solo quelli vicini al giocatore)
  for (const b of braziers) {
    if (Math.abs(b.x - P.pos.x) > 42 || Math.abs(b.z - P.pos.z) > 42) continue;
    b.acc += dt * 15; b.glowT -= dt;
    while (b.acc >= 1) {
      b.acc -= 1;
      fxFlame.spawn(b.x + R(-0.25, 0.25) * b.s, 1.5 * b.s, b.z + R(-0.25, 0.25) * b.s, R(-0.2, 0.2), R(1.2, 2.2), R(-0.2, 0.2),
        R(0.5, 0.85), 1.9 * b.s, 0.5 * b.s, FLAMEC[0], FLAMEC[1], FLAMEC[2], 0.9, 0, -0.4, 0.5);
      if (Math.random() < 0.18) fxSpark.spawn(b.x, 2.6 * b.s, b.z, R(-1, 1), R(2, 4), R(-1, 1), R(0.7, 1.4), 0.3, 0.05, 3.2, 1.4, 0.4, 1, 0, 3, 0.3);
    }
    if (b.glowT <= 0) { b.glowT = 0.12; fxGlow.spawn(b.x, 2.4 * b.s, b.z, 0, 0, 0, 0.22, 4.4 * b.s, 5.6 * b.s, FLAMEC[0] * 0.6, FLAMEC[1] * 0.52, FLAMEC[2] * 0.7, 0.32); }
  }
}
const clock = new THREE.Clock();
function update(dt) {
  G.time += dt;
  if (G.msgT > 0) { G.msgT -= dt; if (G.msgT <= 0) $('msg').style.opacity = 0; }
  if (G.state === 'play' || G.state === 'dead') {
    updatePlayer(dt); updateEnemies(dt); updateTele(dt); updateShots(dt); updateLoot(dt); updateEnigma(dt); updateStages(dt);
    updateWind(dt); updateHazards(dt); updateSwamp(dt);
  } else { if (G.state === 'transition') updateTransition(dt); if (P.actor) P.actor.mixer.update(dt); }
  updateLights(dt);
  if (Math.random() < 0.35) emit(P.pos.x + R(-25, 25), 0.2, P.pos.z + R(-25, 25), 1, 0xff5a1a, 0.5, 3, 2.2);
  updateParticles(dt);
  if (G.state === 'intro' && window.__story) window.__story.update(dt); else updateCamera(dt);   // in intro la camera è della sequenza
  updateHUD(); updateOverlays(dt);
  const boss = G.enemies.find(e => e.T.boss && !e.dead);
  $('boss').style.display = boss && boss.state !== 'idle' ? 'block' : 'none';
  if (boss) { $('bossname').textContent = boss.T.name; $('bossfill').style.width = Math.max(0, boss.hp / boss.T.hp * 100) + '%'; }
  G.minimapT -= dt; if (G.minimapT <= 0) { G.minimapT = 0.12; drawMinimap(); $('obj').textContent = objectiveText(); }
  hurtK = Math.max(0, hurtK - dt * 3);
  grade.uniforms.uHurt.value = hurtK * 0.5; grade.uniforms.uTime.value = G.time % 100;
  lavaFlow.uniforms.uTime.value = G.time;
}
window.__step = (dt = 0.05, n = 1) => { for (let i = 0; i < n; i++) update(dt); };
window.__cmd = { slash, fire, dash, turbine, nova, usePotion, dropItem, dropPotion, addXp, spawnEnemy, startCircle };
/* ponte verso story.js (intro e racconto): espone solo ciò che serve */
function beginPlay() {
  $('title').style.display = 'none'; G.state = 'play';
  if (OVERRIDDEN) toast('<b>Mappe dell’editor attive</b><small>Aggiungi ?maps=default all’indirizzo per usare maps.js</small>', '#7ab4ff', 6000);
  enterChamber(0); G.reached = 0;
  banner('LA SELVA OSCURA', 'CERCHIO I · LIMBO — 1/5');
  $('zname').textContent = 'Cerchio I — Limbo'; $('zsub').textContent = CH[0].name;
  say('Virgilio: «A te convien tenere altro vïaggio»  —  Devi seguire un’altra strada, Dante. Impugna la spada: i dannati ci hanno sentiti.', 7000);
}
window.__game = { THREE, scene, camera, renderer, P, G, CH, obstacles, Rs, R, clamp, angDiff, col, torch, CAM_OFF,
  say, banner, toast, sfx, emit, tone, play, followSun, beginPlay,
  Emitter, ftex, fxSpark, fxFire, fxFlame, fxSmoke, fxGlow, fireBurst, flash, addRing, LINKS,
  models, TYPES, makeActor, composer, resolveWorld, recomputeStats, itemLines, hexs, popup, genItem, dropItem, dropPotion, RAR };   // per fx.js (effetti aggiuntivi) e bestiario.js (mostri della Commedia)
function frame() {
  requestAnimationFrame(frame);
  update(Math.min(clock.getDelta(), 0.05));
  composer.render();
}

/* ================= input ================= */
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (e.repeat && k !== 'q') { keys[k] = true; return; }
  keys[k] = true;
  if (G.state === 'intro') { if (k === ' ' || k === 'escape' || k === 'enter') { e.preventDefault(); window.__story && window.__story.skip(); } return; }
  if (G.state !== 'play') return;
  if (k === ' ') { e.preventDefault(); dash(); }
  if (k === '1') turbine();
  if (k === '2') nova();
  if (k === 'r') usePotion();
  if (k === 'tab') { e.preventDefault(); const i = $('inv'); i.style.display = i.style.display === 'block' ? 'none' : 'block'; }
  if (k === 'h' && G.enigma && G.enigma.started && !G.enigma.solved) {
    const hints = ENIG().hints;
    say(hints[Math.min(G.enigma.hint++, 2)], 6000);
  }
});
addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
addEventListener('mousedown', e => { if (e.button === 0) mouse.down = true; if (e.button === 2) mouse.right = true; });
addEventListener('mouseup', e => { if (e.button === 0) mouse.down = false; if (e.button === 2) mouse.right = false; });
addEventListener('contextmenu', e => e.preventDefault());
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.down = mouse.right = false; });
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); setFxScale();
});

/* ================= avvio ================= */
function buildStoneUI() {                       // sostituito da hud.js (texture di pietra e pergamena disegnate al volo)
  if (window.__hudCustom !== false) return;
  const im = new Image();
  im.onload = () => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 96;
    c.getContext('2d').drawImage(im, 250, 16, 256, 96, 0, 0, 256, 96);
    document.documentElement.style.setProperty('--stone', `url(${c.toDataURL()})`);
    document.querySelectorAll('.slot').forEach(s => s.style.backgroundImage = `url(${c.toDataURL()})`);
  };
  im.src = './assets/ui/HealthPanel.png';
}
async function init() {
  buildStoneUI();
  await Promise.all([loadModel('dante', './assets/dante.glb'), loadModel('demon', './assets/demone.glb')]);
  await Promise.all([['mDemon', 'Demon'], ['mOrcSkull', 'Orc_Skull'], ['mBlueDemon', 'BlueDemon'], ['mOrc', 'Orc'], ['mBirb', 'Birb'], ['mAlien', 'Alien'], ['mDino', 'Dino'], ['mTribal', 'Tribal'], ['mYeti', 'Yeti']]
    .map(([k, f]) => loadModel(k, `./assets/monsters/${f}.gltf`).catch(err => console.warn('modello non caricato', f, err.message))));
  initPlayer(); camTarget.copy(P.pos);
  $('title').innerHTML = `<h1>INFERNO</h1><h2>Nel mezzo del cammin di nostra vita…</h2>
    <p><b>WASD</b> muoviti · <b>mouse</b> mira · <b>click sinistro</b> spada · <b>click destro / Q</b> Fuoco di Virgilio</p>
    <p><b>1</b> Turbine di Fuoco · <b>2</b> Grido del Giudizio · <b>Spazio</b> scatto · <b>R</b> pozione · <b>Tab</b> equipaggiamento · <b>H</b> aiuto di Virgilio</p>
    <p>Esplora il Limbo, raccogli l’equipaggiamento, sconfiggi Minosse.</p>
    <button id="go">ENTRA NELL'INFERNO</button>`;
  $('go').onclick = () => {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (window.__story) window.__story.startIntro(); else beginPlay();       // intro nella selva oscura (story.js)
  };
  G.state = 'title';
  frame();
}
init().catch(err => { $('loadtxt') && ($('loadtxt').textContent = 'Errore: ' + err.message); console.error(err); });
