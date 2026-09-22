# CURRENT

Front-end prototype for a sailing product concept: a shareable sailing profile, plus a small "find a sail" browse. Plain HTML, CSS and vanilla JS.

## Run locally

```bash
python3 -m http.server 4173
```

Then open http://localhost:4173.

## Deploy

GitHub Pages: Settings → Pages → deploy from the `main` branch, root folder. All paths are relative, so it works from a project subpath.

## Pages

- `index.html` — landing page
- `find-a-sail.html` — search sails, with an illustrative map
- `sail.html?id=<id>` — a single sail, skipper summary and request to crew
- `crew-request.html?id=<id>` — the skipper's side of a crew request: accept or decline
- `confirm-sail.html?id=<id>` — the sailor's post-sail confirmation and "would sail again"
- `profile.html?p=<slug>` — a sailor's CURRENT profile
- `create-profile.html` — placeholder
- `coaching.html`, `boats.html` — “coming later” placeholders
- `credits.html` — photo credits

## The crew-request loop

Find a sail → Request to crew → the skipper accepts or declines → (simulated) the sail
happens → the sailor confirms it and says whether they'd sail together again → their
CURRENT profile updates. It's a front-end-only prototype: `loop.js` stores the state
in `localStorage`, keyed by sail id, and one browser plays both the sailor
(`data.currentUser`, "Juhi Desai") and the skipper — `crew-request.html` says as much
("Prototype: this is what Tom would see"). There's no backend, login or messaging.

Juhi Desai's profile is the one that changes: `loop.js`'s `overlayMe()` adds a confirmed
sail on top of her static sample data (`data.js`) each time you complete the loop, so her
confirmed-sails count, Recent Sailing and Sailed With all update live. Try it end to end
from any sail's "Request to crew" button.

Every page uses the marine identity (`marine.css`, opted in with `<body data-theme="marine">`).

## Photos

Every photo slot points at a named file in `images/`. If a file is missing, a tonal placeholder shows the filename it is waiting for. Drop in a file with exactly that name and it appears; no code changes.

| File | Where |
| --- | --- |
| `landing-hero-golden-gate-sailing-crew.jpg` | Landing hero (full-bleed, behind the navigation) |
| `landing-people-j24-crew.jpg`, `landing-skills-sailing-lesson.jpg`, `landing-boats-club-dock.jpg` | Landing: People, Skills, Boats |
| `preview-friday-night-race-fleet.jpg`, `preview-saturday-morning-sail-bay.jpg`, `preview-sunday-race-melges-24.jpg` | Landing: sail previews |
| `find-hero-golden-gate.jpg` | Find a sail hero |
| `sail-friday-night-race-j24.jpg`, `sail-saturday-morning-sail.jpg`, `sail-sunday-race-crew.jpg`, `sail-monterey-delivery.jpg` | Find a sail cards and sail pages |
| `skipper-*.jpg` (tom-reyes, maya-ellison, ana-ferreira, chris-park) and `sailor-*.jpg` (dev-patel, ingrid-larsen, jules-moreau) | Sample sailor portraits (4:5): sail page, Find a sail cards and Sailed with. Replace with your own consented photos before any public launch. |
| `profile-<name>.jpg` (the same seven people) | Wide (7:5) photo at the top of each profile |
| `skipper-juhi-desai.jpg`, `profile-juhi-desai.jpg` | Juhi Desai — the prototype's own "you". Deliberately left as a placeholder (initials show instead); add a real photo if you want one. |

Each photo is used in one place. The current photos are Creative Commons, public-domain or Unsplash-licensed images, credited on `credits.html`. If you swap one out, update its alt text (in `index.html` or `data.js`) and its credit.

## Files

- `style.css` — tokens and shared components
- `marine.css` — the marine identity: landing, Find a sail, sail detail
- `data.js` — illustrative sails and sailors. Profile fields are grouped as user-provided, verification, and community history (see the comment at the top).
- `script.js` — shared header/footer, mobile nav, copy-link, shared avatar helper
- `profile.js` — the one sailing-profile template; `profile.html?p=<slug>` renders any sailor from `data.js`
- `sails.js` — Find a sail, the sail page, and the landing sail previews
- `loop.js` — the crew-request loop's state (`localStorage`) and the crew-request/confirm-sail pages
