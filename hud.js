/* ============================================================
   hud.js — HUD di Dante: costruisce i pannelli, aggiorna ricariche,
   mostra le descrizioni delle mosse e rende belli messaggi e inventario.
   Legge solo window.__P / window.__G; mantiene gli id che main.js usa.
   ============================================================ */
import { ICONS, GEAR_ICONS, gem, orbFrame, miniFrame, divider, corner, horn, reticle } from './hud-icons.js';

const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const root = document.documentElement;
const hex = c => '#' + c.toString(16).padStart(6, '0');
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

/* ---------- texture disegnate al volo: pietra scolpita e pergamena ---------- */
function stoneTexture() {
  const c = document.createElement('canvas'); c.width = 320; c.height = 160; const g = c.getContext('2d');
  g.fillStyle = '#251c18'; g.fillRect(0, 0, 320, 160);
  for (let i = 0; i < 2200; i++) {
    const v = 16 + (Math.random() * 28 | 0);
    g.fillStyle = `rgba(${v + 16},${v + 7},${v + 3},${Math.random() * 0.55})`;
    g.fillRect(Math.random() * 320, Math.random() * 160, Math.random() * 14 + 1, Math.random() * 9 + 1);
  }
  g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 2;
  for (let y = 0; y <= 160; y += 40) {
    g.beginPath(); g.moveTo(0, y); g.lineTo(320, y); g.stroke();
    const off = (y / 40 % 2) * 40;
    for (let x = -off; x < 320; x += 80) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 40); g.stroke(); }
  }
  g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 1;
  for (let k = 0; k < 7; k++) {
    let x = Math.random() * 320, y = Math.random() * 160; g.beginPath(); g.moveTo(x, y);
    for (let s = 0; s < 5; s++) { x += (Math.random() - 0.5) * 26; y += Math.random() * 14; g.lineTo(x, y); } g.stroke();
  }
  g.strokeStyle = 'rgba(255,200,140,.07)'; g.lineWidth = 1;
  for (let y = 0; y <= 160; y += 40) { g.beginPath(); g.moveTo(0, y + 1.5); g.lineTo(320, y + 1.5); g.stroke(); }
  return c.toDataURL();
}
function parchTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#2c2016'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * 256, y = Math.random() * 256, r = 20 + Math.random() * 60, gr = g.createRadialGradient(x, y, 0, x, y, r);
    const k = Math.random() < 0.5; gr.addColorStop(0, k ? 'rgba(90,60,28,.28)' : 'rgba(20,10,6,.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  g.strokeStyle = 'rgba(200,160,100,.05)';
  for (let i = 0; i < 260; i++) { const x = Math.random() * 256, y = Math.random() * 256; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 18, y + (Math.random() - 0.5) * 18); g.stroke(); }
  const v = g.createRadialGradient(128, 128, 60, 128, 128, 190); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.5)');
  g.fillStyle = v; g.fillRect(0, 0, 256, 256);
  return c.toDataURL();
}
root.style.setProperty('--stone', `url(${stoneTexture()})`);
root.style.setProperty('--parch', `url(${parchTexture()})`);
root.style.setProperty('--reticle', `url("data:image/svg+xml;utf8,${reticle}") 17 17, crosshair`);

/* ---------- le sei mosse: nome, testo, versi e numeri ---------- */
const P0 = () => window.__P || { stats: { wdmg: 0 }, level: 1, potions: 0, max: 100 };
const dmg = m => { const P = P0(), b = (6 + P.stats.wdmg) * (1 + 0.1 * (P.level - 1)) * m; return `${Math.round(b * 0.9)}–${Math.round(b * 1.1)}`; };
const SK = [
  { id: 's0', icon: 'slash', key: 'CLICK', max: 0.38, cost: 0, th: ['#d89a4a', '#ff9a40'], cd: P => P.atkCd,
    name: 'Fendente dell’Esule', type: 'ATTACCO BASE',
    desc: 'Un colpo d’arco con la spada fiammeggiante: colpisce tutti i nemici di fronte a te e ti ricarica di Fede.',
    stats: () => [['Danno', dmg(1), 'or'], ['Portata', '3,3 m'], ['Ricarica', '0,38 s'], ['Fede', '+7 per nemico colpito', 'bl']],
    flavor: '«Non ragioniam di lor, ma guarda e passa.»', src: 'INFERNO III · 51' },
  { id: 's1', icon: 'fire', key: 'DX · Q', max: 1.0, cost: 12, th: ['#e0602a', '#ff6a20'], cd: P => P.fireCd,
    name: 'Fuoco di Virgilio', type: 'PROIETTILE',
    desc: 'Una cometa di fiamma che il Maestro accende per te: attraversa i dannati in fila e li brucia tutti.',
    stats: () => [['Danno', dmg(2.2), 'or'], ['Effetto', 'trapassa i nemici'], ['Costo', '12 Fede', 'bl'], ['Ricarica', '1,0 s']],
    flavor: '«Facesti come quei che va di notte, che porta il lume dietro e sé non giova.»', src: 'PURGATORIO XXII · 67' },
  { id: 's2', icon: 'whirl', key: '1', max: 2.0, cost: 30, th: ['#e08a30', '#ff8a24'], cd: P => P.turbCd,
    name: 'Turbine della Bufera', type: 'AREA · ROTAZIONE',
    desc: 'Ruoti su te stesso trascinando la bufera: tre colpi consecutivi a chiunque ti circondi.',
    stats: () => [['Danno', `3 × ${dmg(0.7)}`, 'or'], ['Raggio', '3,9 m'], ['Costo', '30 Fede', 'bl'], ['Ricarica', '2,0 s']],
    flavor: '«La bufera infernal, che mai non resta.»', src: 'INFERNO V · 31' },
  { id: 's3', icon: 'cry', key: '2', max: 7.0, cost: 25, th: ['#6a9aff', '#7ab0ff'], cd: P => P.novaCd,
    name: 'Grido del Giudizio', type: 'ONDA D’URTO',
    desc: 'L’urlo di Minosse squarcia l’aria: respinge ogni nemico attorno e lo lascia stordito.',
    stats: () => [['Danno', dmg(1.4), 'or'], ['Raggio', '7,5 m'], ['Effetto', 'stordisce 0,9 s'], ['Costo', '25 Fede', 'bl'], ['Ricarica', '7,0 s']],
    flavor: '«Stavvi Minòs orribilmente, e ringhia.»', src: 'INFERNO V · 4' },
  { id: 's4', icon: 'dash', key: 'SPAZIO', max: 0.9, cost: 0, th: ['#e0a040', '#ffc060'], cd: P => P.dashCd,
    name: 'Scatto della Lonza', type: 'MOVIMENTO',
    desc: 'Balzi via come la fiera maculata, rapido e inafferrabile: per un istante nulla può colpirti.',
    stats: () => [['Distanza', '4,3 m'], ['Effetto', 'invulnerabile 0,3 s', 'gr'], ['Ricarica', '0,9 s']],
    flavor: '«Una lonza leggiera e presta molto.»', src: 'INFERNO I · 32' },
  { id: 's5', icon: 'potion', key: 'R', max: 4.0, cost: 0, th: ['#e0507a', '#ff6a9a'], cd: P => P.potCd,
    name: 'Lacrima di Beatrice', type: 'RISTORO',
    desc: 'Una goccia di pietà scesa dal cielo: ti restituisce una parte della vita perduta.',
    stats: () => { const P = P0(); return [['Cura', `${Math.round(P.max * 0.4)} (40%)`, 'gr'], ['Scorte', `${P.potions} / 5`], ['Ricarica', '4,0 s']]; },
    flavor: '«Donna è gentil nel ciel che si compiange.»', src: 'INFERNO II · 94' }
];

/* ---------- scala automatica ---------- */
function rescale() { root.style.setProperty('--hs', clamp(Math.min(innerWidth / 1050, innerHeight / 700), 0.55, 1).toFixed(3)); }
rescale(); addEventListener('resize', rescale);

/* ---------- costruzione dei pannelli ---------- */
const slotHTML = d => `<div class="sk" id="${d.id}" style="--rc:${d.th[0]};--rg:${d.th[1]}">
  <div class="ico">${ICONS[d.icon]}</div><div class="sweep"></div><div class="t"></div>
  ${d.cost ? `<span class="cost">${d.cost}</span>` : ''}${d.id === 's5' ? '<span class="cnt" id="pcnt">3</span>' : ''}
  <span class="key">${d.key}</span><i class="legacy"></i></div>`;
let ticks = ''; for (let i = 1; i < 10; i++) ticks += `<span class="tick" style="left:${i * 10}%"></span>`;

$('bottom').innerHTML = `
  <div class="orbwrap hp"><div class="orb hp"><div class="fill" id="hpfill"></div><span id="hptxt"></span></div>${orbFrame('hp')}<div class="orblabel">VITA</div></div>
  <div id="center">
    <div id="skills"><span class="corner tl">${corner}</span><span class="corner tr">${corner}</span><span class="corner bl">${corner}</span><span class="corner br">${corner}</span>${SK.map(slotHTML).join('')}</div>
    <div id="xpwrap"><div id="xp"></div>${ticks}<span id="lvl"></span></div>
  </div>
  <div class="orbwrap res"><div class="orb res"><div class="fill" id="resfill"></div><span id="restxt"></span></div>${orbFrame('res')}<div class="orblabel">FEDE</div></div>`;
// gli angoli sono SVG dentro span: li distribuisco con le classi corner
document.querySelectorAll('#skills > span.corner').forEach(s => { const svg = s.firstElementChild; svg.setAttribute('class', 'corner ' + s.className.split(' ')[1]); s.replaceWith(svg); });

$('mini').querySelector('img').outerHTML = miniFrame();
$('zone').innerHTML = `<div id="zlabel">INFERNO · PRIMA CANTICA</div><b id="zname"></b><span id="zsub"></span>${divider(250)}<div id="obj"></div>`;
$('boss').innerHTML = `<div id="bossname"></div><div class="bossrow">${horn}<div id="bossbar"><i id="bossfill"></i><s style="left:50%"></s><s style="left:30%"></s></div>${horn.replace('class="horn"', 'class="horn r"')}</div>`;
$('banner').innerHTML = `${divider(360)}<b id="bt"></b><span id="bs"></span>${divider(360)}`;

/* ---------- aggiornamento continuo: ricariche, Fede, esaurito ---------- */
const els = SK.map(d => $(d.id)), prev = SK.map(() => 0), tmo = els.map(() => null);
function flag(i, cls, ms) { const e = els[i]; e.classList.remove(cls); void e.offsetWidth; e.classList.add(cls); clearTimeout(tmo[i + cls]); tmo[i + cls] = setTimeout(() => e.classList.remove(cls), ms); }
function loop() {
  requestAnimationFrame(loop);
  const P = window.__P; if (!P) return;
  SK.forEach((d, i) => {
    const e = els[i], cd = Math.max(0, d.cd(P)), f = clamp(cd / d.max, 0, 1);
    e.style.setProperty('--p', ((1 - f) * 360).toFixed(1) + 'deg');
    const t = e.querySelector('.t'); const txt = d.max >= 1 && cd > 0.05 ? (cd >= 10 ? String(Math.ceil(cd)) : cd.toFixed(1)) : '';
    if (t.textContent !== txt) t.textContent = txt;
    e.classList.toggle('lowfede', !!d.cost && P.fede < d.cost);
    e.classList.toggle('empty', d.id === 's5' && P.potions <= 0);
    if (cd > prev[i] + 0.02 && f > 0.85) flag(i, 'used', 280);
    if (prev[i] > 0 && cd === 0 && d.max >= 0.9) flag(i, 'ready', 600);
    prev[i] = cd;
  });
}
loop();

/* ---------- descrizione di una mossa al passaggio del mouse ---------- */
const tip = el('div'); tip.id = 'tip'; document.body.appendChild(tip);
let tipI = -1;
function renderTip(i) {
  const d = SK[i];
  tip.innerHTML = `<div class="tn">${d.name}</div><div class="tk"><span>${d.type}</span><em>${d.key}</em></div>${divider(190)}
    <div class="td">${d.desc}</div>
    <div class="ts">${d.stats().map(([a, b, c]) => `<span>${a}</span><b class="${c || ''}">${b}</b>`).join('')}</div>
    <div class="tf">${d.flavor}<small>${d.src}</small></div>`;
}
function placeTip(i) {
  const r = els[i].getBoundingClientRect(), w = 310, h = tip.offsetHeight;
  tip.style.left = clamp(r.left + r.width / 2 - w / 2, 8, innerWidth - w - 8) + 'px';
  tip.style.top = Math.max(8, r.top - h - 22) + 'px';
}
els.forEach((e, i) => {
  e.addEventListener('mouseenter', () => { tipI = i; renderTip(i); tip.classList.add('on'); placeTip(i); });
  e.addEventListener('mouseleave', () => { tipI = -1; tip.classList.remove('on'); });
  e.addEventListener('mousedown', ev => ev.stopPropagation());       // cliccare una mossa non deve far partire un attacco
});
setInterval(() => { if (tipI >= 0) { renderTip(tipI); placeTip(tipI); } }, 250);

/* ---------- messaggi: Virgilio, Minosse, iscrizioni ---------- */
const msg = $('msg');
function renderSay(t) {
  let narr = '', who = '', main = t, para = '';
  const m = t.match(/(?:^|\s)(Virgilio|Minosse)\s*:\s*/);
  if (m) { narr = t.slice(0, m.index).trim(); who = m[1]; main = t.slice(m.index + m[0].length); }
  const parts = main.split(/\s+[—–]\s+/); main = parts[0]; para = parts.slice(1).join(' — ');
  const q = main.indexOf('«');
  if (!who && q > 0) { narr = (narr + ' ' + main.slice(0, q)).trim(); main = main.slice(q); }
  const hint = main.match(/^(.*»)\s*(\(.*\))\s*$/); if (hint) { main = hint[1]; para = (para ? para + ' ' : '') + hint[2]; }
  const wrap = el('div', 'say');
  if (!/«/.test(main) && !who) { wrap.appendChild(el('div', 'plain', t)); return wrap; }
  if (narr) wrap.appendChild(el('div', 'narr', narr));
  let label = who ? who.toUpperCase() : 'IL VERSO', cls = who === 'Minosse' ? 'min' : '';
  if (/Per me si va/.test(main)) { label = 'ISCRIZIONE SULLA PORTA'; cls = 'ins'; }
  wrap.appendChild(el('div', 'spk ' + cls, label));
  wrap.appendChild(el('div', 'vtxt', main));
  if (para) wrap.appendChild(el('div', 'para', para));
  return wrap;
}
const mo = new MutationObserver(() => {
  if (msg.querySelector('.say') || !msg.textContent.trim()) return;
  const node = renderSay(msg.textContent.trim()); msg.replaceChildren(node); mo.takeRecords();
});
mo.observe(msg, { childList: true, characterData: true, subtree: true });

/* ---------- notifiche degli oggetti: gemma colorata ---------- */
new MutationObserver(list => {
  for (const r of list) for (const t of r.addedNodes) {
    if (!(t instanceof HTMLElement) || t.dataset.dec) continue;
    t.dataset.dec = 1;
    const c = getComputedStyle(t).borderLeftColor, inner = t.innerHTML;
    t.innerHTML = gem(c) + `<div class="tt">${inner}</div>`; t.querySelector('.gem').style.color = c;
  }
}).observe($('toasts'), { childList: true });

/* ---------- inventario ---------- */
const inv = $('inv');
const lines = it => [it.wdmg && `+${it.wdmg} danno`, it.hp && `+${it.hp} vita`, it.dr && `${(it.dr * 100).toFixed(1)}% riduzione danni`, it.crit && `+${(it.crit * 100).toFixed(1)}% critico`, it.spd && `+${(it.spd * 100).toFixed(1)}% velocità`].filter(Boolean).join(' · ');
function renderInv() {
  const P = window.__P; if (!P) return;
  const row = (slot, lab) => {
    const it = P.gear[slot], c = it ? hex(it.color) : '#5a4a3a';
    return `<div class="row"><div class="ib ${it ? '' : 'none'}" style="--rc:${c};--rg:${it && it.ri >= 2 ? c + '88' : 'transparent'}">${GEAR_ICONS[slot]}</div>
      <div class="tx"><div class="sl">${lab}</div>${it ? `<div class="nm" style="color:${c}">${it.name}<span class="rar">${it.rarity.toUpperCase()}</span></div><div class="st">${lines(it)}</div>` : '<div class="nm" style="color:#6a5a48">— vuoto —</div><div class="st">Nessun oggetto equipaggiato</div>'}</div></div>`;
  };
  const s = P.stats;
  inv.innerHTML = `<div class="is">PELLEGRINO NELLA SELVA</div><div class="it">DANTE ALIGHIERI</div>${divider(320)}
    <div class="slots">${row('weapon', 'ARMA')}${row('armor', 'VESTE')}${row('amulet', 'AMULETO')}</div>
    <div class="sum"><div>LIVELLO<b>${P.level}</b></div><div>VITA<b>${P.max}</b></div><div>DANNO<b>${6 + s.wdmg}</b></div>
      <div>CRITICO<b>${(s.crit * 100).toFixed(1)}%</b></div><div>RIDUZIONE<b>${(s.dr * 100).toFixed(1)}%</b></div><div>VELOCITÀ<b>+${(s.spd * 100).toFixed(0)}%</b></div></div>
    <div class="hint">Tab per chiudere · Lacrime di Beatrice: ${P.potions} / 5</div>`;
}
const invObs = new MutationObserver(() => { if (inv.querySelector('.slots')) return; renderInv(); invObs.takeRecords(); });
invObs.observe(inv, { childList: true });

/* ---------- schermata del titolo: divisore sotto il sottotitolo ---------- */
const title = $('title');
const tObs = new MutationObserver(() => {
  const h2 = title.querySelector('h2');
  if (h2 && !title.querySelector('.div')) { h2.insertAdjacentHTML('afterend', divider(300)); tObs.takeRecords(); }
});
tObs.observe(title, { childList: true });
