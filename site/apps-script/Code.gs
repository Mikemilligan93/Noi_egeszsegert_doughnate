/**
 * DOUGHNATE – statisztika és hírlevél-feliratkozások fogadása
 * ============================================================
 * Ezt a kódot a tartalmi Google Táblázathoz kell csatolni:
 *   Bővítmények → Apps Script → töröld a mintakódot → másold be ezt → Mentés.
 * Utána: Telepítés → Új telepítés → Típus: Webalkalmazás
 *   Végrehajtás mint: Én   |   Hozzáférés: Bárki
 * A kapott …/exec végű URL-t írd a config.js „statisztikaUrl” sorába.
 * Ha a kódot később módosítod: Telepítés → Telepítések kezelése → ceruza → Verzió: Új verzió
 * (így az URL nem változik).
 *
 * - Minden válasz és minden befejezett kör egy sor a „Statisztika” fülön.
 * - Minden hírlevél-feliratkozás egy sor a „Feliratkozok” fülön (ha nincs ilyen fül, a kód létrehozza).
 *   A Feliratkozok fület NE tedd közzé – személyes adatokat tartalmaz.
 * Ha a tablet offline, a sorokat később küldi el.
 */

var FUL = "Statisztika";
var FELIRATKOZOK_FUL = "Feliratkozok";
var FELIRATKOZOK_FEJLEC = ["idopont", "email", "nev", "hozzajarulas_szovege", "forras"];
var ESEMENYEK = { valasz: true, kor_vege: true };
var MAX_ESEMENY = 500;    // egy kérésben ennél többet nem fogadunk
var MAX_HOSSZ = 120;      // cellánkénti szöveghossz-korlát (statisztika)

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var adat = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    var lista = (adat.esemenyek || []).slice(0, MAX_ESEMENY);
    var sorok = [], feliratkozasok = [];
    for (var i = 0; i < lista.length; i++) {
      var ev = lista[i] || {};
      var ido = new Date(ev.idopont);
      if (isNaN(ido.getTime())) ido = new Date();
      if (ev.esemeny === "feliratkozas") {
        var email = String(ev.email || "").trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) continue;   // hibás cím: eldobjuk
        feliratkozasok.push([ido, tiszta(email, 254), tiszta(ev.nev, 120), tiszta(ev.hozzajarulas, 1000), tiszta(ev.forras, 40)]);
        continue;
      }
      if (!ESEMENYEK[ev.esemeny]) continue;            // ismeretlen esemény: eldobjuk
      sorok.push([
        ido,
        tiszta(ev.kor_azonosito),
        tiszta(ev.esemeny),
        tiszta(ev.elem_id),
        tiszta(ev.elem_tipus),
        tiszta(ev.valasz),
        tiszta(ev.helyes)
      ]);
    }
    var tabla = SpreadsheetApp.getActiveSpreadsheet();
    if (sorok.length) {
      var lap = tabla.getSheetByName(FUL);
      lap.getRange(lap.getLastRow() + 1, 1, sorok.length, 7).setValues(sorok);
    }
    if (feliratkozasok.length) {
      var fl = feliratkozokLap(tabla);
      fl.getRange(fl.getLastRow() + 1, 1, feliratkozasok.length, FELIRATKOZOK_FEJLEC.length).setValues(feliratkozasok);
    }
    return ContentService.createTextOutput("ok " + sorok.length + " / " + feliratkozasok.length);
  } catch (err) {
    return ContentService.createTextOutput("hiba: " + err);
  } finally {
    lock.releaseLock();
  }
}

// A „Feliratkozok” fül – ha még nincs, létrehozza a Statisztika fül mellett, fejléccel.
function feliratkozokLap(tabla) {
  var lap = tabla.getSheetByName(FELIRATKOZOK_FUL);
  if (lap) return lap;
  var stat = tabla.getSheetByName(FUL);
  lap = tabla.insertSheet(FELIRATKOZOK_FUL, stat ? stat.getIndex() : tabla.getSheets().length);
  lap.getRange(1, 1, 1, FELIRATKOZOK_FEJLEC.length).setValues([FELIRATKOZOK_FEJLEC]).setFontWeight("bold");
  lap.setFrozenRows(1);
  return lap;
}

// Böngészőből megnyitva jelzi, hogy a telepítés él.
function doGet() {
  return ContentService.createTextOutput("A Doughnate statisztika-fogadó működik.");
}

// Rövidítés + képlet-befecskendezés elleni védelem (=, +, -, @ kezdetű szöveg).
function tiszta(v, max) {
  var s = v == null ? "" : String(v).slice(0, max || MAX_HOSSZ);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}
