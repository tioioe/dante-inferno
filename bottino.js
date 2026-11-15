/* ============================================================
   bottino.js — zaino, potenziamenti, casse e pozioni.
   • Zaino (Tab): 12 posti. Un oggetto migliore si equipaggia da solo e quello vecchio finisce nello zaino; gli altri vanno nello zaino.
     Dallo zaino: Equipaggia, Dissolvi (in Faville), Potenzia (fino a +5, costa Faville).
   • Casse nelle camere (legno, ferro, oro): si aprono con E vicino alla cassa. La cassa della sala dell'enigma è sigillata finché
     l'enigma non è risolto; i boss lasciano una cassa d'oro. Dentro: oggetti, pozioni, Faville, Fiale di Fede, Elisir.
   • Pozioni: R Lacrima di Beatrice (cura) · F Fiala di Fede (+60 Fede) · V Elisir del Veltro (+40% danno e +10% critico per 30 s).
   Usa window.__game (P, G, CH, obstacles, resolveWorld, dropItem, dropPotion, recomputeStats …). main.js chiama window.__bottino.take() a ogni oggetto raccolto.
   ============================================================ */
const g = window.__game;
if (!g || !g.resolveWorld || !g.dropItem) console.warn('bottino.js: window.__game non pronto');
else {
  const { THREE, P, G, CH, obstacles, resolveWorld, recomputeStats, itemLines, hexs, popup, dropItem, dropPotion, toast } = g;
  const V3 = THREE.Vector3, rnd = (a, b) => a + Math.random() * (b - a), esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const BAG = 12, MAXUP = 5, SLOTS = { weapon: 'ARMA', armor: 'VESTE', amulet: 'AMULETO' };
  const S = { bag: [], faville: 0, fede: 0, elisir: 0, elisirT: 0 };
  P.bag = S.bag;

  /* ---------------- oggetti ---------------- */
  const STAT = ['wdmg', 'hp', 'dr', 'crit', 'spd'];
  const score = it => !it ? 0 : (it.wdmg || 0) * 2 + (it.hp || 0) / 8 + (it.dr || 0) * 120 + (it.crit || 0) * 200 + (it.spd || 0) * 120;
  function prep(it) { if (!it.base) { it.base = {}; for (const k of STAT) if (it[k]) it.base[k] = it[k]; it.up = it.up || 0; } return it; }
  const fullName = it => it.name + (it.up ? ' +' + it.up : '');
  const dissolveValue = it => Math.round(6 * (1 + it.ri) * (1 + (it.ilvl || 1) * 0.1) + (it.up || 0) * 10);
  const upCost = it => Math.round(18 * (it.up + 1) * (1 + it.ri * 0.5));
  function applyUp(it) {
    for (const k of STAT) if (it.base[k]) { const v = it.base[k] * (1 + 0.14 * it.up); it[k] = (k === 'wdmg' || k === 'hp') ? Math.round(v) : +v.toFixed(3); }
  }
  const equipped = it => P.gear[it.slot] === it;
  function equip(it) {
    const cur = P.gear[it.slot], i = S.bag.indexOf(it);
    P.gear[it.slot] = it; if (i >= 0) S.bag.splice(i, 1);
    if (cur) S.bag.push(cur);
    recomputeStats();
  }
  function addBag(it) {
    prep(it); S.bag.push(it);
    if (S.bag.length > BAG) {                                      // zaino pieno: il peggiore si dissolve da solo
      let w = 0; S.bag.forEach((x, i) => { if (score(x) < score(S.bag[w])) w = i; });
      const x = S.bag.splice(w, 1)[0], v = dissolveValue(x); S.faville += v;
      toast(`<span style="color:${hexs(x.color)}">${esc(fullName(x))}</span> <small>zaino pieno: dissolto in ${v} Faville</small>`, '#8a6a3a', 3500);
    }
  }
  function take(it, cur) {                                          // chiamato da main.js a ogni oggetto raccolto
    prep(it);
    if (score(it) > score(cur)) {
      if (cur) prep(cur); P.gear[it.slot] = it; if (cur) addBag(cur); recomputeStats();
      toast(`<b style="color:${hexs(it.color)}">${esc(fullName(it))}</b> <small>${it.rarity} · Equipaggiato${cur ? ' · il vecchio è nello zaino' : ''}</small><small>${itemLines(it)}</small>`, hexs(it.color));
    } else {
      addBag(it);
      toast(`<span style="color:${hexs(it.color)}">${esc(fullName(it))}</span> <small>${it.rarity} · nello zaino (Tab)</small>`, hexs(it.color), 3500);
    }
    return true;
  }
  P.gear.weapon && prep(P.gear.weapon);

  /* ---------------- pozioni ---------------- */
  let buffRef = null, buffBonus = 0;
  function useFede() { if (G.state !== 'play' || P.dead || S.fede <= 0 || P.fede >= P.maxF) return; S.fede--; P.fede = Math.min(P.maxF, P.fede + 60); popup(P.pos.x, 2.2, P.pos.z, '+60 Fede', 'heal'); g.emit(P.pos.x, 1, P.pos.z, 24, 0x6aa8ff, 3, 4, 0.8); g.sfx.potion && g.sfx.potion(); }
  function useElisir() {
    if (G.state !== 'play' || P.dead || S.elisir <= 0 || S.elisirT > 0) return; S.elisir--; S.elisirT = 30;
    popup(P.pos.x, 2.2, P.pos.z, 'ELISIR DEL VELTRO', 'xp'); g.emit(P.pos.x, 1, P.pos.z, 40, 0xffb030, 4, 5, 0.9); g.sfx.potion && g.sfx.potion();
  }
  function tickBuff(dt) {
    if (S.elisirT > 0) {
      S.elisirT -= dt;
      if (buffRef !== P.stats) { buffRef = P.stats; buffBonus = Math.ceil((6 + P.stats.wdmg) * 0.4); P.stats.wdmg += buffBonus; P.stats.crit += 0.1; }
      if (S.elisirT <= 0) { if (buffRef === P.stats) { P.stats.wdmg -= buffBonus; P.stats.crit -= 0.1; } buffRef = null; S.elisirT = 0; }
    }
  }

  /* ---------------- casse ---------------- */
  const woodTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    x.fillStyle = '#5a3a1e'; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 8; i++) { x.fillStyle = `rgba(${20 + i * 4},${10 + i * 2},4,.35)`; x.fillRect(0, i * 16, 128, 2); x.fillStyle = 'rgba(255,200,120,.06)'; x.fillRect(0, i * 16 + 3, 128, 5); }
    for (let i = 0; i < 160; i++) { x.fillStyle = `rgba(20,8,0,${Math.random() * 0.25})`; x.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 14, 1); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  })();
  const GLOW = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const TIER = [
    { name: 'CASSA DI LEGNO', wood: 0x6a4424, band: 0x3a3a40, gem: 0xffb050, glow: 0xffa040, big: 1.0 },
    { name: 'CASSA DI FERRO', wood: 0x3c4450, band: 0x8a95a8, gem: 0x70b0ff, glow: 0x60a0ff, big: 1.1 },
    { name: 'FORZIERE D’ORO', wood: 0x7a5418, band: 0xe8b838, gem: 0xff5ac8, glow: 0xffd860, big: 1.25 }
  ];
  function buildChest(tier) {
    const T = TIER[tier], root = new THREE.Group(), k = T.big;
    const wood = new THREE.MeshStandardMaterial({ map: woodTex, color: T.wood, roughness: 0.75, metalness: tier ? 0.35 : 0.05, emissive: T.wood, emissiveIntensity: 0.22 });
    const band = new THREE.MeshStandardMaterial({ color: T.band, roughness: 0.35, metalness: 0.85 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.5 * k, 0.8 * k, 0.9 * k), wood); body.position.y = 0.4 * k; body.castShadow = true; root.add(body);
    for (const x of [-0.55, 0, 0.55]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.1 * k, 0.84 * k, 0.94 * k), band); b.position.set(x * k, 0.4 * k, 0); root.add(b); }
    const lid = new THREE.Group(); lid.position.set(0, 0.8 * k, -0.45 * k);
    const arc = new THREE.Mesh(new THREE.CylinderGeometry(0.45 * k, 0.45 * k, 1.5 * k, 18, 1, false, 0, Math.PI), wood); arc.rotation.z = Math.PI / 2; arc.position.set(0, 0, 0.45 * k); arc.castShadow = true; lid.add(arc);
    for (const x of [-0.55, 0, 0.55]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.47 * k, 0.47 * k, 0.1 * k, 18, 1, false, 0, Math.PI), band); b.rotation.z = Math.PI / 2; b.position.set(x * k, 0, 0.45 * k); lid.add(b); }
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.22 * k, 0.28 * k, 0.1 * k), band); lock.position.set(0, -0.12 * k, 0.93 * k); lid.add(lock);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.09 * k, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(T.gem).multiplyScalar(3) })); gem.position.set(0, -0.1 * k, 1.0 * k); lid.add(gem);
    root.add(lid);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: T.glow, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); glow.scale.set(3.6 * k, 3.6 * k, 1); glow.position.y = 0.7; root.add(glow);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.16, 6, 8, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(T.glow).multiplyScalar(1.4), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })); beam.position.y = 3.2; root.add(beam);
    return { root, lid, glow, beam, gem };
  }
  let chests = [], chestKey = '', orbs = [];
  const clearChests = () => { for (const c of chests) g.scene.remove(c.root); chests = []; };
  function addChest(x, z, tier, opts = {}) {
    const m = buildChest(tier); m.root.position.set(x, 0, z); m.root.rotation.y = opts.yaw != null ? opts.yaw : rnd(0, 6.28); g.scene.add(m.root);
    const c = Object.assign({ x, z, tier, m, open: false, t: 0, lock: null, burst: false }, opts); chests.push(c); return c;
  }
  function spot(i, rMul, ang) {                                      // un punto calpestabile, lontano da ostacoli, isole dei bracieri e dalla zona del boss
    const c = CH[i], spots = (c.spots || []).map(([dx, dz]) => [c.x + dx, c.z + dz]);
    for (let n = 0; n < 24; n++) {
      const a = ang + (n % 2 ? 1 : -1) * Math.floor(n / 2) * 0.35, d = c.r * (rMul + (n % 3) * 0.06), p = new V3(c.x + Math.sin(a) * d, 0, c.z + Math.cos(a) * d);
      resolveWorld(p, 1.1);
      if (obstacles.some(o => Math.hypot(o.x - p.x, o.z - p.z) < o.r + 1.8)) continue;
      if (spots.some(([sx, sz]) => Math.hypot(sx - p.x, sz - p.z) < 4.5)) continue;
      if (Math.hypot(c.x - p.x, c.z - p.z) < 1.2 && c.shape !== 'islands') continue;
      return p;
    }
    return null;
  }
  function populate() {
    clearChests(); orbs.forEach(o => g.scene.remove(o.g)); orbs = [];
    const layout = [[0, 0, 0.55, 1], [1, 0, 0.5, 1], [2, 1, 0.0, 0], [3, 1, 0.55, 1], [3, 0, 0.6, -1]];   // camera, livello, raggio, lato
    for (const [i, tier, rMul, side] of layout) {
      const c = CH[i]; if (!c) continue;
      const a = (c.toPrev !== null && c.toPrev !== undefined ? c.toPrev : 0) + side * Math.PI / 2;
      const p = i === 2 ? (() => { const q = new V3(c.x + 2.4, 0, c.z + 2.4); resolveWorld(q, 1.1); return q; })() : spot(i, rMul, a);
      if (!p) continue;
      const ch = addChest(p.x, p.z, tier, { room: i, yaw: Math.atan2(c.x - p.x, c.z - p.z) });
      if (i === 2) ch.lock = () => !(G.enigma && G.enigma.solved) ? 'Sigillata: risolvi l’enigma' : null;
    }
  }
  function openChest(c) {
    if (c.open) return; const why = c.lock && c.lock(); if (why) { toast(`<b>${why}</b>`, '#8a6a3a', 2500); return; }
    c.open = true; c.t = 0; g.sfx.rare && g.sfx.rare();
  }
  function burst(c) {
    const t = c.tier, il = Math.max(1, P.level + (G.stage || 0) + t);
    const n = [1, 2, 3][t]; for (let i = 0; i < n; i++) { const a = rnd(0, 6.28), d = rnd(1.4, 2.6); dropItem(c.x + Math.sin(a) * d, c.z + Math.cos(a) * d, il, 0.6 + t * 1.2); }
    const pots = [Math.random() < 0.6 ? 1 : 0, 1 + (Math.random() < 0.4 ? 1 : 0), 2][t];
    for (let i = 0; i < pots; i++) { const a = rnd(0, 6.28); dropPotion(c.x + Math.sin(a) * 2, c.z + Math.cos(a) * 2); }
    const fav = [[10, 18], [24, 40], [60, 90]][t], total = Math.round(rnd(fav[0], fav[1])), nOrb = 3 + t;
    for (let i = 0; i < nOrb; i++) { const a = rnd(0, 6.28); addOrb('fav', c.x + Math.sin(a) * rnd(1, 2.4), c.z + Math.cos(a) * rnd(1, 2.4), Math.round(total / nOrb)); }
    if (Math.random() < [0.35, 0.6, 1][t]) addOrb('fede', c.x + rnd(-2, 2), c.z + rnd(-2, 2), 1);
    if (Math.random() < [0.15, 0.35, 0.8][t]) addOrb('elisir', c.x + rnd(-2, 2), c.z + rnd(-2, 2), 1);
    g.emit(c.x, 1.2, c.z, 30 + t * 20, TIER[t].glow, 5, 6, 1); g.flash && g.flash(c.x, 1.4, c.z, 4 + t * 2, TIER[t].glow, 0.3);
  }

  /* ---------------- sfere (Faville, Fiale di Fede, Elisir) ---------------- */
  const ORB = { fav: { c: 0xffc040, r: 0.16, label: 'Faville' }, fede: { c: 0x5aa8ff, r: 0.22, label: 'Fiala di Fede' }, elisir: { c: 0xff9a20, r: 0.24, label: 'Elisir del Veltro' } };
  function addOrb(kind, x, z, amount) {
    const O = ORB[kind], gr = new THREE.Group(); gr.position.set(x, 0, z);
    const m = new THREE.Mesh(kind === 'fav' ? new THREE.OctahedronGeometry(O.r, 0) : new THREE.SphereGeometry(O.r, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(O.c).multiplyScalar(2.6) })); m.position.y = 0.7; gr.add(m);
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: O.c, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); gl.scale.set(1.6, 1.6, 1); gl.position.y = 0.7; gr.add(gl);
    g.scene.add(gr); orbs.push({ kind, amount, x, z, g: gr, m, t: Math.random() * 6 });
  }
  function tickOrbs(dt) {
    for (const o of orbs) {
      o.t += dt; o.m.position.y = 0.7 + Math.sin(o.t * 3) * 0.12; o.m.rotation.y += dt * 2;
      const d = Math.hypot(P.pos.x - o.x, P.pos.z - o.z);
      if (d < 4.5 && !P.dead) { const k = Math.min(1, dt * 6 * (1 - d / 4.5) + dt); o.x += (P.pos.x - o.x) * k; o.z += (P.pos.z - o.z) * k; o.g.position.set(o.x, 0, o.z); }
      if (!P.dead && d < 1.4) {
        o.dead = true; g.scene.remove(o.g); g.sfx.loot && g.sfx.loot();
        if (o.kind === 'fav') { S.faville += o.amount; popup(P.pos.x, 2.1, P.pos.z, `+${o.amount} Faville`, 'xp'); }
        else if (o.kind === 'fede') { S.fede = Math.min(5, S.fede + 1); popup(P.pos.x, 2.1, P.pos.z, '+1 Fiala di Fede (F)', 'heal'); }
        else { S.elisir = Math.min(3, S.elisir + 1); popup(P.pos.x, 2.1, P.pos.z, '+1 Elisir (V)', 'xp'); }
      }
    }
    orbs = orbs.filter(o => !o.dead);
  }

  /* ---------------- interfaccia ---------------- */
  const css = document.createElement('style');
  css.textContent = `
  #bgPrompt{position:fixed;left:50%;bottom:150px;transform:translateX(-50%);z-index:70;font:700 14px var(--f-label);letter-spacing:.14em;color:#f6dca6;background:rgba(18,8,6,.82);border:1px solid #8a6a3a;padding:8px 18px;text-shadow:0 1px 3px #000;display:none;pointer-events:none}
  #bgPrompt kbd,#bag kbd{font:700 12px var(--f-label);background:#3a2418;border:1px solid #8a6a3a;border-bottom-width:2px;padding:0 6px;color:#ffe9b8}
  #bgBelt{position:fixed;right:22px;bottom:160px;z-index:60;display:flex;flex-direction:column;align-items:flex-end;gap:5px;pointer-events:none}
  #bgBelt div{font:700 12px var(--f-label);letter-spacing:.08em;color:#d8b888;background:rgba(18,8,6,.78);border:1px solid #5a4028;padding:5px 9px;min-width:70px;text-align:center}
  #bgBelt div.off{opacity:.4} #bgBelt b{color:#fff} #bgBelt .on{color:#ffc060}
  #bag{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:880;width:min(940px,95vw);max-height:90vh;overflow:auto;display:none;background:linear-gradient(180deg,rgba(34,18,12,.97),rgba(14,7,5,.97));border:1px solid #8a6a3a;box-shadow:0 0 40px #000,inset 0 0 0 4px rgba(0,0,0,.4);color:#ead7b6;padding:16px 20px;font-family:var(--f-body)}
  #bag h2{margin:0;text-align:center;font:700 24px var(--f-title);letter-spacing:.12em;color:#f6dca6} #bag .sub{text-align:center;font:italic 15px var(--f-body);color:#b89a6a;margin-bottom:10px}
  #bag .cols{display:grid;grid-template-columns:300px 1fr;gap:18px} @media(max-width:760px){#bag .cols{grid-template-columns:1fr}}
  #bag h4{margin:0 0 6px;font:700 11px var(--f-label);letter-spacing:.3em;color:#a88a5a}
  .bgSlot{display:flex;align-items:center;gap:10px;border:1px solid #4a3220;background:rgba(0,0,0,.25);padding:7px;margin-bottom:6px;cursor:pointer}
  .bgSlot:hover,.bgSlot.sel,.bgCell:hover,.bgCell.sel{border-color:#ffb060;box-shadow:0 0 10px rgba(255,160,60,.35)}
  .bgIco{width:46px;height:46px;border:2px solid var(--rc,#5a4a3a);background:radial-gradient(circle,rgba(255,255,255,.07),rgba(0,0,0,.4));display:flex;align-items:center;justify-content:center;box-shadow:inset 0 0 12px var(--rg,transparent);flex:none}
  .bgIco svg{width:30px;height:30px;fill:none;stroke:var(--rc,#6a5a48);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
  .bgSlot .sl{font:700 10px var(--f-label);letter-spacing:.25em;color:#a88a5a}.bgSlot .nm{font:700 15px var(--f-label);letter-spacing:.03em}.bgSlot .st{font:13px var(--f-body);color:#d8c0a0}
  .bgGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
  .bgCell{aspect-ratio:1;border:1px solid #4a3220;background:rgba(0,0,0,.28);display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative}
  .bgCell .up{position:absolute;right:3px;bottom:1px;font:700 11px var(--f-label);color:#ffe9b8;text-shadow:0 1px 2px #000}
  #bgInfo{margin-top:12px;border-top:1px solid #4a3220;padding-top:10px;min-height:120px}
  #bgInfo .nm{font:700 18px var(--f-title);letter-spacing:.04em} #bgInfo .rar{font:700 10px var(--f-label);letter-spacing:.3em;margin-left:8px;opacity:.8}
  #bgInfo .ln{font:15px var(--f-body);margin:3px 0} .pos{color:#8aff9a}.neg{color:#ff8a7a}
  #bgInfo button{font:700 12px var(--f-label);letter-spacing:.15em;color:#f0d8a8;background:#3a1c10;border:1px solid #8a5a2a;padding:7px 14px;margin:8px 8px 0 0;cursor:pointer}#bgInfo button:hover:not(:disabled){background:#6a2a14;border-color:#ffb060}#bgInfo button:disabled{opacity:.4;cursor:default}
  #bag .tot{display:flex;flex-wrap:wrap;gap:14px;justify-content:center;margin-top:12px;font:700 12px var(--f-label);letter-spacing:.12em;color:#b89a6a} #bag .tot b{color:#fff;font-size:15px;margin-left:4px}
  #bgX{position:absolute;right:12px;top:8px;cursor:pointer;font:700 12px var(--f-label);letter-spacing:.2em;color:#a88a5a}#bgX:hover{color:#fff}
  `;
  document.head.appendChild(css);
  const prompt = Object.assign(document.createElement('div'), { id: 'bgPrompt' }); document.body.appendChild(prompt);
  const belt = Object.assign(document.createElement('div'), { id: 'bgBelt' }); document.body.appendChild(belt);
  const bag = Object.assign(document.createElement('div'), { id: 'bag' }); document.body.appendChild(bag);
  const ICON = {
    weapon: '<svg viewBox="0 0 32 32"><path d="M7 25 L25 7 M22 5 L27 10 M9 20 L12 23 M5 27 L9 23"/></svg>',
    armor: '<svg viewBox="0 0 32 32"><path d="M8 7 L12 5 L16 8 L20 5 L24 7 L23 17 Q22 24 16 27 Q10 24 9 17 Z"/><path d="M16 8 V26"/></svg>',
    amulet: '<svg viewBox="0 0 32 32"><path d="M10 4 Q16 14 22 4"/><circle cx="16" cy="19" r="6"/><path d="M16 15 L18 19 L16 23 L14 19 Z"/></svg>'
  };
  const ico = it => it ? `<div class="bgIco" style="--rc:${hexs(it.color)};--rg:${it.ri >= 2 ? hexs(it.color) + '99' : 'transparent'}">${ICON[it.slot]}</div>` : '<div class="bgIco">' + '</div>';
  const DELTA = [['wdmg', 'danno', 1], ['hp', 'vita', 1], ['dr', 'riduzione', 100], ['crit', 'critico', 100], ['spd', 'velocità', 100]];
  const fmt = (k, v, m) => (m === 1 ? Math.round(v) : (v * m).toFixed(1) + '%');
  let sel = null, invOpen = false;
  function info() {
    const box = bag.querySelector('#bgInfo'); if (!sel) { box.innerHTML = '<div class="ln" style="color:#8a7a62">Scegli un oggetto per vedere le statistiche, confrontarlo con quello equipaggiato e potenziarlo.</div>'; return; }
    const it = sel, cur = P.gear[it.slot], eq = equipped(it);
    const cmp = !eq && cur ? '<div class="ln"><small>Rispetto a ciò che indossi: ' + DELTA.map(([k, l, m]) => { const d = (it[k] || 0) - (cur[k] || 0); return d ? `<span class="${d > 0 ? 'pos' : 'neg'}">${d > 0 ? '+' : ''}${fmt(k, d, m)} ${l}</span>` : ''; }).filter(Boolean).join(' · ') + '</small></div>' : '';
    const can = it.up < MAXUP, cost = upCost(it);
    box.innerHTML = `<div class="nm" style="color:${hexs(it.color)}">${esc(fullName(it))}<span class="rar">${it.rarity.toUpperCase()} · ${SLOTS[it.slot]}${eq ? ' · EQUIPAGGIATO' : ''}</span></div><div class="ln">${itemLines(it)}</div>${cmp}
      <div>${eq ? '' : '<button id="bgEq">EQUIPAGGIA</button>'}<button id="bgUp" ${can && S.faville >= cost ? '' : 'disabled'}>${can ? `POTENZIA +${it.up + 1} · ${cost} FAVILLE` : 'POTENZIAMENTO MASSIMO'}</button>${eq ? '' : `<button id="bgDis">DISSOLVI · +${dissolveValue(it)} FAVILLE</button>`}</div>`;
    const b = id => box.querySelector(id);
    if (b('#bgEq')) b('#bgEq').onclick = () => { equip(it); sfx(); render(); };
    if (b('#bgUp')) b('#bgUp').onclick = () => { if (S.faville < cost || it.up >= MAXUP) return; S.faville -= cost; it.up++; applyUp(it); if (eq) recomputeStats(); sfx(); render(); };
    if (b('#bgDis')) b('#bgDis').onclick = () => { S.bag.splice(S.bag.indexOf(it), 1); S.faville += dissolveValue(it); sel = null; sfx(); render(); };
  }
  const sfx = () => g.sfx.loot && g.sfx.loot();
  function render() {
    if (!invOpen) return; const s = P.stats;
    const slot = (k) => { const it = P.gear[k]; if (it) prep(it); return `<div class="bgSlot ${sel === it ? 'sel' : ''}" data-eq="${k}">${ico(it)}<div><div class="sl">${SLOTS[k]}</div>${it ? `<div class="nm" style="color:${hexs(it.color)}">${esc(fullName(it))}</div><div class="st">${itemLines(it)}</div>` : '<div class="nm" style="color:#6a5a48">— vuoto —</div>'}</div></div>`; };
    const cells = []; for (let i = 0; i < BAG; i++) { const it = S.bag[i]; cells.push(`<div class="bgCell ${it && sel === it ? 'sel' : ''}" data-i="${i}">${it ? ico(it) + (it.up ? `<span class="up">+${it.up}</span>` : '') : ''}</div>`); }
    bag.innerHTML = `<span id="bgX">CHIUDI (Tab)</span><h2>ZAINO DI DANTE</h2><div class="sub">«Per correr miglior acque alza le vele»</div>
      <div class="cols"><div><h4>EQUIPAGGIAMENTO</h4>${slot('weapon')}${slot('armor')}${slot('amulet')}
        <h4 style="margin-top:12px">STATISTICHE</h4><div class="st" style="font:14px/1.6 var(--f-body)">Livello <b>${P.level}</b> · Vita <b>${P.max}</b> · Danno <b>${6 + s.wdmg}</b><br>Critico <b>${(s.crit * 100).toFixed(1)}%</b> · Riduzione <b>${(s.dr * 100).toFixed(1)}%</b> · Velocità <b>+${(s.spd * 100).toFixed(0)}%</b></div></div>
        <div><h4>ZAINO ${S.bag.length}/${BAG}</h4><div class="bgGrid">${cells.join('')}</div><div id="bgInfo"></div></div></div>
      <div class="tot"><span>FAVILLE<b>${S.faville}</b></span><span>LACRIME DI BEATRICE (R)<b>${P.potions}/5</b></span><span>FIALE DI FEDE (F)<b>${S.fede}/5</b></span><span>ELISIR (V)<b>${S.elisir}/3</b></span></div>
      <div class="sub" style="margin:10px 0 0">Le Faville si trovano nelle casse e sui nemici forti. Dissolvere un oggetto o potenziarlo: <kbd>clic</kbd> su un oggetto.</div>`;
    bag.querySelector('#bgX').onclick = () => toggleInv(false);
    bag.querySelectorAll('.bgSlot').forEach(e => e.onclick = () => { sel = P.gear[e.dataset.eq] || null; render(); });
    bag.querySelectorAll('.bgCell').forEach(e => e.onclick = () => { sel = S.bag[+e.dataset.i] || null; render(); });
    info();
  }
  let paused = false;
  function toggleInv(open) {
    if (open) { if (G.state !== 'play') return; G.state = 'cine'; paused = true; invOpen = true; sel = null; bag.style.display = 'block'; render(); }
    else { invOpen = false; bag.style.display = 'none'; if (paused && G.state === 'cine') G.state = 'play'; paused = false; }
  }
  const canInteract = () => G.state === 'play' && !P.dead;
  addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (invOpen) { if (k === 'tab' || k === 'escape') { toggleInv(false); } if (k !== 'f5' && k !== 'f12') { e.preventDefault(); e.stopImmediatePropagation(); } return; }
    if (!canInteract()) return;
    if (k === 'tab') { e.preventDefault(); e.stopImmediatePropagation(); toggleInv(true); }
    else if (k === 'e' && !e.repeat) { const c = nearChest(); if (c) { e.preventDefault(); openChest(c); } }
    else if (k === 'f' && !e.repeat) useFede();
    else if (k === 'v' && !e.repeat) useElisir();
  }, true);
  const nearChest = () => { let b = null, bd = 3.4; for (const c of chests) { if (c.open) continue; const d = Math.hypot(c.x - P.pos.x, c.z - P.pos.z); if (d < bd) { bd = d; b = c; } } return b; };

  /* ---------------- ciclo ---------------- */
  let last = performance.now(), bossChest = false, fedSeen = new WeakSet();
  function tick(now) {
    requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const key = G.circle + ':' + (CH[0] ? CH[0].x.toFixed(0) + ',' + CH[0].z.toFixed(0) : '');
    if (G.state === 'play' && key !== chestKey) { chestKey = key; bossChest = false; populate(); }
    if (G.state !== 'play') { prompt.style.display = 'none'; if (invOpen || pauseOpen) return; }
    if (G.state === 'dead' && !wasDead) { wasDead = true; deathPenalty(); } else if (G.state !== 'dead') wasDead = false;
    if (G.state === 'play' && !loaded) loadSave();
    saveT += dt; if (saveT > 3) { saveT = 0; save(); }
    tickBuff(dt); tickOrbs(dt);
    for (const c of chests) {
      c.t += dt; c.m.glow.material.opacity = c.open ? 0 : 0.42 + Math.sin(c.t * 2.5) * 0.12; c.m.beam.visible = !c.open; c.m.gem.visible = !c.open;
      if (c.open) { const k = Math.min(1, c.t / 0.7); c.m.lid.rotation.x = -k * k * 1.9; if (!c.burst && c.t > 0.45) { c.burst = true; burst(c); } }
      else if (G.state === 'play' && Math.random() < dt * 3) g.emit && g.emit(c.x + rnd(-0.5, 0.5), 1.0, c.z + rnd(-0.5, 0.5), 1, TIER[c.tier].glow, 0.6, 3, 0.9);
    }
    const nc = G.state === 'play' ? nearChest() : null;
    if (nc) { const why = nc.lock && nc.lock(); prompt.innerHTML = why ? esc(why).toUpperCase() : `<kbd>E</kbd> APRI · ${TIER[nc.tier].name}`; prompt.style.display = 'block'; } else prompt.style.display = 'none';
    belt.innerHTML = `<div class="${S.fede ? '' : 'off'}"><b>F</b> FEDE ×${S.fede}</div><div class="${S.elisir || S.elisirT > 0 ? '' : 'off'}"><b>V</b> <span class="${S.elisirT > 0 ? 'on' : ''}">${S.elisirT > 0 ? 'ELISIR ' + Math.ceil(S.elisirT) + 's' : 'ELISIR ×' + S.elisir}</span></div><div><b>Tab</b> ZAINO · ${S.faville} ◆</div>`;
    /* ricompense: Faville dai nemici forti, cassa d'oro dal boss */
    for (const e of G.enemies) {
      if (!e.dead || fedSeen.has(e)) continue; fedSeen.add(e);
      const n = e.T.boss ? 6 : e.T.elite ? 3 : Math.random() < 0.1 ? 1 : 0, val = e.T.boss ? 14 : e.T.elite ? 9 : 5;
      for (let i = 0; i < n; i++) addOrb('fav', e.pos.x + rnd(-1.5, 1.5), e.pos.z + rnd(-1.5, 1.5), Math.round(val * rnd(0.8, 1.3)));
      if (e.T.boss && !bossChest) { bossChest = true; const p = new V3(e.pos.x + 3.5, 0, e.pos.z + 3.5); resolveWorld(p, 1.4); addChest(p.x, p.z, 2, { yaw: 0.8 }); toast('<b>Un forziere d’oro appare</b><small>Avvicinati e premi E</small>', '#ffd060', 5000); }
    }
  }
  requestAnimationFrame(tick);

  /* ---------------- salvataggio (localStorage) ---------------- */
  const SAVE_KEY = 'dante_save_v1';
  const snap = () => JSON.stringify({ v: 1, lvl: P.level, xp: P.xp, gear: P.gear, bag: S.bag, faville: S.faville, fede: S.fede, elisir: S.elisir, potions: P.potions, circleMax: Math.max(S.circleMax || 1, G.circle || 1), t: Date.now() });
  let loaded = false, lastSnap = '', saveT = 0;
  function loadSave() {
    loaded = true;
    let d = null; try { d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) {}
    if (!d || d.v !== 1) return false;
    P.level = d.lvl || 1; P.xp = d.xp || 0; P.potions = Math.max(P.potions, d.potions || 0);
    for (const k of ['weapon', 'armor', 'amulet']) P.gear[k] = d.gear && d.gear[k] ? prep(d.gear[k]) : null;
    S.bag.length = 0; (d.bag || []).forEach(it => S.bag.push(prep(it)));
    S.faville = d.faville || 0; S.fede = d.fede || 0; S.elisir = d.elisir || 0; S.circleMax = d.circleMax || 1;
    recomputeStats(); P.hp = P.max;
    toast(`<b>Partita ripresa</b><small>Livello ${P.level} · ${S.faville} Faville · ${S.bag.length} oggetti nello zaino</small>`, '#7ab4ff', 5000);
    return true;
  }
  function save() { if (!loaded) return; try { const j = snap(); if (j !== lastSnap) { localStorage.setItem(SAVE_KEY, j); lastSnap = j; } } catch (e) {} }
  const wipeSave = () => { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} lastSnap = ''; };
  addEventListener('beforeunload', save); document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

  /* ---------------- difficoltà e minimappa ---------------- */
  const DIFFS = [{ n: 'PELLEGRINO', k: 0.85, pen: 0 }, { n: 'DANNATO', k: 1.5, pen: 0.1 }, { n: 'INFERNO', k: 2.2, pen: 0.2 }];
  let diffI = 1; try { const v = parseInt(localStorage.getItem('dante_diff'), 10); if (v >= 0 && v < DIFFS.length) diffI = v; } catch (e) {}
  const setDiff = i => { diffI = (i + DIFFS.length) % DIFFS.length; window.__diff = DIFFS[diffI].k; try { localStorage.setItem('dante_diff', String(diffI)); } catch (e) {} };
  setDiff(diffI);
  const TCOL = ['#ffb050', '#70b0ff', '#ffd860'];
  function drawMini(c2d, proj) {                                       // casse chiuse: quadrato col colore del tipo; sigillata: con una croce
    for (const c of chests) {
      const [x, y] = proj(c.x, c.z);
      if (c.open) { c2d.fillStyle = '#4a3a34'; c2d.fillRect(x - 2, y - 2, 4, 4); continue; }
      c2d.fillStyle = '#0a0405'; c2d.fillRect(x - 5, y - 5, 10, 10);
      c2d.fillStyle = TCOL[c.tier]; c2d.fillRect(x - 4, y - 4, 8, 8);
      c2d.strokeStyle = '#1a0a05'; c2d.lineWidth = 1.2; c2d.strokeRect(x - 4, y - 4, 8, 8);
      if (c.lock && c.lock()) { c2d.beginPath(); c2d.moveTo(x - 3, y - 3); c2d.lineTo(x + 3, y + 3); c2d.moveTo(x + 3, y - 3); c2d.lineTo(x - 3, y + 3); c2d.stroke(); }
    }
  }
  let wasDead = false;
  function deathPenalty() {
    const d = DIFFS[diffI]; const lost = Math.floor(S.faville * d.pen); if (!lost) return;
    S.faville -= lost; setTimeout(() => toast(`<b>Hai perso ${lost} Faville</b><small>Difficoltà ${d.n}: ogni caduta costa il ${Math.round(d.pen * 100)}% delle Faville</small>`, '#ff6a50', 5000), 900);
  }

  /* ---------------- pausa (Esc) ---------------- */
  const pm = Object.assign(document.createElement('div'), { id: 'pmenu' }); document.body.appendChild(pm);
  const css2 = document.createElement('style');
  css2.textContent = `#pmenu{position:fixed;inset:0;z-index:890;display:none;background:rgba(0,0,0,.72);align-items:center;justify-content:center}
  #pmenu .box{width:min(380px,90vw);background:linear-gradient(180deg,rgba(34,18,12,.98),rgba(14,7,5,.98));border:1px solid #8a6a3a;box-shadow:0 0 40px #000;padding:20px 22px;text-align:center}
  #pmenu h2{margin:0 0 4px;font:700 26px var(--f-title);letter-spacing:.14em;color:#f6dca6} #pmenu .sub{font:italic 15px var(--f-body);color:#b89a6a;margin-bottom:14px}
  #pmenu button{display:block;width:100%;margin:8px 0;font:700 13px var(--f-label);letter-spacing:.16em;color:#f0d8a8;background:#3a1c10;border:1px solid #8a5a2a;padding:10px;cursor:pointer}#pmenu button:hover{background:#6a2a14;border-color:#ffb060}
  #pmenu .hint{margin-top:10px;font:13px var(--f-body);color:#9a8a6a}`;
  document.head.appendChild(css2);
  let pauseOpen = false, pausedP = false;
  function togglePause(open) {
    if (open) {
      if (G.state !== 'play') return; G.state = 'cine'; pausedP = true; pauseOpen = true;
      const perf = window.__perf, auto = !perf || perf.auto;
      pm.innerHTML = `<div class="box"><h2>PAUSA</h2><div class="sub">«Nel mezzo del cammin di nostra vita»</div>
        <button data-a="go">RIPRENDI (Esc)</button><button data-a="inv">ZAINO (Tab)</button><button data-a="diff">DIFFICOLTÀ: ${DIFFS[diffI].n}</button><button data-a="q">QUALITÀ: ${auto ? 'AUTOMATICA' : 'MASSIMA'} (G)</button>
        <button data-a="snd">SUONI ON/OFF (M)</button><button data-a="mus">MUSICA ON/OFF (N)</button><button data-a="wipe">CANCELLA IL SALVATAGGIO E RICOMINCIA</button>
        <div class="hint">Il gioco si salva da solo: livello, equipaggiamento, zaino, Faville e pozioni.</div></div>`;
      pm.style.display = 'flex';
      pm.querySelectorAll('button').forEach(b => b.onclick = () => {
        const a = b.dataset.a;
        if (a === 'go') togglePause(false);
        else if (a === 'inv') { togglePause(false); toggleInv(true); }
        else if (a === 'diff') { setDiff(diffI + 1); b.textContent = 'DIFFICOLTÀ: ' + DIFFS[diffI].n; }
        else if (a === 'q') { dispatchEvent(new KeyboardEvent('keydown', { key: 'g' })); togglePause(false); }
        else if (a === 'snd') dispatchEvent(new KeyboardEvent('keydown', { key: 'm' }));
        else if (a === 'mus') dispatchEvent(new KeyboardEvent('keydown', { key: 'n' }));
        else if (a === 'wipe') { if (confirm('Cancellare livello, zaino e Faville e ricominciare da capo?')) { wipeSave(); loaded = false; location.reload(); } }
      });
    } else { pauseOpen = false; pm.style.display = 'none'; if (pausedP && G.state === 'cine') G.state = 'play'; pausedP = false; }
  }
  addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (pauseOpen) { togglePause(false); e.preventDefault(); e.stopImmediatePropagation(); return; }
    if (invOpen || G.state !== 'play' || P.dead) return;
    const t = document.getElementById('tut'); if (t && t.classList.contains('on')) return;
    togglePause(true); e.preventDefault();
  }, true);
  addEventListener('keydown', e => { if (pauseOpen && e.key !== 'F5' && e.key !== 'F12') { if (e.key.toLowerCase() === 'g' || e.key.toLowerCase() === 'm' || e.key.toLowerCase() === 'n') return; e.stopImmediatePropagation(); } }, true);
  window.__bottino = { drawMini, setDiff, DIFFS, loadSave, save, wipeSave, togglePause, take, S, chests: () => chests, addChest, openChest, toggleInv, equip, populate, addBag, upCost, TIER };
}
