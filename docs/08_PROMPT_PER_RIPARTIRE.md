# 08 · Prompt pronto da incollare in una nuova sessione

Copia il blocco qui sotto in una nuova conversazione (cartella di lavoro: `D:\DanteInferno`).

```
Riprendiamo il gioco "Dante — Inferno" in D:\DanteInferno (ARPG isometrico three.js, offline, tema Divina Commedia).

Prima di toccare qualsiasi cosa leggi, in questo ordine, i file in
C:\Users\utente\Desktop\DanteInferno_per_proseguire\ :
00_LEGGIMI_PRIMA.md, 01_STATO.md, 02_ARCHITETTURA.md, 07_REGOLE_DI_LAVORO.md
(e 03, 04, 05, 06 quando ti servono).

Regole che valgono sempre:
- rispondi in italiano; sii onesto su ciò che non hai potuto verificare;
- main.js è condiviso con altre sessioni: solo modifiche piccole e mirate, mai riscritture;
- le funzioni nuove vanno in moduli separati che usano solo window.__game;
- dopo ogni modifica controlla la sintassi (copia .mjs + node --check);
- chiedi prima di scaricare file (nome, fonte, dimensione);
- verifica con screenshot nel browser di anteprima (avanza il gioco con __step e aspetta prima di fotografare).

Obiettivo di questa sessione: <SCRIVI QUI, per esempio: "aggiungi il Cerchio IV — Avari e Prodighi (Pluto)"
oppure "bilancia i cerchi II e III con il bot" oppure "prepara il gioco per l'open day (modalità chiosco)">.
```

## Varianti pronte dell'obiettivo
- **Contenuto**: "Aggiungi il Cerchio IV (Avari e Prodighi, boss Pluto) seguendo il modo in cui sono fatti i cerchi II e III: tabella in maps.js, tipi nemici, PACKS4, CINFO_, ENIGMAS, boss, ambiente."
- **Bilanciamento**: "Adatta tools/bot.js ai cerchi II e III e portali a: camere iniziali facili, camera 4 tesa (~30% vita minima), boss duro ma battibile con 0–2 morti."
- **Open day**: "Modalità chiosco: schermo intero, reset dopo 60 s di inattività, attract automatico, supporto gamepad, opzioni di qualità."
- **Online**: "Controlla licenza del rig Soldier, ricostruisci la cartella upload e provala in una sottocartella; correggi ciò che non va con la console."
- **Rifinitura**: "Prova a velocità reale scia della lama, rune e aure; riduci eventuale bloom eccessivo; aggiungi salvataggio e pausa."
