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
 *
 * A tablet csak akkor törli a nála várakozó sorokat, ha ez a kód „ok …” választ ad. Hiba esetén („hiba: …”)
 * megtartja és később újraküldi őket – a kétszer megérkező sorokat az azonosítójuk alapján kiszűrjük.
 */

var FUL = "Statisztika";
var FELIRATKOZOK_FUL = "Feliratkozok";
var STATISZTIKA_FEJLEC = ["idopont", "kor_azonosito", "esemeny", "elem_id", "elem_tipus", "valasz", "helyes"];
var FELIRATKOZOK_FEJLEC = ["idopont", "email", "nev", "hozzajarulas_szovege", "forras"];
var ESEMENYEK = { valasz: true, kor_vege: true };
var MAX_ESEMENY = 500;    // egy kérésben ennél többet nem fogadunk
var MAX_HOSSZ = 120;      // cellánkénti szöveghossz-korlát (statisztika)

function doPost(e) {
  var lock = LockService.getScriptLock();
  var zarolva = false;
  try {
    lock.waitLock(20000);
    zarolva = true;
    var adat = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    var lista = (adat.esemenyek || []).slice(0, MAX_ESEMENY);
    var latott = marLatott(lista);
    var sorok = [], feliratkozasok = [], ujAzonositok = {};
    for (var i = 0; i < lista.length; i++) {
      var ev = lista[i] || {};
      var az = azonosito(ev);
      if (az) {
        if (latott[az] || ujAzonositok[az]) continue;   // ezt a sort egyszer már beírtuk (újraküldés)
        ujAzonositok[az] = "1";
      }
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
    // Előbb a feliratkozások (ezek a fontosabbak), utána a statisztika.
    if (feliratkozasok.length) {
      var fl = feliratkozokLap(tabla);
      fl.getRange(fl.getLastRow() + 1, 1, feliratkozasok.length, FELIRATKOZOK_FEJLEC.length).setValues(feliratkozasok);
    }
    if (sorok.length) {
      var lap = statisztikaLap(tabla);
      lap.getRange(lap.getLastRow() + 1, 1, sorok.length, STATISZTIKA_FEJLEC.length).setValues(sorok);
    }
    megjegyez(ujAzonositok);
    return ContentService.createTextOutput("ok " + sorok.length + " / " + feliratkozasok.length);
  } catch (err) {
    return ContentService.createTextOutput("hiba: " + err);
  } finally {
    if (zarolva) lock.releaseLock();
  }
}

// Újraküldés elleni védelem: a tablet minden eseményhez egyedi azonosítót (_id) küld. A már beírtakat 6 óráig
// megjegyezzük (ennél tovább a gyorsítótár nem őriz), így ha egy válasz elveszik és a tablet újraküldi, nem lesz dupla sor.
function azonosito(ev) {
  var id = ev && ev._id;
  return (typeof id === "string" && /^[a-z0-9]{6,40}$/.test(id)) ? "d_" + id : "";
}
function marLatott(lista) {
  var kulcsok = [];
  for (var i = 0; i < lista.length; i++) { var az = azonosito(lista[i]); if (az) kulcsok.push(az); }
  try { return kulcsok.length ? CacheService.getScriptCache().getAll(kulcsok) : {}; } catch (err) { return {}; }
}
function megjegyez(azonositok) {
  try { if (Object.keys(azonositok).length) CacheService.getScriptCache().putAll(azonositok, 21600); } catch (err) { /* nem baj */ }
}

// A „Statisztika” fül – ha hiányzik (pl. átnevezték), létrehozza fejléccel, hogy a sorok ne vesszenek el.
function statisztikaLap(tabla) {
  var lap = tabla.getSheetByName(FUL);
  if (lap) return lap;
  lap = tabla.insertSheet(FUL, tabla.getSheets().length);
  lap.getRange(1, 1, 1, STATISZTIKA_FEJLEC.length).setValues([STATISZTIKA_FEJLEC]).setFontWeight("bold");
  lap.setFrozenRows(1);
  return lap;
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
