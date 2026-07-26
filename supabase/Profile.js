// ============================================================
// profile.js
// - Perfil base + subida de foto (igual que antes).
// - LC (Life Curriculum): campos extra, solo premium/enterprise.
// - My Goals: lista de oportunidades marcadas con 🎯 (tabla
//   "Metas"), ordenadas por prioridad. Free plan: máx 1 goal,
//   sin reordenar. Premium/Enterprise: varios, con botones tipo
//   Canva (traer al frente / adelante / atrás / enviar al fondo).
//   Cada goal tiene su propio checklist de requirements, que el
//   usuario tilda manualmente.
// ============================================================

const avatarInput = document.getElementById("avatarInput");
const avatarCamera = document.querySelector(".avatar-camera");
const avatarPreview = document.getElementById("avatarPreview");
const profileForm = document.getElementById("profileForm");
const editToggleBtn = document.getElementById("editToggleBtn");
const saveStatus = document.getElementById("saveStatus");

const editableFields = [
  document.getElementById("fullName"),
  document.getElementById("age"),
  document.getElementById("nationality"),
  document.getElementById("gender"),
  document.getElementById("academicLevel"),
  document.getElementById("gpa"),
  document.getElementById("modality"),
  document.getElementById("countriesInterest"),
  document.getElementById("professionalInterest")
];

const lcForm = document.getElementById("lcForm");
const lcLocked = document.getElementById("lcLocked");
const lcEditToggleBtn = document.getElementById("lcEditToggleBtn");
const lcSaveStatus = document.getElementById("lcSaveStatus");

const lcEditableFields = [
  document.getElementById("lcToefl"),
  document.getElementById("lcBachelor"),
  document.getElementById("lcRecLetters"),
  document.getElementById("lcLanguages"),
  document.getElementById("lcWorkExperience"),
  document.getElementById("lcVolunteerExperience"),
  document.getElementById("lcLeadership"),
  document.getElementById("lcCertifications")
];

let currentUserId = null;
let currentUserPlan = "free";
let isEditing = false;
let isLcEditing = false;
let GOALS = []; // [{ id (Metas.id), opportunity_id, priority, checklist, opportunity: {...} }]
let expandedGoalId = null;

// ------------------------------------------------------------
// Utilidades
// ------------------------------------------------------------
function setStatus(text, isError = false) {
  saveStatus.textContent = text;
  saveStatus.style.color = isError ? "#B3261E" : "var(--green)";
  if (text) setTimeout(() => { saveStatus.textContent = ""; }, 3000);
}

function setLcStatus(text, isError = false) {
  lcSaveStatus.textContent = text;
  lcSaveStatus.style.color = isError ? "#B3261E" : "var(--green)";
  if (text) setTimeout(() => { lcSaveStatus.textContent = ""; }, 3000);
}

function normalize(str) {
  return String(str).trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function setSelectValue(selectEl, rawValue) {
  if (!rawValue) { selectEl.value = ""; return; }

  const target = normalize(rawValue);
  const match = Array.from(selectEl.options).find(opt => normalize(opt.value) === target || normalize(opt.textContent) === target);

  if (match) {
    selectEl.value = match.value;
  } else {
    const newOption = document.createElement("option");
    newOption.value = rawValue;
    newOption.textContent = rawValue;
    selectEl.appendChild(newOption);
    selectEl.value = rawValue;
  }
}

function renderMiniLogo(opp) {
  if (opp.logo_url && opp.logo_url.trim() !== "") {
    return `<div class="goal-item-logo" style="background:${opp.logo_color}">
      <img src="${opp.logo_url}" alt="" onerror="this.parentElement.innerHTML='${opp.logo_initial}'">
    </div>`;
  }
  return `<div class="goal-item-logo" style="background:${opp.logo_color}">${opp.logo_initial}</div>`;
}

function fillForm(usuario) {
  document.getElementById("fullName").value = usuario?.full_name || "";
  document.getElementById("email").value = usuario?.email || "";
  document.getElementById("age").value = usuario?.age ?? "";
  document.getElementById("nationality").value = usuario?.nationality || "";
  setSelectValue(document.getElementById("gender"), usuario?.gender);
  setSelectValue(document.getElementById("academicLevel"), usuario?.academic_level);
  document.getElementById("gpa").value = usuario?.gpa ?? "";
  setSelectValue(document.getElementById("modality"), usuario?.modality);
  document.getElementById("countriesInterest").value = usuario?.countries_interest || "";
  document.getElementById("professionalInterest").value = usuario?.professional_interest || "";

  if (usuario?.avatar_url) {
    avatarPreview.innerHTML = `<img src="${usuario.avatar_url}" alt="Profile photo">`;
  }

  const sidebarName = document.getElementById("sidebarUserName");
  const sidebarAvatar = document.getElementById("sidebarAvatar");
  const planBadge = document.getElementById("planBadge");
  const sidebarEl = document.querySelector(".sidebar");

  if (sidebarName && usuario?.full_name) sidebarName.textContent = usuario.full_name.split(" ")[0];
  if (sidebarAvatar && usuario?.avatar_url) sidebarAvatar.innerHTML = `<img src="${usuario.avatar_url}" alt="">`;

  const isPremium = usuario?.plan === "premium" || usuario?.plan === "enterprise";

  if (planBadge) {
    const planLabels = { free: "Free plan", premium: "Premium plan", enterprise: "Enterprise plan" };
    planBadge.textContent = planLabels[usuario?.plan] || "Free plan";
  }
  if (sidebarEl) sidebarEl.classList.toggle("premium", isPremium);
}

function setEditing(editing) {
  isEditing = editing;
  editableFields.forEach(field => { field.disabled = !editing; });
  editToggleBtn.textContent = editing ? "Save changes" : "Edit profile";
}

// ------------------------------------------------------------
// LC
// ------------------------------------------------------------

// Los campos de LC que son <textarea> (idiomas, experiencia laboral,
// voluntariado, liderazgo, certificaciones) necesitan crecer solos
// según el contenido, en vez de quedar con scroll interno o cortar
// el texto como haría un <input>.
function autoResizeTextareas() {
  document.querySelectorAll(".lc-form textarea").forEach(t => {
    t.style.height = "auto";
    t.style.height = t.scrollHeight + "px";
  });
}

function fillLcForm(usuario) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };

  set("lcToefl", usuario?.lc_toefl_ielts === true ? "true" : usuario?.lc_toefl_ielts === false ? "false" : "");
  set("lcBachelor", usuario?.lc_bachelor_completed === true ? "true" : usuario?.lc_bachelor_completed === false ? "false" : "");
  set("lcRecLetters", usuario?.lc_recommendation_letters ?? "");
  set("lcLanguages", usuario?.lc_languages || "");
  set("lcWorkExperience", usuario?.lc_work_experience || "");
  set("lcVolunteerExperience", usuario?.lc_volunteer_experience || "");
  set("lcLeadership", usuario?.lc_leadership_experience || "");
  set("lcCertifications", usuario?.lc_certifications || "");
}

function setLcEditing(editing) {
  isLcEditing = editing;
  lcEditableFields.forEach(field => { if (field) field.disabled = !editing; });
  lcEditToggleBtn.textContent = editing ? "Save LC" : "Edit LC";
}

function setupLc(usuario) {
  const isPremium = usuario?.plan === "premium" || usuario?.plan === "enterprise";

  if (isPremium) {
    lcLocked.style.display = "none";
    lcForm.style.display = "flex";
    fillLcForm(usuario);
    autoResizeTextareas();
  } else {
    lcLocked.style.display = "block";
    lcForm.style.display = "none";
  }
}

lcEditToggleBtn?.addEventListener("click", async () => {
  if (!isLcEditing) {
    setLcEditing(true);
    document.getElementById("lcToefl")?.focus();
    autoResizeTextareas();
    return;
  }

  if (!currentUserId) {
    setLcStatus("No user session found.", true);
    return;
  }

  const toeflVal = document.getElementById("lcToefl").value;
  const bachelorVal = document.getElementById("lcBachelor").value;

  const payload = {
    lc_toefl_ielts: toeflVal === "" ? null : toeflVal === "true",
    lc_bachelor_completed: bachelorVal === "" ? null : bachelorVal === "true",
    lc_recommendation_letters: document.getElementById("lcRecLetters").value ? Number(document.getElementById("lcRecLetters").value) : null,
    lc_languages: document.getElementById("lcLanguages").value.trim(),
    lc_work_experience: document.getElementById("lcWorkExperience").value.trim(),
    lc_volunteer_experience: document.getElementById("lcVolunteerExperience").value.trim(),
    lc_leadership_experience: document.getElementById("lcLeadership").value.trim(),
    lc_certifications: document.getElementById("lcCertifications").value.trim()
  };

  const { error } = await supabaseClient.from("Usuarios").update(payload).eq("id", currentUserId);

  if (error) {
    console.error("Error guardando el LC:", error);
    setLcStatus("Could not save changes.", true);
    return;
  }

  setLcEditing(false);
  setLcStatus("Saved ✓");
  autoResizeTextareas();
});

// Mientras el usuario escribe en un textarea del LC, que crezca
// en tiempo real en vez de esperar a guardar.
document.querySelectorAll(".lc-form textarea").forEach(t => {
  t.addEventListener("input", () => {
    t.style.height = "auto";
    t.style.height = t.scrollHeight + "px";
  });
});

// ------------------------------------------------------------
// My Goals: cargar Metas + datos de cada Oportunidad
// ------------------------------------------------------------
async function loadGoals() {
  const emptyNote = document.getElementById("goalsEmptyNote");
  const premiumNote = document.getElementById("goalsPremiumNote");
  const isPremium = currentUserPlan === "premium" || currentUserPlan === "enterprise";

  const { data: metas, error } = await supabaseClient
    .from("Metas")
    .select("*")
    .eq("user_id", currentUserId)
    .order("priority", { ascending: true });

  if (error) {
    console.error("Error trayendo goals:", error);
    return;
  }

  if (!metas || metas.length === 0) {
    GOALS = [];
    document.getElementById("goalsList").innerHTML = "";
    emptyNote.style.display = "block";
    premiumNote.style.display = "none";
    renderTopGoalProgress();
    return;
  }

  const oppIds = metas.map(m => m.opportunity_id);

  const { data: opportunities, error: oppError } = await supabaseClient
    .from("Oportunidades")
    .select("id, title, country, format, logo_color, logo_initial, logo_url, requirements")
    .in("id", oppIds);

  if (oppError) {
    console.error("Error trayendo las becas de los goals:", oppError);
    return;
  }

  // El match_percent de la tabla "Oportunidades" es un valor fijo,
  // no el calculado para este usuario. Traemos el match real vía el
  // mismo RPC que usan opportunities.js / dashboard.js, para que el
  // mini widget de progreso (abajo de la lista) muestre el número
  // correcto, coherente con el resto de la app.
  const { data: matched, error: matchError } = await supabaseClient
    .rpc("get_matched_opportunities", { p_user_id: currentUserId });

  const matchMap = new Map();
  if (!matchError && matched) {
    matched.forEach(o => matchMap.set(o.id, o.match_percent));
  } else if (matchError) {
    console.error("Error trayendo el match real de las oportunidades:", matchError);
  }

  GOALS = metas.map(m => {
    const opp = opportunities.find(o => o.id === m.opportunity_id) || null;
    return {
      ...m,
      checklist: Array.isArray(m.checklist) ? m.checklist : [],
      opportunity: opp ? { ...opp, match_percent: matchMap.get(opp.id) ?? 0 } : null
    };
  }).filter(g => g.opportunity !== null);

  emptyNote.style.display = "none";
  premiumNote.style.display = (!isPremium) ? "block" : "none";

  // El checklist del goal de mayor prioridad (#1) arranca abierto,
  // así se ve directamente debajo de "My Goals" sin tener que
  // hacer clic para expandirlo.
  if (expandedGoalId === null && GOALS.length > 0) {
    expandedGoalId = GOALS[0].id;
  }

  renderGoalsList(isPremium);
  renderTopGoalProgress();
}

function renderGoalsList(isPremium) {
  const container = document.getElementById("goalsList");
  const canReorder = isPremium && GOALS.length > 1;

  container.innerHTML = GOALS.map((goal, index) => {
    const opp = goal.opportunity;
    const requirements = Array.isArray(opp.requirements) ? opp.requirements : [];
    const isExpanded = expandedGoalId === goal.id;

    const reorderButtons = canReorder ? `
      <button class="goal-reorder-btn" data-front="${goal.id}" title="Bring to front" ${index === 0 ? "disabled" : ""}>⇈</button>
      <button class="goal-reorder-btn" data-forward="${goal.id}" title="Bring forward" ${index === 0 ? "disabled" : ""}>↑</button>
      <button class="goal-reorder-btn" data-backward="${goal.id}" title="Send backward" ${index === GOALS.length - 1 ? "disabled" : ""}>↓</button>
      <button class="goal-reorder-btn" data-back="${goal.id}" title="Send to back" ${index === GOALS.length - 1 ? "disabled" : ""}>⇊</button>
    ` : "";

    const checklistHtml = requirements.length > 0 ? `
      <div class="checklist-progress-wrap">
        <div class="checklist-progress-bar"><div class="checklist-progress-fill" data-fill="${goal.id}"></div></div>
        <span class="checklist-progress-label" data-label="${goal.id}"></span>
      </div>
      <ul class="checklist-list">
        ${requirements.map((req, i) => `
          <li class="checklist-item ${goal.checklist[i] ? "done" : ""}" data-goal="${goal.id}" data-index="${i}">
            <input type="checkbox" ${goal.checklist[i] ? "checked" : ""} data-goal="${goal.id}" data-index="${i}">
            <span>${req}</span>
          </li>
        `).join("")}
      </ul>
    ` : `<p class="goals-empty-note">This opportunity has no listed requirements yet.</p>`;

    return `
      <div class="goal-item" data-id="${goal.id}">
        <div class="goal-item-top" data-toggle="${goal.id}">
          <span class="goal-priority">#${index + 1}</span>
          ${renderMiniLogo(opp)}
          <div class="goal-item-info">
            <p class="goal-item-title">${opp.title}</p>
            <span class="goal-item-match">📍 ${opp.country}</span>
          </div>
          <div class="goal-item-actions">
            ${reorderButtons}
            <button class="goal-remove-btn" data-remove="${goal.id}" title="Remove goal">✕</button>
          </div>
        </div>
        <div class="goal-item-checklist" style="display:${isExpanded ? "block" : "none"};">
          ${checklistHtml}
        </div>
      </div>
    `;
  }).join("");

  // Progreso de cada checklist visible
  GOALS.forEach(goal => {
    const requirements = Array.isArray(goal.opportunity.requirements) ? goal.opportunity.requirements : [];
    if (requirements.length === 0) return;
    updateChecklistProgress(goal.id, requirements.length);
  });

  attachGoalListEvents();
}

function updateChecklistProgress(goalId, total) {
  const goal = GOALS.find(g => g.id === goalId);
  if (!goal) return;

  const done = goal.checklist.filter(Boolean).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  const fill = document.querySelector(`[data-fill="${goalId}"]`);
  const label = document.querySelector(`[data-label="${goalId}"]`);
  if (fill) fill.style.width = `${pct}%`;
  if (label) label.textContent = `${done} / ${total} completed`;
}

// ------------------------------------------------------------
// Mini widget de progreso del goal #1 (mayor prioridad), para que
// el usuario lo vea acá mismo sin tener que ir al dashboard.
// Misma lógica que "Current Goal" en dashboard.js: el número
// arranca en el match real (nunca en 0%) y sube hacia 100% a
// medida que se tilda la checklist; el tramo ganado se pinta en
// dorado (--premium-gold) sobre el mismo marrón del match original.
// ------------------------------------------------------------
function checklistProgressPct(checklist, totalRequirements) {
  if (!totalRequirements || totalRequirements === 0) return null;
  const done = (checklist || []).filter(Boolean).length;
  return Math.round((done / totalRequirements) * 100);
}

function renderTopGoalProgress() {
  const container = document.getElementById("topGoalProgressCard");
  if (!container) return; // si el HTML todavía no tiene este contenedor, no hace nada

  if (GOALS.length === 0) {
    container.innerHTML = "";
    container.style.display = "none";
    return;
  }

  const top = GOALS[0];
  const opp = top.opportunity;
  const totalRequirements = Array.isArray(opp.requirements) ? opp.requirements.length : 0;
  const checklistPct = checklistProgressPct(top.checklist, totalRequirements);
  const matchPct = opp.match_percent ?? 0;

  const displayPct = checklistPct !== null
    ? Math.round(matchPct + (checklistPct / 100) * (100 - matchPct))
    : matchPct;
  const isComplete = checklistPct !== null && checklistPct >= 100;

  container.style.display = "flex";
  container.innerHTML = `
    <div class="tgp-ring" style="--match:${matchPct}; --pct:${displayPct}">
      <span class="tgp-pct ${isComplete ? "tgp-pct--complete" : ""}">${displayPct}%</span>
    </div>
    <div class="tgp-info">
      <p class="tgp-label">Current Goal Progress</p>
      <p class="tgp-name">${opp.title}</p>
      <p class="tgp-sub">${isComplete ? "Goal reached! 🎉" : "Keep going!"}</p>
    </div>
  `;
}

function attachGoalListEvents() {
  const isPremium = currentUserPlan === "premium" || currentUserPlan === "enterprise";

  document.querySelectorAll("[data-toggle]").forEach(el => {
    el.addEventListener("click", () => {
      const id = Number(el.dataset.toggle);
      expandedGoalId = expandedGoalId === id ? null : id;
      renderGoalsList(isPremium);
    });
  });

  document.querySelectorAll("input[type=checkbox][data-goal]").forEach(box => {
    box.addEventListener("click", e => e.stopPropagation());
    box.addEventListener("change", e => {
      e.stopPropagation();
      toggleChecklistItem(Number(e.target.dataset.goal), Number(e.target.dataset.index));
    });
  });

  document.querySelectorAll("[data-remove]").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      removeGoal(Number(btn.dataset.remove));
    });
  });

  document.querySelectorAll("[data-front]").forEach(btn => {
    btn.addEventListener("click", e => { e.stopPropagation(); moveGoal(Number(btn.dataset.front), "front"); });
  });
  document.querySelectorAll("[data-forward]").forEach(btn => {
    btn.addEventListener("click", e => { e.stopPropagation(); moveGoal(Number(btn.dataset.forward), "forward"); });
  });
  document.querySelectorAll("[data-backward]").forEach(btn => {
    btn.addEventListener("click", e => { e.stopPropagation(); moveGoal(Number(btn.dataset.backward), "backward"); });
  });
  document.querySelectorAll("[data-back]").forEach(btn => {
    btn.addEventListener("click", e => { e.stopPropagation(); moveGoal(Number(btn.dataset.back), "back"); });
  });
}

async function toggleChecklistItem(goalId, index) {
  const goal = GOALS.find(g => g.id === goalId);
  if (!goal) return;

  goal.checklist[index] = !goal.checklist[index];

  const item = document.querySelector(`.checklist-item[data-goal="${goalId}"][data-index="${index}"]`);
  if (item) item.classList.toggle("done", goal.checklist[index]);

  const total = Array.isArray(goal.opportunity.requirements) ? goal.opportunity.requirements.length : 0;
  updateChecklistProgress(goalId, total);

  // El goal que cambió puede ser el #1 (el que muestra el mini
  // widget), así que lo repintamos también.
  renderTopGoalProgress();

  const { error } = await supabaseClient
    .from("Metas")
    .update({ checklist: goal.checklist })
    .eq("id", goalId);

  if (error) console.error("Error guardando el checklist:", error);
}

async function removeGoal(goalId) {
  const { error } = await supabaseClient.from("Metas").delete().eq("id", goalId);

  if (error) {
    console.error("Error quitando el goal:", error);
    return;
  }

  if (expandedGoalId === goalId) expandedGoalId = null;
  await resequenceGoals();
  await loadGoals();
}

async function resequenceGoals() {
  const { data, error } = await supabaseClient
    .from("Metas")
    .select("id, priority")
    .eq("user_id", currentUserId)
    .order("priority", { ascending: true });

  if (error || !data) return;

  for (let i = 0; i < data.length; i++) {
    if (data[i].priority !== i + 1) {
      await supabaseClient.from("Metas").update({ priority: i + 1 }).eq("id", data[i].id);
    }
  }
}

async function moveGoal(goalId, direction) {
  const isPremium = currentUserPlan === "premium" || currentUserPlan === "enterprise";
  if (!isPremium || GOALS.length <= 1) return;

  const index = GOALS.findIndex(g => g.id === goalId);
  if (index === -1) return;

  let newIndex = index;
  if (direction === "front") newIndex = 0;
  else if (direction === "forward") newIndex = Math.max(0, index - 1);
  else if (direction === "backward") newIndex = Math.min(GOALS.length - 1, index + 1);
  else if (direction === "back") newIndex = GOALS.length - 1;

  if (newIndex === index) return;

  const [moved] = GOALS.splice(index, 1);
  GOALS.splice(newIndex, 0, moved);

  // Actualizamos prioridad en memoria y persistimos
  const updates = GOALS.map((g, i) => ({ id: g.id, priority: i + 1 }));
  GOALS.forEach((g, i) => { g.priority = i + 1; });

  renderGoalsList(isPremium);
  renderTopGoalProgress();

  for (const u of updates) {
    const { error } = await supabaseClient.from("Metas").update({ priority: u.priority }).eq("id", u.id);
    if (error) console.error("Error reordenando goals:", error);
  }
}

// ------------------------------------------------------------
// Cargar el perfil del usuario logueado
// ------------------------------------------------------------
async function loadProfile() {
  const { data: userData, error: userError } = await supabaseClient.auth.getUser();

  if (userError || !userData?.user) {
    console.error("No hay usuario logueado:", userError);
    return;
  }

  currentUserId = userData.user.id;

  const { data: usuario, error } = await supabaseClient
    .from("Usuarios")
    .select("*")
    .eq("id", currentUserId)
    .maybeSingle();

  if (error) {
    console.error("Error cargando el perfil:", error);
    return;
  }

  currentUserPlan = usuario?.plan || "free";

  fillForm(usuario);
  setupLc(usuario);
  await loadGoals();
}

// ------------------------------------------------------------
// Toggle Edit / Save (perfil base)
// ------------------------------------------------------------
editToggleBtn.addEventListener("click", async () => {
  if (!isEditing) {
    setEditing(true);
    document.getElementById("fullName").focus();
    return;
  }

  if (!currentUserId) {
    setStatus("No user session found.", true);
    return;
  }

  const payload = {
    full_name: document.getElementById("fullName").value.trim(),
    age: document.getElementById("age").value ? Number(document.getElementById("age").value) : null,
    nationality: document.getElementById("nationality").value.trim(),
    gender: document.getElementById("gender").value,
    academic_level: document.getElementById("academicLevel").value,
    gpa: document.getElementById("gpa").value ? Number(document.getElementById("gpa").value) : null,
    modality: document.getElementById("modality").value,
    countries_interest: document.getElementById("countriesInterest").value.trim(),
    professional_interest: document.getElementById("professionalInterest").value.trim()
  };

  const { error } = await supabaseClient.from("Usuarios").update(payload).eq("id", currentUserId);

  if (error) {
    console.error("Error guardando el perfil:", error);
    setStatus("Could not save changes.", true);
    return;
  }

  setEditing(false);
  setStatus("Saved ✓");
});

// ------------------------------------------------------------
// Subida de la foto de perfil a Supabase Storage
// ------------------------------------------------------------
avatarInput.addEventListener("change", async () => {
  const file = avatarInput.files[0];
  if (!file || !currentUserId) return;

  avatarCamera.classList.add("uploading");

  const localPreview = URL.createObjectURL(file);
  avatarPreview.innerHTML = `<img src="${localPreview}" alt="Profile photo">`;

  const fileExt = file.name.split(".").pop();
  const filePath = `${currentUserId}/avatar.${fileExt}`;

  const { error: uploadError } = await supabaseClient
    .storage.from("avatars").upload(filePath, file, { upsert: true });

  if (uploadError) {
    console.error("Error subiendo la foto:", uploadError);
    setStatus("Could not upload photo.", true);
    avatarCamera.classList.remove("uploading");
    return;
  }

  const { data: publicUrlData } = supabaseClient.storage.from("avatars").getPublicUrl(filePath);
  const avatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

  const { error: dbError } = await supabaseClient
    .from("Usuarios").update({ avatar_url: avatarUrl }).eq("id", currentUserId);

  avatarCamera.classList.remove("uploading");

  if (dbError) {
    console.error("Error guardando la URL de la foto:", dbError);
    setStatus("Photo uploaded, but could not save link.", true);
    return;
  }

  const sidebarAvatar = document.getElementById("sidebarAvatar");
  if (sidebarAvatar) sidebarAvatar.innerHTML = `<img src="${avatarUrl}" alt="">`;

  setStatus("Photo updated ✓");
});

// ------------------------------------------------------------
// Init
// ------------------------------------------------------------
setEditing(false);
setLcEditing(false);
loadProfile();
