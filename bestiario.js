/* ============================================================
   bestiario.js — i mostri veri della Divina Commedia dentro il gioco.
   Registra i modelli di bestiario-core.js (Minosse, Cerbero, Caronte, Furia, Minotauro,
   Malebranca, Arpia) al posto dei vecchi demoni tinti, e aggiunge gli effetti vivi:
   fiamme dalle corna, fumo dalle narici, bava, soffio di fuoco, nebbia gelida, penne che cadono,
   occhi che pulsano e si accendono prima del colpo, sangue/icore al colpo, pozza alla morte.
   Usa solo window.__game (models, TYPES e gli emettitori di particelle).
   ============================================================ */
import { buildBestiary } from './bestiario-core.js';

const g = window.__game;
if (!g || !g.models || !g.TYPES || !g.fxSpark) console.warn('bestiario.js: window.__game non pronto (servono models, TYPES, emettitori)');
else {
  const { THREE, scene, G, models, TYPES, fxFire, fxSmoke, fxSpark } = g;
  const V3 = THREE.Vector3, rnd = (a, b) => a + Math.random() * (b - a);

  /* 1) i modelli e la sostituzione dei tipi di nemico */
  const bestiary = buildBestiary();
  Object.assign(models, bestiary);
  const swap = (type, model, extra = {}) => {
    const T = TYPES[type]; if (!T || !models[model]) return;
    T.model = model; delete T.tintReal; delete T.tint; delete T.emis; delete T.emisK; Object.assign(T, extra);
  };
  swap('imp', 'mMalebranca', { name: 'Malebranca' });
  swap('brute', 'mMinotauro', { name: 'Minotauro' });
  swap('elite', 'mCaronte', { name: 'Caronte, il Nocchiere' });
  swap('boss', 'mMinosse');
  swap('harpy', 'mArpia');
  swap('elite2', 'mFuria', { name: 'Tisifone, Furia' });
  swap('boss3', 'mCerbero');
  swap('soul', 'mAnima');
  swap('glutton', 'mIngordo', { name: 'Ingordo (Ciacco)' });
  swap('boss2', 'mSemiramide');
  swap('hound', 'mSegugio');

  /* 2) colori degli effetti per mostro (HDR: il bloom del gioco li riprende) */
  const PAL = {
    mMinosse: { flame: [1.3, 0.45, 2.4], breath: [0.3, 0.22, 0.38], ember: [1.6, 0.5, 2.2], ichor: [1.1, 0.18, 0.7], fire: [1.5, 0.5, 2.6] },
    mCerbero: { flame: [2.4, 1.0, 0.25], breath: [0.4, 0.37, 0.33], ember: [2.2, 0.9, 0.25], ichor: [0.8, 0.08, 0.05], drool: [0.75, 0.95, 0.85], fire: [2.8, 1.2, 0.3], mud: [0.17, 0.12, 0.07] },
    mCaronte: { flame: [2.4, 1.0, 0.2], ember: [2.4, 1.1, 0.25], mist: [0.45, 0.52, 0.6], ichor: [0.55, 0.8, 1.2], drip: [0.5, 0.75, 1.2] },
    mFuria: { ember: [0.4, 2.0, 0.5], wisp: [0.3, 1.5, 0.4], ichor: [0.25, 1.5, 0.2], drip: [1.7, 0.08, 0.06] },
    mMinotauro: { breath: [0.55, 0.55, 0.56], ember: [1.8, 0.6, 0.2], ichor: [1.4, 0.1, 0.06] },
    mMalebranca: { flame: [2.4, 1.1, 0.2], ember: [2.0, 0.7, 0.15], ichor: [2.0, 0.55, 0.1] },
    mAnima: { wisp: [0.6, 0.5, 1.8], ember: [0.7, 0.6, 2.0], ichor: [0.5, 0.4, 1.4], drip: [0.6, 0.6, 1.6] },
    mIngordo: { drool: [0.5, 0.9, 0.3], drip: [0.35, 0.28, 0.1], ichor: [0.3, 0.4, 0.1], ember: [0.5, 1.2, 0.3] },
    mSemiramide: { flame: [2.4, 0.5, 1.8], wisp: [2.0, 0.6, 1.6], ember: [2.4, 0.6, 1.9], ichor: [1.6, 0.2, 1.1], breath: [0.4, 0.3, 0.4] },
    mSegugio: { drool: [0.7, 0.9, 0.7], ember: [2.0, 0.8, 0.2], ichor: [0.8, 0.08, 0.05] },
    mArpia: { feather: [0.04, 0.05, 0.1], ember: [0.3, 0.6, 1.8], ichor: [0.3, 0.55, 1.5], drip: [1.5, 0.1, 0.08] }
  };
  /* quante emissioni al secondo per ogni tipo di punto (a riposo / sveglio / mentre carica il colpo) */
  const RATE = { breath: [1.2, 3.2, 6], flame: [4, 9, 20], ember: [1.5, 4, 10], drool: [1.5, 4, 14], drip: [0.8, 2, 5], mist: [2.5, 5, 7], feather: [0.4, 1.4, 3], wisp: [3, 6, 10] };

  const tmpP = new V3(), tmpQ = new THREE.Quaternion(), tmpD = new V3();
  const C = (a, k = 1) => [a[0] * k, a[1] * k, a[2] * k];

  /* pozze di sangue e icore sotto i caduti */
  const pools = [];
  const poolTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    const gr = x.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(0.7, 'rgba(255,255,255,.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.beginPath(); for (let i = 0; i <= 40; i++) { const a = i / 40 * 6.283, r = 52 + Math.sin(a * 5 + 1) * 7 + Math.sin(a * 9) * 4; i ? x.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r) : x.moveTo(64 + r, 64); } x.closePath(); x.fill();
    return new THREE.CanvasTexture(c);
  })();
  function addPool(x, z, r, rgb) {
    const geo = new THREE.PlaneGeometry(2, 2); geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: poolTex, color: new THREE.Color(rgb[0] * 0.28, rgb[1] * 0.28, rgb[2] * 0.28), transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }));
    m.position.set(x, 0.05, z); m.rotation.y = rnd(0, 6.28); m.scale.setScalar(0.2); scene.add(m);
    pools.push({ m, t: 0, r });
    if (pools.length > 14) { const o = pools.shift(); scene.remove(o.m); o.m.geometry.dispose(); o.m.material.dispose(); }
  }

  /* 3) lo stato per ogni nemico che usa uno dei nostri modelli */
  const live = new Map();
  function setup(e) {
    const key = e.T.model; if (!bestiary[key]) return null;
    const pts = [], eyes = [], sc = e.actor.model.scale.x || 1;
    e.actor.model.traverse(o => {
      if (o.isMesh && o.geometry) {                                   // le parti minuscole (denti, occhi, unghie, ciuffi) non proiettano ombra: meno lavoro per la GPU
        if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
        if (o.geometry.boundingSphere.radius * sc < 0.11) o.castShadow = false;
      }
      if (o.name.startsWith('fx_')) pts.push({ o, kind: o.userData.kind, acc: Math.random() });
      if (o.isSprite && o.userData.eye) { o.material = o.material.clone(); eyes.push({ s: o, base: o.material.opacity, ph: Math.random() * 6.28 }); }
    });
    const st = { key, pts, eyes, pal: PAL[key] || {}, lastFlash: 0, wasDead: false, step: 0, big: !!(e.T.boss || e.T.elite) };
    live.set(e, st); return st;
  }
  function burstIchor(e, st, n, power) {
    const c = st.pal.ichor || [1, 0.1, 0.05], y = e.T.h * 0.55;
    for (let i = 0; i < n; i++) {
      const a = rnd(0, 6.28), sp = rnd(1.5, 5) * power;
      fxSpark.spawn(e.pos.x + Math.sin(a) * 0.3, y + rnd(-0.4, 0.4), e.pos.z + Math.cos(a) * 0.3, Math.sin(a) * sp, rnd(1, 4.5) * power, Math.cos(a) * sp, rnd(0.45, 0.95), rnd(0.22, 0.4), 0.05, c[0], c[1], c[2], 0.9, rnd(-4, 4), 9, 0.4);
    }
    for (let i = 0; i < Math.ceil(n / 4); i++) fxSmoke.spawn(e.pos.x, y, e.pos.z, rnd(-1, 1), rnd(0.4, 1.4), rnd(-1, 1), rnd(0.7, 1.3), 0.5 * power, 1.6 * power, 0.07, 0.05, 0.05, 0.4, rnd(-1, 1), -0.2, 1.4);
  }

  function emitPoint(e, st, p, dt, mode) {                       // mode: 0 dorme, 1 sveglio, 2 sta per colpire
    const rate = (RATE[p.kind] || [0, 0, 0])[mode] * (st.big ? 1.2 : 1);
    p.acc += rate * dt;
    if (p.acc < 1) return;
    const n = Math.min(4, Math.floor(p.acc)); p.acc -= n;
    p.o.getWorldPosition(tmpP);
    const pal = st.pal;
    for (let i = 0; i < n; i++) {
      const x = tmpP.x, y = tmpP.y, z = tmpP.z;
      switch (p.kind) {
        case 'breath': { const c = pal.breath || [0.4, 0.4, 0.4]; fxSmoke.spawn(x, y, z, rnd(-0.2, 0.2), rnd(0.2, 0.7), rnd(-0.2, 0.2), rnd(0.9, 1.6), 0.12, 0.5 + mode * 0.25, c[0], c[1], c[2], 0.22 + mode * 0.05, rnd(-1, 1), -0.2, 1.6); break; }
        case 'flame': { const c = pal.flame || [2, 1, 0.2]; fxFire.spawn(x + rnd(-0.05, 0.05), y, z + rnd(-0.05, 0.05), rnd(-0.3, 0.3), rnd(0.9, 2.1), rnd(-0.3, 0.3), rnd(0.35, 0.7), 0.3 + mode * 0.08, 0.03, c[0], c[1], c[2], 0.8, rnd(-2, 2), -1.2, 0.8); break; }
        case 'ember': { const c = pal.ember || [2, 0.8, 0.2], r = e.T.r * 0.9; fxSpark.spawn(x + rnd(-r, r), y + rnd(-0.3, 0.5), z + rnd(-r, r), rnd(-0.5, 0.5), rnd(0.7, 2.0), rnd(-0.5, 0.5), rnd(0.9, 1.7), rnd(0.12, 0.22), 0.02, c[0], c[1], c[2], 0.9, 0, -0.3, 0.3); break; }
        case 'drool': { const c = pal.drool || [0.7, 0.9, 0.8]; fxSpark.spawn(x, y, z, rnd(-0.1, 0.1), rnd(-0.2, 0), rnd(0.0, 0.25), rnd(0.7, 1.1), 0.1, 0.04, c[0], c[1], c[2], 0.7, 0, 9, 0.2); break; }
        case 'drip': { const c = pal.drip || [0.8, 0.1, 0.1]; fxSpark.spawn(x, y, z, rnd(-0.1, 0.1), rnd(-0.3, 0), rnd(-0.1, 0.1), rnd(0.6, 1.0), 0.09, 0.03, c[0], c[1], c[2], 0.8, 0, 9, 0.1); break; }
        case 'mist': { const c = pal.mist || [0.5, 0.5, 0.55], r = e.T.r * 1.6; fxSmoke.spawn(e.pos.x + rnd(-r, r), 0.15, e.pos.z + rnd(-r, r), rnd(-0.3, 0.3), rnd(0.15, 0.5), rnd(-0.3, 0.3), rnd(1.6, 2.6), 0.8, 2.4, c[0], c[1], c[2], 0.13, rnd(-0.5, 0.5), -0.05, 0.8); break; }
        case 'feather': { const c = pal.feather || [0.05, 0.05, 0.1]; fxSmoke.spawn(x + rnd(-0.3, 0.3), y, z + rnd(-0.3, 0.3), rnd(-0.6, 0.6), rnd(0.2, 0.9), rnd(-0.6, 0.6), rnd(1.6, 2.6), 0.17, 0.12, c[0], c[1], c[2], 0.85, rnd(-3, 3), 1.1, 1.2); break; }
        case 'wisp': { const c = pal.wisp || [0.3, 1.4, 0.4]; fxFire.spawn(x + rnd(-0.2, 0.2), y, z + rnd(-0.2, 0.2), rnd(-0.2, 0.2), rnd(0.5, 1.2), rnd(-0.2, 0.2), rnd(0.6, 1.1), 0.22, 0.02, c[0], c[1], c[2], 0.6, rnd(-1, 1), -0.6, 0.6); break; }
      }
    }
  }

  /* soffio di fuoco di Cerbero e dei Minosse quando caricano il colpo */
  function fireJet(e, st, dt) {
    const c = st.pal.fire; if (!c) return;
    for (const p of st.pts) {
      if (!/^fx_mouth/.test(p.o.name)) continue;
      p.jet = (p.jet || 0) + dt * (st.key === 'mCerbero' ? 70 : 90);
      p.o.getWorldPosition(tmpP); p.o.getWorldQuaternion(tmpQ); tmpD.set(0, 0, 1).applyQuaternion(tmpQ);
      const sp = st.key === 'mCerbero' ? 5.5 : 7;
      while (p.jet >= 1) {
        p.jet -= 1; const k = rnd(0.7, 1.2);
        fxFire.spawn(tmpP.x, tmpP.y, tmpP.z, tmpD.x * sp * k + rnd(-0.7, 0.7), tmpD.y * sp * k + rnd(-0.5, 0.9), tmpD.z * sp * k + rnd(-0.7, 0.7), rnd(0.28, 0.5), 0.22, rnd(1.0, 1.8), c[0], c[1], c[2], 0.75, rnd(-2, 2), -0.4, 1.8);
        if (Math.random() < 0.25) fxSmoke.spawn(tmpP.x, tmpP.y, tmpP.z, tmpD.x * 3, tmpD.y * 3 + 0.5, tmpD.z * 3, rnd(0.6, 1), 0.3, 1.2, 0.05, 0.04, 0.035, 0.4, rnd(-1, 1), -0.3, 1.5);
      }
    }
  }

  /* polvere e fango alle zampe quando corrono */
  function stomp(e, st, dt) {
    const sp = e.T.speed; st.step += dt * sp * (st.key === 'mCerbero' ? 0.55 : 0.45);
    if (st.step < 1) return; st.step -= 1;
    const c = st.pal.mud || [0.2, 0.15, 0.12], n = e.T.boss ? 5 : 2;
    for (let i = 0; i < n; i++) {
      const a = rnd(0, 6.28), r = e.T.r * rnd(0.3, 0.9);
      fxSmoke.spawn(e.pos.x + Math.sin(a) * r, 0.12, e.pos.z + Math.cos(a) * r, rnd(-0.6, 0.6), rnd(0.3, 0.9), rnd(-0.6, 0.6), rnd(0.6, 1.0), 0.3 * (e.T.boss ? 1.6 : 0.7), 0.9 * (e.T.boss ? 1.8 : 0.8), c[0], c[1], c[2], 0.35, rnd(-1, 1), 0.2, 1.8);
      if (st.key === 'mCerbero') fxSpark.spawn(e.pos.x + Math.sin(a) * r, 0.2, e.pos.z + Math.cos(a) * r, rnd(-2, 2), rnd(1.5, 3.5), rnd(-2, 2), rnd(0.4, 0.7), 0.14, 0.05, c[0] * 2.2, c[1] * 2.2, c[2] * 2.2, 0.85, 0, 9, 0.3);
    }
  }

  let last = performance.now(), clock = 0;
  function tick() {
    requestAnimationFrame(tick);
    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now; clock += dt;
    for (const e of G.enemies) {
      let st = live.get(e); if (st === undefined) st = e.actor && e.actor.model ? setup(e) : null; if (!st) continue;
      const mode = e.dead ? -1 : e.state === 'idle' ? 0 : e.state === 'wind' ? 2 : 1;
      /* colpo subito: schizzi di icore (fronte di salita del lampo) */
      if (!e.dead && e.flash > 0.95 && st.lastFlash <= 0.95) burstIchor(e, st, e.T.boss ? 14 : e.T.elite ? 10 : 7, e.T.boss ? 1.2 : 1);
      st.lastFlash = e.flash || 0;
      /* morte: esplosione di icore e pozza che si allarga */
      if (e.dead && !st.wasDead) { st.wasDead = true; burstIchor(e, st, e.T.boss ? 70 : e.T.elite ? 40 : 20, e.T.boss ? 1.8 : 1.2); addPool(e.pos.x, e.pos.z, e.T.r * (e.T.boss ? 2.2 : 1.4), st.pal.ichor || [1, 0.1, 0.05]); }
      /* occhi: pulsano, si spengono a riposo e si accendono prima del colpo */
      const eyeK = e.dead ? 0 : mode === 0 ? 0.55 : mode === 2 ? 1.9 : 1.0;
      for (const ey of st.eyes) ey.s.material.opacity = ey.base * eyeK * (0.85 + 0.15 * Math.sin(clock * 13 + ey.ph) + (Math.random() < 0.05 ? 0.12 : 0));
      if (e.dead) continue;
      /* distanza: niente particelle se il mostro è lontano dal giocatore */
      const dx = e.pos.x - g.P.pos.x, dz = e.pos.z - g.P.pos.z; if (dx * dx + dz * dz > 38 * 38) continue;
      for (const p of st.pts) emitPoint(e, st, p, dt, mode);
      if (mode === 2 && st.pal.fire) fireJet(e, st, dt);
      if (mode === 1 && (e.T.boss || st.key === 'mMinotauro')) stomp(e, st, dt);
    }
    for (let i = pools.length - 1; i >= 0; i--) {
      const p = pools[i]; p.t += dt;
      const k = Math.min(1, p.t / 2.2), s = p.r * (1 - Math.pow(1 - k, 3)); p.m.scale.setScalar(Math.max(0.2, s));
      p.m.material.opacity = Math.min(0.8, p.t * 1.5) * (p.t > 14 ? Math.max(0, 1 - (p.t - 14) / 6) : 1);
      if (p.t > 20) { scene.remove(p.m); p.m.geometry.dispose(); p.m.material.dispose(); pools.splice(i, 1); }
    }
    for (const e of [...live.keys()]) if (e.gone) live.delete(e);
  }
  requestAnimationFrame(tick);
  window.__bestiario = { bestiary, live, PAL, addPool };
}
