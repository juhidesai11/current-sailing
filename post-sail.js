/* CURRENT — Post a sail: create or edit a real, Supabase-backed sail in
   `public.sails`. Requires a signed-in user with a completed CURRENT profile
   (see init()) — every real sail must have a resolvable real skipper, so
   posting is gated behind Create Profile rather than just being signed in.

   post-sail.html?id=<sail id> edits that sail instead of creating a new one,
   if — and only if — it already belongs to this signed-in user; RLS enforces
   that server-side regardless of what this page does. `skipper_user_id` is
   always the current session's own id, never anything the browser chooses. */
(() => {
  const root = document.querySelector("[data-post-sail]");
  if (!root) return;

  const { esc } = window.CURRENT_UI;
  const auth = window.CURRENT_AUTH;
  const supa = window.CURRENT_SUPABASE;

  const TYPE_OPTIONS = ["Racing", "Day sailing", "Cruising", "Delivery", "Training", "Other"];
  const LEVEL_OPTIONS = ["All levels", "Beginner", "Intermediate", "Intermediate+", "Advanced"];
  const ROLE_OPTIONS = ["Helm", "Bow", "Trimmer", "Pit", "Crew"];

  let sailId = null; // set when editing an existing sail
  let state = {
    title: "", type: TYPE_OPTIONS[0], boat: "", location: "",
    sailDate: "", startTime: "", duration: "", level: "", crewNeeded: "",
    roles: [], description: "", notes: "",
  };

  const val = (sel) => (root.querySelector(sel)?.value || "").trim();
  const toggle = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const toggleGroup = (options, selected, attr) =>
    `<div class="toggles" role="group">${options
      .map((o) => `<button type="button" class="toggle" data-${attr}="${esc(o)}" aria-pressed="${selected.includes(o)}">${esc(o)}</button>`)
      .join("")}</div>`;

  /* Capture every field's current DOM value into state before a repaint
     (toggling a role, adding/removing a custom one) would otherwise discard
     whatever's been typed elsewhere on the form — same reason create-profile.js
     syncs fields before repainting between steps. */
  const syncFields = () => {
    state.title = val("[data-f-title]");
    state.type = root.querySelector("[data-f-type]")?.value || state.type;
    state.boat = val("[data-f-boat]");
    state.location = val("[data-f-location]");
    state.sailDate = root.querySelector("[data-f-date]")?.value || "";
    state.startTime = root.querySelector("[data-f-time]")?.value || "";
    state.duration = val("[data-f-duration]");
    state.level = root.querySelector("[data-f-level]")?.value || "";
    state.crewNeeded = val("[data-f-crew]");
    state.description = val("[data-f-description]");
    state.notes = val("[data-f-notes]");
  };

  const setError = (msg) => {
    const el = root.querySelector("[data-form-error]");
    if (el) { el.textContent = msg; el.hidden = !msg; }
  };

  const paint = () => {
    const customRoles = state.roles.filter((r) => !ROLE_OPTIONS.includes(r));
    root.innerHTML = `
      <div class="container">
        <div class="onboard__shell">
          <div class="onboard__card">
            <p class="eyebrow">${sailId ? "Edit your sail" : "Post a sail"}</p>
            <h1>${sailId ? "Edit sail" : "Post a sail"}</h1>
            <p class="onboard__lede">${sailId ? "Update the details below." : "Share a real sailing opportunity with other sailors."}</p>
            <div class="onboard__fields">
              <label class="field"><span>Sail title</span><input type="text" data-f-title value="${esc(state.title)}" placeholder="e.g. Friday Night Race"></label>

              <label class="field"><span>Sail type</span>
                <select data-f-type>${TYPE_OPTIONS.map((t) => `<option ${t === state.type ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>
              </label>

              <label class="field"><span>Boat / class</span><input type="text" data-f-boat value="${esc(state.boat)}" placeholder="e.g. J/105"></label>
              <label class="field"><span>Location</span><input type="text" data-f-location value="${esc(state.location)}" placeholder="e.g. Berkeley Marina"></label>

              <label class="field"><span>Date</span><input type="date" data-f-date value="${esc(state.sailDate)}"></label>
              <label class="field"><span>Start time</span><input type="time" data-f-time value="${esc(state.startTime)}"></label>
              <label class="field"><span>Duration</span><input type="text" data-f-duration value="${esc(state.duration)}" placeholder="e.g. About 3 hours"></label>

              <label class="field"><span>Experience level</span>
                <select data-f-level>
                  <option value="">Not specified</option>
                  ${LEVEL_OPTIONS.map((l) => `<option ${l === state.level ? "selected" : ""}>${esc(l)}</option>`).join("")}
                </select>
              </label>
              <label class="field"><span>Crew needed</span><input type="text" data-f-crew value="${esc(state.crewNeeded)}" placeholder="e.g. 1–2 crew"></label>

              <label class="field"><span>Roles needed</span>${toggleGroup(ROLE_OPTIONS, state.roles, "role")}</label>
              <div class="entry-add">
                <label class="field"><span>Add another role</span><input type="text" data-role-custom placeholder="e.g. Navigator"></label>
                <button class="btn btn--ghost" type="button" data-role-add>Add</button>
              </div>
              ${customRoles.length ? `
                <div class="entry-list">
                  ${customRoles.map((r) => `
                    <div class="entry-row">
                      <div class="entry-row__body"><p class="entry-row__name">${esc(r)}</p></div>
                      <button class="entry-row__remove" type="button" data-role-remove="${esc(r)}" aria-label="Remove ${esc(r)}">×</button>
                    </div>`).join("")}
                </div>` : ""}

              <label class="field">
                <span>Description</span>
                <textarea data-f-description rows="3" placeholder="What's the plan for this sail?">${esc(state.description)}</textarea>
              </label>
              <label class="field">
                <span>Notes</span>
                <textarea data-f-notes rows="2" placeholder="Anything crew should know or bring.">${esc(state.notes)}</textarea>
              </label>

              <p class="small field-error" data-form-error hidden></p>
              <div class="onboard__nav onboard__nav--end">
                <button class="btn" type="button" data-submit>${sailId ? "Save changes" : "Post sail"} <span aria-hidden="true">→</span></button>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    wire();
  };

  const wire = () => {
    root.querySelectorAll("[data-role]").forEach((b) =>
      b.addEventListener("click", () => { syncFields(); state.roles = toggle(state.roles, b.dataset.role); paint(); }));
    root.querySelector("[data-role-add]")?.addEventListener("click", () => {
      syncFields();
      const v = val("[data-role-custom]");
      if (!v || state.roles.includes(v)) return;
      state.roles.push(v);
      paint();
    });
    root.querySelectorAll("[data-role-remove]").forEach((b) =>
      b.addEventListener("click", () => { syncFields(); state.roles = state.roles.filter((r) => r !== b.dataset.roleRemove); paint(); }));
    root.querySelector("[data-submit]")?.addEventListener("click", save);
  };

  /* Save: insert a new sail, or update this user's existing one (edit mode).
     skipper_user_id is always the live session's own id — never taken from
     any field on this form, so the browser can never post as someone else. */
  async function save() {
    syncFields();
    setError("");

    const session = await auth.getSession();
    if (!session) { location.href = "login.html"; return; } // session lapsed mid-form

    if (!state.title) return setError("Enter a sail title.");
    if (!state.boat) return setError("Enter the boat or class.");
    if (!state.location) return setError("Enter a location.");
    if (!state.sailDate) return setError("Choose a date.");
    if (!state.startTime) return setError("Choose a start time.");

    const btn = root.querySelector("[data-submit]");
    if (btn) btn.disabled = true;

    const payload = {
      skipper_user_id: session.user.id,
      title: state.title,
      type: state.type,
      boat: state.boat,
      location: state.location,
      sail_date: state.sailDate,
      start_time: state.startTime,
      duration: state.duration || null,
      description: state.description || null,
      experience_level: state.level || null,
      crew_needed: state.crewNeeded || null,
      roles_needed: state.roles,
      notes: state.notes || null,
    };

    try {
      const query = sailId
        ? supa.from("sails").update(payload).eq("id", sailId).select("id").single()
        : supa.from("sails").insert(payload).select("id").single();
      const { data: row, error } = await query;

      if (error) {
        console.error("Post a sail: save failed:", error);
        if (error.code === "42501" || /row-level security|permission denied/i.test(error.message || "")) {
          setError("You don't have permission to save this sail.");
        } else {
          setError("Could not save your sail. Please try again.");
        }
        if (btn) btn.disabled = false;
        return;
      }

      location.href = `sail.html?id=${encodeURIComponent(row.id)}`;
    } catch (err) {
      console.error("Post a sail: unexpected error:", err);
      setError("Could not save your sail. Please check your connection and try again.");
      if (btn) btn.disabled = false;
    }
  }

  /* Bootstrap: require a session AND a completed CURRENT profile — every
     real sail must have a resolvable real skipper, so this is stricter than
     just being signed in. In edit mode, load the existing sail and refuse to
     proceed if it isn't this user's own (RLS would refuse the eventual save
     regardless; this just avoids showing someone else's sail in the form). */
  async function init() {
    const session = await auth.getSession();
    if (!session) { location.href = "login.html"; return; }

    const profile = await auth.getMyProfile();
    if (!profile) { location.href = "create-profile.html"; return; }

    const editId = new URLSearchParams(location.search).get("id");
    if (editId) {
      const { data: row, error } = await supa.from("sails").select("*").eq("id", editId).maybeSingle();
      if (error || !row || row.skipper_user_id !== session.user.id) {
        location.href = "find-a-sail.html";
        return;
      }
      sailId = row.id;
      state = {
        title: row.title || "", type: row.type || TYPE_OPTIONS[0],
        boat: row.boat || "", location: row.location || "",
        sailDate: row.sail_date || "", startTime: (row.start_time || "").slice(0, 5),
        duration: row.duration || "", level: row.experience_level || "",
        crewNeeded: row.crew_needed || "", roles: [...(row.roles_needed || [])],
        description: row.description || "", notes: row.notes || "",
      };
    }

    paint();
  }

  init();
})();
