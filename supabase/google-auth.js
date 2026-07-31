// ============================================================
// google-auth.js
// Maneja el botón "Continue with Google" en login.html usando
// Supabase Auth (OAuth). No depende de login.js ni lo modifica:
// es un script independiente que solo escucha el click del botón
// de Google.
//
// Requiere que, en el dashboard de Supabase, el proveedor Google
// esté activado (Authentication > Providers > Google) con su
// Client ID / Secret, y que el dominio del sitio esté en la lista
// de Redirect URLs (Authentication > URL Configuration).
//
// FLUJO: click -> Supabase redirige a Google -> el usuario acepta
// -> Google vuelve a Supabase -> Supabase redirige de nuevo a
// nuestro sitio, ya logueado, directo a dashboard.html.
// La creación de la fila en "Usuarios" para usuarios nuevos de
// Google se maneja en session.js (que corre en dashboard.html),
// no acá.
// ============================================================

function setupGoogleLogin() {
  const btnGoogleLogin = document.getElementById("btnGoogleLogin");
  if (!btnGoogleLogin) return;

  // Si venimos de Settings > Add account, preservamos ese contexto
  // igual que ya hace el resto de login.html con "isAddingAccountPage".
  const params = new URLSearchParams(window.location.search);
  const isAddingAccount = params.get("addingAccount") === "1";

  btnGoogleLogin.addEventListener("click", async () => {
    btnGoogleLogin.disabled = true;
    const originalText = btnGoogleLogin.querySelector("span:last-child").textContent;
    btnGoogleLogin.querySelector("span:last-child").textContent = "Redirecting...";

    const redirectPath = isAddingAccount ? "dashboard.html?addingAccount=1" : "dashboard.html";

    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}${window.location.pathname.replace("login.html", "")}${redirectPath}`
      }
    });

    if (error) {
      console.error("Error iniciando sesión con Google:", error);
      btnGoogleLogin.disabled = false;
      btnGoogleLogin.querySelector("span:last-child").textContent = originalText;
      const mensajeLogin = document.getElementById("mensajeLogin");
      if (mensajeLogin) {
        mensajeLogin.textContent = "Could not start Google sign-in. Please try again.";
        mensajeLogin.style.color = "red";
      }
    }
    // Si no hay error, el navegador ya está siendo redirigido a
    // Google, así que no hace falta hacer nada más acá.
  });
}

setupGoogleLogin();
