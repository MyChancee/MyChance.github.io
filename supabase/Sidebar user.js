// ============================================================
// sidebar-user.js
// Script compartido: carga el nombre y la foto de perfil del
// usuario logueado y los pone en el sidebar (#sidebarUserName y
// #sidebarAvatar). Se incluye en TODAS las páginas que tengan
// ese sidebar (dashboard, opportunities, profile, favorites).
//
// Requiere que la página ya haya cargado antes:
//   - https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2
//   - ../supabase/base.js   (define supabaseClient)
//   - ../supabase/session.js
// ============================================================

async function loadSidebarUser() {
  const { data: userData, error: userError } = await supabaseClient.auth.getUser();

  if (userError || !userData?.user) {
    return;
  }

  const { data: usuario, error } = await supabaseClient
    .from("Usuarios")
    .select("full_name, avatar_url")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (error || !usuario) {
    return;
  }

  const nameEl = document.getElementById("sidebarUserName");
  const avatarEl = document.getElementById("sidebarAvatar");

  if (nameEl && usuario.full_name) {
    nameEl.textContent = usuario.full_name.split(" ")[0];
  }

  // El dashboard usa "welcomeUserName" para el saludo grande
  const welcomeEl = document.getElementById("welcomeUserName");
  if (welcomeEl && usuario.full_name) {
    welcomeEl.textContent = usuario.full_name.split(" ")[0];
  }

  if (avatarEl && usuario.avatar_url) {
    avatarEl.innerHTML = `<img src="${usuario.avatar_url}" alt="">`;
  }
}

loadSidebarUser();