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
    document.querySelectorAll(".logo-alapitvany").forEach(i => { if (m.alapitvanyLogo) { i.src = m.alapitvanyLogo; i.alt = m.alapitvanyNev || ""; i.hidden = false; } });
    document.querySelectorAll(".logo-rendezveny").forEach(i => { if (m.rendezvenyLogo) { i.src = m.rendezvenyLogo; i.alt = m.rendezvenyNev || ""; i.hidden = false; } });
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

  /* ================= KÉPERNYŐK ================= */
  let kepernyo = "vonzo";
  function mutat(nev) {
    kepernyo = nev;
    document.querySelectorAll(".kepernyo").forEach(s => s.classList.toggle("aktiv", s.id === "kepernyo-" + nev));
    tetlenRejt();
    utolsoErintes = Date.now();
  }

  /* ================= KEZDŐKÉPERNYŐ ================= */
  let tenyIndex = 0, tenyTimer = null, tenySorrend = [];
  function vonzoInditas() {
    T = window.DTartalom.aktualis();
    mutat("vonzo");
    alahuzottSzoveg($("vonzo-cim"), F("vonzo_cim"));
    requestAnimationFrame(cimIllesztes);
    $("vonzo-felhivas").textContent = F("vonzo_felhivas");
    $("vonzo-alcim").textContent = F("vonzo_alcim");
    $("vonzo-alcim").parentElement.hidden = !F("vonzo_alcim");
    const db = Math.min(B("kartyak_szama"), T.kartyak.length) + Math.min(B("csuszkak_szama"), T.csuszkak.length);
    $("vonzo-meta").textContent = db + " kérdés";
    tenySorrend = veletlen(T.tenyek);
    tenyIndex = 0;
    tenyMutat();
    clearInterval(tenyTimer);
    tenyTimer = setInterval(() => { tenyIndex++; tenyMutat(); }, B("teny_valtas_ido") * 1000);
  }
  // a forgó tény betűmérete a kártya szélességéhez igazodik
  const tenyMeret = () => {
    const w = $("vonzo-teny").clientWidth;
    return Math.max(2.4 * vmin(), w * 0.085);
  };
  // A nagy cím egy hosszú szava se lógjon ki a hasábból.
  function cimIllesztes() {
    const c = $("vonzo-cim"), max = (window.innerWidth > window.innerHeight ? 7.8 : 8.6) * vmin();
    let px = max; c.style.fontSize = px + "px";
    for (let i = 0; i < 30 && c.scrollWidth > c.clientWidth + 1 && px > 4 * vmin(); i++) { px *= 0.94; c.style.fontSize = px + "px"; }
  }
  // A nagy szám a kártya szélességéhez igazodik; a hosszú kiemelés (pl. „Minden második”) se lógjon ki.
  function kiemelesIllesztes() {
    const ki = $("teny-kiemeles"), w = $("vonzo-teny").clientWidth;
    let px = Math.max(5 * vmin(), w * 0.15); ki.style.fontSize = px + "px";
    for (let i = 0; i < 20 && ki.scrollWidth > ki.clientWidth + 1; i++) { px *= 0.92; ki.style.fontSize = px + "px"; }
  }
  function tenyMutat() {
    const doboz = $("vonzo-teny");
    if (!tenySorrend.length) { doboz.style.visibility = "hidden"; return; }
    doboz.style.visibility = "";
    const t = tenySorrend[tenyIndex % tenySorrend.length];
    doboz.classList.add("halvanyul");
    setTimeout(() => {
      $("teny-kiemeles").textContent = t.kiemeles;
      $("teny-kiemeles").hidden = !t.kiemeles;
      kiemelesIllesztes();
      $("teny-szoveg").textContent = t.szoveg;
      illeszt($("teny-szoveg"), tenyMeret(), 2.4 * vmin());
      doboz.classList.remove("halvanyul");
    }, tenySorrend.length > 1 ? 350 : 0);
  }

  /* ================= KÖR ÖSSZEÁLLÍTÁSA ================= */
  const KORABBI_KULCS = "doughnate_korabbi_v1";
  function korabbiOlvas() { try { return JSON.parse(localStorage.getItem(KORABBI_KULCS) || "[]"); } catch (e) { return korabbiMem; } }
  let korabbiMem = [];
  function korabbiIr(korIdk) {
    const n = Math.max(0, (CFG.rendszer && CFG.rendszer.kerulendoKorok) || 1);
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
    const h = $("haladas"); h.innerHTML = "";
    kor.forEach((_, i) => h.appendChild(el("span", "pont" + (i < lepes ? " kesz" : i === lepes ? " most" : ""))));
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

  function elemMutat() {
    valaszolt = false;
    $("magyarazat").hidden = true;
    const ter = $("jatek-ter"); ter.innerHTML = "";
    const elem = kor[lepes];
    haladasRajzol();
    if (elem.tipus === "csuszka") csuszkaMutat(elem, ter);
    else kartyaMutat(elem, ter);
  }

  /* ---------- KÁRTYA ---------- */
  function kartyaMutat(k, ter) {
    const jb = jobbBal(k.tipus);
    const kartya = el("div", "kartya belep");
    kartya.appendChild(el("div", "kartya-tipus", F(k.tipus === "teny_tevhit" ? "tipus_teny_tevhit" : "tipus_normalis_orvos")));
    const szovegDoboz = el("div", "kartya-szoveg-doboz");
    const szoveg = el("div", "kartya-szoveg", k.allitas);
    szovegDoboz.appendChild(szoveg);
    kartya.appendChild(szovegDoboz);
    if (lepes === 0 || (lepes === 1 && kor[0].tipus === "csuszka")) kartya.appendChild(el("div", "huzas-tipp", F("huzas_tipp")));
    const pecsetBal = el("div", "pecset pecset-bal oldal-" + jb.bal.oldal, jb.bal.felirat);
    const pecsetJobb = el("div", "pecset pecset-jobb oldal-" + jb.jobb.oldal, jb.jobb.felirat);
    kartya.appendChild(pecsetBal); kartya.appendChild(pecsetJobb);
    ter.appendChild(kartya);
    requestAnimationFrame(() => {
      illeszt(szoveg, 6 * vmin(), 2.8 * vmin());
      setTimeout(() => kartya.classList.remove("belep"), 20);
    });

    // gombok
    const gBal = $("gomb-bal"), gJobb = $("gomb-jobb");
    $("valasz-gombok").className = "valasz-gombok";
    gBal.textContent = "← " + jb.bal.felirat; gBal.className = "nagy-gomb gomb-bal oldal-" + jb.bal.oldal;
    gJobb.textContent = jb.jobb.felirat + " →"; gJobb.className = "nagy-gomb gomb-jobb oldal-" + jb.jobb.oldal;
    gBal.onclick = () => kartyaValasz(k, kartya, -1, jb.bal.kod);
    gJobb.onclick = () => kartyaValasz(k, kartya, 1, jb.jobb.kod);

    huzhato(kartya, irany => kartyaValasz(k, kartya, irany, irany > 0 ? jb.jobb.kod : jb.bal.kod), (dx, w) => {
      const a = Math.min(1, Math.abs(dx) / (w * 0.25));
      pecsetJobb.style.opacity = dx > 0 ? a : 0;
      pecsetBal.style.opacity = dx < 0 ? a : 0;
    });
  }

  // Húzás: pointer események. A küszöb a kártya szélességének 25%-a, vagy gyors pöccintés.
  function huzhato(kartya, kesz, mozgas) {
    let x0 = 0, y0 = 0, t0 = 0, dx = 0, aktivHuzas = false, id = null;
    kartya.addEventListener("pointerdown", e => {
      if (valaszolt) return;
      aktivHuzas = true; id = e.pointerId; x0 = e.clientX; y0 = e.clientY; t0 = performance.now(); dx = 0;
      try { kartya.setPointerCapture(id); } catch (_) {}
      kartya.classList.add("huzas");
    });
    kartya.addEventListener("pointermove", e => {
      if (!aktivHuzas || e.pointerId !== id) return;
      dx = e.clientX - x0;
      const dy = (e.clientY - y0) * 0.25;
      kartya.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx / 20}deg)`;
      mozgas(dx, kartya.offsetWidth);
    });
    const vege = e => {
      if (!aktivHuzas || e.pointerId !== id) return;
      aktivHuzas = false;
      kartya.classList.remove("huzas");
      const w = kartya.offsetWidth, dt = performance.now() - t0, seb = Math.abs(dx) / Math.max(dt, 1);
      if (Math.abs(dx) > w * 0.25 || (Math.abs(dx) > 40 && seb > 0.6)) kesz(dx > 0 ? 1 : -1);
      else { kartya.style.transform = ""; mozgas(0, w); }
    };
    kartya.addEventListener("pointerup", vege);
    kartya.addEventListener("pointercancel", vege);
  }

  function kartyaValasz(k, kartya, irany, kod) {
    if (valaszolt) return;
    valaszolt = true;
    kartya.classList.add("kirepul");
    kartya.style.transform = `translate(${irany * 120}vw, 0) rotate(${irany * 25}deg)`;
    const helyes = kod === k.helyes;
    window.DStat.rogzit({ kor_azonosito: korId, esemeny: "valasz", elem_id: k.id, elem_tipus: k.tipus, valasz: kod, helyes: helyes ? "IGEN" : "NEM" });
    const o = oldalak(k.tipus);
    const helyesFelirat = (o.igen.kod === k.helyes ? o.igen : o.nem).felirat;
    magyarazatMutat({ helyes, helyesSor: "Helyes válasz: " + helyesFelirat, szoveg: k.magyarazat, forras: k.forras, orvos: k.tipus === "normalis_orvos" });
  }

  /* ---------- CSÚSZKA ---------- */
  function csuszkaMutat(c, ter) {
    const doboz = el("div", "kartya csuszka-kartya belep");
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
    ter.appendChild(doboz);

    const frissit = () => {
      kijelzo.textContent = fmt(ertek) + (c.egyseg ? " " + c.egyseg : "");
      input.value = ertek;
      input.style.setProperty("--kitoltes", ((ertek - c.min) / (c.max - c.min) * 100) + "%");
    };
    input.addEventListener("input", () => { ertek = kerekit(Number(input.value)); frissit(); });
    minusz.onclick = () => { if (!valaszolt) { ertek = kerekit(ertek - c.lepes); frissit(); } };
    plusz.onclick = () => { if (!valaszolt) { ertek = kerekit(ertek + c.lepes); frissit(); } };
    frissit();
    requestAnimationFrame(() => { illeszt(kerdes, 5.2 * vmin(), 2.6 * vmin()); setTimeout(() => doboz.classList.remove("belep"), 20); });

    $("valasz-gombok").className = "valasz-gombok egy";
    const g = $("gomb-jobb");
    g.textContent = F("gomb_tippelek") + " →"; g.className = "nagy-gomb gomb-sarga";
    $("gomb-bal").onclick = null;
    g.onclick = () => {
      if (valaszolt) return;
      valaszolt = true; input.disabled = true;
      const helyes = Math.abs(ertek - c.helyes) <= c.tures + 1e-9;
      window.DStat.rogzit({ kor_azonosito: korId, esemeny: "valasz", elem_id: c.id, elem_tipus: "csuszka", valasz: String(ertek), helyes: helyes ? "IGEN" : "NEM" });
      const egys = c.egyseg ? " " + c.egyseg : "";
      magyarazatMutat({ helyes, helyesSor: `${F("csuszka_helyes_ertek")} ${fmt(c.helyes)}${egys} · a te tipped: ${fmt(ertek)}${egys}`,
        szoveg: c.magyarazat, forras: c.forras, orvos: false });
    };
  }

  /* ---------- MAGYARÁZAT ---------- */
  let tovabbTimer = null;
  function magyarazatMutat({ helyes, helyesSor, szoveg, forras, orvos }) {
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
    elemMutat();
  }
  $("tovabb").addEventListener("click", tovabb);

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
    $("zaro-szoveg").textContent = F("zaro_szoveg");
    $("gomb-uj-kor").textContent = F("gomb_uj_kor") + " →";
    $("jogi-zaro").textContent = F("jogi_megjegyzes");
    const racs = $("qr-racs"); racs.innerHTML = "";
    racs.dataset.db = T.zaro.length;
    for (const z of T.zaro) {
      const d = el("div", "qr-elem");
      if (z.kiemelt) d.appendChild(el("div", "qr-kiemelt", z.kiemelt));
      const kep = el("div", "qr-kep");
      kep.innerHTML = qrSvg(z.url);
      d.appendChild(kep);
      d.appendChild(el("div", "qr-felhivas", F("zaro_qr_felhivas")));
      if (z.cim) d.appendChild(el("div", "qr-cim", z.cim));
      if (z.leiras) d.appendChild(el("div", "qr-leiras", z.leiras));
      racs.appendChild(d);
    }
    requestAnimationFrame(qrIllesztes);
    zaroIdozit();
  }
  // A QR-kódok méretét addig csökkenti, amíg minden kifér a képernyőre (1–4+ kód, bármely tájolás).
  function qrIllesztes() {
    const sec = $("kepernyo-zaro"), racs = $("qr-racs"), n = T.zaro.length;
    if (!n) return;
    const fekvo = window.innerWidth > window.innerHeight;
    let v = fekvo ? (n === 1 ? 54 : n === 2 ? 36 : 28) : (n === 1 ? 48 : n === 2 ? 34 : 28);
    const kifer = () => {
      const b = sec.getBoundingClientRect(), cs = getComputedStyle(sec), tur = 1.5 * vmin();   // tűrés a döntött kártyák miatt
      const sr = { top: b.top + parseFloat(cs.paddingTop) - tur, bottom: b.bottom - parseFloat(cs.paddingBottom) + tur,
                   left: b.left + parseFloat(cs.paddingLeft) - tur, right: b.right - parseFloat(cs.paddingRight) + tur };
      const elemek = [...sec.children].filter(c => !c.hidden && !c.classList.contains("qr-racs") && !c.classList.contains("kereszt"));
      const qrk = [...racs.children];
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
    racs.style.setProperty("--oszlop", n <= 2 ? n : n <= 4 ? 2 : 3);
    racs.style.setProperty("--qr-meret", v + "vmin");
    for (let i = 0; i < 30 && !kifer() && v > 14; i++) { v *= 0.93; racs.style.setProperty("--qr-meret", v.toFixed(2) + "vmin"); }
  }
  function zaroIdozit() {
    clearTimeout(zaroTimer);
    zaroTimer = setTimeout(() => { if (kepernyo === "zaro") vonzoInditas(); }, B("zarokepernyo_ido") * 1000);
  }
  function qrSvg(url) {
    try {
      const q = window.qrcode(0, "M");
      q.addData(url); q.make();
      return q.createSvgTag({ cellSize: 8, margin: 2, scalable: true });
    } catch (e) { return `<div class="qr-hiba">${url}</div>`; }
  }
  $("gomb-uj-kor").addEventListener("click", e => { e.stopPropagation(); clearTimeout(zaroTimer); korInditas(); });

  /* ================= TÉTLENSÉG ================= */
  let utolsoErintes = Date.now(), tetlenAktiv = false, tetlenVege = 0;
  function tetlenRejt() { tetlenAktiv = false; $("tetlen").hidden = true; }
  setInterval(() => {
    if (kepernyo !== "jatek") return;
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
      if (maradt <= 0) { clearTimeout(tovabbTimer); vonzoInditas(); }
    }
  }, 250);
  $("tetlen").addEventListener("click", e => { e.stopPropagation(); tetlenRejt(); utolsoErintes = Date.now(); });

  document.addEventListener("pointerdown", () => {
    utolsoErintes = Date.now();
    if (kepernyo === "zaro") zaroIdozit();
  }, true);

  /* ================= INDÍTÁS ÉRINTÉSRE ================= */
  $("kepernyo-vonzo").addEventListener("click", () => { if (kepernyo === "vonzo") korInditas(); });

  /* ================= KIOSZK VÉDELEM ================= */
  document.addEventListener("contextmenu", e => e.preventDefault());
  document.addEventListener("gesturestart", e => e.preventDefault());
  document.addEventListener("gesturechange", e => e.preventDefault());
  document.addEventListener("dblclick", e => e.preventDefault(), { passive: false });
  document.addEventListener("touchstart", e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  document.addEventListener("touchmove", e => {
    if (e.target.closest && e.target.closest("input[type=range], .diag pre")) return;
    e.preventDefault();
  }, { passive: false });
  document.addEventListener("selectstart", e => e.preventDefault());
  document.addEventListener("dragstart", e => e.preventDefault());
  window.addEventListener("keydown", e => { if (e.key === "Tab" || (e.metaKey || e.ctrlKey)) e.preventDefault(); });

  let wl = null;
  async function wakeLock() {
    try { if ("wakeLock" in navigator && !wl) { wl = await navigator.wakeLock.request("screen"); wl.addEventListener("release", () => { wl = null; }); } } catch (e) {}
  }
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") wakeLock(); });

  /* ================= TÁJOLÁS / MÉRETVÁLTÁS ================= */
  let atmeretTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(atmeretTimer);
    atmeretTimer = setTimeout(() => {
      document.querySelectorAll(".kartya-szoveg").forEach(s => illeszt(s, (s.closest(".csuszka-kartya") ? 5.2 : 6) * vmin(), 2.6 * vmin()));
      if (kepernyo === "vonzo" && tenySorrend.length) { kiemelesIllesztes(); illeszt($("teny-szoveg"), tenyMeret(), 2.4 * vmin()); }
      if (kepernyo === "zaro") qrIllesztes();
      if (!$("magyarazat").hidden) magyarazatIllesztes();
      if (kepernyo === "vonzo") cimIllesztes();
    }, 150);
  });

  /* ================= TARTALOMFRISSÍTÉS ================= */
  let frissitesTimer = null;
  async function frissites() {
    await window.DTartalom.frissit();
    if (kepernyo === "vonzo") {
      const regiTeny = JSON.stringify(T.tenyek), regiF = JSON.stringify(T.feliratok);
      T = window.DTartalom.aktualis();
      if (regiTeny !== JSON.stringify(T.tenyek) || regiF !== JSON.stringify(T.feliratok)) vonzoInditas();
    }
    clearTimeout(frissitesTimer);
    frissitesTimer = setTimeout(frissites, Math.max(1, B("tartalom_frissites")) * 60 * 1000);
  }

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
  frissites();

  // tesztekhez
  window.__doughnate = { allapot: () => ({ kepernyo, lepes, kor: kor.map(e => e.id) }), korInditas, vonzoInditas,
    teny: i => { clearInterval(tenyTimer); tenyIndex = i; tenySorrend = T.tenyek.slice(); tenyMutat(); },
    elem: id => { const e = T.kartyak.concat(T.csuszkak).find(x => x.id === id); kor = [e]; lepes = 0; mutat("jatek"); elemMutat(); } };
})();
