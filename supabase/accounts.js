// ============================================================
// accounts.js
// Maneja la lista de cuentas guardadas en ESTE navegador para
// poder cambiar entre ellas sin volver a loguear cada vez.
// Se guarda en localStorage (no en Supabase) porque es una
// preferencia del dispositivo, no de la cuenta.
//
// Incluir este script DESPUÉS de base.js y ANTES de login.js /
// Settings.js en cualquier página que lo necesite.
//
// Cada cuenta guardada: { id, email, full_name, avatar_url,
// access_token, refresh_token }
// ============================================================

const ACCOUNTS_KEY = "mychance_accounts";

function getSavedAccounts() {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveAccountsList(accounts) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

// Guarda o actualiza una cuenta en la lista (se llama tras cada login
// exitoso y también al cargar Settings, para mantener tokens frescos).
function upsertSavedAccount({ id, email, full_name, avatar_url, access_token, refresh_token }) {
  if (!id || !access_token || !refresh_token) return;

  const accounts = getSavedAccounts();
  const idx = accounts.findIndex(a => a.id === id);
  const entry = { id, email, full_name, avatar_url, access_token, refresh_token };

  if (idx >= 0) accounts[idx] = entry;
  else accounts.push(entry);

  saveAccountsList(accounts);
}

function removeSavedAccount(id) {
  saveAccountsList(getSavedAccounts().filter(a => a.id !== id));
}

function clearSavedAccounts() {
  localStorage.removeItem(ACCOUNTS_KEY);
}
