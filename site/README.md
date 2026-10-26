# Doughnate kioszk – endometriózis játék

Egyszerű, érintőképernyős tájékoztató játék az „Együtt könnyebb” Női Egészségért Alapítvány számára. A Mito Doughnate süteményvásáron egy iPaden fut, amíg a kollégák sorban állnak.

- **Nincs szerver.** Az oldal statikus, a GitHub Pages ingyen kiszolgálja.
- **Minden szöveg egy Google Táblázatban van.** Kódot nem kell írni ahhoz, hogy új kártyát, tényt vagy QR-kódot tegyél be.
- **Internet nélkül is megy.** Az utoljára betöltött tartalommal fut tovább, a statisztikát pedig később küldi el.

---

## 1. Mi hol van?

| Fájl / mappa | Mire való | Ki szerkeszti? |
| --- | --- | --- |
| `config.js` | **Az egyetlen beállítófájl:** a táblázat linkjei, a statisztika URL-je, a húzás iránya, színek, logók. | Aki átveszi a projektet |
| `content/alap_tartalom.js` | Beépített alaptartalom arra az esetre, ha a táblázat még sosem töltődött be. Jelenleg a `Doughnate_tartalom.xlsx` (2026. 10. 26.) tartalma. | Ritkán |
| `assets/` | Ide jönnek a logók (SVG vagy PNG). | Aki átveszi |
| `vendor/fonts/` | A betűtípusok fájljai (Playfair Display, Montserrat). | – |
| `tools/xlsx_to_alap.py` | A kitöltött xlsx-ből újragenerálja a beépített alaptartalmat: `python3 tools/xlsx_to_alap.py Doughnate_tartalom.xlsx content/alap_tartalom.js` (openpyxl kell hozzá). | Fejlesztő, ritkán |
| `apps-script/Code.gs` | A statisztikát fogadó kód (a Google Táblázatba kell bemásolni). | Egyszer, beállításkor |
| `index.html`, `styles.css`, `js/`, `vendor/` | Maga a játék. | Fejlesztő |

A **tartalmat** (kártyák, csúszkák, tények, feliratok, QR-linkek, időzítések) **mindig a Google Táblázatban** szerkeszd, ne a fájlokban.

---

## 2. A Google Táblázat beállítása (egyszer kell)

1. Nyiss egy új, üres Google Táblázatot.
2. **Fájl → Importálás → Feltöltés** → válaszd ki a `Doughnate_tartalom_sablon.xlsx` fájlt → **Táblázat lecserélése**.
3. Olvasd el az **Utmutato** fület. Az első sor oszlopneveit ne írd át!
4. **Fájl → Megosztás → Közzététel az interneten.**
   - Bal oldalt válaszd ki a fület (pl. *Kartyak*), jobb oldalt a formátumot: **Vesszővel tagolt értékek (.csv)** → **Közzététel**.
   - Másold ki a kapott linket.
   - Ismételd meg ezt a következő 6 fülre: **Kartyak, Csuszkak, Tenyek, Feliratok, Zaro, Beallitasok**.
   - A **Statisztika**, **Osszesites** és **Utmutato** fület **ne** tedd közzé.
5. A 6 linket írd be a `config.js` fájl `tablazat` részébe, a megfelelő fülnév mellé, idézőjelek közé:

```js
tablazat: {
  Kartyak:     "https://docs.google.com/spreadsheets/d/e/…/pub?gid=…&single=true&output=csv",
  Csuszkak:    "https://docs.google.com/…",
  …
},
```

**Mennyi idő, míg egy változás megjelenik?** Kb. 5–10 perc: a Google is tárolja egy ideig a közzétett változatot, a játék pedig a *Beallitasok* fül `tartalom_frissites` értéke szerint (alapból 5 percenként) olvassa újra. Az új tartalom mindig a következő kör elején lép életbe, kör közben nem.

**Hibás sor:** a játék kihagyja, nem omlik össze. Hogy mit hagyott ki és miért, a rejtett diagnosztikai képernyőn látod (lásd 6. pont).

---

## 3. Statisztika beállítása (egyszer kell)

A játék minden válasz és minden befejezett kör után ír egy sort a táblázat **Statisztika** fülére. Az **Osszesites** fül ebből számolja a köröket, a helyes válaszok arányát és a leggyakrabban elhibázott kártyákat.

1. A tartalmi táblázatban: **Bővítmények → Apps Script**.
2. Töröld a mintakódot, és másold be az `apps-script/Code.gs` fájl teljes tartalmát. **Mentés** (lemez ikon).
3. **Telepítés → Új telepítés** → fogaskerék → **Webalkalmazás**.
   - Végrehajtás mint: **Én**
   - Hozzáférés: **Bárki**
   - **Telepítés** → engedélyezd a hozzáférést a Google-fiókoddal.
4. Másold ki a **…/exec** végű URL-t, és írd a `config.js` fájl `statisztikaUrl` sorába.
5. Próba: nyisd meg az URL-t böngészőben. Ezt kell látnod: *„A Doughnate statisztika-fogadó működik.”*

> **Ha később módosítod a Code.gs-t:** Telepítés → Telepítések kezelése → ceruza → Verzió: *Új verzió* → Telepítés. Így az URL nem változik.

> **Tudnivaló:** az URL a nyilvános kódban szerepel, így elvileg bárki küldhet bele szemét sorokat. Ezt alacsony kockázatnak tekintettük; a kód csak a két ismert eseménytípust fogadja, és levágja a túl hosszú szövegeket.

---

## 4. Közzététel a GitHub Pages-en

1. Hozz létre egy **nyilvános** repót a GitHubon (az ingyenes Pages-hez nyilvános repó kell; titok nincs a kódban).
2. Töltsd fel a mappa teljes tartalmát (`index.html` a repó gyökerében legyen). A böngészős felületen: **Add file → Upload files** → húzd be a fájlokat és mappákat → **Commit changes**.
3. **Settings → Pages** → Source: **Deploy from a branch** → Branch: **main**, mappa: **/ (root)** → **Save**.
4. Pár perc múlva megjelenik a cím, pl. `https://<felhasznalonev>.github.io/<repo-nev>/`. Ezt nyisd meg az iPaden.

Ha a `config.js`-t módosítod, töltsd fel újra (ugyanígy, felülírva). A tableten zárd be és nyisd újra az oldalt.

---

## 5. Az iPad előkészítése

1. **Képernyőzár kikapcsolása:** Beállítások → Kijelző és fényerő → Automatikus zárolás → **Soha**.
2. Nyisd meg az oldalt a böngészőben, és várd meg, hogy betöltse a táblázatot (a diagnosztikán ellenőrizhető).
3. **Irányított hozzáférés (Guided Access)** – ez zárja be a játékot, hogy ne lehessen kilépni:
   - Beállítások → Kisegítő lehetőségek → **Irányított hozzáférés** → bekapcsol. Állíts be jelkódot.
   - Nyisd meg a játékot, és **nyomd meg háromszor** a felső (vagy Kezdőlap) gombot → **Indítás**.
   - Az indítóképernyőn bekarikázhatod a böngésző címsorát, így az nem lesz érinthető.
   - Kilépés: háromszor a gomb → jelkód → **Vége**.
4. Próbáld ki **álló és fekvő** helyzetben is.

**Tipp:** a Chrome iPaden is a Safari motorját használja, ezért nincs valódi teljes képernyős mód; a zárolást az Irányított hozzáférés adja. Ha a címsor zavar, a megosztás menüből a **Főképernyőhöz adás** címsor nélküli ablakban nyitja meg az oldalt (ilyenkor a tartalom-gyorsítótár külön épül fel, ezért előtte legyen internet).

---

## 6. Rejtett diagnosztika

A **kezdőképernyő bal felső sarkát 5-ször gyorsan megérintve** (3 mp-en belül) megnyílik egy fekete ablak:

- melyik fül honnan jött: **TÁBLÁZAT** (friss), **GYORSÍTÓTÁR** (utolsó jó változat), **BEÉPÍTETT ALAP**;
- mely sorokat hagyta ki a játék, és miért;
- hány statisztikai sor vár küldésre;
- gombok: *Tartalom frissítése most*, *Statisztika küldése most*, *Bezárás*.

Kikapcsolható: `config.js` → `rendszer.diagnosztika: false`.

---

## 7. Mit hol állíts?

| Mit szeretnél? | Hol? |
| --- | --- |
| Új kártya, csúszka, forgó tény | Táblázat: *Kartyak / Csuszkak / Tenyek* |
| Kártya elrejtése | Táblázat: `aktiv` = **NEM** (törlés helyett) |
| Gombfeliratok, címek, záró szöveg | Táblázat: *Feliratok* (üres = beépített alapszöveg) |
| Új QR-kód (pl. podcast) | Táblázat: *Zaro* – új sor, `aktiv` = IGEN, `url` https://-sel |
| Hány kártya / csúszka egy körben, időzítések | Táblázat: *Beallitasok* |
| Húzás iránya (jobbra = Tény vagy Tévhit) | `config.js` → `huzasIrany` |
| Színek, betűk, logók, rendezvény neve, a cím fölötti kis felirat | `config.js` → `marka` (a kinézet az alapítvány honlapját követi) |
| Sárga ecsetvonásos aláhúzás a nagy címben | Táblázat: *Feliratok* → `vonzo_cim` / `zaro_cim`: tedd a kiemelendő szót csillagok közé, pl. `Mennyit tudsz az *endometriózisról*?` |
| Táblázat-linkek, statisztika URL | `config.js` |

---

## 8. Gyakori hibák

| Tünet | Ok és megoldás |
| --- | --- |
| A táblázatban végzett módosítás sosem jelenik meg, a diagnosztika „BEÉPÍTETT ALAP”-ot mutat | Nincs (jó) link a `config.js`-ben, vagy nincs egyetlen aktív, hibátlan kártya sem a táblázatban. Nézd meg a diagnosztikát. |
| Diagnosztika: „nem CSV (HTML jött)” | A fül nincs közzétéve, vagy nem CSV formátumban. Ismételd meg a 2/4. lépést. |
| Diagnosztika: „hiányzó oszlop(ok)” | Átírták vagy törölték az első sor egyik oszlopnevét. Állítsd vissza a sablon szerint. |
| A módosítás nem jelenik meg | Várj 5–10 percet, vagy használd a diagnosztika *Tartalom frissítése most* gombját. Kör közben nem frissül. |
| Nem jönnek sorok a Statisztika fülre | Ellenőrizd az URL-t (…/exec), a telepítés „Bárki” hozzáférését, és hogy a fül neve pontosan *Statisztika*. |

---

## 9. Tartalmi határok (emlékeztető)

A játék tájékoztat, **nem diagnosztizál**. A *normalis_orvos* kártyák alatt mindig megjelenik az `orvos_lablec` felirat (nőgyógyász + szakorvos-lista). Gyógyszernév és adagolás nem kerülhet bele; étrendi állítás csak „a Kisokos szerint” kerettel; gyerekek is jelen lehetnek, ezért a szexualitásról csak általános szinten.

---

*Külső kód és betű:* `vendor/qrcode.js` – QR Code Generator for JavaScript, © Kazuhiko Arase, MIT-licenc. `vendor/fonts/` – Playfair Display és Montserrat betűtípus, SIL Open Font License 1.1 (helyben tárolva, internet nélkül is betöltenek).
