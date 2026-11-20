/* ============================================================
   dante.js — il modello di Dante
   Veste lo scheletro animato del soldato (Mixamo) con un Dante
   costruito a mano: cappuccio rosso, lucco (la lunga veste rossa),
   corona d'alloro, volto con naso aquilino, maniche ampie, calzari.
   Ogni pezzo è agganciato a un osso, quindi segue tutte le animazioni.
   Usato dal gioco (via story.js) e dal laboratorio (dante-lab.html).
   ============================================================ */
import * as THREE from 'three';
const V3 = THREE.Vector3;

const mat = (color, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.85, metalness: 0 }, o));
export const DANTE_MAT = {
  skin: mat(0xd9a581, { roughness: 0.62 }),
  red: mat(0x8c1616, { roughness: 0.95 }),
  redDark: mat(0x590b0b, { roughness: 0.95 }),
  redDeep: mat(0x3c0808, { roughness: 0.95 }),
  hose: mat(0x2e0808, { roughness: 0.95 }),
  leather: mat(0x2d1a11, { roughness: 0.55 }),
  gold: mat(0xc9a24a, { roughness: 0.32, metalness: 0.75 }),
  leaf: mat(0x4f8a2e, { roughness: 0.55 }),
  leafDark: mat(0x356320, { roughness: 0.6 }),
  dark: mat(0x140a08, { roughness: 0.45 }),
  white: mat(0xe9dcc2, { roughness: 0.9 })
};
const M = DANTE_MAT;

export function dressDante(actor, opts = {}) {
  const { root, model } = actor;
  const done = [];
  // 1) via i vecchi accessori improvvisati (cono del mantello, anello d'alloro)
  [...root.children].forEach(c => { if (c.isMesh && (c.geometry.type === 'ConeGeometry' || c.geometry.type === 'TorusGeometry')) root.remove(c); });
  // 2) il soldato originale guarda verso -z: lo giro in modo che "avanti" sia +z come nel gioco
  const bones = {}, skinned = [];
  /* il rig attuale è il "Universal Animation Library" di Quaternius (CC0, ossi DEF-…); i nomi si traducono in quelli usati qui sotto */
  const UAL = { hips: 'Hips', spine001: 'Spine', spine002: 'Spine1', spine003: 'Spine2', neck: 'Neck', head: 'Head', upper_armL: 'LeftArm', forearmL: 'LeftForeArm', handL: 'LeftHand', upper_armR: 'RightArm', forearmR: 'RightForeArm', handR: 'RightHand',
    thighL: 'LeftUpLeg', shinL: 'LeftLeg', footL: 'LeftFoot', toeL: 'LeftToeBase', thighR: 'RightUpLeg', shinR: 'RightLeg', footR: 'RightFoot', toeR: 'RightToeBase' };
  let ual = false;
  model.traverse(o => {
    if (o.isBone) { const n = o.name.replace('mixamorig', ''); if (n.startsWith('DEF-')) { const m = UAL[n.slice(4).replace(/\./g, '')]; if (m) { bones[m] = o; ual = true; } } else bones[n] = o; }
    if (o.isSkinnedMesh) skinned.push(o);
  });
  model.rotation.y = ual ? 0 : Math.PI;                                       // il vecchio soldato guardava verso -z; il rig UAL guarda già verso +z
  skinned.forEach(m => { m.skeleton.pose(); m.visible = false; });         // posa di riferimento (T-pose) e nascondo l'armatura
  root.updateMatrixWorld(true);
  const P = n => root.worldToLocal(bones[n].getWorldPosition(new V3()));
  const finish = (obj, bone) => {
    obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
    root.add(obj); obj.updateMatrixWorld(true); bones[bone].attach(obj); done.push(obj); return obj;
  };
  const ball = (p, r, m, bone, sx = 1, sy = 1, sz = 1) => {
    const o = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), m); o.position.copy(p); o.scale.set(sx, sy, sz); return finish(o, bone);
  };
  const seg = (a, b, r0, r1, m, bone) => {                                   // tronco di cono da a (raggio r0) a b (raggio r1)
    const d = new V3().subVectors(b, a), len = d.length();
    const o = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, len, 16, 1), m);
    o.position.copy(a).addScaledVector(d, 0.5); o.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize());
    return finish(o, bone);
  };
  const lathe = (pts, m, bone, sx = 1, sz = 1, folds = 0, fw = null, seg_ = 72) => {
    const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg_);
    if (folds) {                                  // pieghe verticali della stoffa + colore di vertice: le "valli" sono più scure (si leggono anche con luce piatta)
      const pa = g.attributes.position, col = new Float32Array(pa.count * 3);
      for (let i = 0; i < pa.count; i++) {
        const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i), a = Math.atan2(x, z);
        const w = fw ? fw(y) : Math.min(1, Math.max(0, (1.08 - y) / 0.8));        // ampiezza: cresce verso l'orlo
        const wave = 0.6 * Math.sin(7 * a + y * 2.5) + 0.4 * Math.sin(13 * a - y * 4);
        const k = 1 + folds * w * wave;
        pa.setX(i, x * k); pa.setZ(i, z * k);
        col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 1 - 0.55 * Math.max(w, 0.3) * (0.5 - 0.5 * wave);
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
      m = m.clone(); m.vertexColors = true;
    }
    const o = new THREE.Mesh(g, m); o.scale.set(sx, 1, sz); return finish(o, bone);
  };
  /* ritardo elastico (inerzia) di un punto: restituisce, nel sistema locale di ref, di quanto la stoffa "resta indietro" */
  const makeLag = (ref, k = 55, c = 8.5, gain = 0.032, max = 0.26) => {
    const prev = ref.getWorldPosition(new V3()), now = new V3(), S = new V3(), Vs = new V3(), tgt = new V3(), acc = new V3();
    return dt => {
      ref.getWorldPosition(now);
      const lp = ref.worldToLocal(prev.clone());                 // dove ero un attimo fa, visto da qui (in metri)
      prev.copy(now);
      tgt.copy(lp).multiplyScalar(gain / dt); if (tgt.length() > max) tgt.setLength(max);
      acc.copy(tgt).sub(S).multiplyScalar(k).addScaledVector(Vs, -c);     // molla smorzata, con un leggero rimbalzo
      Vs.addScaledVector(acc, dt); S.addScaledVector(Vs, dt);
      return S;
    };
  };
  const torus = (R, tube, y, m, bone, sx = 1, sz = 1, z = 0) => {
    const o = new THREE.Mesh(new THREE.TorusGeometry(R, tube, 10, 40), m); o.rotation.x = Math.PI / 2; o.position.set(0, y, z); o.scale.set(sx, sz, 1);
    return finish(o, bone);
  };

  /* ---------- testa ---------- */
  const hp = P('Head'), hc = new V3(hp.x, hp.y + 0.125, hp.z + 0.05);
  ball(hc, 0.104, M.skin, 'Head', 0.9, 1.13, 1.0);                                              // cranio e viso
  ball(hc.clone().add(new V3(0, -0.078, 0.042)), 0.05, M.skin, 'Head', 1.05, 0.85, 0.95);      // mento forte
  for (const s of [-1, 1]) {
    ball(hc.clone().add(new V3(s * 0.04, 0.02, 0.087)), 0.012, M.dark, 'Head');                // occhi
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.008, 0.012), M.dark);           // sopracciglia severe
    brow.position.copy(hc).add(new V3(s * 0.04, 0.043, 0.093)); brow.rotation.z = s * -0.18; finish(brow, 'Head');
    ball(hc.clone().add(new V3(s * 0.094, -0.012, -0.005)), 0.022, M.skin, 'Head', 0.5, 1.0, 0.8);   // orecchie
    ball(hc.clone().add(new V3(s * 0.058, -0.004, 0.066)), 0.026, M.skin, 'Head', 1, 0.6, 0.7);        // zigomi alti e scavati
    ball(hc.clone().add(new V3(s * 0.058, -0.066, 0.026)), 0.024, M.skin, 'Head', 0.8, 1.1, 0.9);      // linea della mascella
  }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.019, 0.068, 10), M.skin);                // naso aquilino
  nose.rotation.x = Math.PI / 2 + 0.5; nose.position.copy(hc).add(new V3(0, -0.012, 0.104)); finish(nose, 'Head');
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.02), M.skin);
  bridge.position.copy(hc).add(new V3(0, 0.02, 0.1)); bridge.rotation.x = -0.25; finish(bridge, 'Head');
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.005, 0.008), mat(0x5a2a22));
  mouth.position.copy(hc).add(new V3(0, -0.056, 0.086)); finish(mouth, 'Head');
  // collo
  seg(new V3(hp.x, hp.y - 0.05, hp.z), new V3(hc.x, hc.y - 0.065, hc.z - 0.012), 0.05, 0.045, M.skin, 'Neck');

  /* cappuccio rosso: calotta inclinata (alta sulla fronte, bassa sulla nuca) con cercine arrotolato e corona d'alloro sul bordo */
  const CAP_R = 0.122, CAP_T = Math.PI * 0.56, CAP_SZ = 1.1, CAP_SY = 1.04;
  const cap = new THREE.Group(); cap.position.copy(hc).add(new V3(0, 0.02, -0.03)); cap.rotation.x = -0.5;
  const domeMat = M.red.clone(); domeMat.side = THREE.DoubleSide;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(CAP_R, 32, 20, 0, Math.PI * 2, 0, CAP_T), domeMat);
  dome.scale.set(1.0, CAP_SY, CAP_SZ); cap.add(dome);
  const rimR = CAP_R * Math.sin(CAP_T), rimY = CAP_R * CAP_SY * Math.cos(CAP_T);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(rimR, 0.017, 12, 48), M.redDark);      // cercine arrotolato del cappuccio
  rim.rotation.x = Math.PI / 2; rim.position.y = rimY; rim.scale.set(1.0, CAP_SZ, 1); cap.add(rim);
  const wy = rimY + 0.028, wr = Math.sqrt(Math.max(1e-6, CAP_R * CAP_R - (wy / CAP_SY) ** 2)) * 1.015;   // alloro: sulla calotta, appena sopra il cercine
  const ring = new THREE.Mesh(new THREE.TorusGeometry(wr, 0.0085, 8, 48), M.leafDark);
  ring.rotation.x = Math.PI / 2; ring.position.y = wy; ring.scale.set(1.0, CAP_SZ, 1); cap.add(ring);
  for (let i = 0; i < 28; i++) {
    const a = i / 28 * Math.PI * 2, odd = i % 2;
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.0125, 8, 6), odd ? M.leaf : M.leafDark);
    leaf.scale.set(0.45, 0.2, 1.8);
    leaf.position.set(Math.sin(a) * wr, wy + (odd ? 0.007 : -0.002), Math.cos(a) * wr * CAP_SZ);
    leaf.rotation.set(odd ? 0.35 : -0.2, a + (odd ? 0.45 : -0.45) + Math.PI / 2, 0); cap.add(leaf);
  }
  finish(cap, 'Head');
  // la "foggia": la lunga coda del cappuccio che ricade sulla spalla sinistra (affusolata, in due tratti)
  const tail = new THREE.Group();
  const tg1 = new THREE.CylinderGeometry(0.045, 0.034, 0.2, 10), t1 = new THREE.Mesh(tg1, M.red); t1.position.set(0, -0.1, 0); t1.scale.z = 0.5;
  const t2 = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.016, 0.22, 10), M.redDark); t2.position.set(0.012, -0.3, 0.012); t2.scale.z = 0.5; t2.rotation.z = -0.1;
  tail.add(t1, t2); tail.rotation.set(0.15, 0.2, -0.12);
  const tailPivot = new THREE.Group(); tailPivot.position.copy(hc).add(new V3(0.088, -0.02, -0.07)); tailPivot.add(tail);   // perno: la coda oscilla con la testa
  finish(tailPivot, 'Head');
  const tailBase = tailPivot.quaternion.clone(), tailLag = makeLag(tailPivot, 70, 6, 0.55, 0.35), tq = new THREE.Quaternion(), te = new THREE.Euler();
  const tailSway = dt => { const S = tailLag(dt); tailPivot.quaternion.copy(tailBase).multiply(tq.setFromEuler(te.set(-S.z * 2.6, 0, S.x * 2.6))); };

  /* ---------- il lucco: busto, gonna, cintura, collo alto ---------- */
  lathe([[0.001, 1.512], [0.062, 1.508], [0.115, 1.49], [0.175, 1.46], [0.212, 1.415], [0.205, 1.35], [0.19, 1.27], [0.18, 1.2], [0.2, 1.145], [0.178, 1.1], [0.185, 1.045]], M.red, 'Spine1', 1.0, 0.92,
    0.03, y => Math.min(1, Math.max(0, (1.36 - y) / 0.3)));      // il busto si arriccia sopra la cintura (stoffa raccolta in vita)
  /* petto e pancia: il lucco copre un torace pieno e una pancia da uomo di mezza età (prima il busto era una colonna piatta) */
  const chestBall = ball(new V3(0, 1.34, 0.045), 0.17, M.red, 'Spine2', 1.3, 0.92, 1.0);
  ball(new V3(-0.075, 1.36, 0.1), 0.085, M.redDark, 'Spine2', 1.0, 0.8, 0.8); ball(new V3(0.075, 1.36, 0.1), 0.085, M.redDark, 'Spine2', 1.0, 0.8, 0.8);   // pieghe del petto sotto la stoffa
  ball(new V3(0, 1.07, 0.06), 0.18, M.red, 'Spine1', 1.08, 1.0, 1.0);                                           // la pancia
  const skirtMat = M.red.clone(); skirtMat.side = THREE.DoubleSide;
  const skirt = lathe([[0.185, 1.07], [0.2, 1.0], [0.232, 0.86], [0.27, 0.62], [0.31, 0.4], [0.335, 0.24], [0.34, 0.2]], skirtMat, 'Hips', 1.0, 0.9, 0.09);
  // gonna dinamica: l'orlo resta indietro quando corri, segue i passi delle gambe e respira da fermo
  const skirtCloth = (() => {
    const pos = skirt.geometry.attributes.position, base = Float32Array.from(pos.array), n = pos.count;
    const W = new Float32Array(n), A = new Float32Array(n);
    for (let i = 0; i < n; i++) { W[i] = Math.pow(Math.min(1, Math.max(0, (1.06 - base[i * 3 + 1]) / 0.86)), 1.6); A[i] = Math.atan2(base[i * 3], base[i * 3 + 2]); }
    const lag = makeLag(skirt), tmp = new V3(), fw = new V3();
    const rest = { L: skirt.worldToLocal(bones.LeftFoot.getWorldPosition(new V3())), R: skirt.worldToLocal(bones.RightFoot.getWorldPosition(new V3())) };
    const fL = new V3(), fR = new V3(); let t = 0;
    return dt => {
      t += dt; const S = lag(dt);
      fL.copy(skirt.worldToLocal(bones.LeftFoot.getWorldPosition(tmp.set(0, 0, 0)))).sub(rest.L);
      fR.copy(skirt.worldToLocal(bones.RightFoot.getWorldPosition(fw.set(0, 0, 0)))).sub(rest.R);
      for (let i = 0; i < n; i++) {
        const w = W[i], a = A[i], nx = Math.sin(a), nz = Math.cos(a);
        let dx = S.x * w, dy = S.y * w * 0.5, dz = S.z * w;
        const pushL = Math.max(0, fL.x * nx + fL.z * nz) * (0.5 + 0.5 * Math.cos(a - Math.PI / 2)) * w * w * 1.2;     // l'orlo si apre dove il piede avanza
        const pushR = Math.max(0, fR.x * nx + fR.z * nz) * (0.5 + 0.5 * Math.cos(a + Math.PI / 2)) * w * w * 1.2;
        const br = Math.sin(t * 1.7 + a * 2) * 0.006 * w + pushL + pushR;
        pos.setXYZ(i, base[i * 3] + dx + nx * br, base[i * 3 + 1] + dy, base[i * 3 + 2] + dz + nz * br);
      }
      pos.needsUpdate = true; skirt.geometry.computeVertexNormals(); skirt.geometry.computeBoundingSphere();
    };
  })();
  torus(0.34, 0.02, 0.205, M.redDark, 'Hips', 1.0, 0.9);                                       // bordo della veste
  torus(0.192, 0.018, 1.1, M.leather, 'Spine1', 1.0, 0.76);                                    // cintura (stesso osso del busto, altrimenti si stacca)
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.04, 0.012), M.gold); buckle.position.set(0, 1.1, 0.148); finish(buckle, 'Spine1');
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.26, 6), M.gold); cord.position.set(0.05, 0.95, 0.15); finish(cord, 'Hips');
  torus(0.088, 0.032, 1.49, M.redDark, 'Spine2', 1.0, 0.85, 0.0);                              // colletto
  // mantellina sulle spalle
  const cape = new THREE.Mesh(new THREE.SphereGeometry(0.235, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), M.redDark);
  cape.material = M.redDark.clone(); cape.material.side = THREE.DoubleSide; cape.scale.set(0.82, 0.55, 0.7); cape.position.set(0, 1.43, -0.015); finish(cape, 'Spine2');
  // il libro: la Commedia appesa alla cintura, rilegata in cuoio con fermaglio d'oro
  const book = new THREE.Group();
  const cover = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.17, 0.04), M.leather), pages = new THREE.Mesh(new THREE.BoxGeometry(0.118, 0.158, 0.034), M.white);
  const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.04, 0.046), M.gold); clasp.position.set(0.065, 0, 0);
  book.add(cover, pages, clasp); book.position.set(-0.2, 0.93, 0.07); book.rotation.set(0.05, 0.4, -0.12); finish(book, 'Hips');

  /* ---------- braccia: maniche ampie, mani ---------- */
  for (const s of ['Left', 'Right']) {
    const sh = P(s + 'Arm'), el = P(s + 'ForeArm'), wr = P(s + 'Hand');
    ball(sh, 0.082, M.red, s + 'Arm');
    seg(sh, el, 0.074, 0.078, M.red, s + 'Arm');
    ball(el, 0.074, M.red, s + 'ForeArm');
    seg(el, wr, 0.074, 0.105, M.red, s + 'ForeArm');                                          // manica che si allarga verso il polso
    const dir = new V3().subVectors(wr, el).normalize();
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.103, 0.015, 10, 32), M.redDark);   // risvolto del polsino
    cuff.position.copy(wr); cuff.quaternion.setFromUnitVectors(new V3(0, 0, 1), dir);        // l'asse del torus (z) segue il braccio
    finish(cuff, s + 'ForeArm');
    ball(wr.clone().addScaledVector(dir, 0.06), 0.046, M.skin, s + 'Hand', 1, 1.15, 0.7);        // mano
    ball(wr.clone().addScaledVector(dir, 0.115), 0.032, M.skin, s + 'Hand', 1, 1.4, 0.55);       // dita
  }
  /* ---------- gambe: calze rosse scure e calzari ---------- */
  for (const s of ['Left', 'Right']) {
    const hip = P(s + 'UpLeg'), kn = P(s + 'Leg'), an = P(s + 'Foot'), toe = P(s + 'ToeBase');
    // cosce e ginocchia restano nascoste dentro la veste: solo gli stinchi e i calzari escono dall'orlo
    seg(kn.clone().lerp(an, 0.86), an, 0.05, 0.046, M.hose, s + 'Leg');                    // solo il tratto sotto l'orlo (y≈0.19)
    const dir = new V3().subVectors(toe, an), L = dir.length() + 0.1;
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.085, L), M.leather);
    shoe.position.copy(an).addScaledVector(dir.clone().normalize(), L * 0.5 - 0.02).add(new V3(0, -0.012, 0));
    shoe.quaternion.setFromUnitVectors(new V3(0, 0, 1), dir.clone().normalize()); finish(shoe, s + 'Foot');
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 10), M.leather);              // punta del calzare
    tip.rotation.x = Math.PI / 2; tip.scale.set(1, 1, 0.85);
    tip.position.copy(an).addScaledVector(dir.clone().normalize(), L - 0.02).add(new V3(0, -0.012, 0));
    tip.quaternion.setFromUnitVectors(new V3(0, 0, 1), dir.clone().normalize()); finish(tip, s + 'Foot');
  }
  const update = dt => { skirtCloth(dt); tailSway(dt); };
  updaters.add(update); startLoop();
  actor.dressed = true; actor.dante = { parts: done, bones, update };
  return actor.dante;
}

/* un solo ciclo di animazione per tutti i Dante vestiti (gioco o laboratorio) */
const updaters = new Set(); let loopOn = false;
function startLoop() {
  if (loopOn) return; loopOn = true;
  let last = performance.now();
  const tick = now => { requestAnimationFrame(tick); const dt = Math.min(0.05, (now - last) / 1000); last = now; if (dt > 0) updaters.forEach(f => f(dt)); };
  requestAnimationFrame(tick);
}
