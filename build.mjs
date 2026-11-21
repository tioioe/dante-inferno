/* ============================================================
   build.mjs — crea la cartella "upload" pronta per WinSCP
   Uso:  node build.mjs      (oppure doppio clic su COSTRUISCI.bat)

   - un solo file JavaScript minificato (game.js) con three.js, gioco, intro e modello di Dante
   - copia SOLO gli asset realmente citati dal codice
   - ricomprime PNG (senza perdita), riduce le texture JPG a 1024 px, toglie le texture
     inutili dal modello di Dante (l'armatura originale è nascosta)
   - aggiunge .htaccess (compressione, cache, tipi MIME), LEGGIMI.txt e CREDITI.txt
   Rilanciala ogni volta che cambi il gioco: la cartella viene rifatta da zero.
   ============================================================ */
import { build, transform } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, 'upload');
const MAX_TEX = 1024;                                   // lato massimo delle texture JPG
const V = Date.now().toString(36);                      // versione: aggira la cache del browser a ogni nuovo caricamento
const kb = n => (n / 1024).toFixed(0).padStart(6) + ' KB';
const gz = buf => zlib.gzipSync(buf, { level: 9 }).length;
const log = (...a) => console.log(...a);

if (!OUT.startsWith(ROOT + path.sep)) throw new Error('percorso di uscita inatteso');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

/* ---------- 1) JavaScript: un solo file minificato ----------
   I moduli da includere si leggono da index.html (nell'ordine in cui vengono caricati). */
let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const modules = [...html.matchAll(/<script type="module" src="(?:\.\/)?([^"?]+\.js)[^"]*"><\/script>/g)].map(m => m[1]);
if (!modules.length) throw new Error('index.html non contiene tag <script type="module" src="…">');
const res = await build({
  stdin: { contents: modules.map(m => `import './${m}';`).join('\n'), resolveDir: ROOT, sourcefile: 'entry.js', loader: 'js' },
  absWorkingDir: ROOT, bundle: true, minify: true, format: 'esm', target: 'es2020', legalComments: 'eof',
  outfile: path.join(OUT, 'game.js'), logLevel: 'warning', metafile: true
});
const jsSize = fs.statSync(path.join(OUT, 'game.js')).size;
log('JS      game.js', kb(jsSize), '  (gzip', kb(gz(fs.readFileSync(path.join(OUT, 'game.js')))).trim() + ')  ← ' + modules.join(', '));
const ownInputs = Object.keys(res.metafile.inputs).filter(f => !/node_modules|^lib[\\/]|^<stdin>/.test(f) && !/entry\.js$/.test(f));   // i file del gioco davvero inclusi

/* ---------- 2) HTML e CSS: una sola riga di script, CSS minificato ---------- */
const before = html;
html = html.replace(/<script type="importmap">[\s\S]*?<\/script>\s*/g, '');
html = html.replace(/<script type="module" src="[^"]+\.js[^"]*"><\/script>\s*/g, '');
if (/importmap|src="[^"]*\.js/.test(html)) throw new Error('index.html contiene ancora tag <script> dei sorgenti');
html = html.replace('</body>', `<script type="module" src="./game.js?v=${V}"></script>\n</body>`);
if (html === before) throw new Error('index.html non modificato: tag </body> mancante?');
const cssFiles = [];
for (const m of [...html.matchAll(/<link rel="stylesheet" href="([^"?]+\.css)[^"]*">/g)]) {   // fogli di stile locali: minificati e copiati accanto a index.html
  const css = fs.readFileSync(path.join(ROOT, m[1]), 'utf8'); cssFiles.push(css);
  fs.mkdirSync(path.dirname(path.join(OUT, m[1])), { recursive: true });
  fs.writeFileSync(path.join(OUT, m[1]), (await transform(css, { loader: 'css', minify: true })).code);
  html = html.replace(m[0], `<link rel="stylesheet" href="${m[1]}?v=${V}">`);
}
const styles = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)];
for (const m of styles) html = html.replace(m[0], `<style>${(await transform(m[1], { loader: 'css', minify: true })).code}</style>`);
fs.writeFileSync(path.join(OUT, 'index.html'), html);
log('HTML    index.html', kb(Buffer.byteLength(html)), cssFiles.length ? '  + ' + cssFiles.length + ' CSS' : '');

/* ---------- 3) asset: solo quelli citati dal codice ---------- */
const srcText = [fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), ...cssFiles, ...ownInputs.map(f => fs.readFileSync(path.join(ROOT, f), 'utf8'))].join('\n');
const isLicense = f => /^(LICENSE|OFL|COPYING)/i.test(f);
function referenced(rel) {
  const file = path.basename(rel), ext = path.extname(file), stem = path.basename(file, ext);
  if (isLicense(file)) return true;                                         // le licenze viaggiano sempre con gli asset
  if (rel.startsWith('monsters/')) return true;                             // modelli e atlante: si caricano per nome composto
  if (srcText.includes(file) || srcText.includes(stem)) return true;
  const base = stem.replace(/_(diff|nor|rough|disp|ao|arm|gl)$/i, '');      // texture PBR con suffissi composti nel codice
  return base !== stem && srcText.includes(base);
}
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
let sharp = null;
try { sharp = (await import('sharp')).default; } catch { log('! sharp non disponibile: immagini copiate senza ottimizzare'); }
let gltf = null;
try { const core = await import('@gltf-transform/core'), fn = await import('@gltf-transform/functions'); gltf = { io: new core.NodeIO(), prune: fn.prune, dedup: fn.dedup }; }
catch { log('! gltf-transform non disponibile: modelli copiati senza ottimizzare'); }

const ASSETS = path.join(ROOT, 'assets');
const files = fs.existsSync(ASSETS) ? walk(ASSETS) : [];
let inBytes = 0, outBytes = 0; const skipped = [], glbSwap = [];
for (const abs of files) {
  const rel = path.relative(ASSETS, abs).replace(/\\/g, '/');
  if (!referenced(rel)) { skipped.push(rel); continue; }
  let dst = path.join(OUT, 'assets', rel); fs.mkdirSync(path.dirname(dst), { recursive: true });
  const src = fs.readFileSync(abs); inBytes += src.length;
  let outBuf = src;
  const ext = path.extname(rel).toLowerCase();
  try {
    if (gltf && ext === '.gltf') {                                           // .gltf con buffer in base64 → .glb binario (-25%), poi si aggiorna il percorso in game.js
      const doc = await gltf.io.read(abs);
      await doc.transform(gltf.prune({ keepLeaves: true }), gltf.dedup());
      outBuf = Buffer.from(await gltf.io.writeBinary(doc));
      dst = dst.replace(/\.gltf$/i, '.glb'); glbSwap.push(rel);
    } else if (sharp && ext === '.png') {                                           // PNG: ricompressione senza perdita
      const t = await sharp(src).png({ compressionLevel: 9, effort: 10 }).toBuffer();
      if (t.length < src.length) outBuf = t;
    } else if (sharp && (ext === '.jpg' || ext === '.jpeg') && rel.startsWith('tex/')) {   // texture: massimo 1024 px
      const t = await sharp(src).resize({ width: MAX_TEX, height: MAX_TEX, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
      if (t.length < src.length) outBuf = t;
    } else if (gltf && rel === 'dante.glb') {                                // il soldato originale è nascosto: via le sue texture
      const doc = await gltf.io.read(abs);
      for (const t of doc.getRoot().listTextures()) t.dispose();
      await doc.transform(gltf.prune({ keepLeaves: true }), gltf.dedup());
      const t = Buffer.from(await gltf.io.writeBinary(doc));
      if (t.length < src.length) outBuf = t;
    }
  } catch (e) { log('! ottimizzazione saltata per', rel, '-', e.message); outBuf = src; }
  fs.writeFileSync(dst, outBuf); outBytes += outBuf.length;
}
log('ASSET  ', files.length - skipped.length, 'file copiati,', skipped.length, 'esclusi (non usati)  ·', kb(inBytes).trim(), '→', kb(outBytes).trim());
if (skipped.length) log('        esclusi:', skipped.slice(0, 40).join(', ') + (skipped.length > 40 ? ', …' : ''));

if (glbSwap.length) {                                                          // i modelli ora sono .glb: aggiorno il percorso nel codice
  let js = fs.readFileSync(path.join(OUT, 'game.js'), 'utf8'), n = 0;
  js = js.replace(/(\.\/assets\/monsters\/\$\{[^}]+\})\.gltf/g, (_, a) => { n++; return a + '.glb'; });
  if (n !== 1) throw new Error(`percorso dei mostri non trovato in game.js (sostituzioni: ${n}) — controlla loadModel(...monsters/...)`);
  fs.writeFileSync(path.join(OUT, 'game.js'), js);
  log('MODELLI', glbSwap.length, 'file .gltf convertiti in .glb');
}

/* ---------- 4) pagina delle storie (link resi relativi: funziona in qualsiasi sottocartella) ---------- */
if (fs.existsSync(path.join(ROOT, 'storie.html'))) {
  let s = fs.readFileSync(path.join(ROOT, 'storie.html'), 'utf8');
  s = s.replace(/<a href="\/dante-lab\.html">[^<]*<\/a>\s*/g, '').replace('href="/?intro"', 'href="./?intro"').replace('href="/"', 'href="./"');
  fs.writeFileSync(path.join(OUT, 'storie.html'), s);
}

/* ---------- 5) file per il server ---------- */
fs.writeFileSync(path.join(OUT, '.htaccess'), `# Dante — Inferno: impostazioni per Apache (se il server è Nginx, vedi LEGGIMI.txt)
AddType model/gltf-binary .glb
AddType model/gltf+json .gltf
AddType text/javascript .js .mjs
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css text/javascript application/javascript application/json model/gltf+json model/gltf-binary application/octet-stream font/ttf application/x-font-ttf image/svg+xml
</IfModule>
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/html "access plus 0 seconds"
  ExpiresByType text/javascript "access plus 7 days"
  ExpiresByType image/png "access plus 30 days"
  ExpiresByType image/jpeg "access plus 30 days"
  ExpiresByType model/gltf-binary "access plus 30 days"
  ExpiresByType model/gltf+json "access plus 30 days"
  ExpiresByType font/ttf "access plus 30 days"
</IfModule>
<IfModule mod_headers.c>
  <FilesMatch "\\.(glb|gltf|png|jpg|ttf)$">
    Header set Cache-Control "public, max-age=2592000"
  </FilesMatch>
</IfModule>
`);
const has = d => fs.existsSync(path.join(ROOT, 'assets', d));
fs.writeFileSync(path.join(OUT, 'CREDITI.txt'), `DANTE — INFERNO · crediti e licenze

Gioco, intro, modello di Dante e testi: realizzati per questo progetto.
I versi citati sono di Dante Alighieri (pubblico dominio); le parafrasi sono scritte per il gioco.

Componenti di terze parti:
- three.js (MIT) — https://threejs.org  (nota di licenza in coda a game.js)
- Rig e animazioni di Dante: Universal Animation Library, Quaternius, CC0 — https://quaternius.com · RobotExpressive: Tomás Laulhé, CC0
${has('monsters') ? '- Mostri (Demon, BlueDemon, Orc, Orc_Skull, Birb, Alien, Dino, Tribal, Yeti): Quaternius, CC0 — https://quaternius.com\n' : ''}- Minosse, Cerbero, Caronte, Furia, Minotauro, Malebranca, Arpia: modellati e animati a mano per questo gioco (nessun asset esterno)
${has('fx') ? '- Sprite degli effetti (fuoco, fumo, scintille, onde): Kenney, CC0 — https://kenney.nl\n' : ''}${has('ui') ? '- Elementi dell\'interfaccia (globi): CC0 da OpenGameArt.org\n' : ''}${has('tex') ? '- Texture dei pavimenti: Poly Haven, CC0 — https://polyhaven.com\n' : ''}${has('voce') ? '- Voce dei canti I, IV, V e VI: Jenna Veniero, audiolibro Liber Liber (https://liberliber.eu), CC BY-NC-SA 4.0, ritagliata e ricompressa; uso non commerciale\n' : ''}${has('fonts') ? '- Caratteri Cinzel e IM Fell English: SIL Open Font License (vedi assets/fonts)\n' : ''}
I file di licenza originali sono nelle cartelle assets/*.
`);
fs.writeFileSync(path.join(OUT, 'LEGGIMI.txt'), `DANTE — INFERNO · come metterlo online

1. Apri WinSCP e collegati al tuo spazio web.
2. Vai nella cartella del sito dove vuoi il gioco (per esempio /dante/).
3. Trascina DENTRO quella cartella TUTTO il contenuto di questa cartella "upload"
   (index.html, game.js, storie.html, la cartella assets e il file nascosto .htaccess).
   In WinSCP: Opzioni > Preferenze > Pannelli > "Mostra file nascosti" per vedere .htaccess.
4. Apri l'indirizzo della cartella nel browser. Fatto. Funziona in qualsiasi sottocartella
   perché tutti i percorsi sono relativi, e NON serve PHP né database.

Pagine: index.html (il gioco) · storie.html (versi originali e parafrasi).

Requisiti: un normale hosting web con HTTPS consigliato. Il gioco usa WebGL: serve un browser recente.

Se il server NON è Apache (per esempio Nginx) il file .htaccess viene ignorato. Il gioco funziona lo
stesso, ma conviene attivare la compressione gzip per js, gltf, json e glb, e impostare questi tipi MIME:
  .glb  model/gltf-binary      .gltf model/gltf+json      .js text/javascript

Aggiornare il gioco: rilancia "node build.mjs" (o COSTRUISCI.bat) nella cartella del progetto
e ricarica i file. Il numero di versione in game.js?v=... cambia da solo e aggira la cache.
`);

/* ---------- 6) controllo di coerenza: ogni file citato esiste davvero ---------- */
const bundle = fs.readFileSync(path.join(OUT, 'game.js'), 'utf8');
const refs = new Set([...bundle.matchAll(/\.\/assets\/[A-Za-z0-9_./-]+\.[a-z0-9]+/g)].map(m => m[0].slice(2)));
const missing = [...refs].filter(r => !fs.existsSync(path.join(OUT, r)));
const monsterExt = glbSwap.length ? 'glb' : 'gltf';
for (const m of ['Demon', 'Orc', 'Orc_Skull', 'BlueDemon', 'Birb', 'Alien', 'Dino', 'Tribal', 'Yeti']) if (bundle.includes(`"${m}"`) && !fs.existsSync(path.join(OUT, `assets/monsters/${m}.${monsterExt}`))) missing.push(`assets/monsters/${m}.${monsterExt}`);
for (const m of bundle.matchAll(/\.\/assets\/fx\/' ?\+ ?\w+ ?\+ ?'\.png/g)) void m;               // fx: nomi composti, verificati sotto
const fxNames = [...srcText.matchAll(/(?:ftex|Emitter|addRing)\([^)]*?'([a-z]+_\d+)'/g)].map(m => m[1]);
for (const n of new Set(fxNames)) if (!fs.existsSync(path.join(OUT, `assets/fx/${n}.png`))) missing.push(`assets/fx/${n}.png`);
if (missing.length) { log('\n✗ FILE MANCANTI:', missing.join(', ')); process.exitCode = 1; }
else log('CHECK   tutti i file citati dal codice sono presenti (' + (refs.size + new Set(fxNames).size) + ' controllati)');

/* ---------- riepilogo ---------- */
const all = walk(OUT); const total = all.reduce((s, f) => s + fs.statSync(f).size, 0);
const web = all.reduce((s, f) => s + (/\.(js|html|css|gltf|glb|json|ttf|txt)$/.test(f) ? gz(fs.readFileSync(f)) : fs.statSync(f).size), 0);
log('\nTOTALE ', all.length, 'file ·', kb(total).trim(), '(≈', kb(web).trim(), 'con gzip sul server)  →', path.relative(ROOT, OUT));
