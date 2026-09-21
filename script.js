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
  const navPage = page === "sail" || page === "profile" ? "find" : page; /* sails and profiles are reached from Find a sail */
  const link = (href, label, id) =>
    `<a href="${href}"${navPage === id ? ' aria-current="page"' : ""}>${label}</a>`;

  const headerHTML = `
    <a class="skip-link" href="#main">Skip to content</a>
    <div class="container site-header__inner">
      <a class="wordmark" href="index.html" aria-label="CURRENT home">Current</a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">Menu</button>
      <nav class="nav" id="site-nav" aria-label="Primary">
        ${link("find-a-sail.html", "Find a sail", "find")}
        ${link("coaching.html", "Coaching", "coaching")}
        ${link("boats.html", "Boats", "boats")}
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
  const initials = (name) => name.split(" ").map((w) => w[0]).join("");
  /* Circular person avatar: initials until the photo loads, then the photo covers them. */
  const avatar = (p, cls = "") =>
    `<span class="avatar ${cls}"><span aria-hidden="true">${esc(initials(p.name))}</span>${p.photo ? `<img src="${esc(p.photo)}" alt="" loading="lazy" decoding="async" onerror="this.hidden=true">` : ""}</span>`;

  window.CURRENT_UI = { esc, verifiedTick, photoMedia, initials, avatar };
})();
