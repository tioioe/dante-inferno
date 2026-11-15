/* ============================================================
   didattica.js — il gioco che insegna.
   • Cinematiche di camera (stacco panoramico all'ingresso di ogni camera, ingresso scenico dei boss, apertura di ogni cerchio):
     il gioco si ferma, compaiono le bande nere e una didascalia con il verso e la spiegazione. Si salta con Esc, Spazio, Invio o clic.
   • Addestramento ai comandi (movimento, colpo, scatto, Fuoco di Virgilio, mosse) che si completa facendo le cose, saltabile.
   • Schede del Bestiario alla prima volta che si incontra un mostro, e Bestiario completo con il tasto B.
   • Tasto T: spiegazioni attive / disattivate (si ricorda).
   Usa solo window.__game e window.__focus/__zoom (la camera di main.js segue quel punto).
   Versi di Dante (pubblico dominio) con parafrasi scritte per il gioco.
   ============================================================ */
const g = window.__game;
if (!g || !g.CAM_OFF || !g.CH) console.warn('didattica.js: window.__game non pronto');
else {
  const { THREE, G, P, CH, CAM_OFF } = g;
  const V3 = THREE.Vector3, TAU = Math.PI * 2;
  const ls = { get: k => { try { return localStorage.getItem('dante_' + k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem('dante_' + k, v); } catch (e) {} } };
  let enabled = ls.get('didattica') !== 'off';
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  /* ---------------- testi ---------------- */
  const MON = {
    mMinosse: { name: 'Minosse', where: 'Cerchio I', ref: 'Inf. V, 4-6', verse: ['Stavvi Minòs orribilmente, e ringhia:', 'essamina le colpe ne l’intrata;', 'giudica e manda secondo ch’avvinghia.'],
      para: 'Minosse è il giudice dell’Inferno. All’ingresso esamina la colpa di ogni anima e la manda al cerchio che merita, avvolgendo la coda intorno al corpo tante volte quanti sono i gradi da scendere.',
      tip: 'Prima di ogni colpo a terra compare un cerchio rosso: esci dal cerchio, poi attacca. Richiama dannati di rinforzo e, sotto metà vita, diventa più rapido.' },
    mCerbero: { name: 'Cerbero', where: 'Cerchio III', ref: 'Inf. VI, 13-15', verse: ['Cerbero, fiera crudele e diversa,', 'con tre gole caninamente latra', 'sovra la gente che quivi è sommersa.'],
      para: 'Cerbero custodisce il cerchio dei golosi, sepolti nel fango sotto la pioggia eterna. Ha tre gole di cane, gli occhi vermigli, il ventre largo, e graffia e squarta le anime.',
      tip: 'Le tre teste colpiscono insieme: vedrai più cerchi rossi sparsi. Il fango ti rallenta, non restare fermo. Richiama cani infernali.' },
    mCaronte: { name: 'Caronte', where: 'Cerchio I', ref: 'Inf. III, 82-84', verse: ['Ed ecco verso noi venir per nave', 'un vecchio, bianco per antico pelo,', 'gridando: «Guai a voi, anime prave!»'],
      para: 'Caronte traghetta le anime sull’Acheronte: un vecchio dal pelo bianco con occhi di fiamma, che batte col remo chi si attarda.',
      tip: 'È un campione: molta vita e un colpo a terra con avviso. Tienilo a distanza, schiva il cerchio e colpisci dopo. Lascia sempre arma e armatura.' },
    mFuria: { name: 'Tisifone, Furia', where: 'Cerchio II', ref: 'Inf. IX, 40-42', verse: ['Con idre verdissime eran cinte;', 'serpentelli e ceraste avean per crine,', 'onde le fiere tempie erano avvinte.'],
      para: 'Le Furie – Aletto, Megera e Tisifone – vegliano sulle mura della città di Dite: donne sanguinarie con serpenti al posto dei capelli, che minacciano di chiamare Medusa.',
      tip: 'Colpi ad area con avviso e molta vita. Scatta (Spazio) fuori dall’area e rispondi con il Fuoco di Virgilio (Q).' },
    mMinotauro: { name: 'Minotauro', where: 'Cerchio I', ref: 'Inf. XII, 12-13', verse: ['l’infamia di Creti era distesa,', 'che fu concetta ne la falsa vacca;'],
      para: 'Il Minotauro, nato da Pasifae e dal toro, è il guardiano dei violenti: alla vista dei poeti si morde da solo, preso dalla rabbia.',
      tip: 'Lento ma molto forte. Schivalo con lo Scatto e colpisci mentre recupera: il Turbine (tasto 1) è ottimo in mischia.' },
    mMalebranca: { name: 'Malebranca', where: 'Cerchio I', ref: 'Inf. XXI, 33', verse: ['con l’ali aperte e sovra i piè leggero!'],
      para: 'I Malebranche sono i diavoli neri della quinta bolgia, armati di uncini e forconi, che spingono i barattieri nella pece bollente.',
      tip: 'Piccoli e fragili ma in branco. Non farti circondare: il Turbine (tasto 1) li spazza tutti.' },
    mSemiramide: { name: 'Semiramide', where: 'Cerchio II', ref: 'Inf. V, 58-60', verse: ['L’altra è Semiramìs, di cui si legge', 'che succedette a Nino e fu sua sposa:', 'tenne la terra che ’l Soldan corregge.'],
      para: 'Semiramide, regina d’Assiria, si abbandonò al vizio e rese lecito ciò che era piacere, per cancellare la propria colpa. Qui comanda la bufera che trascina i lussuriosi.',
      tip: 'Il vento a raffiche ti trascina verso di lei: scatta di lato. Colpi ad area con avviso e rinforzi di arpie; sotto metà vita è più rapida.' },
    mAnima: { name: 'Anima trascinata', where: 'Cerchio II', ref: 'Inf. V, 40-42', verse: ['E come li stornei ne portan l’ali', 'nel freddo tempo, a schiera larga e piena,', 'così quel fiato li spiriti mali'],
      para: 'Le anime dei lussuriosi vengono portate dalla bufera come stormi di storni: non hanno pace né speranza di riposo.',
      tip: 'Fragili ma numerose: colpiscile in gruppo con il Turbine (tasto 1).' },
    mIngordo: { name: 'Ingordo (Ciacco)', where: 'Cerchio III', ref: 'Inf. VI, 52-54', verse: ['Voi cittadini mi chiamaste Ciacco:', 'per la dannosa colpa de la gola,', 'come tu vedi, a la pioggia mi fiacco.'],
      para: 'Ciacco è il goloso fiorentino che Dante incontra nel fango: dà il nome a questi dannati ingrassati dalla colpa e sfiniti dalla pioggia.',
      tip: 'Colpi lenti e pesanti: scatta dopo il fendente e rispondi. Il fango rallenta anche te.' },
    mArpia: { name: 'Arpia', where: 'Cerchio II', ref: 'Inf. XIII, 13-15', verse: ['Ali hanno late, e colli e visi umani,', 'piè con artigli, e pennuto ’l gran ventre;', 'fanno lamenti in su li alberi strani.'],
      para: 'Le Arpie fanno il nido nella selva dei suicidi: ali larghe, volti umani, artigli e ventre piumato. I loro lamenti sono parte del tormento.',
      tip: 'Rapide e fragili. Il Grido del Giudizio (tasto 2) le stordisce e le respinge.' }
  };
  const CIRCLE = {
    1: { title: 'Cerchio I · Limbo', ref: 'Inf. IV, 25-27', verse: ['Quivi, secondo che per ascoltare,', 'non avea pianto mai che di sospiri', 'che l’aura etterna facevan tremare.'],
      text: 'Nel Limbo stanno le anime che non hanno peccato ma non hanno ricevuto il battesimo. Non c’è tormento, solo desiderio senza speranza: il loro contrappasso è un eterno sospiro.' },
    2: { title: 'Cerchio II · Lussuriosi', ref: 'Inf. V, 31-33', verse: ['La bufera infernal, che mai non resta,', 'mena li spirti con la sua rapina;', 'voltando e percotendo li molesta.'],
      text: 'Chi si lasciò trascinare dalla passione è trascinato per sempre da una bufera senza posa. È il contrappasso per analogia: la colpa e la pena si assomigliano.' },
    3: { title: 'Cerchio III · Golosi', ref: 'Inf. VI, 10-12', verse: ['Grandine grossa, acqua tinta e neve', 'per l’aere tenebroso si riversa;', 'pute la terra che questo riceve.'],
      text: 'I golosi giacciono nel fango sotto una pioggia sporca e gelata, graffiati da Cerbero: chi si abbandonò ai piaceri della tavola è ridotto a carne nel pantano.' }
  };
  const ROOM = {
    1: { title: 'Il passaggio è sorvegliato', text: 'Sconfiggi tutti i dannati per aprire il cancello di fuoco del corridoio. Il bottino si raccoglie camminandoci sopra: arma e armatura migliori si equipaggiano da sole.' },
    2: { title: 'La sala dell’enigma', text: 'Tre bracieri stanno su isole unite da ponti stretti. Accendili fermandoti sopra mezzo secondo, nell’ordine giusto: Virgilio dà l’indovinello, H chiede un aiuto. Se sbagli, i bracieri si spengono e arrivano dannati.' },
    3: { title: 'La camera tesa', text: 'Qui c’è un campione, più forte dei dannati comuni. Ogni camera raggiunta è un checkpoint: se cadi, riparti da qui con le pozioni rifornite.' }
  };

  /* ---------------- stile ---------------- */
  const css = document.createElement('style');
  css.textContent = `
  #cbT,#cbB{position:fixed;left:0;right:0;height:0;background:#000;z-index:900;transition:height .7s cubic-bezier(.2,.7,.2,1);pointer-events:none}
  #cbT{top:0}#cbB{bottom:0}body.cine #cbT,body.cine #cbB{height:11vh}
  body.cine #hud{opacity:0!important;transition:opacity .5s!important}
  #ccap{position:fixed;left:50%;bottom:13vh;transform:translate(-50%,14px);width:min(720px,90vw);z-index:901;text-align:center;opacity:0;transition:opacity .6s,transform .6s;pointer-events:none;text-shadow:0 2px 6px #000,0 0 18px #000}
  #ccap.on{opacity:1;transform:translate(-50%,0)}
  #ccap h2{margin:0 0 4px;font:700 26px var(--f-title);letter-spacing:.08em;color:#f6dca6}
  #ccap .v{font:italic 20px/1.35 var(--f-body);color:#ffe9b8;margin:6px 0 2px}
  #ccap .r{font:700 11px var(--f-label);letter-spacing:.3em;color:#b8955a;margin-bottom:8px}
  #ccap p{margin:6px auto 0;font:17px/1.45 var(--f-body);color:#ead7b6;max-width:660px}
  #ccap p b{color:#ffb866;font-family:var(--f-label);letter-spacing:.1em;font-size:12px}
  body.cine #tut,body.cine #mcard{opacity:0!important;pointer-events:none}
  #cskip{position:fixed;right:22px;bottom:4vh;z-index:902;display:none;font:700 12px var(--f-label);letter-spacing:.2em;color:#d8b888;background:rgba(20,8,6,.7);border:1px solid #6a4a2a;padding:7px 14px;cursor:pointer}
  body.cine #cskip{display:block}#cskip:hover{color:#fff;border-color:#ffb060}
  .dcard{position:fixed;z-index:850;background:linear-gradient(180deg,rgba(32,16,12,.94),rgba(16,8,6,.94));border:1px solid #7a5a32;box-shadow:0 0 22px #000,inset 0 0 0 3px rgba(0,0,0,.35);color:#ead7b6;pointer-events:auto}
  #mcard{right:18px;top:210px;width:300px;padding:12px 14px 10px;transform:translateX(330px);transition:transform .5s cubic-bezier(.2,.8,.2,1)}
  #mcard.on{transform:none}
  #mcard .k{font:700 10px var(--f-label);letter-spacing:.36em;color:#a88a5a}
  #mcard h3{margin:2px 0 2px;font:700 20px var(--f-title);color:#f6dca6;letter-spacing:.05em}
  #mcard .v{font:italic 14.5px/1.35 var(--f-body);color:#ffe0a0;margin:5px 0 1px}
  #mcard .r{font:700 10px var(--f-label);letter-spacing:.22em;color:#a88a5a;margin-bottom:6px}
  #mcard p{margin:4px 0;font:14.5px/1.4 var(--f-body)} #mcard p b{font:700 11px var(--f-label);letter-spacing:.14em;color:#ff9a50}
  .dx{position:absolute;right:6px;top:3px;cursor:pointer;font:700 12px var(--f-label);color:#a88a5a;padding:2px 5px}.dx:hover{color:#fff}
  #tut{left:50%;top:78px;transform:translate(-50%,-20px);opacity:0;width:min(470px,92vw);padding:10px 16px 12px;text-align:center;transition:opacity .4s,transform .4s}
  #tut.on{opacity:1;transform:translate(-50%,0)}
  #tut .k{font:700 10px var(--f-label);letter-spacing:.36em;color:#a88a5a}
  #tut .t{font:700 17px var(--f-label);letter-spacing:.06em;color:#f6dca6;margin:3px 0}
  #tut .d{font:15px/1.35 var(--f-body)} #tut .bar{height:4px;background:#2a1a12;margin-top:8px}#tut .bar i{display:block;height:100%;width:0;background:#e0a040;transition:width .15s}
  #tut button{margin-top:7px;font:700 10px var(--f-label);letter-spacing:.2em;color:#a88a5a;background:none;border:1px solid #5a4028;padding:4px 10px;cursor:pointer}#tut button:hover{color:#fff;border-color:#ffb060}
  kbd{font:700 12px var(--f-label);background:#3a2418;border:1px solid #8a6a3a;border-bottom-width:2px;padding:0 6px;margin:0 1px;color:#ffe9b8}
  #best{left:50%;top:50%;transform:translate(-50%,-50%);width:min(980px,94vw);max-height:84vh;overflow:auto;padding:16px 18px;z-index:880;display:none}
  #best h2{margin:0 0 4px;text-align:center;font:700 24px var(--f-title);letter-spacing:.1em;color:#f6dca6}
  #best .sub{text-align:center;font:italic 15px var(--f-body);color:#b89a6a;margin-bottom:12px}
  #best .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:10px}
  #best .it{border:1px solid #4a3220;padding:10px 12px;background:rgba(0,0,0,.25)} #best .it.lock{opacity:.45}
  #best h3{margin:0;font:700 17px var(--f-title);color:#f6dca6;letter-spacing:.05em}
  #best .v{font:italic 14px/1.35 var(--f-body);color:#ffe0a0;margin:5px 0 1px}#best .r{font:700 10px var(--f-label);letter-spacing:.2em;color:#a88a5a;margin-bottom:5px}
  #best p{margin:4px 0;font:14px/1.4 var(--f-body)} #best p b{font:700 11px var(--f-label);letter-spacing:.14em;color:#ff9a50}
  #dhint{position:fixed;left:50%;bottom:7px;transform:translateX(-50%);z-index:60;font:600 11px var(--f-label);letter-spacing:.16em;color:rgba(216,184,136,.55);pointer-events:none}
  `;
  document.head.appendChild(css);
  const mk = (id, cls, html, parent = document.body) => { const d = document.createElement('div'); if (id) d.id = id; if (cls) d.className = cls; if (html) d.innerHTML = html; parent.appendChild(d); return d; };
  mk('cbT'); mk('cbB'); const cap = mk('ccap'); const skipBtn = mk('cskip', '', 'SALTA ▸ <span style="opacity:.6">(Esc)</span>');
  const mcard = mk('mcard', 'dcard'); const tut = mk('tut', 'dcard'); const best = mk('best', 'dcard');
  const hint = mk('dhint', '', 'B BESTIARIO · T SPIEGAZIONI ' + (enabled ? 'ON' : 'OFF'));

  /* ---------------- cinematiche ---------------- */
  const DEF_OFF = new V3(11, 19, 11), ease = t => t * t * (3 - 2 * t);
  let cine = null, pausedBy = null;
  const pause = who => { if (G.state === 'play') { pausedBy = who; G.state = 'cine'; return true; } return false; };
  const resume = who => { if (pausedBy === who && G.state === 'cine') G.state = 'play'; if (pausedBy === who) pausedBy = null; };

  function showCap(c) {
    if (!c) { cap.classList.remove('on'); return; }
    cap.innerHTML = (c.title ? `<h2>${esc(c.title)}</h2>` : '') + (c.verse ? `<div class="v">${c.verse.map(esc).join('<br>')}</div><div class="r">${esc(c.ref || '')}</div>` : '') +
      (c.text ? `<p>${esc(c.text)}</p>` : '') + (c.tip ? `<p><b>COME SI AFFRONTA</b> &nbsp;${esc(c.tip)}</p>` : '');
    cap.classList.add('on');
  }
  /* steps: [{ focus: V3 | () => V3, off: [x,y,z], dur, hold, cap }] */
  function startCine(steps, onEnd) {
    if (cine || !enabled || !pause('cine')) return false;
    document.body.classList.add('cine');
    const f0 = new V3().copy(P.pos), o0 = CAM_OFF.clone();
    window.__focus = f0.clone(); window.__zoom = 1;
    cine = { steps, i: -1, t: 0, f0, o0, fFrom: f0.clone(), oFrom: o0.clone(), ret: 0, onEnd, anim: [] };
    nextStep(); return true;
  }
  function nextStep() {
    const c = cine; c.i++; c.t = 0; c.fFrom.copy(window.__focus); c.oFrom.copy(CAM_OFF);
    if (c.i >= c.steps.length) { c.ret = 1; showCap(null); return; }
    const s = c.steps[c.i]; showCap(s.cap); c.anim = s.anim || [];
  }
  function endCine() {
    if (!cine) return; const cb = cine.onEnd; cine = null;
    CAM_OFF.copy(DEF_OFF); delete window.__focus; delete window.__zoom;
    document.body.classList.remove('cine'); showCap(null); resume('cine'); if (cb) cb();
  }
  function runCine(dt) {
    const c = cine; c.t += dt;
    for (const m of c.anim) m.update(dt);
    if (c.ret) {                                              // ritorno morbido verso Dante
      const k = ease(Math.min(1, c.t / 0.9));
      window.__focus.lerpVectors(c.fFrom, P.pos, k); CAM_OFF.lerpVectors(c.oFrom, DEF_OFF, k);
      if (c.t >= 0.9) endCine(); return;
    }
    const s = c.steps[c.i], tgt = typeof s.focus === 'function' ? s.focus() : s.focus, k = ease(Math.min(1, c.t / s.dur));
    window.__focus.lerpVectors(c.fFrom, tgt, k);
    const o = s.off; CAM_OFF.set(c.oFrom.x + (o[0] - c.oFrom.x) * k, c.oFrom.y + (o[1] - c.oFrom.y) * k, c.oFrom.z + (o[2] - c.oFrom.z) * k);
    if (c.t >= s.dur + (s.hold || 0)) nextStep();
  }
  function skipCine() { if (cine) { cine.steps = []; endCine(); } }
  skipBtn.addEventListener('click', e => { e.stopPropagation(); skipCine(); });

  /* durante una cinematica il gioco non riceve input; Esc/Spazio/Invio/clic saltano */
  addEventListener('keydown', e => {
    if (cine) { if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') skipCine(); e.preventDefault(); e.stopImmediatePropagation(); return; }
    if (G.state === 'cine' && pausedBy === 'best' && (e.key === 'Escape' || e.key.toLowerCase() === 'b')) { toggleBest(false); e.preventDefault(); e.stopImmediatePropagation(); return; }
    if (e.key === 'Escape' && tutOn) { endTut(true); }
    const k = e.key.toLowerCase();
    if (k === 't' && G.state !== 'intro' && G.state !== 'title') { enabled = !enabled; ls.set('didattica', enabled ? 'on' : 'off'); hint.textContent = 'B BESTIARIO · T SPIEGAZIONI ' + (enabled ? 'ON' : 'OFF'); g.toast && g.toast(enabled ? '<b>Spiegazioni attive</b><small>Cinematiche, schede e addestramento</small>' : '<b>Spiegazioni disattivate</b><small>T per riattivarle</small>', '#7ab4ff', 2400); if (!enabled) { mcard.classList.remove('on'); endTut(true); } }
    if (k === 'b' && G.state === 'play') toggleBest(true);
    if (tutOn) tutKey(e);
  }, true);
  for (const ev of ['mousedown', 'mouseup', 'contextmenu']) addEventListener(ev, e => { if (cine && !e.target.closest('#cskip')) { if (ev === 'mousedown') skipCine(); e.preventDefault(); e.stopImmediatePropagation(); } else if (ev === 'mousedown' && tutOn) tutMouse(e); }, true);

  /* ---------------- schede dei mostri e Bestiario ---------------- */
  const seen = new Set(JSON.parse(ls.get('seen') || '[]'));
  let cardQ = [], cardT = 0, cardShown = null;
  const cardHTML = (m, k) => `<div class="k">BESTIARIO · ${esc(m.where.toUpperCase())}</div><h3>${esc(m.name)}</h3><div class="v">${m.verse.map(esc).join('<br>')}</div><div class="r">${esc(m.ref)}</div><p>${esc(m.para)}</p><p><b>COME SI AFFRONTA</b> &nbsp;${esc(m.tip)}</p>`;
  function pushCard(key) { if (!MON[key] || cardQ.includes(key) || cardShown === key) return; cardQ.push(key); }
  function runCards(dt) {
    if (cardShown) { cardT -= dt; if (cardT <= 0) { mcard.classList.remove('on'); cardShown = null; cardT = 0.6; } return; }
    cardT -= dt; if (cardT > 0 || !cardQ.length || !enabled) return;
    cardShown = cardQ.shift(); cardT = 14; mcard.innerHTML = '<span class="dx" title="Chiudi">✕</span>' + cardHTML(MON[cardShown]); mcard.classList.add('on');
    mcard.querySelector('.dx').onclick = () => { cardT = 0; };
  }
  function markSeen(key) { if (seen.has(key)) return false; seen.add(key); ls.set('seen', JSON.stringify([...seen])); return true; }
  function toggleBest(open) {
    if (open) {
      if (!pause('best')) return;
      best.innerHTML = '<span class="dx" id="bx">CHIUDI (B)</span><h2>BESTIARIO DELL’INFERNO</h2><div class="sub">I mostri della Commedia che hai incontrato, con i versi che li descrivono</div><div class="grid">' +
        Object.entries(MON).map(([k, m]) => seen.has(k) ? `<div class="it"><h3>${esc(m.name)}</h3><div class="v">${m.verse.map(esc).join('<br>')}</div><div class="r">${esc(m.ref)}</div><p>${esc(m.para)}</p><p><b>COME SI AFFRONTA</b> &nbsp;${esc(m.tip)}</p></div>`
          : `<div class="it lock"><h3>???</h3><p>Non ancora incontrato. Lo troverai nel ${esc(m.where)}.</p></div>`).join('') + '</div>';
      best.style.display = 'block'; best.querySelector('#bx').onclick = () => toggleBest(false);
    } else { best.style.display = 'none'; resume('best'); }
  }

  /* ---------------- addestramento ---------------- */
  const TUT = [
    { t: 'Muoviti', d: 'Tieni premuti <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> per camminare. Il mouse decide dove guarda Dante.', need: 1.4 },
    { t: 'Colpisci', d: 'Clic sinistro: il Fendente dell’Esule. Ogni nemico colpito ti dà un po’ di Fede (la barra blu).', need: 1 },
    { t: 'Scatta', d: 'Premi <kbd>Spazio</kbd>: lo Scatto della Lonza ti sposta in fretta e ti rende invulnerabile per un attimo. È la tua difesa migliore.', need: 1 },
    { t: 'Fuoco di Virgilio', d: 'Clic destro oppure <kbd>Q</kbd>: un proiettile di fuoco che trapassa i nemici. Costa Fede.', need: 1 },
    { t: 'Le mosse speciali', d: '<kbd>1</kbd> Turbine della Bufera (colpisce intorno) · <kbd>2</kbd> Grido del Giudizio (stordisce e respinge). Prova una delle due.', need: 1 }
  ];
  let tutOn = false, tutI = 0, tutP = 0, tutDone = ls.get('tut') === 'done', held = {};
  function showTut() {
    const s = TUT[tutI]; tut.innerHTML = `<span class="dx" style="display:none"></span><div class="k">ADDESTRAMENTO ${tutI + 1}/${TUT.length}</div><div class="t">${s.t}</div><div class="d">${s.d}</div><div class="bar"><i style="width:${Math.min(100, tutP / s.need * 100)}%"></i></div><button>SALTA L’ADDESTRAMENTO (Esc)</button>`;
    tut.querySelector('button').onclick = () => endTut(true); tut.classList.add('on');
  }
  function startTut() { if (tutDone || tutOn || !enabled) return; tutOn = true; tutI = 0; tutP = 0; held = {}; showTut(); }
  function endTut(skipped) {
    if (!tutOn) return; tutOn = false; tutDone = true; ls.set('tut', 'done');
    if (skipped) { tut.classList.remove('on'); return; }
    tut.innerHTML = '<div class="k">ADDESTRAMENTO COMPLETATO</div><div class="t">Sei pronto, Dante</div><div class="d">Durante l’enigma premi <kbd>H</kbd> per l’aiuto di Virgilio · <kbd>R</kbd> beve una pozione · <kbd>Tab</kbd> mostra l’equipaggiamento · <kbd>B</kbd> apre il Bestiario.</div>';
    setTimeout(() => tut.classList.remove('on'), 9000);
  }
  const tutAdvance = () => { tutP = 0; tutI++; if (tutI >= TUT.length) endTut(false); else showTut(); };
  function tutKey(e) {
    const k = e.key.toLowerCase(), s = tutI;
    if (e.type !== 'keydown') return;
    if ('wasd'.includes(k) && k.length === 1) held[k] = true;
    if (s === 2 && k === ' ') tutAdvance(); else if (s === 3 && k === 'q') tutAdvance(); else if (s === 4 && (k === '1' || k === '2')) tutAdvance();
  }
  function tutMouse(e) { if (tutI === 1 && e.button === 0) tutAdvance(); else if (tutI === 3 && e.button === 2) tutAdvance(); }
  addEventListener('keyup', e => { delete held[e.key.toLowerCase()]; }, true);
  function runTut(dt) {
    if (!tutOn || G.state !== 'play') return;
    if (tutI === 0 && (held.w || held.a || held.s || held.d)) { tutP += dt; tut.querySelector('.bar i').style.width = Math.min(100, tutP / TUT[0].need * 100) + '%'; if (tutP >= TUT[0].need) tutAdvance(); }
  }

  /* ---------------- regie ---------------- */
  const seenRoom = new Set(), seenBoss = new WeakSet(); let introDone = false, lastCircle = 0;
  const awakeNear = (r = 16) => G.enemies.some(e => !e.dead && e.state !== 'idle' && Math.hypot(e.pos.x - P.pos.x, e.pos.z - P.pos.z) < r);
  function circleCine(c) {
    const L = CIRCLE[c]; if (!L) return false;
    const center = new V3(P.pos.x, 1.5, P.pos.z), up = new V3(P.pos.x, 3, P.pos.z);
    return startCine([
      { focus: up, off: [3, 4, 12], dur: 2.2, cap: null },
      { focus: new V3(P.pos.x, 4.5, P.pos.z), off: [-9, 30, 14], dur: 2.8, hold: 1.6, cap: { title: L.title, verse: L.verse, ref: L.ref, text: L.text } }
    ], () => { if (c === 1) startTut(); });
  }
  function roomCine(i) {
    const c = CH[i], R = ROOM[i]; if (!c || !R) return false;
    const center = new V3(c.x, 0.5, c.z);
    let feat;
    if (i === 2 && G.pedestals && G.pedestals.length) { feat = new V3(); G.pedestals.forEach(p => feat.add(new V3(p.x, 1.2, p.z))); feat.multiplyScalar(1 / G.pedestals.length); }
    else { const a = c.toNext !== null ? c.toNext : c.toPrev + Math.PI; feat = new V3(c.x + Math.sin(a) * c.r * 0.85, 1.5, c.z + Math.cos(a) * c.r * 0.85); }
    return startCine([
      { focus: center, off: [8, 34, 16], dur: 2.0, cap: { title: c.name } },
      { focus: feat, off: [-6, 7, 13], dur: 2.1, hold: 1.7, cap: { title: R.title, text: R.text } }
    ]);
  }
  function bossCine(e) {
    const key = e.T.model, m = MON[key]; if (!m) return false;
    const dir = new V3(P.pos.x - e.pos.x, 0, P.pos.z - e.pos.z); if (dir.lengthSq() < 0.01) dir.set(0, 0, 1); dir.normalize();
    e.face = Math.atan2(dir.x, dir.z) + Math.PI; e.face = Math.atan2(P.pos.x - e.pos.x, P.pos.z - e.pos.z); e.actor.root.rotation.y = e.face;   // il mostro ti guarda in faccia
    const side = new V3(-dir.z, 0, dir.x), h = e.T.h;
    const face = () => new V3(e.pos.x, h * 0.62, e.pos.z);
    return startCine([
      { focus: () => new V3(e.pos.x, h * 0.3, e.pos.z), off: [dir.x * 5 + side.x * 7, 1.3, dir.z * 5 + side.z * 7], dur: 1.6, cap: null, anim: [e.actor.mixer] },
      { focus: face, off: [dir.x * 9, h * 0.55, dir.z * 9], dur: 1.8, hold: 0.9, cap: { title: e.T.name.split(',')[0], verse: m.verse, ref: m.ref }, anim: [e.actor.mixer] },
      { focus: face, off: [dir.x * 3 - side.x * 8, h * 0.9, dir.z * 3 - side.z * 8], dur: 2.2, hold: 2.0, cap: { title: m.name, text: m.para, tip: m.tip }, anim: [e.actor.mixer] }
    ]);
  }

  let last = performance.now(), cinePending = null;
  function tick(now) {
    requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    runCards(dt);
    if (cine) { runCine(dt); return; }
    if (G.state !== 'play') return;
    runTut(dt);
    if (!enabled) return;
    if (!introDone) { introDone = true; lastCircle = G.circle || 1; seenRoom.add(lastCircle + ':0'); if (!circleCine(lastCircle)) startTut(); return; }
    if ((G.circle || 1) !== lastCircle) { lastCircle = G.circle || 1; seenRoom.add(lastCircle + ':' + P.ch); if (!G.enemies.some(e => !e.dead && e.state !== 'idle')) circleCine(lastCircle); return; }
    if (cardShown === null || true) {
      for (const e of G.enemies) {
        if (e.dead || e.state === 'idle') continue;
        const key = e.T.model;
        if (e.T.boss && !seenBoss.has(e)) { seenBoss.add(e); if (bossCine(e)) { markSeen(key); return; } }
        if (MON[key] && !seen.has(key) && markSeen(key)) pushCard(key);
      }
    }
    const rk = (G.circle || 1) + ':' + P.ch;
    if (P.ch >= 1 && P.ch <= 3 && !seenRoom.has(rk) && !awakeNear()) { seenRoom.add(rk); roomCine(P.ch); }
    else if (!seenRoom.has(rk)) seenRoom.add(rk);
  }
  requestAnimationFrame(tick);
  window.__didattica = { startCine, skipCine, circleCine, roomCine, bossCine, startTut, seen, MON, get cine() { return cine; }, set enabled(v) { enabled = v; } };
}
