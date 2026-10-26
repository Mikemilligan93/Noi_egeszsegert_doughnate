/* Statisztika: események sorba állítása a tableten, küldés az Apps Scriptnek.
 * Internet nélkül a sor megmarad (localStorage), és visszatéréskor elküldi. */
(function () {
  const URL = (window.DOUGHNATE_CONFIG.statisztikaUrl || "").trim();
  const KULCS = "doughnate_stat_sor_v1";
  const MAX_SOR = 5000;          // ennyi küldetlen eseménynél a legrégebbiek elvesznek
  const CSOMAG = 200;            // egy kérésben legfeljebb ennyi esemény
  let memoria = [];              // ha a localStorage nem elérhető
  let kuldesFolyamatban = false;
  let utolsoKuldes = null, utolsoHiba = null;

  function olvas() {
    try { return JSON.parse(localStorage.getItem(KULCS) || "[]"); } catch (e) { return memoria; }
  }
  function ir(sor) {
    memoria = sor;
    try { localStorage.setItem(KULCS, JSON.stringify(sor)); } catch (e) { /* marad memóriában */ }
  }

  function rogzit(esemeny) {
    if (!URL) return;
    const sor = olvas();
    sor.push(Object.assign({ _id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8), idopont: new Date().toISOString() }, esemeny));
    while (sor.length > MAX_SOR) sor.shift();
    ir(sor);
    kuld();
  }

  async function kuld() {
    if (!URL || kuldesFolyamatban) return;
    let sor = olvas();
    if (!sor.length) return;
    kuldesFolyamatban = true;
    try {
      while (sor.length) {
        const csomag = sor.slice(0, CSOMAG);
        // text/plain + no-cors: nincs CORS-előkérés, az Apps Script így fogadja.
        await fetch(URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ esemenyek: csomag }) });
        // A kérés célba ért (no-cors miatt a választ nem látjuk). Csak a most elküldötteket töröljük.
        sor = olvas();
        const elkuldott = new Set(csomag.map(e => e._id));
        sor = sor.filter(e => !elkuldott.has(e._id));
        ir(sor);
        utolsoKuldes = new Date(); utolsoHiba = null;
      }
    } catch (err) {
      utolsoHiba = String(err && err.message || err);   // nincs net: marad a sorban
    } finally {
      kuldesFolyamatban = false;
    }
  }

  window.addEventListener("online", kuld);
  setInterval(kuld, 60 * 1000);

  function diagnosztika() {
    if (!URL) return "Statisztika: nincs beállítva (config.js → statisztikaUrl)";
    return `Statisztika: ${olvas().length} esemény vár küldésre` +
      (utolsoKuldes ? `, utolsó sikeres küldés: ${utolsoKuldes.toLocaleString("hu-HU")}` : "") +
      (utolsoHiba ? `\n   ! utolsó hiba: ${utolsoHiba}` : "");
  }

  window.DStat = { rogzit, kuld, diagnosztika, varakozik: () => olvas().length };
})();
