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
  /* A real sail carries its already-resolved skipper profile directly (see
     shapeRealSail below); a demo sail still looks its skipper up by slug. */
  const skipperOf = (s) => s.skipperProfile || data.profiles[s.skipper];

  /* Circular person avatar: initials until the photo loads, then the photo covers them. */
  const avatar = (p, cls = "") =>
    `<span class="avatar ${cls}"><span aria-hidden="true">${esc(initials(p.name))}</span>${p.photo ? `<img src="${esc(p.photo)}" alt="" loading="lazy" decoding="async" onerror="this.hidden=true">` : ""}</span>`;

  /* A real sail has no photo asset — show just the existing tonal placeholder
     (the same one any missing photo file already falls back to) with no <img>,
     rather than pointing one at a path that was never going to exist. */
  const photoOrPlaceholder = (photo, alt) =>
    photo ? photoMedia(photo, alt) : `<div class="photo__media"><div class="photo__ph" aria-hidden="true"><span>Photo</span><span>Not added yet</span></div></div>`;

  /* Saved sails (per-browser, optional) ---------------------------------- */
  const KEY = "current.saved";
  const readSaved = () => {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
  };
  const writeSaved = (ids) => { try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch (e) { /* ignore */ } };

  /* Real, Supabase-backed sails --------------------------------------------
     Shapes a `sails` row + its skipper's real profile into the exact object
     shape the demo sails already use, so card()/skipperPreview()/the detail
     template need no separate code path — same approach as profile.js took
     for real profiles in Phase 1. Community-trust fields on the skipper stay
     real (0 / empty / false) on purpose: never fabricated. */
  const LEVEL_MIN = { "All levels": 0, Beginner: 0, Intermediate: 1, "Intermediate+": 1, Advanced: 2 };
  const TYPE_TAG = { "Day sailing": "Day sail", Training: "Practice", Racing: "Racing", Delivery: "Delivery" };
  const AREA_NAMES = ["San Francisco", "Berkeley", "Sausalito", "Alameda"];
  const areaFor = (location) => AREA_NAMES.find((a) => location.toLowerCase().includes(a.toLowerCase()));

  const fetchRealSkipperProfile = async (userId) => {
    const supa = window.CURRENT_SUPABASE;
    if (!supa) return null;
    const { data: row, error } = await supa
      .from("profiles")
      .select(`
        user_id, slug, name, photo_url, home_sailing_area, bio, sailing_since, identity_verified,
        profile_sailing_types ( type ),
        profile_roles ( role, note ),
        profile_boats ( name, experience ),
        profile_credentials ( issuer, name, year, detail )
      `)
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !row) return null;
    return {
      slug: row.slug,
      userId: row.user_id,
      name: row.name,
      photo: row.photo_url || "",
      heroPhoto: row.photo_url || "",
      sailingArea: row.home_sailing_area || "",
      bio: row.bio || "",
      sailingSince: row.sailing_since || "",
      types: row.profile_sailing_types.map((t) => t.type),
      roles: row.profile_roles.map((r) => ({ name: r.role, note: r.note || "" })),
      boats: row.profile_boats.map((b) => ({ name: b.name, experience: b.experience })),
      credentials: row.profile_credentials.map((c) => ({ issuer: c.issuer, name: c.name, year: c.year, detail: c.detail || "" })),
      verification: { identity: !!row.identity_verified },
      confirmedSails: 0, repeatConnections: 0,
      sailedWith: [], sailedWithMore: 0, feedback: [], recent: [],
    };
  };

  const shapeRealSail = (row, skipperProfile) => ({
    id: row.id,
    isReal: true,
    status: row.status,
    skipperUserId: row.skipper_user_id,
    skipperProfile,
    skipper: skipperProfile.slug,
    type: row.type,
    typeTag: TYPE_TAG[row.type],
    title: row.title,
    boat: row.boat,
    location: row.location,
    area: areaFor(row.location),
    date: new Date(`${row.sail_date}T${row.start_time}`),
    time: (row.start_time || "").slice(0, 5),
    duration: row.duration || "Not specified",
    level: row.experience_level || "Not specified",
    minLevel: LEVEL_MIN[row.experience_level] ?? 0,
    crewNeeded: row.crew_needed || "Not specified",
    positions: row.roles_needed && row.roles_needed.length ? row.roles_needed : ["Not specified"],
    about: row.description || "",
    meet: row.location,
    bring: "Not specified",
    photo: row.photo_url || "", alt: row.title, ph: "#5d6a7a", pos: "50% 50%", posDetail: "50% 50%",
  });

  /* Every OPEN real sail, each with its skipper profile already resolved. A
     sail whose skipper profile can't be resolved is skipped entirely rather
     than shown with a placeholder identity — posting already requires a
     completed profile, so this should only happen if something upstream
     went wrong. If Supabase itself is unreachable, this quietly returns no
     real sails and the demo sails still render on their own. */
  const fetchRealOpenSails = async () => {
    const supa = window.CURRENT_SUPABASE;
    if (!supa) return [];
    try {
      const { data: rows, error } = await supa.from("sails").select("*").eq("status", "open");
      if (error || !rows) return [];
      const cache = new Map();
      const getProfile = async (userId) => {
        if (!cache.has(userId)) cache.set(userId, await fetchRealSkipperProfile(userId));
        return cache.get(userId);
      };
      const shaped = await Promise.all(rows.map(async (row) => {
        const profile = await getProfile(row.skipper_user_id);
        return profile ? shapeRealSail(row, profile) : null;
      }));
      return shaped.filter(Boolean);
    } catch (e) {
      return [];
    }
  };

  /* A single real sail by id, regardless of status — used by the detail page,
     where an owner needs to be able to open their own closed sail directly.
     RLS (not this code) is what actually enforces that only the owner can
     see a closed one; a non-owner's request for one simply comes back empty. */
  const fetchRealSailById = async (id) => {
    const supa = window.CURRENT_SUPABASE;
    if (!supa) return null;
    try {
      const { data: row, error } = await supa.from("sails").select("*").eq("id", id).maybeSingle();
      if (error || !row) return null;
      const profile = await fetchRealSkipperProfile(row.skipper_user_id);
      return profile ? shapeRealSail(row, profile) : null;
    } catch (e) {
      return null;
    }
  };

  /* Crew requests (real sails only) -----------------------------------------
     Requests are never public — RLS only ever returns a signed-in user's own
     request, or (for the sail's skipper) every request on that one sail. */

  /* This signed-in user's own request for this sail, if they've made one. */
  const fetchMyRequestForSail = async (sailId, userId) => {
    const supa = window.CURRENT_SUPABASE;
    if (!supa) return null;
    try {
      const { data, error } = await supa
        .from("sail_requests")
        .select("id, status")
        .eq("sail_id", sailId)
        .eq("requester_user_id", userId)
        .maybeSingle();
      return error ? null : data;
    } catch (e) {
      return null;
    }
  };

  /* Every request against this sail — for the skipper's own "Crew requests"
     section. Only ever called when the viewer already is that skipper; RLS
     would return nothing otherwise regardless. */
  const fetchRequestsForSail = async (sailId) => {
    const supa = window.CURRENT_SUPABASE;
    if (!supa) return [];
    try {
      const { data, error } = await supa
        .from("sail_requests")
        .select("id, requester_user_id, note, status, created_at")
        .eq("sail_id", sailId)
        .order("created_at", { ascending: true });
      return error || !data ? [] : data;
    } catch (e) {
      return [];
    }
  };

  /* Permanent sailing history (Phase 4) ---------------------------------------
     A sail_participations row exists once a request is accepted (created
     server-side — see supabase/schema.sql — never by this code directly).
     Both fetches below just read it; confirming goes through the
     confirm_sail_participation RPC, never a direct table write. */

  /* This signed-in crew member's own participation row for this sail, if one exists. */
  const fetchMyParticipation = async (sailId, userId) => {
    const supa = window.CURRENT_SUPABASE;
    if (!supa) return null;
    try {
      const { data, error } = await supa
        .from("sail_participations")
        .select("id, skipper_confirmed, crew_confirmed")
        .eq("sail_id", sailId)
        .eq("crew_user_id", userId)
        .maybeSingle();
      return error ? null : data;
    } catch (e) {
      return null;
    }
  };

  /* Every participation row for this sail — for the skipper's "Crew requests"
     section, keyed by crew_user_id so each accepted request can find its own. */
  const fetchParticipationsForSail = async (sailId) => {
    const supa = window.CURRENT_SUPABASE;
    if (!supa) return new Map();
    try {
      const { data, error } = await supa
        .from("sail_participations")
        .select("id, crew_user_id, skipper_confirmed, crew_confirmed")
        .eq("sail_id", sailId);
      if (error || !data) return new Map();
      return new Map(data.map((p) => [p.crew_user_id, p]));
    } catch (e) {
      return new Map();
    }
  };

  /* Whether this sail's snapshot date/time has passed — approximate and
     client-side only, used purely to decide which button to show. The real
     gate is the confirm_sail_participation RPC's own server-side check
     against the sail's actual timezone; this just avoids showing a live
     "Confirm sail" button that would only fail when clicked. */
  const sailTimeHasPassed = (sail) => Date.now() >= sail.date.getTime();

  /* Confirm state for one participation, from one side's point of view:
     "accepted" (nothing to do yet or no row at all), "ready" (can confirm),
     "mine" (I've confirmed, waiting on the other side), "both" (done). */
  const confirmStateOf = (participation, viewerIsCrew, sail) => {
    if (!participation) return "accepted";
    const mine = viewerIsCrew ? participation.crew_confirmed : participation.skipper_confirmed;
    const theirs = viewerIsCrew ? participation.skipper_confirmed : participation.crew_confirmed;
    if (mine && theirs) return "both";
    if (mine) return "mine";
    return sailTimeHasPassed(sail) ? "ready" : "accepted";
  };

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
            ${photoOrPlaceholder(s.photo, s.alt)}
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
              <a class="avatar-ini" href="${prof}" aria-label="${esc(p.name)}, CURRENT profile" tabindex="-1">${esc(initials(p.name))}${p.photo ? `<img src="${esc(p.photo)}" alt="" loading="lazy" decoding="async" onerror="this.hidden=true">` : ""}</a>
              <div>
                <span class="label">Skipper</span>
                <a class="sail-skipper__name" href="${prof}">${esc(p.name)}${p.verification?.identity ? verifiedTick() : ""}</a>
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
      (state.type === "all" || (s.typeTag || s.type) === state.type) &&
      s.minLevel <= LEVELS[state.level] &&
      (state.date === "any" ||
        (state.date === "week" && daysUntil(s.date) <= 7) ||
        (state.date === "weekend" && [0, 6].includes(s.date.getDay()) && daysUntil(s.date) <= 7));

    const anyFilter = () => state.area !== "all" || state.date !== "any" || state.type !== "all" || state.level !== "all";

    /* All sails shown on this page: the 4 demo sails plus every real open
       sail, merged and renumbered together. Fetched once, up front, so the
       rest of this page's filtering/rendering stays fully synchronous. */
    let allSails = sails;
    const loadAllSails = async () => {
      const real = await fetchRealOpenSails();
      allSails = [...sails.map((s) => ({ ...s, n: undefined })), ...real]
        .sort((a, b) => a.date - b.date)
        .map((s, i) => ({ ...s, n: i + 1 }));
    };

    const render = () => {
      const shown = allSails.filter(matches);
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

    /* Map pins and card highlight. Only demo sails carry illustrative map
       coordinates — real sails simply have no pin, same as the map's own
       "Illustrative map" caption already implies. Numbers are drawn from
       allSails' final numbering (set once loadAllSails() resolves below) so
       a pin's number always matches its card's number, real sails included. */
    const paintPins = () => {
      pinsEl.innerHTML = allSails
        .filter((s) => s.map)
        .map(
          (s) => `
          <a class="map__pin" href="sail.html?id=${esc(s.id)}" data-id="${esc(s.id)}" aria-label="${s.n}. ${esc(s.title)}, ${esc(s.location)}">
            <circle cx="${s.map.x}" cy="${s.map.y}" r="13"/><text x="${s.map.x}" y="${s.map.y + 4.2}">${s.n}</text>
          </a>`
        )
        .join("");
    };
    const setActive = (id, on) => {
      cardsEl.querySelector(`.sail-card[data-id="${id}"]`)?.classList.toggle("is-active", on);
      pinsEl.querySelector(`.map__pin[data-id="${id}"]`)?.classList.toggle("is-active", on);
    };
    cardsEl.addEventListener("mouseover", (e) => { const c = e.target.closest(".sail-card"); if (c) setActive(c.dataset.id, true); });
    cardsEl.addEventListener("mouseout", (e) => { const c = e.target.closest(".sail-card"); if (c) setActive(c.dataset.id, false); });
    pinsEl.addEventListener("mouseover", (e) => { const p = e.target.closest(".map__pin"); if (p) setActive(p.dataset.id, true); });
    pinsEl.addEventListener("mouseout", (e) => { const p = e.target.closest(".map__pin"); if (p) setActive(p.dataset.id, false); });

    /* Demo sails render immediately; real sails join in (and pins/count
       update) as soon as loadAllSails() resolves. */
    paintPins();
    render();
    loadAllSails().then(() => { paintPins(); render(); });
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
    (async () => {
      const id = new URLSearchParams(location.search).get("id");
      let s = sails.find((x) => x.id === id);
      /* Not one of the 4 demo sails — try Supabase. RLS means a non-owner's
         request for someone else's closed sail just comes back empty, same
         as "not found". */
      if (!s) s = await fetchRealSailById(id);

      if (!s) {
        detailEl.innerHTML = `
          <div class="container"><div class="page-intro">
            <p class="eyebrow">Find a sail</p>
            <h1 class="display-2">We could not find that sail.</h1>
            <a class="link-arrow" href="find-a-sail.html">Back to all sails <span>→</span></a>
          </div></div>`;
        return;
      }

      /* Only a real sail has an owner at all; demo sails never show owner controls. */
      let isOwner = false;
      let session = null;
      if (s.isReal && window.CURRENT_AUTH) {
        session = await window.CURRENT_AUTH.getSession();
        isOwner = !!session && session.user.id === s.skipperUserId;
      }

      /* Real sails only: the viewer's own request status (non-owner), or every
         request against this sail with its requester's real profile resolved
         (owner) — same profile-shaping helper Phase 2 already uses for the
         skipper, reused here since "a real person's profile" is the same
         lookup either way. */
      let myProfile = null, myRequest = null, ownerRequests = [], myParticipation = null;
      if (s.isReal && isOwner) {
        const rows = await fetchRequestsForSail(s.id);
        const cache = new Map();
        for (const r of rows) {
          if (!cache.has(r.requester_user_id)) cache.set(r.requester_user_id, await fetchRealSkipperProfile(r.requester_user_id));
          const profile = cache.get(r.requester_user_id);
          if (profile) ownerRequests.push({ ...r, profile }); // no resolvable profile — skip rather than show a placeholder identity
        }
        const participationsByCrew = await fetchParticipationsForSail(s.id);
        ownerRequests.forEach((r) => { r.participation = participationsByCrew.get(r.requester_user_id) || null; });
      } else if (s.isReal && session) {
        myProfile = await fetchRealSkipperProfile(session.user.id);
        if (myProfile) myRequest = await fetchMyRequestForSail(s.id, session.user.id);
        if (myRequest && myRequest.status === "accepted") myParticipation = await fetchMyParticipation(s.id, session.user.id);
      }

      const p = skipperOf(s);
      const loop = window.CURRENT_LOOP;
      const me = loop ? loop.overlayMe(data.profiles[data.currentUser]) : data.profiles[data.currentUser];
      const first = p.name.split(" ")[0];
      const dateLong = s.date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
      const when = s.multiDay ? `Departs ${dateLong} · ${clock(s.date)}` : `${dateLong} · ${clock(s.date)}`;
      document.title = `${s.title} — Find a sail — CURRENT`;

      /* Reusable skipper preview: filled entirely from the skipper's profile data.
         The verified tick only ever shows when identity.verified is actually true —
         real skippers have no real verification yet, so it correctly stays hidden. */
      const skipperPreview = (sk) => {
        const withPeople = sk.sailedWith.map((x) => data.profiles[x.slug]).filter(Boolean);
        return `
          <section class="skipper-card" aria-labelledby="skipper-heading">
            <p class="label" id="skipper-heading">Your skipper</p>
            <div class="skipper-card__id">
              ${avatar(sk, "avatar--lg")}
              <div>
                <h2 class="skipper-card__name">${esc(sk.name)}${sk.verification?.identity ? verifiedTick() : ""}</h2>
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

      /* Owner controls (real sails only) replace the request-to-crew button —
         a skipper doesn't request to crew their own sail. */
      const ownerActions = `
        <a class="btn btn--lg detail__request" href="post-sail.html?id=${esc(s.id)}">Edit sail</a>
        <button class="btn btn--ghost detail__request" type="button" data-close-sail${s.status === "closed" ? " disabled" : ""}>${s.status === "closed" ? "Closed" : "Close sail"}</button>
        <p class="small field-error" data-close-error hidden></p>
        ${s.status === "closed" ? `<p class="small pf-muted">This sail is closed and no longer listed on Find a sail.</p>` : ""}`;

      const demoRequestActions = `
        <button class="btn btn--lg detail__request" type="button" data-request></button>
        <p class="small" data-request-status hidden></p>`;

      /* Real sails only: the request button reflects exactly what's true right
         now — not signed in / no profile route straight to the right next
         step; an existing request shows its real status, never a second
         "Request to crew"; only a first-time, eligible requester gets the
         live button that opens the modal. */
      const REQUEST_STATUS_LABEL = { requested: "Requested", accepted: "Accepted", declined: "Declined" };
      const canOpenRequestModal = s.isReal && !isOwner && !!myProfile && !myRequest;

      /* Once accepted, the request button becomes the confirm flow instead of
         a static "Accepted" label — same confirmStateOf() the skipper's side
         uses below, just from the crew member's point of view. */
      const crewConfirmActionHtml = (participation) => {
        const state = confirmStateOf(participation, true, s);
        if (state === "ready") return `<button class="btn btn--lg detail__request" type="button" data-confirm-open="${esc(participation.id)}" data-confirm-other="${esc(first)}">Confirm sail</button>`;
        if (state === "mine") return `<button class="btn btn--lg detail__request" type="button" disabled>Confirmed by you · Waiting for ${esc(first)}</button>`;
        if (state === "both") return `<button class="btn btn--lg detail__request" type="button" disabled>Sail confirmed ✓</button>`;
        return `<button class="btn btn--lg detail__request" type="button" disabled>Accepted</button>`;
      };

      const realRequestActions = !session
        ? `<a class="btn btn--lg detail__request" href="login.html">Request to crew</a>`
        : !myProfile
        ? `<a class="btn btn--lg detail__request" href="create-profile.html">Request to crew</a>`
        : myRequest
        ? (myRequest.status === "accepted"
            ? crewConfirmActionHtml(myParticipation)
            : `<button class="btn btn--lg detail__request" type="button" disabled>${esc(REQUEST_STATUS_LABEL[myRequest.status])}</button>`)
        : `<button class="btn btn--lg detail__request" type="button" data-request>Request to crew <span aria-hidden="true">→</span></button>`;

      const actionsHtml = isOwner ? ownerActions : s.isReal ? realRequestActions : demoRequestActions;

      /* Owner's "Crew requests" section (real sails only) — a full-width
         section below the main grid, since it can hold several requests.
         Reuses .pf-feedback/.fb from profile.js's feedback list (already
         designed for "a person + a short quote"), not a new component. */
      /* The skipper's per-request confirm state, once accepted — same states
         as crewConfirmActionHtml, mirrored from the skipper's point of view. */
      const skipperConfirmFooter = (r) => {
        const crewFirst = r.profile.name.split(" ")[0];
        const state = confirmStateOf(r.participation, false, s);
        if (state === "ready") return `<button class="btn btn--ghost" type="button" data-confirm-open="${esc(r.participation.id)}" data-confirm-other="${esc(crewFirst)}">Confirm sail</button>`;
        if (state === "mine") return `<span>Confirmed by you · Waiting for crew</span>`;
        if (state === "both") return `<span>Sail confirmed ✓</span>`;
        return `<span>Accepted</span>`;
      };

      const crewRequestsSection = !(s.isReal && isOwner) ? "" : `
        <section class="pf-section pf-section--last" aria-labelledby="cr-requests-heading">
          <div class="container">
            <div class="pf-head"><h2 id="cr-requests-heading">Crew requests</h2></div>
            ${ownerRequests.length ? `
              <div class="pf-feedback">
                ${ownerRequests.map((r) => `
                  <article class="fb">
                    ${avatar(r.profile, "avatar--fb")}
                    <div>
                      <p class="fb__who"><a href="profile.html?p=${esc(r.profile.slug)}">${esc(r.profile.name)}</a></p>
                      <p class="fb__ctx">${esc(r.profile.sailingArea)}</p>
                      ${r.note ? `<p class="fb__quote">“${esc(r.note)}”</p>` : ""}
                      <p class="fb__foot">
                        ${r.status === "requested"
                          ? `<span class="cr-actions"><button class="btn btn--ghost" type="button" data-decline="${esc(r.id)}">Decline</button><button class="btn" type="button" data-accept="${esc(r.id)}">Accept</button></span>`
                          : r.status === "accepted"
                          ? skipperConfirmFooter(r)
                          : `<span>${esc(REQUEST_STATUS_LABEL[r.status])}</span>`}
                      </p>
                    </div>
                  </article>`).join("")}
              </div>` : `<div class="pf-empty"><p>No crew requests yet.</p></div>`}
            <p class="small field-error" data-requests-error hidden></p>
          </div>
        </section>`;

      /* Real, non-demo "Request to crew" modal — only built when there's a
         live button to open it. Uses the requester's own real profile, never
         the demo "me" persona loop.js uses for demo sails. */
      const realModal = !canOpenRequestModal ? "" : `
        <dialog class="modal" aria-labelledby="modal-title" data-request-modal>
          <div class="modal__panel" data-state="form">
            <p class="label">Request to crew</p>
            <h2 class="modal__title" id="modal-title">${esc(s.title)}</h2>
            <p class="small">${esc(s.boat)} · ${esc(s.location)} · ${esc(when)}</p>
            <p class="modal__lede">${esc(first)} will receive your CURRENT profile with this request.</p>
            <div class="modal__me">
              ${avatar(myProfile, "avatar--sm")}
              <div>
                <p class="modal__me-name">${esc(myProfile.name)}${myProfile.verification?.identity ? verifiedTick() : ""}</p>
                <p class="modal__me-meta">${esc(myProfile.sailingArea)} · ${myProfile.confirmedSails} confirmed sails · ${myProfile.repeatConnections} repeat connections</p>
                <p class="modal__me-meta">Roles: ${myProfile.roles.map((r) => esc(r.name)).join(", ") || "Not specified"}</p>
              </div>
            </div>
            <label class="field">
              <span>Add a note (optional)</span>
              <textarea data-note rows="3" placeholder="Anything you want ${esc(first)} to know?"></textarea>
            </label>
            <p class="small field-error" data-request-error hidden></p>
            <div class="modal__actions">
              <a class="btn btn--ghost" href="profile.html?p=${esc(myProfile.slug)}" target="_blank" rel="noopener">Preview my profile</a>
              <button class="btn" type="button" data-send autofocus>Send request</button>
            </div>
          </div>
          <div class="modal__panel" data-state="sent" hidden>
            <h2 class="modal__title" id="modal-sent">Request sent</h2>
            <p class="modal__lede">${esc(first)} will see your CURRENT profile and can accept or decline your request.</p>
            <div class="modal__actions">
              <button class="btn" type="button" data-done>Done</button>
            </div>
          </div>
        </dialog>`;

      /* Confirm sail (real sails only): one shared modal for both the crew
         member's own action and each of the skipper's per-request rows —
         whichever [data-confirm-open] button was clicked fills in the
         participation id and the other person's name before opening it. */
      const confirmModalHtml = !s.isReal ? "" : `
        <dialog class="modal" aria-labelledby="confirm-title" data-confirm-modal>
          <div class="modal__panel" data-state="confirm">
            <p class="label">Confirm sail</p>
            <h2 class="modal__title" id="confirm-title">Did you sail together?</h2>
            <p class="modal__lede">Confirming lets this count toward both of your CURRENT sailing history.</p>
            <div class="modal__actions">
              <button class="btn btn--ghost" type="button" data-confirm-close>Not yet</button>
              <button class="btn" type="button" data-confirm-step1 autofocus>Confirm</button>
            </div>
          </div>
          <div class="modal__panel" data-state="again" hidden>
            <h2 class="modal__title" data-confirm-again-title>Would you sail together again?</h2>
            <p class="small field-error" data-confirm-error hidden></p>
            <div class="modal__actions">
              <button class="btn btn--ghost" type="button" data-again="not_sure">Not sure</button>
              <button class="btn" type="button" data-again="yes">Yes</button>
            </div>
          </div>
          <div class="modal__panel" data-state="done" hidden>
            <h2 class="modal__title">Sail confirmed ✓</h2>
            <p class="modal__lede">Thanks — this is now part of your CURRENT sailing history.</p>
            <div class="modal__actions"><button class="btn" type="button" data-confirm-done>Done</button></div>
          </div>
        </dialog>`;

      detailEl.innerHTML = `
        <div class="container">
          <a class="link-back" href="find-a-sail.html">← All sails</a>
          <div class="detail__grid">

            <div class="detail__left">
              <figure class="detail__photo">
                <div class="photo__frame" style="--ph:${esc(s.ph)};--pos:${esc(s.posDetail || s.pos)}">
                  ${photoOrPlaceholder(s.photo, s.alt)}
                  <div class="photo__scrim"></div>
                </div>
              </figure>

              <dl class="detail__practical">
                <div><dd>${esc(s.duration)}</dd><dt>Duration</dt></div>
                <div><dd>${esc(s.meet)}</dd><dt>Meet</dt></div>
                <div><dd>${esc(s.bring.charAt(0).toUpperCase() + s.bring.slice(1))}</dd><dt>What to bring</dt></div>
              </dl>

              ${s.about ? `<div class="detail__about"><h2>About this sail</h2><p>${esc(s.about)}</p></div>` : ""}
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
                ${actionsHtml}
              </div>
              ${skipperPreview(p)}
            </div>

          </div>
        </div>

        ${crewRequestsSection}

        ${confirmModalHtml}

        ${s.isReal ? realModal : `
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
        </dialog>`}`;

      /* Confirm sail wiring (real sails only) — shared by both the skipper's
         per-request rows and the crew member's own action button, since
         there's exactly one confirm modal on the page regardless of role.
         The only write here is the confirm_sail_participation RPC: identity
         comes from auth.uid() server-side, confirmed_at is server-authored,
         and the browser never sends anything but participation_id + the
         chosen would_sail_again value. */
      if (s.isReal) {
        const confirmModal = detailEl.querySelector("[data-confirm-modal]");
        if (confirmModal) {
          let activeParticipationId = null;
          const showConfirmState = (name) =>
            confirmModal.querySelectorAll("[data-state]").forEach((el) => { el.hidden = el.dataset.state !== name; });

          detailEl.querySelectorAll("[data-confirm-open]").forEach((btn) => {
            btn.addEventListener("click", () => {
              activeParticipationId = btn.dataset.confirmOpen;
              const otherName = btn.dataset.confirmOther || "them";
              confirmModal.querySelector("[data-confirm-again-title]").textContent = `Would you sail with ${otherName} again?`;
              const errorEl = confirmModal.querySelector("[data-confirm-error]");
              if (errorEl) errorEl.hidden = true;
              showConfirmState("confirm");
              confirmModal.showModal();
            });
          });

          confirmModal.querySelector("[data-confirm-close]")?.addEventListener("click", () => confirmModal.close());
          confirmModal.addEventListener("click", (e) => { if (e.target === confirmModal) confirmModal.close(); });
          confirmModal.querySelector("[data-confirm-step1]")?.addEventListener("click", () => showConfirmState("again"));

          confirmModal.querySelectorAll("[data-again]").forEach((btn) => {
            btn.addEventListener("click", async () => {
              const answer = btn.dataset.again;
              const errorEl = confirmModal.querySelector("[data-confirm-error]");
              errorEl.hidden = true;
              const buttons = confirmModal.querySelectorAll("[data-again]");
              buttons.forEach((b) => (b.disabled = true));

              const { error } = await window.CURRENT_SUPABASE.rpc("confirm_sail_participation", {
                p_participation_id: activeParticipationId,
                p_would_sail_again: answer,
              });

              buttons.forEach((b) => (b.disabled = false));
              if (error) {
                console.error("Confirm sail failed:", error);
                const msg = error.message || "";
                if (/already confirmed/i.test(msg)) errorEl.textContent = "You've already confirmed this sail.";
                else if (/has not happened yet/i.test(msg)) errorEl.textContent = "This sail hasn't happened yet.";
                else if (/not authorized/i.test(msg) || error.code === "42501") errorEl.textContent = "You don't have permission to do that.";
                else errorEl.textContent = "Could not save your confirmation. Please try again.";
                errorEl.hidden = false;
                return;
              }
              showConfirmState("done");
            });
          });

          confirmModal.querySelector("[data-confirm-done]")?.addEventListener("click", () => location.reload());
        }
      }

      if (isOwner) {
        /* Close sail: RLS (auth.uid() = skipper_user_id), not this check, is what
           actually stops anyone else from doing this — this is just the UI. */
        const closeBtn = detailEl.querySelector("[data-close-sail]");
        const closeError = detailEl.querySelector("[data-close-error]");
        closeBtn?.addEventListener("click", async () => {
          if (s.status === "closed") return;
          if (!confirm("Close this sail? It will no longer appear in Find a sail.")) return;
          closeBtn.disabled = true;
          const { error } = await window.CURRENT_SUPABASE.from("sails").update({ status: "closed" }).eq("id", s.id);
          if (error) {
            console.error("Close sail failed:", error);
            closeError.textContent = "Could not close this sail. Please try again.";
            closeError.hidden = false;
            closeBtn.disabled = false;
            return;
          }
          location.reload();
        });

        /* Accept / decline a crew request. RLS (skipper owns the referenced
           sail), not this check, is what actually authorizes the update. */
        const requestsError = detailEl.querySelector("[data-requests-error]");
        const updateRequestStatus = async (requestId, status) => {
          if (requestsError) requestsError.hidden = true;
          const { error } = await window.CURRENT_SUPABASE.from("sail_requests").update({ status }).eq("id", requestId);
          if (error) {
            console.error("Update crew request failed:", error);
            if (requestsError) { requestsError.textContent = "Could not update this request. Please try again."; requestsError.hidden = false; }
            return;
          }
          location.reload();
        };
        detailEl.querySelectorAll("[data-accept]").forEach((b) => b.addEventListener("click", () => updateRequestStatus(b.dataset.accept, "accepted")));
        detailEl.querySelectorAll("[data-decline]").forEach((b) => b.addEventListener("click", () => updateRequestStatus(b.dataset.decline, "declined")));
        return;
      }

      /* Real sails: Request to crew, backed by public.sail_requests. Only
         wired up when there's actually a live button + modal to wire — a
         logged-out visitor, someone without a profile, or someone who has
         already requested sees a plain link or a disabled status button
         instead (built into actionsHtml above), nothing to wire here. */
      if (s.isReal) {
        if (canOpenRequestModal) {
          const modal = detailEl.querySelector("[data-request-modal]");
          const reqBtn = detailEl.querySelector("[data-request]");
          const sendBtn = modal.querySelector("[data-send]");
          const requestError = modal.querySelector("[data-request-error]");
          const showState = (name) => modal.querySelectorAll("[data-state]").forEach((el) => { el.hidden = el.dataset.state !== name; });
          let sent = false;

          reqBtn.addEventListener("click", () => { showState("form"); modal.showModal(); });

          sendBtn.addEventListener("click", async () => {
            const note = modal.querySelector("[data-note]").value.trim();
            requestError.hidden = true;
            sendBtn.disabled = true;
            const { error } = await window.CURRENT_SUPABASE
              .from("sail_requests")
              .insert({ sail_id: s.id, requester_user_id: session.user.id, note: note || null, status: "requested" });
            sendBtn.disabled = false;
            if (error) {
              console.error("Request to crew failed:", error);
              if (error.code === "23505") requestError.textContent = "You've already requested to crew on this sail.";
              else if (error.code === "42501" || /row-level security|permission denied/i.test(error.message || "")) requestError.textContent = "You don't have permission to do that.";
              else requestError.textContent = "Could not send your request. Please try again.";
              requestError.hidden = false;
              return;
            }
            sent = true;
            showState("sent");
          });

          /* Only reload (to reflect the new "Requested" status) if a request
             was actually sent — an accidental close beforehand shouldn't
             refresh the page for no reason. */
          const closeModal = () => { if (sent) location.reload(); else modal.close(); };
          modal.querySelector("[data-done]").addEventListener("click", closeModal);
          modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
        }
        return;
      }

      /* Demo sails: request to crew interaction. State lives in loop.js
         (localStorage), so it survives navigating to the crew-request and
         confirm-sail screens and back. */
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
    })();
  }
})();
