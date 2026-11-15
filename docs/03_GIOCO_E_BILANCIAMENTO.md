# 03 · Gioco e bilanciamento

## Comandi
**WASD** muoversi · **mouse** mirare · **click sinistro** spada · **click destro / Q** Fuoco di Virgilio · **1** Turbine · **2** Grido del Giudizio ·
**Spazio** scatto · **R** pozione · **Tab** equipaggiamento · **H** aiuto di Virgilio (enigma) · **M** audio on/off · **N** musica on/off · **Spazio** (nell'intro) salta.

## Le sei mosse (numeri in `main.js`; testi/tooltip in `SK` di `hud.js`)
| Mossa | Tasto | Costo Fede | Ricarica | Effetto |
|---|---|---|---|---|
| **Fendente dell'Esule** | click | — | 0,38 s | arco davanti, raggio 3,3 m, danno ×1.0, **+7 Fede** per nemico colpito |
| **Fuoco di Virgilio** | DX / Q | 12 | 1,0 s | proiettile che trapassa, ×2.2 |
| **Turbine della Bufera** | 1 | 30 | 2,0 s | rotazione 0,9 s, 3 colpi ×0.7, raggio 3,9 m |
| **Grido del Giudizio** | 2 | 25 | 7,0 s | onda raggio 7,5 m, ×1.4, stordisce 0,9 s, respinge |
| **Scatto della Lonza** | Spazio | — | 0,9 s | 0,18 s a 24 m/s (≈4,3 m), invulnerabile 0,3 s |
| **Lacrima di Beatrice** | R | — | 4 s | cura 40% vita, max 5 pozioni, rifornite a ogni checkpoint (almeno 3) |

## Giocatore
- Vita: `100 + (livello−1)·14 + bonus oggetti`. Fede massima 100, **parte da 20**, +1,2/s.
- Danno base: `(6 + arma) · (1 + 0,1·(livello−1)) · moltiplicatore mossa · (0,9…1,1)`. Critico: 5% base, ×2.
- Esperienza per salire: `40 · livello^1,45`. Velocità 7,6 m/s (rallenta durante colpo e turbine).
- Morte → "RISORGI AL CHECKPOINT" (ultima camera raggiunta); i nemici svegli recuperano 30% vita, **il boss no**.

## Loot (4 rarità: Comune, Magico, Raro, Leggendario)
Tre slot: **arma** (danno), **armatura** (vita + riduzione danni), **amuleto** (critico + velocità). Equipaggiamento automatico se migliore (punteggio).
Formule volutamente dolci (le prime erano troppo forti): arma `(2+ilvl·0,9)·k`, armatura `(8+ilvl·4)·k`.
Campioni e boss lasciano oggetti migliori; il campione dà sempre arma e armatura. Nomi in italiano con riferimenti al poema.

## Nemici (valori base del Cerchio I)
| Tipo | Vita | Danno | Velocità | Note |
|---|---|---|---|---|
| Dannato (imp) | 20 | 8 | 5,0 | stordimento 0,2 s |
| Bruto | 80 | 17 | 3,2 | |
| Campione (elite) | 300 | 22 | 3,9 | colpo a terra con avviso, lascia sempre oggetti |
| **Minosse** (boss) | 800 | 20 | 3,5 | colpi a terra, richiama dannati, più aggressivo sotto il 50% |

- **Scalatura**: ogni camera `+30% vita, +12% danni`; `sc = camera + (cerchio−1)·4` (quindi i cerchi successivi sono molto più duri).
- Si svegliano a **12 m**. Un colpo già in fase finale (ultimi 0,25 s) non può essere interrotto dallo stordimento.
- **Cerchio II**: arpie, anime trascinate, guardiani della bufera, campione della tempesta, **Semiramide** (1500 vita, vento a raffiche).
- **Cerchio III**: cani infernali, anime fangose, ingordi, divoratore, **Cerbero** (1800 vita, tre teste, fango, richiama cani).

## Mappe e cerchi (da `maps.js`)
1. **Limbo**: La Selva Oscura → Il Vestibolo dei Dannati → La Sala dei Numeri (enigma) → La Piana dei Sospiri → Il Trono di Minosse.
2. **Lussuriosi**: La Soglia della Bufera → Il Vento che Mai Non Resta → La Sala delle Regine (enigma) → La Bufera Infernale → Il Trono di Semiramide.
3. **Golosi**: Il Cancello della Pioggia → La Palude dei Golosi → La Sala di Ciacco (enigma) → La Pioggia Maledetta → La Tana di Cerbero.

## Enigmi (accendere tre bracieri fermandosi 0,4 s sopra, nell'ordine giusto; l'ordine sbagliato richiama 3 dannati)
1. **3 → 9 → 33** (Trinità, cerchi dell'Inferno, canti di una cantica).
2. **Elena → Didone → Cleopatra** (dalla più antica alla più recente).
3. **Superbia → Invidia → Avarizia** (le tre faville di Firenze, secondo Ciacco).
Tre suggerimenti progressivi con **H**. Tutti i testi in `ENIGMAS` (main.js).

## Cosa ha misurato il bot (solo Cerchio I, 2 partite)
Vittoria in 102 e 134 s di gioco; 0 e 1 morti; 6 pozioni usate; vita minima per camera: 1,0 · 0,83–1,0 · 0,87–1,0 · 0,26–0,51 · **boss 0,14–0,16**.
Curva giusta (facile → teso → boss quasi mortale) **per un bot semplice**. Un umano è più lento: tempi più lunghi. **Cerchi II e III non misurati.**

## Come riequilibrare
Cambia i numeri in `TYPES` (e `TYPES` aggiunti nei blocchi dei cerchi), `PACKS*`, la scalatura in `spawnEnemy`, le formule di `dmgRoll`/`genItem`.
Poi `tools/bot.js` (vedi `04_TESTARE.md`). Obiettivi usati: camere iniziali facili, Piana dei Sospiri tesa (~30% vita minima), boss duro ma battibile (0–2 morti).
