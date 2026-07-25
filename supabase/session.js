// session.js
// Archivo compartido: trae el usuario logueado y muestra su nombre
// en cualquier página que tenga sidebar (dashboard, opportunities,
// profile, favorites, etc). Incluir este script en todas ellas,
// después de base.js.

async function cargarUsuario() {
  // 1. Verificar que haya una sesión activa
  const { data: { session }, error: errorSesion } = await supabaseClient.auth.getSession();

  if (errorSesion || !session) {
    // No hay usuario logueado -> mandar al login
    window.location.href = "login.html";
    return;
  }

  const userId = session.user.id;

  // 2. Traer el perfil desde la tabla "Usuarios"
  const { data: perfil, error: errorPerfil } = await supabaseClient
    .from("Usuarios")
    .select("full_name")
    .eq("id", userId)
    .single();

  if (errorPerfil || !perfil) {
    console.error("No se pudo cargar el perfil:", errorPerfil);
    return;
  }

  const primerNombre = perfil.full_name.trim().split(" ")[0];

  // Actualiza el nombre en cualquier elemento que exista en la página actual
  const sidebarUserName = document.getElementById("sidebarUserName");
  const welcomeUserName = document.getElementById("welcomeUserName");

  if (sidebarUserName) sidebarUserName.textContent = primerNombre;
  if (welcomeUserName) welcomeUserName.textContent = primerNombre;
}

cargarUsuario();