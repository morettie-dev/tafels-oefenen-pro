Tafels Oefenen Pro — PWA pakket
=====================================

Inhoud
------
- tafels-oefenen-pro.html
- style.css
- app.js
- manifest.json
- sw.js
- icon-192.png
- icon-512.png
- ok.wav
- no.wav

Installatie (lokaal testen)
---------------------------
1. Plaats alle bestanden in dezelfde map.
2. Start een lokale webserver (BELANGRIJK: service workers werken niet vanaf file://).
   - Python 3: open een terminal in de map en voer uit:
     * Windows/macOS/Linux: `python -m http.server 8080`
   - Ga naar: http://localhost:8080/tafels-oefenen-pro.html

Publiceren (aanbevolen)
-----------------------
1. Publiceer de map op een HTTPS-domein (GitHub Pages, Netlify, Vercel, …).
2. Open de URL op de Android-tablet van Daley in **Chrome**.
3. Kies **⋮ → Installeren** (of **Toevoegen aan startscherm**).
4. De app staat nu als icoon op het beginscherm en werkt offline.

Optioneel
---------
- `ROBLOX_USER_ID` in `app.js` op een numerieke userId zetten om de avatar te tonen.
- Geluid uitzetten kan via de checkbox "Geluid uit?" in het welkomstscherm.

Veel plezier! 🎉
