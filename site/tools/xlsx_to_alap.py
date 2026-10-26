"""Doughnate_tartalom.xlsx -> site/content/alap_tartalom.js (beépített alaptartalom)."""
import json, sys, datetime, openpyxl
src, dst = sys.argv[1], sys.argv[2]
wb = openpyxl.load_workbook(src, data_only=True)

def sor_lista(tab):
    ws = wb[tab]; rows = list(ws.iter_rows(values_only=True))
    fej = [str(h).strip() if h is not None else "" for h in rows[0]]
    out = []
    for r in rows[1:]:
        if not any(c not in (None, "") for c in r): continue
        o = {}
        for k, v in zip(fej, r):
            if not k or k == "megjegyzes": continue
            if v is None: v = ""
            elif isinstance(v, float) and v.is_integer(): v = int(v)
            o[k] = str(v).strip() if not isinstance(v, (int, float)) else str(v)
        out.append(o)
    return out

kartyak = sor_lista("Kartyak"); csuszkak = sor_lista("Csuszkak"); tenyek = sor_lista("Tenyek"); zaro = sor_lista("Zaro")
feliratok = {r["kulcs"]: r["szoveg"] for r in sor_lista("Feliratok") if r.get("kulcs")}
beall = {}
for r in sor_lista("Beallitasok"):
    try: beall[r["kulcs"]] = float(str(r["ertek"]).replace(",", "."))
    except (ValueError, KeyError): pass
beall = {k: (int(v) if v.is_integer() else v) for k, v in beall.items()}

ma = datetime.date.today().isoformat()
fejlec = f"""/*
 * BEÉPÍTETT ALAPTARTALOM – generálva: {src.split('/')[-1]} ({ma})
 * =================================================================
 * Ezt használja a játék, ha még soha nem tudta betölteni a közzétett Google Táblázatot
 * (pl. nincs beállítva link, vagy az első indításkor nincs internet).
 * Ha egyszer sikerült a betöltés, a tablet az utolsó jó tartalmat megjegyzi,
 * és internet nélkül is azzal fut tovább.
 * A tartalmat a Google Táblázatban szerkeszd; ez a fájl csak tartalék.
 */
"""
def j(x): return json.dumps(x, ensure_ascii=False, indent=2)
body = (fejlec + "window.DOUGHNATE_ALAP = {\n"
  f"  Kartyak: {j(kartyak)},\n\n  Csuszkak: {j(csuszkak)},\n\n  Tenyek: {j(tenyek)},\n\n"
  f"  Feliratok: {j(feliratok)},\n\n  Zaro: {j(zaro)},\n\n  Beallitasok: {j(beall)}\n}};\n")
open(dst, "w", encoding="utf-8").write(body)
print(len(kartyak), len(csuszkak), len(tenyek), len(feliratok), len(zaro), beall)
