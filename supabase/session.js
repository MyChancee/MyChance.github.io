// session.js
// Archivo compartido: trae el usuario logueado, lo crea en "Usuarios"
// si es su primer login con Google, revisa si le falta completar el
// formulario y lo redirige si hace falta. Incluir después de base.js
// en todas las páginas con sidebar (dashboard, opportunities, profile, favorites, etc).

async function cargarUsuario() {
  // 1. Verificar que haya una sesión activa
  const { data: { session }, error: errorSesion } = await supabaseClient.auth.getSession();
  if (errorSesion || !session) {
    window.location.href = "login.html";
    return;
  }

  const user = session.user;
  const userId = user.id;

  // 2. Buscar el perfil en "Usuarios"
  let { data: perfil, error: errorPerfil } = await supabaseClient
    .from("Usuarios")
    .select("full_name, form_completed")
    .eq("id", userId)
    .maybeSingle();

  if (errorPerfil) {
    console.error("Error buscando el perfil:", errorPerfil);
    return;
  }

  // 3. Si no existe (primer login con Google), lo creamos
  if (!perfil) {
    const metadata = user.user_metadata || {};
    const { data: nuevoPerfil, error: errorInsert } = await supabaseClient
      .from("Usuarios")
      .insert([{
        id: userId,
        full_name: metadata.full_name || metadata.name || user.email,
        email: user.email,
        avatar_url: metadata.avatar_url || metadata.picture || null,
        form_completed: false
      }])
      .select("full_name, form_completed")
      .single();

    if (errorInsert) {
      console.error("No se pudo crear el perfil:", errorInsert);
      return;
    }
    perfil = nuevoPerfil;
  }

  // 4. Si el form no está completo y no estamos ya en la página de completarlo, redirigimos
  const enPaginaDeCompletar = window.location.pathname.includes("signup.html");
  if (!perfil.form_completed && !enPaginaDeCompletar) {
    window.location.href = "signup.html?mode=complete";
    return;
  }

  // 5. Mostrar el nombre en la sidebar / welcome (comportamiento original)
  const primerNombre = (perfil.full_name || user.email).trim().split(" ")[0];
  const sidebarUserName = document.getElementById("sidebarUserName");
  const welcomeUserName = document.getElementById("welcomeUserName");
  if (sidebarUserName) sidebarUserName.textContent = primerNombre;
  if (welcomeUserName) welcomeUserName.textContent = primerNombre;
}

cargarUsuario();
