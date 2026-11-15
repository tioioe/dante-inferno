# 06 · Prossimi passi (in ordine di valore)

## 0. Prima di tutto (30 minuti, vale più di tutto il resto)
- **Giocalo tu**, a mano, sulla 4090: tutto il progetto è stato provato solo col bot e con screenshot a pochi fps.
  Annota: fluidità, comandi, difficoltà dei cerchi II e III, volume di musica/effetti, cose che stonano.
- Controlla la sintassi (`04_TESTARE.md`) e che `AVVIA.bat` parta pulito.

## 1. Contenuto
1. **Cerchio IV — Avari e Prodighi** (Pluto, "Pape Satàn, pape Satàn aleppe"): è già annunciato nel testo di fine Cerchio III (`winNext`).
   Idee: due schiere che spingono massi in cerchio e si scontrano; enigma sul contrappasso; boss **Pluto** (modello da scegliere: Yeti/Dino ingranditi o un modello nuovo).
   Si fa come i cerchi II e III: tabella in `maps.js`, blocco in `main.js` (tipi nemici, `PACKS4`, `CINFO_`, `ENIGMAS`, boss, ambiente), voce in `BOSS_BY`/`PACKS_BY`.
2. **Cerchi V–IX** (Iracondi sulla palude, Eretici, Violenti, Malebolge, Cocito con Lucifero) — con ambiente e meccanica propria per ciascuno.
3. **Bestiario** (fatto il 15/11 per Minosse, Cerbero, Caronte, Furia, Minotauro, Malebranca, Arpia): restano Semiramide, Pluto (Cerchio IV), Flegias, Gerione, Centauri, Medusa, Lucifero. Si aggiungono come le altre funzioni `build…()` in `bestiario-core.js`. Da raffinare a occhio con la 4090: forme a palloncino, pelle, ritmo delle animazioni.
4. **Altri nemici** dai 16 del pacchetto (`monsters-lab.html`): Ninja, Frog, Monkroose sono ancora liberi.

## 2. Qualità e rifinitura
- **Bilanciare II e III** adattando `tools/bot.js` (vento, fango, enigmi con nomi).
- **Scia della lama, rune di pericolo, aure, portale**: verificare a velocità reale e regolare luminosità (il bloom brucia facilmente: ci sono già stati due ritocchi).
- **Musica del titolo**: aggiungere "clicca per attivare l'audio" in schermata del titolo, oppure far partire un brano appena c'è il primo gesto.
- **Salvataggio**: oggi non esiste (si ricomincia dal Cerchio I). `localStorage` per livello, equipaggiamento e cerchio raggiunto.
- **Pausa** (Esc) e **opzioni** (volume, qualità grafica per schede deboli: pixel ratio, ombre, bloom).
- **Controller / touch** (per l'open day): oggi solo tastiera e mouse.
- **Modalità chiosco** per l'open day: schermo intero, reset dopo 60 s di inattività, schermata "attract" automatica.
- Mostrare a schermo **cosa fa ogni mossa** nel primo cerchio con un breve suggerimento (c'è il tooltip, ma serve passarci sopra il mouse).

## 3. Codice
- `main.js` è ~1900 righe: spezzarlo in moduli (nemici, loot, giocatore, cerchi) **solo quando nessun'altra sessione lo sta modificando**.
- `dante.js` dipende dai nomi degli ossi Mixamo; se si cambia il rig va riscritto l'aggancio.
- Pulire le copie di backup (`main_v1_arena.js`, `main_before_*.js`, `index_v1_arena.html`).
- Sostituire il rig "Soldier" con uno CC0 se il gioco va online in modo stabile (vedi `05_...md`).

## 4. Idee senza fretta
Ombre dinamiche più dolci, nebbia volumetrica, vera acqua dello Stige con riflessi, cutscene brevi tra i cerchi con terzine, galleria dei dannati (bestiario con versi),
modalità cooperativa locale, modalità sfida a tempo, classifica locale.
