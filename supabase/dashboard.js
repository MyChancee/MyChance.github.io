// ============================================================
// dashboard.js
// Trae las oportunidades con match real, pinta las 3 de mayor
// match en "Recommended Opportunities", muestra el goal #1
// (mayor prioridad, tabla "Metas") en "Current Goal", el total
// de oportunidades disponibles, y los planes de suscripción.
//
// "Current Goal" ring: mientras la oportunidad tenga requirements
// listados, el % que se muestra es el progreso de la checklist
// (mismo dato que "My Goals" en profile.js — checklist[i] boolean
// paralelo a requirements[i]), no el match_percent fijo. Al llegar
// a 100% el ring cambia a dorado (--premium-gold) y el mensaje
// pasa a "Goal reached!". Si la oportunidad no tiene requirements
// cargados (nada para tildar), se muestra el match_percent como
// antes, para no dejar el ring vacío.
//
// Bilingüe: usa los helpers de language.js (localizeField,
// localizeEnum, localizeCountry, getCurrentLang, t, tf) para pintar
// todo en el idioma activo, y se vuelve a renderizar solo al recibir
// "languagechange" (disparado por applyLanguage en Ajustes).
// ============================================================

function formatIcon(format) {
  if (format === "in-person") return "👤";
  if (format === "virtual") return "💻";
  return "🔀";
}

function tagClass(category) {
  if (category === "scholarship") return "tag-scholarship";
  if (category === "exchange" || category === "competition") return "tag-academic";
  return "tag-neutral";
}

function renderLogo(item) {
  if (item.logo_url && item.logo_url.trim() !== "") {
    return `<div class="opp-logo" style="background:${item.logo_color}">
      <img src="${item.logo_url}" alt="${item.title} logo" style="width:100%;height:100%;object-fit:cover;border-radius:10px;" onerror="this.parentElement.innerHTML='${item.logo_initial}'">
    </div>`;
  }
  return `<div class="opp-logo" style="background:${item.logo_color}">${item.logo_initial}</div>`;
}

function renderCard(item, lang) {
  return `
    <article class="opp-card" data-id="${item.id}">
      <div class="opp-top">
        ${renderLogo(item)}
        <span class="match-badge">${tf("opp.matchBadge", lang, { pct: item.match_percent })}</span>
      </div>

      <h4>${localizeField(item, "title", lang)}</h4>

      <div class="opp-meta">📍 ${localizeCountry(item.country, lang)}</div>
      <div class="opp-meta">${formatIcon(item.format)} ${localizeEnum(item.format, "format", lang)}</div>

      <div class="opp-tags">
        ${(item.tags || []).slice(0, 2).map(tag => `<span class="tag ${tagClass(item.category)}">${tag}</span>`).join("")}
      </div>

      <button class="opp-arrow" data-go="${item.id}" aria-label="›">›</button>
    </article>
  `;
}

function renderRecommended(opportunities) {
  const container = document.getElementById("cardsRow");
  if (!container) return;

  const lang = getCurrentLang();
  const top3 = opportunities.slice(0, 3);

  if (top3.length === 0) {
    container.innerHTML = `<div class="no-results">${t("dash.recommended.empty", lang)}</div>`;
    return;
  }

  container.innerHTML = top3.map(item => renderCard(item, lang)).join("");

  container.querySelectorAll("[data-go]").forEach(btn => {
    btn.addEventListener("click", () => {
      window.location.href = `opportunities.html?id=${btn.dataset.go}`;
    });
  });
}

// % de la checklist completada (checklist[i] boolean, paralelo a
// requirements[i], igual que en profile.js). Devuelve null si la
// oportunidad no tiene requirements listados (nada para tildar).
function checklistProgress(checklist, totalRequirements) {
  if (!totalRequirements || totalRequirements === 0) return null;
  const done = (checklist || []).filter(Boolean).length;
  return Math.round((done / totalRequirements) * 100);
}

function renderGoal(goalOpportunity, checklist) {
  const container = document.getElementById("goalBody");
  if (!container) return;

  const lang = getCurrentLang();

  if (!goalOpportunity) {
    container.innerHTML = `
      <div class="goal-details">
        <p class="goal-name">${t("dash.goal.empty.title", lang)}</p>
        <p class="goal-sub">${t("dash.goal.empty.sub", lang)}</p>
        <a href="opportunities.html" class="btn btn-outline-sm">${t("dash.goal.explore", lang)}</a>
      </div>
    `;
    return;
  }

  const totalRequirements = Array.isArray(goalOpportunity.requirements) ? goalOpportunity.requirements.length : 0;
  const checklistFractionPct = checklistProgress(checklist, totalRequirements); // 0-100 o null

  // El número y el ring tienen que contar la misma historia: el
  // punto de partida SIEMPRE es el match original (nunca 0%,
  // aunque el usuario todavía no haya tildado nada), y cada ítem
  // tildado reparte una porción del tramo que falta hasta el 100%.
  // Ej: match 50%, checklist 0/3 → 50%. Checklist 1/3 → 50% + (1/3
  // del 50% restante) ≈ 67%. Checklist 3/3 → 100%.
  const matchPct = goalOpportunity.match_percent;
  const displayPct = checklistFractionPct !== null
    ? Math.round(matchPct + (checklistFractionPct / 100) * (100 - matchPct))
    : matchPct;
  const isComplete = checklistFractionPct !== null && checklistFractionPct >= 100;

  container.innerHTML = `
    <div class="goal-ring" style="--match: ${matchPct}; --pct: ${displayPct}">
      <span class="goal-pct ${isComplete ? "goal-pct--complete" : ""}">${displayPct}%</span>
    </div>
    <div class="goal-details">
      <p class="goal-name">${localizeField(goalOpportunity, "title", lang)}</p>
      <p class="goal-sub">${isComplete ? t("dash.goal.reached", lang) : t("dash.goal.keepGoing", lang)}</p>
      <a href="opportunities.html?id=${goalOpportunity.id}" class="btn btn-outline-sm">${t("dash.goal.viewGoal", lang)}</a>
    </div>
  `;
}

// Guardamos el último resultado para poder re-renderizar cuando
// cambia el idioma, sin tener que volver a pegarle a Supabase.
let lastOpportunities = [];
let lastGoalOpportunity = null;
let lastGoalChecklist = [];

async function loadDashboardData() {
  const { data: userData } = await supabaseClient.auth.getUser();
  const userId = userData?.user?.id || null;

  let opportunities = [];
  let topGoalOpportunityId = null;
  let topGoalChecklist = [];

  if (userId) {
    const [oppResult, goalResult] = await Promise.all([
      supabaseClient.rpc("get_matched_opportunities", { p_user_id: userId }),
      supabaseClient
        .from("Metas")
        .select("opportunity_id, checklist")
        .eq("user_id", userId)
        .order("priority", { ascending: true })
        .limit(1)
        .maybeSingle()
    ]);

    if (oppResult.error) {
      console.error("Error trayendo oportunidades con match:", oppResult.error);
    } else {
      opportunities = oppResult.data;
    }

    if (!goalResult.error && goalResult.data) {
      topGoalOpportunityId = goalResult.data.opportunity_id;
      topGoalChecklist = Array.isArray(goalResult.data.checklist) ? goalResult.data.checklist : [];
    }
  } else {
    const { data, error } = await supabaseClient.from("Oportunidades").select("*").limit(3);
    if (!error) opportunities = data;
  }

  const goalOpportunity = topGoalOpportunityId
    ? opportunities.find(o => o.id === topGoalOpportunityId) || null
    : null;

  lastOpportunities = opportunities;
  lastGoalOpportunity = goalOpportunity;
  lastGoalChecklist = topGoalChecklist;

  renderRecommended(opportunities);
  renderGoal(goalOpportunity, topGoalChecklist);
}

let lastOpportunityCount = null;
async function loadOpportunityCount() {
  const el = document.getElementById("notifyCount");
  if (!el) return;

  const { count, error } = await supabaseClient
    .from("Oportunidades")
    .select("*", { count: "exact", head: true });

  el.removeAttribute("data-i18n");

  const lang = getCurrentLang();

  if (error) {
    console.error("Error trayendo el total de oportunidades:", error);
    lastOpportunityCount = null;
    el.textContent = t("dash.notifyCount.error", lang);
    return;
  }

  lastOpportunityCount = count;
  el.textContent = tf("dash.notifyCount", lang, { count });
}

let dashboardToastTimeout = null;
function showDashboardToast(message) {
  let toastEl = document.getElementById("appToast");
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.id = "appToast";
    toastEl.className = "toast";
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(dashboardToastTimeout);
  dashboardToastTimeout = setTimeout(() => toastEl.classList.remove("show"), 3000);
}

// Rutas de los íconos de cada plan. Si tus archivos se llaman
// distinto, solo hay que actualizar estas tres líneas.
const PLAN_ICON_SRC = {
  free: { dark: "../free_icon.png", light: "../free_icon-white.png" },
  premium: { dark: "../premium_icon.png", light: "../premium_icon-white.png" },
  enterprise: { dark: "../enterprise_icon.png", light: "../enterprise_icon-white.png" }
};

// Definición de los planes en función del idioma (nombre, precio,
// features), para no tener nada hardcodeado en inglés.
function getPlanDefinitions(lang) {
  return [
    {
      id: "free",
      icon: PLAN_ICON_SRC.free,
      name: t("dash.plan.free.name", lang),
      price: "$0",
      priceNote: t("dash.plan.free.priceNote", lang),
      features: [t("dash.plan.free.f1", lang), t("dash.plan.free.f2", lang), t("dash.plan.free.f3", lang)],
      modifier: "free"
    },
    {
      id: "premium",
      icon: PLAN_ICON_SRC.premium,
      name: t("dash.plan.premium.name", lang),
      price: "$8.99",
      priceNote: t("dash.plan.premium.priceNote", lang),
      features: [
        t("dash.plan.premium.f1", lang),
        t("dash.plan.premium.f2", lang),
        t("dash.plan.premium.f3", lang),
        t("dash.plan.premium.f4", lang)
      ],
      modifier: "premium"
    },
    {
      id: "enterprise",
      icon: PLAN_ICON_SRC.enterprise,
      name: t("dash.plan.enterprise.name", lang),
      price: t("dash.plan.enterprise.price", lang),
      priceNote: t("dash.plan.enterprise.priceNote", lang),
      features: [t("dash.plan.enterprise.f1", lang), t("dash.plan.enterprise.f2", lang), t("dash.plan.enterprise.f3", lang)],
      modifier: "enterprise"
    }
  ];
}

function renderPlanCard(plan, currentPlanId, lang) {
  const isCurrent = plan.id === currentPlanId;
  const isComingSoon = plan.id === "enterprise";

  let buttonHtml;
  if (isCurrent) {
    buttonHtml = `<button class="plan-btn plan-btn--current" disabled>${t("dash.plan.current", lang)}</button>`;
  } else if (isComingSoon) {
    buttonHtml = `<button class="plan-btn plan-btn--soon" disabled>${t("dash.plan.comingSoon", lang)}</button>`;
  } else {
    buttonHtml = `<button class="plan-btn plan-btn--upgrade-${plan.modifier}" data-upgrade="${plan.id}">${t("dash.plan.upgradeBtn", lang)}</button>`;
  }

 return `
  <div class="plan-card plan-card--${plan.modifier}">
    <div class="plan-icon">
      <img src="${plan.icon.dark}" alt="" class="plan-icon-img icon-dark">
      <img src="${plan.icon.light}" alt="" class="plan-icon-img icon-light">
    </div>
    <div class="plan-body">
      <p class="plan-name">${plan.name}</p>
      <p class="plan-price">${plan.price}</p>
      <p class="plan-price-note">${plan.priceNote}</p>
      <ul class="plan-features">
        ${plan.features.map(f => `<li>${f}</li>`).join("")}
      </ul>
      ${buttonHtml}
    </div>
  </div>
`;
}

let lastCurrentPlanId = "free";
function renderPlans(currentPlanId) {
  const container = document.getElementById("plansGrid");
  if (!container) return;

  const lang = getCurrentLang();
  lastCurrentPlanId = currentPlanId;
  const definitions = getPlanDefinitions(lang);

  container.innerHTML = definitions.map(plan => renderPlanCard(plan, currentPlanId, lang)).join("");

  container.querySelectorAll("[data-upgrade]").forEach(btn => {
    btn.addEventListener("click", () => {
      const planId = btn.dataset.upgrade;
      if (planId === "premium") {
        openUpgradeModal();
      } else {
        showDashboardToast(t("dash.plan.upgradeSoon", getCurrentLang()));
      }
    });
  });
}

async function loadPlans() {
  const { data: userData } = await supabaseClient.auth.getUser();
  const userId = userData?.user?.id || null;

  let currentPlanId = "free";

  if (userId) {
    const { data, error } = await supabaseClient
      .from("Usuarios")
      .select("plan")
      .eq("id", userId)
      .maybeSingle();

    if (!error && data?.plan) currentPlanId = data.plan;
  }

  renderPlans(currentPlanId);
}

function openUpgradeModal() {
  document.getElementById("upgradeModalOverlay")?.classList.add("open");
}

function closeUpgradeModal() {
  document.getElementById("upgradeModalOverlay")?.classList.remove("open");
}

function formatCardNumberInput(e) {
  const digits = e.target.value.replace(/\D/g, "").slice(0, 16);
  e.target.value = digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiryInput(e) {
  const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
  e.target.value = digits.length >= 3 ? `${digits.slice(0, 2)} / ${digits.slice(2)}` : digits;
}

async function handleUpgradeSubmit(e) {
  e.preventDefault();

  const lang = getCurrentLang();
  const confirmBtn = document.getElementById("upgradeConfirmBtn");
  const confirmBtnDefaultText = t("upgrade.confirmBtn", lang);

  confirmBtn.disabled = true;
  confirmBtn.textContent = t("dash.plan.processing", lang);

  await new Promise(resolve => setTimeout(resolve, 1200));

  const { data: userData } = await supabaseClient.auth.getUser();
  const userId = userData?.user?.id || null;

  if (userId) {
    const { error } = await supabaseClient
      .from("Usuarios")
      .update({ plan: "premium" })
      .eq("id", userId);

    if (error) {
      console.error("Error actualizando el plan:", error);
      showDashboardToast(t("dash.plan.error", lang));
      confirmBtn.disabled = false;
      confirmBtn.textContent = confirmBtnDefaultText;
      return;
    }
  }

  closeUpgradeModal();
  document.getElementById("upgradeForm").reset();
  confirmBtn.disabled = false;
  confirmBtn.textContent = confirmBtnDefaultText;

  showDashboardToast(t("dash.plan.welcomePremium", lang));

  if (typeof loadSidebarUser === "function") loadSidebarUser();
  loadPlans();
}

function setupUpgradeModalEvents() {
  const closeBtn = document.getElementById("upgradeModalClose");
  const overlay = document.getElementById("upgradeModalOverlay");
  const form = document.getElementById("upgradeForm");
  const cardNumberInput = document.getElementById("upgradeCardNumber");
  const expiryInput = document.getElementById("upgradeExpiry");

  if (closeBtn) closeBtn.addEventListener("click", closeUpgradeModal);
  if (overlay) {
    overlay.addEventListener("click", e => {
      if (e.target.id === "upgradeModalOverlay") closeUpgradeModal();
    });
  }
  if (form) form.addEventListener("submit", handleUpgradeSubmit);
  if (cardNumberInput) cardNumberInput.addEventListener("input", formatCardNumberInput);
  if (expiryInput) expiryInput.addEventListener("input", formatExpiryInput);

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeUpgradeModal();
  });
}

// Al cambiar el idioma desde Ajustes, repintamos todo lo dinámico
// sin volver a pegarle a Supabase (usamos los datos ya cargados).
function rerenderDashboardForLanguage() {
  renderRecommended(lastOpportunities);
  renderGoal(lastGoalOpportunity, lastGoalChecklist);
  renderPlans(lastCurrentPlanId);

  const el = document.getElementById("notifyCount");
  if (el && lastOpportunityCount !== null) {
    el.textContent = tf("dash.notifyCount", getCurrentLang(), { count: lastOpportunityCount });
  }
}

window.addEventListener("languagechange", rerenderDashboardForLanguage);

loadDashboardData();
loadOpportunityCount();
loadPlans();
setupUpgradeModalEvents();
