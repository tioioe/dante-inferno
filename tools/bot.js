/* Bot di prova per il bilanciamento: gioca con tastiera/mouse simulati, senza trucchi.
   Uso (console del browser):  const b = await import('/tools/bot.js'); await b.run(7000);  */
export async function run(maxSteps = 7000) {
  if (!document.getElementById('pcnt')) { const s = document.createElement('span'); s.id = 'pcnt'; s.style.display = 'none'; document.body.appendChild(s); }
  const T = window.__THREE, g = window.__game, G = window.__G, P = window.__P, CH = window.__CH, LK = window.__LINKS, C = window.__cmd;
  const held = {};
  const key = (k, d) => { if (!!held[k] === d) return; held[k] = d; window.dispatchEvent(new KeyboardEvent(d ? 'keydown' : 'keyup', { key: k })); };
  let mdown = false;
  const setMouse = d => { if (mdown === d) return; mdown = d; window.dispatchEvent(new MouseEvent(d ? 'mousedown' : 'mouseup', { button: 0 })); };
  const aimAt = (x, z) => { const v = new T.Vector3(x, 0.9, z).project(g.camera); window.dispatchEvent(new MouseEvent('mousemove', { clientX: (v.x * 0.5 + 0.5) * innerWidth, clientY: (-v.y * 0.5 + 0.5) * innerHeight })); };
  const moveDir = (dx, dz) => {
    const d = Math.hypot(dx, dz); if (d < 0.01) { ['w', 'a', 's', 'd'].forEach(k => key(k, false)); return; }
    dx /= d; dz /= d; const f = -(dx + dz) / 2, r = (dx - dz) / 2;
    key('w', f > 0.25); key('s', f < -0.25); key('d', r > 0.25); key('a', r < -0.25);
  };
  const st = { deaths: 0, pots: 0, time: {}, minHp: {}, lvlAt: {}, steps: 0, deathStage: [], bossTime: 0 };
  function policy() {
    if (G.state === 'dead') { document.getElementById('rez').click(); st.deaths++; st.deathStage.push(G.stage); moveDir(0, 0); setMouse(false); return; }
    if (G.state !== 'play') { moveDir(0, 0); setMouse(false); return; }
    const stg = G.stage;
    for (const t of G.tele) { const d = Math.hypot(P.pos.x - t.x, P.pos.z - t.z); if (d < t.r + 1.2) { moveDir(P.pos.x - t.x, P.pos.z - t.z); setMouse(false); return; } }
    if (P.hp < P.max * 0.4 && P.potions > 0 && P.potCd <= 0) C.usePotion();
    if (G.bossDead && G.portal) { moveDir(G.portal.x - P.pos.x, G.portal.z - P.pos.z); setMouse(false); return; }
    if (stg === 2 && G.enigma && G.enigma.started && !G.enigma.solved) {
      const want = G.enigma.next[G.enigma.step], p = G.pedestals.find(q => q.v === want), d = Math.hypot(p.x - P.pos.x, p.z - P.pos.z);
      moveDir(d < 0.5 ? 0 : p.x - P.pos.x, d < 0.5 ? 0 : p.z - P.pos.z); setMouse(false); return;
    }
    const alive = G.enemies.filter(e => !e.dead && e.ch === stg);
    if (alive.length === 0) {
      let lt = null, ld = 22;                  // un giocatore vero raccoglie il bottino prima di proseguire
      for (const it of G.loot) { const d = Math.hypot(it.x - P.pos.x, it.z - P.pos.z); if (d < ld) { ld = d; lt = it; } }
      if (lt) { moveDir(lt.x - P.pos.x, lt.z - P.pos.z); setMouse(false); return; }
      const l = LK[stg];
      if (l && l.open) {                       // prima l'imbocco del corridoio, poi il centro della camera successiva
        const dg = Math.hypot(l.gx - P.pos.x, l.gz - P.pos.z);
        const tx = P.ch === stg && dg > 3.5 ? l.gx : CH[stg + 1].x, tz = P.ch === stg && dg > 3.5 ? l.gz : CH[stg + 1].z;
        moveDir(tx - P.pos.x, tz - P.pos.z);
      } else moveDir(CH[stg].x - P.pos.x, CH[stg].z - P.pos.z);
      setMouse(false); return;
    }
    if (P.ch < stg) { moveDir(CH[stg].x - P.pos.x, CH[stg].z - P.pos.z); setMouse(false); return; }
    let b = null, bd = 1e9;
    for (const e of alive) { const d = Math.hypot(e.pos.x - P.pos.x, e.pos.z - P.pos.z); if (d < bd) { bd = d; b = e; } }
    aimAt(b.pos.x, b.pos.z);
    if (b.state === 'idle' && bd > 12) { moveDir(b.pos.x - P.pos.x, b.pos.z - P.pos.z); setMouse(false); return; }
    const near = r => alive.filter(e => Math.hypot(e.pos.x - P.pos.x, e.pos.z - P.pos.z) < r).length;
    if (near(4) >= 3 && P.fede >= 30 && P.turbCd <= 0) C.turbine();
    else if (near(7) >= 4 && P.fede >= 25 && P.novaCd <= 0 && P.hp < P.max * 0.7) C.nova();
    if (bd > 2.6) moveDir(b.pos.x - P.pos.x, b.pos.z - P.pos.z); else moveDir(0, 0);
    setMouse(bd < 3.4);
    if (bd > 5 && P.fede > 40 && P.fireCd <= 0) C.fire();
  }
  // avvia e salta l'intro
  document.getElementById('go').click(); await new Promise(r => setTimeout(r, 300));
  let k = 0; while (G.state === 'intro' && k < 800) { window.__step(0.05); k++; }
  for (let i = 0; i < maxSteps && G.state !== 'win'; i++) {
    const before = P.potions; policy(); window.__step(0.05); st.steps++;
    if (P.potions < before) st.pots++;
    const s = G.state === 'play' ? G.stage : -1;
    if (s >= 0) { st.time[s] = (st.time[s] || 0) + 0.05; st.minHp[s] = Math.min(st.minHp[s] ?? 1e9, P.hp / P.max); if (st.lvlAt[s] === undefined) st.lvlAt[s] = P.level; }
  }
  const f = o => Object.fromEntries(Object.entries(o).map(([a, b]) => [a, +b.toFixed(2)]));
  return { state: G.state, level: P.level, kills: G.kills, deaths: st.deaths, deathStage: st.deathStage, potsUsed: st.pots, tempoTotale: +(st.steps * 0.05).toFixed(0),
    secondiPerCamera: f(st.time), minVitaPerCamera: f(st.minHp), livelloAllIngresso: st.lvlAt, vitaMax: P.max, equip: Object.fromEntries(Object.entries(P.gear).map(([a, v]) => [a, v && v.rarity])) };
}
