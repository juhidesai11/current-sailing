/* CURRENT — Find a sail and sail detail. Uses data.js and the helpers exposed by script.js. */
(() => {
  const data = window.CURRENT_DATA;
  const { esc, verifiedTick, photoMedia } = window.CURRENT_UI;

  /* Dates ---------------------------------------------------------------- */
  const nextOccurrence = (s) => {
    const [h, m] = s.time.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    let diff = (s.weekday - d.getDay() + 7) % 7;
    if (diff === 0 && d <= new Date()) diff = 7;
    d.setDate(d.getDate() + diff + (s.daysAfter || 0));
    return d;
  };
  const clock = (d) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const dayName = (d) => d.toLocaleDateString("en-US", { weekday: "long" });
  const whenShort = (s, d) => (s.multiDay ? "Multi-day" : `${dayName(d)} · ${clock(d)}`);
  const daysUntil = (d) => (d - new Date()) / 86400000;

  const sails = data.sails
    .map((s) => ({ ...s, date: nextOccurrence(s) }))
    .sort((a, b) => a.date - b.date)
    .map((s, i) => ({ ...s, n: i + 1 }));

  const initials = (name) => name.split(" ").map((w) => w[0]).join("");
  const skipperOf = (s) => data.profiles[s.skipper];

  /* Saved sails (per-browser, optional) ---------------------------------- */
  const KEY = "current.saved";
  const readSaved = () => {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
  };
  const writeSaved = (ids) => { try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch (e) { /* ignore */ } };

  /* Find a sail ----------------------------------------------------------- */
  const cardsEl = document.getElementById("cards");
  if (cardsEl) {
    const form = document.getElementById("finder");
    const countEl = document.getElementById("count");
    const pinsEl = document.getElementById("pins");
    const tabs = [...document.querySelectorAll(".type-tab")];
    const state = { area: "all", date: "any", type: "all", level: "all" };
    const LEVELS = { all: Infinity, beginner: 0, intermediate: 1, experienced: 2 };

    const heart = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.3C1.6 8 3.4 4.8 6.6 4.8c2 0 3.5 1.1 5.4 3.2 1.9-2.1 3.4-3.2 5.4-3.2 3.2 0 5 3.2 3.9 6.4-1.8 4.7-9.3 9.3-9.3 9.3z"/></svg>`;

    const card = (s) => {
      const p = skipperOf(s);
      const saved = readSaved().includes(s.id);
      const href = `sail.html?id=${esc(s.id)}`;
      const prof = `profile.html?p=${esc(p.slug)}`;
      return `
        <article class="sail-card" data-id="${esc(s.id)}">
          <div class="photo__frame sail-card__photo" style="--ph:${esc(s.ph)};--pos:${esc(s.pos)}">
            ${photoMedia(s.photo, s.alt)}
            <div class="photo__scrim"></div>
            <span class="sail-card__num" aria-hidden="true">${s.n}</span>
          </div>
          <div class="sail-card__body">
            <p class="sail-card__type">${esc(s.type)}</p>
            <h3 class="sail-card__title"><a href="${href}">${esc(s.title)}</a></h3>
            <p class="sail-card__boat">${esc(s.boat)} · ${esc(s.location)}</p>
            <dl class="sail-facts">
              <dt>When</dt><dd>${esc(whenShort(s, s.date))}</dd>
              <dt>Level</dt><dd>${esc(s.level)}</dd>
              <dt>Crew</dt><dd>${esc(s.crewNeeded)} <span>· ${s.positions.map(esc).join(" · ")}</span></dd>
            </dl>
          </div>
          <div class="sail-card__side">
            <div class="sail-skipper">
              <a class="avatar-ini" href="${prof}" aria-label="${esc(p.name)}, CURRENT profile" tabindex="-1">${esc(initials(p.name))}</a>
              <div>
                <span class="label">Skipper</span>
                <a class="sail-skipper__name" href="${prof}">${esc(p.name)}${p.verification ? verifiedTick() : ""}</a>
                <p class="sail-skipper__meta">${p.confirmedSails} confirmed sails</p>
                <a class="sail-skipper__profile" href="${prof}">CURRENT profile →</a>
              </div>
            </div>
            <div class="sail-card__cta">
              <a class="btn" href="${href}">View details</a>
              <button class="save" type="button" aria-pressed="${saved}" aria-label="Save ${esc(s.title)}" data-save="${esc(s.id)}">${heart}</button>
            </div>
          </div>
        </article>`;
    };

    const matches = (s) =>
      (state.area === "all" || s.area === state.area) &&
      (state.type === "all" || s.type === state.type) &&
      s.minLevel <= LEVELS[state.level] &&
      (state.date === "any" ||
        (state.date === "week" && daysUntil(s.date) <= 7) ||
        (state.date === "weekend" && [0, 6].includes(s.date.getDay()) && daysUntil(s.date) <= 7));

    const anyFilter = () => state.area !== "all" || state.date !== "any" || state.type !== "all" || state.level !== "all";

    const render = () => {
      const shown = sails.filter(matches);
      countEl.textContent = `${shown.length} ${shown.length === 1 ? "sail" : "sails"}`;
      cardsEl.innerHTML = shown.length
        ? shown.map(card).join("")
        : `<div class="empty"><h3>No sails match those filters.</h3><p>Try a different day or type, or clear the filters to see every sail.</p><button class="btn btn--ghost" type="button" data-clear>Clear filters</button></div>`;
      tabs.forEach((t) => t.setAttribute("aria-pressed", String(t.dataset.type === state.type)));
      document.querySelector(".finder__clear").hidden = !anyFilter();
      pinsEl.querySelectorAll(".map__pin").forEach((pin) => pin.classList.toggle("is-off", !shown.some((s) => s.id === pin.dataset.id)));
    };

    /* Controls */
    form.addEventListener("change", (e) => {
      if (!e.target.name) return;
      state[e.target.name] = e.target.value;
      render();
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      render();
      document.getElementById("results").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    tabs.forEach((t) =>
      t.addEventListener("click", () => {
        state.type = t.dataset.type;
        form.elements.type.value = state.type;
        render();
      })
    );
    const clear = () => {
      Object.assign(state, { area: "all", date: "any", type: "all", level: "all" });
      [...form.elements].forEach((el) => { if (el.name) el.value = state[el.name]; });
      render();
    };
    document.addEventListener("click", (e) => {
      if (e.target.closest(".finder__clear") || e.target.closest("[data-clear]")) clear();
      const save = e.target.closest("[data-save]");
      if (save) {
        const id = save.dataset.save;
        const ids = readSaved();
        const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
        writeSaved(next);
        save.setAttribute("aria-pressed", String(next.includes(id)));
      }
    });

    /* Map pins and card highlight */
    pinsEl.innerHTML = sails
      .map(
        (s) => `
        <a class="map__pin" href="sail.html?id=${esc(s.id)}" data-id="${esc(s.id)}" aria-label="${s.n}. ${esc(s.title)}, ${esc(s.location)}">
          <circle cx="${s.map.x}" cy="${s.map.y}" r="13"/><text x="${s.map.x}" y="${s.map.y + 4.2}">${s.n}</text>
        </a>`
      )
      .join("");
    const setActive = (id, on) => {
      cardsEl.querySelector(`.sail-card[data-id="${id}"]`)?.classList.toggle("is-active", on);
      pinsEl.querySelector(`.map__pin[data-id="${id}"]`)?.classList.toggle("is-active", on);
    };
    cardsEl.addEventListener("mouseover", (e) => { const c = e.target.closest(".sail-card"); if (c) setActive(c.dataset.id, true); });
    cardsEl.addEventListener("mouseout", (e) => { const c = e.target.closest(".sail-card"); if (c) setActive(c.dataset.id, false); });
    pinsEl.addEventListener("mouseover", (e) => { const p = e.target.closest(".map__pin"); if (p) setActive(p.dataset.id, true); });
    pinsEl.addEventListener("mouseout", (e) => { const p = e.target.closest(".map__pin"); if (p) setActive(p.dataset.id, false); });

    render();
  }

  /* Sail detail ------------------------------------------------------------ */
  const detailEl = document.querySelector("[data-sail-detail]");
  if (detailEl) {
    const s = sails.find((x) => x.id === new URLSearchParams(location.search).get("id"));
    if (!s) {
      detailEl.innerHTML = `
        <div class="container"><div class="page-intro">
          <p class="eyebrow">Find a sail</p>
          <h1 class="display-2">We could not find that sail.</h1>
          <a class="link-arrow" href="find-a-sail.html">Back to all sails <span>→</span></a>
        </div></div>`;
    } else {
      const p = skipperOf(s);
      const prof = `profile.html?p=${esc(p.slug)}`;
      const dateLong = s.date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
      const when = s.multiDay ? `Departs ${dateLong}, ${clock(s.date)}` : `${dateLong}, ${clock(s.date)}`;
      document.title = `${s.title} — Find a sail — CURRENT`;

      detailEl.innerHTML = `
        <div class="container">
          <a class="link-back" href="find-a-sail.html">← All sails</a>
          <div class="detail__grid">
            <div class="detail__main">
              <figure class="detail__photo">
                <div class="photo__frame" style="--ph:${esc(s.ph)};--pos:${esc(s.pos)}">
                  ${photoMedia(s.photo, s.alt)}
                  <div class="photo__scrim"></div>
                </div>
              </figure>

              <div class="detail__head">
                <p class="sail-card__type">${esc(s.type)}</p>
                <h1 class="detail__title">${esc(s.title)}</h1>
                <p class="detail__sub">${esc(s.boat)} · ${esc(s.location)}</p>
              </div>

              <dl class="detail__facts">
                <div><dt>When</dt><dd>${esc(when)}</dd></div>
                <div><dt>Length</dt><dd>${esc(s.duration)}</dd></div>
                <div><dt>Level</dt><dd>${esc(s.level)}</dd></div>
                <div><dt>Crew needed</dt><dd>${esc(s.crewNeeded)}</dd></div>
                <div><dt>Positions</dt><dd>${s.positions.map(esc).join(" · ")}</dd></div>
                <div><dt>Meet at</dt><dd>${esc(s.meet)}</dd></div>
                <div><dt>Bring</dt><dd>${esc(s.bring)}</dd></div>
              </dl>

              <div class="detail__about">
                <h2>About this sail</h2>
                <p>${esc(s.about)}</p>
              </div>

              <section class="skipper-panel" aria-labelledby="skipper-heading">
                <p class="label" id="skipper-heading">Your skipper</p>
                <div class="skipper-panel__top" style="margin-top:0.9rem">
                  <a class="avatar-ini" href="${prof}" aria-label="${esc(p.name)}, CURRENT profile" tabindex="-1">${esc(initials(p.name))}</a>
                  <div>
                    <p class="skipper-panel__name"><a href="${prof}">${esc(p.name)}</a>${verifiedTick()}</p>
                    <p class="skipper-panel__where">${esc(p.homeWaters)}</p>
                  </div>
                </div>
                <div class="skipper-panel__groups">
                  <div>
                    <h3>Sailing history on CURRENT</h3>
                    <div class="skipper-panel__nums">
                      <div><strong>${p.confirmedSails}</strong><span>confirmed sails</span></div>
                      <div><strong>${p.repeatConnections}</strong><span>repeat connections</span></div>
                    </div>
                  </div>
                  <div>
                    <h3>Identity</h3>
                    <p>${esc(p.verification.status)}<br><span class="small">${esc(p.verification.note)}</span></p>
                  </div>
                  <div>
                    <h3>In their words</h3>
                    <p>${esc(p.bio)}</p>
                  </div>
                </div>
                <a class="btn btn--ghost" href="${prof}">View ${esc(p.name.split(" ")[0])}’s CURRENT profile</a>
              </section>
            </div>

            <aside class="detail__aside" aria-label="Request to crew">
              <div class="request-panel">
                <h2>Request to crew</h2>
                <div class="request-panel__sum">
                  <strong>${esc(s.title)}</strong>
                  <span>${esc(when)}</span>
                  <span>${esc(s.boat)} · ${esc(s.location)}</span>
                  <span>Needs ${s.positions.map(esc).join(" · ")}</span>
                </div>
                <button class="btn" type="button" disabled>Request to crew</button>
                <p class="request-panel__note">Requests come next in this prototype. For now, look through ${esc(p.name.split(" ")[0])}’s profile.</p>
              </div>
            </aside>
          </div>
        </div>`;
    }
  }
})();
