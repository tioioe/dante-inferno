/* ============================================================
   mappa.js — la voragine dell'Inferno su pergamena (tasto M)
   Mostra in quale cerchio e in quale canto ti trovi, con il disegno
   a imbuto dei nove cerchi. Usa solo window.__game.
   ============================================================ */
const g = window.__game;
if (g) {
  const { G, CH } = g;
  const LV = [
    { n: '', name: 'Antinferno', canti: 'Inf. III', who: 'Gli ignavi · Caronte', game: 0 },
    { n: 'I', name: 'Limbo', canti: 'Inf. IV', who: 'Gli spiriti magni · i non battezzati', game: 1 },
    { n: 'II', name: 'Lussuriosi', canti: 'Inf. V', who: 'Minosse · la bufera infernale', game: 2 },
    { n: 'III', name: 'Golosi', canti: 'Inf. VI', who: 'Cerbero · la pioggia e il fango', game: 3 },
    { n: 'IV', name: 'Avari e Prodighi', canti: 'Inf. VII', who: 'Pluto · il masso rotolato' },
    { n: 'V', name: 'Iracondi e Accidiosi', canti: 'Inf. VII–VIII', who: 'Flegiàs · la palude Stige' },
    { n: 'VI', name: 'Eretici', canti: 'Inf. IX–XI', who: 'La città di Dite · le arche roventi' },
    { n: 'VII', name: 'Violenti', canti: 'Inf. XII–XVII', who: 'Il Minotauro · la selva dei suicidi' },
    { n: 'VIII', name: 'Malebolge', canti: 'Inf. XVIII–XXX', who: 'Gerione · le dieci bolge dei fraudolenti' },
    { n: 'IX', name: 'Cocito', canti: 'Inf. XXXI–XXXIV', who: 'I traditori · Lucifero nel ghiaccio' }
  ];
  const st = document.createElement('style');
  st.textContent = `#mappa{position:fixed;inset:0;z-index:99990;display:none;align-items:center;justify-content:center;background:rgba(6,3,2,.78)}
  #mappa .perg{position:relative;width:min(1040px,96vw);max-height:94vh;aspect-ratio:1040/690;filter:drop-shadow(0 18px 40px #000)}
  #mappa svg{width:100%;height:100%;display:block}
  #mappa .x{position:absolute;right:3.6%;top:4.5%;font:700 13px var(--f-label,serif);letter-spacing:.14em;color:#5a3a1c;cursor:pointer;padding:4px 8px;border:1px solid #7a5a32;background:#e8d4a455}
  #mapbtn{position:fixed;left:14px;bottom:14px;z-index:30;font:700 12px var(--f-label,serif);letter-spacing:.14em;color:#3a2410;background:linear-gradient(#e6d09a,#c9a566);border:1px solid #6a4a22;padding:7px 12px;cursor:pointer;box-shadow:0 2px 8px #000a}
  body.cine #mapbtn{display:none}
  @keyframes mpulse{0%,100%{opacity:.35}50%{opacity:.95}}`;
  document.head.appendChild(st);
  const wrap = document.createElement('div'); wrap.id = 'mappa'; document.body.appendChild(wrap);
  const btn = document.createElement('div'); btn.id = 'mapbtn'; btn.textContent = 'MAPPA · M'; document.body.appendChild(btn);

  const W = 1040, H = 690, CX = 285, TOP = 172, BOT = 548, R0 = 215, R1 = 26, RY = 0.2;
  const ring = i => { const f = i / 10; return { y: TOP + (BOT - TOP) * Math.pow(f, 0.92), r: R0 + (R1 - R0) * Math.pow(f, 0.8) }; };
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

  function build() {
    const cur = Math.max(1, Math.min(3, G.circle || 1)), max = Math.max(cur, (window.__bottino && window.__bottino.S && window.__bottino.S.circleMax) || cur);
    const nCh = CH.length || 1, ch = Math.min(nCh, (G.stage || 0) + 1);
    let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="'IM Fell English','Palatino Linotype',Georgia,serif">
    <defs>
      <filter id="rough" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="4" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="14"/></filter>
      <filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="3" result="t"/><feColorMatrix type="matrix" values="0 0 0 0 .35  0 0 0 0 .22  0 0 0 0 .08  0 0 0 .55 -.18"/></filter>
      <filter id="ink"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="11" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.2"/></filter>
      <radialGradient id="pg" cx="50%" cy="46%" r="75%"><stop offset="0" stop-color="#ecd9a8"/><stop offset=".62" stop-color="#d9bd80"/><stop offset="1" stop-color="#a87c3e"/></radialGradient>
      <linearGradient id="cone" x1="0" x2="1"><stop offset="0" stop-color="#6a4020" stop-opacity=".55"/><stop offset=".5" stop-color="#b98a4a" stop-opacity=".12"/><stop offset="1" stop-color="#4a2a12" stop-opacity=".6"/></linearGradient>
      <radialGradient id="glow"><stop offset="0" stop-color="#ff7a30" stop-opacity=".95"/><stop offset="1" stop-color="#ff7a30" stop-opacity="0"/></radialGradient>
    </defs>
    <g filter="url(#rough)"><rect x="22" y="18" width="${W - 44}" height="${H - 36}" rx="10" fill="url(#pg)" stroke="#6a4a22" stroke-width="3"/></g>
    <rect x="22" y="18" width="${W - 44}" height="${H - 36}" rx="10" filter="url(#grain)" opacity=".5"/>
    <rect x="46" y="40" width="${W - 92}" height="${H - 80}" fill="none" stroke="#6a4a22" stroke-width="1.5" opacity=".7"/>
    <rect x="52" y="46" width="${W - 104}" height="${H - 92}" fill="none" stroke="#6a4a22" stroke-width=".7" opacity=".6"/>
    <text x="${W / 2}" y="86" text-anchor="middle" font-size="30" letter-spacing="6" fill="#4a2a10" font-family="'Cinzel Decorative','Cinzel',Georgia,serif" filter="url(#ink)">L’INFERNO DI DANTE</text>
    <text x="${W / 2}" y="112" text-anchor="middle" font-size="15" font-style="italic" fill="#6a4a28">«Per me si va ne la città dolente» — la voragine che scende fino al centro della Terra</text>`;
    const a = ring(0), z = ring(10);
    s += `<path d="M${CX - a.r} ${a.y} C ${CX - a.r * 0.9} ${a.y + 150}, ${CX - z.r * 3} ${z.y - 160}, ${CX - z.r} ${z.y} L ${CX + z.r} ${z.y} C ${CX + z.r * 3} ${z.y - 160}, ${CX + a.r * 0.9} ${a.y + 150}, ${CX + a.r} ${a.y} Z" fill="url(#cone)" stroke="#3a2210" stroke-width="2.4" filter="url(#ink)"/>`;
    for (let i = 0; i < 10; i++) {
      const p = ring(i), q = ring(i + 1), L = LV[i], mid = (p.y + q.y) / 2, rm = (p.r + q.r) / 2;
      const isCur = L.game === cur, played = L.game && L.game <= max, game = !!L.game;
      s += `<ellipse cx="${CX}" cy="${p.y}" rx="${p.r}" ry="${p.r * RY}" fill="none" stroke="#3a2210" stroke-width="${i === 0 ? 2.6 : 1.5}" filter="url(#ink)" opacity=".85"/>`;
      const band = `M${CX - p.r} ${p.y} L${CX - q.r} ${q.y} L${CX + q.r} ${q.y} L${CX + p.r} ${p.y} Z`;
      if (isCur) s += `<path d="${band}" fill="#d84a14" opacity=".38" style="animation:mpulse 1.8s infinite"/>`;
      else if (game) s += `<path d="${band}" fill="#8a5a1e" opacity=".16"/>`;
      s += `<text x="${CX}" y="${mid + 5}" text-anchor="middle" font-size="${i === 9 ? 13 : 17}" fill="${isCur ? '#fff2cf' : '#3a2210'}" font-family="'Cinzel',Georgia,serif" font-weight="700">${L.n || '·'}</text>`;
      const ly = 176 + i * 38, tx = 560, edge = CX + rm * 0.92;
      s += `<path d="M${edge} ${mid} C ${edge + 60} ${mid}, ${tx - 70} ${ly - 5}, ${tx - 12} ${ly - 5}" fill="none" stroke="#6a4a22" stroke-width="1" stroke-dasharray="${game ? '0' : '3 4'}" opacity="${game ? 0.85 : 0.5}"/>
      <circle cx="${edge}" cy="${mid}" r="2.6" fill="#3a2210"/>
      <text x="${tx}" y="${ly}" font-size="18" font-weight="700" fill="${isCur ? '#a02808' : game ? '#3a2210' : '#7a6642'}" font-family="'Cinzel',Georgia,serif">${esc((L.n ? 'Cerchio ' + L.n + ' · ' : '') + L.name)}</text>
      <text x="${tx}" y="${ly + 16}" font-size="13.5" font-style="italic" fill="${game ? '#5a3a1c' : '#8a7650'}">${esc(L.canti + ' — ' + L.who)}</text>`;
      if (isCur) s += `<text x="${tx - 24}" y="${ly}" font-size="20" fill="#c43a10">➤</text>`;
      else if (game && played) s += `<text x="${tx - 24}" y="${ly}" font-size="15" fill="#6a4a22">✓</text>`;
      else if (!game) s += `<text x="${tx - 24}" y="${ly}" font-size="14" fill="#8a7650">✝</text>`;
    }
    const ci = LV.findIndex(l => l.game === cur), p = ring(ci), q = ring(ci + 1), my = (p.y + q.y) / 2 + 20, mx = CX + (p.r + q.r) / 2 * 0.36;
    s += `<circle cx="${mx}" cy="${my}" r="34" fill="url(#glow)" style="animation:mpulse 1.6s infinite"/>
    <g filter="url(#ink)"><circle cx="${mx}" cy="${my - 9}" r="6.5" fill="#e8c9a0" stroke="#2a1608" stroke-width="1.4"/><path d="M${mx - 8} ${my - 12} Q${mx} ${my - 24} ${mx + 8} ${my - 12} L${mx + 9} ${my - 8} L${mx - 9} ${my - 8}Z" fill="#a02010" stroke="#2a1608" stroke-width="1.2"/><path d="M${mx - 8} ${my - 3} L${mx + 8} ${my - 3} L${mx + 11} ${my + 14} L${mx - 11} ${my + 14}Z" fill="#b82818" stroke="#2a1608" stroke-width="1.3"/></g>
    <text x="${mx + 20}" y="${my - 12}" font-size="14" font-style="italic" font-weight="700" fill="#a02808">sei qui</text>
    <text x="${CX}" y="${BOT + 34}" text-anchor="middle" font-size="14" font-style="italic" fill="#5a3a1c">centro della Terra · Lucifero</text>
    <text x="${CX}" y="${TOP - 30}" text-anchor="middle" font-size="14" font-style="italic" fill="#5a3a1c">la selva oscura · la porta dell’Inferno</text>`;
    const L = LV[ci], bx = 360, bw = W - 420;
    s += `<rect x="${bx}" y="${H - 120}" width="${bw}" height="58" fill="#e8d4a4" opacity=".55" stroke="#6a4a22" stroke-width="1.2"/>
    <text x="${bx + bw / 2}" y="${H - 96}" text-anchor="middle" font-size="18" font-weight="700" fill="#3a2210" font-family="'Cinzel',Georgia,serif">${esc('Cerchio ' + L.n + ' — ' + L.name + ' · ' + L.canti)}</text>
    <text x="${bx + bw / 2}" y="${H - 75}" text-anchor="middle" font-size="15" font-style="italic" fill="#5a3a1c">${esc(L.who + ' — camera ' + ch + ' di ' + nCh)}</text>
    <text x="70" y="${H - 80}" font-size="13" fill="#6a4a28" font-style="italic">✓ già attraversato   ➤ qui   ✝ oltre il gioco</text>
    <text x="70" y="${H - 62}" font-size="13" fill="#6a4a28" font-style="italic">M o Esc per chiudere</text></svg>`;
    wrap.innerHTML = '<div class="perg">' + s + '<div class="x">CHIUDI ✕</div></div>';
    wrap.querySelector('.x').onclick = close;
  }
  let open = false, was = false;
  function openMap() {
    if (open || G.state !== 'play') return;
    was = true; G.state = 'cine'; open = true; build(); wrap.style.display = 'flex';
  }
  function close() { if (!open) return; open = false; wrap.style.display = 'none'; if (was && G.state === 'cine') G.state = 'play'; was = false; }
  wrap.addEventListener('mousedown', e => { e.stopPropagation(); if (e.target === wrap) close(); });
  btn.addEventListener('mousedown', e => { e.stopPropagation(); e.preventDefault(); open ? close() : openMap(); });
  addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (open && (k === 'm' || k === 'escape')) { e.stopImmediatePropagation(); e.preventDefault(); close(); return; }
    if (!open && k === 'm' && !e.ctrlKey && !e.metaKey && G.state === 'play') { e.preventDefault(); openMap(); }
  }, true);
  window.__mappa = { open: openMap, close };
}
