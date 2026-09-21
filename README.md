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

- `index.html` — homepage (cream and serif identity)
- `find-a-sail.html` — search sails, with an illustrative map
- `sail.html?id=<id>` — a single sail, with the skipper's summary
- `profile.html?p=<slug>` — a sailor's CURRENT profile
- `create-profile.html` — placeholder

Find a sail, the sail page and the profile use the newer marine identity (`marine.css`, opted in with `<body data-theme="marine">`). The homepage does not load it.

## Photos

Every photo slot points at a named file in `images/`. If a file is missing, a tonal placeholder shows the filename it is waiting for. Drop in a file with exactly that name and it appears; no code changes.

| File | Where |
| --- | --- |
| `find-hero-golden-gate.jpg` | Find a sail hero |
| `sail-friday-night-race.jpg` | Friday Night Race |
| `sail-saturday-morning-sail.jpg` | Saturday Morning Sail |
| `sail-sunday-race-crew.jpg` | Sunday Race |
| `sail-monterey-delivery.jpg` | SF to Monterey Delivery |
| `hero-bay-sailing.jpg`, `people-crew-racing.jpg`, `skills-instructor-coaching.jpg`, `boats-marina-access.jpg` | Homepage |
| `sail-casual-bay-sail.jpg`, `sail-practice-sail.jpg` | Homepage cards |
| `profile-maya-ellison.jpg`, `profile-tom-reyes.jpg`, `profile-ana-ferreira.jpg`, `profile-chris-park.jpg` | Profile portraits (none yet, placeholders) |

The current photos are Creative Commons or public-domain images from Wikimedia Commons, credited on `credits.html`. If you swap one out, update its alt text (in `index.html` or `data.js`) and its entry on `credits.html`.

## Files

- `style.css` — tokens and shared components
- `marine.css` — marine identity and the Find a sail / sail detail components
- `data.js` — illustrative sails, sailors and profiles. Sails point at a skipper in `profiles`.
- `script.js` — shared header/footer, mobile nav, homepage rendering, profile page
- `sails.js` — Find a sail filtering, cards, map pins, and the sail detail page
