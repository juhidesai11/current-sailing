/* CURRENT — Create profile: a 6-step onboarding wizard.
   Requires a signed-in Supabase user (see init() below) — a logged-out visitor is
   sent to sign up first. Reopens pre-filled from that user's own row in `profiles`
   ("Edit profile"); on completion it saves to `profiles` and its child tables
   (profile_sailing_types, profile_roles, profile_boats, profile_credentials).

   What this DOES NOT do, on purpose: it never sets confirmedSails, repeatConnections,
   sailedWith, feedback or recent — those are CURRENT-generated, and only the
   crew-request loop (loop.js, still prototype-only) is allowed to add to them. It
   also never sets identity_verified — there is no real verification yet, and the
   database itself (a trigger, see supabase/schema.sql) ignores any value this page
   might try to send for that column regardless. */
(() => {
  const root = document.querySelector("[data-create-profile]");
  if (!root) return;

  const data = window.CURRENT_DATA;
  const { esc } = window.CURRENT_UI;
  const auth = window.CURRENT_AUTH;
  const supa = window.CURRENT_SUPABASE;

  const TYPE_OPTIONS = ["Racing", "Day sailing", "Cruising", "Offshore", "Dinghy"];
  const ROLE_OPTIONS = ["Helm", "Skipper", "Bow", "Trimmer", "Pit", "Crew", "Instructor"];
  /* Suggestions only — not a closed list. Anything typed can be added as a custom entry;
     there are far too many boat manufacturers, models and racing classes to enumerate. */
  const BOAT_SUGGESTIONS = ["J/105", "J/24", "J/70", "Express 27", "Melges 24", "Laser", "ILCA 6", "ILCA 7", "420", "470", "Optimist", "FJ", "RS Feva", "RS Tera", "Catalina 34", "Beneteau 40"];
  const EXPERIENCE_LEVELS = ["Some", "Regular", "Extensive"];
  const ISSUERS = ["US Sailing", "RYA", "YRA", "California Boater Card", "PADI", "Other"];
  const THIS_YEAR = new Date().getFullYear();

  /* State -------------------------------------------------------------------
     Seeded from this user's existing row in `profiles` when there is one (Edit
     profile), otherwise blank — see init() at the bottom, which loads this before
     the first paint(). `slug` only exists once a profile has been created, and
     editing keeps that same slug so the share link never changes underneath it. */
  let state = null;
  let profileId = null;
  let step = 1;
  const STEP_COUNT = 6;

  /* Helpers ------------------------------------------------------------------ */
  const val = (sel) => (root.querySelector(sel)?.value || "").trim();
  const toggle = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const toggleGroup = (options, selected, attr) =>
    `<div class="toggles" role="group">${options
      .map((o) => `<button type="button" class="toggle" data-${attr}="${esc(o)}" aria-pressed="${selected.includes(o)}">${esc(o)}</button>`)
      .join("")}</div>`;

  const slugify = (name) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "sailor";
  const uniqueSlug = (base, taken) => {
    if (!taken.includes(base)) return base;
    let n = 2;
    while (taken.includes(`${base}-${n}`)) n++;
    return `${base}-${n}`;
  };

  /* Read the fields visible on the step being LEFT (either direction) into state. */
  const syncStep = () => {
    if (step === 1) {
      state.name = val("[data-f-name]");
      state.sailingArea = val("[data-f-area]");
      state.bio = val("[data-f-bio]");
    } else if (step === 2) {
      state.sailingSince = val("[data-f-since]");
    }
  };

  /* Steps ---------------------------------------------------------------------- */
  const stepBasics = () => `
    <p class="eyebrow">Create your CURRENT profile</p>
    <h1>Let’s start with the basics</h1>
    <p class="onboard__lede">Your sailing history, in one place.</p>
    <div class="onboard__fields">
      <div class="onboard__photo-row">
        <button type="button" class="onboard__photo" data-photo-pick aria-label="Add a profile photo">
          ${state.photo ? `<img src="${state.photo}" alt="">` : `<span aria-hidden="true">${esc((state.name || "?").slice(0, 1).toUpperCase())}</span>`}
        </button>
        <div class="onboard__photo-actions">
          <button type="button" class="onboard__photo-action" data-photo-pick>${state.photo ? "Change photo" : "Add photo"}</button>
          ${state.photo ? `<button type="button" class="onboard__photo-action" data-photo-remove>Remove photo</button>` : ""}
          <input type="file" accept="image/*" data-photo-input hidden>
        </div>
      </div>
      <p class="small field-error" data-photo-error hidden></p>
      <label class="field"><span>Full name</span><input type="text" data-f-name value="${esc(state.name)}" placeholder="Your name" autocomplete="name"></label>
      <label class="field"><span>Home sailing area</span><input type="text" data-f-area value="${esc(state.sailingArea)}" placeholder="e.g. San Francisco Bay Area"></label>
      <label class="field">
        <span>Short bio</span>
        <textarea data-f-bio rows="3" maxlength="250" placeholder="A sentence or two about how you sail.">${esc(state.bio)}</textarea>
        <p class="field__count"><span data-bio-count>${state.bio.length}</span>/250</p>
      </label>
    </div>`;

  const stepHowYouSail = () => `
    <p class="eyebrow">Step 2 of ${STEP_COUNT}</p>
    <h1>How do you sail?</h1>
    <p class="onboard__lede">Select all that apply.</p>
    <div class="onboard__fields">
      <label class="field"><span>Sailing types</span>${toggleGroup(TYPE_OPTIONS, state.types, "type")}</label>
      <label class="field"><span>Roles</span>${toggleGroup(ROLE_OPTIONS, state.roles, "role")}</label>
      <label class="field"><span>Sailing since</span>
        <select data-f-since>
          <option value="">Choose a year</option>
          ${Array.from({ length: 60 }, (_, i) => THIS_YEAR - i)
            .map((y) => `<option value="${y}" ${String(y) === state.sailingSince ? "selected" : ""}>${y}</option>`)
            .join("")}
        </select>
      </label>
    </div>`;

  const stepBoats = () => `
    <p class="eyebrow">Step 3 of ${STEP_COUNT}</p>
    <h1>What have you sailed?</h1>
    <p class="onboard__lede">Add the boats and classes you have experience with.</p>
    <div class="onboard__fields">
      <label class="field"><span>Boats &amp; classes</span>
        <div class="combo" data-boat-combo>
          <input type="text" data-boat-input autocomplete="off" placeholder="Search or add a boat / class"
                 role="combobox" aria-expanded="false" aria-autocomplete="list" aria-controls="boat-combo-menu">
          <ul class="combo__menu" id="boat-combo-menu" role="listbox" data-boat-menu hidden></ul>
        </div>
      </label>
      <div class="entry-list">
        ${state.boats.length
          ? state.boats.map((b, i) => `
              <div class="entry-row">
                <div class="entry-row__body"><p class="entry-row__name">${esc(b.name)}</p></div>
                <select data-boat-exp="${i}">${EXPERIENCE_LEVELS.map((l) => `<option ${l === b.experience ? "selected" : ""}>${l}</option>`).join("")}</select>
                <button class="entry-row__remove" type="button" data-boat-remove="${i}" aria-label="Remove ${esc(b.name)}">×</button>
              </div>`).join("")
          : `<p class="entry-empty">No boats added yet.</p>`}
      </div>
    </div>`;

  const stepCredentials = () => `
    <p class="eyebrow">Step 4 of ${STEP_COUNT}</p>
    <h1>Add your credentials</h1>
    <p class="onboard__lede">Optional — add any certifications you'd like to share.</p>
    <div class="onboard__fields">
      <div class="entry-add">
        <label class="field"><span>Issuing organization</span>
          <select data-cred-issuer>${ISSUERS.map((o) => `<option>${esc(o)}</option>`).join("")}</select>
        </label>
        <label class="field" data-cred-other-field hidden><span>Organization name</span><input type="text" data-cred-other placeholder="Name it"></label>
        <label class="field"><span>Credential name</span><input type="text" data-cred-name placeholder="e.g. Basic Keelboat"></label>
        <label class="field"><span>Year</span><input type="number" data-cred-year min="1950" max="${THIS_YEAR}" placeholder="${THIS_YEAR}"></label>
        <label class="field"><span>Level (optional)</span><input type="text" data-cred-detail placeholder="e.g. Level 1"></label>
        <button class="btn btn--ghost" type="button" data-cred-add>Add</button>
      </div>
      <div class="entry-list">
        ${state.credentials.length
          ? state.credentials.map((c, i) => `
              <div class="entry-row">
                <div class="entry-row__body">
                  <p class="entry-row__name">${esc(c.name)}</p>
                  <p class="entry-row__meta">${esc(c.issuer)}${c.detail ? ` · ${esc(c.detail)}` : ""}${c.year ? ` · ${esc(c.year)}` : ""}</p>
                </div>
                <button class="entry-row__remove" type="button" data-cred-remove="${i}" aria-label="Remove ${esc(c.name)}">×</button>
              </div>`).join("")
          : `<p class="entry-empty">No credentials added yet.</p>`}
      </div>
    </div>`;

  const stepIdentity = () => `
    <p class="eyebrow">Step 5 of ${STEP_COUNT}</p>
    <h1>Build trust before you sail</h1>
    <p class="onboard__lede">Identity verification</p>
    <div class="onboard__fields">
      <div class="id-card">
        <p class="id-card__title">Not available yet</p>
        <p class="id-card__lede">CURRENT does not verify identity yet. When a real verification process exists, it will run through a separate, legitimate check — not something set from this page.</p>
      </div>
    </div>`;

  const stepReview = () => {
    const boatsHtml = state.boats.length
      ? `<ul class="pf-list">${state.boats.map((b) => `<li><span>${esc(b.name)}</span><span class="pf-muted">${esc(b.experience)}</span></li>`).join("")}</ul>`
      : `<p class="small">No boats added yet.</p>`;
    const credsHtml = state.credentials.length
      ? `<ul class="pf-list">${state.credentials.map((c) => `<li><span>${esc(c.name)}</span><span class="pf-muted">${esc(c.issuer)}${c.year ? ` · ${esc(c.year)}` : ""}</span></li>`).join("")}</ul>`
      : `<p class="small">No credentials added yet.</p>`;
    return `
      <p class="eyebrow">Step 6 of ${STEP_COUNT}</p>
      <h1>Your CURRENT profile</h1>
      <p class="onboard__lede">Make sure everything looks good before creating your profile.</p>
      <div class="onboard__fields">
        <div class="skipper-card onboard-preview">
          <button type="button" class="onboard-preview__edit" data-review-edit="1">Edit</button>
          <div class="skipper-card__id">
            <span class="avatar avatar--lg">
              <span aria-hidden="true">${esc((state.name || "?").split(" ").map((w) => w[0]).join(""))}</span>
              ${state.photo ? `<img src="${state.photo}" alt="">` : ""}
            </span>
            <div>
              <h2 class="skipper-card__name">${esc(state.name || "Your name")}</h2>
              <p class="skipper-card__area">${esc(state.sailingArea || "Home sailing area")}</p>
            </div>
          </div>
          ${state.bio ? `<p class="onboard-preview__bio">${esc(state.bio)}</p>` : ""}
          <h3 class="pf-sub">How you sail</h3>
          <p class="cr-line">${state.types.length ? state.types.map(esc).join(" · ") : "—"}${state.sailingSince ? ` · Sailing since ${esc(state.sailingSince)}` : ""}</p>
          <h3 class="pf-sub">Roles</h3>
          <p class="cr-line">${state.roles.length ? state.roles.map(esc).join(" · ") : "—"}</p>
          <h3 class="pf-sub">Boats &amp; classes</h3>
          ${boatsHtml}
          <h3 class="pf-sub">Credentials</h3>
          ${credsHtml}
        </div>
      </div>`;
  };

  const STEPS = [stepBasics, stepHowYouSail, stepBoats, stepCredentials, stepIdentity, stepReview];

  /* Render ---------------------------------------------------------------------- */
  const paint = () => {
    const pct = Math.round((step / STEP_COUNT) * 100);
    root.innerHTML = `
      <div class="container">
        <div class="onboard__shell">
          <div class="onboard__progress">
            <div class="onboard__bar"><span style="width:${pct}%"></span></div>
            <span class="onboard__step-count">Step ${step} of ${STEP_COUNT}</span>
          </div>
          <div class="onboard__card">
            ${STEPS[step - 1]()}
            <div class="onboard__nav${step === 1 ? " onboard__nav--end" : ""}">
              ${step > 1 ? `<button class="btn btn--ghost" type="button" data-back>← Back</button>` : ""}
              ${step < STEP_COUNT
                ? `<button class="btn" type="button" data-next>Next <span aria-hidden="true">→</span></button>`
                : `<button class="btn" type="button" data-finish>Create profile <span aria-hidden="true">→</span></button>`}
            </div>
            <p class="small field-error" data-finish-error hidden></p>
          </div>
        </div>
      </div>`;
    wire();
  };

  /* Step 3 combobox --------------------------------------------------------------
     A small custom combobox instead of a native <input list>/<datalist>: a native
     datalist's popover is drawn by the browser itself, so it can't be positioned,
     sized or styled — which is exactly why it showed up in the wrong place. This
     version is a plain absolutely-positioned menu against a relatively-positioned
     wrapper, so it always sits directly under the input and matches its width.
     It also has to allow free-text entries — there's no closed list of boats. */
  let closeBoatMenuOnOutsideClick = null;

  const boatSuggestionMatches = (query) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    const taken = new Set(state.boats.map((b) => b.name.toLowerCase()));
    return BOAT_SUGGESTIONS.filter((b) => !taken.has(b.toLowerCase()) && b.toLowerCase().includes(needle)).slice(0, 6);
  };

  const addBoat = (name) => {
    const clean = name.trim();
    if (!clean || state.boats.some((b) => b.name.toLowerCase() === clean.toLowerCase())) return;
    state.boats.push({ name: clean, experience: EXPERIENCE_LEVELS[0] });
    paint();
  };

  const wireBoatCombo = () => {
    const combo = root.querySelector("[data-boat-combo]");
    const input = root.querySelector("[data-boat-input]");
    const menu = root.querySelector("[data-boat-menu]");
    if (!combo || !input || !menu) return;

    let items = []; // { type: "suggestion" | "add", value }
    let activeIndex = -1;

    const paintMenu = () => {
      if (!items.length) {
        menu.hidden = true; menu.innerHTML = "";
        input.setAttribute("aria-expanded", "false");
        input.removeAttribute("aria-activedescendant");
        return;
      }
      menu.hidden = false;
      input.setAttribute("aria-expanded", "true");
      menu.innerHTML = items.map((it, i) => `
        <li class="combo__option${it.type === "add" ? " combo__option--add" : ""}${i === activeIndex ? " is-active" : ""}"
            id="boat-opt-${i}" role="option" aria-selected="${i === activeIndex}" data-i="${i}">
          ${it.type === "add" ? `Add “${esc(it.value)}”` : esc(it.value)}
        </li>`).join("");
      input.setAttribute("aria-activedescendant", activeIndex >= 0 ? `boat-opt-${activeIndex}` : "");
    };

    const openForQuery = () => {
      const q = input.value;
      const matches = boatSuggestionMatches(q);
      const trimmed = q.trim();
      const exact = trimmed.toLowerCase();
      const alreadySuggested = BOAT_SUGGESTIONS.some((b) => b.toLowerCase() === exact);
      const alreadyAdded = state.boats.some((b) => b.name.toLowerCase() === exact);
      const showAdd = trimmed && !alreadySuggested && !alreadyAdded;
      items = [...matches.map((value) => ({ type: "suggestion", value })), ...(showAdd ? [{ type: "add", value: trimmed }] : [])];
      activeIndex = items.length ? 0 : -1;
      paintMenu();
    };

    const closeMenu = () => { items = []; activeIndex = -1; paintMenu(); };
    const choose = (i) => { if (items[i]) addBoat(items[i].value); }; // addBoat() repaints the whole step

    input.addEventListener("input", openForQuery);
    input.addEventListener("focus", () => { if (input.value.trim()) openForQuery(); });
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); if (items.length) { activeIndex = (activeIndex + 1) % items.length; paintMenu(); } }
      else if (e.key === "ArrowUp") { e.preventDefault(); if (items.length) { activeIndex = (activeIndex - 1 + items.length) % items.length; paintMenu(); } }
      else if (e.key === "Enter") { e.preventDefault(); if (items.length) choose(activeIndex >= 0 ? activeIndex : 0); }
      else if (e.key === "Escape") { closeMenu(); }
    });
    /* mousedown + preventDefault, not click: stops the input from blurring before the
       tap registers, which is what makes taps on the menu work reliably on mobile too. */
    menu.addEventListener("mousedown", (e) => {
      const li = e.target.closest("[data-i]");
      if (!li) return;
      e.preventDefault();
      choose(+li.dataset.i);
    });

    if (closeBoatMenuOnOutsideClick) document.removeEventListener("click", closeBoatMenuOnOutsideClick);
    closeBoatMenuOnOutsideClick = (e) => { if (!e.target.closest("[data-boat-combo]")) closeMenu(); };
    document.addEventListener("click", closeBoatMenuOnOutsideClick);
  };

  /* Wiring ----------------------------------------------------------------------- */
  const wire = () => {
    root.querySelector("[data-back]")?.addEventListener("click", () => { syncStep(); step -= 1; paint(); });
    root.querySelector("[data-next]")?.addEventListener("click", () => {
      syncStep();
      if (step === 1 && !state.name) { root.querySelector("[data-f-name]")?.focus(); return; }
      step += 1;
      paint();
    });
    root.querySelector("[data-finish]")?.addEventListener("click", finish);
    root.querySelector("[data-review-edit]")?.addEventListener("click", () => { step = 1; paint(); });

    /* Step 1: photo + live bio counter. Picking or removing a photo only ever
       touches local state — nothing is uploaded or deleted from Storage until
       finish() actually saves the profile (see finish() below). */
    const photoInput = root.querySelector("[data-photo-input]");
    const setPhotoError = (msg) => {
      const el = root.querySelector("[data-photo-error]");
      if (el) { el.textContent = msg; el.hidden = !msg; }
    };
    root.querySelectorAll("[data-photo-pick]").forEach((b) => b.addEventListener("click", () => photoInput?.click()));
    photoInput?.addEventListener("change", async () => {
      const file = photoInput.files[0];
      if (!file) return;
      setPhotoError("");
      try {
        const blob = await window.CURRENT_PHOTO.pickAndResize(file, 1000);
        state.photo = URL.createObjectURL(blob);
        state.photoBlob = blob;
        state.photoRemoved = false;
        paint();
      } catch (e) {
        setPhotoError(e.message || "Could not use that photo.");
      }
    });
    root.querySelector("[data-photo-remove]")?.addEventListener("click", () => {
      state.photo = "";
      state.photoBlob = null;
      state.photoRemoved = !!state.savedPhotoUrl;
      paint();
    });
    root.querySelector("[data-f-bio]")?.addEventListener("input", (e) => {
      const el = root.querySelector("[data-bio-count]");
      if (el) el.textContent = e.target.value.length;
    });

    /* Step 2: multi-select toggles */
    root.querySelectorAll("[data-type]").forEach((b) =>
      b.addEventListener("click", () => { state.types = toggle(state.types, b.dataset.type); paint(); }));
    root.querySelectorAll("[data-role]").forEach((b) =>
      b.addEventListener("click", () => { state.roles = toggle(state.roles, b.dataset.role); paint(); }));

    /* Step 3: boats — custom combobox (search + free entry), see wireBoatCombo() below. */
    wireBoatCombo();
    root.querySelectorAll("[data-boat-exp]").forEach((sel) =>
      sel.addEventListener("change", (e) => { state.boats[+sel.dataset.boatExp].experience = e.target.value; }));
    root.querySelectorAll("[data-boat-remove]").forEach((b) =>
      b.addEventListener("click", () => { state.boats.splice(+b.dataset.boatRemove, 1); paint(); }));

    /* Step 4: credentials */
    const issuerSel = root.querySelector("[data-cred-issuer]");
    const otherField = root.querySelector("[data-cred-other-field]");
    issuerSel?.addEventListener("change", () => { if (otherField) otherField.hidden = issuerSel.value !== "Other"; });
    root.querySelector("[data-cred-add]")?.addEventListener("click", () => {
      const name = val("[data-cred-name]");
      if (!name) return;
      const issuer = issuerSel.value === "Other" ? (val("[data-cred-other]") || "Other") : issuerSel.value;
      state.credentials.push({ issuer, name, year: val("[data-cred-year]"), detail: val("[data-cred-detail]") });
      paint();
    });
    root.querySelectorAll("[data-cred-remove]").forEach((b) =>
      b.addEventListener("click", () => { state.credentials.splice(+b.dataset.credRemove, 1); paint(); }));
  };

  /* Finish: upsert this user's row in `profiles`, then replace its child rows
     (sailing types, roles, boats, credentials) to match the wizard's current
     state, and go to the resulting CURRENT profile. Never sends identity_verified
     — the column isn't in `payload` at all, and the database would ignore it
     even if it were (see the trigger in supabase/schema.sql). */
  async function finish() {
    const setError = (msg) => {
      const el = root.querySelector("[data-finish-error]");
      if (el) { el.textContent = msg; el.hidden = !msg; }
    };
    const finishBtn = root.querySelector("[data-finish]");
    setError("");
    if (finishBtn) finishBtn.disabled = true;

    try {
      const session = await auth.getSession();
      if (!session) { location.href = "signup.html"; return; }

      const takenSlugs = Object.keys(data.profiles).filter((s) => s !== state.slug);
      let slug = state.slug || uniqueSlug(slugify(state.name || "sailor"), takenSlugs);

      /* Resolve the photo to save. Default: unchanged. A newly picked photo is
         uploaded now (this is the first point a Storage write is allowed — see
         photo-upload.js); a removal is applied now too. A failed upload never
         blocks saving the rest of the profile — it just keeps the old photo
         and surfaces a warning after the fact. */
      let photoUrl = state.savedPhotoUrl || null;
      let photoWarning = "";
      if (state.photoBlob) {
        const { url, error } = await window.CURRENT_PHOTO.uploadPhoto("profile-photos", `${session.user.id}/profile.jpg`, state.photoBlob);
        if (error) {
          console.error("profile photo upload failed", error);
          photoWarning = "Your profile was saved, but the photo couldn't be uploaded.";
        } else {
          photoUrl = url;
        }
      } else if (state.photoRemoved) {
        photoUrl = null;
      }

      const basePayload = {
        user_id: session.user.id,
        name: state.name || "New sailor",
        photo_url: photoUrl,
        home_sailing_area: state.sailingArea || null,
        bio: state.bio || null,
        sailing_since: state.sailingSince ? Number(state.sailingSince) : null,
      };

      let row = null;
      for (let attempt = 0; attempt < 5 && !row; attempt++) {
        const { data: upserted, error } = await supa
          .from("profiles")
          .upsert({ ...basePayload, slug }, { onConflict: "user_id" })
          .select("id, slug")
          .single();
        if (!error) { row = upserted; break; }
        if (error.code === "23505" && !state.slug) { slug = `${slug}-${attempt + 2}`; continue; }
        throw error;
      }
      if (!row) throw new Error("slug unavailable");

      profileId = row.id;

      await Promise.all([
        supa.from("profile_sailing_types").delete().eq("profile_id", profileId),
        supa.from("profile_roles").delete().eq("profile_id", profileId),
        supa.from("profile_boats").delete().eq("profile_id", profileId),
        supa.from("profile_credentials").delete().eq("profile_id", profileId),
      ]);

      const inserts = [];
      if (state.types.length)
        inserts.push(supa.from("profile_sailing_types").insert(state.types.map((type) => ({ profile_id: profileId, type }))));
      if (state.roles.length)
        inserts.push(supa.from("profile_roles").insert(state.roles.map((role) => ({ profile_id: profileId, role, note: "" }))));
      if (state.boats.length)
        inserts.push(supa.from("profile_boats").insert(state.boats.map((b) => ({ profile_id: profileId, name: b.name, experience: b.experience }))));
      if (state.credentials.length)
        inserts.push(supa.from("profile_credentials").insert(state.credentials.map((c) => ({
          profile_id: profileId, issuer: c.issuer, name: c.name,
          year: c.year ? Number(c.year) : null, detail: c.detail || null,
        }))));

      const results = await Promise.all(inserts);
      const failed = results.find((r) => r.error);
      if (failed) throw failed.error;

      /* Only delete the old Storage object once the database no longer
         references it — a removal that was never actually saved must never
         have deleted the file (see photo-upload.js). Best-effort: a failure
         here just leaves a harmless orphaned object. */
      if (!photoWarning && state.photoRemoved && state.savedPhotoUrl) {
        window.CURRENT_PHOTO.deletePhoto("profile-photos", `${session.user.id}/profile.jpg`).catch(() => {});
      }

      const dest = `profile.html?p=${encodeURIComponent(row.slug)}`;
      if (photoWarning) {
        setError(photoWarning);
        setTimeout(() => { location.href = dest; }, 1800);
      } else {
        location.href = dest;
      }
    } catch (err) {
      setError("Something went wrong saving your profile. Please try again.");
      if (finishBtn) finishBtn.disabled = false;
    }
  }

  /* Bootstrap: require a signed-in user, then load their existing profile (if
     any) to prefill the wizard — otherwise start blank. */
  async function init() {
    const session = auth ? await auth.getSession() : null;
    if (!session) { location.href = "signup.html"; return; }

    const { data: row } = await supa
      .from("profiles")
      .select(`
        id, slug, name, photo_url, home_sailing_area, bio, sailing_since,
        profile_sailing_types ( type ),
        profile_roles ( role, note ),
        profile_boats ( name, experience ),
        profile_credentials ( issuer, name, year, detail )
      `)
      .eq("user_id", session.user.id)
      .maybeSingle();

    profileId = row?.id || null;
    state = row
      ? {
          slug: row.slug, name: row.name || "", photo: row.photo_url || "",
          savedPhotoUrl: row.photo_url || "", photoBlob: null, photoRemoved: false,
          sailingArea: row.home_sailing_area || "", bio: row.bio || "",
          types: row.profile_sailing_types.map((t) => t.type),
          roles: row.profile_roles.map((r) => r.role),
          sailingSince: row.sailing_since != null ? String(row.sailing_since) : "",
          boats: row.profile_boats.map((b) => ({ name: b.name, experience: b.experience })),
          credentials: row.profile_credentials.map((c) => ({ issuer: c.issuer, name: c.name, year: c.year, detail: c.detail || "" })),
        }
      : {
          slug: "", name: "", photo: "", savedPhotoUrl: "", photoBlob: null, photoRemoved: false,
          sailingArea: "", bio: "", types: [], roles: [], sailingSince: "", boats: [], credentials: [],
        };

    paint();
  }

  init();
})();
