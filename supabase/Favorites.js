// ============================================================
// favorites.js
// Muestra las oportunidades que el usuario guardó (tabla
// "Favoritos") y permite quitarlas desde el corazón, tanto en
// la tarjeta como en el panel de detalles.
//
// Bilingüe: usa los helpers de language.js (localizeField,
// localizeEnum, localizeCountry, getCurrentLang, t, tf,
// pluralOpportunities) para pintar todo en el idioma activo, y se
// vuelve a renderizar solo al recibir "languagechange".
// ============================================================

let ALL_DATA = [];
let currentUserId = null;

// ------------------------------------------------------------
// Traer las oportunidades favoritas del usuario logueado, con
// el % de match calculado para ESE usuario (mismo RPC que usa
// opportunities.js), no el valor fijo de la tabla "Oportunidades".
// Así el % que se ve en Favorites siempre coincide con el que se
// ve en Opportunities para la misma beca.
// ------------------------------------------------------------
async function getFavoriteOpportunities(userId) {
  if (!userId) return [];

  const { data: favRows, error: favError } = await supabaseClient
    .from("Favoritos")
    .select("opportunity_id")
    .eq("user_id", userId);

  if (favError) {
    console.error("Error trayendo favoritos:", favError);
    return [];
  }

  const ids = new Set(favRows.map(row => row.opportunity_id));
  if (ids.size === 0) return [];

  const { data, error } = await supabaseClient
    .rpc("get_matched_opportunities", { p_user_id: userId });

  if (error) {
    console.error("Error trayendo oportunidades con match:", error);
    return [];
  }

  return (data || []).filter(item => ids.has(item.id));
}

// ------------------------------------------------------------
// Helpers (mismos que en opportunities.js)
// ------------------------------------------------------------
function formatIcon(format) {
  if (format === "in-person") return "👤";
  if (format === "virtual") return "💻";
  return "🔀";
}

function renderLogo(item, className) {
  if (item.logo_url && item.logo_url.trim() !== "") {
    return `<div class="${className}" style="background:${item.logo_color}">
      <img src="${item.logo_url}" alt="${item.title} logo" onerror="this.parentElement.innerHTML='${item.logo_initial}'">
    </div>`;
  }
  return `<div class="${className}" style="background:${item.logo_color}">${item.logo_initial}</div>`;
}

// Ícono de corazón guardado (guardados_fav.png / -white.png), mismo
// patrón icon-light/icon-dark que en opportunities.js. Acá siempre
// va con la clase "active" porque todo lo que se ve en esta página
// ya está guardado.
function renderFavIcon() {
  return `<img src="../guardados_fav.png" alt="" class="fav-icon icon-light">
    <img src="../guardados_fav-white.png" alt="" class="fav-icon icon-dark">`;
}

// ------------------------------------------------------------
// Render de la grilla de favoritos
// ------------------------------------------------------------
function renderGrid() {
  const grid = document.getElementById("oppGrid");
  const resultsCount = document.getElementById("resultsCount");
  const lang = getCurrentLang();

  resultsCount.textContent = pluralOpportunities(ALL_DATA.length, lang);

  if (ALL_DATA.length === 0) {
    grid.innerHTML = `<div class="no-results">${t("fav.noResults", lang)}</div>`;
    return;
  }

  grid.innerHTML = ALL_DATA.map(item => `
    <article class="opp-card" data-id="${item.id}">
      <div class="opp-top">
        ${renderLogo(item, "opp-logo")}
        <button class="fav-btn active" data-fav="${item.id}" aria-label="${t("opp.fav.remove", lang)}">
          ${renderFavIcon()}
        </button>
      </div>

      <span class="match-badge">${tf("opp.matchBadge", lang, { pct: item.match_percent })}</span>

      <h4>${localizeField(item, "title", lang)}</h4>
      <div class="opp-meta">
        <span>📍 ${localizeCountry(item.country, lang)}</span>
        <span>${formatIcon(item.format)} ${localizeEnum(item.format, "format", lang)}</span>
      </div>

      <p class="opp-desc">${localizeField(item, "description", lang)}</p>

      <ul class="opp-reasons">
        ${(localizeField(item, "reasons", lang) || []).slice(0, 2).map(r => `<li>${r}</li>`).join("")}
      </ul>

      <div class="opp-tags">
        ${(item.tags || []).map(tag => `<span class="tag tag-cat">${tag}</span>`).join("")}
      </div>

      <button class="btn-details" data-view-details="${item.id}">${t("opp.viewDetails", lang)}</button>
    </article>
  `).join("");

  grid.querySelectorAll("[data-fav]").forEach(btn => {
    btn.addEventListener("click", () => removeFavorite(Number(btn.dataset.fav)));
  });

  grid.querySelectorAll("[data-view-details]").forEach(btn => {
    btn.addEventListener("click", () => openModal(Number(btn.dataset.viewDetails)));
  });
}

// ------------------------------------------------------------
// Modal de detalles (igual que en opportunities.js, con el
// corazón siempre activo ya que todo lo que se ve acá está guardado)
// ------------------------------------------------------------
let currentModalOpportunityId = null;

function openModal(id) {
  const item = ALL_DATA.find(i => i.id === id);
  if (!item) return;

  currentModalOpportunityId = id;
  const lang = getCurrentLang();

  const modalContent = document.getElementById("modalContent");

  const localizedRequirements = localizeField(item, "requirements", lang);
  const localizedBenefits = localizeField(item, "benefits", lang);

  const requirements = Array.isArray(localizedRequirements) && localizedRequirements.length
    ? `<ul class="modal-list requirements">${localizedRequirements.map(r => `<li>${r}</li>`).join("")}</ul>`
    : `<p class="modal-empty">${t("opp.modal.noRequirements", lang)}</p>`;

  const benefits = Array.isArray(localizedBenefits) && localizedBenefits.length
    ? `<ul class="modal-list benefits">${localizedBenefits.map(b => `<li>${b}</li>`).join("")}</ul>`
    : `<p class="modal-empty">${t("opp.modal.noBenefits", lang)}</p>`;

  const hasLink = item.link_url && item.link_url.trim() !== "" && item.link_url.trim() !== "#";

  modalContent.innerHTML = `
    <button class="fav-btn modal-fav-btn active" data-fav="${item.id}" aria-label="${t("opp.fav.remove", lang)}">
      ${renderFavIcon()}
    </button>

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

    <span class="modal-match">${tf("opp.matchBadge", lang, { pct: item.match_percent })}</span>

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

    <div class="modal-actions">
      ${hasLink
        ? `<a class="btn-official" href="${item.link_url}" target="_blank" rel="noopener noreferrer">${t("opp.modal.officialSite", lang)}</a>`
        : `<span class="btn-official disabled">${t("opp.modal.noLink", lang)}</span>`
      }
    </div>
  `;

  modalContent.querySelectorAll("[data-fav]").forEach(btn => {
    btn.addEventListener("click", () => removeFavorite(Number(btn.dataset.fav)));
  });

  document.getElementById("modalOverlay").classList.add("open");
}

function closeModal() {
  document.getElementById("modalOverlay").classList.remove("open");
  currentModalOpportunityId = null;
}

// ------------------------------------------------------------
// Quitar de favoritos (borra de Supabase y de la lista)
// ------------------------------------------------------------
async function removeFavorite(id) {
  if (!currentUserId) return;

  ALL_DATA = ALL_DATA.filter(item => item.id !== id);
  renderGrid();

  if (document.getElementById("modalOverlay").classList.contains("open")) {
    closeModal();
  }

  const { error } = await supabaseClient
    .from("Favoritos")
    .delete()
    .eq("user_id", currentUserId)
    .eq("opportunity_id", id);

  if (error) console.error("Error quitando favorito:", error);
}

// ------------------------------------------------------------
// Eventos del modal
// ------------------------------------------------------------
function setupEvents() {
  document.getElementById("modalClose").addEventListener("click", closeModal);

  document.getElementById("modalOverlay").addEventListener("click", e => {
    if (e.target.id === "modalOverlay") closeModal();
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeModal();
  });
}

// Al cambiar el idioma desde Ajustes, repintamos la grilla y el
// modal (si está abierto) sin volver a pegarle a Supabase.
function rerenderFavoritesForLanguage() {
  renderGrid();
  if (currentModalOpportunityId !== null &&
      document.getElementById("modalOverlay")?.classList.contains("open")) {
    openModal(currentModalOpportunityId);
  }
}

window.addEventListener("languagechange", rerenderFavoritesForLanguage);

// ------------------------------------------------------------
// Init
// ------------------------------------------------------------
async function init() {
  const { data: userData } = await supabaseClient.auth.getUser();
  currentUserId = userData?.user?.id || null;

  ALL_DATA = await getFavoriteOpportunities(currentUserId);
  setupEvents();
  renderGrid();
}

init();