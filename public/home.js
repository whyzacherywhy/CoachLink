async function updateHomeAuth() {
  const profileLink = document.querySelector("#coachProfileLink");
  const signOutButton = document.querySelector("#coachSignOutButton");
  const response = await fetch("/api/auth/me");
  if (!response.ok) return;
  const state = await response.json();
  if (!state.authenticated) return;

  profileLink.hidden = false;
  signOutButton.hidden = false;
}

updateHomeAuth().catch(() => {});
