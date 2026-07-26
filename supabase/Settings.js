// ============================================================
// Settings.js
// Carga y guarda la preferencia de tema (dark/light) e idioma
// del usuario logueado. El cambio de tema se aplica al instante
// (vía theme.js / applyTheme) y se persiste en Usuarios.theme
// para que viaje entre dispositivos. El cambio de idioma ahora
// también se aplica al instante (vía language.js / applyLanguage)
// además de guardarse en Usuarios.language.
//
// También maneja la tarjeta de Account: lista todas las cuentas
// guardadas en este navegador (accounts.js), permite saltar entre
// ellas sin volver a loguear, y ofrece dos formas de cerrar sesión:
// solo la cuenta activa, o todas las cuentas guardadas.
// ============================================================
const darkModeToggle = document.getElementById("darkModeToggle");
const themeSaveStatus = document.getElementById("themeSaveStatus");
const langSaveStatus = document.getElementById("langSaveStatus");
const langRadios = document.querySelectorAll('input[name="language"]');

const accountList = document.getElementById("accountList");
const accountStatus = document.getElementById("accountStatus");
const logoutActiveBtn = document.getElementById("logoutActiveBtn");
const logoutAllBtn = document.getElementById("logoutAllBtn");

let currentUserId = null;

function setThemeStatus(text) {
  themeSaveStatus.textContent = text;
  if (text) setTimeout(() => { themeSaveStatus.textContent = ""; }, 2500);
}
function setLangStatus(text) {
  langSaveStatus.textContent = text;
  if (text) setTimeout(() => { langSaveStatus.textContent = ""; }, 2500);
}
function setAccountStatus(text) {
  if (!accountStatus) return;
  accountStatus.textContent = text;
  if (text) setTimeout(() => { accountStatus.textContent = ""; }, 3000);
}

async function loadPreferences() {
  const { data: userData, error: userError } = await supabaseClient.auth.getUser();
  if (userError || !userData?.user) return;
  currentUserId = userData.user.id;
  const { data: usuario, error } = await supabaseClient
    .from("Usuarios")
    .select("theme, language")
    .eq("id", currentUserId)
    .maybeSingle();
  if (error) {
    console.error("Error cargando preferencias:", error);
    return;
  }
  const theme = usuario?.theme || "light";
  darkModeToggle.checked = theme === "dark";
  applyTheme(theme); // ya estaba aplicado por theme.js, esto solo confirma
  const language = usuario?.language || "es";
  langRadios.forEach(radio => { radio.checked = radio.value === language; });
  applyLanguage(language); // ya estaba aplicado por language.js, esto solo confirma
}

darkModeToggle.addEventListener("change", async () => {
  const newTheme = darkModeToggle.checked ? "dark" : "light";
  applyTheme(newTheme);
  if (!currentUserId) return;
  const { error } = await supabaseClient
    .from("Usuarios")
    .update({ theme: newTheme })
    .eq("id", currentUserId);
  if (error) {
    console.error("Error guardando el tema:", error);
    setThemeStatus("Could not save.");
    return;
  }
  setThemeStatus("Saved ✓");
});

langRadios.forEach(radio => {
  radio.addEventListener("change", async () => {
    if (!radio.checked || !currentUserId) return;
    // Cambia el idioma visible YA, sin esperar la respuesta de Supabase.
    applyLanguage(radio.value);
    const { error } = await supabaseClient
      .from("Usuarios")
      .update({ language: radio.value })
      .eq("id", currentUserId);
    if (error) {
      console.error("Error guardando el idioma:", error);
      setLangStatus(DICTIONARY[radio.value]["settings.error"]);
      return;
    }
    setLangStatus(DICTIONARY[radio.value]["settings.saved"]);
  });
});

// ============================================================
// ACCOUNT — lista de cuentas, cambio de sesión y logout
// ============================================================

// Trae la sesión activa, asegura que quede guardada en la lista
// de cuentas de este navegador (por si nunca pasó por login.js
// actualizado), y dibuja el switcher.
async function loadAccountInfo() {
  const { data: sessionData, error } = await supabaseClient.auth.getSession();
  const session = sessionData?.session;

  if (error || !session) {
    renderAccountList();
    return;
  }

  currentUserId = session.user.id;

  const { data: usuario } = await supabaseClient
    .from("Usuarios")
    .select("full_name, avatar_url")
    .eq("id", currentUserId)
    .maybeSingle();

  upsertSavedAccount({
    id: currentUserId,
    email: session.user.email,
    full_name: usuario?.full_name || session.user.email,
    avatar_url: usuario?.avatar_url || null,
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });

  renderAccountList();
}

function renderAccountList() {
  if (!accountList) return;

  const accounts = getSavedAccounts();
  accountList.innerHTML = "";

  if (accounts.length === 0) {
    const empty = document.createElement("p");
    empty.className = "account-empty";
    empty.textContent = "No saved accounts on this device yet.";
    accountList.appendChild(empty);
    return;
  }

  accounts.forEach(acc => {
    const isActive = acc.id === currentUserId;

    const row = document.createElement(isActive ? "div" : "button");
    row.className = "account-row" + (isActive ? "" : " is-switchable");
    if (!isActive) row.type = "button";

    row.innerHTML = `
      <div class="account-avatar">${acc.avatar_url ? `<img src="${acc.avatar_url}" alt="">` : "👤"}</div>
      <div class="account-info">
        <span class="account-name">${acc.full_name || acc.email}</span>
        <span class="account-email">${acc.email}</span>
      </div>
      ${isActive ? '<span class="account-check" aria-hidden="true">✓</span>' : ""}
    `;

    if (!isActive) {
      row.addEventListener("click", () => switchAccount(acc));
    }

    accountList.appendChild(row);
  });
}

// Salta a otra cuenta guardada sin pasar por el formulario de login.
async function switchAccount(acc) {
  setAccountStatus("Switching account...");

  const { error } = await supabaseClient.auth.setSession({
    access_token: acc.access_token,
    refresh_token: acc.refresh_token,
  });

  if (error) {
    console.error("Error cambiando de cuenta:", error);
    // El token guardado ya no sirve (expiró / se revocó) -> lo sacamos
    // de la lista para que no se vuelva a intentar.
    removeSavedAccount(acc.id);
    setAccountStatus("That session expired. Log in again to reconnect it.");
    renderAccountList();
    return;
  }

  window.location.reload();
}

// Cierra SOLO la cuenta activa: la saca de la lista guardada y,
// si queda alguna otra cuenta, salta a ella automáticamente.
logoutActiveBtn?.addEventListener("click", async () => {
  logoutActiveBtn.disabled = true;
  setAccountStatus("Logging out...");

  const idToRemove = currentUserId;
  removeSavedAccount(idToRemove);
  await supabaseClient.auth.signOut();

  const remaining = getSavedAccounts();

  if (remaining.length > 0) {
    const next = remaining[0];
    const { error } = await supabaseClient.auth.setSession({
      access_token: next.access_token,
      refresh_token: next.refresh_token,
    });

    if (!error) {
      window.location.reload();
      return;
    }

    // Ese token tampoco sirve: lo quitamos y seguimos igual al login.
    removeSavedAccount(next.id);
  }

  window.location.href = "login.html";
});

// Cierra TODAS las cuentas guardadas en este navegador.
logoutAllBtn?.addEventListener("click", async () => {
  logoutAllBtn.disabled = true;
  setAccountStatus("Logging out of all accounts...");

  clearSavedAccounts();
  await supabaseClient.auth.signOut();

  window.location.href = "login.html";
});

loadPreferences();
loadAccountInfo();
