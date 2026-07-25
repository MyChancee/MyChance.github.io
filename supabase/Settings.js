// ============================================================
// Settings.js
// Carga y guarda la preferencia de tema (dark/light) e idioma
// del usuario logueado. El cambio de tema se aplica al instante
// (vía theme.js / applyTheme) y se persiste en Usuarios.theme
// para que viaje entre dispositivos. El cambio de idioma ahora
// también se aplica al instante (vía language.js / applyLanguage)
// además de guardarse en Usuarios.language.
// ============================================================

const darkModeToggle = document.getElementById("darkModeToggle");
const themeSaveStatus = document.getElementById("themeSaveStatus");
const langSaveStatus = document.getElementById("langSaveStatus");
const langRadios = document.querySelectorAll('input[name="language"]');

let currentUserId = null;

function setThemeStatus(text) {
  themeSaveStatus.textContent = text;
  if (text) setTimeout(() => { themeSaveStatus.textContent = ""; }, 2500);
}

function setLangStatus(text) {
  langSaveStatus.textContent = text;
  if (text) setTimeout(() => { langSaveStatus.textContent = ""; }, 2500);
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

loadPreferences();