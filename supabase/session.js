async function cargarUsuario() {
  const { data: { session }, error: errorSesion } = await supabaseClient.auth.getSession();
  if (errorSesion || !session) {
    window.location.href = "login.html";
    return;
  }

  const user = session.user;
  const userId = user.id;

  let { data: perfil, error: errorPerfil } = await supabaseClient
    .from("Usuarios")
    .select("full_name, form_completed")
    .eq("id", userId)
    .maybeSingle();

  if (errorPerfil) {
    console.error("Error buscando el perfil:", errorPerfil);
    return;
  }

  // Si no existe (primer login con Google), lo creamos — pero SIN redirigir
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

  // Ya NO redirigimos. Solo mostramos el nombre disponible.
  const primerNombre = (perfil.full_name || user.email).trim().split(" ")[0];
  const sidebarUserName = document.getElementById("sidebarUserName");
  const welcomeUserName = document.getElementById("welcomeUserName");
  if (sidebarUserName) sidebarUserName.textContent = primerNombre;
  if (welcomeUserName) welcomeUserName.textContent = primerNombre;

  // Exponemos el estado por si otras páginas (profile, dashboard) lo necesitan
  window.usuarioActual = perfil;
}

cargarUsuario();
