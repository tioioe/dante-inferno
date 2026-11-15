# 01 · Stato del progetto (14/11/2026)

## Funziona (verificato nel browser di anteprima, con screenshot o misure)
- **Percorso completo del Cerchio I** (Limbo): 5 camere, cancelli di fuoco, enigma 3-9-33, campione, boss Minosse, portale.
  Un bot senza trucchi l'ha concluso in 1:42–2:14 di tempo di gioco, con 0–1 morti.
- **Intro nella selva oscura** (Canto I): Dante cammina, tre terzine con parafrasi, occhi di lonza/leone/lupa, camera che sale al gioco.
- **Cerchi II (Lussuriosi) e III (Golosi)**: aggiunti da un'altra sessione (vento a raffiche, pioggia, fango, Semiramide, Cerbero).
  Esistono e partono, ma **il bilanciamento di questi due cerchi non è stato misurato col bot**.
- **HUD** completo e disegnato a mano: globi con nove borchie e alloro, sei medaglioni delle mosse con icona propria,
  tooltip con versi, minimappa, barra del boss, messaggi di Virgilio/Minosse, inventario, notifiche. Font Cinzel e IM Fell English.
- **Audio** sintetizzato (21 effetti, ambiente, passi, battito, tamburi) e **colonna sonora** a sette brani (titolo, selva,
  esplorazione, combattimento, Minosse, vittoria, caduta). Nessun file audio.
- **Effetti visivi** aggiuntivi (`fx.js`): scia della lama, scosse di camera, anime dei morti, polvere, cenere, colonna di luce al livello, macchie di bruciato.
- **Modello di Dante** costruito a mano sullo scheletro del soldato (cappuccio rosso, lucco, alloro, naso aquilino).
- **Mostri veri della Commedia** (15/11, `bestiario-core.js` + `bestiario.js`, tutto procedurale, nessun asset): **Minosse** (corna, criniera, mantello, coda avvolta), **Cerbero** (tre teste che si muovono da sole, coda di serpe), **Caronte** (remo, occhi con rote di fiamme), **Tisifone/Furia** (capelli di serpenti), **Minotauro** (mazza chiodata), **Malebranca** (ali e forcone), **Arpia**. Sostituiscono i demoni tinti per boss, campione, bruto, dannato, arpia, campione della tempesta, Cerbero. Restano Quaternius: anime, guardiani, cani, fangosi, ingordi, divoratore e Semiramide.
- **Effetti vivi sui mostri** (`bestiario.js`): fiamme dalle corna e dalla coda, fumo dalle narici, bava, soffio di fuoco di Cerbero/Minosse quando caricano il colpo, nebbia gelida di Caronte, penne che cadono, occhi che pulsano e si accendono prima del colpo, schizzi di icore al colpo, esplosione e pozza che si allarga alla morte, fango alle zampe.
- **Editor delle mappe** visuale (`editor.html`) e file dati `maps.js`; **build** per l'upload (`COSTRUISCI.bat` → cartella `upload`).

## NON verificato
- **Nessuna prova a mano** con mouse e tastiera su una scheda video vera. Il pannello di anteprima gira a pochi fps (rendering software).
  Quindi: fluidità, "feeling" dei comandi, difficoltà percepita, volume reale di musica ed effetti **vanno giudicati giocando**.
- **Bilanciamento dei Cerchi II e III** e degli enigmi nuovi.
- **Effetti a velocità reale**: scia della lama (a pochi fps appare come un cuneo), rune dei cerchi di pericolo, aure di campione e boss, portale finale.
- **Bestiario**: provato solo in `bestiario-lab.html` (con pose fisse) e in gioco con screenshot a pochi fps. Mai visto a velocità reale: pulsazione degli occhi, soffio di fuoco, ritmo di corsa e attacco, e quanto si leggono nella camera dall'alto (i dettagli del viso si vedono poco). Minosse/Cerbero hanno ancora forme un po' "a palloncino": si possono raffinare nel laboratorio.
- **Musica del titolo**: il browser fa partire l'audio solo dopo un clic, e il primo clic è "Entra nell'Inferno" → il brano del titolo si sente solo se si è già cliccato altrove.
- **Online**: la cartella `upload` è stata costruita ma non provata su un vero hosting, e **quella attuale è vecchia** (12:10 del 14/11:
  senza musica né i cinque mostri nuovi). Va rifatta con `COSTRUISCI.bat`.

## Zaino, casse e pozioni (15/11, `bottino.js`)
- **Tab = zaino** (12 posti, gioco in pausa): un oggetto migliore si equipaggia da solo e il vecchio va nello zaino; dallo zaino Equipaggia / Dissolvi (in Faville) / **Potenzia fino a +5** (+14% alle statistiche per livello, costo in Faville). Hook in `main.js`: `pickup()` chiama `window.__bottino.take()`.
- **Casse** (legno, ferro, oro) in ogni camera, si aprono con **E**; la cassa della sala dell'enigma è sigillata finché non è risolto; il boss lascia un forziere d'oro. Dentro: oggetti, Lacrime di Beatrice, Faville, **Fiale di Fede (F, +60 Fede)**, **Elisir del Veltro (V, +40% danno e +10% critico per 30 s)**.
- Faville anche dai campioni e dai boss.
- **Salvataggio automatico** (localStorage `dante_save_v1`, ogni 3 s e alla chiusura): livello, XP, equipaggiamento, zaino, Faville, pozioni. Il cerchio NON si salva: si riparte dal Cerchio I col personaggio potenziato. **Esc = pausa** (riprendi, zaino, qualità, suoni, musica, cancella salvataggio).
- Nuovi modelli procedurali: Semiramide, Anima trascinata, Ingordo (Ciacco), Segugio infernale (restano Quaternius: Guardiano della bufera, Anima fangosa, Divoratore).

## Difficoltà e minimappa (15/11)
- Tre difficoltà dal menu di pausa (Esc), salvate in `dante_diff`: **Pellegrino** (danni ×0,85), **Dannato** (×1,5, predefinita, ogni caduta costa il 10% delle Faville), **Inferno** (×2,2, costa il 20%). Il moltiplicatore è `window.__diff`, letto da `hurtPlayer`.
- Le casse sono sulla minimappa (quadrato giallo/azzurro/oro, con croce se sigillata, grigio se aperta).
- NON verificato con una partita umana: il bot (che salta l'enigma e non arriva al boss) a ×1,4 non è mai morto; la difficoltà reale va sentita giocando.

## Didattica e cinematiche (15/11, `didattica.js`)
- Cinematiche di camera che fermano il gioco (bande nere, HUD nascosto, didascalia con verso e spiegazione): apertura di ogni cerchio, stacco panoramico all'ingresso delle camere 1-3, ingresso scenico dei boss. **Si saltano con Esc, Spazio, Invio, clic o il pulsante SALTA**. Camera = `window.__focus` + `CAM_OFF` pilotati dal modulo; stato di gioco `cine` durante la scena.
- Addestramento ai comandi in 5 passi (si completa facendo le cose, Esc lo salta), schede del Bestiario alla prima volta che si incontra un mostro, **tasto B = Bestiario completo**, **tasto T = spiegazioni on/off** (si ricorda in localStorage `dante_didattica`; `dante_tut`, `dante_seen`). Testi e versi in `MON`, `CIRCLE`, `ROOM` in cima al file.
- Nel pannello di anteprima la pagina anima solo se il pannello è visibile (altrimenti le cinematiche non partono).

## Ottimizzazione (15/11)
- `prestazioni.js`: qualità automatica (misura i fps, abbassa/alza la risoluzione di disegno e le ombre; tasto **G** = qualità massima fissa). Nemici addormentati lontani non animano; le parti minuscole dei mostri non proiettano ombra; `dante.glb` da 5,8 MB a 0,8 MB.
- Online: https://damy6x6.it/dante/

## Problemi / avvertenze note
- **Più sessioni hanno modificato `main.js` in parallelo.** A volte per qualche minuto il gioco dava errori (funzioni usate ma non ancora scritte,
  un commento che si mangiava una riga). Prima di ogni prova: controllo di sintassi (vedi `04_TESTARE.md`).
- `main.js` è grande (~1900 righe) e contiene quasi tutto il gioco. Le aggiunte recenti sono in moduli separati per ridurre i conflitti.
- **(Risolto 15/11)** Il rig di Dante è ora il CC0 "Universal Animation Library" (`tools/make_dante_rig.mjs`, `dante.js` traduce i nomi DEF-… in quelli Mixamo). Vecchia nota sul "Soldier": (scheletro/animazioni di Dante): viene dagli esempi di three.js (origine Mixamo). Prima di pubblicare online
  conviene verificarne le condizioni di ridistribuzione, oppure sostituirlo con un rig CC0 (vedi `05_ASSET_LICENZE_E_ONLINE.md`).
- Copie di backup nella cartella: `main_v1_arena.js` (prima versione a arena), `main_before_maps.js`, `main_before_tex.js`. Si possono cancellare quando si è sicuri.
