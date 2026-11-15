/* avvisi.js — messaggi di cortesia per chi apre il gioco online: manca WebGL, oppure è un telefono/tablet
   (il gioco vuole tastiera e mouse). Nessuna dipendenza dal resto del gioco. */
(function () {
  const box = (html, fixed) => {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);z-index:99999;max-width:min(560px,92vw);padding:14px 18px;background:rgba(18,8,6,.94);border:1px solid #8a5a2a;color:#e8d2b0;font:15px/1.4 "IM Fell English",Georgia,serif;text-align:center;box-shadow:0 0 24px #000;' + (fixed || 'bottom:16px;');
    d.innerHTML = html; document.body.appendChild(d); return d;
  };
  let gl = null;
  try { const c = document.createElement('canvas'); gl = c.getContext('webgl2') || c.getContext('webgl'); } catch (e) {}
  if (!gl) { box('<b style="font-family:Cinzel,serif;letter-spacing:.08em">WEBGL NON DISPONIBILE</b><br>Questo gioco disegna l’Inferno in 3D e ha bisogno di un browser recente con WebGL attivo (Chrome, Edge, Firefox, Safari) e dell’accelerazione hardware.', 'top:40%;'); return; }
  const touch = matchMedia('(pointer:coarse)').matches || innerWidth < 760;
  if (touch) {
    const d = box('<b style="font-family:Cinzel,serif;letter-spacing:.08em">PENSATO PER PC</b><br>Si gioca con tastiera e mouse (WASD, click, Spazio). Su telefono o tablet i comandi non funzionano.<br><button style="margin-top:8px;padding:6px 16px;background:#3a1a10;color:#f0d8a8;border:1px solid #8a5a2a;font:inherit;cursor:pointer">Ho capito</button>');
    d.querySelector('button').onclick = () => d.remove();
  }
})();
