/* ============================================================
   APP — Inicialización principal, auth guard, router
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Verificar sesión — redirige a login.html si no hay sesión
  const store = await initAuth();

  // 2. Cargar estado desde Supabase (fallback a localStorage)
  if (store) {
    await loadStateFromSupabase();
  }

  // 3. Inicializar router de navegación
  document.querySelectorAll('.nav-btn[data-section]').forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.dataset.section;
      showSection(section);
      onSectionEnter(section);
    });
  });

  // 4. Inicializar app
  initApp();

  // 5. Conectar realtime (después de tener store_id)
  if (store) {
    initRealtime();
    retryPendingSync();
  }
});

function initApp() {
  console.log('🚀 Máquina de Ventas Profesional v2.0 iniciada');

  initDashboard();
  initPagos();
  initCarrito();
  initVentas();
  initPixel();
  initAuditoria();
  initEmail();
  initCatalogo();
  initConfiguracion();

  // Init MP SDK si hay credenciales guardadas
  const pubKey = APP_STATE.pagos.mp_public_key;
  if (pubKey && typeof MercadoPago !== 'undefined') {
    try { new MercadoPago(pubKey, { locale: 'es-AR' }); } catch {}
  }

  // Aplicar dark mode guardado
  applyDarkMode(APP_STATE.config.dark_mode);
}

function onSectionEnter(section) {
  switch (section) {
    case 'dashboard':
      updateDashboardKPIs();
      break;
    case 'auditoria':
      renderChecklist();
      updateAuditScore();
      break;
    case 'pixel':
      generateFBCode();
      updatePixelStatusBadges();
      break;
    case 'email':
      updateEmailKPIs();
      renderSubscribersList();
      break;
    case 'catalogo':
      renderProductGrid();
      break;
    case 'configuracion':
      loadConfigFromState();
      break;
    case 'ventas':
      renderBotHistory(historyFilter || 'all');
      break;
  }
}

// ── Guardar módulos con sync a Supabase ───────────────────────
// Cada módulo llama saveState(section) con su nombre de sección
// para que sync.js sepa qué tabla/columna actualizar.

// ── Exposición global de funciones usadas en HTML inline ──────

window.showSection             = showSection;
window.selectCheckout          = selectCheckout;
window.togglePassword          = togglePassword;
window.copyField               = copyField;
window.copyText                = copyText;
window.testPixelEvent          = testPixelEvent;
window.openMetaBusiness        = openMetaBusiness;
window.simulateChat            = simulateChat;
window.insertVar               = insertVar;
window.copyPixelCode           = copyPixelCode;
window.removeKeyword           = removeKeyword;
window.updateKeyword           = updateKeyword;
window.viewCartDetail          = viewCartDetail;
window.renderChecklist         = renderChecklist;
window.updateAuditScore        = updateAuditScore;
window.updatePixelStatusBadges = updatePixelStatusBadges;
window.generateFBCode          = generateFBCode;
window.removeSubscriber        = removeSubscriber;
window.previewCampaign         = previewCampaign;
window.editProduct             = editProduct;
window.duplicateProduct        = duplicateProduct;
window.deleteProduct           = deleteProduct;
window.toggleDarkMode          = toggleDarkMode;
window.showWizard              = showWizard;
window.wizardNext              = wizardNext;
window.wizardBack              = wizardBack;
window.exportConfigBackup      = exportConfigBackup;
window.showShortcutsHelp       = showShortcutsHelp;
window.logout                  = logout;
window.historyFilter           = 'all';
window.renderBotHistory        = renderBotHistory;

// Guardado automático al salir (localStorage inmediato)
window.addEventListener('beforeunload', () => {
  try { localStorage.setItem(STATE_KEY, JSON.stringify(APP_STATE)); } catch {}
});
