# Eight days, one brief: building a charity kiosk

Nov 11, 2026 · @Bence

In eight days I went from three patient booklets to a working touch-screen quiz for a charity bake sale, built with an AI assistant. The speed did not come from the code. It came from a written brief that settled almost every decision before the first file existed, and the places where the build got stuck were the places the brief had left open.

## The project in brief

Once a year, colleagues at my company bake cakes and sell them to each other, and all the money goes to one charity. This time it was a small patient organisation for endometriosis, a condition that affects about one woman in ten and takes years to diagnose. I wanted people in the cake queue to learn something while they waited. The answer was a kiosk: one iPad, a 60 to 90 second round of swipe cards ("Tény vagy tévhit?", "Normális vagy menj orvoshoz?"), number-guess sliders, and QR codes at the end for donating on your own phone.

|  |  |
| --- | --- |
| Users | Adult colleagues queuing at the bake sale, mostly with little prior knowledge; the content team that edits the texts |
| Time | Planning brief 26 October 2026; last commit 3 November 2026 |
| How it was built | A planning chat with an AI assistant, then a build session where the assistant worked directly in my project folder |
| Stack | Plain HTML, CSS and JavaScript, no framework, no build step; content from a Google Sheet published as CSV; statistics through Google Apps Script |
| Size | 32 files; about 2,000 lines of code, plus a 527-line bundled content file and a 186-line README |
| Content | 34 cards, 5 sliders, 10 rotating facts, 23 interface labels, 3 QR links |
| Documents | Source extract of the three booklets, handover brief, Hungarian README, build status note |

&#91;SCREENSHOT: the start screen with a rotating fact, and a card mid-swipe\]

## How the work was divided

The project had two working sessions with the assistant: a planning chat that ended in a handover brief, and a build session in which the assistant worked directly in my project folder. Around them sat two groups of people who were not developers at all.

&#91;embedded content: who did what · 4 parties, 3 stages\]

The assistant's lane is empty in the last column. Every open item belongs to a person.

## The decisions

The brief ended with a table of 18 confirmed decisions, from the stack to the idle timer. Three of them shaped everything after.

**The content lives in a spreadsheet, not in the code.** The brief says it plainly: content is "written by the user's team, not by Claude. Claude provides the structure." So the assistant built a sheet template with nine tabs, machine-readable column keys in row 1, and rules for which rows the site skips as malformed. Every timer, label and QR link is a cell. That one decision is why the code could be written before a single card existed, and why a colleague could fill in 34 cards in parallel.

**The kiosk has to survive the room.** One hand holds a coffee, people watch over the player's shoulder, the Wi-Fi may drop, and the next customer may walk off mid-round. Each of those became a rule before the build: big tap buttons next to the swipe, text readable from a step away, a cached copy of the last good content plus a bundled fallback, an "Itt vagy még?" prompt after 20 seconds and a reset 10 seconds later. The brief also caught a platform fact early: Chrome on an iPad runs on Safari's engine and has no fullscreen API, so the lock-down relies on the iPad's Guided Access instead of code.

**One rule I had to correct.** The first source extract assumed children might be at the sale and told the content to stay general about sexuality. On 3 November I confirmed it is adults only, which matters for a condition where painful intercourse is a real symptom. The correction was cheap in the places that had one owner: one paragraph in the brief, one in the README, and a single label (`orvos_lablec`) that already sent every symptom card to a gynaecologist. It was not fully cheap: the old rule still sits in the source extract and in the guide tab of the spreadsheet, because nobody owns those two copies any more.

Two things were dropped on purpose: a visible "X people played today" counter, and any score on the end screen. I asked for statistics "in a database"; they now go to a hidden tab in the same sheet, where only the team sees them.

## The system in one picture

&#91;embedded content: system parts · sheet in, script out\]

The whole thing is a static page between two halves of one spreadsheet. A few calls in it were mine to make:

- **A public script address.** The free hosting plan needs a public repository, so the address that receives statistics is visible to anyone. We accepted junk rows as a low risk; the script only takes known event types and trims long text.
- **Slow edits, safe rounds.** Google caches published CSVs, so a change in the sheet reaches the tablet in about 5 to 10 minutes. New content only applies at the start of the next round, never mid-game.
- **A hidden diagnostics screen.** Five taps in the top-left corner show skipped rows and queued data. Whether it stays for the event is still undecided.

## Where it got stuck

I do not have a log of every snag, only what the files and the git history still show. Those are enough to see a pattern.

| What happened | What it actually was | What I needed to know |
| --- | --- | --- |
| The brief and the README say the site is hosted on GitHub Pages. The last commit, titled "fixed", adds a Cloudflare ignore file and a service worker. | The hosting changed late, and the README did not follow. \[ADD: confirm why the host changed\] | Which files a host publishes. The ignore file exists to keep the README, the Apps Script and the tools folder off the public site. |
| The git repository sits one level too high: in the project folder, not in the site folder. | Every booklet PDF, logo file and planning document shows up as untracked next to the code. | The brief had already said the free plan needs a public repository. One careless `git add .` would have published the working files. |
| The folder holds three copies of the logo PDF, three of a booklet, two of another. | Repeated downloads of the same attachments, named "(1)" and "(2)". | Nothing clever, just to keep the sources tidy before a tool starts reading them. |
| One logo arrived only as a JPEG, the other only inside a PDF. The PDF logo still prints the organisation's old web address. | The assistant made the JPEG transparent and pulled an SVG out of the PDF. Neither fixes the old address. | The brief listed logo files and permission as blocking on day one. They were still open on the last day. |
| The newsletter sign-up form went in on the last day. | A new feature that collects e-mail addresses on a shared tablet. Consent and privacy texts are marked \[TERVEZET\]. | Personal data changes the job: the Apps Script must be redeployed as a new version, and the legal wording has to come from the organisation. |
| Three typos in the content ("becsélsei", "jáfni", "támogasd- sokat"). | Spotted during the content import and deliberately left alone. | Who owns the words. The brief said the team writes the content, so the fix belongs to them. |

Three patterns stand out. First, almost nothing got stuck inside the code. The snags sat at the edges: hosting, brand assets, legal text, other people's files. Second, every decision that lived in one place stayed true, and every decision copied into two places drifted, from the hosting note to the children rule. Third, the late additions cost the most. The sign-up form was not in the brief, and it is the only feature that still cannot go live.

## What the assistant could not do

The assistant wrote the code, the sheet template, the source extract and the README. Its limits drew the outline of my part.

- **It could not write the content.** It could summarise the booklets and list quiz-ready facts with their sources, but the cards themselves came from my colleagues. That was a choice, not a weakness: a patient organisation's message should not be drafted by a tool and approved by nobody.
- **It could not sign anything off.** Consent wording, logo permission and the right web address are the organisation's to give. The assistant marked them as drafts and moved on; chasing them is my job.
- **It could not touch the accounts.** Publishing the sheet tabs, deploying the Apps Script under a Google account and setting up the host all need my logins. The README spells out each click in Hungarian, but someone still has to make them.
- **It could not hold the iPad.** The motion, the on-screen keyboard over the sign-up form and Guided Access can only be judged on the device. That test is still on the open list.

## The result and the lessons

What exists now is a clickable kiosk: an attract screen with rotating facts, a mixed round of cards and sliders with swipe and buttons, an explanation after every answer, an idle reset, a closing screen with QR codes, offline statistics, a newsletter form and a hidden diagnostics screen. The content team can change any text from the spreadsheet without touching code. \[ADD: how the bake sale went — rounds played, what people said, money raised if you want to share it\]

&#91;SCREENSHOT: the closing screen with the QR codes\]

For anyone starting the same way:

1. Write the brief before the build, and make it a table of decisions, not a description. Each row is a question nobody has to ask again mid-build.
2. Keep each rule in one place. A rule copied into a second document will drift.
3. List the materials that block you, and chase them on day one. The code waited for nobody; the logos did.
4. Decide who owns the words. If the content is someone else's, build the structure for them and leave their typos to them.
5. Treat a late feature as a new brief. The one feature added outside the plan is the one still waiting on legal text.
6. Check where your repository starts before the first commit.

The assistant made the build fast, but it did not make the decisions. Eight days was possible because most of them were already on paper on day one. Everything still open on the list is something the brief either left open or never knew about.

## Hand-over notes (delete before publishing)

**Placeholders to fill**

- [ ] &#91;SCREENSHOT\] start screen with a fact and a card mid-swipe (The project in brief)
- [ ] &#91;ADD\] why the host changed from GitHub Pages to Cloudflare (Where it got stuck)
- [ ] &#91;ADD\] how the bake sale went (The result)
- [ ] &#91;SCREENSHOT\] closing screen with the QR codes (The result)

**Statements about your thinking that I inferred — please confirm or change**

- That the "children may be present" rule was your assumption to correct. It sits in the source extract under your name, but I can't see who proposed it.
- That leaving the content to the team was a deliberate choice about who should speak for the organisation.
- That chasing sign-offs is your job, and the closing claim that the assistant sped up the build but did not make the decisions.
- That the hosting moved to Cloudflare. I read this from the ignore file in the last commit; the README still says GitHub Pages.
- That the organisation sent the logo files.

**Left out on purpose:** the organisation's name, brand name and web address; your employer, the event name and the earlier conference site; your colleague's name; the GitHub account; tax number, bank details and e-mail addresses from the source extract.

**Where the figures came from:** file and line counts measured in the site folder (32 files; `wc -l` per file); dates from the brief (26 October) and the git log (both commits on 3 November); content counts and open items from the build status note; the 18 decisions counted in the brief's table.

**Not verified:** I could not read the planning chat or the build chat, so the incident table only uses what the files show. I have not checked how the two diagrams come out in a Markdown export for your blog; they may need to be saved as images.
