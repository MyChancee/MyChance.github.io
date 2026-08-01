// ============================================================
// profile.js
// - Perfil base + subida de foto (con recorte, ver más abajo).
// - LC (Life Curriculum): campos extra, solo premium/enterprise.
// - My Goals: lista de oportunidades marcadas con 🎯 (tabla
//   "Metas"), ordenadas por prioridad. Free plan: máx 1 goal,
//   sin reordenar. Premium/Enterprise: varios, con botones tipo
//   Canva (traer al frente / adelante / atrás / enviar al fondo).
//   Cada goal tiene su propio checklist de requirements, que el
//   usuario tilda manualmente.
//
// MULTI-SELECT: "Countries of interest" y "Professional
// interest" pasaron de <input type="text"> a un dropdown con
// checkboxes (ver buildMultiSelect más abajo). El valor elegido
// se sigue guardando como texto separado por comas en un
// <input type="hidden">, así que countries_interest /
// professional_interest en Supabase no cambiaron de tipo ni de
// formato — el resto del código (payload de guardado, signup.js)
// no necesitó tocarse.
//
// RECORTE DE FOTO: en vez de subir el archivo tal cual se
// eligió, se abre un modal con Cropper.js donde el usuario
// puede arrastrar y hacer zoom dentro de un círculo antes de
// confirmar. Recién ahí se sube el recorte final a Supabase Storage.
//
// "VER MÁS" EN MOBILE: el form de datos personales y el del CV
// se recortan en celular (ver .collapsible en Profile.css) y un
// botón los expande. setupSeeMoreToggle() maneja el toggle; al
// entrar en modo edición se expanden solos para que el usuario
// pueda llegar a cualquier campo sin buscar el botón primero.
//
// USUARIOS DE GOOGLE (nuevo): si el usuario inició sesión con
// Google, el botón "Edit profile" ya no activa la edición inline
// de esta página — en vez de eso lo manda al formulario multi-paso
// (signup.html?mode=complete), que precarga lo que ya tenga
// guardado. Esto es porque el login con Google existe justamente
// para saltarse el formulario al entrar, así que completar el
// perfil queda como una acción opcional que el usuario elige
// cuándo hacer, no algo forzado.
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
let isGoogleUser = false; // se define en loadProfile()
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

// ------------------------------------------------------------
// "Ver más" en mobile
// ------------------------------------------------------------
function setupSeeMoreToggle(collapsibleEl, buttonEl) {
  if (!collapsibleEl || !buttonEl) return null;

  let expanded = false;

  function render() {
    const lang = typeof getCurrentLang === "function" ? getCurrentLang() : "es";
    collapsibleEl.classList.toggle("expanded", expanded);
    buttonEl.textContent = expanded
      ? (lang === "es" ? "Ver menos ▴" : "See less ▴")
      : (lang === "es" ? "Ver más ▾" : "See more ▾");
  }

  buttonEl.addEventListener("click", () => {
    expanded = !expanded;
    render();
  });

  render();

  return {
    expand() { expanded = true; render(); },
    collapse() { expanded = false; render(); }
  };
}

let profileSeeMore = null;
let lcSeeMore = null;

window.addEventListener("languagechange", () => {
  const lang = typeof getCurrentLang === "function" ? getCurrentLang() : "es";
  const profileBtn = document.getElementById("profileSeeMoreBtn");
  const lcBtn = document.getElementById("lcSeeMoreBtn");
  const profileCollapsible = document.getElementById("profileCollapsible");
  const lcCollapsible = document.getElementById("lcCollapsible");

  if (profileBtn && profileCollapsible) {
    const expanded = profileCollapsible.classList.contains("expanded");
    profileBtn.textContent = expanded
      ? (lang === "es" ? "Ver menos ▴" : "See less ▴")
      : (lang === "es" ? "Ver más ▾" : "See more ▾");
  }
  if (lcBtn && lcCollapsible) {
    const expanded = lcCollapsible.classList.contains("expanded");
    lcBtn.textContent = expanded
      ? (lang === "es" ? "Ver menos ▴" : "See less ▴")
      : (lang === "es" ? "Ver más ▾" : "See more ▾");
  }
});

// ------------------------------------------------------------
// Multi-select genérico (checkboxes en un dropdown)
// ------------------------------------------------------------
function buildMultiSelect({ triggerId, textId, panelId, hiddenInputId, options, placeholderText }) {
  const trigger = document.getElementById(triggerId);
  const text = document.getElementById(textId);
  const panel = document.getElementById(panelId);
  const hiddenInput = document.getElementById(hiddenInputId);

  let selected = new Set();

  function updateText() {
    if (selected.size === 0) {
      text.textContent = placeholderText;
      text.classList.add("multiselect-placeholder");
    } else {
      const labels = options.filter(o => selected.has(o.value)).map(o => o.label);
      text.textContent = labels.join(", ");
      text.classList.remove("multiselect-placeholder");
    }
    hiddenInput.value = Array.from(selected)
      .map(v => options.find(o => o.value === v)?.label || v)
      .join(", ");
  }

  function renderPanel() {
    panel.innerHTML = options.map(o => `
      <label class="multiselect-option">
        <input type="checkbox" value="${o.value}" ${selected.has(o.value) ? "checked" : ""}>
        <span>${o.label}</span>
      </label>
    `).join("");

    panel.querySelectorAll("input[type=checkbox]").forEach(cb => {
      cb.addEventListener("change", () => {
        if (cb.checked) selected.add(cb.value);
        else selected.delete(cb.value);
        updateText();
      });
    });
  }

  trigger.addEventListener("click", () => {
    if (trigger.disabled) return;
    panel.classList.toggle("open");
  });

  document.addEventListener("click", (e) => {
    if (!trigger.contains(e.target) && !panel.contains(e.target)) {
      panel.classList.remove("open");
    }
  });

  renderPanel();
  updateText();

  return {
    setValue(rawValue) {
      const tokens = String(rawValue || "")
        .split(",")
        .map(s => s.trim().toLowerCase())
        .filter(Boolean);

      selected = new Set(
        options
          .filter(o => tokens.includes(o.value.toLowerCase()) || tokens.includes(o.label.toLowerCase()))
          .map(o => o.value)
      );

      renderPanel();
      updateText();
    },
    setDisabled(disabled) {
      trigger.disabled = disabled;
      if (disabled) panel.classList.remove("open");
    }
  };
}

function buildCountryOptions(lang) {
  return Object.keys(COUNTRY_NAMES)
    .map(value => ({ value, label: localizeCountry(value, lang) }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

const PROFESSIONAL_INTERESTS = [
  { value: "Engineering", es: "Ingeniería", en: "Engineering" },
  { value: "Computer Science", es: "Informática", en: "Computer Science" },
  { value: "Medicine", es: "Medicina", en: "Medicine" },
  { value: "Business & Finance", es: "Negocios y Finanzas", en: "Business & Finance" },
  { value: "Law", es: "Derecho", en: "Law" },
  { value: "Arts & Design", es: "Arte y Diseño", en: "Arts & Design" },
  { value: "Architecture", es: "Arquitectura", en: "Architecture" },
  { value: "Natural Sciences", es: "Ciencias Naturales", en: "Natural Sciences" },
  { value: "Social Sciences", es: "Ciencias Sociales", en: "Social Sciences" },
  { value: "Education", es: "Educación", en: "Education" },
  { value: "Psychology", es: "Psicología", en: "Psychology" },
  { value: "Communications & Media", es: "Comunicación y Medios", en: "Communications & Media" },
  { value: "Environmental Studies", es: "Estudios Ambientales", en: "Environmental Studies" },
  { value: "Music & Performing Arts", es: "Música y Artes Escénicas", en: "Music & Performing Arts" },
  { value: "International Relations", es: "Relaciones Internacionales", en: "International Relations" },
];

function buildProfessionalInterestOptions(lang) {
  return PROFESSIONAL_INTERESTS
    .map(o => ({ value: o.value, label: lang === "es" ? o.es : o.en }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

let countriesInterestControl = null;
let professionalInterestControl = null;

function setupMultiSelects() {
  const lang = getCurrentLang();

  countriesInterestControl = buildMultiSelect({
    triggerId: "countriesInterestTrigger",
    textId: "countriesInterestText",
    panelId: "countriesInterestPanel",
    hiddenInputId: "countriesInterest",
    options: buildCountryOptions(lang),
    placeholderText: t("profile.ph.countriesInterest", lang)
  });

  professionalInterestControl = buildMultiSelect({
    triggerId: "professionalInterestTrigger",
    textId: "professionalInterestText",
    panelId: "professionalInterestPanel",
    hiddenInputId: "professionalInterest",
    options: buildProfessionalInterestOptions(lang),
    placeholderText: t("profile.ph.professionalInterest", lang)
  });
}

window.addEventListener("languagechange", () => {
  if (!countriesInterestControl || !professionalInterestControl) return;
  const countriesRaw = document.getElementById("countriesInterest").value;
  const professionalRaw = document.getElementById("professionalInterest").value;
  setupMultiSelects();
  countriesInterestControl.setValue(countriesRaw);
  professionalInterestControl.setValue(professionalRaw);
  countriesInterestControl.setDisabled(!isEditing);
  professionalInterestControl.setDisabled(!isEditing);
});

function fillForm(usuario) {
  document.getElementById("fullName").value = usuario?.full_name || "";
  document.getElementById("email").value = usuario?.email || "";
  document.getElementById("age").value = usuario?.age ?? "";
  document.getElementById("nationality").value = usuario?.nationality || "";
  setSelectValue(document.getElementById("gender"), usuario?.gender);
  setSelectValue(document.getElementById("academicLevel"), usuario?.academic_level);
  document.getElementById("gpa").value = usuario?.gpa ?? "";
  setSelectValue(document.getElementById("modality"), usuario?.modality);

  if (countriesInterestControl) countriesInterestControl.setValue(usuario?.countries_interest || "");
  if (professionalInterestControl) professionalInterestControl.setValue(usuario?.professional_interest || "");

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
  editableFields.forEach(field => { if (field) field.disabled = !editing; });
  if (countriesInterestControl) countriesInterestControl.setDisabled(!editing);
  if (professionalInterestControl) professionalInterestControl.setDisabled(!editing);
  editToggleBtn.textContent = editing ? "Save changes" : "Edit profile";
  if (editing) profileSeeMore?.expand();
}

// ------------------------------------------------------------
// LC
// ------------------------------------------------------------
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
  if (editing) lcSeeMore?.expand();
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

document.querySelectorAll(".lc-form textarea").forEach(t => {
  t.addEventListener("input", () => {
    t.style.height = "auto";
    t.style.height = t.scrollHeight + "px";
  });
});

// ------------------------------------------------------------
// My Goals
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

function checklistProgressPct(checklist, totalRequirements) {
  if (!totalRequirements || totalRequirements === 0) return null;
  const done = (checklist || []).filter(Boolean).length;
  return Math.round((done / totalRequirements) * 100);
}

function renderTopGoalProgress() {
  const container = document.getElementById("topGoalProgressCard");
  if (!container) return;

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
  isGoogleUser = userData.user.app_metadata?.provider === "google";

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
  // Usuarios de Google: siempre al formulario multi-paso,
  // nunca edición inline en esta página.
  if (isGoogleUser) {
    window.location.href = "signup.html?mode=complete";
    return;
  }

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
// Recorte de foto de perfil (con Cropper.js)
// ------------------------------------------------------------
const cropModalOverlay = document.getElementById("cropModalOverlay");
const cropImage = document.getElementById("cropImage");
const cropCancelBtn = document.getElementById("cropCancelBtn");
const cropConfirmBtn = document.getElementById("cropConfirmBtn");

let cropper = null;

function openCropModal(file) {
  const reader = new FileReader();
  reader.onload = () => {
    cropImage.src = reader.result;
    cropModalOverlay.classList.add("open");

    if (cropper) { cropper.destroy(); cropper = null; }

    cropper = new Cropper(cropImage, {
      aspectRatio: 1,
      viewMode: 1,
      dragMode: "move",
      background: false,
      guides: false,
      center: false,
      highlight: false,
      cropBoxMovable: false,
      cropBoxResizable: false,
      toggleDragModeOnDblclick: false,
      autoCropArea: 1,
      minCropBoxWidth: 200,
      minCropBoxHeight: 200,
    });
  };
  reader.readAsDataURL(file);
}

function closeCropModal() {
  cropModalOverlay.classList.remove("open");
  if (cropper) { cropper.destroy(); cropper = null; }
  avatarInput.value = "";
}

avatarInput.addEventListener("change", () => {
  const file = avatarInput.files[0];
  if (!file || !currentUserId) return;
  openCropModal(file);
});

cropCancelBtn.addEventListener("click", closeCropModal);

cropModalOverlay.addEventListener("click", (e) => {
  if (e.target === cropModalOverlay) closeCropModal();
});

cropConfirmBtn.addEventListener("click", () => {
  if (!cropper) return;

  cropper.getCroppedCanvas({
    width: 500,
    height: 500,
    imageSmoothingQuality: "high",
  }).toBlob(async (blob) => {
    if (!blob) return;
    await uploadAvatarBlob(blob);
    closeCropModal();
  }, "image/jpeg", 0.92);
});

async function uploadAvatarBlob(blob) {
  avatarCamera.classList.add("uploading");

  const localPreviewUrl = URL.createObjectURL(blob);
  avatarPreview.innerHTML = `<img src="${localPreviewUrl}" alt="Profile photo">`;

  const filePath = `${currentUserId}/avatar.jpg`;

  const { error: uploadError } = await supabaseClient
    .storage.from("avatars").upload(filePath, blob, { upsert: true, contentType: "image/jpeg" });

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
}

// ------------------------------------------------------------
// Init
// ------------------------------------------------------------
setupMultiSelects();
setEditing(false);
setLcEditing(false);
profileSeeMore = setupSeeMoreToggle(document.getElementById("profileCollapsible"), document.getElementById("profileSeeMoreBtn"));
lcSeeMore = setupSeeMoreToggle(document.getElementById("lcCollapsible"), document.getElementById("lcSeeMoreBtn"));
loadProfile();
