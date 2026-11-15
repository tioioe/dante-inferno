# Passaggio del progetto — Dante · Inferno

Per chi riprende il lavoro. Tempo di lettura: 10 minuti. Il gioco è online su https://damy6x6.it/dante/ e il codice è su https://github.com/tioioe/dante-inferno.

## 1. Mettere in piedi tutto (5 minuti)
```
git clone https://github.com/tioioe/dante-inferno.git
cd dante-inferno
npm install            # serve solo per la build (esbuild, sharp, gltf-transform)
node server.js         # oppure AVVIA.bat su Windows → http://localhost:8801
```
Serve Node.js 18 o più recente e un browser con WebGL. Non c'è database né PHP. Il gioco gira da qualsiasi cartella statica.

## 2. Da dove cominciare a leggere
1. `README.md` — comandi e moduli.
2. `docs/00_LEGGIMI_PRIMA.md` → `01_STATO.md` (cosa funziona e cosa NO) → `02_ARCHITETTURA.md` → `07_REGOLE_DI_LAVORO.md`.
3. `docs/04_TESTARE.md` — come provare senza giocare a mano (comandi da console, `tools/bot.js`).
4. `docs/06_PROSSIMI_PASSI.md` — cosa fare dopo.

## 3. Regole d'oro (imparate a caso)
- `main.js` è grande e condiviso: **modifiche piccole e mirate**; le funzioni nuove vanno in un modulo che usa solo `window.__game` (vedi la riga del "ponte" in fondo a `main.js`).
- Dopo ogni modifica: controllo di sintassi (`copy main.js %TEMP%\chk.mjs && node --check %TEMP%\chk.mjs`).
- Non rinominare gli id dell'HUD (contratto con `main.js`).
- I moduli si caricano nell'ordine dei tag `<script type="module">` di `index.html`; la build (`build.mjs`) legge proprio quei tag.
- Nei pannelli di anteprima la pagina anima solo se visibile: le cinematiche (`didattica.js`) non partono in una scheda nascosta.

## 4. Mappa dei moduli aggiunti di recente
| File | Cosa fa |
|---|---|
| `bestiario-core.js` | 11 mostri della Commedia costruiti a mano (geometria, texture, animazioni), nessun asset esterno |
| `bestiario.js` | li aggancia al gioco + effetti (fiamme, bava, nebbia, icore, pozze) |
| `bottino.js` | zaino (Tab), potenziamenti, casse (E), pozioni (R/F/V), Faville, **salvataggio** (`dante_save_v1`), pausa (Esc), **difficoltà** (3 livelli), casse sulla minimappa |
| `didattica.js` | cinematiche di camera skippabili, addestramento, schede e Bestiario (B), tasto T |
| `prestazioni.js` | qualità automatica (risoluzione/ombre), tasto G |
| `avvisi.js` | avvisi per chi non ha WebGL o è su telefono |
| `tools/make_dante_rig.mjs` | ricava `assets/dante.glb` dal rig CC0 Quaternius (richiede il pacchetto scaricato, vedi sotto) |

## 5. Messa online (le credenziali NON sono nel repository)
1. `node build.mjs` (o `COSTRUISCI.bat`) → cartella `upload/` (un `game.js` minificato + asset ridotti, ~11 MB).
2. Caricare **tutto il contenuto** di `upload/` (compreso `.htaccess`, file nascosto) in una sottocartella del sito, per esempio `/public_html/dante/`. Funziona in qualsiasi sottocartella, i percorsi sono relativi.
3. Il sito attuale è sull'hosting di damy6x6.it: l'accesso FTP/WinSCP va chiesto al titolare, non è qui.
4. Dopo ogni caricamento: Ctrl+F5, perché il server mette in cache i file per 30 giorni (il numero di versione in `game.js?v=` cambia a ogni build).
5. Se Apache non c'è (Nginx), vedi `upload/LEGGIMI.txt` generato dalla build.

## 6. Cose NON incluse nel repository
- `assets_download/` (pacchetti originali, ~180 MB). Rigenerabili: Quaternius Ultimate Monsters (CC0, quaternius.com), Universal Animation Library (CC0, https://opengameart.org/content/universal-animation-library, file `universal_animation_librarystandard.zip`, serve solo per rifare `dante.glb`), Kenney Particle Pack, Poly Haven.
- I video dimostrativi (`Dante_Inferno_video*.mp4`): consegnati a parte.
- Il vecchio rig Mixamo (`dante_soldier_BACKUP.glb`): sostituito da un rig CC0 per ragioni di licenza, **non va ripubblicato**.

## 7. Stato onesto
**Verificato** (con bot, script e screenshot): avvio, Cerchio I fino alla sala dell'enigma, salvataggio e ripresa, zaino/potenziamenti, casse, pozioni, morte e penalità, tutti i modelli senza errori in console.
**Mai verificato**: una partita completa a mano su una scheda video vera; fluidità reale e qualità automatica; bilanciamento dei Cerchi II e III; difficoltà (i numeri 0,85 / 1,5 / 2,2 sono stime); il bot si blocca nella sala dell'enigma (cammina in linea retta sui ponti stretti: non è un bug del gioco).
**Limiti noti**: il cerchio raggiunto non si salva; il Segugio ha la testa un po' grossa; restano 3 mostri Quaternius (Guardiano della bufera, Anima fangosa, Divoratore); controlli solo tastiera e mouse; licenza del codice non scelta.

## 8. Idee in ordine di valore
1. Giocarlo a mano e annotare fluidità, difficoltà, volumi.
2. Salvare anche il cerchio raggiunto e offrire "continua".
3. Cerchio IV (Avari e Prodighi, Pluto) seguendo come sono fatti II e III (`maps.js` + blocco in `main.js` + modelli in `bestiario-core.js`).
4. Adattare `tools/bot.js` ai ponti dell'enigma e ai cerchi II e III per bilanciare.
5. Controller/touch per le fiere, modalità chiosco.
