/* ============================================================
   AUTH — Login, registro, sesión y guard de ruta
   ============================================================ */

// ── Guard de ruta ─────────────────────────────────────────────
// Llamar al inicio de index.html: si no hay sesión → login.html
async function authGuard() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  return session;
}

// ── Inicializar sesión y cargar store_id ──────────────────────
async function initAuth() {
  const session = await authGuard();
  if (!session) return;

  const user = session.user;

  // Buscar o crear la tienda del usuario
  let { data: store, error } = await sb
    .from('stores')
    .select('id, store_name')
    .eq('user_id', user.id)
    .single();

  if (error || !store) {
    // Primera vez: crear store vacía
    const { data: newStore, error: createErr } = await sb
      .from('stores')
      .insert({ user_id: user.id, store_name: 'Mi Tienda' })
      .select('id, store_name')
      .single();

    if (createErr) {
      console.error('Error creando tienda:', createErr);
      return;
    }
    store = newStore;

    // Crear config vacía para la tienda
    await sb.from('config').insert({
      store_id: store.id,
      pagos:    {},
      carrito:  {},
      bot:      {},
      pixel:    {},
      email:    {},
      notifs:   {}
    });
  }

  setStoreId(store.id);
  console.log('✓ Auth OK — store:', store.id, store.store_name);

  // Mostrar email del usuario en la UI si existe el elemento
  const userEmailEl = document.getElementById('user-email');
  if (userEmailEl) userEmailEl.textContent = user.email;

  return store;
}

// ── Login con email/password ──────────────────────────────────
async function loginWithEmail(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// ── Registro ──────────────────────────────────────────────────
async function signUpWithEmail(email, password) {
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

// ── Login con Google OAuth ────────────────────────────────────
async function loginWithGoogle() {
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + '/login.html' }
  });
  if (error) throw error;
}

// ── Logout ────────────────────────────────────────────────────
async function logout() {
  await sb.auth.signOut();
  window.location.href = 'login.html';
}

// ── Escuchar cambios de auth ──────────────────────────────────
sb.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    window.location.href = 'login.html';
  }
});
