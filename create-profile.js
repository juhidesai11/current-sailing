/* CURRENT — Create profile: a 6-step onboarding wizard, front-end only.
   Reopens pre-filled from localStorage ("Edit profile"); on completion it saves a
   profile shaped exactly like the sample sailors in data.js and becomes "you"
   (see the end of data.js) — so profile.html renders it with no new code path.

   What this DOES NOT do, on purpose: it never sets confirmedSails, repeatConnections,
   sailedWith, feedback or recent — those are CURRENT-generated, and only the
   crew-request loop (loop.js) is allowed to add to them. */
(() => {
  const root = document.querySelector("[data-create-profile]");
  if (!root) return;

  const data = window.CURRENT_DATA;
  const { esc, verifiedTick } = window.CURRENT_UI;
  const KEY = "current.myProfile";

  const TYPE_OPTIONS = ["Racing", "Day sailing", "Cruising", "Offshore", "Dinghy"];
  const ROLE_OPTIONS = ["Helm", "Skipper", "Bow", "Trimmer", "Pit", "Crew", "Instructor"];
  const BOAT_SUGGESTIONS = ["J/105", "J/24", "Express 27", "Melges 24", "Catalina 34", "Santa Cruz 27", "Beneteau 40", "Hunter 33", "Laser", "420", "Optimist"];
  const EXPERIENCE_LEVELS = ["Some", "Regular", "Extensive"];
  const ISSUERS = ["US Sailing", "RYA", "YRA", "California Boater Card", "PADI", "Other"];
  const THIS_YEAR = new Date().getFullYear();

  /* State -------------------------------------------------------------------
     Seeded from an existing saved profile when there is one (Edit profile),
     otherwise blank. `slug` only exists once a profile has been created, and
     editing keeps that same slug so the share link never changes underneath it. */
  const existing = (() => {
    try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; }
  })();

  const state = existing
    ? {
        slug: existing.slug, name: existing.name, photo: existing.photo || "",
        sailingArea: existing.sailingArea, bio: existing.bio,
        types: [...existing.types], roles: existing.roles.map((r) => r.name),
        sailingSince: String(existing.sailingSince || ""),
        boats: existing.boats.map((b) => ({ name: b.name, experience: b.experience || EXPERIENCE_LEVELS[0] })),
        credentials: existing.credentials.map((c) => ({ issuer: c.issuer, name: c.name, year: c.year, detail: c.number || "" })),
        verified: !!existing.verification?.identity,
      }
    : {
        slug: "", name: "", photo: "",
        sailingArea: "", bio: "",
        types: [], roles: [], sailingSince: "",
        boats: [], credentials: [],
        verified: false,
      };

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

  /* Downscale an uploaded photo client-side so it stores reasonably in localStorage. */
  const readPhoto = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const max = 640;
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
          const canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          canvas.getContext("2d").drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });

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
        <div>
          <button type="button" class="onboard__photo-action" data-photo-pick>${state.photo ? "Change photo" : "Add photo"}</button>
          <input type="file" accept="image/*" data-photo-input hidden>
        </div>
      </div>
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
      <div class="entry-add">
        <label class="field"><span>Boat or class</span>
          <input type="text" list="boat-suggestions" data-boat-name placeholder="e.g. J/105, Express 27, Laser">
          <datalist id="boat-suggestions">${BOAT_SUGGESTIONS.map((b) => `<option value="${esc(b)}">`).join("")}</datalist>
        </label>
        <button class="btn btn--ghost" type="button" data-boat-add>Add</button>
      </div>
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
    <p class="onboard__lede">Optional.</p>
    <div class="onboard__fields">
      <div class="id-card">
        ${state.verified
          ? `<p class="id-card__title">${verifiedTick("Identity verified")} Identity verified ✓</p>
             <p class="id-card__lede">Prototype verification. No real identity check has taken place.</p>`
          : `<p class="id-card__title">Verify your identity</p>
             <p class="id-card__lede">Identity verification helps other sailors know they are connecting with a real person.</p>
             <p class="id-card__note">Prototype verification. ID.me is a proposed integration for this concept — CURRENT does not currently verify identity or store government identification.</p>
             <div class="id-card__actions">
               <button class="btn" type="button" data-verify>Verify identity</button>
               <button class="btn btn--ghost" type="button" data-verify-skip>Skip for now</button>
             </div>`}
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
              <h2 class="skipper-card__name">${esc(state.name || "Your name")}${state.verified ? verifiedTick() : ""}</h2>
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
          </div>
        </div>
      </div>`;
    wire();
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

    /* Step 1: photo + live bio counter */
    const photoInput = root.querySelector("[data-photo-input]");
    root.querySelectorAll("[data-photo-pick]").forEach((b) => b.addEventListener("click", () => photoInput?.click()));
    photoInput?.addEventListener("change", async () => {
      const file = photoInput.files[0];
      if (!file) return;
      try { state.photo = await readPhoto(file); } catch (e) { /* ignore unreadable file */ }
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

    /* Step 3: boats */
    root.querySelector("[data-boat-add]")?.addEventListener("click", () => {
      const name = val("[data-boat-name]");
      if (!name) return;
      state.boats.push({ name, experience: EXPERIENCE_LEVELS[0] });
      paint();
    });
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

    /* Step 5: identity */
    root.querySelector("[data-verify]")?.addEventListener("click", (e) => {
      e.target.disabled = true;
      e.target.textContent = "Verifying…";
      setTimeout(() => { state.verified = true; paint(); }, 700);
    });
    root.querySelector("[data-verify-skip]")?.addEventListener("click", () => { step += 1; paint(); });
  };

  /* Finish: build the saved profile in the exact shape data.js's sample sailors use. */
  function finish() {
    const takenSlugs = Object.keys(data.profiles).filter((s) => s !== state.slug);
    const slug = state.slug || uniqueSlug(slugify(state.name || "sailor"), takenSlugs);
    const profile = {
      slug,
      name: state.name || "New sailor",
      verification: { identity: !!state.verified },
      photo: state.photo || "",
      heroPhoto: state.photo || "",
      sailingArea: state.sailingArea || "San Francisco Bay Area",
      sailingSince: state.sailingSince ? Number(state.sailingSince) : THIS_YEAR,
      bio: state.bio || "",
      types: [...state.types],
      roles: state.roles.map((name) => ({ name, note: "" })),
      boats: state.boats.map((b) => ({ name: b.name, experience: b.experience })),
      credentials: state.credentials.map((c) => ({ issuer: c.issuer, name: c.name, year: c.year, detail: c.detail || "" })),
      /* CURRENT-generated — always zero/empty on a brand-new profile. Only loop.js adds to these. */
      confirmedSails: 0, repeatConnections: 0, sailedWith: [], sailedWithMore: 0, feedback: [], recent: [],
    };
    try { localStorage.setItem(KEY, JSON.stringify(profile)); } catch (e) { /* ignore */ }
    location.href = "profile.html";
  }

  paint();
})();
