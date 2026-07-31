// ============================================================
// opportunities.js
// Lógica de búsqueda, filtros, modal de detalles y renderizado
// de la sección "Opportunities". Conectado a la tabla
// "Oportunidades" de Supabase. Los favoritos se guardan en la
// tabla "Favoritos" (user_id, opportunity_id) para que persistan
// entre páginas (ver favorites.html).
//
// Bilingüe: el texto fijo de la página se traduce con data-i18n
// (language.js). El contenido que viene de Supabase (title,
// description, reasons, requirements, benefits) y los strings que
// se arman acá en JS (botones, badges, mensajes) se traducen con
// los helpers de language.js: localizeField, localizeEnum,
// localizeCountry, getCurrentLang, t, tf, pluralOpportunities.
// Cuando el usuario cambia el idioma desde Ajustes, language.js
// dispara "languagechange" y volvemos a pintar todo sin recargar.
//
// EXPIRACIÓN: usa la columna "Expire_date" (date) de la tabla
// "Oportunidades".
//   - Si Expire_date ya pasó, la oportunidad se filtra de
//     ALL_DATA en init() y no se muestra en Opportunities.
//   - Si quedan entre 0 y 7 días, se muestra un banner de aviso
//     ("se retira pronto") en la tarjeta, la featured card y el
//     modal de detalles.
//
// EXPLORER MODE (nuevo): si el usuario no completó su perfil
// (mismo criterio que isProfileEmpty en Profile.js), la sección
// se comporta como un catálogo simple: se ocultan el % de match,
// el badge de progreso de checklist y el ranking "Best match" del
// selector de orden, y se muestra un banner arriba invitando a
// completar el perfil. Apenas el usuario completa sus datos y
// vuelve a esta página, todo funciona con match real como antes.
// ============================================================

// ------------------------------------------------------------
// Fuente de datos: oportunidades + match real calculado en
// Supabase (función RPC get_matched_opportunities), ya vienen
// ordenadas de mayor a menor match.
// ------------------------------------------------------------
async function getOpportunities(userId) {
  if (!userId) {
    // Sin usuario logueado, traemos las oportunidades sin match calculado
    const { data, error } = await supabaseClient.from("Oportunidades").select("*");
    if (error) {
      console.error("Error trayendo oportunidades:", error);
      return [];
    }
    return data;
  }

  const { data, error } = await supabaseClient
    .rpc("get_matched_opportunities", { p_user_id: userId });

  if (error) {
    console.error("Error trayendo oportunidades con match:", error);
    return [];
  }

  return data;
}

// ------------------------------------------------------------
// Perfil del usuario: se usa solo para decidir si activamos el
// "explorer mode" (ver isProfileEmptyOpp más abajo). Mismo
// criterio que Profile.js, para que la experiencia sea coherente
// en toda la app.
// ------------------------------------------------------------
async function getUserProfileBasics(userId) {
  if (!userId) return null;

  const { data, error } = await supabaseClient
    .from("Usuarios")
    .select("full_name, age, academic_level, gpa")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error trayendo el perfil básico del usuario:", error);
    return null;
  }

  return data;
}

function isProfileEmptyOpp(usuario) {
  return !usuario?.full_name && !usuario?.age && !usuario?.academic_level && !usuario?.gpa;
}

// ------------------------------------------------------------
// Favoritos: traer los ids que el usuario ya guardó
// ------------------------------------------------------------
async function getFavoriteIds(userId) {
  if (!userId) return new Set();

  const { data, error } = await supabaseClient
    .from("Favoritos")
    .select("opportunity_id")
    .eq("user_id", userId);

  if (error) {
    console.error("Error trayendo favoritos:", error);
    return new Set();
  }

  return new Set(data.map(row => row.opportunity_id));
}

// ------------------------------------------------------------
// Goals: traer los ids que el usuario ya marcó con 🎯 (tabla "Metas")
// ------------------------------------------------------------
async function getGoalIds(userId) {
  if (!userId) return new Set();

  const { data, error } = await supabaseClient
    .from("Metas")
    .select("opportunity_id")
    .eq("user_id", userId);

  if (error) {
    console.error("Error trayendo goals:", error);
    return new Set();
  }

  return new Set(data.map(row => row.opportunity_id));
}

// ------------------------------------------------------------
// Checklist de cada goal (tabla "Metas"): trae, por oportunidad,
// el arreglo `checklist` — es un array de booleans PARALELO al
// array `requirements` de la oportunidad (checklist[i] corresponde
// a requirements[i]), igual que en profile.js / "My Goals". El
// total de pasos sale de item.requirements.length, no del length
// de checklist (que puede venir corto/vacío si el usuario todavía
// no tildó nada).
// ------------------------------------------------------------
async function getGoalChecklists(userId) {
  if (!userId) return new Map();

  const { data, error } = await supabaseClient
    .from("Metas")
    .select("opportunity_id, checklist")
    .eq("user_id", userId);

  if (error) {
    console.error("Error trayendo checklists de goals:", error);
    return new Map();
  }

  const map = new Map();
  data.forEach(row => map.set(row.opportunity_id, Array.isArray(row.checklist) ? row.checklist : []));
  return map;
}

function checklistProgress(checklist, totalRequirements) {
  if (!totalRequirements || totalRequirements === 0) return null;
  const done = (checklist || []).filter(Boolean).length;
  return Math.round((done / totalRequirements) * 100);
}

async function getUserPlan(userId) {
  if (!userId) return "free";

  const { data, error } = await supabaseClient
    .from("Usuarios")
    .select("plan")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return "free";
  return data.plan || "free";
}

// ------------------------------------------------------------
// Notificaciones: organizaciones que el usuario ya sigue (🔔)
// ------------------------------------------------------------
async function getFollowedOrgs(userId) {
  if (!userId) return new Set();

  const { data, error } = await supabaseClient
    .from("Suscripciones")
    .select("organization")
    .eq("user_id", userId);

  if (error) {
    console.error("Error trayendo organizaciones seguidas:", error);
    return new Set();
  }

  return new Set(data.map(row => row.organization));
}

// ------------------------------------------------------------
// Expiración: usa la columna "Expire_date" (date) de la tabla
// "Oportunidades". Una oportunidad se considera:
//  - expirada: Expire_date < hoy -> se filtra y NO se muestra
//  - "expiring soon": quedan entre 0 y 7 días -> banner de aviso
// ------------------------------------------------------------
function daysUntilExpiry(item) {
  if (!item || !item.Expire_date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(item.Expire_date + "T00:00:00");
  if (isNaN(expiry.getTime())) return null;
  const diffMs = expiry - today;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function isExpired(item) {
  const days = daysUntilExpiry(item);
  return days !== null && days < 0;
}

function isExpiringSoon(item) {
  const days = daysUntilExpiry(item);
  return days !== null && days >= 0 && days <= 7;
}

function formatExpiryDate(item, lang) {
  if (!item || !item.Expire_date) return "";
  const expiry = new Date(item.Expire_date + "T00:00:00");
  if (isNaN(expiry.getTime())) return "";
  return expiry.toLocaleDateString(lang === "es" ? "es-ES" : "en-US", {
    month: "numeric", day: "numeric", year: "numeric"
  });
}

// HTML del banner "se retira pronto" (tarjeta / featured / modal).
// Usa t()/tf() de language.js si existen; si no encontrás la key
// "opp.expiry.soon" todavía, cae en un texto por default en inglés.
function renderExpiryBanner(item, lang, extraClass = "") {
  if (!isExpiringSoon(item)) return "";
  const dateStr = formatExpiryDate(item, lang);
  const label = (typeof tf === "function")
    ? tf("opp.expiry.soon", lang, { date: dateStr })
    : `Expire Date: ${dateStr}`;
  return `<div class="expiry-banner ${extraClass}">${label}</div>`;
}

// ------------------------------------------------------------
// Estado de filtros
// NOTA: countries, programTypes (categorías), formats y
// difficulties se guardan con el VALOR CRUDO de la base de datos
// (ej. "United States", "scholarship", "virtual", "advanced"), no
// con la etiqueta traducida. Así el filtro sigue funcionando igual
// sin importar el idioma activo; solo lo que se MUESTRA en pantalla
// se traduce con localizeCountry/localizeEnum.
// ------------------------------------------------------------
const state = {
  search: "",
  category: "all",
  countries: new Set(),
  programTypes: new Set(),
  formats: new Set(),
  difficulties: new Set(),
  sort: "match",
  savedIds: new Set(),
  goalIds: new Set(),
  followedOrgs: new Set(),
  goalChecklists: new Map(),
  hasProfile: true // ver applyExplorerMode() en init()
};

let ALL_DATA = [];
let currentUserId = null;
let currentUserPlan = "free";
let currentModalOpportunityId = null;
let justToggledFavId = null; // id del último favorito togglado, para animar solo ese corazón

// ------------------------------------------------------------
// EXPLORER MODE (nuevo)
// Decide y aplica el modo de la página según si el usuario tiene
// un perfil completo o no. Se llama una vez en init(), antes de
// pintar cualquier cosa, para que todo el resto del renderizado
// (grilla, featured, modal) ya sepa si tiene que mostrar match o no.
// ------------------------------------------------------------
function applyExplorerMode() {
  const banner = document.getElementById("explorerBanner");
  const sortMatchOption = document.getElementById("sortMatchOption");

  if (banner) banner.style.display = state.hasProfile ? "none" : "flex";

  if (sortMatchOption) {
    sortMatchOption.disabled = !state.hasProfile;
    sortMatchOption.style.display = state.hasProfile ? "" : "none";
  }

  // Si no hay perfil y el orden actual era "match" (default), lo
  // pasamos a "newest" para no ordenar por un número que ni
  // siquiera se está mostrando.
  if (!state.hasProfile && state.sort === "match") {
    state.sort = "newest";
    const sortSelect = document.getElementById("sortSelect");
    if (sortSelect) sortSelect.value = "newest";
  }
}

// ------------------------------------------------------------
// Skeleton loaders: se muestran ANTES de que llegue la data de
// Supabase (getOpportunities/getFavoriteIds/etc en init()), en
// vez de dejar la grilla y la featured card en blanco.
// ------------------------------------------------------------
function renderSkeletonGrid(count = 8) {
  const grid = document.getElementById("oppGrid");
  const resultsCount = document.getElementById("resultsCount");
  if (resultsCount) resultsCount.textContent = "";

  grid.innerHTML = Array.from({ length: count }).map(() => `
    <article class="skeleton-card">
      <div class="skeleton-top">
        <div class="skeleton-circle"></div>
        <div class="skeleton-badge"></div>
      </div>
      <div class="skeleton-line title"></div>
      <div class="skeleton-line meta"></div>
      <div class="skeleton-line desc"></div>
      <div class="skeleton-line desc short"></div>
      <div>
        <span class="skeleton-line tag"></span>
        <span class="skeleton-line tag"></span>
      </div>
      <div class="skeleton-block btn"></div>
    </article>
  `).join("");
}

function renderSkeletonFeatured() {
  const container = document.getElementById("featuredCard");
  if (!container) return;

  container.innerHTML = `
    <div class="skeleton-featured">
      <div class="skeleton-circle logo"></div>
      <div style="display:flex; flex-direction:column; gap:10px;">
        <div class="skeleton-line title"></div>
        <div class="skeleton-line meta"></div>
        <div class="skeleton-line desc"></div>
      </div>
      <div class="skeleton-circle skeleton-ring"></div>
    </div>
  `;
}

// ------------------------------------------------------------
// Helpers para armar los checkboxes de filtros con conteo.
// `options` sigue siendo [valorCrudo, cantidad], y `labelFn`
// decide qué texto mostrarle al usuario para ese valor crudo.
// ------------------------------------------------------------
function buildOptionCounts(data, key) {
  const counts = {};
  data.forEach(item => {
    const value = item[key];
    counts[value] = (counts[value] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

function renderFilterGroup(containerId, options, selectedSet, onChange, labelFn) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  options.forEach(([value, count]) => {
    const row = document.createElement("div");
    row.className = "filter-option";

    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = selectedSet.has(value);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) selectedSet.add(value);
      else selectedSet.delete(value);
      onChange();
    });

    const text = document.createElement("span");
    text.textContent = labelFn ? labelFn(value) : value;

    label.appendChild(checkbox);
    label.appendChild(text);

    const countEl = document.createElement("span");
    countEl.className = "filter-count";
    countEl.textContent = `(${count})`;

    row.appendChild(label);
    row.appendChild(countEl);
    container.appendChild(row);
  });
}

function initFilters(data) {
  // Por default arrancan todos los valores seleccionados (sin filtrar nada)
  state.countries = new Set(data.map(i => i.country));
  state.programTypes = new Set(data.map(i => i.category));
  state.formats = new Set(data.map(i => i.format));
  state.difficulties = new Set(data.map(i => i.difficulty_level));

  renderAllFilterGroups(data);
}

function renderAllFilterGroups(data) {
  const lang = getCurrentLang();

  renderFilterGroup(
    "countryFilters",
    buildOptionCounts(data, "country"),
    state.countries,
    applyAndRender,
    (value) => localizeCountry(value, lang)
  );

  renderFilterGroup(
    "programTypeFilters",
    buildOptionCounts(data, "category"),
    state.programTypes,
    applyAndRender,
    (value) => localizeEnum(value, "category", lang)
  );

  renderFilterGroup(
    "formatFilters",
    buildOptionCounts(data, "format"),
    state.formats,
    applyAndRender,
    (value) => localizeEnum(value, "format", lang)
  );

  renderFilterGroup(
    "difficultyFilters",
    buildOptionCounts(data, "difficulty_level"),
    state.difficulties,
    applyAndRender,
    (value) => localizeEnum(value, "difficulty_level", lang)
  );
}

// ------------------------------------------------------------
// Filtrado + búsqueda + orden
// ------------------------------------------------------------
function filterData() {
  const term = state.search.trim().toLowerCase();
  const lang = getCurrentLang();

  return ALL_DATA.filter(item => {
    if (state.category !== "all" && item.category !== state.category) return false;
    if (!state.countries.has(item.country)) return false;
    if (!state.programTypes.has(item.category)) return false;
    if (!state.formats.has(item.format)) return false;
    if (!state.difficulties.has(item.difficulty_level)) return false;

    if (term) {
      // Buscamos en ambos idiomas (título/descripción EN + ES) para
      // que la búsqueda funcione sin importar en qué idioma escriba
      // el usuario o esté mostrando la app en ese momento.
      const haystack = [
        item.title,
        item.title_es,
        item.description,
        item.description_es,
        item.organization,
        localizeCountry(item.country, lang),
        item.country,
        ...(item.tags || [])
      ].filter(Boolean).join(" ").toLowerCase();

      if (!haystack.includes(term)) return false;
    }

    return true;
  });
}

function sortData(data) {
  const lang = getCurrentLang();
  const sorted = [...data];
  if (state.sort === "match" && state.hasProfile) {
    sorted.sort((a, b) => b.match_percent - a.match_percent);
  } else if (state.sort === "az") {
    sorted.sort((a, b) => localizeField(a, "title", lang).localeCompare(localizeField(b, "title", lang)));
  } else if (state.sort === "newest" || (state.sort === "match" && !state.hasProfile)) {
    sorted.sort((a, b) => b.id - a.id);
  }
  return sorted;
}

// ------------------------------------------------------------
// Render de tarjetas
// ------------------------------------------------------------
function renderGrid(data) {
  const grid = document.getElementById("oppGrid");
  const resultsCount = document.getElementById("resultsCount");
  const lang = getCurrentLang();

  resultsCount.textContent = pluralOpportunities(data.length, lang);

  if (data.length === 0) {
    grid.innerHTML = `<div class="no-results">${t("opp.noResults", lang)}</div>`;
    return;
  }

  grid.innerHTML = data.map((item, index) => `
    <article class="opp-card" data-id="${item.id}" style="animation-delay: ${Math.min(index * 40, 300)}ms">
      <div class="opp-top">
        ${renderLogo(item, "opp-logo")}
        <button class="fav-btn ${state.savedIds.has(item.id) ? "active" : ""} ${item.id === justToggledFavId ? "animate" : ""}" data-fav="${item.id}" aria-label="${t("opp.fav.save", lang)}">
          <img src="../guardados_fav.png" alt="" class="fav-icon icon-light">
          <img src="../guardados_fav-white.png" alt="" class="fav-icon icon-dark">
        </button>
      </div>

      ${state.hasProfile ? `<span class="match-badge">${tf("opp.matchBadge", lang, { pct: item.match_percent })}</span>` : ""}

      <h4>${localizeField(item, "title", lang)}</h4>
      <div class="opp-meta">
        <span>📍 ${localizeCountry(item.country, lang)}</span>
        <span>${formatIcon(item.format)} ${localizeEnum(item.format, "format", lang)}</span>
      </div>

      <p class="opp-desc">${localizeField(item, "description", lang)}</p>

      ${state.hasProfile ? `
      <ul class="opp-reasons">
        ${(localizeField(item, "reasons", lang) || []).slice(0, 2).map(r => `<li>${r}</li>`).join("")}
      </ul>
      ` : ""}

      <div class="opp-tags">
        ${(item.tags || []).map(tag => `<span class="tag tag-cat">${tag}</span>`).join("")}
      </div>

      ${renderExpiryBanner(item, lang)}
      <button class="btn-details" data-view-details="${item.id}">${t("opp.viewDetails", lang)}</button>
    </article>
  `).join("");

  grid.querySelectorAll("[data-fav]").forEach(btn => {
    btn.addEventListener("click", () => toggleFavorite(Number(btn.dataset.fav)));
  });

  grid.querySelectorAll("[data-view-details]").forEach(btn => {
    btn.addEventListener("click", () => openModal(Number(btn.dataset.viewDetails)));
  });
}

function formatIcon(format) {
  if (format === "in-person") return "👤";
  if (format === "virtual") return "💻";
  return "🔀";
}

// Devuelve el HTML del logo: imagen real si logo_url existe,
// si no, un círculo de color con la inicial (fallback).
function renderLogo(item, className) {
  if (item.logo_url && item.logo_url.trim() !== "") {
    return `<div class="${className}" style="background:${item.logo_color}">
      <img src="${item.logo_url}" alt="${item.title} logo" onerror="this.parentElement.innerHTML='${item.logo_initial}'">
    </div>`;
  }
  return `<div class="${className}" style="background:${item.logo_color}">${item.logo_initial}</div>`;
}

// Badge dorado junto al de match, mostrando cuánto avanzó el
// usuario en la checklist de "My Goals" para esta oportunidad.
// Solo aparece si la oportunidad está marcada como goal (🎯),
// tiene al menos un requirement (algo que tildar), y el usuario
// tiene perfil completo (explorer mode nunca muestra checklist).
function renderChecklistBadge(item, lang) {
  if (!state.hasProfile) return "";
  const checklist = state.goalChecklists.get(item.id);
  if (checklist === undefined) return ""; // no es un goal actual
  const total = Array.isArray(item.requirements) ? item.requirements.length : 0;
  const pct = checklistProgress(checklist, total);
  if (pct === null) return "";

  const complete = pct >= 100;
  return `<span class="checklist-badge ${complete ? "complete" : ""}">
    ${complete ? t("opp.checklist.complete", lang) : tf("opp.checklist.progress", lang, { pct })}
  </span>`;
}

// ------------------------------------------------------------
// Featured card (arriba de la grilla)
// ------------------------------------------------------------
function renderFeatured(data) {
  const featured = data.find(i => i.featured) || data[0];
  const container = document.getElementById("featuredCard");
  const lang = getCurrentLang();

  if (!featured) {
    container.innerHTML = "";
    return;
  }

  const isSaved = state.savedIds.has(featured.id);

  const matchBlockHtml = state.hasProfile
    ? `
      <div class="featured-ring" style="--pct:${featured.match_percent}"><span>${featured.match_percent}%</span></div>
      <span class="featured-match-label">${t("opp.matchLabel", lang)}</span>
    `
    : `
      <span class="featured-explorer-icon">🧭</span>
      <span class="featured-match-label">${t("opp.explorer.featuredLabel", lang)}</span>
    `;

  container.innerHTML = `
    <span class="featured-badge">${t("opp.featuredBadge", lang)}</span>
    <button class="fav-btn featured-fav-btn ${isSaved ? "active" : ""} ${featured.id === justToggledFavId ? "animate" : ""}" data-fav="${featured.id}" aria-label="${t("opp.fav.save", lang)}">
      <img src="../guardados_fav.png" alt="" class="fav-icon icon-light">
      <img src="../guardados_fav-white.png" alt="" class="fav-icon icon-dark">
    </button>
    ${renderLogo(featured, "featured-logo")}
    <div class="featured-body">
      <h2>${localizeField(featured, "title", lang)}</h2>
      <div class="featured-meta">
        <span>📍 ${localizeCountry(featured.country, lang)}</span>
        <span>${formatIcon(featured.format)} ${localizeEnum(featured.format, "format", lang)}</span>
      </div>
      <p class="featured-desc">${localizeField(featured, "description", lang)}</p>
      <div class="featured-tags">
        ${(featured.tags || []).map(tag => `<span class="tag tag-cat">${tag}</span>`).join("")}
      </div>
    </div>
    <div class="featured-match">
      ${matchBlockHtml}
      ${renderExpiryBanner(featured, lang)}
      <button class="btn-learn" data-view-details="${featured.id}">${t("opp.learnMore", lang)}</button>
    </div>
  `;

  container.querySelectorAll("[data-view-details]").forEach(btn => {
    btn.addEventListener("click", () => openModal(Number(btn.dataset.viewDetails)));
  });

  container.querySelectorAll("[data-fav]").forEach(btn => {
    btn.addEventListener("click", () => toggleFavorite(Number(btn.dataset.fav)));
  });
}

// ------------------------------------------------------------
// Modal de detalles
// ------------------------------------------------------------
function openModal(id, options = {}) {
  const item = ALL_DATA.find(i => i.id === id);
  if (!item) return;

  currentModalOpportunityId = id;
  const lang = getCurrentLang();

  const modalContent = document.getElementById("modalContent");
  const isSaved = state.savedIds.has(item.id);
  const isGoal = state.goalIds.has(item.id);
  const isFollowing = state.followedOrgs.has(item.organization);
  const isPremium = currentUserPlan === "premium" || currentUserPlan === "enterprise";

  const localizedRequirements = localizeField(item, "requirements", lang);
  const localizedBenefits = localizeField(item, "benefits", lang);

  const requirements = Array.isArray(localizedRequirements) && localizedRequirements.length
    ? `<ul class="modal-list requirements">${localizedRequirements.map(r => `<li>${r}</li>`).join("")}</ul>`
    : `<p class="modal-empty">${t("opp.modal.noRequirements", lang)}</p>`;

  const benefits = Array.isArray(localizedBenefits) && localizedBenefits.length
    ? `<ul class="modal-list benefits">${localizedBenefits.map(b => `<li>${b}</li>`).join("")}</ul>`
    : `<p class="modal-empty">${t("opp.modal.noBenefits", lang)}</p>`;

  const hasLink = item.link_url && item.link_url.trim() !== "" && item.link_url.trim() !== "#";

  const goalTitle = isGoal ? t("opp.goal.remove", lang) : t("opp.goal.set", lang);
  const bellTitle = !isPremium
    ? t("opp.bell.locked", lang)
    : (isFollowing ? tf("opp.bell.stop", lang, { org: item.organization }) : tf("opp.bell.start", lang, { org: item.organization }));

  modalContent.innerHTML = `
    <div class="modal-icon-row">
      <button class="goal-btn bell-btn modal-bell-btn ${isFollowing ? "active" : ""} ${!isPremium ? "locked" : ""} ${options.animateBell ? "animate" : ""}" data-bell="${item.organization}" aria-label="${t("opp.bell.locked", lang)}" title="${bellTitle}">
        <img src="../campana_icon.png" alt="" class="bell-icon icon-light">
        <img src="../campana_icon-white.png" alt="" class="bell-icon icon-dark">
      </button>
      <button class="goal-btn modal-goal-btn ${isGoal ? "active" : ""} ${options.animateGoal ? "animate" : ""}" data-goal="${item.id}" aria-label="${t("opp.goal.set", lang)}" title="${goalTitle}">
        <img src="../goal_icon.png" alt="" class="goal-icon icon-light">
        <img src="../goal_icon-white.png" alt="" class="goal-icon icon-dark">
      </button>
      <button class="fav-btn modal-fav-btn ${isSaved ? "active" : ""} ${item.id === justToggledFavId ? "animate" : ""}" data-fav="${item.id}" aria-label="${t("opp.fav.save", lang)}">
        <img src="../guardados_fav.png" alt="" class="fav-icon icon-light">
        <img src="../guardados_fav-white.png" alt="" class="fav-icon icon-dark">
      </button>
    </div>

    <div class="modal-header">
      ${renderLogo(item, "modal-logo")}
      <div>
        <h2>${localizeField(item, "title", lang)}</h2>
        <p class="modal-org">${item.organization || ""}</p>
      </div>
    </div>

    <div class="modal-meta">
      <span>📍 ${localizeCountry(item.country, lang)}</span>
      <span>${formatIcon(item.format)} ${localizeEnum(item.format, "format", lang)}</span>
    </div>

    ${state.hasProfile ? `<span class="modal-match">${tf("opp.matchBadge", lang, { pct: item.match_percent })}</span>` : ""}
    ${renderChecklistBadge(item, lang)}

    <div class="modal-tags">
      ${(item.tags || []).map(tag => `<span class="tag tag-cat">${tag}</span>`).join("")}
    </div>

    <p class="modal-desc">${localizeField(item, "description", lang)}</p>

    <div class="modal-section">
      <h4>${t("opp.modal.requirements", lang)}</h4>
      ${requirements}
    </div>

    <div class="modal-section">
      <h4>${t("opp.modal.benefits", lang)}</h4>
      ${benefits}
    </div>

    ${renderExpiryBanner(item, lang, "expiry-banner-modal")}

    <div class="modal-actions">
      ${hasLink
        ? `<a class="btn-official" href="${item.link_url}" target="_blank" rel="noopener noreferrer">${t("opp.modal.officialSite", lang)}</a>`
        : `<span class="btn-official disabled">${t("opp.modal.noLink", lang)}</span>`
      }
    </div>
  `;

  modalContent.querySelectorAll("[data-fav]").forEach(btn => {
    btn.addEventListener("click", () => toggleFavorite(Number(btn.dataset.fav)));
  });

  modalContent.querySelectorAll("[data-goal]").forEach(btn => {
    btn.addEventListener("click", () => toggleGoal(Number(btn.dataset.goal), btn));
  });

  modalContent.querySelectorAll("[data-bell]").forEach(btn => {
    btn.addEventListener("click", () => toggleFollow(btn.dataset.bell, item.id));
  });

  document.getElementById("modalOverlay").classList.add("open");
}

function closeModal() {
  document.getElementById("modalOverlay").classList.remove("open");
  currentModalOpportunityId = null;
}

// ------------------------------------------------------------
// Favoritos: guardados en la tabla "Favoritos" de Supabase
// para que persistan entre páginas (ver favorites.html).
// ------------------------------------------------------------
async function toggleFavorite(id) {
  if (!currentUserId) {
    console.error("No hay usuario logueado, no se puede guardar el favorito.");
    return;
  }

  const wasSaved = state.savedIds.has(id);

  // Actualización optimista en la UI
  if (wasSaved) state.savedIds.delete(id);
  else state.savedIds.add(id);

  document.getElementById("savedCount").textContent = state.savedIds.size;

  if (!wasSaved) {
    showOppToast(t("opp.toast.favAdded", getCurrentLang()), "success");
  }

  // Marca este id para que el corazón haga el pulso al repintar,
  // y lo limpia enseguida para que no vuelva a animar en el
  // próximo render (ej: al cambiar de filtro o de idioma).
  justToggledFavId = id;
  applyAndRender();
  renderFeatured(sortData(filterData()));
  if (document.getElementById("modalOverlay").classList.contains("open")) {
    openModal(id);
  }
  justToggledFavId = null;

  if (wasSaved) {
    const { error } = await supabaseClient
      .from("Favoritos")
      .delete()
      .eq("user_id", currentUserId)
      .eq("opportunity_id", id);

    if (error) console.error("Error quitando favorito:", error);
  } else {
    const { error } = await supabaseClient
      .from("Favoritos")
      .insert([{ user_id: currentUserId, opportunity_id: id }]);

    if (error) console.error("Error guardando favorito:", error);
  }
}

// ------------------------------------------------------------
// Toast pequeño para avisos (ej: límite del plan free) y
// confirmaciones positivas (ej: agregado a favoritos).
// type: "default" (maroon) o "success" (verde).
// ------------------------------------------------------------
let oppToastTimeout = null;
function showOppToast(message, type = "default") {
  let toastEl = document.getElementById("appToast");
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.id = "appToast";
    toastEl.className = "toast";
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = message;
  toastEl.classList.remove("toast--success");
  if (type === "success") toastEl.classList.add("toast--success");
  toastEl.classList.add("show");
  clearTimeout(oppToastTimeout);
  oppToastTimeout = setTimeout(() => toastEl.classList.remove("show"), 3000);
}

// ------------------------------------------------------------
// Current Goal: marca/desmarca una oportunidad con 🎯 (tabla "Metas").
// Free plan: máximo 1 goal a la vez. Premium/Enterprise: sin límite
// (el orden/prioridad se maneja en Profile > My Goals).
// ------------------------------------------------------------
async function toggleGoal(id, btnEl) {
  if (!currentUserId) return;

  const lang = getCurrentLang();
  const isGoal = state.goalIds.has(id);
  const isPremium = currentUserPlan === "premium" || currentUserPlan === "enterprise";

  if (!isGoal && !isPremium && state.goalIds.size >= 1) {
    showOppToast(t("opp.toast.goalLimit", lang));
    return;
  }

  if (isGoal) {
    state.goalIds.delete(id);
    state.goalChecklists.delete(id);

    const { error } = await supabaseClient
      .from("Metas")
      .delete()
      .eq("user_id", currentUserId)
      .eq("opportunity_id", id);

    if (error) console.error("Error quitando el goal:", error);
  } else {
    state.goalIds.add(id);
    state.goalChecklists.set(id, []);

    const { error } = await supabaseClient
      .from("Metas")
      .insert([{ user_id: currentUserId, opportunity_id: id, priority: state.goalIds.size, checklist: [] }]);

    if (error) console.error("Error guardando el goal:", error);
  }

  if (document.getElementById("modalOverlay").classList.contains("open")) {
    openModal(id, { animateGoal: true });
  }
}

// ------------------------------------------------------------
// Notificaciones (Premium): seguir/dejar de seguir a la
// organización de esta oportunidad para recibir avisos cuando
// publique algo nuevo (sin importar el % de match). Gracias al
// UNIQUE(user_id, organization) en "Suscripciones", nunca se
// duplica aunque el usuario siga varias oportunidades de la
// misma organización.
// ------------------------------------------------------------
async function toggleFollow(organization, opportunityId) {
  if (!currentUserId) return;

  const lang = getCurrentLang();
  const isPremium = currentUserPlan === "premium" || currentUserPlan === "enterprise";
  if (!isPremium) {
    showOppToast(t("opp.toast.notifPremium", lang));
    return;
  }

  const isFollowing = state.followedOrgs.has(organization);

  if (isFollowing) {
    state.followedOrgs.delete(organization);

    const { error } = await supabaseClient
      .from("Suscripciones")
      .delete()
      .eq("user_id", currentUserId)
      .eq("organization", organization);

    if (error) {
      console.error("Error quitando la suscripción:", error);
      state.followedOrgs.add(organization);
      return;
    }
  } else {
    state.followedOrgs.add(organization);

    const { error } = await supabaseClient
      .from("Suscripciones")
      .insert([{ user_id: currentUserId, organization }]);

    if (error) {
      console.error("Error guardando la suscripción:", error);
      state.followedOrgs.delete(organization);
      return;
    }
  }

  document.dispatchEvent(new CustomEvent("mychance:follow-changed", {
    detail: { organization, following: !isFollowing }
  }));

  if (document.getElementById("modalOverlay").classList.contains("open")) {
    openModal(opportunityId, { animateBell: true });
  }
}

document.addEventListener("mychance:follow-changed", (e) => {
  const { organization, following } = e.detail || {};
  if (!organization) return;

  if (following) state.followedOrgs.add(organization);
  else state.followedOrgs.delete(organization);

  if (currentModalOpportunityId !== null &&
      document.getElementById("modalOverlay")?.classList.contains("open")) {
    const item = ALL_DATA.find(i => i.id === currentModalOpportunityId);
    if (item && item.organization === organization) {
      openModal(currentModalOpportunityId);
    }
  }
});

// ------------------------------------------------------------
// Aplicar filtros + volver a pintar
// ------------------------------------------------------------
function applyAndRender() {
  const filtered = sortData(filterData());
  renderGrid(filtered);
}

// Repinta todo (tarjetas, featured, filtros y modal si está abierto)
// en el idioma actual. Se llama al arrancar y cada vez que cambia
// el idioma desde Ajustes.
function rerenderAllForLanguage() {
  renderAllFilterGroups(ALL_DATA);
  renderFeatured(sortData(filterData()));
  applyAndRender();

  if (currentModalOpportunityId !== null &&
      document.getElementById("modalOverlay")?.classList.contains("open")) {
    openModal(currentModalOpportunityId);
  }
}

window.addEventListener("languagechange", rerenderAllForLanguage);

// ------------------------------------------------------------
// Eventos de UI (search, pills, sort, reset)
// ------------------------------------------------------------
function setupEvents() {
  document.getElementById("searchInput").addEventListener("input", e => {
    state.search = e.target.value;
    applyAndRender();
  });

  document.getElementById("sortSelect").addEventListener("change", e => {
    state.sort = e.target.value;
    applyAndRender();
  });

  document.querySelectorAll(".pill").forEach(pill => {
    pill.addEventListener("click", () => {
      document.querySelectorAll(".pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      state.category = pill.dataset.category;
      applyAndRender();
    });
  });

  document.getElementById("resetFilters").addEventListener("click", () => {
    initFilters(ALL_DATA);
    state.search = "";
    state.category = "all";
    document.getElementById("searchInput").value = "";
    document.querySelectorAll(".pill").forEach(p => p.classList.remove("active"));
    document.querySelector('.pill[data-category="all"]').classList.add("active");
    applyAndRender();
  });

  const savedBtn = document.querySelector(".saved-btn");
  if (savedBtn) {
    savedBtn.addEventListener("click", () => {
      window.location.href = "Favorites.html";
    });
  }

  document.getElementById("modalClose").addEventListener("click", closeModal);

  document.getElementById("modalOverlay").addEventListener("click", e => {
    if (e.target.id === "modalOverlay") closeModal();
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeModal();
  });

  // ------------------------------------------------------------
  // Drawer de filtros específicos en mobile (Country, Program
  // Type, Format, Difficulty). En desktop estos botones no se
  // muestran (ver opportunities-mobile.css), así que este código
  // no afecta nada ahí.
  // ------------------------------------------------------------
  const mobileFiltersBtn = document.getElementById("mobileFiltersBtn");
  const filtersPanelEl = document.querySelector(".filters-panel");
  const filtersBackdrop = document.getElementById("filtersBackdrop");
  const filtersCloseBtn = document.getElementById("filtersCloseBtn");

  function openFiltersDrawer() {
    filtersPanelEl?.classList.add("mobile-open");
    filtersBackdrop?.classList.add("show");
  }
  function closeFiltersDrawer() {
    filtersPanelEl?.classList.remove("mobile-open");
    filtersBackdrop?.classList.remove("show");
  }

  mobileFiltersBtn?.addEventListener("click", openFiltersDrawer);
  filtersBackdrop?.addEventListener("click", closeFiltersDrawer);
  filtersCloseBtn?.addEventListener("click", closeFiltersDrawer);
}

// ------------------------------------------------------------
// Init
// ------------------------------------------------------------
async function init() {
  // Skeleton loaders primero: evita la pantalla en blanco mientras
  // esperamos las respuestas de Supabase de abajo.
  renderSkeletonFeatured();
  renderSkeletonGrid();

  const { data: userData } = await supabaseClient.auth.getUser();
  currentUserId = userData?.user?.id || null;

  // EXPLORER MODE: decide si el usuario ve match/checklist o el
  // catálogo simple, antes de pintar cualquier tarjeta.
  const usuarioBasics = await getUserProfileBasics(currentUserId);
  state.hasProfile = currentUserId ? !isProfileEmptyOpp(usuarioBasics) : false;
  applyExplorerMode();

  // Filtramos las oportunidades ya expiradas (Expire_date < hoy):
  // no deben aparecer en Opportunities. Si esa oportunidad sigue
  // guardada en Favoritos, se sigue mostrando ahí (con su propio
  // aviso), pero acá no.
  ALL_DATA = (await getOpportunities(currentUserId)).filter(item => !isExpired(item));

  state.savedIds = await getFavoriteIds(currentUserId);
  state.goalIds = await getGoalIds(currentUserId);
  state.goalChecklists = await getGoalChecklists(currentUserId);
  currentUserPlan = await getUserPlan(currentUserId);
  state.followedOrgs = await getFollowedOrgs(currentUserId);

  initFilters(ALL_DATA);
  setupEvents();
  renderFeatured(sortData(filterData()));
  applyAndRender();

  const savedCountEl = document.getElementById("savedCount");
  if (savedCountEl) savedCountEl.textContent = state.savedIds.size;

  // Si llegamos con ?id=123 en la URL (por ejemplo desde "View goal"
  // en el dashboard, o desde una tarjeta de "Recommended"), abrimos
  // directo el modal de esa oportunidad.
  const params = new URLSearchParams(window.location.search);
  const idParam = params.get("id");
  if (idParam) {
    const id = Number(idParam);
    if (!Number.isNaN(id)) {
      if (ALL_DATA.some(item => item.id === id)) {
        openModal(id);
      } else {
        showOppToast(t("opp.toast.expired", getCurrentLang()) || "This opportunity is no longer available.");
      }
    }
  }
}

init();
