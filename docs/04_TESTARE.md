# 04 · Come provare il gioco

## Avvio
`AVVIA.bat` (o `node server.js` in `D:\DanteInferno`) → `http://localhost:8801`. Il server non mette in cache: basta F5.
Il browser fa partire l'audio solo dopo un clic dell'utente.

## Pagine di prova (stesso server)
- `/audio-lab.html` — 21 effetti, ambiente, tensione, **sette brani** con cursore di intensità e oscilloscopio.
- `/bestiario-lab.html` — i 7 mostri della Commedia (animazioni a pulsanti; `?only=mMinosse`, `?anim=Death&t=1.5`).
- `/dante-lab.html` — il modello di Dante.
- `/monsters-lab.html` — i 16 mostri del pacchetto, clic per cambiare animazione.
- `/storie.html` — tutti i versi originali e le parafrasi, con dove compaiono.
- `/editor.html` — editor delle mappe. `?maps=default` nel gioco ignora le modifiche salvate nel browser.

## CONTROLLO DI SINTASSI PRIMA DI OGNI PROVA (importante)
`node --check` non accetta i moduli ES con estensione `.js`. Copia il file con estensione `.mjs` e controllalo:
```
copy main.js %TEMP%\chk.mjs && node --check %TEMP%\chk.mjs
```
Se dà errore, il gioco in anteprima mostra solo il titolo o niente. È successo più volte quando più sessioni modificavano `main.js` insieme.
Nella console del browser, i messaggi di errore **vecchi restano** anche dopo il ricaricamento: guarda solo quelli nuovi.

## Trucchi per provare senza giocare a mano (console del browser)
```js
document.getElementById('go').click();                 // avvia (con un clic vero se vuoi l'audio)
while (__G.state==='intro') __step(0.05);              // salta l'intro avanzando il tempo di gioco
__step(0.05, 100);                                     // avanza 5 secondi
__P.hp = __P.max = 9999;                               // vita enorme
__cmd.slash(); __cmd.nova(); __cmd.addXp(60);          // mosse e livello
__cmd.spawnEnemy('harpy', x, z, 0, 0);                 // genera un nemico di un tipo
window.__zoom = 0.6; window.__focus = new __THREE.Vector3(x,1,z);   // primo piano
__fx.tick(0.05)                                        // fa avanzare gli effetti di fx.js
```
**Il pannello di anteprima gira a pochissimi fps** (rendering software, e quasi fermo se non in primo piano). Per questo:
fai avanzare il gioco con `__step`, poi aspetta 1–3 secondi **prima** dello screenshot (la schermata mostra l'ultimo fotogramma disegnato, non quello attuale).
Dopo aver cambiato uno stato del DOM con transizione (messaggi, banner) aspetta ancora un po'.

## Bot di bilanciamento
```js
const b = await import('/tools/bot.js?v=1'); JSON.stringify(await b.run(8000))
```
Gioca davvero (tastiera e mouse simulati): cammina, attacca, schiva i cerchi rossi, beve pozioni, risolve l'enigma, passa i cancelli, sfida il boss.
Restituisce vittoria, morti, pozioni, secondi per camera, vita minima per camera. Cambia `?v=` per evitare la cache dei moduli.
Limite: è scritto per il Cerchio I; per II e III va adattato (vento, fango, enigmi con nomi).

## Misurare l'audio
`__sound.level01()` (picco 0–1) e `__sound.analyser`; in `audio-lab.html` `window.__lab` e `window.__labMusic`. Misure usate: effetti 0,4–0,8, musica d'ambiente RMS ≈ 0,06–0,07, combattimento ≈ 0,12.

## Copia isolata (quando `main.js` è rotto da un'altra sessione)
Copia i file in una cartella temporanea, correggi lì il simbolo mancante, fai partire un secondo server su un'altra porta e prova lì.
Si evita di dipendere da uno stato a metà. Ricorda di togliere la voce di prova da `.claude/launch.json` (vive anche in `D:\.claude\launch.json`).

## Screenshot
Quelli già fatti sono in `D:\DanteInferno\screens\` (titolo, intro, HUD, effetti, mostri).
