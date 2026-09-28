/* CURRENT — the auth module: every page that touches Supabase Auth goes through
   here rather than calling window.CURRENT_SUPABASE.auth directly, so sign-up,
   sign-in, sign-out, session checks and the header's logged-in state all agree
   with each other. Loads after supabase-client.js and before script.js (which
   calls initNav() once it has mounted the header). */
(() => {
  const client = window.CURRENT_SUPABASE;

  const redirectTo = (page) => new URL(page, location.href).href;

  const signUp = (email, password) =>
    client.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo("login.html") } });

  const signIn = (email, password) => client.auth.signInWithPassword({ email, password });

  const signOut = () => client.auth.signOut();

  const getSession = async () => (await client.auth.getSession()).data.session;

  /* cb(event, session) — event is e.g. "SIGNED_IN", "SIGNED_OUT", "PASSWORD_RECOVERY". */
  const onAuthStateChange = (cb) => client.auth.onAuthStateChange((event, session) => cb(event, session));

  const resendVerification = (email) =>
    client.auth.resend({ type: "signup", email, options: { emailRedirectTo: redirectTo("login.html") } });

  const requestPasswordReset = (email) =>
    client.auth.resetPasswordForEmail(email, { redirectTo: redirectTo("reset-password.html") });

  const updatePassword = (password) => client.auth.updateUser({ password });

  /* This user's own CURRENT profile, if they have one yet — used to route login
     and to point the header's "My profile" link at the right slug. */
  const getMyProfile = async () => {
    const session = await getSession();
    if (!session) return null;
    const { data, error } = await client
      .from("profiles")
      .select("slug")
      .eq("user_id", session.user.id)
      .maybeSingle();
    return error ? null : data;
  };

  /* Header nav: by default script.js renders the logged-out nav (Log in / Create
     profile). If a session exists, swap those two for Post a sail (inert), My
     profile and Log out — see script.js for where this is called. */
  const applyLoggedInNav = async () => {
    const nav = document.getElementById("site-nav");
    if (!nav) return;

    nav.querySelector("[data-nav-login]")?.remove();

    const createBtn = nav.querySelector("[data-nav-create]");
    if (createBtn) {
      const soon = document.createElement("span");
      soon.className = "nav__soon";
      soon.textContent = "Post a sail";
      createBtn.insertAdjacentElement("beforebegin", soon);

      const profile = await getMyProfile();
      createBtn.textContent = "My profile";
      createBtn.removeAttribute("aria-current");
      createBtn.setAttribute("href", profile ? `profile.html?p=${encodeURIComponent(profile.slug)}` : "create-profile.html");
    }

    const logout = document.createElement("button");
    logout.type = "button";
    logout.className = "btn btn--ghost";
    logout.textContent = "Log out";
    logout.addEventListener("click", async () => {
      await signOut();
      location.href = "index.html";
    });
    nav.appendChild(logout);
  };

  const initNav = async () => {
    const session = await getSession();
    if (session) await applyLoggedInNav();
  };

  window.CURRENT_AUTH = {
    signUp, signIn, signOut, getSession, onAuthStateChange,
    resendVerification, requestPasswordReset, updatePassword,
    getMyProfile, initNav,
  };
})();
