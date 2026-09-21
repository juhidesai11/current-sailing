# CURRENT

Front-end prototype for a sailing product concept: a shareable sailing profile, plus a small "find a sail" browse. Plain HTML, CSS and vanilla JS.

## Run locally

```bash
python3 -m http.server 4173
```

Then open http://localhost:4173.

## Deploy

GitHub Pages: Settings → Pages → deploy from the `main` branch, root folder. All paths are relative, so it works from a project subpath.

## Photos

Every photo slot points at a named file in `images/`. If a file is missing, a tonal placeholder shows the filename it is waiting for. Drop in a file with exactly that name and it appears; no code changes.

| File | Where | Current photo |
| --- | --- | --- |
| `hero-bay-sailing.jpg` | Homepage hero | SailGP, San Francisco 2023 |
| `people-crew-racing.jpg` | People tile | SailGP, San Francisco 2023 |
| `skills-instructor-coaching.jpg` | Skills tile | Sunfish lesson (Dunewood, NY) |
| `boats-marina-access.jpg` | Boats tile | Marina del Rey, CA |
| `sail-friday-night-race.jpg` | Friday Night Race card | Express 37s, St. Francis YC 2010 |
| `sail-casual-bay-sail.jpg` | Casual Bay Sail card | SailGP, San Francisco 2023 |
| `sail-practice-sail.jpg` | Practice Sail card | SailGP, San Francisco 2023 |
| `sail-sunday-race-crew.jpg` | Sunday Race Crew card | SailGP, San Francisco 2023 |
| `profile-maya-ellison.jpg` | Sailing profile portrait | none yet (placeholder) |

The current photos are Creative Commons (CC BY-SA) images from Wikimedia Commons, credited on `credits.html`. If you swap one out, update its alt text (in `index.html` or `data.js`) and its entry on `credits.html`, or remove the entry if the new photo is yours.

## Files

- `style.css` — tokens and reusable components
- `data.js` — illustrative opportunities, people and profile
- `script.js` — shared header/footer, mobile nav, rendering sail cards and the profile
