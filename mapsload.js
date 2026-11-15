/* Carica le mappe per il gioco: parte da maps.js e applica le modifiche salvate dall'editor
   (editor.html le tiene nel browser, chiave 'dante_maps_override'). Per ignorarle: aggiungi ?maps=default all'indirizzo. */
import { MAPS as BASE } from './maps.js';

export const MAPS = JSON.parse(JSON.stringify(BASE));
export let OVERRIDDEN = false;
try {
  if (!/[?&]maps=default/.test(location.search)) {
    const raw = localStorage.getItem('dante_maps_override');
    if (raw) {
      const o = JSON.parse(raw);
      for (const k of Object.keys(o)) if (Array.isArray(o[k]) && o[k].length >= 2) { MAPS[k] = o[k]; OVERRIDDEN = true; }
    }
  }
} catch (e) { console.warn('mapsload: modifiche dell\'editor non leggibili', e); }
if (OVERRIDDEN) console.info('Mappe: sto usando le modifiche dell\'editor. Aggiungi ?maps=default per tornare a maps.js');
