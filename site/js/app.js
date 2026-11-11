/* Doughnate kioszk – játéklogika */
(function () {
  "use strict";
  const CFG = window.DOUGHNATE_CONFIG;
  const $ = id => document.getElementById(id);
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const fmt = n => Number(n).toLocaleString("hu-HU", { maximumFractionDigits: 2 });
  const veletlen = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  let T = window.DTartalom.aktualis();           // aktuális tartalom
  const F = k => (T.feliratok[k] != null ? T.feliratok[k] : "");
  const B = k => Number(T.beallitasok[k]);

  /* ================= MÁRKA ================= */
  function markaAlkalmaz() {
    const m = CFG.marka || {}, s = m.szinek || {}, r = document.documentElement.style;
    // config kulcs → CSS-változó (pl. kartyaSzoveg → --kartya-szoveg)
    for (const k in s) if (s[k]) r.setProperty("--" + k.replace(/[A-Z]/g, b => "-" + b.toLowerCase()), s[k]);
    if (m.betu) r.setProperty("--betu", m.betu);
    if (m.cimBetu) r.setProperty("--cim-betu", m.cimBetu);
    // Logók: a kezdőképernyő bal felső sarkában és a záróképernyőn egy fehér sávon (a sötét háttéren is látszanak)
    const logok = (m.logok || []).filter(l => l && l.fajl);
    if (m.rendezvenyLogo) logok.push({ fajl: m.rendezvenyLogo, nev: m.rendezvenyNev || "" });
    // Home gomb a játékban
    const hl = m.jatekLogo || (logok[0] && logok[0].fajl);
    if (hl) $("home-logo").querySelector("img").src = hl; else $("home-logo").hidden = true;
    ["vonzo-logok", "zaro-logok"].forEach(id => {
      const hely = $(id); hely.innerHTML = "";
      logok.forEach(l => { const i = el("img", "logo"); i.src = l.fajl; i.alt = l.nev || ""; i.draggable = false; hely.appendChild(i); });
      hely.hidden = !logok.length;
    });
    $("rendezveny-nev").textContent = m.rendezvenyNev || "";
    ["vonzo-cimke", "zaro-cimke"].forEach(id => { $(id).textContent = m.felsoCimke || ""; $(id).hidden = !m.felsoCimke; });
  }

  /* ================= ALÁHÚZÁS ================= */
  // A *csillagok közé* tett szövegrész sárga ecsetvonásos aláhúzást kap (mint az alapítvány oldalán).
  function alahuzottSzoveg(cel, szoveg) {
    cel.textContent = "";
    const darabok = String(szoveg || "").split(/(\*[^*]+\*)/);
    for (let i = 0; i < darabok.length; i++) {
      let d = darabok[i];
      if (!d) continue;
      if (/^\*[^*]+\*$/.test(d)) {
        // az utána következő írásjel (?, !, …) ne törjön külön sorba
        const kov = darabok[i + 1] || "", jel = (kov.match(/^[^\s*]+/) || [""])[0];
        const egyben = el("span", "egyben");
        egyben.appendChild(el("span", "alahuzott", d.slice(1, -1)));
        if (jel) { egyben.appendChild(document.createTextNode(jel)); darabok[i + 1] = kov.slice(jel.length); }
        cel.appendChild(egyben);
      } else cel.appendChild(document.createTextNode(d));
    }
  }

  /* ================= SZÖVEGILLESZTÉS ================= */
  // Addig csökkenti a betűméretet, amíg a szöveg kifér a dobozába.
  function illeszt(e, maxPx, minPx) {
    let px = maxPx;
    e.style.fontSize = px + "px";
    const doboz = e.parentElement;
    let biztonsag = 40;
    while (px > minPx && biztonsag-- > 0 && (e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1 ||
           (doboz && doboz.scrollHeight > doboz.clientHeight + 1))) {
      px = Math.max(minPx, px * 0.92);
      e.style.fontSize = px + "px";
    }
  }
  const vmin = () => Math.min(window.innerWidth, window.innerHeight) / 100;

  /* ================= MOZGÁS (a Módszermatch kártyamozgása alapján) ================= */
  const MOZGAS = {
    repules: 340,        // a kártya kirepülése (ms)
    poccMin: 220,        // gyors pöccintésnél legalább ennyi
    gombDontes: 90,      // gombnyomásnál előbb ennyi ideig megdől a kártya
    kovKesleltetes: 120, // ennyivel a kirepülés után indul a következő kártya
    emelkedes: 360       // a következő kártya felemelkedése a pakliból
  };
  const kevesMozgas = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  document.documentElement.style.setProperty("--emelkedes", MOZGAS.emelkedes + "ms");
  const ketKepkocka = f => requestAnimationFrame(() => requestAnimationFrame(f));

  // Egy kártya kirepül oldalra. huzasbol: { dx, dy, v } a húzás végén (ilyenkor megtartja a lendületet).
  // Visszaadja, hány ms-ig tart a gombnyomás előtti megdőlés.
  function kirepit(lap, irany, huzasbol) {
    const outX = irany * (window.innerWidth * 0.6 + lap.offsetWidth);
    let ido = MOZGAS.repules;
    if (huzasbol && Math.abs(huzasbol.v) > 0.3)
      ido = Math.max(MOZGAS.poccMin, Math.min(MOZGAS.repules, Math.abs(outX - huzasbol.dx) / Math.abs(huzasbol.v)));
    if (kevesMozgas) ido = 60;
    const cel = `translate3d(${outX}px, ${huzasbol ? huzasbol.dy * 0.25 : -16}px, 0) rotate(${irany * 22}deg)`;
    const repul = () => {
      lap.style.setProperty("--repules", ido + "ms");
      lap.classList.remove("is-top", "snap");
      lap.classList.add("repul", huzasbol ? "huzasbol" : "gombbol");
      lap.style.transform = cel;
      if (kevesMozgas) lap.style.opacity = "0";
      setTimeout(() => lap.remove(), ido + 60);
    };
    const dontes = (!huzasbol && !kevesMozgas) ? MOZGAS.gombDontes : 0;
    if (dontes) { lap.style.transform = `translate3d(${irany * 16}px, 0, 0) rotate(${irany * 3}deg)`; setTimeout(repul, dontes); }
    else repul();
    return dontes;
  }
  // Az alsó („is-after”) kártya két képkocka múlva a „következő” helyére csúszik – így van mit animálni.
  function pakliba(lap) { lap.classList.add("is-after"); ketKepkocka(() => { lap.classList.remove("is-after"); lap.classList.add("is-next"); }); }

  /* ================= KÉPERNYŐK ================= */
  let kepernyo = "vonzo";
  function mutat(nev) {
    kepernyo = nev;
    document.querySelectorAll(".kepernyo").forEach(s => s.classList.toggle("aktiv", s.id === "kepernyo-" + nev));
    tetlenRejt();
    utolsoErintes = Date.now();
    helyreGorget();
  }
  // iPaden a képernyő-billentyűzet feltolja az egész oldalt, és bezárás után néha úgy is marad – visszaállítjuk.
  function helyreGorget() { if (window.scrollX || window.scrollY) window.scrollTo(0, 0); }

  /* ================= KEZDŐKÉPERNYŐ ================= */
  let tenyIndex = 0, tenyTimer = null, tenySorrend = [];
  function vonzoInditas() {
    T = window.DTartalom.aktualis();
    mutat("vonzo");
    alahuzottSzoveg($("vonzo-cim"), F("vonzo_cim"));
    $("hirlevel-nyit-vonzo").querySelector(".felirat").textContent = F("hirlevel_gomb_vonzo");
    requestAnimationFrame(cimIllesztes);
    $("vonzo-felhivas").textContent = F("vonzo_felhivas");
    $("vonzo-alcim").textContent = F("vonzo_alcim");
    $("vonzo-alcim").parentElement.hidden = !F("vonzo_alcim");
    const db = Math.min(B("kartyak_szama"), T.kartyak.length) + Math.min(B("csuszkak_szama"), T.csuszkak.length);
    $("vonzo-meta").textContent = db + " kérdés";
    tenySorrend = veletlen(T.tenyek);
    tenyIndex = 0;
    tenyPakliEpit();
    clearInterval(tenyTimer);
    tenyTimer = setInterval(tenyValtas, B("teny_valtas_ido") * 1000);
  }
  // a forgó tény betűmérete a kártya szélességéhez igazodik
  const tenyMeret = k => Math.max(2.4 * vmin(), k.clientWidth * 0.085);
  // A nagy cím egy hosszú szava se lógjon ki a hasábból.
  function cimIllesztes() {
    const fekvo = window.innerWidth > window.innerHeight;
    const c = $("vonzo-cim"), max = (fekvo ? 7 : 7.6) * vmin(), sorok = fekvo ? 4 : 3;
    let px = max; c.style.fontSize = px + "px";
    // a hosszú szó se lógjon ki, és a cím legfeljebb 3 (álló) / 4 (fekvő) sor legyen
    const tul = () => c.scrollWidth > c.clientWidth + 1 || c.offsetHeight > px * 1.12 * sorok + 2;
    for (let i = 0; i < 30 && tul() && px > 4 * vmin(); i++) { px *= 0.94; c.style.fontSize = px + "px"; }
  }
  // A nagy szám a kártya szélességéhez igazodik; a hosszú kiemelés (pl. „Minden második”) se lógjon ki.
  function kiemelesIllesztes(k) {
    const ki = k.querySelector(".teny-kiemeles");
    if (ki.hidden) return;
    let px = Math.max(5 * vmin(), k.clientWidth * 0.15); ki.style.fontSize = px + "px";
    // legfeljebb két sor, egyetlen szó se lógjon ki, és a kártya legfeljebb harmadát foglalja
    const tul = () => ki.scrollWidth > ki.clientWidth + 1 || ki.offsetHeight > px * 1.1 * 2 + 2 || ki.offsetHeight > k.clientHeight * 0.36;
    for (let i = 0; i < 30 && tul(); i++) { px *= 0.92; ki.style.fontSize = px + "px"; }
  }
  function tenyIllesztes(k) { kiemelesIllesztes(k); illeszt(k.querySelector(".teny-szoveg"), tenyMeret(k), 2.4 * vmin()); }
  function tenyKartya(t) {
    const k = el("div", "pakli-elo teny-kartya lap");
    const ki = el("div", "teny-kiemeles", t.kiemeles); ki.hidden = !t.kiemeles;
    const doboz = el("div", "teny-szoveg-doboz"); doboz.appendChild(el("div", "teny-szoveg", t.szoveg));
    k.append(ki, doboz);
    return k;
  }
  const tenyAt = i => tenySorrend[i % tenySorrend.length];
  // Kezdő állapot: a felső tény, alatta a következő kártya (üresen) várakozik.
  let tenyNemzedek = 0;
  function tenyPakliEpit() {
    tenyNemzedek++;
    const p = $("teny-pakli"); p.innerHTML = "";
    p.style.visibility = tenySorrend.length ? "" : "hidden";
    if (!tenySorrend.length) return;
    const felso = tenyKartya(tenyAt(tenyIndex)); felso.classList.add("is-top"); p.appendChild(felso); tenyIllesztes(felso);
    if (tenySorrend.length > 1) { const kov = tenyKartya(tenyAt(tenyIndex + 1)); kov.classList.add("is-next"); p.insertBefore(kov, felso); tenyIllesztes(kov); }
  }
  // Tényváltás: a felső kártya kirepül (felváltva jobbra és balra – így tanítja a húzást), a következő felemelkedik.
  let tenyIrany = 1;
  function tenyValtas() {
    const p = $("teny-pakli");
    if (kepernyo !== "vonzo" || tenySorrend.length < 2) return;
    const felso = p.querySelector(".lap.is-top"), kov = p.querySelector(".lap.is-next");
    if (!felso || !kov) { tenyIndex++; tenyPakliEpit(); return; }
    tenyIndex++;
    const dontes = kirepit(felso, tenyIrany, null);
    tenyIrany = -tenyIrany;
    const nemzedek = tenyNemzedek;
    setTimeout(() => {
      if (nemzedek !== tenyNemzedek) return;   // közben újraépült a pakli (pl. tartalomfrissítés, visszatérés a kezdőképernyőre)
      kov.classList.remove("is-next"); kov.classList.add("is-top");
      const uj = tenyKartya(tenyAt(tenyIndex + 1)); p.insertBefore(uj, p.firstChild); tenyIllesztes(uj); pakliba(uj);
    }, kevesMozgas ? 0 : dontes + MOZGAS.kovKesleltetes);
  }
  function tenyekUjraIllesztese() { document.querySelectorAll("#teny-pakli .teny-kartya").forEach(tenyIllesztes); }

  /* ================= KÖR ÖSSZEÁLLÍTÁSA ================= */
  const KORABBI_KULCS = "doughnate_korabbi_v1";
  function korabbiOlvas() { try { return JSON.parse(localStorage.getItem(KORABBI_KULCS) || "[]"); } catch (e) { return korabbiMem; } }
  let korabbiMem = [];
  function korabbiIr(korIdk) {
    const beall = CFG.rendszer && Number(CFG.rendszer.kerulendoKorok);
    const n = isFinite(beall) && beall >= 0 ? Math.floor(beall) : 1;   // 0 = nem kerül semmit
    const lista = korabbiOlvas(); lista.push(korIdk); while (lista.length > n) lista.shift();
    korabbiMem = lista;
    try { localStorage.setItem(KORABBI_KULCS, JSON.stringify(lista)); } catch (e) {}
  }
  // n elem választása: előbb a nemrég nem látottakból, ha kevés, a többiből pótol.
  function valaszt(keszlet, n, kerulendo) {
    const friss = veletlen(keszlet.filter(x => !kerulendo.has(x.id)));
    const regi = veletlen(keszlet.filter(x => kerulendo.has(x.id)));
    return friss.concat(regi).slice(0, n);
  }
  function korOsszeallit() {
    const kerulendo = new Set([].concat(...korabbiOlvas()));
    const N = Math.round(B("kartyak_szama")), M = Math.round(B("csuszkak_szama"));
    // Kártyák: a két típus vegyesen, nagyjából fele-fele
    const tt = T.kartyak.filter(k => k.tipus === "teny_tevhit");
    const no = T.kartyak.filter(k => k.tipus === "normalis_orvos");
    let nTT = Math.random() < 0.5 ? Math.ceil(N / 2) : Math.floor(N / 2);
    nTT = Math.min(nTT, tt.length);
    let nNO = Math.min(N - nTT, no.length);
    nTT = Math.min(tt.length, N - nNO);
    const kartyak = veletlen(valaszt(tt, nTT, kerulendo).concat(valaszt(no, nNO, kerulendo)));
    const csuszkak = valaszt(T.csuszkak, Math.min(M, T.csuszkak.length), kerulendo);
    // Csúszkák egyenletesen elosztva, de sosem elsőként
    const kor = kartyak.slice();
    const ossz = kartyak.length + csuszkak.length;
    csuszkak.forEach((c, j) => {
      const hely = Math.max(1, Math.min(kor.length, Math.round((j + 1) * ossz / (csuszkak.length + 1))));
      kor.splice(hely, 0, c);
    });
    return kor;
  }

  /* ================= JÁTÉK ================= */
  let kor = [], lepes = 0, korId = "", valaszolt = false;
  const jobbraIgen = (CFG.huzasIrany || "jobbra_igen") !== "jobbra_nem";

  function korInditas() {
    T = window.DTartalom.aktualis();
    clearInterval(tenyTimer);
    kor = korOsszeallit();
    if (!kor.length) { vonzoInditas(); return; }
    korId = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(2, 14) + "-" + Math.random().toString(36).slice(2, 6);
    lepes = 0;
    mutat("jatek");
    haladasRajzol();
    elemMutat();
    wakeLock();
  }

  function haladasRajzol() {
    const h = $("haladas");
    // ha a körök száma nem változott, csak az osztályokat cseréljük – így az átmenet (szín, nagyítás) látszik
    if (h.children.length !== kor.length) { h.innerHTML = ""; kor.forEach(() => h.appendChild(el("span", "pont"))); }
    [...h.children].forEach((p, i) => { p.classList.toggle("kesz", i < lepes); p.classList.toggle("most", i === lepes); });
  }

  // Egy kártyatípus két válasza: [igen-oldal, nem-oldal]
  function oldalak(tipus) {
    return tipus === "teny_tevhit"
      ? { igen: { kod: "TENY", felirat: F("gomb_teny") }, nem: { kod: "TEVHIT", felirat: F("gomb_tevhit") } }
      : { igen: { kod: "NORMALIS", felirat: F("gomb_normalis") }, nem: { kod: "ORVOS", felirat: F("gomb_orvos") } };
  }
  function jobbBal(tipus) {
    const o = oldalak(tipus);
    return jobbraIgen ? { jobb: Object.assign({ oldal: "igen" }, o.igen), bal: Object.assign({ oldal: "nem" }, o.nem) }
                      : { jobb: Object.assign({ oldal: "nem" }, o.nem), bal: Object.assign({ oldal: "igen" }, o.igen) };
  }

  /* ---------- PAKLI A JÁTÉKBAN ----------
   * Mint a Módszermatchban: a felső kártya alatt ott várakozik a következő (üresen),
   * válasz után a felső kirepül, a magyarázat után a következő felemelkedik a helyére. */
  let felsoLap = null;
  function elemEpit(elem) { return elem.tipus === "csuszka" ? csuszkaEpit(elem) : kartyaEpit(elem); }

  // A kör első kártyája (és alatta a második).
  function elemMutat() {
    valaszolt = false;
    $("magyarazat").hidden = true;
    const ter = $("jatek-ter"); ter.innerHTML = "";
    haladasRajzol();
    const felso = elemEpit(kor[lepes]); felso.classList.add("is-top"); ter.appendChild(felso); felso._illeszt();
    if (kor[lepes + 1]) { const kov = elemEpit(kor[lepes + 1]); kov.classList.add("is-next"); ter.insertBefore(kov, felso); kov._illeszt(); }
    aktival(felso);
  }
  // A várakozó kártya felemelkedik, alá új kerül.
  function kovetkezoElem() {
    valaszolt = false;
    $("magyarazat").hidden = true;
    haladasRajzol();
    const ter = $("jatek-ter");
    let felso = ter.querySelector(".lap.is-next");
    if (!felso) { elemMutat(); return; }
    felso.classList.remove("is-next"); felso.classList.add("is-top");
    if (kor[lepes + 1]) { const uj = elemEpit(kor[lepes + 1]); ter.insertBefore(uj, ter.firstChild); uj._illeszt(); pakliba(uj); }
    aktival(felso);
  }
  function aktival(lap) { felsoLap = lap; lap._aktival(); }

  /* ---------- KÁRTYA ---------- */
  // Érintőképernyőn a táblázat „huzas_tipp” szövege, egérrel/billentyűzettel (laptop) a billentyűket is említő változat.
  // Ez utóbbi a táblázatban egy új Feliratok-sorral felülírható: kulcs = huzas_tipp_billentyu.
  const erintos = !!(window.matchMedia && matchMedia("(pointer: coarse)").matches);
  const tippSzoveg = () => erintos ? F("huzas_tipp") : F("huzas_tipp_billentyu");
  function kartyaEpit(k) {
    const jb = jobbBal(k.tipus);
    const kartya = el("div", "kartya lap");
    kartya.appendChild(el("div", "kartya-tipus", F(k.tipus === "teny_tevhit" ? "tipus_teny_tevhit" : "tipus_normalis_orvos")));
    const szovegDoboz = el("div", "kartya-szoveg-doboz");
    const szoveg = el("div", "kartya-szoveg", k.allitas);
    szovegDoboz.appendChild(szoveg);
    kartya.appendChild(szovegDoboz);
    if (kor.indexOf(k) === 0 || (kor.indexOf(k) === 1 && kor[0].tipus === "csuszka")) kartya.appendChild(el("div", "huzas-tipp", tippSzoveg()));
    kartya.appendChild(el("div", "pecset pecset-bal oldal-" + jb.bal.oldal, jb.bal.felirat));
    kartya.appendChild(el("div", "pecset pecset-jobb oldal-" + jb.jobb.oldal, jb.jobb.felirat));
    kartya._illeszt = () => illeszt(szoveg, 6 * vmin(), 2.8 * vmin());
    kartya._aktival = () => {
      const gBal = $("gomb-bal"), gJobb = $("gomb-jobb");
      $("valasz-gombok").className = "valasz-gombok";
      gBal.textContent = "← " + jb.bal.felirat; gBal.className = "nagy-gomb gomb-bal oldal-" + jb.bal.oldal;
      gJobb.textContent = jb.jobb.felirat + " →"; gJobb.className = "nagy-gomb gomb-jobb oldal-" + jb.jobb.oldal;
      gBal.onclick = () => kartyaValasz(k, kartya, -1, jb.bal.kod, null);
      gJobb.onclick = () => kartyaValasz(k, kartya, 1, jb.jobb.kod, null);
      huzhato(kartya, (irany, huzas) => kartyaValasz(k, kartya, irany, irany > 0 ? jb.jobb.kod : jb.bal.kod, huzas));
    };
    return kartya;
  }

  // Húzás a Módszermatch szerint: a kártya követi az ujjat és dől, a címke a küszöbig fokozatosan előtűnik;
  // a küszöbön túl a gomb is „élesedik”. Elengedéskor a küszöb vagy egy gyors pöccintés dönt, különben visszaugrik.
  function huzhato(kartya, kesz) {
    let sx = 0, sy = 0, dx = 0, dy = 0, utolsoX = 0, utolsoT = 0, vx = 0, aktiv = false, pid = null;
    const kuszob = () => Math.min(140, Math.max(80, $("jatek-ter").clientWidth * 0.28));
    const gombok = (j, b) => { $("gomb-jobb").classList.toggle("eles", j); $("gomb-bal").classList.toggle("eles", b); };
    kartya.addEventListener("pointerdown", e => {
      if (valaszolt || kartya !== felsoLap || (e.pointerType === "mouse" && e.button !== 0)) return;
      aktiv = true; pid = e.pointerId; sx = utolsoX = e.clientX; sy = e.clientY; dx = dy = vx = 0; utolsoT = performance.now();
      try { kartya.setPointerCapture(pid); } catch (_) {}
      kartya.classList.remove("snap"); kartya.classList.add("huzas");
    });
    kartya.addEventListener("pointermove", e => {
      if (!aktiv || e.pointerId !== pid) return;
      const most = performance.now(), dt = Math.max(most - utolsoT, 1);
      vx = 0.7 * ((e.clientX - utolsoX) / dt) + 0.3 * vx;      // simított sebesség, px/ms
      utolsoX = e.clientX; utolsoT = most;
      dx = e.clientX - sx; dy = e.clientY - sy;
      const w = kartya.offsetWidth || 1;
      kartya.style.transform = `translate3d(${dx}px, ${dy * 0.25}px, 0) rotate(${dx / w * 16}deg)`;
      const th = kuszob(), p = Math.min(1, Math.abs(dx) / th);
      kartya.style.setProperty("--p-jobb", dx > 0 ? p : 0);
      kartya.style.setProperty("--p-bal", dx < 0 ? p : 0);
      gombok(dx > th, dx < -th);
    });
    const vege = e => {
      if (!aktiv || e.pointerId !== pid) return;
      aktiv = false;
      kartya.classList.remove("huzas");
      gombok(false, false);
      if (performance.now() - utolsoT > 90) vx = 0;            // megállt az ujj elengedés előtt: nem pöccintés
      const pocc = Math.abs(vx) > 0.5 && Math.abs(dx) > 30 && (vx > 0) === (dx > 0);
      if (Math.abs(dx) > kuszob() || pocc) kesz(dx > 0 ? 1 : -1, { dx, dy, v: vx });
      else {
        kartya.classList.add("snap");
        kartya.style.transform = "";
        kartya.style.setProperty("--p-jobb", 0); kartya.style.setProperty("--p-bal", 0);
      }
    };
    kartya.addEventListener("pointerup", vege);
    kartya.addEventListener("pointercancel", vege);
  }

  function kartyaValasz(k, kartya, irany, kod, huzas) {
    if (valaszolt || kartya !== felsoLap) return;
    valaszolt = true;
    kartya.style.setProperty(irany > 0 ? "--p-jobb" : "--p-bal", 1);
    kartya.style.setProperty(irany > 0 ? "--p-bal" : "--p-jobb", 0);
    $("valasz-gombok").classList.add("rejtett");
    const dontes = kirepit(kartya, irany, huzas);
    const helyes = kod === k.helyes;
    window.DStat.rogzit({ kor_azonosito: korId, esemeny: "valasz", elem_id: k.id, elem_tipus: k.tipus, valasz: kod, helyes: helyes ? "IGEN" : "NEM" });
    const o = oldalak(k.tipus);
    const helyesFelirat = (o.igen.kod === k.helyes ? o.igen : o.nem).felirat;
    magyarazatKesobb({ helyes, helyesSor: "Helyes válasz: " + helyesFelirat, szoveg: k.magyarazat, forras: k.forras, orvos: k.tipus === "normalis_orvos" }, dontes);
  }

  /* ---------- CSÚSZKA ---------- */
  function csuszkaEpit(c) {
    const doboz = el("div", "kartya csuszka-kartya lap");
    doboz.appendChild(el("div", "kartya-tipus", F("tipus_csuszka")));
    const kd = el("div", "kartya-szoveg-doboz kerdes-doboz");
    const kerdes = el("div", "kartya-szoveg", c.kerdes);
    kd.appendChild(kerdes); doboz.appendChild(kd);

    const kozep = c.min + Math.round(((c.max - c.min) / 2) / c.lepes) * c.lepes;
    const kerekit = v => { const n = Math.round((v - c.min) / c.lepes); const r = c.min + n * c.lepes; return Math.min(c.max, Math.max(c.min, Number(r.toFixed(6)))); };
    // A csúszka ne a helyes válaszon (vagy a tűrésen belül) induljon – különben „ingyen” jó lenne.
    const tavol = v => Math.abs(v - c.helyes) > c.tures + 1e-9;
    const jeloltek = [kozep, c.min + (c.max - c.min) * 0.25, c.min + (c.max - c.min) * 0.75, c.min, c.max].map(kerekit);
    let ertek = jeloltek.find(tavol);
    if (ertek === undefined) ertek = kerekit(kozep);

    const kijelzo = el("div", "csuszka-ertek");
    const sor = el("div", "csuszka-sor");
    const minusz = el("button", "kis-gomb", "−");
    const plusz = el("button", "kis-gomb", "+");
    const input = el("input", "csuszka");
    input.type = "range"; input.min = c.min; input.max = c.max; input.step = c.lepes; input.value = ertek;
    input.setAttribute("aria-label", c.kerdes);
    sor.append(minusz, input, plusz);
    const hatarok = el("div", "csuszka-hatarok");
    hatarok.append(el("span", null, fmt(c.min)), el("span", null, fmt(c.max)));
    doboz.append(kijelzo, sor, hatarok);

    const frissit = () => {
      kijelzo.textContent = fmt(ertek) + (c.egyseg ? " " + c.egyseg : "");
      input.value = ertek;
      input.style.setProperty("--kitoltes", ((ertek - c.min) / (c.max - c.min) * 100) + "%");
    };
    input.addEventListener("input", () => { ertek = kerekit(Number(input.value)); frissit(); });
    minusz.onclick = () => { if (!valaszolt) { ertek = kerekit(ertek - c.lepes); frissit(); } };
    plusz.onclick = () => { if (!valaszolt) { ertek = kerekit(ertek + c.lepes); frissit(); } };
    frissit();
    doboz._illeszt = () => illeszt(kerdes, 5.2 * vmin(), 2.6 * vmin());
    doboz._aktival = () => {
      $("valasz-gombok").className = "valasz-gombok egy";
      const g = $("gomb-jobb");
      g.textContent = F("gomb_tippelek") + " →"; g.className = "nagy-gomb gomb-sarga";
      $("gomb-bal").onclick = null;
      g.onclick = () => {
        if (valaszolt || doboz !== felsoLap) return;
        valaszolt = true; input.disabled = true;
        $("valasz-gombok").classList.add("rejtett");
        const helyes = Math.abs(ertek - c.helyes) <= c.tures + 1e-9;
        window.DStat.rogzit({ kor_azonosito: korId, esemeny: "valasz", elem_id: c.id, elem_tipus: "csuszka", valasz: String(ertek), helyes: helyes ? "IGEN" : "NEM" });
        const egys = c.egyseg ? " " + c.egyseg : "";
        const dontes = kirepit(doboz, 1, null);   // a tipp is „elküldi” a kártyát, mint egy gombnyomás
        magyarazatKesobb({ helyes, helyesSor: `${F("csuszka_helyes_ertek")} ${fmt(c.helyes)}${egys} · a te tipped: ${fmt(ertek)}${egys}`,
          szoveg: c.magyarazat, forras: c.forras, orvos: false }, dontes);
      };
    };
    return doboz;
  }

  /* ---------- MAGYARÁZAT ---------- */
  let tovabbTimer = null;
  // A kártya kirepülése után jelenik meg. Ha közben kiléptek, vagy már másik kör / kérdés fut, nem jelenik meg
  // (különben egy gyors „vissza + új kör” után az előző kártya magyarázata ugrana az új kártyára).
  function magyarazatKesobb(adat, dontes) {
    const k = korId, l = lepes;
    setTimeout(() => { if (k === korId && l === lepes && valaszolt) magyarazatMutat(adat); }, kevesMozgas ? 0 : dontes + MOZGAS.kovKesleltetes + 100);
  }
  function magyarazatMutat({ helyes, helyesSor, szoveg, forras, orvos }) {
    if (kepernyo !== "jatek") return;   // közben lejárt a tétlenségi idő
    const m = $("magyarazat");
    $("visszajelzes").textContent = F(helyes ? "visszajelzes_helyes" : "visszajelzes_helytelen");
    $("visszajelzes").className = "visszajelzes " + (helyes ? "jo" : "rossz");
    $("visszajelzes-ikon").className = "visszajelzes-ikon " + (helyes ? "jo" : "rossz");
    $("helyes-valasz").textContent = helyesSor;
    $("magyarazat-szoveg").textContent = szoveg;
    $("magyarazat-szoveg").hidden = !szoveg;
    $("orvos-lablec").textContent = F("orvos_lablec");
    $("orvos-lablec").hidden = !orvos || !F("orvos_lablec");
    $("forras").textContent = forras ? "Forrás: " + forras : "";
    $("valasz-gombok").classList.add("rejtett");
    m.hidden = false;
    magyarazatIllesztes();
    m.classList.remove("be"); void m.offsetWidth; m.classList.add("be");
    const ido = B("magyarazat_ido") * 1000;
    const sav = $("idosav-toltes");
    sav.style.transition = "none"; sav.style.width = "0%"; void sav.offsetWidth;
    sav.style.transition = `width ${ido}ms linear`; sav.style.width = "100%";
    clearTimeout(tovabbTimer);
    tovabbTimer = setTimeout(tovabb, ido);
  }
  // Ha a magyarázat (pl. orvosi lábléccel) nem fér ki, arányosan kisebb betűvel jelenik meg.
  function magyarazatIllesztes() {
    const b = document.querySelector(".magyarazat-belso");
    let sk = 1; b.style.setProperty("--m-skala", sk);
    for (let i = 0; i < 8 && b.scrollHeight > b.clientHeight + 1 && sk > 0.62; i++) { sk -= 0.06; b.style.setProperty("--m-skala", sk); }
  }
  function tovabb() {
    clearTimeout(tovabbTimer);
    if (kepernyo !== "jatek") return;
    lepes++;
    if (lepes >= kor.length) return korVege();
    kovetkezoElem();
  }
  $("tovabb").addEventListener("click", tovabb);

  // Kilépés a játékból a kezdőképernyőre (Home logó, „Vissza a kezdőképernyőre” gomb, Esc billentyű).
  // A félbehagyott kör nem számít befejezettnek; a már megadott válaszok a statisztikában maradnak.
  function kezdokepernyore() {
    clearTimeout(tovabbTimer);
    $("magyarazat").hidden = true;
    felsoLap = null; korId = "";
    vonzoInditas();
  }
  $("home-logo").addEventListener("click", e => { e.stopPropagation(); kezdokepernyore(); });
  $("kis-vissza").addEventListener("click", e => { e.stopPropagation(); kezdokepernyore(); });

  function korVege() {
    window.DStat.rogzit({ kor_azonosito: korId, esemeny: "kor_vege", elem_id: "", elem_tipus: "", valasz: "", helyes: "" });
    korabbiIr(kor.map(e => e.id));
    zaroMutat();
  }

  /* ================= ZÁRÓKÉPERNYŐ ================= */
  let zaroTimer = null;
  function zaroMutat() {
    mutat("zaro");
    alahuzottSzoveg($("zaro-cim"), F("zaro_cim"));
    $("hirlevel-nyit-zaro").querySelector(".felirat").textContent = F("hirlevel_gomb_zaro");
    $("zaro-szoveg").textContent = F("zaro_szoveg");
    $("gomb-uj-kor").textContent = F("gomb_uj_kor") + " →";
    $("jogi-zaro").textContent = F("jogi_megjegyzes");
    const racs = $("qr-racs"); racs.innerHTML = "";
    racs.dataset.db = T.zaro.length;
    racs.classList.toggle("lista", T.zaro.length > 1);   // több kód: egymás alatti sorok, a szöveg a kód mellett
    for (const z of T.zaro) {
      const d = el("div", "qr-elem");
      const kep = el("div", "qr-kep");
      qrRajzol(kep, z.url);
      d.appendChild(kep);
      const szoveg = el("div", "qr-szoveg");
      if (z.kiemelt) szoveg.appendChild(el("div", "qr-kiemelt", z.kiemelt));
      if (z.cim) szoveg.appendChild(el("div", "qr-cim", z.cim));
      if (z.leiras) szoveg.appendChild(el("div", "qr-leiras", z.leiras));
      szoveg.appendChild(el("div", "qr-felhivas", F("zaro_qr_felhivas")));
      d.appendChild(szoveg);
      d.style.setProperty("--i", racs.children.length);   // egymás után úsznak be
      racs.appendChild(d);
    }
    // méréskor a belépő animációk ki vannak kapcsolva (a kicsinyített cím becsapná a mérést), utána elindulnak
    $("kepernyo-zaro").style.setProperty("--qr-db", T.zaro.length);
    $("kepernyo-zaro").classList.add("meres");
    requestAnimationFrame(() => { qrIllesztes(); $("kepernyo-zaro").classList.remove("meres"); });
    zaroIdozit();
  }
  // A QR-kódok méretét addig csökkenti, amíg minden kifér a képernyőre (1–4+ kód, bármely tájolás).
  function qrIllesztes() {
    const sec = $("kepernyo-zaro"), racs = $("qr-racs"), n = T.zaro.length;
    if (!n) return;
    const fekvo = window.innerWidth > window.innerHeight;
    let v = n === 1 ? (fekvo ? 54 : 48) : (fekvo ? 30 : 26), sk = 1;
    const kifer = () => {
      const b = sec.getBoundingClientRect(), cs = getComputedStyle(sec), tur = 1.5 * vmin();   // tűrés a döntött kártyák miatt
      const sr = { top: b.top + parseFloat(cs.paddingTop) - tur, bottom: b.bottom - parseFloat(cs.paddingBottom) + tur,
                   left: b.left + parseFloat(cs.paddingLeft) - tur, right: b.right - parseFloat(cs.paddingRight) + tur };
      const elemek = [...sec.children].filter(c => !c.hidden && !c.classList.contains("qr-racs") && !c.classList.contains("kereszt"));
      const qrk = [...racs.children];   // (lásd: „meres” osztály – mérés közben nincs animáció)
      for (const c of elemek.concat(qrk)) {
        const r = c.getBoundingClientRect();
        if (r.top < sr.top || r.bottom > sr.bottom || r.left < sr.left || r.right > sr.right) return false;
      }
      // a QR-ok ne takarjanak ki szöveget / gombot
      for (const q of qrk) { const a = q.getBoundingClientRect();
        for (const c of elemek) { const r = c.getBoundingClientRect();
          if (a.left < r.right && a.right > r.left && a.top < r.bottom - 2 && a.bottom > r.top + 2) return false; } }
      return true;
    };
    racs.style.setProperty("--qr-meret", v + "vmin");
    sec.style.setProperty("--z-skala", 1);
    // előbb a kódot kicsinyíti (legfeljebb 20 vmin-ig, az még jól beolvasható), utána a képernyő szövegeit, végül tovább a kódot
    for (let i = 0; i < 60 && !kifer(); i++) {
      if (v > 20) { v *= 0.94; racs.style.setProperty("--qr-meret", v.toFixed(2) + "vmin"); }
      else if (sk > 0.52) { sk -= 0.04; sec.style.setProperty("--z-skala", sk.toFixed(2)); }
      else if (v > 14) { v *= 0.94; racs.style.setProperty("--qr-meret", v.toFixed(2) + "vmin"); }
      else break;
    }
  }
  function zaroIdozit() {
    clearTimeout(zaroTimer);
    zaroTimer = setTimeout(() => { if (kepernyo === "zaro") vonzoInditas(); }, B("zarokepernyo_ido") * 1000);
  }
  function qrRajzol(kep, url) {
    try {
      const q = window.qrcode(0, "M");
      q.addData(url); q.make();
      kep.innerHTML = q.createSvgTag({ cellSize: 8, margin: 2, scalable: true });
    } catch (e) { kep.textContent = ""; kep.appendChild(el("div", "qr-hiba", url)); }   // a link a táblázatból jön: szövegként, nem HTML-ként
  }
  $("gomb-uj-kor").addEventListener("click", e => { e.stopPropagation(); clearTimeout(zaroTimer); korInditas(); });

  /* ================= HÍRLEVÉL-FELIRATKOZÁS =================
   * A kezdőképernyő jobb felső sarkából és a záróképernyőről nyílik. Az e-mail-cím a statisztikával együtt
   * az Apps Scripthez megy, ami a táblázat „Feliratkozok” fülére írja (a Statisztika fül mellé).
   * Közös eszközön vagyunk: a mezőket minden kilépéskor ürítjük, és a böngésző nem jegyezheti meg őket. */
  let hirlevelVissza = "vonzo", hirlevelTimer = null;
  const EMAIL_MINTA = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function hirlevelUrit() {
    $("hirlevel-urlap").reset();
    $("hirlevel-hiba").hidden = true;
    $("hirlevel-urlap").classList.remove("hibas");
  }
  function hirlevelMutat(honnan) {
    clearTimeout(zaroTimer); clearTimeout(hirlevelTimer);
    hirlevelVissza = honnan;
    hirlevelUrit();
    $("hirlevel-cimke").textContent = (CFG.marka && CFG.marka.felsoCimke) || ""; $("hirlevel-cimke").hidden = !(CFG.marka && CFG.marka.felsoCimke);
    alahuzottSzoveg($("hirlevel-cim"), F("hirlevel_cim"));
    $("hirlevel-szoveg").textContent = F("hirlevel_szoveg");
    $("hirlevel-email-cimke").textContent = F("hirlevel_email_cimke");
    $("hirlevel-nev-cimke").textContent = F("hirlevel_nev_cimke");
    $("hirlevel-hozzajarulas-szoveg").textContent = F("hirlevel_hozzajarulas");
    $("hirlevel-adatkezeles").textContent = F("hirlevel_adatkezeles");
    $("hirlevel-kuld").textContent = F("hirlevel_kuldes") + " →";
    $("hirlevel-megse").textContent = F("hirlevel_megse");
    $("hirlevel-urlap").hidden = false; $("hirlevel-koszonet").hidden = true;
    clearInterval(tenyTimer);
    mutat("hirlevel");
    // érintőképernyőn nem nyitjuk fel magunktól a billentyűzetet (eltakarná a szöveget); laptopon igen
    if (!erintos) setTimeout(() => $("hirlevel-email").focus(), 450);
  }
  function hirlevelBezar() {
    clearTimeout(hirlevelTimer);
    hirlevelUrit();
    document.activeElement && document.activeElement.blur && document.activeElement.blur();
    if (hirlevelVissza === "zaro") { mutat("zaro"); zaroIdozit(); } else vonzoInditas();
  }
  function hirlevelHiba(szoveg) { const h = $("hirlevel-hiba"); h.textContent = szoveg; h.hidden = false; $("hirlevel-urlap").classList.add("hibas"); }
  $("hirlevel-urlap").addEventListener("submit", e => {
    e.preventDefault();
    const email = $("hirlevel-email").value.trim().toLowerCase(), nev = $("hirlevel-nev").value.trim();
    if (!EMAIL_MINTA.test(email)) { hirlevelHiba(F("hirlevel_hiba_email")); $("hirlevel-email").focus(); return; }
    if (!$("hirlevel-hozzajarulas").checked) { hirlevelHiba(F("hirlevel_hiba_hozzajarulas")); return; }
    // a hozzájárulás pontos szövegét is eltesszük – így utólag igazolható, mihez járult hozzá
    window.DStat.rogzit({ esemeny: "feliratkozas", email, nev, hozzajarulas: F("hirlevel_hozzajarulas"), forras: hirlevelVissza === "zaro" ? "zarokepernyo" : "kezdokepernyo" });
    hirlevelUrit();
    document.activeElement && document.activeElement.blur && document.activeElement.blur();
    alahuzottSzoveg($("hirlevel-koszonet-cim"), F("hirlevel_koszonet_cim"));
    $("hirlevel-koszonet-szoveg").textContent = F("hirlevel_koszonet_szoveg");
    $("hirlevel-urlap").hidden = true; $("hirlevel-koszonet").hidden = false;
    hirlevelTimer = setTimeout(() => { if (kepernyo === "hirlevel") { hirlevelVissza = "vonzo"; hirlevelBezar(); } }, 6000);
  });
  $("hirlevel-megse").addEventListener("click", hirlevelBezar);
  $("hirlevel-urlap").addEventListener("focusout", () => setTimeout(() => {
    const a = document.activeElement;
    if (!(a && a.closest && a.closest("#hirlevel-urlap"))) helyreGorget();   // egyik mező sincs fókuszban: a billentyűzet bezárult
  }, 120));
  $("hirlevel-koszonet").addEventListener("click", () => { hirlevelVissza = "vonzo"; hirlevelBezar(); });
  $("hirlevel-nyit-vonzo").addEventListener("click", e => { e.stopPropagation(); hirlevelMutat("vonzo"); });
  $("hirlevel-nyit-zaro").addEventListener("click", e => { e.stopPropagation(); hirlevelMutat("zaro"); });
  // ha az űrlapon hibát mutattunk, gépeléskor eltűnik
  ["hirlevel-email", "hirlevel-hozzajarulas"].forEach(id => $(id).addEventListener("input", () => { $("hirlevel-hiba").hidden = true; $("hirlevel-urlap").classList.remove("hibas"); }));

  /* ================= TÉTLENSÉG ================= */
  let utolsoErintes = Date.now(), tetlenAktiv = false, tetlenVege = 0;
  function tetlenRejt() { tetlenAktiv = false; $("tetlen").hidden = true; }
  setInterval(() => {
    if (kepernyo !== "jatek" && kepernyo !== "hirlevel") return;
    const most = Date.now();
    if (!tetlenAktiv && most - utolsoErintes > B("tetlenseg_ido") * 1000) {
      tetlenAktiv = true;
      tetlenVege = most + B("tetlenseg_visszaszamlalas") * 1000;
      $("tetlen-kerdes").textContent = F("idle_kerdes");
      $("tetlen-gomb").textContent = F("idle_gomb");
      $("tetlen").hidden = false;
    }
    if (tetlenAktiv) {
      const maradt = Math.ceil((tetlenVege - most) / 1000);
      $("tetlen-szamlalo").textContent = Math.max(0, maradt);
      if (maradt <= 0) { clearTimeout(tovabbTimer); clearTimeout(hirlevelTimer); hirlevelUrit(); vonzoInditas(); }
    }
  }, 250);
  $("tetlen").addEventListener("click", e => { e.stopPropagation(); tetlenRejt(); utolsoErintes = Date.now(); });

  document.addEventListener("pointerdown", () => {
    utolsoErintes = Date.now();
    if (kepernyo === "zaro") zaroIdozit();
  }, true);
  // a képernyő-billentyűzeten gépelés és a csúszka hosszú húzása is tevékenység (nem mindig jár vele pointerdown / keydown)
  document.addEventListener("input", () => { utolsoErintes = Date.now(); }, true);

  /* ================= INDÍTÁS ÉRINTÉSRE ================= */
  $("kepernyo-vonzo").addEventListener("click", () => { if (kepernyo === "vonzo") korInditas(); });

  /* ================= KIOSZK VÉDELEM ================= */
  document.addEventListener("contextmenu", e => e.preventDefault());
  document.addEventListener("gesturestart", e => e.preventDefault());
  document.addEventListener("gesturechange", e => e.preventDefault());
  document.addEventListener("dblclick", e => e.preventDefault(), { passive: false });
  document.addEventListener("touchstart", e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  document.addEventListener("touchmove", e => {
    if (e.target.closest && e.target.closest("input[type=range], .diag pre, #kepernyo-hirlevel")) return;
    e.preventDefault();
  }, { passive: false });
  document.addEventListener("selectstart", e => { if (!(e.target.closest && e.target.closest("input, textarea"))) e.preventDefault(); });
  document.addEventListener("dragstart", e => e.preventDefault());
  window.addEventListener("keydown", e => {
    if (kepernyo === "hirlevel" && !(e.metaKey || e.ctrlKey)) return;     // az űrlapon a Tab mezőről mezőre visz
    if (e.key === "Tab" || (e.metaKey || e.ctrlKey)) e.preventDefault();
  });

  /* ================= BILLENTYŰZET (laptopos kioszkhoz, a Módszermatch szerint) =================
   * Kezdőképernyő: Enter / szóköz = indítás · Kártya: ← → = a bal / jobb oldali válasz (mint a gombok)
   * Csúszka: ← → = érték léptetése, Enter / szóköz = Tippelek · Magyarázat: Enter / szóköz / → = Tovább
   * Záróképernyő: Enter / szóköz = Új kör · „Itt vagy még?”: bármely billentyű = folytatás
 * Játék közben: Esc (vagy Home) = vissza a kezdőképernyőre · Diagnosztika: Esc = bezárás */
  const villan = g => { g.classList.add("eles"); setTimeout(() => g.classList.remove("eles"), 160); };
  document.addEventListener("keydown", e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key, ok = k === "Enter" || k === " " || k === "Spacebar", bal = k === "ArrowLeft", jobb = k === "ArrowRight";
    utolsoErintes = Date.now();
    if (kepernyo === "zaro") zaroIdozit();
    if (!$("diag").hidden) { if (k === "Escape") { e.preventDefault(); $("diag").hidden = true; } return; }
    if (tetlenAktiv) { e.preventDefault(); tetlenRejt(); return; }
    if (kepernyo === "hirlevel") {                                          // gépelés: semmit nem veszünk el, csak az Esc lép ki
      if (k === "Escape") { e.preventDefault(); if ($("hirlevel-koszonet").hidden) hirlevelBezar(); else { hirlevelVissza = "vonzo"; hirlevelBezar(); } }
      else if (!$("hirlevel-koszonet").hidden && ok) { e.preventDefault(); hirlevelVissza = "vonzo"; hirlevelBezar(); }
      return;
    }
    if (e.repeat) { if (ok || bal || jobb) e.preventDefault(); return; }   // nyomva tartott billentyű ne válaszoljon többször
    if (kepernyo === "vonzo") { if (ok) { e.preventDefault(); korInditas(); } return; }
    if (kepernyo === "zaro") { if (ok) { e.preventDefault(); clearTimeout(zaroTimer); korInditas(); } return; }
    if (kepernyo !== "jatek") return;
    if (k === "Escape" || k === "Home") { e.preventDefault(); kezdokepernyore(); return; }
    if (!$("magyarazat").hidden) { if (ok || jobb) { e.preventDefault(); tovabb(); } return; }
    if (valaszolt || !felsoLap) return;
    if (felsoLap.classList.contains("csuszka-kartya")) {
      const [minusz, plusz] = felsoLap.querySelectorAll(".kis-gomb");
      if (bal) { e.preventDefault(); minusz.click(); }
      else if (jobb) { e.preventDefault(); plusz.click(); }
      else if (ok) { e.preventDefault(); villan($("gomb-jobb")); $("gomb-jobb").click(); }
      return;
    }
    if (bal || jobb) { e.preventDefault(); const g = $(bal ? "gomb-bal" : "gomb-jobb"); villan(g); g.click(); }
    else if (ok) e.preventDefault();                                     // fókuszban maradt gomb se kattanjon véletlenül
  });
  // egérkattintás után a gomb ne maradjon fókuszban (különben a szóköz/Enter újra „megnyomná”)
  document.addEventListener("click", e => { const b = e.target.closest && e.target.closest("button"); if (b && e.detail > 0) b.blur(); });

  let wl = null;
  async function wakeLock() {
    try { if ("wakeLock" in navigator && !wl) { wl = await navigator.wakeLock.request("screen"); wl.addEventListener("release", () => { wl = null; }); } } catch (e) {}
  }
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") wakeLock(); });
  wakeLock();   // már a kezdőképernyőn is (nem csak az első kör indulásakor)

  /* ================= TÁJOLÁS / MÉRETVÁLTÁS ================= */
  let atmeretTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(atmeretTimer);
    atmeretTimer = setTimeout(() => {
      document.querySelectorAll("#jatek-ter .lap").forEach(l => l._illeszt && l._illeszt());
      if (kepernyo === "vonzo") tenyekUjraIllesztese();
      if (kepernyo === "zaro") qrIllesztes();
      if (!$("magyarazat").hidden) magyarazatIllesztes();
      if (kepernyo === "vonzo") cimIllesztes();
    }, 150);
  });

  /* ================= TARTALOMFRISSÍTÉS ================= */
  let frissitesTimer = null;
  // amit a kezdőképernyő mutat: tények, feliratok, a kérdések száma és a tényváltás üteme
  const vonzoLenyomat = t => JSON.stringify([t.tenyek, t.feliratok, t.beallitasok, t.kartyak.length, t.csuszkak.length]);
  async function frissites() {
    clearTimeout(frissitesTimer);
    try {
      await window.DTartalom.frissit();
      if (kepernyo === "vonzo") {
        const regi = vonzoLenyomat(T);
        T = window.DTartalom.aktualis();
        if (regi !== vonzoLenyomat(T)) vonzoInditas();
      }
    } catch (e) { /* a következő körben újra próbáljuk */ }
    clearTimeout(frissitesTimer);
    frissitesTimer = setTimeout(frissites, Math.max(1, B("tartalom_frissites") || 5) * 60 * 1000);
  }
  window.addEventListener("online", frissites);   // amint visszajön a wifi, nem várjuk ki a következő időzített frissítést

  /* ================= DIAGNOSZTIKA ================= */
  if (CFG.rendszer && CFG.rendszer.diagnosztika) {
    let erintesek = [];
    $("diag-sarok").addEventListener("click", e => {
      e.stopPropagation();
      const most = Date.now();
      erintesek = erintesek.filter(t => most - t < 3000); erintesek.push(most);
      if (erintesek.length >= 5) { erintesek = []; diagMutat(); }
    });
  } else $("diag-sarok").hidden = true;
  function diagMutat() {
    $("diag-szoveg").textContent = window.DTartalom.diagnosztika() + "\n\n" + window.DStat.diagnosztika() +
      `\n\nHúzás iránya: ${jobbraIgen ? "jobbra = Tény/Normális" : "jobbra = Tévhit/Orvos"}` +
      `\nKépernyő: ${window.innerWidth}×${window.innerHeight}, online: ${navigator.onLine ? "igen" : "nem"}`;
    $("diag").hidden = false;
  }
  $("diag").addEventListener("click", e => e.stopPropagation());
  $("diag-bezar").onclick = () => { $("diag").hidden = true; };
  $("diag-frissit").onclick = async () => { $("diag-szoveg").textContent = "Frissítés…"; await window.DTartalom.frissit(); T = window.DTartalom.aktualis(); diagMutat(); vonzoInditas(); };
  $("diag-kuld").onclick = async () => { await window.DStat.kuld(); diagMutat(); };

  /* ================= START ================= */
  markaAlkalmaz();
  vonzoInditas();
  // a webbetűk betöltése után újramérjük a címet és a tényt (addig tartalék betűvel mért)
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => {
    if (kepernyo !== "vonzo") return;
    cimIllesztes();
    tenyekUjraIllesztese();
  });
  frissites();

  // tesztekhez
  window.__doughnate = { allapot: () => ({ kepernyo, lepes, kor: kor.map(e => e.id) }), korInditas, vonzoInditas,
    teny: i => { clearInterval(tenyTimer); tenyIndex = i; tenySorrend = T.tenyek.slice(); tenyPakliEpit(); }, tenyValtas,
    elem: id => { const e = T.kartyak.concat(T.csuszkak).find(x => x.id === id); kor = [e]; lepes = 0; mutat("jatek"); elemMutat(); } };
})();
