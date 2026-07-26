const formularioLogin = document.getElementById("formLogin");
const mensajeLogin = document.getElementById("mensajeLogin");

// ¿Venimos de "Add account" en Settings? Si es así, al terminar
// volvemos a Settings en vez de mandar al usuario al dashboard.
const loginParams = new URLSearchParams(window.location.search);
const isAddingAccount = loginParams.get("addingAccount") === "1";

formularioLogin.addEventListener("submit", iniciarSesion);

async function iniciarSesion(event) {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    mensajeLogin.textContent = "Completa tu email y contraseña.";
    mensajeLogin.style.color = "red";
    return;
  }

  mensajeLogin.textContent = "Iniciando sesión...";
  mensajeLogin.style.color = "inherit";

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password,
    });

    console.log("LOGIN DATA:", data);
    console.log("LOGIN ERROR:", error);

    if (error) {
      mensajeLogin.textContent = "Error: " + error.message;
      mensajeLogin.style.color = "red";
      return;
    }

    // Guardamos esta sesión en la lista de cuentas del navegador,
    // para poder volver a ella desde Settings sin loguear de nuevo.
    if (data?.session && data?.user) {
      const { data: perfil } = await supabaseClient
        .from("Usuarios")
        .select("full_name, avatar_url")
        .eq("id", data.user.id)
        .maybeSingle();

      upsertSavedAccount({
        id: data.user.id,
        email: data.user.email,
        full_name: perfil?.full_name || data.user.email,
        avatar_url: perfil?.avatar_url || null,
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
    }

    mensajeLogin.textContent = "¡Bienvenido! Redirigiendo...";
    mensajeLogin.style.color = "green";

    setTimeout(() => {
      window.location.href = isAddingAccount ? "Settings.html" : "dashboard.html";
    }, 1500);

  } catch (err) {
    console.error("ERROR INESPERADO:", err);
    mensajeLogin.textContent = "Error inesperado: " + err.message;
    mensajeLogin.style.color = "red";
  }
}

// ============================================================
// FORGOT PASSWORD — modal
// ============================================================
const modalForgot = document.getElementById("modalForgot");
const btnForgot = document.getElementById("btnForgot");
const btnCloseForgot = document.getElementById("btnCloseForgot");
const mensajeForgotEmail = document.getElementById("mensajeForgotEmail");

btnForgot.addEventListener("click", (e) => {
  e.preventDefault();
  modalForgot.hidden = false;
});

btnCloseForgot.addEventListener("click", () => {
  modalForgot.hidden = true;
  mensajeForgotEmail.textContent = "";
});

document.getElementById("btnSendCode").addEventListener("click", async () => {
  const email = document.getElementById("forgotEmail").value.trim();
  if (!email) {
    mensajeForgotEmail.textContent = "Ingresa tu correo.";
    mensajeForgotEmail.style.color = "red";
    return;
  }
  mensajeForgotEmail.textContent = "Enviando link...";
  mensajeForgotEmail.style.color = "inherit";

  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname.replace("login.html", "reset-password.html"),
  });

  if (error) {
    mensajeForgotEmail.textContent = "Error: " + error.message;
    mensajeForgotEmail.style.color = "red";
    return;
  }

  mensajeForgotEmail.textContent = "¡Listo! Revisa tu correo.";
  mensajeForgotEmail.style.color = "green";
});
