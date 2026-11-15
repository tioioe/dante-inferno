# DANTE · INFERNO — per proseguire il lavoro

Questa cartella contiene i file di passaggio per riprendere il progetto senza perdere nulla.
Il gioco vero sta in **`D:\DanteInferno`**. Qui non c'è codice: solo istruzioni e stato.

## Che cos'è
Un ARPG isometrico in HTML + three.js (stile Diablo 4 / Alien Swarm) ispirato alla *Divina Commedia*.
Dante, con una spada di fuoco, scende nell'Inferno: cerchio dopo cerchio attraversa camere collegate da
corridoi con cancelli, uccide branchi di demoni, risolve enigmi tratti dal poema e sconfigge un boss.
Versi originali con parafrasi in italiano moderno. Tutto è offline: nessun server, nessun database.

## Come si avvia (30 secondi)
1. Doppio clic su **`D:\DanteInferno\AVVIA.bat`** (apre `http://localhost:8801` e avvia il mini server).
2. Clicca **ENTRA NELL'INFERNO**. Parte l'intro nella selva oscura (Spazio per saltarla).
3. Altre pagine utili (stesso server): `editor.html` (editor mappe, anche `EDITOR.bat`), `storie.html`
   (tutti i testi), `audio-lab.html` (suoni e musica), `dante-lab.html` (modello di Dante),
   `monsters-lab.html` (i 16 mostri).

## Cosa leggere, in ordine
| File | Contenuto |
|---|---|
| `01_STATO.md` | Cosa funziona, cosa non è verificato, problemi noti |
| `02_ARCHITETTURA.md` | Ogni file del progetto, come si parlano, punti di aggancio |
| `03_GIOCO_E_BILANCIAMENTO.md` | Comandi, mosse, numeri, nemici, cerchi, enigmi |
| `04_TESTARE.md` | Come provare il gioco (anche senza giocare a mano), trucchi e trappole |
| `05_ASSET_LICENZE_E_ONLINE.md` | Asset usati, licenze, come mettere il gioco online |
| `06_PROSSIMI_PASSI.md` | Cosa fare dopo, in ordine di valore |
| `07_REGOLE_DI_LAVORO.md` | Preferenze di Damiano e regole per non rompere il progetto |
| `08_PROMPT_PER_RIPARTIRE.md` | Testo pronto da incollare in una nuova sessione |

## In una riga
Tre cerchi giocabili (Limbo, Lussuriosi, Golosi), HUD e audio fatti a mano, mostri Quaternius, intro con versi,
editor mappe e cartella `upload` pronta per WinSCP. Prossimo passo naturale: **Cerchio IV (Avari e Prodighi)**
e una vera prova a mano su una scheda video vera.
