/* ============================================================
   story.js — la discesa nella selva oscura (Inferno, Canto I)
   Modulo separato: usa solo ciò che main.js espone in window.__game.
   - foresta di alberi contorti nella prima camera
   - sequenza d'ingresso: Dante cammina assonnato nella selva,
     versi originali + parafrasi, lonza/leone/lupa come occhi nel buio
   ============================================================ */
import { dressDante } from './dante.js';
const g = window.__game;
if (!g) { console.warn('story.js: window.__game non disponibile'); }
else {
  const { THREE, scene, camera, renderer, P, G, CH, obstacles, Rs, clamp, angDiff, col, torch, CAM_OFF } = g;

  // il vero Dante: appena il personaggio esiste lo vesto (cappuccio rosso, lucco, alloro…) — vedi dante.js
  const dressWatch = setInterval(() => {
    if (!P.actor) return;
    clearInterval(dressWatch);
    try { dressDante(P.actor); } catch (e) { console.error('dressDante:', e); }
  }, 100);
  const $ = id => document.getElementById(id);
  const V3 = THREE.Vector3;
  const smooth = x => x * x * (3 - 2 * x);

  /* ---------- alberi contorti ---------- */
  const barkMat = new THREE.MeshStandardMaterial({ color: 0x2b211c, roughness: 1 });
  function makeTree(x, z, h, solid = true) {
    const grp = new THREE.Group(); grp.position.set(x, 0, z); grp.rotation.y = Rs(0, 6.28);
    const k = h / 5;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * k, 0.42 * k, h, 7), barkMat);
    trunk.position.y = h / 2; trunk.rotation.z = Rs(-0.08, 0.08); trunk.castShadow = trunk.receiveShadow = true; grp.add(trunk);
    for (let i = 0; i < 4; i++) {
      const len = Rs(1.6, 2.8) * k, a = i * 1.57 + Rs(0, 1), tilt = Rs(0.8, 1.25);
      const geo = new THREE.CylinderGeometry(0.03 * k, 0.12 * k, len, 5); geo.translate(0, len / 2, 0);
      const br = new THREE.Mesh(geo, barkMat);
      br.position.y = h * Rs(0.4, 0.88); br.rotation.set(Math.cos(a) * tilt, 0, -Math.sin(a) * tilt); br.castShadow = true;
      grp.add(br);
      const tg = new THREE.CylinderGeometry(0.01 * k, 0.05 * k, len * 0.6, 4); tg.translate(0, len * 0.3, 0);
      const tw = new THREE.Mesh(tg, barkMat);        // rametto secco in cima al ramo
      tw.position.set(Math.sin(a) * len * 0.5 * Math.sin(tilt), br.position.y + Math.cos(tilt) * len * 0.5, Math.cos(a) * len * 0.5 * Math.sin(tilt));
      tw.rotation.set(Rs(-0.8, 0.8), 0, Rs(-0.8, 0.8)); grp.add(tw);
    }
    scene.add(grp);
    if (solid) obstacles.push({ x, z, r: 0.5 * k + 0.15 });
  }
  const LEN = 24;                                         // durata totale dell'intro in secondi
  // percorso di Dante e della macchina da presa (usati anche per tenere liberi alberi e sentiero)
  const danteAt = t => ({ x: Math.sin(t * 0.6) * 0.35, z: -12.5 + clamp((t - 1.0) / 21, 0, 1) * 15 });
  // la macchina da presa gira intorno a Dante: scelgo lato e distanza che evitano le colonne già presenti nella camera
  const camAtP = (t, sign, rk) => {
    const d = danteAt(t), a = sign * (0.18 + 0.07 * t), r = (6.0 + t * 0.14) * rk;
    return { x: d.x + Math.sin(a) * r, y: 1.55 + t * 0.18, z: d.z - Math.cos(a) * r };
  };
  let camSign = 1, camRk = 1;
  (function pickCam() {
    let best = Infinity;
    for (const sign of [1, -1]) for (const rk of [1, 1.25, 1.5]) {
      let hits = 0;
      for (let t = 0; t <= LEN - 4; t += 0.5) {
        const p = camAtP(t, sign, rk);
        for (const o of obstacles) if (Math.hypot(p.x - o.x, p.z - o.z) < o.r + 3) hits++;
        if (Math.hypot(p.x, p.z) > CH[0].r - 1.2) hits += 2;                       // non uscire dal bordo della camera
      }
      if (hits < best) { best = hits; camSign = sign; camRk = rk; }
    }
  })();
  const camAt = t => camAtP(t, camSign, camRk);
  (function forest() {
    const c = CH[0], keep = [];
    for (let t = 0; t <= LEN; t += 0.5) { const p = camAt(t), d = danteAt(t); keep.push([p.x, p.z, 3.4], [d.x, d.z, 2.6]); }
    const free = (x, z) => !keep.some(([kx, kz, kr]) => Math.hypot(x - kx, z - kz) < kr);
    for (let i = 0; i < 26; i++) {                       // anello di alberi sul bordo, con un varco verso l'uscita
      const a = i / 26 * 6.283 + Rs(-0.08, 0.08), d = Rs(0.84, 0.97) * c.r, h = Rs(5.5, 8.5);
      if (c.toNext !== null && Math.abs(angDiff(a, c.toNext)) < 0.55) continue;
      const x = c.x + Math.sin(a) * d, z = c.z + Math.cos(a) * d;
      if (free(x, z)) makeTree(x, z, h);
    }
    for (let i = 0; i < 12; i++) {                       // alberi che incorniciano il sentiero d'ingresso
      const x = (i % 2 ? 1 : -1) * Rs(4.5, 10), z = Rs(-11, 6), h = Rs(3.0, 4.2);   // bassi: nella visuale di gioco non devono coprire Dante
      if (free(x, z)) makeTree(x, z, h);
    }
    for (let i = 0, placed = 0, tries = 0; placed < 6 && tries++ < 60; i++) {   // qualche albero nell'area di combattimento, come riparo
      const a = Rs(0, 6.283), d = Rs(0.3, 0.72) * c.r, x = c.x + Math.sin(a) * d, z = c.z + Math.cos(a) * d;
      if (c.toNext !== null && Math.abs(angDiff(a, c.toNext)) < 0.5 && d > 0.45 * c.r) continue;
      if (Math.hypot(x, z - 2.5) < 5 || !free(x, z)) continue;
      makeTree(x, z, Rs(2.4, 3.4)); placed++;
    }
  })();

  /* ---------- la sequenza ---------- */
  const VERSES = [
    { t: 1.6, d: 5.2,
      v: 'Nel mezzo del cammin di nostra vita<br>mi ritrovai per una selva oscura,<br>ché la diritta via era smarrita.',
      p: 'A metà del cammino della nostra vita mi ritrovai in una foresta buia, perché avevo smarrito la strada giusta.' },
    { t: 7.9, d: 5.6,
      v: 'Ahi quanto a dir qual era è cosa dura<br>esta selva selvaggia e aspra e forte<br>che nel pensier rinova la paura!',
      p: 'Com’è difficile dire com’era questa selva selvaggia, aspra e impenetrabile: a ripensarci, la paura ritorna.' },
    { t: 14.5, d: 5.6,
      v: 'Io non so ben ridir com’i’ v’intrai,<br>tant’era pien di sonno a quel punto<br>che la verace via abbandonai.',
      p: 'Non so spiegare bene come vi entrai: ero così pieno di sonno, in quel momento, che lasciai la via della verità.' }
  ];
  // le tre fiere: lonza, leone, lupa — solo occhi nel buio
  const EYES_MAT = [0xffd24a, 0xff8a2a, 0xff3020].map(c => new THREE.MeshBasicMaterial({ color: col(c, 5) }));
  const BEASTS = [
    { t: 9.5, x: -8.5, y: 0.45, z: -2, mat: 0, sep: 0.16 },       // lonza: bassa, agile
    { t: 14.8, x: 10, y: 1.5, z: 2.5, mat: 1, sep: 0.3 },          // leone: alto
    { t: 18.5, x: -9, y: 1.0, z: 8, mat: 2, sep: 0.22 }            // lupa: rossa
  ].map(b => {
    const grp = new THREE.Group(); grp.position.set(b.x, b.y, b.z); grp.visible = false;
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), EYES_MAT[b.mat]); e.position.x = s * b.sep; e.scale.set(1, 0.6, 1); grp.add(e); }
    scene.add(grp); return { ...b, grp, seen: false };
  });

  const S = { t: 0, vi: -1, step: 0, drone: 0, active: false };
  const base = { fog: 0.016, exp: renderer.toneMappingExposure };
  const cin = new V3(), look = new V3(), gcam = new V3(), glook = new V3();

  function showVerse(i) {
    const el = $('verse');
    if (i < 0) { el.style.opacity = 0; return; }
    el.firstChild.innerHTML = VERSES[i].v; el.lastChild.textContent = VERSES[i].p; el.style.opacity = 1;
  }

  function startIntro() {
    S.active = true; S.t = 0; S.vi = -1; S.step = 0; S.drone = 0;
    base.fog = scene.fog.density; base.exp = renderer.toneMappingExposure;
    G.state = 'intro';
    $('title').style.display = 'none';
    $('hud').style.transition = 'none'; $('hud').style.opacity = 0;
    $('fade').style.transition = 'none'; $('fade').style.opacity = 1;
    $('canto').style.opacity = 1; $('skip').style.display = 'block';
    P.pos.set(0, 0, -12.5); P.vel.set(0, 0, 0); P.face = 0;
    P.actor.root.position.copy(P.pos); P.actor.root.rotation.set(0, 0, 0);
    P.actor.root.visible = true;
    const w = P.actor.act.Walk; if (w) w.timeScale = 0.62;               // passo stanco, di chi ha sonno
    g.play(P.actor, 'Walk', 0.1);
    scene.fog.density = 0.010; renderer.toneMappingExposure = 1.35;
  }

  function endIntro() {
    S.active = false;
    showVerse(-1);
    $('canto').style.opacity = 0; $('skip').style.display = 'none'; $('fade').style.opacity = 0;
    BEASTS.forEach(b => { b.grp.visible = false; });
    const w = P.actor.act.Walk; if (w) w.timeScale = 1;
    scene.fog.density = base.fog; renderer.toneMappingExposure = base.exp;
    P.pos.set(0, 0, 2.5); P.checkpoint.copy(P.pos); P.face = 0;
    $('hud').style.transition = 'opacity 1.6s'; $('hud').style.opacity = 1;
    g.beginPlay();
  }

  function update(dt) {
    if (!S.active) return;
    S.t += dt; const t = S.t;
    // Dante: cammina nella selva
    const k = clamp((t - 1.0) / 21, 0, 1), dp = danteAt(t);
    P.pos.set(dp.x, 0, dp.z);
    P.actor.root.position.copy(P.pos); P.actor.root.rotation.y = Math.sin(t * 0.5) * 0.12;     // si guarda un po' intorno
    g.play(P.actor, t > 1.0 && k < 1 ? 'Walk' : 'Idle', 0.5);
    torch.position.set(P.pos.x, 2.6, P.pos.z + 0.4);
    // suono: passi lenti e un basso continuo
    if (t > 1.0 && k < 1) { S.step += dt; if (S.step > 1.15) { S.step = 0; g.tone(72, 0.09, 'sine', 0.05, -20); } }
    S.drone -= dt; if (S.drone <= 0) { S.drone = 5.5; g.tone(55, 6.5, 'sine', 0.035); g.tone(82.4, 6.5, 'sine', 0.018); }
    // versi
    let vi = -1; VERSES.forEach((v, i) => { if (t >= v.t && t < v.t + v.d) vi = i; });
    if (vi !== S.vi) { S.vi = vi; showVerse(vi); }
    // fiere
    for (const b of BEASTS) {
      if (t >= b.t && !b.seen) { b.seen = true; b.grp.visible = true; g.tone(60, 0.25, 'sine', 0.12); setTimeout(() => g.tone(60, 0.25, 'sine', 0.1), 330); }
      if (b.seen) { const blink = Math.sin(t * 1.7 + b.x) > 0.96 ? 0.1 : 1; b.grp.scale.y = blink; }
    }
    // luce e nebbia: dal crepuscolo al buio, poi di nuovo il tono di gioco
    const dark = smooth(clamp(t / 16, 0, 1)), back = smooth(clamp((t - (LEN - 3)) / 3, 0, 1));
    scene.fog.density = (0.010 + 0.024 * dark) * (1 - back) + base.fog * back;
    renderer.toneMappingExposure = (1.35 - 0.55 * dark) * (1 - back) + base.exp * back;
    torch.intensity = 22 + 33 * dark;
    $('fade').style.opacity = t < 1.6 ? 1 - t / 1.6 : 0; $('fade').style.transition = 'none';
    if (t > 3) $('canto').style.opacity = 0;
    // macchina da presa: dietro Dante, poi gira lentamente e sale fino alla visuale di gioco
    const cp = camAt(t);
    cin.set(cp.x, cp.y, cp.z);
    look.set(P.pos.x, 1.25, P.pos.z + 1.5);
    gcam.set(P.pos.x + CAM_OFF.x, CAM_OFF.y, P.pos.z + CAM_OFF.z);
    const s = smooth(clamp((t - (LEN - 3.5)) / 3.5, 0, 1));
    camera.position.lerpVectors(cin, gcam, s);
    glook.set(P.pos.x, 0.6, P.pos.z); look.lerp(glook, s);
    camera.lookAt(look);
    g.followSun(P.pos);
    if (t >= LEN) endIntro();
  }

  // /?intro  → avvia da solo l'intro (usato dal link "Rivedi l'intro" della pagina delle storie)
  if (/[?&]intro\b/.test(location.search)) {
    const iv = setInterval(() => { const b = $('go'); if (b && G.state === 'title') { clearInterval(iv); b.click(); } }, 200);
  }

  window.__story = {
    startIntro,
    update,
    skip() { if (S.active) S.t = Math.max(S.t, LEN - 1.6); },
    get active() { return S.active; }
  };
}
