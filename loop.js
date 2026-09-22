/* CURRENT — the crew-request loop: request → skipper evaluates → accept/decline →
   sail happens → confirm → sailing history updates. Front-end prototype only: state
   lives in localStorage, keyed by sail id, so it survives navigating between the sail
   page, the two screens below, and the sailor's own profile. No backend, no real
   two-sided accounts — this browser plays both "you" (data.currentUser) and the skipper.

   Loads after script.js (needs window.CURRENT_UI) and before sails.js / profile.js. */
(() => {
  const data = window.CURRENT_DATA;
  const { esc, verifiedTick, avatar } = window.CURRENT_UI;
  const KEY = "current.loop";

  /* State ------------------------------------------------------------------ */
  const readAll = () => {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  };
  const writeAll = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* ignore */ } };
  const get = (sailId) => readAll()[sailId] || null;
  const patch = (sailId, changes) => {
    const all = readAll();
    all[sailId] = { ...(all[sailId] || {}), ...changes };
    writeAll(all);
    return all[sailId];
  };

  const request = (sailId, note) => patch(sailId, { requested: true, note: note || "", accepted: null, confirmed: false, wouldAgain: null });
  const accept = (sailId) => patch(sailId, { accepted: true });
  const decline = (sailId) => patch(sailId, { accepted: false });
  const confirmSail = (sailId, wouldAgain, note) => patch(sailId, { confirmed: true, wouldAgain: wouldAgain || null, feedbackNote: note || "" });

  /* Extra sails together with a given skipper, from confirmed loop sails on top of
     the static sample data — so a repeat sail increases a count instead of adding
     a duplicate person or a stale number. */
  const extraTogether = (skipperSlug) =>
    Object.entries(readAll()).filter(([sailId, st]) => {
      if (!st.confirmed) return false;
      const sail = data.sails.find((x) => x.id === sailId);
      return sail && sail.skipper === skipperSlug;
    }).length;

  /* A copy of the current user's profile with confirmed loop sails folded in. Only
     ever applied to data.currentUser — sample skippers' data stays static. */
  const overlayMe = (p) => {
    const confirmed = Object.entries(readAll())
      .filter(([, st]) => st.confirmed)
      .map(([sailId]) => data.sails.find((x) => x.id === sailId))
      .filter(Boolean);
    if (!confirmed.length) return p;

    const recent = [
      ...confirmed.map((s) => ({ date: "Just now", title: s.title, boat: s.boat, place: s.location, role: s.positions[0] || "Crew" })),
      ...p.recent,
    ];
    const bySkipper = {};
    confirmed.forEach((s) => { bySkipper[s.skipper] = (bySkipper[s.skipper] || 0) + 1; });
    const sailedWith = p.sailedWith.map((w) => (bySkipper[w.slug] ? { ...w, sails: w.sails + bySkipper[w.slug] } : w));
    Object.keys(bySkipper).forEach((slug) => {
      if (!sailedWith.some((w) => w.slug === slug)) sailedWith.push({ slug, sails: bySkipper[slug] });
    });
    sailedWith.sort((a, b) => b.sails - a.sails);

    return { ...p, confirmedSails: p.confirmedSails + confirmed.length, recent, sailedWith };
  };

  window.CURRENT_LOOP = { get, request, accept, decline, confirm: confirmSail, extraTogether, overlayMe };

  /* Shared bits for the two page renderers below ---------------------------- */
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const fmtTime = (t) => {
    const [h, m] = t.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };
  const whenLabel = (s) => (s.multiDay ? "Multi-day" : `${DAYS[s.weekday]} · ${fmtTime(s.time)}`);
  const notFound = (msg) => `
    <div class="container"><div class="page-intro">
      <p class="eyebrow">Find a sail</p>
      <h1 class="display-2">${esc(msg)}</h1>
      <a class="link-arrow" href="find-a-sail.html">Find a sail <span>→</span></a>
    </div></div>`;

  /* Crew request: what the skipper sees when a sailor requests to crew --------- */
  const crEl = document.querySelector("[data-crew-request]");
  if (crEl) {
    const s = data.sails.find((x) => x.id === new URLSearchParams(location.search).get("id"));
    if (!s) {
      crEl.innerHTML = notFound("We could not find that sail.");
    } else {
      const skipper = data.profiles[s.skipper];
      const skipperFirst = skipper.name.split(" ")[0];
      const me = window.CURRENT_LOOP.overlayMe(data.profiles[data.currentUser]);
      document.title = `Crew request — ${s.title} — CURRENT`;

      const header = `
        <a class="link-back" href="sail.html?id=${esc(s.id)}">← Back to sail</a>
        <p class="cr-pov">Prototype: this is what ${esc(skipperFirst)} would see</p>
        <p class="eyebrow">Crew request</p>
        <h1 class="detail__title">${esc(s.title)}</h1>
        <p class="detail__sub">${esc(s.boat)} · ${esc(s.location)}</p>`;

      const previewCard = () => {
        const withPeople = me.sailedWith.slice(0, 5).map((w) => data.profiles[w.slug]).filter(Boolean);
        return `
          <section class="skipper-card cr-preview" aria-label="${esc(me.name)}'s CURRENT profile">
            <div class="skipper-card__id">
              ${avatar(me, "avatar--lg")}
              <div>
                <h2 class="skipper-card__name">${esc(me.name)}${verifiedTick()}</h2>
                <p class="skipper-card__area">${esc(me.sailingArea)}</p>
              </div>
            </div>
            <p class="cr-line">${me.types.map(esc).join(" · ")}</p>
            <p class="cr-line"><span class="pf-muted">Preferred positions</span> ${me.roles.map((r) => esc(r.name)).join(" · ")}</p>
            <dl class="skipper-card__nums">
              <div><dd>${me.confirmedSails}</dd><dt>confirmed sails</dt></div>
              <div><dd>${me.repeatConnections}</dd><dt>repeat connections</dt></div>
            </dl>
            ${withPeople.length ? `
              <div class="skipper-card__with">
                <span>Sailed with:</span>
                <ul class="avatar-row">${withPeople.map((m) => `<li title="${esc(m.name)}">${avatar(m)}</li>`).join("")}</ul>
              </div>` : ""}
            <a class="btn btn--ghost" href="profile.html?p=${esc(me.slug)}">View ${esc(me.name.split(" ")[0])}’s CURRENT profile <span aria-hidden="true">→</span></a>
          </section>`;
      };

      const paint = () => {
        const st = get(s.id);
        let body;
        if (!st || !st.requested) {
          body = `<div class="container cr-page">${header}<p class="cr-lede">There is no pending request for this sail yet.</p></div>`;
        } else if (st.accepted === true) {
          body = `
            <div class="container cr-page">${header}
              <p class="cr-lede">${esc(me.name)} is joining ${esc(s.title)}.</p>
              <p class="pf-muted">After the sail, you’ll both be able to confirm that you sailed together.</p>
              <div class="cr-actions">
                <a class="btn" href="confirm-sail.html?id=${esc(s.id)}">Simulate: confirm the sail <span aria-hidden="true">→</span></a>
                <a class="link-arrow" href="find-a-sail.html">Back to Find a sail <span>→</span></a>
              </div>
            </div>`;
        } else if (st.accepted === false) {
          body = `
            <div class="container cr-page">${header}
              <p class="cr-lede">You declined this request.</p>
              <a class="link-arrow" href="find-a-sail.html">Back to Find a sail <span>→</span></a>
            </div>`;
        } else {
          body = `
            <div class="container cr-page">${header}
              <p class="cr-lede">${esc(me.name)} requested to crew.</p>
              ${st.note ? `<p class="cr-note">“${esc(st.note)}”</p>` : ""}
              ${previewCard()}
              <div class="cr-actions">
                <button class="btn btn--ghost" type="button" data-decline>Decline</button>
                <button class="btn" type="button" data-accept>Accept</button>
              </div>
            </div>`;
        }
        crEl.innerHTML = body;
        crEl.querySelector("[data-accept]")?.addEventListener("click", () => { accept(s.id); paint(); });
        crEl.querySelector("[data-decline]")?.addEventListener("click", () => { decline(s.id); paint(); });
      };
      paint();
    }
  }

  /* Confirm sail: the sailor confirms afterwards, then a lightweight reputation question */
  const csEl = document.querySelector("[data-confirm-sail]");
  if (csEl) {
    const s = data.sails.find((x) => x.id === new URLSearchParams(location.search).get("id"));
    if (!s) {
      csEl.innerHTML = notFound("We could not find that sail.");
    } else {
      const skipper = data.profiles[s.skipper];
      const skipperFirst = skipper.name.split(" ")[0];
      document.title = `Confirm your sail — CURRENT`;

      const header = `
        <a class="link-back" href="sail.html?id=${esc(s.id)}">← Back to sail</a>
        <p class="eyebrow">Confirm your sail</p>
        <h1 class="detail__title">${esc(s.title)}</h1>
        <p class="detail__sub">${esc(s.boat)} · ${esc(s.location)}</p>
        <p class="cr-line pf-muted">${esc(whenLabel(s))}</p>`;

      const paint = () => {
        const st = get(s.id);
        let body;
        if (!st || st.accepted !== true) {
          body = `
            <div class="container cr-page">${header}
              <p class="cr-lede">This sail hasn’t been accepted yet.</p>
              <a class="link-arrow" href="crew-request.html?id=${esc(s.id)}">View the crew request <span>→</span></a>
            </div>`;
        } else if (!st.confirmed) {
          body = `
            <div class="container cr-page">${header}
              <p class="cr-lede">You sailed with ${esc(skipper.name)}.</p>
              <button class="btn btn--lg" type="button" data-confirm>Confirm sail</button>
            </div>`;
        } else if (!st.wouldAgain) {
          body = `
            <div class="container cr-page">${header}
              <p class="cr-lede">Added to your CURRENT history ✓</p>
              <p class="cr-question">Would you sail with ${esc(skipperFirst)} again?</p>
              <label class="field">
                <span>Add a note (optional)</span>
                <textarea data-cs-note rows="3" placeholder="What was it like sailing with ${esc(skipperFirst)}?"></textarea>
              </label>
              <div class="choice-row">
                <button class="btn btn--ghost" type="button" data-again="yes">Yes</button>
                <button class="btn btn--ghost" type="button" data-again="not-sure">Not sure</button>
              </div>
            </div>`;
        } else {
          body = `
            <div class="container cr-page">${header}
              <p class="cr-lede">Thanks — this is now part of your CURRENT history.</p>
              <a class="link-arrow" href="profile.html?p=${esc(data.currentUser)}">View your CURRENT profile <span>→</span></a>
            </div>`;
        }
        csEl.innerHTML = body;
        csEl.querySelector("[data-confirm]")?.addEventListener("click", () => { confirmSail(s.id, null); paint(); });
        csEl.querySelectorAll("[data-again]").forEach((b) =>
          b.addEventListener("click", () => {
            const note = csEl.querySelector("[data-cs-note]")?.value.trim() || "";
            confirmSail(s.id, b.dataset.again, note);
            paint();
          })
        );
      };
      paint();
    }
  }
})();
