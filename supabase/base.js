// Conexión a Supabase (reutilizable en toda la app)
const SUPABASE_URL = "https://rahpvozeuzsglalafibz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhaHB2b3pldXpzZ2xhbGFmaWJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4Mzk5MzYsImV4cCI6MjA5ODQxNTkzNn0.HjB36HglBwNjsH4vZMEcI839GcoeRwGIiPjccfX9LMQ";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);