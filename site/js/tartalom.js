/* Tartalom betöltése: Google Táblázat (CSV) → ellenőrzés → gyorsítótár → beépített alap. */
(function () {
  const CFG = window.DOUGHNATE_CONFIG;
  const ALAP = window.DOUGHNATE_ALAP;
  const TAROLO_KULCS = "doughnate_tartalom_v1";
  const FULEK = ["Kartyak", "Csuszkak", "Tenyek", "Feliratok", "Zaro", "Beallitasok"];

  const KOTELEZO_OSZLOP = {
    Kartyak:     ["id", "aktiv", "tipus", "allitas", "helyes_valasz", "magyarazat"],
    Csuszkak:    ["id", "aktiv", "kerdes", "min", "max", "lepes", "helyes_ertek", "tures", "magyarazat"],
    Tenyek:      ["id", "aktiv", "szoveg"],
    Feliratok:   ["kulcs", "szoveg"],
    Zaro:        ["id", "aktiv", "url"],
    Beallitasok: ["kulcs", "ertek"]
  };

  const VALASZOK = { teny_tevhit: ["TENY", "TEVHIT"], normalis_orvos: ["NORMALIS", "ORVOS"] };

  // Beállítások: alapérték és elfogadott tartomány
  const BEALLITAS_HATAR = {
    kartyak_szama: [0, 30], csuszkak_szama: [0, 10], magyarazat_ido: [2, 60],
    tetlenseg_ido: [5, 300], tetlenseg_visszaszamlalas: [3, 120], zarokepernyo_ido: [5, 600],
    teny_valtas_ido: [2, 120], tartalom_frissites: [1, 120]
  };

  // Ha egy kulcs a táblázatból és a beépített alapból is hiányzik, ezzel fut a játék (különben NaN időzítés lenne).
  const BEALLITAS_ALAP = {
    kartyak_szama: 6, csuszkak_szama: 1, magyarazat_ido: 6, tetlenseg_ido: 20, tetlenseg_visszaszamlalas: 10,
    zarokepernyo_ido: 45, teny_valtas_ido: 7, tartalom_frissites: 5
  };

  /* --- segédek --- */
  function szam(s) {
    if (typeof s === "number") return isFinite(s) ? s : null;
    if (s == null) return null;
    const t = String(s).replace(/[\s  ]/g, "").replace(",", ".");
    if (t === "" || !/^-?\d*\.?\d+$/.test(t)) return null;
    return Number(t);
  }
  const nagy = s => String(s || "").trim().toUpperCase();
  const aktiv = r => nagy(r.aktiv) === "IGEN";
  // Ugyanaz az id kétszer: a második sort kihagyjuk (összekeverné a statisztikát és az ismétlés-kerülést).
  const ismetlodo = (lattuk, id) => { if (lattuk.has(id)) return true; lattuk.add(id); return false; };

  /* --- fülenkénti ellenőrzés: { elemek, kihagyott:[{id,sor,ok}] } --- */
  const ellenoriz = {
    Kartyak(sorok) {
      const elemek = [], kihagyott = [], lattuk = new Set();
      for (const r of sorok) {
        if (!aktiv(r)) continue;
        const tipus = String(r.tipus || "").trim().toLowerCase();
        const valasz = nagy(r.helyes_valasz);
        let ok = null;
        if (!r.id) ok = "hiányzó id";
        else if (!r.allitas) ok = "hiányzó állítás";
        else if (!VALASZOK[tipus]) ok = "ismeretlen típus";
        else if (!VALASZOK[tipus].includes(valasz)) ok = "a helyes válasz nem illik a típushoz";
        else if (ismetlodo(lattuk, r.id)) ok = "ismétlődő id";
        if (ok) { kihagyott.push({ ful: "Kartyak", id: r.id || "?", sor: r._sor, ok }); continue; }
        elemek.push({ id: r.id, tipus, allitas: r.allitas, helyes: valasz, magyarazat: r.magyarazat || "", forras: r.forras || "" });
      }
      return { elemek, kihagyott };
    },
    Csuszkak(sorok) {
      const elemek = [], kihagyott = [], lattuk = new Set();
      for (const r of sorok) {
        if (!aktiv(r)) continue;
        const min = szam(r.min), max = szam(r.max), lepes = szam(r.lepes), helyes = szam(r.helyes_ertek);
        let tures = r.tures === "" || r.tures == null ? 0 : szam(r.tures);
        let ok = null;
        if (!r.id) ok = "hiányzó id";
        else if (!r.kerdes) ok = "hiányzó kérdés";
        else if ([min, max, lepes, helyes, tures].some(v => v === null)) ok = "nem szám érték";
        else if (!(max > min) || !(lepes > 0) || tures < 0) ok = "hibás min/max/lépés/tűrés";
        else if (helyes < min || helyes > max) ok = "a helyes érték a min–max tartományon kívül esik";
        else if (ismetlodo(lattuk, r.id)) ok = "ismétlődő id";
        if (ok) { kihagyott.push({ ful: "Csuszkak", id: r.id || "?", sor: r._sor, ok }); continue; }
        elemek.push({ id: r.id, tipus: "csuszka", kerdes: r.kerdes, min, max, lepes, helyes, tures,
          egyseg: r.mertekegyseg || "", magyarazat: r.magyarazat || "", forras: r.forras || "" });
      }
      return { elemek, kihagyott };
    },
    Tenyek(sorok) {
      const elemek = [], kihagyott = [], lattuk = new Set();
      for (const r of sorok) {
        if (!aktiv(r)) continue;
        if (!r.id || !r.szoveg) { kihagyott.push({ ful: "Tenyek", id: r.id || "?", sor: r._sor, ok: !r.id ? "hiányzó id" : "hiányzó szöveg" }); continue; }
        if (ismetlodo(lattuk, r.id)) { kihagyott.push({ ful: "Tenyek", id: r.id, sor: r._sor, ok: "ismétlődő id" }); continue; }
        elemek.push({ id: r.id, kiemeles: r.kiemeles || "", szoveg: r.szoveg, forras: r.forras || "" });
      }
      return { elemek, kihagyott };
    },
    Feliratok(sorok) {
      const elemek = {};
      for (const r of sorok) {
        const k = String(r.kulcs || "").trim();
        if (k && r.szoveg) elemek[k] = r.szoveg;
      }
      return { elemek, kihagyott: [] };
    },
    Zaro(sorok) {
      const elemek = [], kihagyott = [];
      for (const r of sorok) {
        if (!aktiv(r)) continue;
        const url = String(r.url || "").trim();
        if (!r.id || !/^https:\/\/\S+$/i.test(url)) {
          kihagyott.push({ ful: "Zaro", id: r.id || "?", sor: r._sor, ok: !r.id ? "hiányzó id" : "hibás url (https:// kell)" }); continue;
        }
        const s = szam(r.sorrend);
        elemek.push({ id: r.id, sorrend: s === null ? 999 : s, cim: r.cim || "", leiras: r.leiras || "", url, kiemelt: r.kiemelt_szoveg || "" });
      }
      elemek.sort((a, b) => a.sorrend - b.sorrend);
      return { elemek, kihagyott };
    },
    Beallitasok(sorok) {
      const elemek = {}, kihagyott = [];
      for (const r of sorok) {
        const k = String(r.kulcs || "").trim();
        if (!BEALLITAS_HATAR[k]) continue;
        const v = szam(r.ertek);
        const [lo, hi] = BEALLITAS_HATAR[k];
        if (v === null || v < lo || v > hi) { kihagyott.push({ ful: "Beallitasok", id: k, sor: r._sor, ok: `érvénytelen érték (${lo}–${hi})` }); continue; }
        elemek[k] = v;
      }
      return { elemek, kihagyott };
    }
  };

  // Mikor fogadjuk el a táblázatból jött fület? (különben marad az előző/alap)
  function elfogadhato(ful, eredmeny) {
    if (ful === "Kartyak") return eredmeny.elemek.length > 0;
    return true;
  }

  /* --- beépített alap ellenőrzése ugyanazzal a szabállyal --- */
  function alapFul(ful) {
    if (ful === "Feliratok") return { elemek: {}, kihagyott: [] }; // az alap feliratok külön, összefésüléskor
    if (ful === "Beallitasok") return { elemek: {}, kihagyott: [] };
    return ellenoriz[ful](ALAP[ful].map((r, i) => Object.assign({ _sor: i + 2 }, r)));
  }

  /* --- gyorsítótár (localStorage, try/catch: privát módban dobhat) --- */
  function cacheOlvas() {
    try { return JSON.parse(localStorage.getItem(TAROLO_KULCS) || "null") || {}; } catch (e) { return {}; }
  }
  function cacheIr(c) {
    try { localStorage.setItem(TAROLO_KULCS, JSON.stringify(c)); } catch (e) { /* tele / tiltott */ }
  }

  /* --- állapot --- */
  const allapot = {};   // ful -> { elemek, kihagyott, forras: "tablazat"|"gyorsitotar"|"alap", ido }
  let utolsoProba = null, utolsoHiba = {};

  const link = f => String((CFG.tablazat && CFG.tablazat[f]) || "").trim();
  function kezdoAllapot() {
    const c = cacheOlvas();
    for (const f of FULEK) {
      // A gyorsítótár csak ahhoz a linkhez érvényes, amelyikről készült: ha a config.js-ből kivették vagy
      // kicserélték a linket, nem a régi táblázat megjegyzett tartalma fut tovább, hanem a beépített alap.
      const ervenyes = link(f) && c[f] && c[f].elemek && (!c[f].url || c[f].url === link(f));
      if (ervenyes) allapot[f] = { elemek: c[f].elemek, kihagyott: c[f].kihagyott || [], forras: "gyorsitotar", ido: c[f].ido };
      else allapot[f] = Object.assign(alapFul(f), { forras: "alap", ido: null });
    }
  }

  async function letolt(url) {
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const t = setTimeout(() => ctrl && ctrl.abort(), 12000);
    try {
      const sep = url.includes("?") ? "&" : "?";
      const res = await fetch(url + sep + "_t=" + Date.now(), { cache: "no-store", signal: ctrl ? ctrl.signal : undefined });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const text = await res.text();
      if (/^\s*</.test(text)) throw new Error("nem CSV (HTML jött – közzé van téve a fül?)");
      return text;
    } finally { clearTimeout(t); }
  }

  async function frissit() {
    utolsoProba = new Date();
    const c = cacheOlvas();
    let valtozott = false;
    await Promise.all(FULEK.map(async f => {
      const url = link(f);
      if (!url) return;
      try {
        const { fejlec, sorok } = window.DCSV.csvToObjects(await letolt(url));
        const hianyzo = KOTELEZO_OSZLOP[f].filter(k => !fejlec.includes(k));
        if (hianyzo.length) throw new Error("hiányzó oszlop(ok): " + hianyzo.join(", "));
        const e = ellenoriz[f](sorok);
        if (!elfogadhato(f, e)) throw new Error("nincs egyetlen érvényes, aktív sor sem");
        const ido = new Date().toISOString();
        allapot[f] = { elemek: e.elemek, kihagyott: e.kihagyott, forras: "tablazat", ido };
        c[f] = { elemek: e.elemek, kihagyott: e.kihagyott, ido, url };
        valtozott = true;
        delete utolsoHiba[f];
      } catch (err) {
        utolsoHiba[f] = String(err && err.message || err);
        if (allapot[f].forras === "tablazat") allapot[f].forras = "gyorsitotar";
      }
    }));
    if (valtozott) cacheIr(c);
  }

  /* --- a játék által használt, összefésült nézet --- */
  /* Feliratok, amelyek (még) nincsenek a tartalmi táblázatban – a kód alapértékei.
   * Ha a táblázat Feliratok fülére felveszel egy ilyen kulcsú sort, az felülírja. */
  const KODBAN_ALAP_FELIRATOK = {
    huzas_tipp_billentyu:      "Húzd a kártyát, kattints a gombokra, vagy használd a ← → billentyűket.",
    hirlevel_gomb_vonzo:       "Feliratkozás a hírlevélre",
    hirlevel_gomb_zaro:        "Feliratkozom a hírlevélre",
    hirlevel_cim:              "Ne maradj le arról, ami *számít*!",
    hirlevel_szoveg:           "Újdonságok, kutatások, podcastok, események – minden, ami az endometriózissal és a női egészséggel kapcsolatban fontos. Add meg az e-mail-címed, a többit mi intézzük.",
    hirlevel_email_cimke:      "E-mail-cím",
    hirlevel_nev_cimke:        "Név (nem kötelező)",
    hirlevel_hozzajarulas:     "[TERVEZET – az alapítvány pontosítja] Hozzájárulok, hogy az „Együtt könnyebb” Női Egészségért Alapítvány a megadott e-mail-címre hírlevelet küldjön. A hozzájárulásomat bármikor visszavonhatom.",
    hirlevel_adatkezeles:      "[TERVEZET – az alapítvány pontosítja] Az adatkezelő az „Együtt könnyebb” Női Egészségért Alapítvány. Az adatokat kizárólag hírlevélküldésre használjuk, harmadik félnek nem adjuk át. Részletek: endometriozismagyarorszag.hu",
    hirlevel_kuldes:           "Feliratkozom",
    hirlevel_megse:            "Mégsem",
    hirlevel_koszonet_cim:     "Köszönjük!",
    hirlevel_koszonet_szoveg:  "A feliratkozásodat rögzítettük. Hamarosan jelentkezünk.",
    hirlevel_hiba_email:       "Kérjük, adj meg egy érvényes e-mail-címet.",
    hirlevel_hiba_hozzajarulas: "A feliratkozáshoz kérjük, fogadd el a hozzájárulást."
  };

  function aktualis() {
    const feliratok = Object.assign({}, KODBAN_ALAP_FELIRATOK, ALAP.Feliratok, allapot.Feliratok.elemek);
    const beallitasok = Object.assign({}, BEALLITAS_ALAP);
    // a beépített alapból csak az érvényes számokat vesszük át
    for (const k in BEALLITAS_HATAR) { const v = szam((ALAP.Beallitasok || {})[k]); if (v !== null && v >= BEALLITAS_HATAR[k][0] && v <= BEALLITAS_HATAR[k][1]) beallitasok[k] = v; }
    Object.assign(beallitasok, allapot.Beallitasok.elemek);
    return {
      kartyak: allapot.Kartyak.elemek,
      csuszkak: allapot.Csuszkak.elemek,
      tenyek: allapot.Tenyek.elemek,
      zaro: allapot.Zaro.elemek,
      feliratok, beallitasok
    };
  }

  function diagnosztika() {
    const sorok = [];
    sorok.push("Utolsó frissítési kísérlet: " + (utolsoProba ? utolsoProba.toLocaleString("hu-HU") : "–"));
    for (const f of FULEK) {
      const a = allapot[f];
      const db = Array.isArray(a.elemek) ? a.elemek.length + " elem" : Object.keys(a.elemek).length + " kulcs";
      const forras = { tablazat: "TÁBLÁZAT", gyorsitotar: "GYORSÍTÓTÁR", alap: "BEÉPÍTETT ALAP" }[a.forras];
      sorok.push(`${f.padEnd(12)} ${forras.padEnd(15)} ${db}` + (a.ido ? "  (" + new Date(a.ido).toLocaleString("hu-HU") + ")" : "") +
        (!link(f) ? "  [nincs link]" : "") + (utolsoHiba[f] ? "\n   ! " + utolsoHiba[f] : ""));
      for (const k of a.kihagyott || []) sorok.push(`   kihagyva: ${k.id} (${k.sor}. sor) – ${k.ok}`);
    }
    return sorok.join("\n");
  }

  kezdoAllapot();
  window.DTartalom = { frissit, aktualis, diagnosztika, _szam: szam, _ellenoriz: ellenoriz };
})();
