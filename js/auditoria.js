/* ============================================================
   AUDITORÍA — Diagnóstico, Checklist, Score
   ============================================================ */

const CHECKLIST_ITEMS = [
  {
    id:     'mp',
    title:  'Mercado Pago conectado',
    sub:    'Procesá pagos online con tarjeta, transferencia y más',
    goto:   'pagos',
    stateCheck: () => !!(APP_STATE.pagos.mp_access_token && APP_STATE.pagos.mp_public_key)
  },
  {
    id:     'carrito',
    title:  'Carrito abandonado activo',
    sub:    'Recuperá hasta un 25% de ventas perdidas automáticamente',
    goto:   'carrito',
    stateCheck: () => APP_STATE.carrito.reminders.some(r => r.active)
  },
  {
    id:     'bot',
    title:  'Bot de respuestas configurado',
    sub:    'Respondé consultas 24/7 en Instagram y WhatsApp',
    goto:   'ventas',
    stateCheck: () => !!(APP_STATE.bot.channels.instagram || APP_STATE.bot.channels.whatsapp)
  },
  {
    id:     'fb_pixel',
    title:  'Facebook Pixel instalado',
    sub:    'Rastreá conversiones y optimizá tus anuncios en Meta',
    goto:   'pixel',
    stateCheck: () => !!(APP_STATE.pixel.fb_pixel_id && APP_STATE.pixel.fb_active)
  },
  {
    id:     'ig_pixel',
    title:  'Instagram Pixel activo',
    sub:    'Audiencias personalizadas y lookalike para tus anuncios',
    goto:   'pixel',
    stateCheck: () => !!(APP_STATE.pixel.ig_active)
  },
  {
    id:     'audit_done',
    title:  'Auditoría completada',
    sub:    'Diagnóstico profesional de tu negocio digital',
    goto:   'auditoria',
    stateCheck: () => !!(APP_STATE.audit.biz_name && APP_STATE.audit.category)
  }
];

function initAuditoria() {
  loadAuditFromState();
  renderChecklist();
  bindAuditoriaEvents();
  updateAuditScore();
}

function loadAuditFromState() {
  const a = APP_STATE.audit;
  setVal('audit-biz-name',  a.biz_name);
  setVal('audit-category',  a.category);
  setVal('audit-ig',        a.ig_handle);
  setVal('audit-revenue',   a.revenue);
  setVal('audit-problem',   a.problem);
}

function bindAuditoriaEvents() {
  document.getElementById('btn-run-audit')?.addEventListener('click', runAudit);
}

function renderChecklist() {
  const container = document.getElementById('checklist-items');
  if (!container) return;

  container.innerHTML = CHECKLIST_ITEMS.map(item => {
    const done  = item.stateCheck();
    const iconClass = done ? 'ti-circle-check done' : 'ti-circle-x missing';
    const statusText = done ? 'Configurado' : 'Pendiente';
    return `
      <div class="checklist-item">
        <i class="ti ${iconClass} check-icon ${done ? 'done' : 'missing'}" style="font-size:22px"></i>
        <div class="check-info">
          <div class="check-title">${item.title}</div>
          <div class="check-sub">${item.sub}</div>
        </div>
        <button class="check-action" onclick="showSection('${item.goto}')">
          ${done ? '<i class="ti ti-settings"></i> Editar' : '<i class="ti ti-arrow-right"></i> Configurar'}
        </button>
      </div>
    `;
  }).join('');
}

function updateAuditScore() {
  const completed = CHECKLIST_ITEMS.filter(item => item.stateCheck()).length;
  const total     = CHECKLIST_ITEMS.length;
  const pct       = Math.round((completed / total) * 100);

  // Progress bar
  const bar = document.getElementById('audit-progress');
  if (bar) bar.style.width = pct + '%';

  const label = document.getElementById('audit-progress-label');
  if (label) label.textContent = `${completed} de ${total} módulos configurados`;

  // SVG arc score
  const arc = document.getElementById('audit-score-arc');
  const num = document.getElementById('audit-score-num');
  if (arc) {
    const circumference = 2 * Math.PI * 34; // 213.6
    const offset = circumference - (pct / 100) * circumference;
    arc.style.strokeDashoffset = offset;
    arc.style.stroke = pct >= 80 ? '#1D9E75' : pct >= 50 ? '#BA7517' : '#e94560';
  }
  if (num) num.textContent = pct + '%';
}

async function runAudit() {
  const name     = document.getElementById('audit-biz-name')?.value?.trim();
  const category = document.getElementById('audit-category')?.value;
  const ig       = document.getElementById('audit-ig')?.value?.trim();
  const revenue  = document.getElementById('audit-revenue')?.value;
  const problem  = document.getElementById('audit-problem')?.value?.trim();

  if (!name) { showToast('Ingresá el nombre del negocio', 'error'); return; }
  if (!category) { showToast('Seleccioná el rubro', 'error'); return; }

  const btn = document.getElementById('btn-run-audit');
  const orig = btn.innerHTML;
  btn.innerHTML = '<i class="ti ti-loader"></i> Analizando...';
  btn.disabled = true;

  // Save to state
  APP_STATE.audit = { biz_name: name, category, ig_handle: ig, revenue, problem };
  saveState();

  await new Promise(r => setTimeout(r, 1500));

  const result = generateAuditReport(name, category, revenue, problem);
  displayAuditResult(result);
  renderChecklist();
  updateAuditScore();

  btn.innerHTML = orig;
  btn.disabled = false;
  showToast('✓ Auditoría completada', 'success');

  document.getElementById('audit-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function generateAuditReport(name, category, revenue, problem) {
  const active   = CHECKLIST_ITEMS.filter(i => i.stateCheck()).map(i => i.title);
  const missing  = CHECKLIST_ITEMS.filter(i => !i.stateCheck()).map(i => i.title);
  const score    = Math.round((active.length / CHECKLIST_ITEMS.length) * 100);

  const revenueLabels = { low: 'menos de $100k', mid: '$100k — $500k', high: '$500k — $2M', top: 'más de $2M' };
  const level = revenueLabels[revenue] || 'no especificado';

  const recommendations = [];
  if (!APP_STATE.pagos.mp_access_token)  recommendations.push('Conectar Mercado Pago para aceptar pagos online — potencial +35% conversiones');
  if (!APP_STATE.pixel.fb_active)        recommendations.push('Instalar Facebook Pixel — reduce costo por adquisición hasta un 40%');
  if (!APP_STATE.carrito.reminders[0].active) recommendations.push('Activar recuperación de carrito — puede generar un 15-25% de ingresos extra');
  if (!APP_STATE.bot.channels.instagram) recommendations.push('Activar bot de Instagram — las respuestas en menos de 1min x3 conversiones');
  if (!APP_STATE.pixel.ig_active)        recommendations.push('Activar Instagram Pixel — audiencias lookalike para reducir CAC');

  const growthPotential = score < 50 ? 'Alto (200-400%)' : score < 75 ? 'Medio (80-150%)' : 'Optimización (30-60%)';
  const urgency = missing.length > 3 ? 'Alta' : missing.length > 1 ? 'Media' : 'Baja';

  return { name, category, level, score, active, missing, recommendations, growthPotential, urgency, problem };
}

function displayAuditResult(r) {
  const container = document.getElementById('audit-result');
  const content   = document.getElementById('audit-result-content');
  if (!container || !content) return;

  const scoreColor = r.score >= 80 ? 'var(--color-green)' : r.score >= 50 ? 'var(--color-amber)' : 'var(--color-red)';

  content.innerHTML = `
    <div class="result-section">
      <div class="result-title" style="color:${scoreColor}">
        <i class="ti ti-trophy"></i> Diagnóstico de ${r.name} — ${r.category}
      </div>
      <div class="result-score-grid">
        <div class="result-score-item">
          <div class="result-score-value" style="color:${scoreColor}">${r.score}%</div>
          <div class="result-score-label">Score general</div>
        </div>
        <div class="result-score-item">
          <div class="result-score-value" style="color:var(--color-green)">${r.active.length}</div>
          <div class="result-score-label">Módulos activos</div>
        </div>
        <div class="result-score-item">
          <div class="result-score-value" style="color:var(--color-red)">${r.missing.length}</div>
          <div class="result-score-label">Módulos faltantes</div>
        </div>
        <div class="result-score-item">
          <div class="result-score-value" style="color:var(--color-amber)">${r.urgency}</div>
          <div class="result-score-label">Urgencia</div>
        </div>
      </div>
    </div>

    ${r.problem ? `
    <div class="result-section">
      <div class="result-title"><i class="ti ti-search"></i> Análisis del problema</div>
      <div style="font-size:13px;color:var(--color-text-2);line-height:1.6;background:var(--color-bg-3);padding:12px;border-radius:var(--radius-md);border:1px solid var(--color-border)">
        <strong>Problema reportado:</strong> "${r.problem}"<br><br>
        ${generateProblemAnalysis(r.problem, r.score)}
      </div>
    </div>` : ''}

    ${r.active.length > 0 ? `
    <div class="result-section">
      <div class="result-title" style="color:var(--color-green)"><i class="ti ti-circle-check"></i> Lo que ya tenés bien</div>
      <ul class="result-list">
        ${r.active.map(a => `<li>${a}</li>`).join('')}
      </ul>
    </div>` : ''}

    ${r.recommendations.length > 0 ? `
    <div class="result-section">
      <div class="result-title" style="color:var(--color-amber)"><i class="ti ti-bulb"></i> Oportunidades de mejora</div>
      <ul class="result-list">
        ${r.recommendations.map(rec => `<li>${rec}</li>`).join('')}
      </ul>
    </div>` : ''}

    <div class="result-section">
      <div class="result-title"><i class="ti ti-rocket"></i> Potencial de crecimiento</div>
      <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
        <div style="font-size:24px;font-weight:900;font-family:'Barlow Condensed',sans-serif;color:var(--color-primary)">${r.growthPotential}</div>
        <div style="font-size:13px;color:var(--color-text-2);line-height:1.5;flex:1">
          Con las mejoras recomendadas, estimamos que ${r.name} puede incrementar sus ventas en el rango indicado en los próximos 90 días.
          Las ventas actuales rondan <strong>${r.level}</strong>.
        </div>
      </div>
    </div>

    <div style="text-align:center;margin-top:1rem">
      <button class="btn-primary" onclick="showSection('pagos')" style="margin:4px">
        <i class="ti ti-credit-card"></i> Configurar pagos
      </button>
      <button class="btn-primary" onclick="showSection('pixel')" style="margin:4px;background:var(--color-blue)">
        <i class="ti ti-brand-meta"></i> Instalar Pixel
      </button>
      <button class="btn-primary" onclick="showSection('carrito')" style="margin:4px;background:var(--color-amber)">
        <i class="ti ti-shopping-cart"></i> Activar carrito
      </button>
    </div>
  `;

  container.style.display = 'block';
}

function generateProblemAnalysis(problem, score) {
  const p = problem.toLowerCase();
  if (p.includes('seguidores') && (p.includes('ventas') || p.includes('comprar'))) {
    return 'Este es el problema más común: <strong>el tráfico llega pero no convierte</strong>. Tus seguidores te conocen pero no tienen un <em>camino claro hacia la compra</em>. Solución: activar el sistema de auto-ventas con bot que guíe hacia el checkout, instalar Pixel para retargeting, y configurar Checkout Pro para reducir fricción en el pago.';
  }
  if (p.includes('carrito') || p.includes('abandonan') || p.includes('no terminan')) {
    return 'Hay <strong>intención de compra pero abandono en el proceso de pago</strong>. Esto se soluciona con: recuperación automática de carrito (puede recuperar 15-25% de esos), optimizar el checkout para que sea más simple, y ofrecer cuotas sin interés.';
  }
  if (p.includes('anuncios') || p.includes('ads') || p.includes('publicidad')) {
    return 'Sin Pixel instalado, <strong>estás pagando anuncios sin datos de conversión</strong>. Esto hace que el algoritmo de Meta no pueda optimizar hacia compras reales. Instalar el Pixel y configurar las audiencias personalizadas puede reducir tu CPM un 30-50%.';
  }
  return score < 50
    ? 'Tu sistema de ventas tiene <strong>oportunidades críticas de mejora</strong>. Priorizá configurar los módulos faltantes en el orden del checklist para ver resultados en las próximas semanas.'
    : 'Tu sistema tiene una <strong>base sólida</strong>. Las mejoras recomendadas son de optimización y pueden generar incrementos significativos en la conversión.';
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el !== null && val !== undefined) el.value = val;
}
