/**
 * DOUGHNATE – statisztika fogadása
 * =================================
 * Ezt a kódot a tartalmi Google Táblázathoz kell csatolni:
 *   Bővítmények → Apps Script → töröld a mintakódot → másold be ezt → Mentés.
 * Utána: Telepítés → Új telepítés → Típus: Webalkalmazás
 *   Végrehajtás mint: Én   |   Hozzáférés: Bárki
 * A kapott …/exec végű URL-t írd a config.js „statisztikaUrl” sorába.
 *
 * A játék minden válasz és minden befejezett kör után küld egy sort
 * a „Statisztika” fülre. Ha a tablet offline, a sorokat később küldi el.
 */

var FUL = "Statisztika";
var ESEMENYEK = { valasz: true, kor_vege: true };
var MAX_ESEMENY = 500;    // egy kérésben ennél többet nem fogadunk
var MAX_HOSSZ = 120;      // cellánkénti szöveghossz-korlát

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var adat = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    var lista = (adat.esemenyek || []).slice(0, MAX_ESEMENY);
    var sorok = [];
    for (var i = 0; i < lista.length; i++) {
      var ev = lista[i] || {};
      if (!ESEMENYEK[ev.esemeny]) continue;            // ismeretlen esemény: eldobjuk
      var ido = new Date(ev.idopont);
      if (isNaN(ido.getTime())) ido = new Date();
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
    if (sorok.length) {
      var lap = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FUL);
      lap.getRange(lap.getLastRow() + 1, 1, sorok.length, 7).setValues(sorok);
    }
    return ContentService.createTextOutput("ok " + sorok.length);
  } catch (err) {
    return ContentService.createTextOutput("hiba: " + err);
  } finally {
    lock.releaseLock();
  }
}

// Böngészőből megnyitva jelzi, hogy a telepítés él.
function doGet() {
  return ContentService.createTextOutput("A Doughnate statisztika-fogadó működik.");
}

// Rövidítés + képlet-befecskendezés elleni védelem (=, +, -, @ kezdetű szöveg).
function tiszta(v) {
  var s = v == null ? "" : String(v).slice(0, MAX_HOSSZ);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}
