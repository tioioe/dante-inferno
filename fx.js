/* ============================================================
   fx.js — effetti visivi aggiuntivi, in un modulo separato.
   Osserva lo stato del gioco (window.__G / __P) e aggiunge:
   scia della lama, scosse di camera, anime dei morti, polvere dei passi,
   cenere nell'aria, colonna di luce al livello, rune sui cerchi di pericolo,
   aure di campione e boss, onde dei cancelli, vortice del portale, macchie
   di bruciato e vignetta a vita bassa.
   ============================================================ */
const g = window.__game;
if (!g || !g.Emitter) console.warn('fx.js: window.__game non pronto');
else {
  const { THREE, scene, camera, renderer, P, G, clamp, Emitter, ftex, fxSpark, fxFire, fxSmoke, fxGlow, fireBurst, flash, addRing, LINKS } = g;
  const V3 = THREE.Vector3, rnd = (a, b) => a + Math.random() * (b - a);
  const tc = new THREE.Color(); const C = (hex, k = 1) => { tc.set(hex); return [tc.r * k, tc.g * k, tc.b * k]; };

  /* emettitori propri */
  const fxAsh = new Emitter('circle_05', false, 300);     // cenere che cade
  const fxSoul = new Emitter('circle_05', true, 200);      // anime che salgono
  const fxStar = new Emitter('star_04', true, 80);        // stelle dei colpi critici

  /* ---------- scosse di camera: si applicano solo al momento del disegno ---------- */
  let shake = 0, st = 0;
  const addShake = a => { shake = Math.min(1.2, shake + a); };
  const origRender = renderer.render.bind(renderer);
  renderer.render = function (s, c) {
    if (shake > 0.002 && c === camera) {
      const a = shake * 0.32, ox = Math.sin(st * 61) * a, oy = Math.sin(st * 47 + 1) * a * 0.6, oz = Math.sin(st * 73 + 2) * a;
      camera.position.x += ox; camera.position.y += oy; camera.position.z += oz;
      origRender(s, c);
      camera.position.x -= ox; camera.position.y -= oy; camera.position.z -= oz;
    } else origRender(s, c);
  };

  /* ---------- macchie di bruciato sul pavimento ---------- */
  const decals = [];
  function scorch(x, z, r, op = 0.55) {
    const geo = new THREE.PlaneGeometry(2, 2); geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: ftex('scorch_01'), transparent: true, opacity: op, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.position.set(x, 0.045, z); m.rotation.y = rnd(0, 6.28); m.scale.setScalar(r); scene.add(m);
    decals.push({ m, t: 0, life: 10, op });
    if (decals.length > 28) { const o = decals.shift(); scene.remove(o.m); o.m.geometry.dispose(); o.m.material.dispose(); }
  }

  /* ---------- effetti a tempo (colonne di luce, ecc.) ---------- */
  const timed = [];
  function pillarTex() {
    const c = document.createElement('canvas'); c.width = 8; c.height = 128; const x = c.getContext('2d');
    const gr = x.createLinearGradient(0, 128, 0, 0); gr.addColorStop(0, 'rgba(255,240,180,1)'); gr.addColorStop(0.3, 'rgba(255,200,100,.7)'); gr.addColorStop(1, 'rgba(255,160,40,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 8, 128); return new THREE.CanvasTexture(c);
  }
  const PILLAR = pillarTex();
  function pillar(x, z, color, h = 16, dur = 1.3, r = 1.3) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24, 1, true), new THREE.MeshBasicMaterial({ map: PILLAR, color: new THREE.Color(color).multiplyScalar(1.2), transparent: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    m.position.set(x, h / 2, z); scene.add(m);
    timed.push({ t: 0, dur, update(k) { const s = 1 - k * 0.7; m.scale.set(s, 1, s); m.material.opacity = Math.min(1, k * 8) * (1 - k); }, done() { scene.remove(m); m.geometry.dispose(); m.material.dispose(); } });
  }

  /* ---------- scia della lama: nastro luminoso dietro la punta ---------- */
  const NT = 18, tipL = new V3(0, 0, 1.8), baseL = new V3(0, 0, 0.5);
  const tGeo = new THREE.BufferGeometry(), tPos = new Float32Array(NT * 2 * 3), tCol = new Float32Array(NT * 2 * 4), idx = [];
  for (let i = 0; i < NT - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  tGeo.setIndex(idx); tGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3).setUsage(THREE.DynamicDrawUsage)); tGeo.setAttribute('color', new THREE.BufferAttribute(tCol, 4).setUsage(THREE.DynamicDrawUsage));
  const trail = new THREE.Mesh(tGeo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  trail.frustumCulled = false; scene.add(trail);
  const samples = [];
  function updateTrail(now) {
    const active = (P.atkT > 0 || P.spinT > 0) && !P.dead && P.sword;
    if (active) { P.sword.updateWorldMatrix(true, false); samples.push({ t: now, tip: P.sword.localToWorld(tipL.clone()), base: P.sword.localToWorld(baseL.clone()) }); }
    while (samples.length && now - samples[0].t > 0.22) samples.shift();
    if (samples.length > NT) samples.splice(0, samples.length - NT);
    const n = samples.length;
    if (n < 2) { tGeo.setDrawRange(0, 0); return; }
    for (let i = 0; i < n; i++) {
      const s = samples[i], age = clamp((now - s.t) / 0.22, 0, 1), a = Math.pow(1 - age, 1.6) * 0.95;
      tPos.set([s.tip.x, s.tip.y, s.tip.z, s.base.x, s.base.y, s.base.z], i * 6);
      tCol.set([1.7, 0.78, 0.18, a * 0.85, 0.7, 0.18, 0.03, a * 0.35], i * 8);          // punta calda, base scura: nastro sottile e leggibile
    }
    tGeo.setDrawRange(0, (n - 1) * 6);
    tGeo.attributes.position.needsUpdate = true; tGeo.attributes.color.needsUpdate = true;
  }

  /* ---------- eventi puntuali ---------- */
  function critFx() {
    addShake(0.2);
    let best = null; for (const e of G.enemies) if (!e.dead && e.flash > 0.8 && (!best || e.flash > best.flash)) best = e;
    if (!best) return; const p = best.pos, [r, gg, b] = C(0xffd860, 2.6);
    fxStar.spawn(p.x, 1.4, p.z, 0, 0, 0, 0.38, 4.2, 0.6, r, gg, b, 0.95, 5);
    fxStar.spawn(p.x, 1.4, p.z, 0, 0, 0, 0.3, 2.6, 0.3, 3, 3, 3, 0.9, -8);
    addRing(p.x, p.z, 'circle_03', 0xffd060, 3.6, 0.3, { k: 3, y: 0.2 });
  }
  function soulFx(e) {                                    // anime: fiammelle morbide che salgono ondeggiando
    const boss = !!(e.T && e.T.boss), elite = !!(e.T && e.T.elite), n = boss ? 12 : elite ? 6 : 3, col = boss ? [0.9, 0.35, 1.5] : [0.3, 0.65, 1.3];
    for (let i = 0; i < n; i++) {
      const dir = rnd(0, 6.283), sp = rnd(0.15, 0.55);
      fxSoul.spawn(e.pos.x + rnd(-0.2, 0.2), 0.8 + rnd(0, 0.6), e.pos.z + rnd(-0.2, 0.2), Math.cos(dir) * sp, 1.0 + rnd(0, 0.9), Math.sin(dir) * sp,
        rnd(1.1, 1.9), (boss ? 2.2 : 0.95) * rnd(0.7, 1.1), 0.12, col[0], col[1], col[2], 0.5, 0, 0, 0.25);
      fxSpark.spawn(e.pos.x, 0.9, e.pos.z, Math.cos(dir) * sp * 2, 1.4 + rnd(0, 1), Math.sin(dir) * sp * 2, rnd(0.9, 1.6), 0.22, 0.04, col[0] * 2, col[1] * 2, col[2] * 2, 0.9, 0, -0.3, 0.2);
    }
    for (let i = 0; i < (boss ? 12 : 3); i++) fxSmoke.spawn(e.pos.x, 0.6, e.pos.z, rnd(-0.6, 0.6), rnd(0.8, 1.8), rnd(-0.6, 0.6), rnd(1.0, 1.6), 0.8, 2.2, 0.35, 0.3, 0.28, 0.25, rnd(-0.5, 0.5), -0.3, 1);
    scorch(e.pos.x, e.pos.z, (e.T ? e.T.r : 0.6) * (boss ? 3.2 : 2.2), boss ? 0.8 : 0.5);
    if (boss) { addShake(0.9); addRing(e.pos.x, e.pos.z, 'magic_02', 0xb070ff, 16, 1.3, { k: 3 }); flash(e.pos.x, 2, e.pos.z, 14, 0xa060ff, 0.6); pillar(e.pos.x, e.pos.z, 0xb070ff, 11, 2.2, 1.6); }
    else if (elite) addShake(0.3);
  }
  function levelFx() {                                    // main.js disegna già anelli e bagliore: qui solo colonna sottile, scossa e scintille
    addShake(0.3); pillar(P.pos.x, P.pos.z, 0xffd070, 9, 1.6, 0.7);
    for (let i = 0; i < 40; i++) fxSpark.spawn(P.pos.x + rnd(-0.9, 0.9), 0.3, P.pos.z + rnd(-0.9, 0.9), rnd(-1.4, 1.4), rnd(4, 11), rnd(-1.4, 1.4), rnd(0.9, 1.7), rnd(0.3, 0.55), 0.05, 2.6, 2.0, 0.6, 1, rnd(-4, 4), 1.5, 0.3);
  }
  function gateFx(l) {
    addShake(0.5); scorch(l.gx, l.gz, 5, 0.7);
    addRing(l.gx, l.gz, 'circle_03', 0xffa050, 15, 1.0, { k: 3 }); addRing(l.gx, l.gz, 'magic_02', 0xffc070, 10, 1.2, { k: 3, spin: 2 });
    flash(l.gx, 2.5, l.gz, 16, 0xff9040, 0.7); fireBurst(l.gx, 0.5, l.gz, 28, 2.2, 0xff8a30);
    for (let i = 0; i < 130; i++) fxSpark.spawn(l.gx + rnd(-3, 3), 0.4, l.gz + rnd(-3, 3), rnd(-3, 3), rnd(5, 13), rnd(-3, 3), rnd(0.8, 1.6), rnd(0.3, 0.6), 0.05, 3.2, 1.7, 0.4, 1, rnd(-5, 5), 6, 0.3);
  }
  function hurtFx() {
    addShake(0.3); flash(P.pos.x, 1.2, P.pos.z, 5, 0xff2a1a, 0.25);
    addRing(P.pos.x, P.pos.z, 'circle_03', 0xff3a2a, 4, 0.3, { k: 3, y: 0.18 });
  }
  function novaFx() { addShake(0.55); scorch(P.pos.x, P.pos.z, 5, 0.35); for (let i = 0; i < 40; i++) { const a = rnd(0, 6.283), s = rnd(5, 11); fxSmoke.spawn(P.pos.x, 0.3, P.pos.z, Math.cos(a) * s, 0.5, Math.sin(a) * s, 0.8, 0.8, 2.4, 0.35, 0.3, 0.27, 0.3, 0, 0, 2.4); } }
  function potionFx() {
    addRing(P.pos.x, P.pos.z, 'magic_03', 0x6aff8a, 4.5, 0.9, { follow: true, spin: 4, grow: false, k: 2.6, y: 0.2 });
    for (let i = 0; i < 36; i++) { const a = rnd(0, 6.283); fxSpark.spawn(P.pos.x + Math.cos(a) * 0.9, 0.2, P.pos.z + Math.sin(a) * 0.9, 0, rnd(2, 5), 0, rnd(0.7, 1.2), rnd(0.3, 0.5), 0.05, 0.9, 3.0, 1.3, 1, 0, 0, 0.5); }
  }
  function dashStartFx() {
    addRing(P.pos.x, P.pos.z, 'circle_03', 0xffc080, 3.2, 0.35, { k: 2, y: 0.15 });
    for (let i = 0; i < 6; i++) fxSmoke.spawn(P.pos.x, 0.3, P.pos.z, rnd(-1, 1), rnd(0.2, 0.8), rnd(-1, 1), 0.7, 0.6, 1.8, 0.3, 0.24, 0.2, 0.3, 0, 0, 1.4);
  }
  function teleImpact(t) {
    scorch(t.x, t.z, t.r * 0.85, 0.75); flash(t.x, 1, t.z, t.r * 2.2, 0xff7030, 0.35);
    fireBurst(t.x, 0.4, t.z, Math.round(10 + t.r * 3), t.r * 0.45, 0xff6a20);
    addRing(t.x, t.z, 'circle_03', 0xff7030, t.r * 2.6, 0.5, { k: 3, y: 0.2 });
    if (Math.hypot(t.x - P.pos.x, t.z - P.pos.z) < 26) addShake(clamp(t.r * 0.11, 0.3, 0.7));
  }

  /* osservatore dei colpi critici: compaiono come numeri gialli grandi */
  const dmgBox = document.getElementById('dmg');
  if (dmgBox) new MutationObserver(l => { for (const r of l) for (const n of r.addedNodes) if (n.classList && n.classList.contains('crit')) critFx(); }).observe(dmgBox, { childList: true });

  /* ---------- ciclo principale ---------- */
  const seenDead = new WeakSet(), openSeen = new Set();
  let last = performance.now(), prev = { novaCd: 0, inv: 0, level: P.level, potCd: 0, dashT: 0, tele: [] }, stepT = 0, ashAcc = 0, emberAcc = 0, flashEl = document.getElementById('flash');
  function loop() { requestAnimationFrame(loop); const nowT = performance.now(); const dt = Math.min(0.05, (nowT - last) / 1000); last = nowT; tick(dt); }
  function tick(dt) {
    st += dt;
    shake = Math.max(0, shake - dt * 1.5);
    fxAsh.update(dt); fxSoul.update(dt); fxStar.update(dt);
    const now = G.time, playing = G.state === 'play', alive = playing && !P.dead;   // tempo di gioco: coerente anche con pochi fps

    updateTrail(now);

    // fronti di salita degli stati del giocatore
    if (P.novaCd > prev.novaCd + 1) novaFx();
    if (P.inv > 0.5 && prev.inv <= 0.5) hurtFx();
    if (P.level > prev.level) levelFx();
    if (P.potCd > prev.potCd + 1) potionFx();
    if (P.dashT > 0 && prev.dashT <= 0) dashStartFx();
    prev.novaCd = P.novaCd; prev.inv = P.inv; prev.level = P.level; prev.potCd = P.potCd; prev.dashT = P.dashT;
    if (P.dashT > 0) {                                                       // scia del dash: bagliori dietro Dante
      fxGlow.spawn(P.pos.x, 1.0, P.pos.z, 0, 0, 0, 0.28, 1.8, 0.3, 2.4, 1.2, 0.4, 0.55);
      fxSpark.spawn(P.pos.x, 1.0, P.pos.z, -P.dashDir.x * rnd(2, 5), rnd(0, 1.2), -P.dashDir.z * rnd(2, 5), rnd(0.2, 0.4), 0.35, 0.05, 3.2, 1.6, 0.5, 1, 0, 3, 0.8);
    }

    // polvere dei passi
    if (alive && P.dashT <= 0) {
      const sp = Math.hypot(P.vel.x, P.vel.z);
      if (sp > 2.5) { stepT -= dt * (sp / 7.6); if (stepT <= 0) { stepT = 0.2; fxSmoke.spawn(P.pos.x - P.vel.x * 0.04, 0.12, P.pos.z - P.vel.z * 0.04, rnd(-0.3, 0.3), rnd(0.4, 0.9), rnd(-0.3, 0.3), 0.7, 0.35, 1.3, 0.34, 0.28, 0.23, 0.26, rnd(-1, 1), -0.2, 1.4); } }
    }

    // cenere che cade e braci che galleggiano, attorno a Dante
    ashAcc += dt * 16; while (ashAcc >= 1) { ashAcc -= 1;
      fxAsh.spawn(P.pos.x + rnd(-24, 24), rnd(3, 11), P.pos.z + rnd(-24, 24), rnd(-0.9, -0.2), -rnd(0.4, 0.9), rnd(0.1, 0.7), rnd(6, 9), rnd(0.1, 0.18), rnd(0.07, 0.12), 0.4, 0.34, 0.31, 0.5, rnd(-0.6, 0.6), 0, 0); }
    emberAcc += dt * 5; while (emberAcc >= 1) { emberAcc -= 1;
      fxSpark.spawn(P.pos.x + rnd(-20, 20), rnd(0.5, 3), P.pos.z + rnd(-20, 20), rnd(-0.5, 0.2), rnd(0.4, 1.2), rnd(-0.3, 0.5), rnd(3.5, 6), rnd(0.2, 0.35), 0.04, 3.0, 1.2, 0.3, 0.8, rnd(-2, 2), 0, 0.05); }

    // morti, aure, cerchi di pericolo
    for (const e of G.enemies) {
      if (e.dead) { if (!seenDead.has(e)) { seenDead.add(e); soulFx(e); } continue; }
      if (e.T && (e.T.elite || e.T.boss) && e.state !== 'idle' && Math.random() < (e.T.boss ? 0.9 : 0.5)) {
        const a = rnd(0, 6.283), rr = e.T.r * rnd(0.4, 1.1), [r, gg, b] = C(e.T.glow || 0xffa040, 1.7);
        fxFire.spawn(e.pos.x + Math.cos(a) * rr, 0.15, e.pos.z + Math.sin(a) * rr, rnd(-0.2, 0.2), rnd(1.2, 2.6), rnd(-0.2, 0.2), 0.6, e.T.boss ? 1.5 : 0.9, 0.2, r, gg, b, 0.7, rnd(-2, 2), -1, 1);
      }
    }
    for (const t of G.tele) {
      if (!t._fx) { t._fx = 1; const geo = new THREE.PlaneGeometry(2, 2); geo.rotateX(-Math.PI / 2);
        t._rune = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: ftex('magic_05'), color: new THREE.Color(0xff5a20).multiplyScalar(2.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0.9 }));
        t._rune.scale.setScalar(t.r * 0.95); t._rune.position.y = 0.03; t.grp.add(t._rune); }
      t._rune.rotation.y += dt * 2.4;
      if (Math.random() < 0.7) { const a = rnd(0, 6.283), rr = Math.sqrt(Math.random()) * t.r * 0.95; fxSpark.spawn(t.x + Math.cos(a) * rr, 0.1, t.z + Math.sin(a) * rr, 0, rnd(2, 5), 0, rnd(0.4, 0.8), rnd(0.3, 0.5), 0.05, 3.2, 0.9, 0.3, 1, 0, 0, 0.3); }
    }
    for (const p of prev.tele) if (!G.tele.includes(p) && p.t >= p.dur - 0.2) teleImpact(p);
    prev.tele = G.tele.slice();

    // cancelli aperti, portale
    for (const l of LINKS) if (l.open && !openSeen.has(l.i)) { openSeen.add(l.i); if (G.state !== 'title') gateFx(l); }
    if (G.portal) {
      const p = G.portal, th = now * 5;
      for (let k = 0; k < 2; k++) { const a = th + k * 3.14, c = Math.cos(a), s = Math.sin(a);
        fxGlow.spawn(p.x + c * 2.6, 2.6 + s * 2.6, p.z, -c * 1.8, -s * 1.8, 0, 1.2, 0.9, 0.2, 1.6, 0.6, 3.0, 0.7); }
      if (Math.random() < 0.5) fxSpark.spawn(p.x + rnd(-1.5, 1.5), 0.2, p.z + rnd(-0.5, 0.5), 0, rnd(2, 5), 0, 1, 0.4, 0.05, 1.5, 0.6, 3.2, 1);
    }

    // effetti a tempo e macchie
    for (let i = timed.length - 1; i >= 0; i--) { const e = timed[i]; e.t += dt; const k = e.t / e.dur; if (k >= 1) { e.done(); timed.splice(i, 1); } else e.update(k); }
    for (let i = decals.length - 1; i >= 0; i--) { const d = decals[i]; d.t += dt; const k = d.t / d.life; d.m.material.opacity = d.op * Math.min(1, (1 - k) * 2.5); if (k >= 1) { scene.remove(d.m); d.m.geometry.dispose(); d.m.material.dispose(); decals.splice(i, 1); } }

    // vignetta rossa pulsante a vita bassa
    if (flashEl) {
      const r = P.hp / P.max;
      if (alive && r < 0.35) { const a = (0.35 - r) / 0.35 * 0.6 * (0.55 + 0.45 * Math.sin(now * 7)); flashEl.style.background = `radial-gradient(ellipse at center, rgba(0,0,0,0) 38%, rgba(150,0,0,${a.toFixed(3)}) 100%)`; }
      else if (flashEl.style.background) flashEl.style.background = '';
    }
  }
  loop();
  window.__fx = { tick, trail, samples, addShake, scorch, pillar, critFx, levelFx, gateFx, novaFx, hurtFx, potionFx, dashStartFx, soulFx, teleImpact };
}
