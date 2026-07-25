// ============================================================
// theme.js
// Aplica el modo oscuro/claro guardado por el usuario, en
// cualquier página que incluya este script (después de
// theme-dark.css). Se usa localStorage para aplicarlo al
// instante (sin esperar la red ni parpadear), y Supabase para
// que la preferencia viaje entre dispositivos.
// ============================================================

const THEME_STORAGE_KEY = "mychance_theme";

function applyTheme(theme) {
  const normalized = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", normalized);
  localStorage.setItem(THEME_STORAGE_KEY, normalized);
}

// Aplicar inmediatamente lo que haya en localStorage, antes de
// esperar cualquier respuesta de Supabase (evita el parpadeo).
(function applyCachedThemeEarly() {
  const cached = localStorage.getItem(THEME_STORAGE_KEY);
  if (cached) document.documentElement.setAttribute("data-theme", cached);
})();

// Sincroniza contra el valor guardado en Usuarios.theme, por si
// el usuario cambió la preferencia desde otro dispositivo.
async function syncThemeFromServer() {
  if (typeof supabaseClient === "undefined") return;

  const { data: userData } = await supabaseClient.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return;

  const { data, error } = await supabaseClient
    .from("Usuarios")
    .select("theme")
    .eq("id", userId)
    .maybeSingle();

  if (!error && data?.theme) applyTheme(data.theme);
}

syncThemeFromServer();