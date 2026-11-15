/* ============================================================================
   MAPPE DI DANTE — file da modificare a mano, poi ricarica la pagina (F5).
   (Oppure usa l'editor visuale: EDITOR.bat)
   Ogni cerchio è una lista di CAMERE collegate in fila da corridoi con cancelli.
   Nessuna riga di gioco da toccare: cambia i numeri, le forme e gli arredi qui.

   CAMPI DI UNA CAMERA (tutti opzionali tranne name, x, z, r)
   ---------------------------------------------------------------------------
   name     nome mostrato nel gioco
   x, z     posizione del centro nel mondo (le camere vanno in ordine di percorso)
   r        raggio "nominale": dimensione approssimativa, usata per branchi e cancelli

   shape    forma della camera:
              'circle'  disco                     'cross'   croce a quattro bracci
              'lobes'   trifoglio (3 lobi)        'hall'    sala lunga e larga
              'peanut'  due sale unite da un collo 'islands' isole unite da ponti stretti
              'ring'    disco con una buca (abisso) al centro
   shapes   forma libera, invece di 'shape': lista di capsule
              [ax, az, bx, bz, larghezza]  (coordinate relative al centro; un disco
              ha a = b; una sala ha a ≠ b; la larghezza è il raggio/mezza larghezza)
   pit      [dx, dz, raggio] buca non calpestabile (abisso o lava) — per 'ring' è automatica
   spots    [[dx, dz], …] dove stanno i 3 bracieri dell'enigma (camera dell'enigma)

   decor    arredo casuale: 'pillars' colonne · 'ruins' muri sbrecciati · 'obelisks'
            obelischi · 'crystals' cristalli luminosi · 'statues' statue · 'avenue'
            viale di colonne lungo il percorso · 'none' niente
   n        quanti pezzi di arredo (se omesso, dipende dalla dimensione)
   props    arredi piazzati a mano: [{ t:'pillar'|'obelisk'|'crystal'|'statue'|'ruin'|
            'brazier'|'dais', x, z, … }]  (coordinate relative al centro)

   TEXTURE (set PBR in assets/tex: <nome>_diff.jpg, _nor.jpg, _rough.jpg)
   tex      pavimento:  'slate_floor_02' · 'volcanic_rock_tiles' · 'dark_rock_02' ·
                        'cobblestone_floor_06' · 'castle_brick_broken_06' · 'marble_tiles' ·
                        'marble_cliff_03'   (omesso = pietra procedurale)
   cliff    pareti della piattaforma, sotto il pavimento (stessi nomi di tex)
   wall     materiale di colonne, muri e statue (stessi nomi di tex)
   path     pavimento del corridoio che esce dalla camera (stessi nomi; omesso = ciottoli)
   ts       lato in unità di una piastrella di texture (default 6: più grande = texture più larga)
   bright   luminosità del pavimento con texture (default 1.7: più alto = più chiaro)
   cliffTint tinta delle pareti della piattaforma

   stone    tinta degli arredi (esadecimale 0xRRGGBB)
   floor    tinta del pavimento (0xffffff = neutro)
   ring     colore dei bordi luminosi
   abyss    true = la buca è un vuoto invece che lava
   pitColor colore della buca quando abyss è true (default viola scuro; fango = 0x2a2010)
   wet      0–1: quanto è bagnato il pavimento (più alto = più lucido)
   ============================================================================ */

export const MAPS = {
  /* ---------------- CERCHIO I — LIMBO ---------------- */
  1: [
    { name: 'La Selva Oscura', x: 0, z: 0, r: 15, shape: 'circle', decor: 'none',
      tex: 'slate_floor_02', cliff: 'dark_rock_02',
      stone: 0x3a2a28, floor: 0x9d9892, ring: 0xff3a10 },                       // qui gli alberi li mette story.js

    { name: 'Il Vestibolo dei Dannati', x: 40, z: -32, r: 17, shape: 'cross', decor: 'ruins', n: 6,
      tex: 'cobblestone_floor_06', cliff: 'dark_rock_02', wall: 'castle_brick_broken_06',
      stone: 0x4a3a30, floor: 0xc0b8b0, ring: 0xff5a20 },

    { name: 'La Sala dei Numeri', x: 88, z: -36, r: 18, shape: 'islands', decor: 'obelisks', n: 4,
      tex: 'slate_floor_02', cliff: 'dark_rock_02', wall: 'dark_rock_02',
      stone: 0x5a5260, floor: 0x8e8ca4, ring: 0xffb040 },                       // i tre bracieri stanno sulle isole

    { name: 'La Piana dei Sospiri', x: 124, z: 6, r: 22, shape: 'peanut', decor: 'statues', n: 9,
      tex: 'volcanic_rock_tiles', cliff: 'dark_rock_02', wall: 'marble_cliff_03',
      stone: 0x6a625c, floor: 0xd0c8c0, ring: 0xff7a30 },

    { name: 'Il Trono di Minosse', x: 158, z: 56, r: 25, shape: 'ring', decor: 'pillars', n: 7,
      tex: 'dark_rock_02', ts: 9, cliff: 'dark_rock_02', wall: 'volcanic_rock_tiles',
      stone: 0x7a6866, floor: 0xe0c4b8, ring: 0xff2a10 }                        // arena con una buca di lava al centro
  ],

  /* ---------------- CERCHIO II — I LUSSURIOSI ---------------- */
  2: [
    { name: 'La Soglia della Bufera', x: 300, z: 0, r: 16, shape: 'lobes', decor: 'crystals', n: 6, abyss: true,
      tex: 'marble_tiles', ts: 10, bright: 2.6, cliff: 'marble_cliff_03', cliffTint: 0x6a6498, wall: 'marble_cliff_03',
      stone: 0x6a6a96, floor: 0x9a98d0, ring: 0x7a66ff },

    { name: 'Il Vento che Mai Non Resta', x: 340, z: 32, r: 18, shape: 'hall', decor: 'avenue',
      tex: 'marble_tiles', ts: 10, bright: 2.6, cliff: 'marble_cliff_03', cliffTint: 0x5a6498, wall: 'marble_cliff_03',
      stone: 0x66689a, floor: 0x8890d0, ring: 0x6a80ff },

    { name: 'La Sala delle Regine', x: 388, z: 36, r: 18, shape: 'islands', decor: 'statues', n: 4, abyss: true,
      tex: 'marble_tiles', ts: 10, bright: 2.6, cliff: 'marble_cliff_03', cliffTint: 0x74649a, wall: 'marble_cliff_03',
      stone: 0x8a78a8, floor: 0xb0a0d8, ring: 0xc080ff },                       // i tre bracieri stanno sulle isole

    { name: 'La Bufera Infernale', x: 424, z: -6, r: 22, shape: 'ring', decor: 'crystals', n: 7, abyss: true,
      tex: 'marble_tiles', ts: 10, bright: 2.6, cliff: 'marble_cliff_03', cliffTint: 0x55608e, wall: 'marble_cliff_03',
      stone: 0x5a5e96, floor: 0x7078b8, ring: 0x5a70ff },                       // abisso al centro: i vortici ci orbitano sopra

    { name: 'Il Trono di Semiramide', x: 458, z: -56, r: 25, shape: 'cross', decor: 'obelisks', n: 6, abyss: true,
      tex: 'marble_tiles', ts: 10, bright: 2.6, cliff: 'marble_cliff_03', cliffTint: 0x84609a, wall: 'marble_cliff_03',
      stone: 0x8a62a0, floor: 0xc0a0d0, ring: 0xff66d0,
      props: [{ t: 'dais', x: 0, z: 0, r: 6 }] }
  ],

  /* ---------------- CERCHIO III — I GOLOSI ---------------- */
  3: [
    { name: 'Il Cancello della Pioggia', x: 620, z: 0, r: 16, shape: 'peanut', decor: 'ruins', n: 5,
      tex: 'cobblestone_floor_06', wet: 0.8, bright: 2.5, cliff: 'dark_rock_02', cliffTint: 0x667060, wall: 'castle_brick_broken_06',
      stone: 0x4a5040, floor: 0x889880, ring: 0x6a9a44 },

    { name: 'La Palude dei Golosi', x: 660, z: -30, r: 18, shape: 'lobes', decor: 'statues', n: 6,
      tex: 'slate_floor_02', wet: 0.9, bright: 2.5, cliff: 'dark_rock_02', cliffTint: 0x5a6a52, wall: 'marble_cliff_03',
      stone: 0x5a6650, floor: 0x7c8e76, ring: 0x58903a },

    { name: 'La Sala di Ciacco', x: 708, z: -34, r: 18, shape: 'islands', decor: 'ruins', n: 3,
      tex: 'volcanic_rock_tiles', wet: 0.7, bright: 2.2, cliff: 'dark_rock_02', cliffTint: 0x667060, wall: 'castle_brick_broken_06',
      stone: 0x50604a, floor: 0x90a088, ring: 0x98b050 },                       // al riparo dalla grandine; i bracieri stanno sulle isole

    { name: 'La Pioggia Maledetta', x: 746, z: 6, r: 22, shape: 'cross', decor: 'obelisks', n: 6,
      tex: 'cobblestone_floor_06', wet: 1, bright: 2.5, cliff: 'dark_rock_02', cliffTint: 0x586650, wall: 'dark_rock_02',
      stone: 0x485444, floor: 0x7e8e78, ring: 0x4c8a34 },

    { name: 'La Tana di Cerbero', x: 782, z: 56, r: 26, shape: 'ring', decor: 'pillars', n: 8, abyss: true, pitColor: 0x2a2010,
      tex: 'dark_rock_02', ts: 9, wet: 0.8, bright: 2.5, cliff: 'dark_rock_02', cliffTint: 0x5a5a48, wall: 'volcanic_rock_tiles',
      stone: 0x5a5a48, floor: 0xa8a090, ring: 0xa07a30 }                        // arena con una fossa di fango al centro
  ]
};
