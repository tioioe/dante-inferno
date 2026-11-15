# 02 · Architettura

Pagina `index.html` + moduli ES caricati in questo ordine (conta!):

```
hud.js → main.js → story.js → audio.js → fx.js → music.js → bestiario.js → avvisi.js → prestazioni.js → didattica.js → bottino.js
```
`hud.js` va PRIMA di `main.js`: ricostruisce il DOM dell'HUD, e `main.js` poi lo cerca per id.
three.js è locale (`lib/three.module.js` + `lib/jsm/...`, importmap in `index.html`). Nessuna rete.

## I file
| File | Ruolo |
|---|---|
| `main.js` | **Il gioco.** Sezioni (cerca i commenti `/* ===== ... ===== */`): renderer+bloom, luci, texture, mondo a camere/corridoi, effetti a sprite, audio base, modelli, stato, HUD (aggiornamento), loot, giocatore, nemici, progressione/enigma/boss, Cerchio II, Cerchio III, ciclo principale, input, avvio. |
| `maps.js` | **Dati delle mappe**: 3 cerchi × 5 camere (forme `circle/cross/lobes/hall/peanut/islands/ring`, arredi, abissi). Commento di istruzioni in testa. |
| `mapsload.js` | Carica `maps.js` e applica le modifiche salvate dall'editor (localStorage `dante_maps_override`). `?maps=default` le ignora. |
| `editor.html` / `editor.js` | Editor visuale delle mappe (`EDITOR.bat`). Salva su `maps.js` o nel browser. |
| `story.js` | Intro del Canto I, foresta di alberi, passaggio al gioco. Usa `window.__game`. |
| `dante.js` | Modello di Dante (pezzi agganciati alle ossa del soldato). Usato da `story.js` e da `dante-lab.html`. |
| `hud.js` / `hud-icons.js` / `hud.css` | HUD: costruzione pannelli, icone SVG, cornici, tooltip, messaggi, inventario, texture di pietra/pergamena. |
| `audio-engine.js` / `audio.js` | Effetti sonori sintetizzati + collegamento (sostituisce `sfx` di main.js, passi, battito, ambiente). |
| `music-engine.js` / `music.js` | Colonna sonora a sette brani + scelta del brano in base allo stato. |
| `bestiario-core.js` | **I mostri della Commedia**: geometria, texture (canvas) e animazioni a mano. `buildBestiary()` restituisce `{mMinosse, mCerbero, mCaronte, mFuria, mMinotauro, mMalebranca, mArpia}` nel formato `{scene, anims, height, minY}` di `models`. Nodi con nome (`hips, spine, head, jaw, shL, elL, hipL, kneeL…`); i nodi `fx_*` sono punti di emissione. Guardano +Z, piedi a y=0. Non dipende dal gioco. |
| `bestiario.js` | Aggancia i modelli al gioco (`Object.assign(models, …)` e `TYPES.imp/brute/elite/boss/harpy/elite2/boss3.model = …`) e gestisce gli effetti vivi (particelle dai nodi `fx_*`, occhi, icore, pozze). Caricato dopo `music.js`. |
| `bestiario-lab.html` | Galleria dei 7 mostri: pulsanti per le animazioni, `?only=mCerbero`, `?anim=Punch&t=0.6` per una posa fissa. |
| `fx.js` | Effetti visivi aggiuntivi che osservano `window.__G` / `__P`. |
| `server.js` | Mini server statico, porta **8801**, nessuna cache. |
| `build.mjs` | Crea la cartella `upload` (bundle `game.js` minificato con esbuild, asset copiati/ridotti, `.htaccess`, crediti). |
| `tools/bot.js` | Bot di prova per il bilanciamento. |
| `*-lab.html`, `storie.html` | Pagine di prova/visualizzazione: audio, Dante, mostri, testi. |

## Il ponte `window.__game`
`main.js` espone (riga `window.__game = {...}`) quello che i moduli esterni possono usare:
`THREE, scene, camera, renderer, P, G, CH, obstacles, Rs, R, clamp, angDiff, col, torch, CAM_OFF, say, banner, toast, sfx, emit, tone, play,
followSun, beginPlay, Emitter, ftex, fxSpark, fxFire, fxFlame, fxSmoke, fxGlow, fireBurst, flash, addRing, LINKS, models, TYPES, makeActor`.
Altre variabili di debug: `window.__P` (giocatore), `__G` (stato), `__CH`, `__LINKS`, `__THREE`, `__step(dt,n)`, `__cmd`
(slash, fire, dash, turbine, nova, usePotion, dropItem, dropPotion, addXp, spawnEnemy, startCircle), `__zoom`, `__focus`,
`__story`, `__sound`, `__music`, `__fx`, `__editor`, `__c2`, `__c3`.
Regola: **un modulo nuovo usa solo `window.__game`**; se gli serve altro, si aggiunge UNA voce a quella riga.

## Stato di gioco (`G.state`)
`loading → title → intro → play ↔ transition (cambio cerchio) → dead (RISORGI) / win`.
`G.circle` = 1, 2, 3. `G.stage` = indice della camera "da superare"; `G.reached` = camera più lontana raggiunta.

## Il mondo
Camere = cerchi (capsule) collegate da corridoi; il calpestabile è l'unione di capsule (`nearestWalk`).
Un corridoio si apre quando l'obiettivo della camera è completato (`openGate`). Ostacoli = cerchi in `obstacles`.
Ogni camera ha un branco (tabelle `PACKS`, `PACKS2`, `PACKS3`) che compare per vicinanza e dorme (`state: 'idle'`) finché Dante non è a meno di 12 m.

## Contratto con l'HUD (id che `main.js` cerca)
`hpfill, resfill, hptxt, restxt, xp, lvl, s0…s5 (ultimo figlio = elemento con style.height), pcnt, mm (canvas minimappa), obj, zname, zsub,
boss, bossname, bossfill, msg, banner, bt, bs, toasts, bars, dmg, inv, title, go, rez, flash` e per l'intro `canto, verse, fade, skip`.
`hud.js` ricostruisce il DOM mantenendo questi id: **non rinominarli**.

## Dati principali (in main.js)
`TYPES` (nemici, con `model:` che punta a un modello caricato in `init()`), `PACKS*`, `BOSS_BY`, `CINFO_` (testi per cerchio),
`ENIGMAS` (indovinelli e suggerimenti per cerchio), `RAR`/`NAMES` (loot), `SK` in `hud.js` (testi e numeri delle mosse mostrati nei tooltip — vanno tenuti allineati ai numeri veri in `main.js`).
