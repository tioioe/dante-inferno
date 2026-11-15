# 07 · Regole di lavoro

## Chi è l'utente e come vuole lavorare
- **Damiano**, programmatore: scrive in fretta e con refusi, ma sa cosa vuole. **Si risponde in italiano**, chiaro, senza giri.
- Vuole **qualità "maniacale"** e cose che si vedono: ama gli **screenshot** e le pagine di prova (laboratori) per vedere/ascoltare ogni cosa.
- Preferenze già emerse: niente traballii né compenetrazioni; niente icone "stock" (ogni mossa con la sua icona e il suo testo); font curati;
  stile **Diablo 4** con avanzamento **lineare** (camere/corridoi) e libertà di muoversi; versi **originali con parafrasi** in italiano moderno.
- Contesto: il gioco è pensato anche per un **open day** (macchina eccellente, offline) e per un eventuale upload online.

## Regole sulle azioni
- **Download di file**: dire nome, fonte e dimensione e **aspettare il sì** (già successo per asset e font). Ora tutto ciò che serve è già in locale.
- **Non scrivere fuori dalla cartella del progetto** senza dirlo. Questa cartella sul Desktop è stata chiesta esplicitamente.
- **Riferire con onestà** ciò che non si è potuto verificare (suono all'orecchio, fluidità reale, prove a mano). Mai dire "fatto" per ciò che non è stato provato.

## Come non rompere il progetto (lezioni imparate)
1. **Più sessioni toccano `main.js` insieme.** Fai **modifiche piccole e mirate** (una stringa unica per volta), mai riscritture complete. L'editor avvisa se il file è cambiato: rileggi.
2. **Funzionalità nuove = modulo separato** che usa solo `window.__game` (vedi `02_ARCHITETTURA.md`). Se serve altro, si aggiunge una voce al ponte.
3. **Controllo di sintassi dopo ogni modifica** a `main.js` (copia `.mjs` + `node --check`). Un solo commento su una riga può "mangiare" il resto del codice.
4. **Non rinominare gli id dell'HUD** (contratto con `main.js`).
5. **Tieni allineati i testi dei tooltip** (`SK` in `hud.js`) con i numeri veri delle mosse in `main.js`.
6. Il **bloom** amplifica tutto ciò che è additivo: nuovi effetti partono con intensità bassa. Due volte l'effetto "livello" bruciava lo schermo.
7. Se un'altra sessione lascia il gioco rotto, **non ripararle il lavoro a metà**: prova su una **copia isolata** (vedi `04_TESTARE.md`).
8. Quando aggiungi file da usare online: aggiorna `build.mjs` e i crediti.

## Convenzioni
Commenti e testi in italiano; nomi di codice in italiano/inglese misti già presenti (non rinominare per gusto). Numeri di gioco in `TYPES`, `PACKS*`, `maps.js`.
I versi citati devono essere **originali di Dante** (pubblico dominio) con parafrasi propria; non copiare traduzioni moderne protette.
