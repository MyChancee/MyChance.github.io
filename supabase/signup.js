const formulario = document.getElementById("formSignup");
const mensaje = document.getElementById("mensaje");

// Si llegamos aquí desde Settings > Add account > Sign Up, mantenemos
// el contexto para volver a Settings después de loguear la cuenta nueva.
const signupParams = new URLSearchParams(window.location.search);
const isAddingAccount = signupParams.get("addingAccount") === "1";

// Si llegamos aquí porque un usuario de Google necesita completar su perfil.
const isCompleteMode = signupParams.get("mode") === "complete";

let currentStep = 0;
const steps = document.querySelectorAll(".step");

// ============================================================
// Ajustes visuales si venimos en modo "completar perfil"
// ============================================================
if (isCompleteMode) {
  document.getElementById("email")?.closest(".field")?.classList.add("hidden-field");
  document.getElementById("password")?.closest(".field")?.classList.add("hidden-field");

  document.querySelectorAll(".step h1, .step h2").forEach(el => {
    if (/create.*account/i.test(el.textContent)) {
      el.textContent = "Complete your account";
    }
  });

  const btnFinal = formulario?.querySelector('button[type="submit"]');
  if (btnFinal) btnFinal.textContent = "Complete your account";
}

function showStep(index) {
    steps.forEach(step => {
        step.classList.remove("active");
    });
    steps[index].classList.add("active");

    const mensajeEl = document.getElementById("mensaje");
    if (mensajeEl) mensajeEl.textContent = "";

    const step1Error = document.getElementById("step1-error");
    if (step1Error) step1Error.textContent = "";

    const step3Error = document.getElementById("step3-error");
    if (step3Error) step3Error.textContent = "";
}

function validateStep1() {
    const errorBox = document.getElementById("step1-error");
    const full_name = document.getElementById("full_name").value.trim();

    if (isCompleteMode) {
      if (!full_name) {
        errorBox.textContent = "Please enter your name.";
        return false;
      }
      errorBox.textContent = "";
      return true;
    }

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!full_name || !email || !password) {
        errorBox.textContent = "Please fill in all fields.";
        return false;
    }

    if (password.length < 6) {
        errorBox.textContent = "Password must be at least 6 characters long.";
        return false;
    }

    errorBox.textContent = "";
    return true;
}

function validateStep3() {
    const errorBox = document.getElementById("step3-error");
    const gpaValue = document.getElementById("gpa").value;
    const gpa = parseFloat(gpaValue);

    if (gpaValue === "" || isNaN(gpa)) {
        errorBox.textContent = "Please enter your GPA.";
        return false;
    }

    if (gpa > 4.0) {
        errorBox.textContent = "The maximum GPA is 4.0. If you don't know your GPA, use the converter above.";
        return false;
    }

    if (gpa < 0) {
        errorBox.textContent = "GPA cannot be negative.";
        return false;
    }

    errorBox.textContent = "";
    return true;
}

function nextStep() {
    if (currentStep === 0 && !validateStep1()) {
        return;
    }

    if (currentStep === 2 && !validateStep3()) {
        return;
    }

    if (currentStep < steps.length - 1) {
        currentStep++;
        showStep(currentStep);
    }
}

function prevStep() {
    if (currentStep > 0) {
        currentStep--;
        showStep(currentStep);
    }
}

function goBack(event) {
    event.preventDefault();

    if (window.history.length > 1) {
        window.history.back();
    } else {
        window.location.href = "login.html";
    }
}

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
  const age = parseInt(document.getElementById("age").value, 10) || null;
  const nationality = document.getElementById("nationality").value.trim();
  const gender = document.getElementById("gender").value;
  const academic_level = document.getElementById("academic_level").value;
  const gpa = parseFloat(document.getElementById("gpa").value);
  const countries_interest = document.getElementById("countries_interest").value.trim();
  const professional_interest = document.getElementById("professional_interest").value.trim();
  const modality = document.getElementById("modality").value;

  if (!full_name) {
    mensaje.textContent = "Please complete your name.";
    mensaje.style.color = "red";
    return;
  }

  if (!isNaN(gpa) && (gpa > 4.0 || gpa < 0)) {
    mensaje.textContent = "GPA must be between 0 and 4.0. Please go back and correct it.";
    mensaje.style.color = "red";
    return;
  }

  // ============================================================
  // MODO "COMPLETAR PERFIL" — usuario ya logueado vía Google
  // ============================================================
  if (isCompleteMode) {
    mensaje.textContent = "Saving your profile...";
    mensaje.style.color = "inherit";

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
      window.location.href = "login.html";
      return;
    }

    const { error: errorUpdate } = await supabaseClient
      .from("Usuarios")
      .update({
        full_name,
        age,
        nationality,
        gender,
        academic_level,
        gpa: isNaN(gpa) ? null : gpa,
        countries_interest,
        professional_interest,
        modality,
        form_completed: true
      })
      .eq("id", session.user.id);

    if (errorUpdate) {
      mensaje.textContent = "Error: " + errorUpdate.message;
      mensaje.style.color = "red";
      return;
    }

    mensaje.textContent = "Profile completed! Redirecting...";
    mensaje.style.color = "green";
    setTimeout(() => {
      window.location.href = "Profile.html";
    }, 1500);
    return;
  }

  // ============================================================
  // MODO NORMAL — signup con email + password (flujo original)
  // ============================================================
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    mensaje.textContent = "Please complete your email and password.";
    mensaje.style.color = "red";
    return;
  }

  if (password.length < 6) {
    mensaje.textContent = "Password must be at least 6 characters long.";
    mensaje.style.color = "red";
    return;
  }

  mensaje.textContent = "Creating account...";
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
        gpa: isNaN(gpa) ? null : gpa,
        countries_interest,
        professional_interest,
        modality,
        form_completed: true
      }]);

    console.log("PERFIL ERROR:", errorPerfil);

    if (errorPerfil) {
      mensaje.textContent = "Account created, but saving your profile failed: " + errorPerfil.message;
      mensaje.style.color = "red";
      return;
    }

    mensaje.textContent = "Account created successfully! Redirecting...";
    mensaje.style.color = "green";
    console.log("Redirigiendo en 2 segundos...");

    setTimeout(() => {
      console.log("Ejecutando redirección ahora");
      window.location.href = isAddingAccount ? "login.html?addingAccount=1" : "login.html";
    }, 2000);

  } catch (err) {
    console.error("ERROR INESPERADO:", err);
    mensaje.textContent = "Unexpected error: " + err.message;
    mensaje.style.color = "red";
  }
}

// ============================================================
// Precarga de datos existentes (usuarios de Google en modo
// "completar perfil"): traemos lo que ya tenga guardado para no
// empezar de cero cada vez que vuelve a este formulario.
// ============================================================
if (isCompleteMode) {
  precargarDatosExistentes();
}

async function precargarDatosExistentes() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;

  const { data: usuario, error } = await supabaseClient
    .from("Usuarios")
    .select("full_name, age, nationality, gender, academic_level, gpa, countries_interest, professional_interest, modality")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error || !usuario) return;

  if (usuario.full_name) document.getElementById("full_name").value = usuario.full_name;
  if (usuario.age !== null) document.getElementById("age").value = usuario.age;
  if (usuario.nationality) document.getElementById("nationality").value = usuario.nationality;
  if (usuario.gender) document.getElementById("gender").value = usuario.gender;
  if (usuario.academic_level) document.getElementById("academic_level").value = usuario.academic_level;
  if (usuario.gpa !== null) document.getElementById("gpa").value = usuario.gpa;
  if (usuario.countries_interest) document.getElementById("countries_interest").value = usuario.countries_interest;
  if (usuario.professional_interest) document.getElementById("professional_interest").value = usuario.professional_interest;
  if (usuario.modality) document.getElementById("modality").value = usuario.modality;
}
