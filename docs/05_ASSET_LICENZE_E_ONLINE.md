# 05 · Asset, licenze e messa online

## Asset di terze parti usati
| Cosa | Dove | Fonte | Licenza |
|---|---|---|---|
| three.js (+ post-processing) | `lib/` | threejs.org | MIT |
| Universal Animation Library (scheletro e animazioni di Dante) | `assets/dante.glb` (generato da `tools/make_dante_rig.mjs`) | Quaternius, opengameart.org/content/universal-animation-library | CC0 (15/11/2026: ha sostituito il Soldier/Mixamo; l'originale è in `assets_download/dante_soldier_BACKUP.glb`, NON caricare) |
| RobotExpressive (nemico di riserva) | `assets/demone.glb` | esempi di three.js, Tomás Laulhé | CC0 |
| 9 mostri: Demon, BlueDemon, Orc, Orc_Skull, Birb, Alien, Dino, Tribal, Yeti | `assets/monsters/*.gltf` + `Atlas_Monsters.png` | Quaternius *Ultimate Monsters* | CC0 |
| Sprite degli effetti (fuoco, fumo, scintille, onde, rune) | `assets/fx/` | Kenney *Particle Pack* | CC0 |
| Globi dell'interfaccia (cornice originale) | `assets/ui/` | OpenGameArt (itsmars) | CC0 (la pagina riportava anche CC-BY 4.0: ricontrollare) |
| Texture di pavimenti (7 set 1k) | `assets/tex/` | Poly Haven | CC0 |
| Font Cinzel, Cinzel Decorative, IM Fell English | `assets/fonts/` | github.com/google/fonts | SIL OFL 1.1 |

Minosse, Cerbero, Caronte, Furia, Minotauro, Malebranca e Arpia (`bestiario-core.js`) sono geometria e texture generate dal codice: nessuna licenza esterna.
Tutto il resto (icone SVG, cornici, suoni, musica, effetti aggiuntivi, modello di Dante, testi) è fatto per questo progetto.
I versi sono di Dante Alighieri (pubblico dominio); le parafrasi sono scritte per il gioco. Il motivo del *Dies irae* è canto gregoriano (pubblico dominio).
Le licenze originali sono nei file `LICENSE-*.txt` dentro `assets/*`.

**(Risolto il 15/11: il rig è ora CC0.) Vecchia nota sul "Soldier"**: il corpo e l'armatura originali sono nascosti, ma lo scheletro e le animazioni sono i suoi.
Se il gioco va pubblicato in modo stabile, o si controllano le condizioni di Mixamo/three.js per la ridistribuzione, o si sostituisce
con un personaggio CC0 con animazioni (Quaternius ne ha: *Universal Animation Library*, personaggi modulari). `dante.js` aggancia i pezzi per nome degli ossi `mixamorig*`: con un altro rig servirebbe adattarlo.

## Cartelle da NON mettere online
`assets_download/` (zip e pacchetti originali), `node_modules/`, `screens/`, `tools/`, i backup `main_*.js`. La build copia **solo** ciò che il codice cita.

## Costruire la cartella "upload" (per WinSCP)
1. Doppio clic su **`COSTRUISCI.bat`** (esegue `node build.mjs`, richiede le dipendenze già installate: esbuild, sharp, gltf-transform).
2. Esce la cartella `D:\DanteInferno\upload`: `index.html`, `game.js` (un solo file minificato, con three.js), `storie.html`, `assets/` ridotti
   (PNG ricompressi, JPG a 1024 px, modelli in `.glb`), `.htaccess`, `LEGGIMI.txt`, `CREDITI.txt`.
3. Con WinSCP trascina **tutto il contenuto** di `upload` nella cartella del sito (anche `.htaccess`, nascosto).
4. Apri l'indirizzo: nessun PHP né database. Richiede HTTPS consigliato e un browser con WebGL.
Dimensione ultima build: ~8,6 MB (assets ~29 MB nel progetto). Rilancia la build **ogni volta** che cambi il gioco.

Note: `build.mjs` include da solo ogni file in `assets/monsters/`. I crediti e il controllo finale elencano i nove mostri (aggiornato il 14/11).
I moduli da includere nel bundle si leggono dai tag `<script type="module" src="...">` di `index.html`, nell'ordine: basta aggiungere il tag lì.
**La cartella `upload` attuale è vecchia** (costruita alle 12:10 del 14/11): non contiene `music.js`, `fx.js` aggiornato né i cinque mostri nuovi. **Rilancia `COSTRUISCI.bat` prima di caricare qualsiasi cosa online.**
Non è stato provato su un vero hosting: provare prima in una sottocartella e controllare la console del browser.
