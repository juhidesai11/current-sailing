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

  /* Circular person avatar: initials until the photo loads, then the photo covers them. */
  const avatar = (p, cls = "") =>
    `<span class="avatar ${cls}"><span aria-hidden="true">${esc(initials(p.name))}</span>${p.photo ? `<img src="${esc(p.photo)}" alt="" loading="lazy" decoding="async" onerror="this.hidden=true">` : ""}</span>`;

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
              <a class="avatar-ini" href="${prof}" aria-label="${esc(p.name)}, CURRENT profile" tabindex="-1">${esc(initials(p.name))}<img src="${esc(p.photo)}" alt="" loading="lazy" decoding="async" onerror="this.hidden=true"></a>
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

  /* Landing: a taste of Find a sail (same data, its own photography) -------- */
  const previewEl = document.querySelector("[data-landing-sails]");
  if (previewEl) {
    const IDS = ["friday-night-race", "saturday-morning-sail", "sunday-race"];
    previewEl.innerHTML = IDS.map((id) => sails.find((x) => x.id === id))
      .filter(Boolean)
      .map((s) => {
        const p = skipperOf(s);
        return `
          <a class="mini-sail" href="sail.html?id=${esc(s.id)}">
            <div class="photo__frame" style="--ph:${esc(s.preview.ph)};--pos:${esc(s.preview.pos)}">
              ${photoMedia(s.preview.photo, s.preview.alt)}
              <div class="photo__scrim"></div>
              <span class="mini-sail__when">${esc(whenShort(s, s.date))}</span>
            </div>
            <div class="mini-sail__body">
              <p class="sail-card__type">${esc(s.type)}</p>
              <h3 class="mini-sail__title">${esc(s.title)}</h3>
              <p class="mini-sail__boat">${esc(s.boat)} · ${esc(s.location)}</p>
              <p class="mini-sail__meta">${s.positions.map(esc).join(" · ")} <span>· ${esc(s.level)}</span></p>
              <p class="mini-sail__skipper"><span class="label">Skipper</span> ${esc(p.name)}${verifiedTick()}</p>
            </div>
          </a>`;
      })
      .join("");
  }

  /* Sail detail ------------------------------------------------------------ */
  /* One layout for every sail. Everything on the page comes from the sail and its skipper's data. */
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
      const loop = window.CURRENT_LOOP;
      const me = loop ? loop.overlayMe(data.profiles[data.currentUser]) : data.profiles[data.currentUser];
      const first = p.name.split(" ")[0];
      const dateLong = s.date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
      const when = s.multiDay ? `Departs ${dateLong} · ${clock(s.date)}` : `${dateLong} · ${clock(s.date)}`;
      document.title = `${s.title} — Find a sail — CURRENT`;

      /* Reusable skipper preview: filled entirely from the skipper's profile data. */
      const skipperPreview = (sk) => {
        const withPeople = sk.sailedWith.map((x) => data.profiles[x.slug]).filter(Boolean);
        return `
          <section class="skipper-card" aria-labelledby="skipper-heading">
            <p class="label" id="skipper-heading">Your skipper</p>
            <div class="skipper-card__id">
              ${avatar(sk, "avatar--lg")}
              <div>
                <h2 class="skipper-card__name">${esc(sk.name)}${verifiedTick()}</h2>
                <p class="skipper-card__area">${esc(sk.sailingArea)}</p>
              </div>
            </div>
            <dl class="skipper-card__nums">
              <div><dd>${sk.confirmedSails}</dd><dt>confirmed sails</dt></div>
              <div><dd>${sk.repeatConnections}</dd><dt>repeat connections</dt></div>
            </dl>
            <div class="skipper-card__with">
              <span>Sailed with:</span>
              <ul class="avatar-row">
                ${withPeople.map((m) => `<li title="${esc(m.name)}">${avatar(m)}</li>`).join("")}
                <li class="more">+${sk.sailedWithMore}</li>
              </ul>
            </div>
            <a class="btn btn--ghost" href="profile.html?p=${esc(sk.slug)}">View ${esc(first)}’s CURRENT profile <span aria-hidden="true">→</span></a>
          </section>`;
      };

      detailEl.innerHTML = `
        <div class="container">
          <a class="link-back" href="find-a-sail.html">← All sails</a>
          <div class="detail__grid">

            <div class="detail__left">
              <figure class="detail__photo">
                <div class="photo__frame" style="--ph:${esc(s.ph)};--pos:${esc(s.posDetail || s.pos)}">
                  ${photoMedia(s.photo, s.alt)}
                  <div class="photo__scrim"></div>
                </div>
              </figure>

              <dl class="detail__practical">
                <div><dd>${esc(s.duration)}</dd><dt>Duration</dt></div>
                <div><dd>${esc(s.meet)}</dd><dt>Meet</dt></div>
                <div><dd>${esc(s.bring.charAt(0).toUpperCase() + s.bring.slice(1))}</dd><dt>What to bring</dt></div>
              </dl>

              <div class="detail__about">
                <h2>About this sail</h2>
                <p>${esc(s.about)}</p>
              </div>
            </div>

            <div class="detail__side">
              <div class="detail__info">
                <p class="sail-card__type">${esc(s.type)}</p>
                <h1 class="detail__title">${esc(s.title)}</h1>
                <p class="detail__sub">${esc(s.boat)} · ${esc(s.location)}</p>
                <p class="detail__when">${esc(when)}</p>
                <dl class="detail__stats">
                  <div><dd>${esc(s.level)}</dd><dt>Experience level</dt></div>
                  <div><dd>${esc(s.crewNeeded)}</dd><dt>Crew needed</dt></div>
                  <div><dd>${s.positions.map(esc).join(" · ")}</dd><dt>Positions</dt></div>
                </dl>
                <button class="btn btn--lg detail__request" type="button" data-request></button>
                <p class="small" data-request-status hidden></p>
              </div>
              ${skipperPreview(p)}
            </div>

          </div>
        </div>

        <dialog class="modal" aria-labelledby="modal-title">
          <div class="modal__panel" data-state="form">
            <p class="label">Request to crew</p>
            <h2 class="modal__title" id="modal-title">${esc(s.title)}</h2>
            <p class="small">${esc(s.boat)} · ${esc(s.location)} · ${esc(when)}</p>
            <p class="modal__lede">${esc(first)} will receive your CURRENT profile with this request.</p>
            <div class="modal__me">
              ${avatar(me, "avatar--sm")}
              <div>
                <p class="modal__me-name">${esc(me.name)}${verifiedTick()}</p>
                <p class="modal__me-meta">${esc(me.sailingArea)} · ${me.confirmedSails} confirmed sails · ${me.repeatConnections} repeat connections</p>
                <p class="modal__me-meta">Roles: ${me.roles.map((r) => esc(r.name)).join(", ")}</p>
              </div>
            </div>
            <label class="field">
              <span>Add a note (optional)</span>
              <textarea data-note rows="3" placeholder="Anything you want ${esc(first)} to know?"></textarea>
            </label>
            <div class="modal__actions">
              <a class="btn btn--ghost" href="profile.html?p=${esc(me.slug)}" target="_blank" rel="noopener">Preview my profile</a>
              <button class="btn" type="button" data-send autofocus>Send request</button>
            </div>
          </div>
          <div class="modal__panel" data-state="sent" hidden>
            <h2 class="modal__title" id="modal-sent">Request sent</h2>
            <p class="modal__lede">${esc(first)} can now review your CURRENT profile.</p>
            <div class="modal__actions">
              <a class="btn btn--ghost" href="crew-request.html?id=${esc(s.id)}">View request</a>
              <button class="btn" type="button" data-done>Done</button>
            </div>
          </div>
        </dialog>`;

      /* Request to crew interaction. State lives in loop.js (localStorage), so it
         survives navigating to the crew-request and confirm-sail screens and back. */
      const modal = detailEl.querySelector(".modal");
      const reqBtn = detailEl.querySelector("[data-request]");
      const statusEl = detailEl.querySelector("[data-request-status]");
      const showState = (name) => modal.querySelectorAll("[data-state]").forEach((el) => { el.hidden = el.dataset.state !== name; });

      const paintRequestUI = () => {
        const st = loop ? loop.get(s.id) : null;
        reqBtn.classList.remove("detail__request--declined");
        if (!st || !st.requested) {
          reqBtn.innerHTML = `Request to crew <span aria-hidden="true">→</span>`;
          reqBtn.disabled = false;
          statusEl.hidden = true;
          return;
        }
        reqBtn.disabled = true;
        if (st.confirmed) {
          reqBtn.textContent = "Sail confirmed ✓";
          statusEl.innerHTML = `Confirmed as sailed. <a class="link-arrow" href="profile.html?p=${esc(data.currentUser)}">View your profile <span>→</span></a>`;
        } else if (st.accepted === true) {
          reqBtn.textContent = "Request accepted ✓";
          statusEl.innerHTML = `${esc(first)} accepted your request. <a class="link-arrow" href="crew-request.html?id=${esc(s.id)}">View request <span>→</span></a>`;
        } else if (st.accepted === false) {
          reqBtn.textContent = "Request declined";
          reqBtn.classList.add("detail__request--declined");
          statusEl.innerHTML = `${esc(first)} declined this request.`;
        } else {
          reqBtn.textContent = "Request sent";
          statusEl.innerHTML = `Waiting for ${esc(first)} to respond. <a class="link-arrow" href="crew-request.html?id=${esc(s.id)}">View request <span>→</span></a>`;
        }
        statusEl.hidden = false;
      };
      paintRequestUI();

      reqBtn.addEventListener("click", () => { showState("form"); modal.showModal(); });
      modal.querySelector("[data-send]").addEventListener("click", () => {
        const note = modal.querySelector("[data-note]").value.trim();
        if (loop) loop.request(s.id, note);
        showState("sent");
        paintRequestUI();
        modal.querySelector("[data-done]").focus();
      });
      modal.querySelector("[data-done]").addEventListener("click", () => modal.close());
      modal.addEventListener("click", (e) => { if (e.target === modal) modal.close(); }); /* backdrop */
    }
  }
})();
