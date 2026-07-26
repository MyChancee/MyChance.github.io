const formulario = document.getElementById("formSignup");
const mensaje = document.getElementById("mensaje");

// Si llegamos aquí desde Settings > Add account > Sign Up, mantenemos
// el contexto para volver a Settings después de loguear la cuenta nueva.
const signupParams = new URLSearchParams(window.location.search);
const isAddingAccount = signupParams.get("addingAccount") === "1";

formulario.addEventListener("submit", registrarUsuario);

formulario.addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    const esUltimoStep = document.querySelector(".step:last-of-type").classList.contains("active");

    if (!esUltimoStep) {
      e.preventDefault();
    }
  }
});

async function registrarUsuario(event) {
  event.preventDefault();

  const full_name = document.getElementById("full_name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const age = parseInt(document.getElementById("age").value, 10) || null;
  const nationality = document.getElementById("nationality").value.trim();
  const gender = document.getElementById("gender").value;
  const academic_level = document.getElementById("academic_level").value;
  const gpa = parseFloat(document.getElementById("gpa").value) || null;
  const countries_interest = document.getElementById("countries_interest").value.trim();
  const professional_interest = document.getElementById("professional_interest").value.trim();
  const modality = document.getElementById("modality").value;

  if (!full_name || !email || !password) {
    mensaje.textContent = "Completa nombre, email y contraseña.";
    mensaje.style.color = "red";
    return;
  }

  mensaje.textContent = "Creando cuenta...";
  mensaje.style.color = "inherit";

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email: email,
      password: password,
    });

    console.log("SIGNUP DATA:", data);
    console.log("SIGNUP ERROR:", error);

    if (error) {
      mensaje.textContent = "Error: " + error.message;
      mensaje.style.color = "red";
      return;
    }

    const userId = data.user.id;

    // Pequeña espera para asegurar que la sesión ya está activa antes de insertar
    await new Promise(resolve => setTimeout(resolve, 500));

    const { error: errorPerfil } = await supabaseClient
      .from("Usuarios")
      .insert([{
        id: userId,
        full_name,
        email,
        age,
        nationality,
        gender,
        academic_level,
        gpa,
        countries_interest,
        professional_interest,
        modality
      }]);

    console.log("PERFIL ERROR:", errorPerfil);

    if (errorPerfil) {
      mensaje.textContent = "Cuenta creada, pero falló guardar el perfil: " + errorPerfil.message;
      mensaje.style.color = "red";
      return;
    }

    mensaje.textContent = "¡Cuenta creada con éxito! Redirigiendo...";
    mensaje.style.color = "green";

    console.log("Redirigiendo en 2 segundos...");

    setTimeout(() => {
      console.log("Ejecutando redirección ahora");
      window.location.href = isAddingAccount ? "login.html?addingAccount=1" : "login.html";
    }, 2000);

  } catch (err) {
    console.error("ERROR INESPERADO:", err);
    mensaje.textContent = "Error inesperado: " + err.message;
    mensaje.style.color = "red";
  }
}
