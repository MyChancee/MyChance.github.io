// ============================================================
// notifications.js
// Sistema de notificaciones — SOLO Premium/Enterprise.
//
// - Campanita del header (#notifBellBtn): abre un panel para
//   activar/desactivar notificaciones, elegir si se muestran al
//   centro de la pantalla o al costado, y ver/quitar las
//   organizaciones que el usuario sigue (tabla "Suscripciones").
// - La campanita DENTRO del modal de detalle de una oportunidad
//   (🔔 junto a ♥ y 🎯) ya está resuelta en opportunities.js
//   (toggleFollow), este archivo no la toca. Para que ambos
//   lugares queden sincronizados sin recargar la página, cuando
//   cualquiera de los dos cambia un follow, dispara el evento
//   "mychance:follow-changed" en `document` y el otro lo escucha.
// - Al cargar la página: busca notificaciones sin leer (tabla
//   "Notificaciones", generadas por un trigger cuando una
//   organización seguida publica algo nuevo) y las muestra sin
//   importar el % de match, porque el usuario decidió seguir a
//   esa organización.
// ============================================================

let notifUserId = null;
let notifUsuario = null;
let notifQueue = [];

function isPremiumPlan(plan) {
  return plan === "premium" || plan === "enterprise";
}

// ------------------------------------------------------------
// Panel de configuración (campanita del header)
// ------------------------------------------------------------
function renderNotifPanel() {
  const container = document.getElementById("notifPanelContent");
  if (!container) return;

  if (!isPremiumPlan(notifUsuario?.plan)) {
    container.innerHTML = `
      <div class="notif-locked">
        <span class="notif-locked-icon">👑</span>
        <p class="notif-locked-title">Notifications are a Premium feature</p>
        <p class="notif-locked-sub">Follow organizations from any opportunity's details panel and get notified the moment they publish something new — upgrade to unlock.</p>
        <a href="dashboard.html" class="notif-upgrade-btn">See Premium Plan ›</a>
      </div>
    `;
    return;
  }

  const enabled = notifUsuario?.notifications_enabled !== false;
  const display = notifUsuario?.notification_display || "side";

  container.innerHTML = `
    <h3>🔔 Notifications</h3>
    <p class="notif-panel-sub">Get notified when an organization you follow publishes a new opportunity.</p>

    <label class="notif-toggle-row">
      <span>Enable notifications</span>
      <input type="checkbox" id="notifEnabledToggle" ${enabled ? "checked" : ""}>
    </label>

    <div class="notif-display-group">
      <p class="notif-group-label">Show new opportunities</p>
      <label class="notif-radio-row">
        <input type="radio" name="notifDisplay" value="side" ${display === "side" ? "checked" : ""}>
        <span>To the side of the screen</span>
      </label>
      <label class="notif-radio-row">
        <input type="radio" name="notifDisplay" value="center" ${display === "center" ? "checked" : ""}>
        <span>In the center of the screen</span>
      </label>
    </div>

    <p class="notif-group-label">Organizations you follow</p>
    <div id="notifFollowedList" class="notif-followed-list">
      <div class="no-results">Loading…</div>
    </div>
  `;

  document.getElementById("notifEnabledToggle").addEventListener("change", async e => {
    await supabaseClient.from("Usuarios").update({ notifications_enabled: e.target.checked }).eq("id", notifUserId);
    notifUsuario.notifications_enabled = e.target.checked;
  });

  document.querySelectorAll('input[name="notifDisplay"]').forEach(radio => {
    radio.addEventListener("change", async e => {
      await supabaseClient.from("Usuarios").update({ notification_display: e.target.value }).eq("id", notifUserId);
      notifUsuario.notification_display = e.target.value;
    });
  });

  renderFollowedList();
}

// Siempre trae la lista fresca de Supabase (no guarda estado propio en
// memoria), así nunca se desincroniza de lo que haga opportunities.js.
async function renderFollowedList() {
  const listEl = document.getElementById("notifFollowedList");
  if (!listEl) return;

  const { data, error } = await supabaseClient
    .from("Suscripciones")
    .select("organization")
    .eq("user_id", notifUserId)
    .order("created_at", { ascending: false });

  if (error) {
    listEl.innerHTML = `<p class="notif-empty">Could not load your followed organizations.</p>`;
    return;
  }

  if (!data || data.length === 0) {
    listEl.innerHTML = `<p class="notif-empty">You're not following any organizations yet. Tap 🔔 on an opportunity's details panel to start.</p>`;
    return;
  }

  listEl.innerHTML = data.map(row => `
    <div class="notif-followed-item">
      <span>${row.organization}</span>
      <button class="notif-unfollow-btn" data-unfollow="${row.organization}" aria-label="Unfollow">✕</button>
    </div>
  `).join("");

  listEl.querySelectorAll("[data-unfollow]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const { error: delError } = await supabaseClient
        .from("Suscripciones")
        .delete()
        .eq("user_id", notifUserId)
        .eq("organization", btn.dataset.unfollow);

      if (delError) {
        console.error("Error quitando la suscripción:", delError);
        return;
      }

      // Avisa a opportunities.js (si la campanita del modal está
      // mostrando esta misma organización, se actualiza sola).
      document.dispatchEvent(new CustomEvent("mychance:follow-changed", {
        detail: { organization: btn.dataset.unfollow, following: false }
      }));

      renderFollowedList();
    });
  });
}

function openNotifPanel() {
  renderNotifPanel();
  document.getElementById("notifPanelOverlay")?.classList.add("open");
}

function closeNotifPanel() {
  document.getElementById("notifPanelOverlay")?.classList.remove("open");
}

function setupNotifPanelEvents() {
  const bellBtn = document.getElementById("notifBellBtn");
  const closeBtn = document.getElementById("notifPanelClose");
  const overlay = document.getElementById("notifPanelOverlay");

  if (bellBtn) bellBtn.addEventListener("click", openNotifPanel);
  if (closeBtn) closeBtn.addEventListener("click", closeNotifPanel);
  if (overlay) {
    overlay.addEventListener("click", e => {
      if (e.target.id === "notifPanelOverlay") closeNotifPanel();
    });
  }

  // Si el usuario sigue/deja de seguir una organización desde la
  // campanita del MODAL (opportunities.js), y el panel del header
  // está abierto en ese momento, refrescamos la lista al toque.
  document.addEventListener("mychance:follow-changed", () => {
    if (document.getElementById("notifPanelOverlay")?.classList.contains("open")) {
      renderFollowedList();
    }
  });
}

// ------------------------------------------------------------
// Avisos de nueva oportunidad (al cargar / refrescar la página)
// ------------------------------------------------------------
function renderMiniLogoNotif(opp) {
  if (opp.logo_url && opp.logo_url.trim() !== "") {
    return `<div class="announce-logo" style="background:${opp.logo_color}">
      <img src="${opp.logo_url}" alt="" onerror="this.parentElement.innerHTML='${opp.logo_initial}'">
    </div>`;
  }
  return `<div class="announce-logo" style="background:${opp.logo_color}">${opp.logo_initial}</div>`;
}

async function markNotificationSeen(notifId) {
  await supabaseClient.from("Notificaciones").update({ seen: true }).eq("id", notifId);
}

function showNextAnnouncement() {
  if (notifQueue.length === 0) return;

  const notif = notifQueue[0];
  const opp = notif.Oportunidades;
  const display = notifUsuario?.notification_display || "side";

  const dismiss = () => {
    notifQueue.shift();
    markNotificationSeen(notif.id);
    if (display === "center") {
      document.getElementById("announceOverlay")?.classList.remove("open");
    } else {
      card?.remove();
    }
    setTimeout(showNextAnnouncement, 250);
  };

  let card;

  if (display === "center") {
    const box = document.getElementById("announceBox");
    box.innerHTML = `
      <button class="modal-close" id="announceClose" aria-label="Close">✕</button>
      <span class="announce-badge">🔔 New opportunity</span>
      <div class="announce-header">
        ${renderMiniLogoNotif(opp)}
        <div>
          <p class="announce-org">${opp.organization}</p>
          <h3>${opp.title}</h3>
        </div>
      </div>
      <a href="opportunities.html?id=${opp.id}" class="announce-view-btn">View opportunity ›</a>
    `;
    document.getElementById("announceOverlay").classList.add("open");
    document.getElementById("announceClose").addEventListener("click", dismiss);
  } else {
    const stack = document.getElementById("announceSideStack");
    card = document.createElement("div");
    card.className = "announce-side-card";
    card.innerHTML = `
      <button class="modal-close announce-side-close" aria-label="Close">✕</button>
      <span class="announce-badge">🔔 New opportunity</span>
      <div class="announce-header">
        ${renderMiniLogoNotif(opp)}
        <div>
          <p class="announce-org">${opp.organization}</p>
          <h3>${opp.title}</h3>
        </div>
      </div>
      <a href="opportunities.html?id=${opp.id}" class="announce-view-btn">View opportunity ›</a>
    `;
    stack.appendChild(card);
    requestAnimationFrame(() => card.classList.add("show"));
    card.querySelector(".announce-side-close").addEventListener("click", dismiss);
  }
}

async function checkNewNotifications() {
  if (!isPremiumPlan(notifUsuario?.plan)) return;
  if (notifUsuario?.notifications_enabled === false) return;

  const { data, error } = await supabaseClient
    .from("Notificaciones")
    .select("id, Oportunidades(id, title, organization, logo_color, logo_initial, logo_url)")
    .eq("user_id", notifUserId)
    .eq("seen", false)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error trayendo notificaciones:", error);
    return;
  }

  notifQueue = (data || []).filter(n => n.Oportunidades);
  showNextAnnouncement();
}

// ------------------------------------------------------------
// Init
// ------------------------------------------------------------
async function initNotifications() {
  const { data: userData } = await supabaseClient.auth.getUser();
  notifUserId = userData?.user?.id || null;
  if (!notifUserId) return;

  const { data: usuario, error } = await supabaseClient
    .from("Usuarios")
    .select("plan, notifications_enabled, notification_display")
    .eq("id", notifUserId)
    .maybeSingle();

  if (error || !usuario) return;
  notifUsuario = usuario;

  setupNotifPanelEvents();
  await checkNewNotifications();
}

initNotifications();