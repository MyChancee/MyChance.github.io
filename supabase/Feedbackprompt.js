/*
  FeedbackPrompt.js
  -----------------
  Se carga como <script> normal (NO type="module"), después de base.js.
  Muestra una notificación flotante a usuarios logueados pidiendo su opinión,
  y la guarda en la tabla `testimonios` de Supabase (la misma que usa Features.js
  para las burbujas de la landing).

  Debe cargarse así, en este orden, en la página donde quieras que aparezca:
  <script src="../supabase/base.js"></script>
  <script src="../supabase/FeedbackPrompt.js"></script>

  CAMBIOS respecto a la versión anterior:
    1. El estado de "ya envió feedback" / "lo cerró, no molestar por X días" ya
       NO se guarda en localStorage (eso es por navegador, no por usuario:
       si dos cuentas distintas usan la misma computadora, la segunda cuenta
       heredaba el estado de la primera). Ahora se guarda en la tabla `Usuarios`,
       así el comportamiento es consistente sin importar el dispositivo.
    2. El nombre que se guarda en `testimonios` ya no cae al email del usuario
       si no tiene full_name (eso exponía correos reales en la landing pública).
       Ahora cae a "MyChance User".
    3. NUEVO: filtro básico de palabras inapropiadas antes de enviar el
       comentario. No es infalible (ver nota de seguridad al final), pero
       evita que groserías obvias lleguen a la tabla pública de testimonios.

  Requisitos en Supabase:
    1. Tabla `testimonios` con columnas: id (uuid, PK), nombre (text), comentario (text), created_at (timestamp).
    2. RLS habilitado con una policy que permita INSERT a usuarios autenticados
       y SELECT público. Ejemplo de SQL al final de este archivo (como comentario).
    3. En la tabla `Usuarios`, dos columnas nuevas:
         feedback_submitted boolean default false
         feedback_dismissed_until timestamptz null
       (SQL de migración al final de este archivo).
*/

const TESTIMONIOS_TABLE = 'testimonios';
const USERS_TABLE = 'Usuarios';

const SHOW_AFTER_MS = 300000; // cuánto espera antes de mostrar la notificación
const DISMISS_DAYS = 30;     // si la cierran sin comentar, no volver a molestar por X días

// --- Filtro de palabras inapropiadas ---
// Lista básica; agrégale las variantes/palabras que quieras cubrir.
// Están en minúsculas y sin tildes porque normalizamos el texto antes de comparar.
const BAD_WORDS = [
  'mierda', 'puto', 'puta', 'pendejo', 'idiota', 'estupido',
  'imbecil', 'cabron', 'verga', 'chinga', "maldito" , "xuxa" , "pinga" , "Xuxa" , "Pinga" , "hijo de puta" ,
  // inglés, por si algún usuario escribe en inglés
  'fuck', 'shit', 'bitch', 'asshole', 'bastard'
];

function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // quita tildes
}

function containsBadWords(text) {
  const normalized = normalizeText(text);
  return BAD_WORDS.some((word) => {
    // \b para que no marque falsos positivos por ser substring de otra palabra
    const pattern = new RegExp(`\\b${word}\\b`, 'i');
    return pattern.test(normalized);
  });
}

// Busca el cliente ya creado en base.js bajo los nombres más comunes.
function getSupabaseClient() {
  if (typeof supabaseClient !== 'undefined' && supabaseClient) return supabaseClient;
  if (window.supabaseClient) return window.supabaseClient;
  if (window.sb) return window.sb;
  if (window.client) return window.client;
  if (typeof supabase !== 'undefined' && supabase && typeof supabase.from === 'function') return supabase;
  if (window.supabase && typeof window.supabase.from === 'function') return window.supabase;
  console.warn('FeedbackPrompt.js: no encontré el cliente de Supabase (revisa el nombre de la variable en base.js).');
  return null;
}

function buildToast() {
  const toast = document.createElement('div');
  toast.className = 'feedback-toast';
  toast.innerHTML = `
    <button class="close-btn" aria-label="Close">&times;</button>
    <h4>How has your experience with MyChance been?</h4>
    <textarea placeholder="Tell us briefly what MyChance has helped you achieve..." maxlength="400"></textarea>
    <div class="feedback-actions">
      <button class="feedback-skip" type="button">Not now</button>
      <button class="feedback-submit" type="button">Submit</button>
    </div>
  `;
  document.body.appendChild(toast);
  return toast;
}

function dismissToast(toast) {
  toast.classList.remove('visible');
  setTimeout(() => toast.remove(), 400);
}

async function markDismissed(supabaseClient, userId) {
  const dismissedUntil = new Date(Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabaseClient
    .from(USERS_TABLE)
    .update({ feedback_dismissed_until: dismissedUntil })
    .eq('id', userId);

  if (error) {
    console.error('[FeedbackPrompt] No se pudo guardar el dismiss:', error);
  }
}

async function handleSubmit(toast, supabaseClient, userId, nombre) {
  const textarea = toast.querySelector('textarea');
  const submitBtn = toast.querySelector('.feedback-submit');
  const comentario = textarea.value.trim();

  if (!comentario) {
    textarea.focus();
    return;
  }

  // Bloqueamos el envío si el comentario contiene lenguaje inapropiado.
  if (containsBadWords(comentario)) {
    textarea.focus();
    alert('Please keep your feedback respectful and try again.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending...';

  const { error: insertError } = await supabaseClient
    .from(TESTIMONIOS_TABLE)
    .insert([{ nombre, comentario }]);

  if (insertError) {
    console.error('Error saving testimonial:', insertError);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit';
    alert('We could not send your comment, please try again in a moment.');
    return;
  }

  const { error: updateError } = await supabaseClient
    .from(USERS_TABLE)
    .update({ feedback_submitted: true })
    .eq('id', userId);

  if (updateError) {
    // El testimonio ya se guardó; esto solo controla si le volvemos a preguntar,
    // así que no bloqueamos el mensaje de gracias por esto.
    console.error('Error updating feedback_submitted flag:', updateError);
  }

  toast.innerHTML = `<div class="feedback-thanks">Thanks for your feedback! 💜</div>`;
  setTimeout(() => dismissToast(toast), 2200);
}

async function initFeedbackPrompt() {
  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) {
    console.log('[FeedbackPrompt] No se muestra: no encontré el cliente de Supabase.');
    return;
  }

  const { data: authData, error: authError } = await supabaseClient.auth.getUser();
  if (authError || !authData?.user) {
    console.log('[FeedbackPrompt] No se muestra: no hay sesión activa.');
    return;
  }

  const user = authData.user;

  const { data: usuario, error: usuarioError } = await supabaseClient
    .from(USERS_TABLE)
    .select('full_name, feedback_submitted, feedback_dismissed_until')
    .eq('id', user.id)
    .maybeSingle();

  if (usuarioError) {
    console.log('[FeedbackPrompt] No se muestra: error al leer estado de feedback ->', usuarioError);
    return;
  }

  if (usuario?.feedback_submitted) {
    console.log('[FeedbackPrompt] No se muestra: este usuario ya envió feedback.');
    return;
  }

  if (usuario?.feedback_dismissed_until && Date.now() < new Date(usuario.feedback_dismissed_until).getTime()) {
    console.log('[FeedbackPrompt] No se muestra: este usuario lo cerró recientemente.');
    return;
  }

  console.log('[FeedbackPrompt] Usuario detectado, se mostrará en ' + (SHOW_AFTER_MS / 1000) + 's.');

  // Nunca usamos el email como nombre público: si no hay full_name, usamos un
  // nombre genérico en vez de exponer el correo del usuario en la landing.
  const nombre = usuario?.full_name || 'MyChance User';

  setTimeout(() => {
    const toast = buildToast();
    requestAnimationFrame(() => toast.classList.add('visible'));

    toast.querySelector('.close-btn').addEventListener('click', () => {
      markDismissed(supabaseClient, user.id);
      dismissToast(toast);
    });

    toast.querySelector('.feedback-skip').addEventListener('click', () => {
      markDismissed(supabaseClient, user.id);
      dismissToast(toast);
    });

    toast.querySelector('.feedback-submit').addEventListener('click', () => {
      handleSubmit(toast, supabaseClient, user.id, nombre);
    });
  }, SHOW_AFTER_MS);
}

document.addEventListener('DOMContentLoaded', initFeedbackPrompt);

/*
  SQL para crear la tabla de testimonios (ejecutar en el SQL Editor):

  create table testimonios (
    id uuid primary key default gen_random_uuid(),
    nombre text not null,
    comentario text not null,
    created_at timestamp with time zone default now()
  );

  alter table testimonios enable row level security;

  create policy "Lectura pública de testimonios"
    on testimonios for select
    using (true);

  create policy "Usuarios logueados pueden insertar su testimonio"
    on testimonios for insert
    with check (auth.uid() is not null);

  ------------------------------------------------------------------
  SQL de migración para el tracking por usuario (ejecutar una vez):

  alter table "Usuarios"
    add column if not exists feedback_submitted boolean not null default false,
    add column if not exists feedback_dismissed_until timestamptz;

  -- Los usuarios deben poder actualizar SU PROPIA fila para que
  -- markDismissed() y handleSubmit() funcionen:
  create policy "Usuarios pueden actualizar su propia fila"
    on "Usuarios" for update
    using (auth.uid() = id)
    with check (auth.uid() = id);
*/
