# Doughnate kiosk site – handover brief

Oct 26, 2026 · @Bence

## Project summary

We are building a simple, interactive educational kiosk site in Hungarian for the “Együtt könnyebb” Női Egészségért Alapítvány, Hungary's only patient organisation for endometriosis. It runs on one iPad at Mito Doughnate, Mito's internal charity bake sale, so people learn about the cause while they queue.

The site is static: no server, no backend. It reads all content from a Google Sheet published as CSV and is hosted on GitHub Pages. The format is one 60–90 second swipe round, modelled on Mito's earlier conference site Módszermatch (pmsz.mito.hu).

This brief wraps up the planning chat so the build can continue in a Cowork session with direct access to the project folder.

## Event context and audience

The event opens with breakfast, then the sale starts and people queue at the cake stands. Colleagues sell their own baking, coffee is available, and all proceeds go to the foundation. The event date is not fixed yet.

- **Time per player:** roughly 1–3 minutes; people may leave mid-game when it's their turn.
- **Hands:** often one hand holds a coffee or a cookie, so everything must work one-handed.
- **Onlookers:** several people may watch over the player's shoulder, so text must read from a step away.
- **Audience:** mixed women and men, mostly with little prior knowledge. Men should feel addressed too (“do you know what the women around you go through?”).
- **Children** may be present.
- **Donations** happen on phones via QR codes, never on the tablet.

## Decisions made

All of these were confirmed in the planning chat.

| Area | Decision |
| --- | --- |
| Stack | Plain HTML/CSS/JS, no build step, no framework. |
| Hosting | GitHub Pages (free plan needs a public repo; there are no secrets in it). |
| Device | iPad with Chrome. Chrome on iPad uses Safari's engine: no fullscreen API, so kiosk lock relies on Guided Access. Portrait and landscape both supported. |
| Round | About 60–90 seconds. Mix of “Tény vagy tévhit?” and “Normális vagy menj orvoshoz?” cards plus 1–2 “Tippeld meg a számot!” sliders. Counts set in the sheet (proposed 6 cards + 1 slider). |
| Answering | Swipe (like Módszermatch) plus big tap buttons. Proposed mapping: right = Tény / Normális, left = Tévhit / Menj orvoshoz (not yet confirmed). |
| Explanation | Shown after every answer; auto-advances after a delay set in the sheet (proposed 6 s). |
| Sliders | Correct if within a per-row tolerance set in the sheet. |
| Card picking | Random each round, both types mixed, avoiding the previous round's cards. |
| Score | No score on the end screen, just the closing message. |
| Attract screen | Large rotating facts readable passively; a tap starts the game. |
| Idle | About 20 s idle → “Itt vagy még?” prompt → about 10 s later, reset to the attract screen. |
| Closing screen | QR codes from the sheet's Zaro tab. Start with one: the foundation's website. More (podcast, etc.) can be added later without code changes. |
| Visible counter | Dropped completely (no “X people played today”, no daily goal). |
| Statistics | Each answer and each completed round is sent to a hidden Statisztika tab in the same Google Sheet via Google Apps Script. Offline: rounds queue on the tablet and send when Wi-Fi returns. The script URL sits in the public repo, so junk rows are possible; accepted as low risk. |
| Content feed | Google Sheet tabs published as CSV, read at start-up and refreshed periodically. Malformed rows are skipped. A default content file is bundled and the last good content is cached, so a Wi-Fi drop never stops the game. |
| Kiosk safeguards | No zoom, scroll or navigation away; large one-handed touch targets; readable from a step away. |
| Handover | All brand settings (sheet URLs, Apps Script URL, colours, logos, Mito/bake-sale references) in one config file. README in Hungarian, for non-developers. |
| Content | Written by the user's team, not by Claude. Claude provides the structure. |

## Content sheet structure

The template is Doughnate\_tartalom\_sablon.xlsx, built in the planning chat; the user downloads it and imports it into Google Sheets (File → Import → Replace spreadsheet). Row 1 of every tab holds the machine-readable column keys the site reads; they must not be renamed. Unknown extra columns are ignored.

| Tab | Published? | Columns |
| --- | --- | --- |
| Utmutato | No | Hungarian guide for content writers. |
| Kartyak | Yes (CSV) | id, aktiv (IGEN/NEM), tipus (teny\_tevhit / normalis\_orvos), allitas (max 120 chars), helyes\_valasz (TENY/TEVHIT or NORMALIS/ORVOS), magyarazat (max 280), forras, megjegyzes |
| Csuszkak | Yes (CSV) | id, aktiv, kerdes, min, max, lepes, helyes\_ertek, tures, mertekegyseg, magyarazat, forras, megjegyzes |
| Tenyek | Yes (CSV) | id, aktiv, kiemeles (big number, optional), szoveg (max 120), forras, megjegyzes |
| Feliratok | Yes (CSV) | kulcs, szoveg (empty = bundled default), hol\_jelenik\_meg. 23 keys pre-filled, e.g. vonzo\_cim, gomb\_teny, gomb\_orvos, visszajelzes\_helyes, orvos\_lablec, idle\_kerdes, zaro\_cim, jogi\_megjegyzes |
| Zaro | Yes (CSV) | id, aktiv, sorrend, cim, leiras, url (https://), kiemelt\_szoveg, megjegyzes. Row Z-001 = https://www.endometriozismagyarorszag.hu |
| Beallitasok | Yes (CSV) | kulcs, ertek, mertekegyseg, leiras: kartyak\_szama 6, csuszkak\_szama 1, magyarazat\_ido 6 s, tetlenseg\_ido 20 s, tetlenseg\_visszaszamlalas 10 s, zarokepernyo\_ido 45 s, teny\_valtas\_ido 7 s, tartalom\_frissites 5 min |
| Statisztika | No | Written by Apps Script: idopont, kor\_azonosito, esemeny (valasz / kor\_vege), elem\_id, elem\_tipus, valasz, helyes (IGEN/NEM) |
| Osszesites | No | Formulas: completed rounds, answers, accuracy, and per-card/slider answers, misses and miss rate |

Rows that the site skips as malformed: missing id or text, unknown type, an answer that doesn't fit the type, non-numeric slider values, or a correct slider value outside min–max. Example rows start with PELDA and are inactive.

**The orvos\_lablec key** holds the text shown under every normalis\_orvos card. It enforces the “point to a gynaecologist and the specialist list” rule by design.

**Caching:** Google caches published CSVs for a few minutes, so edits show on the tablet in roughly 5–10 minutes.

## Content boundaries

The site informs but never diagnoses.

- Symptom cards always point to a gynaecologist and the foundation's specialist list.
- No drug names or dosages.
- Diet claims only with “according to the foundation's guide” framing.
- Sexuality stays general, because children may be present.
- Sources: the foundation's three publications (Endometriózis Kisokos, Mensi box booklet, pre-surgery guide), summarised in the project's source extract, which also lists known inconsistencies.

## Open items and materials needed

Three materials block the design and build; the rest can be settled later through the sheet or config.

**Needed to start building**

- [ ] Módszermatch source code (mechanics and feel are the starting point)
- [ ] Example pages from Mito and from the foundation, to combine both brands visually
- [ ] Logo files (SVG if possible), brand fonts with web licences, any usable illustrations

**Open, not blocking**

- [ ] Swipe direction mapping: confirm right = Tény / Normális, left = Tévhit / Menj orvoshoz
- [ ] Hidden stats control: the user asked for stats in a “database” (now the Statisztika tab); decide whether any on-device admin screen is still needed, and how to open it
- [ ] Further QR links (podcast etc.) beyond the foundation's website
- [ ] Whether to promote the Lucy app (one of the foundation's advertisers)
- [ ] Founding year conflict in the sources: “2009 óta” vs “2010 óta, 2014 óta alapítvány”
- [ ] Foundation permission for logo and slogan use
- [ ] Event date and the date a test version is needed on the iPad
- [ ] Google Sheet: import the template, publish the 6 content tabs as CSV, share the links
- [ ] Visual direction: how strongly the Doughnate (doughnut/baking) theme shows vs. foundation branding

## Next steps for the Cowork session

Start Cowork with access to the Noi\_egeszsegert\_doughnate folder and give it this brief, the source extract, and the xlsx template.

1. Save Doughnate\_tartalom\_sablon.xlsx into the project folder and import it into Google Sheets.
2. Share the Módszermatch source and the brand examples, and settle the swipe mapping.
3. Build a first clickable version against bundled default content (attract screen, round, explanation, idle reset, closing screen with QR).
4. Test it on the actual iPad early, inside Guided Access, in both orientations.
5. Connect the published CSV tabs and the Apps Script stats endpoint through the config file.
6. Write the Hungarian README: editing the sheet, publishing tabs, deploying to GitHub Pages, setting up the Apps Script, enabling Guided Access.

Working style agreed in the chat: ask questions before assuming, and only assume when told to.
