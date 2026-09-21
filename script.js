/* CURRENT — shared behaviour: header/footer, mobile nav, rendering illustrative data. */
(() => {
  const data = window.CURRENT_DATA;
  const page = document.body.dataset.page || "";

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const verifiedTick = (label = "Identity verified (prototype)") =>
    `<svg class="verified" viewBox="0 0 16 16" role="img" aria-label="${label}"><circle cx="8" cy="8" r="8"/><path d="M4.6 8.2l2.3 2.3 4.5-4.9"/></svg>`;

  /* Photo slot: <img> over a tonal placeholder that names the expected file.
     A missing file hides the <img>, leaving the placeholder. */
  const photoMedia = (src, alt) => `
    <div class="photo__media">
      <div class="photo__ph" aria-hidden="true"><span>Photo</span><span>${esc(src)}</span></div>
      <img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async" onerror="this.hidden=true">
    </div>`;

  /* Header & footer ------------------------------------------------------ */
  const link = (href, label, id) =>
    `<a href="${href}"${page === id ? ' aria-current="page"' : ""}>${label}</a>`;

  const headerHTML = `
    <a class="skip-link" href="#main">Skip to content</a>
    <div class="container site-header__inner">
      <a class="wordmark" href="index.html" aria-label="CURRENT home">Current</a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">Menu</button>
      <nav class="nav" id="site-nav" aria-label="Primary">
        ${link("find-a-sail.html", "Find a sail", "find")}
        <span class="nav__soon" title="Coming later">Coaching</span>
        <span class="nav__soon" title="Coming later">Boats</span>
        <a class="btn" href="create-profile.html"${page === "create" ? ' aria-current="page"' : ""}>Create profile</a>
      </nav>
    </div>`;

  const footerHTML = `
    <div class="container">
      <div class="site-footer__row">
        <a class="wordmark" href="index.html">Current</a>
        <nav class="site-footer__links" aria-label="Footer">
          <a href="find-a-sail.html">Find a sail</a>
          <a href="profile.html">Sailing profile</a>
          <a href="create-profile.html">Create profile</a>
          <a href="credits.html">Photo credits</a>
        </nav>
      </div>
      <p class="site-footer__note small">CURRENT is a product prototype. Profiles and opportunities shown are illustrative.</p>
      <div class="scale" aria-hidden="true"></div>
    </div>`;

  const mount = (name, html) => {
    const el = document.querySelector(`[data-component="${name}"]`);
    if (el) el.innerHTML = html;
  };
  mount("header", headerHTML);
  mount("footer", footerHTML);

  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.textContent = open ? "Close" : "Menu";
    });
  }

  /* Sail cards ----------------------------------------------------------- */
  const sailCard = (o, i) => {
    const skipper = data.people[o.skipper];
    const wide = i % 3 === 0; // 1st and 4th wide, 2nd and 3rd narrow
    return `
      <a class="sail${wide ? " sail--wide" : ""}" href="find-a-sail.html#${esc(o.id)}">
        <div class="photo__frame" style="--ph:${esc(o.ph)};--pos:${esc(o.pos || "center")}">
          ${photoMedia(o.photo, o.alt)}
          <div class="photo__scrim"></div>
          <span class="sail__when">${esc(o.day)} · ${esc(o.time)}</span>
        </div>
        <div class="sail__body">
          <div class="sail__head">
            <h3 class="sail__title">${esc(o.title)}</h3>
            <span class="sail__go" aria-hidden="true">→</span>
          </div>
          <p class="sail__where">${esc(o.boat)} · ${esc(o.location)}</p>
          <dl class="sail__facts">
            <div><dt class="label">Needs</dt><dd>${esc(o.needs)}</dd></div>
            <div><dt class="label">Level</dt><dd>${esc(o.level)}</dd></div>
            <div><dt class="label">Skipper</dt><dd class="sail__skipper">${esc(skipper.name)}${skipper.verified ? verifiedTick() : ""}</dd></div>
          </dl>
        </div>
      </a>`;
  };

  document.querySelectorAll("[data-sails]").forEach((el) => {
    const limit = Number(el.dataset.limit) || data.opportunities.length;
    el.innerHTML = data.opportunities.slice(0, limit).map(sailCard).join("");
  });

  /* Sailing profile ------------------------------------------------------ */
  document.querySelectorAll("[data-profile]").forEach((el) => {
    const p = data.profile;
    el.innerHTML = `
      <div class="photo__frame profile__photo">
        ${photoMedia(p.photo, `Portrait of ${p.name}`)}
      </div>
      <div class="profile__body">
        <header>
          <p class="profile__verified">${verifiedTick()} Identity verified</p>
          <h3 class="profile__name">${esc(p.name)}</h3>
          <p class="profile__loc">${esc(p.location)}</p>
        </header>
        <p class="profile__bio">${esc(p.bio)}</p>
        <ul class="tags">${p.tags.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
        <dl class="profile__stats">
          <div><dt class="label">Confirmed sails</dt><dd>${p.confirmedSails}</dd></div>
          <div><dt class="label">Repeat connections</dt><dd>${p.repeatConnections}</dd></div>
        </dl>
        <dl class="profile__details">
          <div><dt class="label">Credentials</dt><dd>${p.credentials.map(esc).join(", ")}</dd></div>
          <div><dt class="label">Boats sailed</dt><dd>${p.boats.map(esc).join(", ")}</dd></div>
          <div><dt class="label">Crews as</dt><dd>${p.positions.map(esc).join(", ")}</dd></div>
        </dl>
        <div class="profile__with">
          <p class="label">Sailed with</p>
          <ul class="avatars">
            ${p.sailedWith.map((i) => `<li>${esc(i)}</li>`).join("")}
            <li class="more">+${p.sailedWithMore}</li>
          </ul>
        </div>
      </div>`;
  });

  /* Full profile page --------------------------------------------------- */
  const profileRoot = document.querySelector("[data-profile-page]");
  if (profileRoot) {
    const slug = new URLSearchParams(location.search).get("p") || data.profile.slug;
    const p = (data.profiles || {})[slug];

    if (!p) {
      profileRoot.innerHTML = `
        <div class="container"><div class="page-intro">
          <p class="eyebrow">Sailing profile</p>
          <h1 class="display-2">We could not find that profile.</h1>
          <a class="link-arrow" href="find-a-sail.html">Find a sail <span>→</span></a>
        </div></div>`;
    } else {
      document.title = `${p.name} — Sailing profile — CURRENT`;
      const first = p.name.split(" ")[0];
      const list = (cls, items) => `<ul class="lines ${cls}">${items.join("")}</ul>`;
      const row = (name, meta, aside) => `
        <li><span class="lines__name">${esc(name)}</span><span class="lines__meta">${esc(meta)}</span>${aside ? `<span class="lines__aside">${esc(aside)}</span>` : ""}</li>`;
      const section = (title, body, note = "") => `
        <div class="dossier__row">
          <div class="dossier__head"><h2 class="dossier__title">${esc(title)}</h2></div>
          <div class="dossier__body">${note ? `<p class="dossier__note small">${note}</p>` : ""}${body}</div>
        </div>`;

      profileRoot.innerHTML = `
        <div class="sample-note"><div class="container sample-note__row">
          <a class="link-back" href="find-a-sail.html">← Find a sail</a>
          <p><strong>Sample profile.</strong> All names, credentials, statistics and sailing history on this page are fictional.</p>
        </div></div>

        <section class="sailor" aria-labelledby="sailor-name">
          <div class="container sailor__grid">
            <div class="photo__frame sailor__photo">${photoMedia(p.photo, `Portrait of ${p.name}`)}</div>
            <div class="sailor__main">
              <div class="sailor__meta">
                <p class="label">Sailing profile</p>
                <p class="label">No. ${esc(p.profileNo)} · Sample</p>
              </div>
              <div>
                <h1 class="sailor__name" id="sailor-name">${p.name.split(" ").map((w) => `<span>${esc(w)}</span>`).join(" ")}</h1>
                <p class="sailor__area">Home waters: ${esc(p.homeWaters)}. Sailing since ${p.sailingSince}.</p>
                <p class="verify">${verifiedTick(p.verification.status)}<span><strong>${esc(p.verification.status)}</strong><small>${esc(p.verification.note)}</small></span></p>
                <p class="sailor__bio">${esc(p.bio)}</p>
                <dl class="profile__stats">
                  <div><dt class="label">Confirmed sails</dt><dd>${p.confirmedSails}</dd></div>
                  <div><dt class="label">Repeat connections</dt><dd>${p.repeatConnections}</dd></div>
                </dl>
                <div class="sailor__actions">
                  <button class="btn" type="button" data-copy-link>Copy profile link</button>
                  <span class="small" role="status" aria-live="polite" data-copy-status></span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="band-photo" aria-hidden="true">
          <div class="container">
            <div class="photo__frame" style="--ph:#2a4a66;--pos:${esc(p.bandPhoto.pos)}">
              ${photoMedia(p.bandPhoto.src, p.bandPhoto.alt)}
              <div class="photo__scrim"></div>
            </div>
          </div>
        </section>

        <section class="dossier section">
          <div class="container">
            ${section("Sailing", list("", p.types.map((t) => row(t.name, t.note))))}
            ${section("Crew positions", list("", p.positionsDetail.map((t) => row(t.name, t.note))))}
            ${section("Boats sailed", list("lines--boats", p.boatsDetail.map((b) => row(b.name, b.spec, `${b.sails} sails`))))}
            ${section(
              "Credentials",
              list("lines--boats", p.credentialsDetail.map((c) => row(c.name, c.issuer, `${c.year}`))),
              "Fictional sample credentials. CURRENT has not checked any of these with US Sailing or anyone else."
            )}
            ${section(
              "Recent sailing",
              list("lines--history", p.history.map((h) => `
                <li>
                  <span class="lines__date">${esc(h.date)}</span>
                  <span><span class="lines__name">${esc(h.title)}</span><br><span class="lines__meta">${esc(h.boat)} · ${esc(h.place)}</span></span>
                  <span><span class="lines__meta">${esc(h.role)}</span><br><span class="lines__aside">Confirmed by ${esc(h.skipper)}</span></span>
                </li>`))
            )}
          </div>
        </section>

        <section class="section band" aria-labelledby="sailed-with">
          <div class="container">
            <div class="mates-head">
              <h2 class="display-2" id="sailed-with">Sailed with</h2>
              <p class="lede">${p.repeatConnections} people ${esc(first)} has sailed with more than once.</p>
            </div>
            <div class="mates">
              ${p.people.map((m) => `
                <article class="mate">
                  <span class="mate__avatar" aria-hidden="true">${esc(m.initials)}</span>
                  <div>
                    <p class="mate__name">${m.slug && data.profiles[m.slug] ? `<a href="profile.html?p=${esc(m.slug)}">${esc(m.name)}</a>` : esc(m.name)}${m.verified ? verifiedTick() : ""}</p>
                    <p class="mate__meta">${esc(m.role)} · ${esc(m.boat)} · ${m.sails} sails together</p>
                  </div>
                </article>`).join("")}
            </div>
            <p class="mates-more">And ${p.peopleMore} others.</p>
          </div>
        </section>`;
    }
  }

  /* Copy link ------------------------------------------------------------ */
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-copy-link]");
    if (!btn) return;
    const status = document.querySelector("[data-copy-status]");
    try {
      await navigator.clipboard.writeText(location.href);
      if (status) status.textContent = "Link copied";
    } catch (err) {
      if (status) status.textContent = "Copy the address from your browser bar";
    }
  });
  window.CURRENT_UI = { esc, verifiedTick, photoMedia };
})();
