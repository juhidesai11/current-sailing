/* CURRENT — auth pages: signup, login, check-email, reset-password. Thin
   per-page form wiring around the centralized auth module (auth.js); each
   block below is guarded by its own root selector, the same pattern loop.js
   already uses to drive more than one page from a single file. */
(() => {
  const auth = window.CURRENT_AUTH;

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const showError = (scope, message) => {
    const el = scope.querySelector("[data-form-error]");
    if (!el) return;
    el.textContent = message;
    el.hidden = !message;
  };

  /* Supabase's own error messages talk about implementation details a sailor
     signing up for a crew-finding app has no reason to see. */
  const friendlyError = (error) => {
    const msg = error?.message || "";
    if (/already registered|already exists/i.test(msg)) return "An account with that email already exists.";
    if (/invalid login credentials/i.test(msg)) return "Incorrect email or password.";
    if (/email not confirmed/i.test(msg)) return "Verify your email before logging in — check your inbox.";
    if (/password should be at least/i.test(msg)) return "Password must be at least 8 characters.";
    return "Something went wrong. Please try again.";
  };

  const afterLogin = async () => {
    const profile = await auth.getMyProfile();
    location.href = profile ? `profile.html?p=${encodeURIComponent(profile.slug)}` : "create-profile.html";
  };

  /* Sign up ------------------------------------------------------------------ */
  const signupRoot = document.querySelector("[data-signup]");
  if (signupRoot) {
    const form = signupRoot.querySelector("[data-signup-form]");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      showError(signupRoot, "");
      const email = form.querySelector("[data-f-email]").value.trim();
      const password = form.querySelector("[data-f-password]").value;
      const confirm = form.querySelector("[data-f-confirm]").value;

      if (!isValidEmail(email)) return showError(signupRoot, "Enter a valid email address.");
      if (password.length < 8) return showError(signupRoot, "Password must be at least 8 characters.");
      if (password !== confirm) return showError(signupRoot, "Passwords do not match.");

      const btn = form.querySelector("[data-submit]");
      btn.disabled = true;
      const { error } = await auth.signUp(email, password);
      btn.disabled = false;
      if (error) return showError(signupRoot, friendlyError(error));
      location.href = `check-email.html?email=${encodeURIComponent(email)}`;
    });
  }

  /* Log in -------------------------------------------------------------------- */
  const loginRoot = document.querySelector("[data-login]");
  if (loginRoot) {
    const form = loginRoot.querySelector("[data-login-form]");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      showError(loginRoot, "");
      const email = form.querySelector("[data-f-email]").value.trim();
      const password = form.querySelector("[data-f-password]").value;
      if (!isValidEmail(email) || !password) return showError(loginRoot, "Enter your email and password.");

      const btn = form.querySelector("[data-submit]");
      btn.disabled = true;
      const { error } = await auth.signIn(email, password);
      if (error) {
        btn.disabled = false;
        return showError(loginRoot, friendlyError(error));
      }
      await afterLogin();
    });
  }

  /* Check email ---------------------------------------------------------------- */
  const checkRoot = document.querySelector("[data-check-email]");
  if (checkRoot) {
    const email = new URLSearchParams(location.search).get("email") || "";
    const status = checkRoot.querySelector("[data-status]");
    const resendBtn = checkRoot.querySelector("[data-resend]");
    if (!email) {
      if (resendBtn) resendBtn.hidden = true;
      if (status) status.textContent = "Open the link from your email, or go back to log in.";
    }
    resendBtn?.addEventListener("click", async () => {
      resendBtn.disabled = true;
      const { error } = await auth.resendVerification(email);
      resendBtn.disabled = false;
      status.textContent = error ? "Could not resend right now. Try again shortly." : "Verification email sent.";
    });
  }

  /* Reset password --------------------------------------------------------- */
  const resetRoot = document.querySelector("[data-reset-password]");
  if (resetRoot) {
    const requestSection = resetRoot.querySelector("[data-reset-request]");
    const updateSection = resetRoot.querySelector("[data-reset-update]");

    /* Supabase's client detects the recovery token in the URL on load and fires
       this event — that's what tells us to show the "set a new password" form
       instead of the "send me a link" one. */
    auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        requestSection.hidden = true;
        updateSection.hidden = false;
      }
    });

    const requestForm = requestSection.querySelector("[data-reset-request-form]");
    requestForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      showError(requestSection, "");
      requestSection.querySelector("[data-reset-sent]").hidden = true;
      const email = requestForm.querySelector("[data-f-email]").value.trim();
      if (!isValidEmail(email)) return showError(requestSection, "Enter a valid email address.");

      const btn = requestForm.querySelector("[data-submit]");
      btn.disabled = true;
      const { error } = await auth.requestPasswordReset(email);
      btn.disabled = false;
      if (error) return showError(requestSection, friendlyError(error));
      requestSection.querySelector("[data-reset-sent]").hidden = false;
    });

    const updateForm = updateSection.querySelector("[data-reset-update-form]");
    updateForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      showError(updateSection, "");
      const password = updateForm.querySelector("[data-f-password]").value;
      const confirm = updateForm.querySelector("[data-f-confirm]").value;
      if (password.length < 8) return showError(updateSection, "Password must be at least 8 characters.");
      if (password !== confirm) return showError(updateSection, "Passwords do not match.");

      const btn = updateForm.querySelector("[data-submit]");
      btn.disabled = true;
      const { error } = await auth.updatePassword(password);
      if (error) {
        btn.disabled = false;
        return showError(updateSection, friendlyError(error));
      }
      await afterLogin();
    });
  }
})();
