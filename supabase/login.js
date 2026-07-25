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