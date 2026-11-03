/* CSV-olvasó (RFC 4180: idézőjelek, sortörés cellán belül, "" escape). */
(function () {
  function parseCSV(text) {
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    const rows = [];
    let row = [], cell = "", i = 0, inQ = false;
    while (i < text.length) {
      const c = text[i];
      if (inQ) {
        if (c === '"') {
          if (text[i + 1] === '"') { cell += '"'; i += 2; continue; }
          inQ = false; i++; continue;
        }
        cell += c; i++; continue;
      }
      if (c === '"') { inQ = true; i++; continue; }
      if (c === ",") { row.push(cell); cell = ""; i++; continue; }
      if (c === "\r") { i++; continue; }
      if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; i++; continue; }
      cell += c; i++;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }

  /* Első sor = oszlopkulcsok. Visszaad: { fejlec:[...], sorok:[{kulcs:érték}] } */
  function csvToObjects(text) {
    const rows = parseCSV(text);
    if (!rows.length) return { fejlec: [], sorok: [] };
    const fejlec = rows[0].map(h => h.trim());
    const sorok = [];
    for (let r = 1; r < rows.length; r++) {
      const cells = rows[r];
      if (cells.every(c => c.trim() === "")) continue;
      const o = { _sor: r + 1 };
      fejlec.forEach((h, k) => { if (h) o[h] = (cells[k] || "").trim(); });
      sorok.push(o);
    }
    return { fejlec, sorok };
  }

  window.DCSV = { parseCSV, csvToObjects };
})();
