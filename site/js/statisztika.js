/* Statisztika: események sorba állítása a tableten, küldés az Apps Scriptnek.
 * Internet nélkül a sor megmarad (localStorage), és visszatéréskor elküldi.
 * Egy eseményt csak akkor törlünk a tabletről, ha a fogadó visszaigazolta („ok …” válasz). */
(function () {
  const URL = (window.DOUGHNATE_CONFIG.statisztikaUrl || "").trim();
  const KULCS = "doughnate_stat_sor_v1";
  const MAX_SOR = 5000;          // ennyi küldetlen eseménynél a legrégebbiek elvesznek
  const CSOMAG = 200;            // egy kérésben legfeljebb ennyi esemény
  const IDOKORLAT = 20000;       // ennyi ms után feladjuk a kérést (különben egy beragadt kérés minden további küldést megakasztana)
  let kuldesFolyamatban = false;
  let utolsoKuldes = null, utolsoHiba = null, mentesHiba = false;

  // A sor a memóriában él (induláskor egyszer olvassuk be), és minden változáskor kiírjuk.
  // Így akkor sem vész el esemény, ha a localStorage megtelt vagy tiltott – csak újratöltésig él.
  let sor = [];
  try { const t = JSON.parse(localStorage.getItem(KULCS) || "[]"); if (Array.isArray(t)) sor = t; } catch (e) { /* üres sorral indulunk */ }
  function ment() {
    try { localStorage.setItem(KULCS, JSON.stringify(sor)); mentesHiba = false; } catch (e) { mentesHiba = true; }
  }

  // Hírlevél-feliratkozás: személyes adat, ezért sosem dobjuk el, és akkor is eltesszük, ha még nincs
  // beállítva a statisztika URL-je (amint beállítják, elküldi). A sima statisztika URL nélkül nem gyűlik.
  const feliratkozas = e => e.esemeny === "feliratkozas";
  function rogzit(esemeny) {
    if (!URL && !feliratkozas(esemeny)) return;
    sor.push(Object.assign({ _id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8), idopont: new Date().toISOString() }, esemeny));
    // túl hosszú sornál a legrégebbi statisztikai események esnek ki, a feliratkozások soha
    while (sor.length > MAX_SOR) { const i = sor.findIndex(e => !feliratkozas(e)); if (i < 0) break; sor.splice(i, 1); }
    ment();
    kuld();
  }

  // Egy csomag elküldése. Az Apps Script válasza olvasható (text/plain kérés: nincs CORS-előkérés,
  // a válasz Access-Control-Allow-Origin: * fejléccel jön), így látjuk, hogy tényleg beírta-e a sorokat.
  async function csomagKuldes(csomag) {
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const t = setTimeout(() => ctrl && ctrl.abort(), IDOKORLAT);
    try {
      const res = await fetch(URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ esemenyek: csomag }), signal: ctrl ? ctrl.signal : undefined });
      const valasz = (await res.text()).trim();
      if (!res.ok) throw new Error("HTTP " + res.status);
      if (!/^ok\b/.test(valasz))
        throw new Error(/^\s*</.test(valasz) ? "a fogadó HTML-oldalt adott vissza (a telepítés hozzáférése „Bárki”?)" : "a fogadó hibát jelzett: " + valasz.slice(0, 160));
    } finally { clearTimeout(t); }
  }

  async function kuld() {
    if (!URL || kuldesFolyamatban || !sor.length) return;
    kuldesFolyamatban = true;
    try {
      while (sor.length) {
        const csomag = sor.slice(0, CSOMAG);
        await csomagKuldes(csomag);
        // Visszaigazolva: csak a most elküldötteket töröljük (közben újak is érkezhettek).
        const elkuldott = new Set(csomag.map(e => e._id));
        sor = sor.filter(e => !elkuldott.has(e._id));
        ment();
        utolsoKuldes = new Date(); utolsoHiba = null;
      }
    } catch (err) {
      // nincs net / időtúllépés / a fogadó hibát jelzett: minden marad a sorban, később újra próbáljuk
      utolsoHiba = err && err.name === "AbortError" ? "időtúllépés"
        : err instanceof TypeError ? "a fogadó nem érhető el (nincs internet, vagy a telepítés hozzáférése nem „Bárki”) – " + err.message
        : String(err && err.message || err);
    } finally {
      kuldesFolyamatban = false;
    }
  }

  window.addEventListener("online", kuld);
  setInterval(kuld, 60 * 1000);

  function diagnosztika() {
    const fel = sor.filter(feliratkozas).length;
    const tarolo = mentesHiba ? "\n   ! a tablet tárolója nem írható – a várakozó sor csak az oldal újratöltéséig marad meg" : "";
    if (!URL) return "Statisztika: nincs beállítva (config.js → statisztikaUrl)" +
      (fel ? `\n   ! ${fel} hírlevél-feliratkozás vár a tableten – állítsd be a statisztikaUrl-t, hogy elküldje` : "") + tarolo;
    return `Statisztika: ${sor.length} esemény vár küldésre (ebből ${fel} hírlevél-feliratkozás)` +
      (utolsoKuldes ? `, utolsó visszaigazolt küldés: ${utolsoKuldes.toLocaleString("hu-HU")}` : "") +
      (utolsoHiba ? `\n   ! utolsó hiba: ${utolsoHiba}` : "") + tarolo;
  }

  window.DStat = { rogzit, kuld, diagnosztika, varakozik: () => sor.length };
})();
