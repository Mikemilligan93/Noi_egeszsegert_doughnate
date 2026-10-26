/*
 * DOUGHNATE KIOSZK – BEÁLLÍTÁSOK
 * ================================
 * Ez az egyetlen fájl, amit a játék átadásakor / új rendezvénynél szerkeszteni kell.
 * A szövegeket és időzítéseket NEM itt, hanem a Google Táblázatban állítod.
 * Szerkesztés után mentsd el, és töltsd fel a GitHubra (lásd README.md).
 */
window.DOUGHNATE_CONFIG = {

  /* 1. GOOGLE TÁBLÁZAT – a 6 közzétett fül CSV-linkje
   * (Fájl → Megosztás → Közzététel az interneten → fül kiválasztása → CSV).
   * Ha egy link üres, a játék a beépített alaptartalmat használja arra a fülre. */
  tablazat: {
    Kartyak:     "",
    Csuszkak:    "",
    Tenyek:      "",
    Feliratok:   "",
    Zaro:        "",
    Beallitasok: ""
  },

  /* 2. STATISZTIKA – az Apps Script „Webalkalmazás” URL-je (…/exec).
   * Üresen hagyva a játék nem küld statisztikát. */
  statisztikaUrl: "",

  /* 3. HÚZÁS IRÁNYA
   * "jobbra_igen": jobbra = Tény / Normális,  balra = Tévhit / Menj orvoshoz
   * "jobbra_nem":  jobbra = Tévhit / Menj orvoshoz, balra = Tény / Normális
   * A gombok is ehhez igazodnak (a jobb oldali gomb = jobbra húzás). */
  huzasIrany: "jobbra_igen",

  /* 4. MÁRKA – színek, betűk, logók
   * A kinézet az alapítvány oldalát (endometriozismagyarorszag.hu) követi: meleg bézs háttér,
   * sötét petrolzöld Playfair Display címek, sárga gombok és ecsetvonásos aláhúzás, fehér kártyák. */
  marka: {
    rendezvenyNev: "Mito Doughnate",          // a kezdőképernyő alján, kicsiben
    alapitvanyNev: "Együtt könnyebb – Női Egészségért Alapítvány",
    // Kis, ritkított nagybetűs felirat a cím fölött (kezdő- és záróképernyő). Üresen hagyva nem jelenik meg.
    felsoCimke: "Mito Doughnate · Endometriózis",
    // Logók: a fájlt tedd az assets/ mappába, és írd ide az útvonalát (pl. "assets/alapitvany.svg").
    // A bal felső sarokban jelennek meg, egymás mellett. Üresen hagyva nem jelenik meg logó.
    alapitvanyLogo: "",
    rendezvenyLogo: "",
    // Betűk: helyben vannak (vendor/fonts), internet nélkül is betöltenek.
    cimBetu: "'Playfair Display', Georgia, 'Times New Roman', serif",
    betu:    "'Montserrat', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    szinek: {
      hatter:       "#E9E6DD",  // meleg bézs háttér
      felulet:      "#FFFFFF",  // kártyák
      szoveg:       "#212121",  // szövegtörzs
      halvany:      "#5E5A52",  // másodlagos szöveg a bézsen
      sotet:        "#003E3B",  // sötét petrolzöld: címek, sötét sávok, Tévhit / Orvos gomb
      sotetSzoveg:  "#FFFFFF",  // szöveg a sötét petrolzöldön
      sarga:        "#EFC311",  // sárga: fő gomb, aláhúzás, Tény / Normális gomb
      sargaSzoveg:  "#212121",  // szöveg a sárgán
      zold:         "#009782",  // élénk zöld: kis feliratok, pontok
      zoldVilagos:  "#3AAB99",  // pipa, kis feliratok a sötét háttéren
      helyes:       "#3AAB99",  // „Így van!” ikonja
      helytelen:    "#EFC311"   // „Nem egészen.” ikonja
    }
  },

  /* 5. RENDSZER – ritkán kell módosítani */
  rendszer: {
    // Rejtett diagnosztika: a kezdőképernyő bal felső sarkát 5× gyorsan megérintve
    // megmutatja, honnan jön a tartalom és hány statisztikai sor vár küldésre.
    diagnosztika: true,
    // Ennyi kör kártyáit kerüli a játék a következő körben.
    kerulendoKorok: 1
  }
};
