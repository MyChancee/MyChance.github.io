// ============================================================
// language.js
// Motor de traducción del sitio. Traduce según Usuarios.language,
// con localStorage como caché rápida para evitar el "flash" del
// idioma incorrecto mientras responde Supabase.
//
// Cómo usarlo en una página nueva:
//   1) Incluir este script (idealmente junto a theme.js, antes
//      de que el contenido se vea).
//   2) Marcar los textos traducibles con data-i18n="clave".
//      Para atributos (placeholder, title, aria-label, etc.) usar
//      data-i18n-<atributo>="clave", ej: data-i18n-placeholder="..".
//   3) Si necesitás cambiar el idioma manualmente desde JS
//      (por ejemplo al tocar un radio), llamar a applyLanguage(lang).
//
// Todo lo declarado acá (DICTIONARY, applyLanguage, translateNode,
// LANG_CACHE_KEY, y los helpers de abajo) queda disponible para los
// <script> que se carguen después en la misma página, sin necesidad
// de exportarlo.
//
// ------------------------------------------------------------
// CONTENIDO DINÁMICO (tabla "Oportunidades")
// ------------------------------------------------------------
// El HTML estático se traduce solo con data-i18n. El contenido que
// viene de Supabase (título, descripción, reasons, requirements,
// benefits de cada beca) NO pasa por el diccionario: ya está guardado
// en la tabla en dos columnas (ej. title / title_es). Para pintarlo
// en el idioma correcto, usar los helpers de más abajo:
//
//   localizeField(opp, "title", lang)       -> string
//   localizeEnum(opp.category, "category", lang) -> string
//   localizeCountry(opp.country, lang)      -> string
//   getCurrentLang()                        -> "es" | "en"
//
// Y para que las tarjetas ya pintadas se actualicen cuando el
// usuario cambia el idioma desde Ajustes (sin recargar la página),
// escuchar el evento "languagechange":
//
//   window.addEventListener("languagechange", () => {
//     renderOpportunities(currentOpportunitiesData);
//   });
// ============================================================

const DICTIONARY = {
  es: {
    // ---- Sidebar (compartido en todas las páginas) ----
    "sidebar.hello": "Hola,",
    "sidebar.plan.free": "Plan gratuito",
    "sidebar.plan.premium": "Plan premium",
    "sidebar.plan.enterprise": "Plan enterprise",
    "nav.home": "Inicio",
    "nav.opportunities": "Oportunidades",
    "nav.profile": "Perfil",
    "nav.favorites": "Favoritos",
    "nav.settings": "Ajustes",
    "quote.title": "Te guiamos, vos brillás",
    "quote.sub": "Encontrá las oportunidades que te llevarán más lejos.",
    "common.back": "‹ Volver",
    "common.close": "Cerrar",
    "common.notifications": "Notificaciones",
    "common.loading": "Cargando…",

    // ---- Settings ----
    "settings.title": "Ajustes",
    "settings.subtitle": "Hacé que MyChance se vea y se sienta tuyo",
    "settings.appearance.title": "Apariencia",
    "settings.appearance.sub": "Elegí cómo se ve MyChance en tu pantalla.",
    "settings.theme.light": "☀️ Claro",
    "settings.theme.dark": "🌙 Oscuro",
    "settings.language.title": "Idioma",
    "settings.language.sub": "Elegí el idioma que querés usar en toda la app.",
    "settings.language.es": "Español",
    "settings.language.en": "English",
    "settings.saved": "Guardado ✓",
    "settings.error": "No se pudo guardar.",

    // ---- Dashboard ----
    "dashboard.quote": "Grandes oportunidades no pasan, las encontrás.",
    "dashboard.welcome.greeting": "Bienvenido,",
    "dashboard.welcome.line1": "Tu futuro empieza con",
    "dashboard.welcome.line2": "una oportunidad.",
    "dashboard.goal.title": "Objetivo Actual",
    "dashboard.goal.loading": "Cargando…",
    "dashboard.recommended.title": "Oportunidades Recomendadas para Vos",
    "dashboard.recommended.loading": "Cargando oportunidades recomendadas…",
    "dashboard.seeAll": "Ver todas ›",
    "dashboard.plans.title": "Planes",
    "dashboard.plans.sub": "Elegí el plan que se ajuste a tus metas.",
    "dashboard.plans.loading": "Cargando planes…",
    "dashboard.notify.loading": "Cargando oportunidades…",
    "dashboard.exploreNow": "Explorar ahora ›",

    "upgrade.title": "Actualizar a Premium",
    "upgrade.subtitle": "Desbloqueá todo lo que MyChance tiene para ofrecer",
    "upgrade.priceNote": "/mes",
    "upgrade.included": "Qué incluye",
    "upgrade.feature1": "Notificaciones personalizadas de nuevas oportunidades",
    "upgrade.feature2": "Guardá favoritos ilimitados",
    "upgrade.feature3": "Búsqueda y filtros avanzados",
    "upgrade.paymentDetails": "Datos de pago",
    "upgrade.cardholderName": "Nombre del titular",
    "upgrade.cardNumber": "Número de tarjeta",
    "upgrade.expiry": "Fecha de vencimiento",
    "upgrade.cvc": "CVC",
    "upgrade.billingEmail": "Email de facturación",
    "upgrade.confirmBtn": "Confirmar y Actualizar — $8.99/mes",
    "upgrade.disclaimer": "Este es un checkout simulado — no se realiza ningún cargo real. Cancelá cuando quieras.",
    "upgrade.ph.cardName": "Nombre completo en la tarjeta",
    "upgrade.ph.email": "vos@ejemplo.com",

    // ---- Opportunities ----
    "opportunities.title": "Oportunidades",
    "opportunities.subtitle": "Descubrí programas que se ajustan a tus metas",
    "opportunities.savedBtn": "Oportunidades Guardadas",
    "opportunities.searchPlaceholder": "Buscar oportunidades...",
    "opportunities.sort.match": "Ordenar por: Mejor coincidencia",
    "opportunities.sort.newest": "Ordenar por: Más recientes",
    "opportunities.sort.az": "Ordenar por: A–Z",
    "opportunities.pill.all": "Todas",
    "opportunities.pill.scholarship": "Becas",
    "opportunities.pill.exchange": "Intercambio",
    "opportunities.pill.competition": "Competencias",
    "opportunities.pill.leadership": "Liderazgo",
    "opportunities.pill.volunteering":"Voluntariado",
    "opportunities.filters.title": "Filtros",
    "opportunities.filters.reset": "Restablecer filtros",
    "opportunities.filters.country": "País",
    "opportunities.filters.programType": "Tipo de Programa",
    "opportunities.filters.format": "Formato",
    "opportunities.filters.difficulty": "Nivel de Dificultad",

    // ---- Favorites ----
    "favorites.quote.title": "Guardá las que te cierran.",
    "favorites.quote.sub": "Tus oportunidades guardadas, todas en un solo lugar.",
    "favorites.title": "Favoritos",
    "favorites.subtitle": "Oportunidades que guardaste para volver más tarde",

    // ---- Profile ----
    "profile.intro": "Actualizá tu información para que podamos ayudarte a encontrar las mejores oportunidades para vos.",
    "profile.label.fullName": "Nombre completo",
    "profile.label.email": "Email",
    "profile.label.age": "Edad",
    "profile.label.nationality": "Nacionalidad",
    "profile.label.gender": "Género",
    "profile.label.academicLevel": "Nivel Académico",
    "profile.label.gpa": "Promedio (GPA)",
    "profile.label.modality": "Modalidad",
    "profile.label.countriesInterest": "Países de interés",
    "profile.label.professionalInterest": "Interés profesional",
    "profile.ph.fullName": "ej. Maria Gonzalez",
    "profile.ph.email": "vos@ejemplo.com",
    "profile.ph.age": "ej. 17",
    "profile.ph.nationality": "ej. Panameña",
    "profile.ph.gpa": "ej. 3.75",
    "profile.ph.countriesInterest": "ej. Estados Unidos, Canadá",
    "profile.ph.professionalInterest": "ej. Ingeniería",
    "profile.option.selectGender": "Seleccioná género",
    "profile.option.female": "Femenino",
    "profile.option.male": "Masculino",
    "profile.option.other": "Otro",
    "profile.option.preferNotToSay": "Prefiero no decirlo",
    "profile.option.selectLevel": "Seleccioná nivel",
    "profile.option.highSchool": "Secundaria",
    "profile.option.undergraduate": "Grado (Undergraduate)",
    "profile.option.graduate": "Posgrado (Graduate)",
    "profile.option.postgraduate": "Postgrado",
    "profile.option.selectModality": "Seleccioná modalidad",
    "profile.option.inPerson": "Presencial",
    "profile.option.virtual": "Virtual",
    "profile.option.hybrid": "Híbrido",
    "profile.editBtn": "Editar perfil",
    "profile.goals.title": "🎯 Mis Metas",
    "profile.goals.sub": "Seguí las oportunidades en las que estás trabajando, en orden de prioridad.",
    "profile.goals.emptyNote": "Todavía no tenés metas. Marcá una oportunidad con 🎯 en Oportunidades para empezar a seguirla acá.",
    "profile.goals.premiumNoteText": "El plan gratuito sigue 1 meta a la vez.",
    "profile.goals.premiumNoteLink": "Actualizá a Premium",
    "profile.goals.premiumNoteRest": "para seguir varias y reordenarlas por prioridad.",
    "profile.lc.title": "✨ Curriculum Vita (CV)",
    "profile.lc.sub": "Contanos más sobre vos para afinar tus coincidencias y guiarte hacia los requisitos que te faltan.",
    "profile.lc.lockedTitle": "El CV es una función Premium",
    "profile.lc.lockedSub": "Actualizá a Premium para desbloquear un perfil más profundo y recibir guía personalizada para las oportunidades que más querés.",
    "profile.lc.upgradeBtn": "Ver Plan Premium ›",
    "profile.lc.label.toefl": "¿Rendiste o rendirías TOEFL / IELTS?",
    "profile.lc.label.bachelor": "¿Completaste la licenciatura?",
    "profile.lc.label.recLetters": "Cartas de recomendación disponibles",
    "profile.lc.label.languages": "Idiomas que hablás",
    "profile.lc.label.workExperience": "Experiencia laboral",
    "profile.lc.label.volunteerExperience": "Experiencia de voluntariado",
    "profile.lc.label.leadership": "Experiencia de liderazgo",
    "profile.lc.label.certifications": "Certificaciones",
    "profile.lc.ph.recLetters": "ej. 2",
    "profile.lc.ph.languages": "ej. Español, Inglés",
    "profile.lc.ph.workExperience": "ej. 1 año como tutor",
    "profile.lc.ph.volunteerExperience": "ej. ONG local, 6 meses",
    "profile.lc.ph.leadership": "ej. Presidente del centro de estudiantes",
    "profile.lc.ph.certifications": "ej. Google Data Analytics",
    "profile.lc.option.selectOption": "Seleccioná una opción",
    "profile.lc.option.yes": "Sí",
    "profile.lc.option.no": "No",
    "profile.lc.editBtn": "Editar CV",

    // ---- Enums de contenido dinámico (Oportunidades) ----
    "difficulty.beginner": "Principiante",
    "difficulty.intermediate": "Intermedio",
    "difficulty.advanced": "Avanzado",

    // ---- Strings dinámicos generados en JS (opportunities.js) ----
    "opp.matchBadge": "{pct}% coincidencia",
    "opp.viewDetails": "Ver detalles ›",
    "opp.learnMore": "Saber más ›",
    "opp.featuredBadge": "⭐ Destacado esta semana",
    "opp.noResults": "Ninguna oportunidad coincide con tus filtros todavía. Probá ajustarlos.",
    "opp.resultsCount.one": "{count} oportunidad encontrada",
    "opp.resultsCount.other": "{count} oportunidades encontradas",
    "opp.modal.requirements": "Requisitos",
    "opp.modal.benefits": "Qué ofrece",
    "opp.modal.noRequirements": "Todavía no hay requisitos específicos listados.",
    "opp.modal.noBenefits": "Todavía no hay beneficios listados.",
    "opp.modal.officialSite": "Ir al sitio oficial ›",
    "opp.modal.noLink": "El enlace oficial todavía no está disponible",
    "opp.goal.remove": "Quitar de Mis Metas",
    "opp.goal.set": "Marcar como meta actual",
    "opp.bell.stop": "Dejar de recibir avisos de {org}",
    "opp.bell.start": "Recibir avisos de nuevas oportunidades de {org}",
    "opp.bell.locked": "Función Premium — actualizá para desbloquear",
    "opp.checklist.complete": "🏆 Meta alcanzada",
    "opp.checklist.progress": "{pct}% de la checklist",
    "opp.toast.goalLimit": "El plan gratuito sigue 1 meta a la vez. Actualizá a Premium para seguir más.",
    "opp.toast.notifPremium": "Las notificaciones son una función Premium. Actualizá para desbloquearlas.",
    "opp.toast.favAdded": "Agregado a favoritos ✓",
    "opp.fav.save": "Guardar oportunidad",
    "opp.fav.remove": "Quitar de favoritos",
    "opp.matchLabel": "Coincidencia",

    // ---- Strings dinámicos generados en JS (dashboard.js) ----
    "dash.goal.empty.title": "Todavía no tenés una meta fijada",
    "dash.goal.empty.sub": "Elegí una beca en Oportunidades y marcala con 🎯",
    "dash.goal.explore": "Explorar oportunidades ›",
    "dash.goal.keepGoing": "¡Seguí así!",
    "dash.goal.reached": "¡Meta alcanzada! 🎉",
    "dash.goal.viewGoal": "Ver meta ›",
    "dash.recommended.empty": "Todavía no hay oportunidades recomendadas.",
    "dash.notifyCount": "{count} oportunidades te esperan!",
    "dash.notifyCount.error": "¡Nuevas oportunidades te esperan!",
    "dash.plan.current": "Plan Actual",
    "dash.plan.comingSoon": "Próximamente",
    "dash.plan.upgradeBtn": "Actualizar",
    "dash.plan.upgradeSoon": "¡El flujo de actualización llega pronto!",
    "dash.plan.welcomePremium": "¡Bienvenido a Premium! 🎉",
    "dash.plan.error": "Algo salió mal. Intentá de nuevo.",
    "dash.plan.processing": "Procesando…",
    "dash.plan.free.name": "Plan Gratuito",
    "dash.plan.free.priceNote": "para siempre",
    "dash.plan.free.f1": "Acceso a oportunidades",
    "dash.plan.free.f2": "Guardá hasta 3 favoritos",
    "dash.plan.free.f3": "Búsqueda básica",
    "dash.plan.premium.name": "Plan Premium",
    "dash.plan.premium.priceNote": "/mes",
    "dash.plan.premium.f1": "Notificaciones personalizadas",
    "dash.plan.premium.f2": "Favoritos ilimitados",
    "dash.plan.premium.f3": "Búsqueda y filtros avanzados",
    "dash.plan.premium.f4": "Curriculum de Vida (CV) y metas múltiples",
    "dash.plan.enterprise.name": "Plan Enterprise",
    "dash.plan.enterprise.price": "Personalizado",
    "dash.plan.enterprise.priceNote": "/año",
    "dash.plan.enterprise.f1": "Para escuelas y organizaciones",
    "dash.plan.enterprise.f2": "Gestioná tu equipo",
    "dash.plan.enterprise.f3": "Analíticas avanzadas",

    // ---- Strings dinámicos generados en JS (favorites.js) ----
    "fav.noResults": "Todavía no guardaste ninguna oportunidad. Tocá el ♡ en cualquier oportunidad para agregarla acá.",
  },
  en: {
    "sidebar.hello": "Hello,",
    "sidebar.plan.free": "Free plan",
    "sidebar.plan.premium": "Premium plan",
    "sidebar.plan.enterprise": "Enterprise plan",
    "nav.home": "Home",
    "nav.opportunities": "Opportunities",
    "nav.profile": "Profile",
    "nav.favorites": "Favorites",
    "nav.settings": "Settings",
    "quote.title": "We guide, You shine",
    "quote.sub": "Find the opportunities that will take you further.",
    "common.back": "‹ Back",
    "common.close": "Close",
    "common.notifications": "Notifications",
    "common.loading": "Loading…",

    "settings.title": "Settings",
    "settings.subtitle": "Make MyChance look and feel like yours",
    "settings.appearance.title": "Appearance",
    "settings.appearance.sub": "Choose how MyChance looks on your screen.",
    "settings.theme.light": "☀️ Light",
    "settings.theme.dark": "🌙 Dark",
    "settings.language.title": "Language",
    "settings.language.sub": "Choose the language you'd like to use throughout the app.",
    "settings.language.es": "Español",
    "settings.language.en": "English",
    "settings.saved": "Saved ✓",
    "settings.error": "Could not save.",

    "dashboard.quote": "Great opportunities don't happen, you find them.",
    "dashboard.welcome.greeting": "Welcome,",
    "dashboard.welcome.line1": "Your future starts with",
    "dashboard.welcome.line2": "one opportunity.",
    "dashboard.goal.title": "Current Goal",
    "dashboard.goal.loading": "Loading…",
    "dashboard.recommended.title": "Recommended Opportunities for You",
    "dashboard.recommended.loading": "Loading recommended opportunities…",
    "dashboard.seeAll": "See all ›",
    "dashboard.plans.title": "Plans",
    "dashboard.plans.sub": "Choose the plan that fits your goals.",
    "dashboard.plans.loading": "Loading plans…",
    "dashboard.notify.loading": "Loading opportunities…",
    "dashboard.exploreNow": "Explore now ›",

    "upgrade.title": "Upgrade to Premium",
    "upgrade.subtitle": "Unlock everything MyChance has to offer",
    "upgrade.priceNote": "/month",
    "upgrade.included": "What's included",
    "upgrade.feature1": "Personalized notifications for new opportunities",
    "upgrade.feature2": "Save unlimited favorites",
    "upgrade.feature3": "Advanced search & filters",
    "upgrade.paymentDetails": "Payment details",
    "upgrade.cardholderName": "Cardholder name",
    "upgrade.cardNumber": "Card number",
    "upgrade.expiry": "Expiry date",
    "upgrade.cvc": "CVC",
    "upgrade.billingEmail": "Billing email",
    "upgrade.confirmBtn": "Confirm & Upgrade — $8.99/mo",
    "upgrade.disclaimer": "This is a simulated checkout — no real charge is made. Cancel anytime.",
    "upgrade.ph.cardName": "Full name on card",
    "upgrade.ph.email": "you@example.com",

    "opportunities.title": "Opportunities",
    "opportunities.subtitle": "Discover programs that match your goals",
    "opportunities.savedBtn": " Saved Opportunities",
    "opportunities.searchPlaceholder": "Search opportunities...",
    "opportunities.sort.match": "Sort by: Best match",
    "opportunities.sort.newest": "Sort by: Newest",
    "opportunities.sort.az": "Sort by: A–Z",
    "opportunities.pill.all": "All",
    "opportunities.pill.scholarship": "Scholarships",
    "opportunities.pill.exchange": "Exchange",
    "opportunities.pill.competition": "Competitions",
    "opportunities.pill.leadership": "Leadership",
    "opportunities.pill.volunteering": "Volunteering",
    "opportunities.filters.title": "Filters",
    "opportunities.filters.reset": "Reset filters",
    "opportunities.filters.country": "Country",
    "opportunities.filters.programType": "Program Type",
    "opportunities.filters.format": "Format",
    "opportunities.filters.difficulty": "Difficulty Level",

    "favorites.quote.title": "Keep the ones that feel right.",
    "favorites.quote.sub": "Your saved opportunities, all in one place.",
    "favorites.title": "Favorites",
    "favorites.subtitle": "Opportunities you've saved to come back to",

    "profile.intro": "Update your information so we can help you find the best opportunities for you.",
    "profile.label.fullName": "Full name",
    "profile.label.email": "Email",
    "profile.label.age": "Age",
    "profile.label.nationality": "Nationality",
    "profile.label.gender": "Gender",
    "profile.label.academicLevel": "Academic Level",
    "profile.label.gpa": "GPA",
    "profile.label.modality": "Modality",
    "profile.label.countriesInterest": "Countries of interest",
    "profile.label.professionalInterest": "Professional interest",
    "profile.ph.fullName": "e.g. Maria Gonzalez",
    "profile.ph.email": "you@example.com",
    "profile.ph.age": "e.g. 17",
    "profile.ph.nationality": "e.g. Panamanian",
    "profile.ph.gpa": "e.g. 3.75",
    "profile.ph.countriesInterest": "e.g. United States, Canada",
    "profile.ph.professionalInterest": "e.g. Engineering",
    "profile.option.selectGender": "Select gender",
    "profile.option.female": "Female",
    "profile.option.male": "Male",
    "profile.option.other": "Other",
    "profile.option.preferNotToSay": "Prefer not to say",
    "profile.option.selectLevel": "Select level",
    "profile.option.highSchool": "High School",
    "profile.option.undergraduate": "Undergraduate",
    "profile.option.graduate": "Graduate",
    "profile.option.postgraduate": "Postgraduate",
    "profile.option.selectModality": "Select modality",
    "profile.option.inPerson": "In-person",
    "profile.option.virtual": "Virtual",
    "profile.option.hybrid": "Hybrid",
    "profile.editBtn": "Edit profile",
    "profile.goals.title": "🎯 My Goals",
    "profile.goals.sub": "Track the opportunities you're working towards, in order of priority.",
    "profile.goals.emptyNote": "You haven't set any goals yet. Mark an opportunity with 🎯 in Opportunities to start tracking it here.",
    "profile.goals.premiumNoteText": "Free plan tracks 1 goal at a time.",
    "profile.goals.premiumNoteLink": "Upgrade to Premium",
    "profile.goals.premiumNoteRest": "to track several and reorder them by priority.",
    "profile.lc.title": "✨ Curriculum Vita (CV)",
    "profile.lc.sub": "Share more about yourself so we can fine-tune your matches and guide you toward the requirements you're missing.",
    "profile.lc.lockedTitle": "CV is a Premium feature",
    "profile.lc.lockedSub": "Upgrade to Premium to unlock a deeper profile and get personalized guidance for the opportunities you want most.",
    "profile.lc.upgradeBtn": "See Premium Plan ›",
    "profile.lc.label.toefl": "TOEFL / IELTS taken or willing to take?",
    "profile.lc.label.bachelor": "Bachelor's degree completed?",
    "profile.lc.label.recLetters": "Recommendation letters available",
    "profile.lc.label.languages": "Languages you speak",
    "profile.lc.label.workExperience": "Work experience",
    "profile.lc.label.volunteerExperience": "Volunteer experience",
    "profile.lc.label.leadership": "Leadership experience",
    "profile.lc.label.certifications": "Certifications",
    "profile.lc.ph.recLetters": "e.g. 2",
    "profile.lc.ph.languages": "e.g. Spanish, English",
    "profile.lc.ph.workExperience": "e.g. 1 year as a tutor",
    "profile.lc.ph.volunteerExperience": "e.g. Local NGO, 6 months",
    "profile.lc.ph.leadership": "e.g. Student council president",
    "profile.lc.ph.certifications": "e.g. Google Data Analytics",
    "profile.lc.option.selectOption": "Select an option",
    "profile.lc.option.yes": "Yes",
    "profile.lc.option.no": "No",
    "profile.lc.editBtn": "Edit LC",

    // ---- Enums de contenido dinámico (Oportunidades) ----
    "difficulty.beginner": "Beginner",
    "difficulty.intermediate": "Intermediate",
    "difficulty.advanced": "Advanced",

    // ---- Dynamic strings generated in JS (opportunities.js) ----
    "opp.matchBadge": "{pct}% match",
    "opp.viewDetails": "View details ›",
    "opp.learnMore": "Learn more ›",
    "opp.featuredBadge": "⭐ Featured This Week",
    "opp.noResults": "No opportunities match your filters yet. Try adjusting them.",
    "opp.resultsCount.one": "{count} opportunity found",
    "opp.resultsCount.other": "{count} opportunities found",
    "opp.modal.requirements": "Requirements",
    "opp.modal.benefits": "What it offers",
    "opp.modal.noRequirements": "No specific requirements listed yet.",
    "opp.modal.noBenefits": "No benefits listed yet.",
    "opp.modal.officialSite": "Go to official site ›",
    "opp.modal.noLink": "Official link not available yet",
    "opp.goal.remove": "Remove from My Goals",
    "opp.goal.set": "Set as current goal",
    "opp.bell.stop": "Stop notifications from {org}",
    "opp.bell.start": "Get notified about new opportunities from {org}",
    "opp.bell.locked": "Premium feature — upgrade to unlock",
    "opp.checklist.complete": "🏆 Goal reached",
    "opp.checklist.progress": "{pct}% checklist",
    "opp.toast.goalLimit": "Free plan tracks 1 goal at a time. Upgrade to Premium to track more.",
    "opp.toast.notifPremium": "Notifications are a Premium feature. Upgrade to unlock them.",
    "opp.toast.favAdded": "Added to favorites ✓",
    "opp.fav.save": "Save opportunity",
    "opp.fav.remove": "Remove from favorites",
    "opp.matchLabel": "Match",

    // ---- Dynamic strings generated in JS (dashboard.js) ----
    "dash.goal.empty.title": "You don't have a goal set yet",
    "dash.goal.empty.sub": "Pick an opportunity in Opportunities and mark it with 🎯",
    "dash.goal.explore": "Explore opportunities ›",
    "dash.goal.keepGoing": "Keep going!",
    "dash.goal.reached": "Goal reached! 🎉",
    "dash.goal.viewGoal": "View goal ›",
    "dash.recommended.empty": "No recommended opportunities yet.",
    "dash.notifyCount": "{count} Opportunities waiting for you!",
    "dash.notifyCount.error": "New opportunities waiting for you!",
    "dash.plan.current": "Current Plan",
    "dash.plan.comingSoon": "Coming Soon",
    "dash.plan.upgradeBtn": "Upgrade",
    "dash.plan.upgradeSoon": "Upgrade flow coming soon!",
    "dash.plan.welcomePremium": "Welcome to Premium! 🎉",
    "dash.plan.error": "Something went wrong. Please try again.",
    "dash.plan.processing": "Processing…",
    "dash.plan.free.name": "Free Plan",
    "dash.plan.free.priceNote": "forever",
    "dash.plan.free.f1": "Access to opportunities",
    "dash.plan.free.f2": "Save up to 3 favorites",
    "dash.plan.free.f3": "Basic search",
    "dash.plan.premium.name": "Premium Plan",
    "dash.plan.premium.priceNote": "/month",
    "dash.plan.premium.f1": "Personalized notifications",
    "dash.plan.premium.f2": "Save unlimited favorites",
    "dash.plan.premium.f3": "Advanced search & filters",
    "dash.plan.premium.f4": "Life Curriculum (LC) & multiple goals",
    "dash.plan.enterprise.name": "Enterprise Plan",
    "dash.plan.enterprise.price": "Custom",
    "dash.plan.enterprise.priceNote": "/year",
    "dash.plan.enterprise.f1": "For schools & organizations",
    "dash.plan.enterprise.f2": "Manage your team",
    "dash.plan.enterprise.f3": "Advanced analytics",

    // ---- Dynamic strings generated in JS (favorites.js) ----
    "fav.noResults": "You haven't saved any opportunities yet. Tap the ♡ on any opportunity to add it here.",
  },
};

// ------------------------------------------------------------
// Diccionario de nombres de países para el campo "country" de
// Oportunidades (texto libre en inglés en la BD). Completá esta
// lista con los países que realmente uses. Si un país no está
// mapeado acá, se muestra tal cual está guardado (fallback seguro).
// ------------------------------------------------------------
const COUNTRY_NAMES = {
  "United States": { es: "Estados Unidos", en: "United States" },
  "Canada": { es: "Canadá", en: "Canada" },
  "United Kingdom": { es: "Reino Unido", en: "United Kingdom" },
  "Spain": { es: "España", en: "Spain" },
  "Germany": { es: "Alemania", en: "Germany" },
  "France": { es: "Francia", en: "France" },
  "Italy": { es: "Italia", en: "Italy" },
  "Mexico": { es: "México", en: "Mexico" },
  "Argentina": { es: "Argentina", en: "Argentina" },
  "Brazil": { es: "Brasil", en: "Brazil" },
  "Chile": { es: "Chile", en: "Chile" },
  "Colombia": { es: "Colombia", en: "Colombia" },
  "Panama": { es: "Panamá", en: "Panama" },
  "Japan": { es: "Japón", en: "Japan" },
  "China": { es: "China", en: "China" },
  "Australia": { es: "Australia", en: "Australia" },
  "Netherlands": { es: "Países Bajos", en: "Netherlands" },
  "Switzerland": { es: "Suiza", en: "Switzerland" },
  "Sweden": { es: "Suecia", en: "Sweden" },
  "Singapore": { es: "Singapur", en: "Singapore" },
  "South Korea": { es: "Corea del Sur", en: "South Korea" },
  // Agregá acá el resto de los países que tengas en la tabla.
  // Tip: en el SQL editor de Supabase corré
  //   select distinct country from "Oportunidades" order by country;
  // y completá los que falten.
};

// ------------------------------------------------------------
// Mapeo de valores "enum" guardados en columnas sin traducción
// propia (category, format, difficulty_level) hacia claves del
// DICTIONARY de arriba.
// ------------------------------------------------------------
const ENUM_I18N_KEYS = {
  category: {
    scholarship: "opportunities.pill.scholarship",
    exchange: "opportunities.pill.exchange",
    competition: "opportunities.pill.competition",
    leadership: "opportunities.pill.leadership",
    volunteering: "opportunities.pill.volunteering",
  },
  format: {
    inPerson: "profile.option.inPerson",
    virtual: "profile.option.virtual",
    hybrid: "profile.option.hybrid",
  },
  difficulty_level: {
    beginner: "difficulty.beginner",
    intermediate: "difficulty.intermediate",
    advanced: "difficulty.advanced",
  },
};

const LANG_CACHE_KEY = "mychance_lang";

function translateNode(lang) {
  const dict = DICTIONARY[lang] || DICTIONARY.es;

  // Texto visible
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (dict[key] !== undefined) el.textContent = dict[key];
  });

  // Cualquier atributo: data-i18n-placeholder="key" -> placeholder,
  // data-i18n-title="key" -> title, data-i18n-aria-label="key" -> aria-label, etc.
  document.querySelectorAll("[data-i18n-placeholder], [data-i18n-title], [data-i18n-aria-label]").forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith("data-i18n-")) {
        const targetAttr = attr.name.replace("data-i18n-", "");
        const key = attr.value;
        if (dict[key] !== undefined) el.setAttribute(targetAttr, dict[key]);
      }
    }
  });

  document.documentElement.setAttribute("lang", lang);
}

// Aplica el idioma YA, lo guarda en caché local (para que la
// próxima página cargue directo en el idioma correcto), traduce
// todo lo que tenga data-i18n en el DOM actual, y avisa a los demás
// scripts (opportunities.js, dashboard.js, favorites.js) para que
// vuelvan a pintar el contenido dinámico en el idioma nuevo.
function applyLanguage(lang) {
  if (!DICTIONARY[lang]) lang = "es";
  localStorage.setItem(LANG_CACHE_KEY, lang);
  translateNode(lang);
  window.dispatchEvent(new CustomEvent("languagechange", { detail: { lang } }));
}

// Idioma actualmente activo, para usar en scripts que pintan
// contenido dinámico (ej. opportunities.js).
function getCurrentLang() {
  return document.documentElement.getAttribute("lang") || localStorage.getItem(LANG_CACHE_KEY) || "es";
}

// Traduce una clave suelta del DICTIONARY (para textos armados en
// JS, ej. botones dentro de un template string). Si la clave no
// existe, devuelve la clave misma como fallback visible (para que
// se note en desarrollo si falta agregarla).
function t(key, lang) {
  const dict = DICTIONARY[lang] || DICTIONARY.es;
  return dict[key] !== undefined ? dict[key] : key;
}

// Igual que t(), pero reemplaza placeholders {nombre} por los
// valores pasados en `vars`. Ej: tf("opp.matchBadge", "es", { pct: 87 })
// -> "87% coincidencia"
function tf(key, lang, vars = {}) {
  let str = t(key, lang);
  Object.keys(vars).forEach((k) => {
    str = str.replace(new RegExp(`\\{${k}\\}`, "g"), vars[k]);
  });
  return str;
}

// Pluralización simple es/en para "N opportunity/opportunities found".
function pluralOpportunities(count, lang) {
  const key = count === 1 ? "opp.resultsCount.one" : "opp.resultsCount.other";
  return tf(key, lang, { count });
}

// ------------------------------------------------------------
// Helpers para contenido dinámico de la tabla "Oportunidades"
// ------------------------------------------------------------

// Devuelve el campo correcto de una fila de Oportunidades según el
// idioma activo. Sirve tanto para texto (title, description) como
// para jsonb (reasons, requirements, benefits).
// Ej: localizeField(opp, "title", "es") -> opp.title_es || opp.title
function localizeField(row, field, lang) {
  if (!row) return "";
  if (lang === "es") {
    const esValue = row[`${field}_es`];
    if (esValue !== undefined && esValue !== null && esValue !== "") return esValue;
    return row[field] ?? "";
  }
  return row[field] ?? "";
}

// Traduce un valor "enum" (category, format, difficulty_level)
// usando ENUM_I18N_KEYS + DICTIONARY. Si no encuentra mapeo,
// devuelve el valor original tal cual (fallback seguro).
function localizeEnum(value, field, lang) {
  const key = ENUM_I18N_KEYS[field]?.[value];
  const dict = DICTIONARY[lang] || DICTIONARY.es;
  return key && dict[key] ? dict[key] : value;
}

// Traduce el nombre de un país usando COUNTRY_NAMES. Si no está
// mapeado, devuelve el valor original tal cual.
function localizeCountry(countryValue, lang) {
  const entry = COUNTRY_NAMES[countryValue];
  if (!entry) return countryValue;
  return entry[lang] || countryValue;
}

// 1) Traduce apenas el DOM está listo, usando el idioma cacheado
//    (o "es" por defecto) para que no haya flash de idioma incorrecto.
const cachedLang = localStorage.getItem(LANG_CACHE_KEY) || "es";
document.addEventListener("DOMContentLoaded", () => translateNode(cachedLang));

// 2) Si hay usuario logueado, confirma/corrige el idioma contra
//    lo que está guardado en Supabase (por si cambió desde otro
//    dispositivo).
async function syncLanguageFromSupabase() {
  try {
    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData?.user) return;

    const { data: usuario, error } = await supabaseClient
      .from("Usuarios")
      .select("language")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (error || !usuario?.language) return;

    if (usuario.language !== cachedLang) {
      applyLanguage(usuario.language);
    }
  } catch (e) {
    console.error("Error sincronizando idioma:", e);
  }
}

syncLanguageFromSupabase();