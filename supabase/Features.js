/*
  Features.js
  -----------
  Este script se carga como <script> normal (NO type="module"), igual que
  tus otros scripts (base.js, signup.js). Se asume que el cliente de Supabase
  ya fue creado antes de este script (en base.js) con supabase.createClient(...)
  y quedó guardado en una variable llamada `supabaseClient` (o en window.supabaseClient).

  Debe cargarse DESPUÉS de base.js en el HTML:
  <script src="../supabase/base.js"></script>
  <script src="../supabase/Features.js"></script>

  CAMBIO respecto a la versión anterior:
    El contador de usuarios ya NO hace un select('*', {count:'exact', head:true})
    directo sobre la tabla `Usuarios`. Si esa tabla tiene RLS con una policy tipo
    "auth.uid() = id" (cada quien ve solo su propia fila), ese count siempre
    devolvía 1 (o 0 si no había sesión) en vez del total real de usuarios.
    Ahora se usa una función RPC (get_user_count) que corre con permisos de
    definer y devuelve el conteo real, sin necesidad de abrir toda la tabla
    Usuarios a lectura pública.

    SQL necesario en Supabase (ejecutar una sola vez en el SQL Editor):

      create or replace function public.get_user_count()
      returns bigint
      language sql
      security definer
      as $$
        select count(*) from "Usuarios";
      $$;

  Requisitos en Supabase (sin cambios):
   - USERS_TABLE: tabla que representa usuarios registrados (ej: "profiles" o "usuarios").
   - TESTIMONIOS_TABLE: tabla nueva que debes crear en Supabase con columnas:
       id (uuid/serial), nombre (text), comentario (text), created_at (timestamp)
   - OFFER_ITEMS: nombres de archivo de tus imágenes reales (interships.png, courses.png, etc.)
*/

const TESTIMONIOS_TABLE = 'testimonios'; // TODO: crear esta tabla en Supabase

// Datos de respaldo: se usan SOLO si no se encuentra el cliente de Supabase o falla la consulta.
const FALLBACK_USER_COUNT = 0;
const FALLBACK_TESTIMONIOS = [
  { nombre: 'Usuario 1', comentario: 'Gracias a MyChance encontré una beca que cambió mi carrera.' },
  { nombre: 'Usuario 2', comentario: 'Aquí encontré mi primera pasantía y aprendí muchísimo.' },
  { nombre: 'Usuario 3', comentario: 'El proceso de buscar becas siempre me pareció complicado, hasta que usé MyChance.' },
];

// Busca el cliente ya creado bajo los nombres más comunes, sin necesidad de import/export.
function getSupabaseClient() {
  if (typeof supabaseClient !== 'undefined' && supabaseClient) return supabaseClient; // variable global de base.js
  if (window.supabaseClient) return window.supabaseClient;
  if (window.sb) return window.sb;
  if (window.client) return window.client;
  // Patrón común: const supabase = window.supabase.createClient(...) sobrescribe
  // la librería con el cliente. Si "supabase" tiene .from(), es el cliente, no la librería.
  if (typeof supabase !== 'undefined' && supabase && typeof supabase.from === 'function') return supabase;
  if (window.supabase && typeof window.supabase.from === 'function') return window.supabase;

  console.warn('Features.js: no encontré el cliente de Supabase. Diagnóstico ->', {
    'typeof supabaseClient': typeof supabaseClient,
    'typeof window.supabase': typeof window.supabase,
    'window.supabase tiene .createClient?': !!(window.supabase && window.supabase.createClient),
    'window.supabase tiene .from?': !!(window.supabase && window.supabase.from),
  });
  console.warn('Features.js: usando datos de respaldo mientras se resuelve esto.');
  return null;
}

/* =============== Utilidades =============== */
function animateCount(el, target, duration = 1500) {
  const start = performance.now();
  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    el.textContent = Math.floor(progress * target);
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target;
  }
  requestAnimationFrame(step);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* =============== Sección 1: contador real + testimonios reales =============== */
async function loadUserCount(supabaseClient) {
  if (!supabaseClient) return FALLBACK_USER_COUNT;

  const { data, error } = await supabaseClient.rpc('get_user_count');

  if (error) {
    console.error('Error obteniendo cantidad de usuarios:', error);
    return FALLBACK_USER_COUNT;
  }
  return data ?? 0;
}

async function loadTestimonios(supabaseClient) {
  if (!supabaseClient) return FALLBACK_TESTIMONIOS;

  const { data, error } = await supabaseClient
    .from(TESTIMONIOS_TABLE)
    .select('nombre, comentario');

  if (error) {
    console.error('Error obteniendo testimonios:', error);
    return FALLBACK_TESTIMONIOS;
  }
  return (data && data.length) ? data : FALLBACK_TESTIMONIOS;
}

function initTestimonials(list) {
  const track = document.getElementById('testimonialTrack');
  const overlay = document.getElementById('commentOverlay');
  const modalName = document.getElementById('modalName');
  const modalText = document.getElementById('modalText');
  const closeBtn = document.getElementById('closeModal');

  if (!list.length) return;

  const MAX_CONCURRENT_BUBBLES = 3; // sube o baja este número para más/menos saturación
  let activeBubbles = 0;

  const trackHeight = track.clientHeight;
  // Un carril por burbuja posible, así cada una tiene su propio espacio vertical
  // y nunca se superponen entre sí, aunque aparezcan casi al mismo tiempo.
  const laneCount = MAX_CONCURRENT_BUBBLES;
  const laneHeight = trackHeight / laneCount;
  const laneOccupied = new Array(laneCount).fill(false);

  let order = shuffle(list);
  let idx = 0;

  function trySpawnBubble() {
    if (activeBubbles >= MAX_CONCURRENT_BUBBLES) return; // pantalla llena, espera al próximo intento

    const freeLanes = [];
    laneOccupied.forEach((occupied, i) => { if (!occupied) freeLanes.push(i); });
    if (freeLanes.length === 0) return;

    const lane = freeLanes[Math.floor(Math.random() * freeLanes.length)];
    laneOccupied[lane] = true;

    const item = order[idx % order.length];
    idx++;
    activeBubbles++;

    const bubble = document.createElement('div');
    bubble.className = 'bubble ' + (Math.random() < 0.5 ? 'glass' : 'solid');
    bubble.textContent = `${item.nombre}: "${item.comentario}"`;

    // centra la burbuja dentro de su carril, con margen arriba/abajo
    bubble.style.top = (lane * laneHeight + laneHeight * 0.15) + 'px';

    const duration = 24 + Math.random() * 10; // 24-34s, más lento y espaciado
    bubble.style.animationDuration = duration + 's';

    bubble.addEventListener('click', () => {
      bubble.classList.add('paused');
      modalName.textContent = item.nombre;
      modalText.textContent = item.comentario;
      overlay.classList.add('open');
      overlay._activeBubble = bubble;
    });

    bubble.addEventListener('animationend', () => {
      bubble.remove();
      activeBubbles--;
      laneOccupied[lane] = false;
    });

    track.appendChild(bubble);
  }

  closeBtn.addEventListener('click', () => {
    overlay.classList.remove('open');
    if (overlay._activeBubble) overlay._activeBubble.classList.remove('paused');
  });

  trySpawnBubble();
  setInterval(trySpawnBubble, 4000 + Math.random() * 2000); // intenta cada 4-6s
}

/* =============== Sección 2: qué ofrecemos =============== */
// TODO: reemplaza icon con la ruta real de cada imagen que subirás
// (../images/interships.png, ../images/courses.png, etc.)
// row/col definen la posición FINAL fija en la cuadrícula (como tu imagen de referencia);
// dir solo controla desde qué lado entra al aparecer.
const OFFER_ITEMS = [
  { label: 'internships', icon: '/interships.png', dir: 'left',  row: 2, col: 1 },
  { label: 'courses',     icon: '/courses.png',    dir: 'right', row: 1, col: 2 },
  { label: 'scholarships',icon: '/scholarships.png',dir: 'left', row: 1, col: 1 },
  { label: 'volunteers',  icon: '/volunteers.png', dir: 'right', row: 2, col: 2 },
  { label: 'competitions',  icon: '/competitions.png',                          dir: 'left', row: 3, col: 1 },
  { label: 'And more',icon: '/more.png',dir: 'right', row: 3, col: 2 },
];

function runOfferSequence() {
  const stage = document.getElementById('offerStage');
  if (!stage) return;
  stage.innerHTML = '';

  let i = 0;
  function next() {
    if (i < OFFER_ITEMS.length) {
      const data = OFFER_ITEMS[i];
      const el = document.createElement('div');
      el.className = 'offer-item ' + (data.dir === 'left' ? 'show-left' : 'show-right');
      el.style.gridRow = data.row;
      el.style.gridColumn = data.col;
      el.innerHTML = (data.icon ? `<img src="${data.icon}" alt="">` : '') + `<span>${data.label}</span>`;
      stage.appendChild(el);
      i++;
      setTimeout(next, 900);
    } else {
      const signup = document.createElement('div');
      signup.className = 'offer-item signup-btn show-right';
      signup.style.gridRow = 5;
      signup.innerHTML = `<span>Sign up</span>`;
      signup.addEventListener('click', () => { window.location.href = 'signup.html'; });
      stage.appendChild(signup);

      setTimeout(() => {
        stage.querySelectorAll('.offer-item').forEach(el => el.style.opacity = 0);
        setTimeout(runOfferSequence, 600);
      }, 4000);
    }
  }
  next();
}

/* =============== INIT =============== */
document.addEventListener('DOMContentLoaded', () => {
  // Esto no depende de Supabase, así que siempre corre.
  runOfferSequence();

  // Esto sí depende de Supabase; si no se encuentra el cliente, cae en datos
  // de respaldo y nunca bloquea el resto de la página.
  (async () => {
    const supabaseClient = getSupabaseClient();

    const counterEl = document.getElementById('userCount');
    if (counterEl) {
      const total = await loadUserCount(supabaseClient);
      animateCount(counterEl, total);
    }

    const testimonios = await loadTestimonios(supabaseClient);
    initTestimonials(testimonios);
  })();
});
