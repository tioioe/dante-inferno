# Dante — Inferno

Gioco d'azione isometrico nel browser ispirato alla *Divina Commedia*: HTML + three.js, tutto offline, nessun server né database.
Online: https://damy6x6.it/dante/

Dante, con una spada di fuoco, scende nell'Inferno: cerchio dopo cerchio attraversa camere collegate da corridoi con cancelli, affronta i mostri veri del poema (Minosse, Cerbero, Caronte, le Furie, il Minotauro, i Malebranche, le Arpie, Semiramide…), risolve enigmi tratti dal testo e sconfigge un boss. Versi originali di Dante con parafrasi in italiano moderno.

## Avvio
```
AVVIA.bat        (apre http://localhost:8801 con il mini server di server.js)
```
oppure `node server.js`. Pagine di servizio: `editor.html` (editor mappe), `storie.html` (testi), `audio-lab.html`, `dante-lab.html`, `monsters-lab.html`, `bestiario-lab.html`.

## Comandi
WASD muoversi · mouse mirare · clic sinistro spada · clic destro/Q Fuoco di Virgilio · 1 Turbine · 2 Grido · Spazio scatto · R Lacrima di Beatrice · F Fiala di Fede · V Elisir · E apri cassa · Tab zaino · B Bestiario · H aiuto di Virgilio · Esc pausa · T spiegazioni on/off · G qualità auto/massima.

## Costruire il pacchetto per il web
`COSTRUISCI.bat` (richiede `npm install`) crea la cartella `upload/` (un solo `game.js` minificato + asset ottimizzati), da caricare in una sottocartella del sito.

## Documentazione
La cartella [`docs/`](docs/) contiene i file di passaggio: partire da `docs/PASSAGGIO_COLLEGA.md`, poi `docs/00_LEGGIMI_PRIMA.md`.

## Moduli principali
`main.js` (il gioco) · `bestiario-core.js` + `bestiario.js` (mostri procedurali ed effetti) · `bottino.js` (zaino, casse, pozioni, salvataggio, pausa, difficoltà) · `didattica.js` (cinematiche, addestramento, schede) · `prestazioni.js` · `avvisi.js` · `fx.js` · `hud.*` · `audio*.js` · `music*.js` · `maps.js`.

## Licenze
Codice del progetto: da definire dall'autore. Asset di terze parti (three.js MIT, Quaternius CC0, Kenney CC0, Poly Haven CC0, font OFL…) elencati in `docs/05_ASSET_LICENZE_E_ONLINE.md` e nei file `LICENSE-*` dentro `assets/`.
