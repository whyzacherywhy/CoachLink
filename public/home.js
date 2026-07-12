async function updateHomeAuth() {
  const welcome = document.querySelector("#coachWelcome");
  const loginLink = document.querySelector("#coachLoginLink");
  const response = await fetch("/api/auth/me");
  if (!response.ok) return;
  const state = await response.json();
  if (!state.authenticated) return;

  const firstName = String(state.coach?.displayName || "Coach").trim().split(/\s+/)[0] || "Coach";
  welcome.textContent = `Welcome, Coach ${firstName}`;
  welcome.hidden = false;
  loginLink.hidden = true;
}

updateHomeAuth().catch(() => {});
