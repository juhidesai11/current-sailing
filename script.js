/* CURRENT — shared behaviour: header/footer, mobile nav, rendering illustrative data. */
(() => {
  const data = window.CURRENT_DATA;
  const page = document.body.dataset.page || "";

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const verifiedTick = (label = "Identity verified") =>
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
})();
