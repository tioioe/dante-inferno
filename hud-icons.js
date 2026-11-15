/* ============================================================
   hud-icons.js — icone e cornici dell'HUD, tutte disegnate a mano in SVG.
   Nessuna icona di pacchetti esterni: ogni mossa ha la sua.
   ============================================================ */

/* ---------- le sei mosse ---------- */
export const ICONS = {

  /* Fendente dell'Esule: lama d'acciaio con scia di fuoco a mezzaluna */
  slash: `<svg viewBox="0 0 64 64"><defs>
    <linearGradient id="ic0t" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#ff3a08" stop-opacity="0"/><stop offset=".55" stop-color="#ff7a20" stop-opacity=".95"/><stop offset="1" stop-color="#fff0b0"/></linearGradient>
    <linearGradient id="ic0b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffaf0"/><stop offset=".5" stop-color="#bdb6a6"/><stop offset="1" stop-color="#5e594e"/></linearGradient>
    <radialGradient id="ic0g"><stop offset="0" stop-color="#ffe3a0"/><stop offset="1" stop-color="#8a5a1c"/></radialGradient></defs>
    <path d="M5 52C8 28 30 6 59 7C41 15 24 30 13 58Z" fill="url(#ic0t)"/>
    <path d="M9 47C16 31 32 16 53 10" stroke="#fff6d0" stroke-width="1.3" fill="none" opacity=".85"/>
    <path d="M21 45L55 5L59 8.500L28 49Z" fill="url(#ic0b)" stroke="#2c2820" stroke-width=".9" stroke-linejoin="round"/>
    <path d="M26 45L56 7" stroke="#fff" stroke-width="1" opacity=".75"/>
    <path d="M15 38L30 53" stroke="#2c1a06" stroke-width="6" stroke-linecap="round"/>
    <path d="M15 38L30 53" stroke="url(#ic0g)" stroke-width="4" stroke-linecap="round"/>
    <path d="M22 48L12 58" stroke="#2a1208" stroke-width="4.500" stroke-linecap="round"/>
    <path d="M22 48L12 58" stroke="#a06a3a" stroke-width="1.200" stroke-dasharray="2 2.200"/>
    <circle cx="10.500" cy="59.500" r="3.400" fill="url(#ic0g)" stroke="#2c1a06" stroke-width=".8"/>
    <circle cx="44" cy="21" r="1.700" fill="#fff4b8"/><circle cx="36" cy="13" r="1.200" fill="#ffd460"/><circle cx="51" cy="28" r="1.100" fill="#ffb040"/><circle cx="30" cy="22" r=".9" fill="#ffe090"/></svg>`,

  /* Fuoco di Virgilio: cometa di fuoco con anello rune */
  fire: `<svg viewBox="0 0 64 64"><defs>
    <radialGradient id="ic1c" cx=".5" cy=".55"><stop offset="0" stop-color="#fffdf0"/><stop offset=".3" stop-color="#ffd860"/><stop offset=".7" stop-color="#ff6a14"/><stop offset="1" stop-color="#9a1400"/></radialGradient>
    <linearGradient id="ic1t" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#ff3000" stop-opacity="0"/><stop offset="1" stop-color="#ff9a40" stop-opacity=".95"/></linearGradient></defs>
    <circle cx="32" cy="32" r="28" fill="none" stroke="#ffb060" stroke-width="1" stroke-dasharray="1.500 4" opacity=".65"/>
    <circle cx="32" cy="32" r="24.500" fill="none" stroke="#ff8a30" stroke-width=".6" opacity=".4"/>
    <path d="M3 60C9 41 18 30 29 25L37 35C31 46 19 54 3 60Z" fill="url(#ic1t)"/>
    <path d="M7 52C20 46 27 39 31 30" stroke="#ffe0a0" stroke-width="1.300" fill="none" opacity=".75"/>
    <path d="M13 56C22 54 30 48 34 41" stroke="#ff9a40" stroke-width="1" fill="none" opacity=".6"/>
    <path d="M45 6C53 15 58 22 56 32C54 42 45 49 36 47C27 45 23 36 27 28C29 23 34 21 34 15C38 17 43 13 45 6Z" fill="url(#ic1c)"/>
    <path d="M43 27C48 31 49 36 46 40C43 44 37 43 37 38C37 34 41 32 43 27Z" fill="#fffbe8" opacity=".92"/>
    <path d="M49 12C52 15 54 18 53 21" stroke="#fff2b8" stroke-width="1.200" fill="none" opacity=".8"/>
    <circle cx="19" cy="22" r="1.300" fill="#ffd060"/><circle cx="55" cy="45" r="1.200" fill="#ff9a40"/><circle cx="12" cy="36" r="1" fill="#ffb060"/></svg>`,

  /* Turbine della Bufera: tre falci di fuoco attorno alla spada */
  whirl: `<svg viewBox="0 0 64 64"><defs>
    <linearGradient id="ic2w" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0b0"/><stop offset=".45" stop-color="#ff8a24"/><stop offset="1" stop-color="#b02000" stop-opacity=".25"/></linearGradient>
    <linearGradient id="ic2b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#8a8474"/></linearGradient>
    <path id="ic2c" d="M32 4C48 4 59 15 59 31C59 21 50 13 38 13C30 13 26 9 32 4Z"/></defs>
    <circle cx="32" cy="32" r="29" fill="none" stroke="#ffb060" stroke-width=".8" stroke-dasharray="1 5" opacity=".5"/>
    <use href="#ic2c" fill="url(#ic2w)"/>
    <use href="#ic2c" fill="url(#ic2w)" transform="rotate(120 32 32)"/>
    <use href="#ic2c" fill="url(#ic2w)" transform="rotate(240 32 32)"/>
    <g opacity=".85" stroke="#fff4c8" stroke-width="1" fill="none" stroke-linecap="round">
      <path d="M36 7C47 8 55 15 57 25"/><path d="M12 45C9 36 13 24 22 18" transform="rotate(0)"/><path d="M40 57C30 60 18 55 12 46" /></g>
    <path d="M32 11L35.500 19V43H28.500V19Z" fill="url(#ic2b)" stroke="#2a261e" stroke-width=".9" stroke-linejoin="round"/>
    <path d="M32 13V42" stroke="#9a9484" stroke-width=".8"/>
    <rect x="24" y="42" width="16" height="3.600" rx="1.800" fill="#d8a850" stroke="#3a2408" stroke-width=".8"/>
    <rect x="30" y="45" width="4" height="9" rx="1.500" fill="#4a2410"/>
    <circle cx="32" cy="55.500" r="2.600" fill="#d8a850" stroke="#3a2408" stroke-width=".8"/></svg>`,

  /* Grido del Giudizio: maschera cornuta di Minosse con onde di ghiaccio */
  cry: `<svg viewBox="0 0 64 64"><defs>
    <radialGradient id="ic3g" cx=".5" cy=".5"><stop offset="0" stop-color="#7ab0ff" stop-opacity=".75"/><stop offset="1" stop-color="#2050c0" stop-opacity="0"/></radialGradient>
    <linearGradient id="ic3s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f0e4"/><stop offset=".6" stop-color="#b8b1a0"/><stop offset="1" stop-color="#6a6454"/></linearGradient>
    <linearGradient id="ic3h" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#8a8272"/><stop offset="1" stop-color="#eee8d8"/></linearGradient></defs>
    <circle cx="32" cy="32" r="31" fill="url(#ic3g)"/>
    <g fill="none" stroke="#bfe0ff" stroke-linecap="round" stroke-width="2"><path d="M8 24Q3 32 8 40" opacity=".95"/><path d="M3 18Q-4 32 3 46" opacity=".6" stroke-width="1.500"/>
      <path d="M56 24Q61 32 56 40" opacity=".95"/><path d="M61 18Q68 32 61 46" opacity=".6" stroke-width="1.500"/></g>
    <path d="M21 21C12 19 8 10 11 3C15 10 21 12 27 15Z" fill="url(#ic3h)" stroke="#2a261e" stroke-width=".8"/>
    <path d="M43 21C52 19 56 10 53 3C49 10 43 12 37 15Z" fill="url(#ic3h)" stroke="#2a261e" stroke-width=".8"/>
    <path d="M32 11C44 11 50 19 49 29C48 35 44 38 44 43L40 50H24L20 43C20 38 16 35 15 29C14 19 20 11 32 11Z" fill="url(#ic3s)" stroke="#2a261e" stroke-width="1" stroke-linejoin="round"/>
    <path d="M21 27L30 31L21 36Z" fill="#c8ecff" stroke="#3a70d0" stroke-width=".8"/><path d="M43 27L34 31L43 36Z" fill="#c8ecff" stroke="#3a70d0" stroke-width=".8"/>
    <path d="M32 33L29 40H35Z" fill="#2a261e"/>
    <path d="M24 44H40V50H24Z" fill="#1a1612" stroke="#2a261e" stroke-width=".8"/>
    <path d="M27 44V50M30 44V50M33 44V50M36 44V50" stroke="#e8e2d2" stroke-width="1.400"/>
    <path d="M32 11V19" stroke="#8a8272" stroke-width=".8"/></svg>`,

  /* Scatto della Lonza: impronta di fiera maculata con scie di velocità */
  dash: `<svg viewBox="0 0 64 64"><defs>
    <linearGradient id="ic4p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe2a0"/><stop offset=".6" stop-color="#e09a30"/><stop offset="1" stop-color="#9a5a10"/></linearGradient></defs>
    <g stroke="#ffd890" stroke-linecap="round" fill="none"><path d="M3 22H15" stroke-width="2.200" opacity=".9"/><path d="M0 33H10" stroke-width="1.800" opacity=".6"/><path d="M5 44H17" stroke-width="2.200" opacity=".85"/><path d="M2 54H9" stroke-width="1.400" opacity=".45"/></g>
    <g transform="rotate(14 38 34)">
      <path d="M38 57C27 57 22 48 29 41C33 37 43 37 47 41C54 48 49 57 38 57Z" fill="url(#ic4p)" stroke="#4a2a08" stroke-width="1.200"/>
      <ellipse cx="22" cy="33" rx="5" ry="7" transform="rotate(-24 22 33)" fill="url(#ic4p)" stroke="#4a2a08" stroke-width="1.200"/>
      <ellipse cx="31.500" cy="23" rx="5" ry="7.500" transform="rotate(-7 31.500 23)" fill="url(#ic4p)" stroke="#4a2a08" stroke-width="1.200"/>
      <ellipse cx="43.500" cy="23" rx="5" ry="7.500" transform="rotate(7 43.500 23)" fill="url(#ic4p)" stroke="#4a2a08" stroke-width="1.200"/>
      <ellipse cx="53" cy="33" rx="5" ry="7" transform="rotate(24 53 33)" fill="url(#ic4p)" stroke="#4a2a08" stroke-width="1.200"/>
      <g fill="#4a2a08" opacity=".85"><circle cx="34" cy="48" r="1.900"/><circle cx="42" cy="51" r="1.500"/><circle cx="39" cy="44" r="1.300"/><circle cx="31.500" cy="20" r="1.200"/><circle cx="44" cy="25" r="1.100"/></g>
    </g></svg>`,

  /* Lacrima di Beatrice: ampolla con stella dorata */
  potion: `<svg viewBox="0 0 64 64"><defs>
    <radialGradient id="ic5h" cx=".5" cy=".5"><stop offset="0" stop-color="#ffe9b0" stop-opacity=".85"/><stop offset="1" stop-color="#ff9ab0" stop-opacity="0"/></radialGradient>
    <linearGradient id="ic5l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7a9a"/><stop offset=".6" stop-color="#d01848"/><stop offset="1" stop-color="#7a0a28"/></linearGradient>
    <linearGradient id="ic5g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#cfe8ff" stop-opacity=".55"/><stop offset=".5" stop-color="#ffffff" stop-opacity=".18"/><stop offset="1" stop-color="#cfe8ff" stop-opacity=".45"/></linearGradient>
    <clipPath id="ic5c"><path d="M27 12H37V25L48 46C51 52 47 59 41 59H23C17 59 13 52 16 46L27 25Z"/></clipPath></defs>
    <circle cx="32" cy="34" r="30" fill="url(#ic5h)"/>
    <g clip-path="url(#ic5c)"><rect x="10" y="38" width="46" height="26" fill="url(#ic5l)"/>
      <path d="M10 38Q21 33 32 38T54 38V42H10Z" fill="#ff9ab0" opacity=".85"/></g>
    <path d="M27 12H37V25L48 46C51 52 47 59 41 59H23C17 59 13 52 16 46L27 25Z" fill="url(#ic5g)" stroke="#e8f0ff" stroke-width="1.500" stroke-linejoin="round"/>
    <path d="M20 47C21 44 23 41 25 39" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".7" fill="none"/>
    <rect x="25" y="5" width="14" height="8" rx="2" fill="#7a4a24" stroke="#2a1608" stroke-width="1"/>
    <rect x="26" y="11" width="12" height="3" fill="#d8a850" stroke="#3a2408" stroke-width=".7"/>
    <path d="M50 8L51.600 12.400L56 14L51.600 15.600L50 20L48.400 15.600L44 14L48.400 12.400Z" fill="#fff2b0" stroke="#d09a30" stroke-width=".6"/>
    <path d="M13 22L14 24.600L16.600 25.600L14 26.600L13 29.200L12 26.600L9.400 25.600L12 24.600Z" fill="#ffe0a0" opacity=".9"/>
    <path d="M32 44C34.500 48 35.500 50 33.500 52C31.500 53.500 29 52 30 49.500C30.600 48 31.600 46 32 44Z" fill="#fff" opacity=".55"/></svg>`
};

/* ---------- oggetti: arma, armatura, amuleto (per l'inventario) ---------- */
export const GEAR_ICONS = {
  weapon: `<svg viewBox="0 0 64 64"><defs><linearGradient id="gw" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#6e6858"/></linearGradient></defs>
    <path d="M32 3L37 10V40H27V10Z" fill="url(#gw)" stroke="#2a261e" stroke-width="1.200" stroke-linejoin="round"/><path d="M32 6V38" stroke="#9a9484"/>
    <path d="M17 41H47" stroke="#2c1a06" stroke-width="7" stroke-linecap="round"/><path d="M17 41H47" stroke="#d8a850" stroke-width="4.500" stroke-linecap="round"/>
    <rect x="29" y="43" width="6" height="12" rx="2" fill="#4a2410"/><circle cx="32" cy="58" r="3.600" fill="#d8a850" stroke="#3a2408"/></svg>`,
  armor: `<svg viewBox="0 0 64 64"><defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d83030"/><stop offset="1" stop-color="#6a0c0c"/></linearGradient></defs>
    <path d="M22 8C26 4 38 4 42 8L56 16L52 30L45 27V58H19V27L12 30L8 16Z" fill="url(#ga)" stroke="#2a0606" stroke-width="1.400" stroke-linejoin="round"/>
    <path d="M26 8C28 14 36 14 38 8" fill="#2a0606" opacity=".7"/>
    <path d="M19 44H45" stroke="#d8a850" stroke-width="3"/><path d="M32 14V58" stroke="#3a0808" stroke-width="1" opacity=".6"/>
    <circle cx="32" cy="44" r="2.800" fill="#d8a850" stroke="#3a2408"/></svg>`,
  amulet: `<svg viewBox="0 0 64 64"><defs><radialGradient id="gm" cx=".4" cy=".35"><stop offset="0" stop-color="#d8f0ff"/><stop offset=".5" stop-color="#4a86ff"/><stop offset="1" stop-color="#14307a"/></radialGradient></defs>
    <path d="M10 4C12 24 20 34 32 38C44 34 52 24 54 4" fill="none" stroke="#d8a850" stroke-width="2.500"/>
    <circle cx="32" cy="46" r="14" fill="#2c1a06"/><circle cx="32" cy="46" r="12" fill="#d8a850" stroke="#3a2408" stroke-width="1"/>
    <circle cx="32" cy="46" r="8" fill="url(#gm)" stroke="#3a2408" stroke-width=".8"/>
    <path d="M32 36V32M32 56V60M22 46H18M42 46H46" stroke="#d8a850" stroke-width="2" stroke-linecap="round"/></svg>`
};

/* piccola gemma per le notifiche di oggetti */
export const gem = c => `<svg viewBox="0 0 24 24" class="gem"><path d="M12 2L21 9L12 22L3 9Z" fill="${c}" stroke="#000" stroke-width="1.200" stroke-linejoin="round"/><path d="M3 9H21M12 2L8 9L12 22L16 9Z" fill="none" stroke="#fff" stroke-width=".8" opacity=".55"/></svg>`;

/* ---------- cornici ---------- */
const bronze = (id) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0d890"/><stop offset=".3" stop-color="#b8904a"/><stop offset=".62" stop-color="#6a4a22"/><stop offset="1" stop-color="#d0a860"/></linearGradient>`;

/* Cornice dei globi: anello di bronzo, nove borchie (i nove cerchi), alloro e cimiero */
export function orbFrame(kind) {
  const id = 'of' + kind, studs = [], leaves = [];
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + i * 2 * Math.PI / 9, x = 100 + Math.cos(a) * 91, y = 100 + Math.sin(a) * 91;
    studs.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.600" fill="#1a0e08"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.300" fill="url(#${id}s)"/>`);
  }
  for (const side of [-1, 1]) for (let i = 0; i < 9; i++) {                 // rami d'alloro ai lati, in basso
    const t = 108 + i * 9, a = (side < 0 ? 180 - t + 90 : t - 90 + 0) * Math.PI / 180;
    const ang = side < 0 ? (90 + (t - 90)) : (90 - (t - 90));
    const rad = (side < 0 ? 180 - (t - 90) : t - 90) * Math.PI / 180;
    const x = 100 + Math.cos(rad) * 97, y = 100 + Math.sin(rad) * 97;
    const rot = (rad * 180 / Math.PI) + 90 + (side < 0 ? -30 : 30);
    leaves.push(`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="3.200" ry="7" transform="rotate(${rot.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="url(#${id}l)" stroke="#1a2a10" stroke-width=".7"/>`);
  }
  const crest = kind === 'hp'
    ? `<path d="M100 -4C95 4 94 10 100 16C106 10 105 4 100 -4Z" fill="#ff6a3a" stroke="#3a0a04" stroke-width="1"/><path d="M92 6C84 4 80 8 78 12C84 11 88 12 92 14ZM108 6C116 4 120 8 122 12C116 11 112 12 108 14Z" fill="url(#${id}) " stroke="#2a1608" stroke-width=".8"/><path d="M100 4L103 9L100 14L97 9Z" fill="#ffd8a0"/>`
    : `<path d="M100 -6L103 4L113 6L103 8L100 18L97 8L87 6L97 4Z" fill="#cfe4ff" stroke="#1a3a8a" stroke-width="1"/><path d="M92 8C84 6 80 10 78 14C84 13 88 14 92 16ZM108 8C116 6 120 10 122 14C116 13 112 14 108 16Z" fill="url(#${id})" stroke="#2a1608" stroke-width=".8"/>`;
  return `<svg class="orbframe" viewBox="-8 -10 216 216"><defs>${bronze(id)}
      <radialGradient id="${id}s"><stop offset="0" stop-color="#fff4c8"/><stop offset=".6" stop-color="#d0a050"/><stop offset="1" stop-color="#6a4a22"/></radialGradient>
      <linearGradient id="${id}l" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9ac060"/><stop offset="1" stop-color="#2a5a20"/></linearGradient></defs>
    ${leaves.join('')}
    <circle cx="100" cy="100" r="99" fill="none" stroke="#0a0605" stroke-width="3"/>
    <circle cx="100" cy="100" r="91" fill="none" stroke="url(#${id})" stroke-width="15"/>
    <circle cx="100" cy="100" r="98" fill="none" stroke="#fff0c0" stroke-width=".8" opacity=".55"/>
    <circle cx="100" cy="100" r="83.500" fill="none" stroke="#0a0605" stroke-width="2.400"/>
    <circle cx="100" cy="100" r="84.800" fill="none" stroke="#f0d890" stroke-width=".7" opacity=".6"/>
    ${studs.join('')}${crest}</svg>`;
}

/* Cornice della minimappa: anello con quattro ornamenti ai punti cardinali */
export function miniFrame() {
  const orn = [0, 90, 180, 270].map(d => `<g transform="rotate(${d} 100 100)"><path d="M100 -2L106 9L100 17L94 9Z" fill="url(#mfg)" stroke="#1a0e08" stroke-width="1.200"/><path d="M100 2L102.500 9L100 14L97.500 9Z" fill="#ff7a30"/></g>`).join('');
  return `<svg class="miniframe" viewBox="-8 -8 216 216"><defs>${bronze('mfg')}</defs>
    <circle cx="100" cy="100" r="97" fill="none" stroke="#0a0605" stroke-width="3"/>
    <circle cx="100" cy="100" r="92" fill="none" stroke="url(#mfg)" stroke-width="10"/>
    <circle cx="100" cy="100" r="97" fill="none" stroke="#fff0c0" stroke-width=".7" opacity=".5"/>
    <circle cx="100" cy="100" r="86.500" fill="none" stroke="#0a0605" stroke-width="2"/>
    <circle cx="100" cy="100" r="82" fill="none" stroke="#b8904a" stroke-width=".8" stroke-dasharray="2 4" opacity=".7"/>${orn}</svg>`;
}

/* Fregio divisorio con losanga centrale */
export const divider = (w = 220, c = '#c8a05a') => `<svg class="div" viewBox="0 0 220 16" width="${w}" height="${(w * 16 / 220).toFixed(0)}">
  <path d="M0 8H84M136 8H220" stroke="${c}" stroke-width="1" opacity=".8"/><path d="M84 8C90 2 96 2 100 8M136 8C130 2 124 2 120 8" stroke="${c}" stroke-width="1.200" fill="none"/>
  <path d="M110 1L118 8L110 15L102 8Z" fill="${c}" stroke="#1a0e08" stroke-width=".8"/><path d="M110 4.500L113.500 8L110 11.500L106.500 8Z" fill="#ff7a30"/>
  <circle cx="92" cy="9" r="1.500" fill="${c}"/><circle cx="128" cy="9" r="1.500" fill="${c}"/></svg>`;

/* Angolo ornato per i pannelli */
export const corner = `<svg class="corner" viewBox="0 0 40 40"><defs>${bronze('cng')}</defs>
  <path d="M2 38V10C2 5 5 2 10 2H38" fill="none" stroke="#0a0605" stroke-width="6" stroke-linecap="round"/>
  <path d="M2 38V10C2 5 5 2 10 2H38" fill="none" stroke="url(#cng)" stroke-width="3.400" stroke-linecap="round"/>
  <path d="M9 30V13C9 10.500 10.500 9 13 9H30" fill="none" stroke="#b8904a" stroke-width=".9" opacity=".7"/>
  <circle cx="7" cy="7" r="4.200" fill="#1a0e08"/><circle cx="7" cy="7" r="3" fill="url(#cng)"/><circle cx="7" cy="7" r="1.200" fill="#ff7a30"/></svg>`;

/* Corna ai lati della barra del boss */
export const horn = `<svg class="horn" viewBox="0 0 60 44"><defs>${bronze('hng')}</defs>
  <path d="M58 22C44 22 34 18 28 8C26 4 20 2 12 4C20 6 22 12 28 20C34 28 44 30 58 28Z" fill="url(#hng)" stroke="#0a0605" stroke-width="1.600" stroke-linejoin="round"/>
  <path d="M54 23C42 23 34 20 28 12" fill="none" stroke="#fff0c0" stroke-width=".9" opacity=".6"/>
  <path d="M40 30C34 34 26 36 20 34C26 40 36 42 44 36Z" fill="url(#hng)" stroke="#0a0605" stroke-width="1.200"/>
  <circle cx="52" cy="25" r="3.200" fill="#c01818" stroke="#0a0605" stroke-width="1"/></svg>`;

/* cursore: mirino di brace */
export const reticle = `<svg xmlns='http://www.w3.org/2000/svg' width='34' height='34' viewBox='0 0 34 34'><circle cx='17' cy='17' r='9.500' fill='none' stroke='%23000' stroke-width='4' opacity='.55'/><circle cx='17' cy='17' r='9.500' fill='none' stroke='%23ffb060' stroke-width='1.600'/><path d='M17 1V8M17 26V33M1 17H8M26 17H33' stroke='%23000' stroke-width='4' stroke-linecap='round' opacity='.55'/><path d='M17 2V8M17 26V32M2 17H8M26 17H32' stroke='%23ffd890' stroke-width='1.800' stroke-linecap='round'/><circle cx='17' cy='17' r='2.200' fill='%23ff5a20'/></svg>`;
