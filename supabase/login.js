const formularioLogin = document.getElementById("formLogin");
const mensajeLogin = document.getElementById("mensajeLogin");

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

    mensajeLogin.textContent = "¡Bienvenido! Redirigiendo...";
    mensajeLogin.style.color = "green";

    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 1500);

  } catch (err) {
    console.error("ERROR INESPERADO:", err);
    mensajeLogin.textContent = "Error inesperado: " + err.message;
    mensajeLogin.style.color = "red";
  }
}

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
