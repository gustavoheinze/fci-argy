const riskLevels = {
  '4': { id: 'bajo', label: 'Bajo', color: 'var(--primary)' },
  '3': { id: 'medio', label: 'Medio', color: 'var(--secondary)' },
  '2': { id: 'alto', label: 'Alto', color: 'var(--danger)' },
  '5': { id: 'alto', label: 'Alto', color: 'var(--danger)' }
};

const assetCategories = {
  'LIQUIDEZ': { label: 'LIQUIDEZ_CASH', color: '#10b981', icon: '💧' },
  'RENTA_FIJA': { label: 'RENTA_FIJA_FIXED', color: '#3b82f6', icon: '🏛️' },
  'RENTA_VARIABLE': { label: 'RENTA_VARIABLE_STOCK', color: '#8b5cf6', icon: '📈' },
  'OTROS': { label: 'OTROS_OTHER', color: '#64748b', icon: '❓' }
};

function classifyAsset(name) {
  const n = String(name || '').toUpperCase();
  if (n.includes('PZO FI') || n.includes('CTA CTE') || n.includes('CAJA DE AHORRO') || n.includes('CAUCION') || n.includes('EFECTIVO') || n.includes('AHO')) return 'LIQUIDEZ';
  if (n.includes('BONO') || n.includes('LETRA') || n.includes('LECAP') || n.includes('LEZER') || n.includes('ON ') || n.includes('TITULO') || n.includes('TZ') || n.includes('T2') || n.includes('T3')) return 'RENTA_FIJA';
  if (n.includes('ACCION') || n.includes('CEDEAR') || n.includes('GRUPO') || n.includes('PAMPA') || n.includes('YPF') || n.includes('VALE') || n.includes('ALUAR')) return 'RENTA_VARIABLE';
  return 'OTROS';
}

// Terminal Engine Logic
let allFunds = [];
let filteredFunds = [];
let currentPage = 1;
const itemsPerPage = 15;
let currentSort = { field: 'nombre', order: 'asc' };
let subscribedFunds = JSON.parse(localStorage.getItem('fci_subscribed') || '[]');
let showSubscribedOnly = false;
let comparisonList = JSON.parse(localStorage.getItem('fci_comparison') || '[]');
let walletFunds = JSON.parse(localStorage.getItem('fci_wallet') || '[]');

document.addEventListener('DOMContentLoaded', () => {
  console.log('[APP.JS LOADED] DOMContentLoaded event fired');
  initTheme();
  loadFunds();
  setupEventListeners();

  // Start status polling
  checkSystemStatus();
  setInterval(checkSystemStatus, 5000);

  // Inject Comparison Drawer
  const drawer = document.createElement('div');
  drawer.id = 'comparison-drawer';
  drawer.className = 'comparison-drawer'; // Hidden by default via CSS if empty
  document.body.appendChild(drawer);
  updateComparisonDrawer();
});

async function checkSystemStatus() {
  try {
    const res = await fetch('/sync_status.json');
    if (!res.ok) return;
    const status = await res.json();
    const statusEl = document.getElementById('system-status');

    if (statusEl) {
      if (status.progressPct >= 100) {
        statusEl.innerHTML = `● SYSTEM_READY [${status.enrichedFunds}/${status.totalFunds}]`;
        statusEl.style.color = 'var(--primary)';
      } else {
        statusEl.innerHTML = `
          <span style="display: inline-flex; align-items: center; gap: 0.5rem;">
            <span class="loader-mini" style="width: 10px; height: 10px; border-width: 1px;"></span>
            SYNCING: ${status.enrichedFunds}/${status.totalFunds} (${status.progressPct.toFixed(1)}%)
          </span>
        `;
        statusEl.style.color = 'var(--accent)';
      }
    }
  } catch (e) {
    // Silent fail if file not found yet
  }
}

async function loadFunds() {
  try {
    const response = await fetch('/api/funds');
    const data = await response.json();

    if (Array.isArray(data)) {
      allFunds = data;
      applyFilters();
      populateWalletDatalist();
    } else {
      throw new Error('API_RESPONSE_NOT_ARRAY');
    }
  } catch (error) {
    console.error('SYSTEM_ERROR:', error);
    document.getElementById('count').textContent = 'ERR: FETCH_FAILED';
    allFunds = [];
    applyFilters();
  }
}

function setupEventListeners() {
  const inputs = ['search', 'estado', 'moneda', 'horizonte', 'tipoRenta', 'riesgo'];
  inputs.forEach(id => {
    document.getElementById(id).addEventListener('input', applyFilters);
  });

  document.querySelectorAll('.sortable-header').forEach(header => {
    header.addEventListener('click', () => {
      const field = header.dataset.sort;
      currentSort.order = (currentSort.field === field && currentSort.order === 'asc') ? 'desc' : 'asc';
      currentSort.field = field;
      applyFilters();
    });
  });

  document.getElementById('prev-btn').addEventListener('click', () => goToPage(currentPage - 1));
  document.getElementById('next-btn').addEventListener('click', () => goToPage(currentPage + 1));
}

function applyFilters() {
  const search = document.getElementById('search').value.toLowerCase();
  const estado = document.getElementById('estado').value;
  const moneda = document.getElementById('moneda').value;
  const horizonte = document.getElementById('horizonte').value;
  const tipoRenta = document.getElementById('tipoRenta').value;
  const riesgo = document.getElementById('riesgo').value;

  filteredFunds = allFunds.filter(fund => {
    const f = fund.fondoPrincipal || {};
    const trId = fund.tipoRentaId || f.tipoRentaId || (f.tipoRenta ? f.tipoRenta.id : null);
    const riskData = getRiskLevel(trId);
    const r = riskData ? riskData.id : 'alto';
    const isSubscribed = subscribedFunds.includes(fund.id);

    return (
      (search === '' || fund.nombre.toLowerCase().includes(search) || (f.nombre && f.nombre.toLowerCase().includes(search))) &&
      (estado === '' || f.estado === estado) &&
      (moneda === '' || (fund.monedaId || f.monedaId) === moneda) &&
      (horizonte === '' || f.horizonteViejo === horizonte) &&
      (tipoRenta === '' || String(trId) === String(tipoRenta)) &&
      (riesgo === '' || r === riesgo) &&
      (!showSubscribedOnly || isSubscribed)
    );
  });

  filteredFunds.sort((a, b) => {
    let aV, bV;
    const fA = a.fondoPrincipal;
    const fB = b.fondoPrincipal;

    switch (currentSort.field) {
      case 'minimo':
        aV = Number(a.inversionMinima);
        bV = Number(b.inversionMinima);
        break;
      case 'id':
        aV = Number(a.id);
        bV = Number(b.id);
        break;
      case 'fid':
        aV = Number(a.fondoId);
        bV = Number(b.fondoId);
        break;
      case 'nombre':
        aV = a.nombre.toLowerCase();
        bV = b.nombre.toLowerCase();
        break;
      case 'tipo':
        aV = getTipoRenta(fA.tipoRentaId).toLowerCase();
        bV = getTipoRenta(fB.tipoRentaId).toLowerCase();
        break;
      case 'riesgo':
        const rMap = { 'bajo': 1, 'medio': 2, 'alto': 3 };
        aV = rMap[getRiskLevel(fA.tipoRentaId).id] || 0;
        bV = rMap[getRiskLevel(fB.tipoRentaId).id] || 0;
        break;
      case 'moneda':
        const mMap = { 'ARS': 1, 'USD': 2, 'EUR': 3 };
        aV = mMap[getMonedaShort(a.monedaId || fA.monedaId)] || 0;
        bV = mMap[getMonedaShort(b.monedaId || fB.monedaId)] || 0;
        break;
      case 'status':
        aV = Number(fA.estado);
        bV = Number(fB.estado);
        break;
      default:
        aV = a.nombre.toLowerCase();
        bV = b.nombre.toLowerCase();
    }
    return currentSort.order === 'asc' ? (aV > bV ? 1 : -1) : (aV < bV ? 1 : -1);
  });

  currentPage = 1;
  renderFunds();
  updateUI();
}

function renderFunds() {
  const list = document.getElementById('funds-list');
  list.innerHTML = '';

  const start = (currentPage - 1) * itemsPerPage;
  const paged = filteredFunds.slice(start, start + itemsPerPage);

  paged.forEach(fund => {
    const f = fund.fondoPrincipal || {};
    const trId = fund.tipoRentaId || f.tipoRentaId || (f.tipoRenta ? f.tipoRenta.id : null);
    const risk = getRiskLevel(trId);
    const row = document.createElement('div');
    const isSubscribed = subscribedFunds.includes(fund.id);
    row.className = 'grid-row';
    row.innerHTML = `
      <div class="mono-cell" style="display: flex; align-items: center; gap: 0.5rem;">
        <span class="sub-briefcase ${isSubscribed ? 'active' : ''}" onclick="event.stopPropagation(); toggleSubscribed('${fund.id}')" title="Marcar como fondo suscripto (tengo dinero invertido)">💼</span>
        <span class="vs-btn ${comparisonList.some(c => c.id === fund.id) ? 'active' : ''}" onclick="event.stopPropagation(); toggleComparison('${fund.id}', '${fund.nombre.replace(/'/g, "\\'")}')">VS</span>
        #${fund.id}
      </div>
      <div class="name-cell">${fund.nombre}</div>
      <div class="type-cell">${getTipoRenta(trId)}</div>
      <div class="mono-cell" style="opacity: 0.6">#${fund.fondoId}</div>
      <div class="risk-cell risk-${risk.id}">
        <span class="risk-dot"></span>
        ${risk.label.toUpperCase()}
      </div>
      <div class="mono-cell">${getMonedaShort(fund.monedaId || fund.fondoPrincipal.monedaId)}</div>
      <div class="mono-cell">$${Number(fund.inversionMinima).toLocaleString('es-AR')}</div>
      <div class="mono-cell">${fund.fondoPrincipal.estado === '1' ? '🟢 ONLINE' : '🔴 OFFLINE'}</div>
    `;
    row.onclick = () => showSidebar(fund);
    list.appendChild(row);
  });
}

function toggleSubscribed(id) {
  const index = subscribedFunds.indexOf(id);
  if (index > -1) subscribedFunds.splice(index, 1);
  else subscribedFunds.push(id);
  localStorage.setItem('fci_subscribed', JSON.stringify(subscribedFunds));
  renderFunds();
}

function toggleSubscribedFilter() {
  showSubscribedOnly = !showSubscribedOnly;
  const btn = document.getElementById('fav-filter-btn');
  if (btn) btn.classList.toggle('active', showSubscribedOnly);
  applyFilters();
}

// --- COMPARISON LOGIC ---

function toggleComparison(id, name) {
  const index = comparisonList.findIndex(c => c.id === id);
  if (index > -1) {
    comparisonList.splice(index, 1);
  } else {
    if (comparisonList.length >= 3) {
      alert('MAX_LIMIT_REACHED: Solo podés comparar hasta 3 fondos a la vez.');
      return;
    }
    comparisonList.push({ id, name });
  }
  localStorage.setItem('fci_comparison', JSON.stringify(comparisonList));
  renderFunds(); // Re-render to update VS buttons
  updateComparisonDrawer();
}

function updateComparisonDrawer() {
  const drawer = document.getElementById('comparison-drawer');
  if (!drawer) return;

  if (comparisonList.length === 0) {
    drawer.classList.remove('visible');
    drawer.innerHTML = '';
    return;
  }

  drawer.classList.add('visible');
  drawer.innerHTML = `
    <div style="display: flex; align-items: center; gap: 1rem;">
      <span style="font-weight: 700; color: var(--accent);">FCI WARS:</span>
      ${comparisonList.map(c => `
        <div class="comp-chip" onclick="toggleComparison('${c.id}', '')">
          ${c.name.substring(0, 15)}... <span style="margin-left:5px; opacity:0.5;">✕</span>
        </div>
      `).join('')}
    </div>
    <button class="nav-btn" style="background: var(--accent); border: none; font-size: 0.8rem; padding: 0.5rem 1rem;" onclick="openComparisonModal()">
      ⚔️ COMPARAR AHORA
    </button>
  `;
}

async function openComparisonModal() {
  // Simple check for now
  if (comparisonList.length < 2) {
    alert("Seleccioná al menos 2 fondos para comparar.");
    return;
  }
  // Logic to fetch details and show modal will be added next
  console.log("OPEN COMP MODAL", comparisonList);

  // Create Modal Element if not exists
  let modal = document.getElementById('comp-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'comp-modal';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="glass" style="max-width: 90vw; width: 1000px; height: 80vh; margin: 5vh auto; padding: 2rem; border: 1px solid var(--border-active); display: flex; flex-direction: column; position: relative;">
      <button onclick="document.getElementById('comp-modal').remove()" style="position: absolute; top: 1rem; right: 1rem; background: transparent; border: none; color: #fff; font-size: 1.5rem; cursor: pointer;">✕</button>
      <h2 class="section-title">⚔️ FCI WARS: HEAD_TO_HEAD</h2>
      
      <div style="display: flex; align-items: center; justify-content: center; height: 100%;">
        <div class="loader"></div>
      </div>
    </div>
  `;

  // Fetch details
  try {
    const details = await Promise.all(comparisonList.map(c => fetch(`/api/funds/${c.id}`).then(r => r.json())));

    // Render Columns
    modal.querySelector('.glass').innerHTML = `
      <button onclick="document.getElementById('comp-modal').remove()" style="position: absolute; top: 1rem; right: 1rem; background: transparent; border: none; color: #fff; font-size: 1.5rem; cursor: pointer;">✕</button>
      <h2 class="section-title" style="margin-bottom: 2rem;">⚔️ FCI WARS: HEAD_TO_HEAD</h2>
      
      <div class="comp-grid" style="display: grid; grid-template-columns: repeat(${details.length}, 1fr); gap: 1rem; overflow-y: auto; height: 100%;">
        ${details.map(fund => {
      const f = fund.fondoPrincipal || {};
      const perfYTD = fund.rendimientos?.find(r => r.periodo === 'anio')?.rendimiento || '0%';
      const risk = getRiskLevel(fund.tipoRentaId || f.tipoRentaId);
      return `
             <div class="comp-col">
               <h3 style="color: var(--primary); font-size: 1.1rem; margin-bottom: 0.5rem; height: 3rem; overflow: hidden;">${fund.nombre}</h3>
               <div style="font-family: var(--font-mono); font-size: 0.8rem; margin-bottom: 2rem; opacity: 0.6;">${f.gerente?.nombre || 'N/A'}</div>
               
               <div class="comp-stat-row">
                 <div class="lbl">AUM</div>
                 <div class="val">${new Intl.NumberFormat('es-AR', { style: 'currency', currency: fund.monedaId === '2' ? 'USD' : 'ARS', maximumFractionDigits: 0 }).format(fund.patrimonio || 0)}</div>
               </div>
               
               <div class="comp-stat-row">
                 <div class="lbl">RENDIMIENTO YTD</div>
                 <div class="val" style="color: ${parseFloat(perfYTD) > 0 ? 'var(--success)' : 'var(--text-main)'}; font-weight: 800;">${perfYTD}</div>
               </div>

                <div class="comp-stat-row">
                 <div class="lbl">LIQUIDEZ</div>
                 <div class="val">T+${f.diasLiquidacion || '?'}</div>
               </div>

                <div class="comp-stat-row">
                 <div class="lbl">RIESGO</div>
                 <div class="val risk-${risk.id}" style="text-align: right; padding: 0.2rem 0.5rem; border-radius: 4px;">${risk.label}</div>
               </div>

               <div style="margin-top: 2rem;">
                  <div class="lbl" style="margin-bottom: 0.5rem;">TOP 3 ASSETS</div>
                  ${(fund.composicion || []).slice(0, 3).map(c => `
                    <div style="display: flex; justify-content: space-between; font-size: 0.75rem; border-bottom: 1px dashed var(--border-ultra); padding: 0.3rem 0;">
                      <span>${c.activo.substring(0, 12)}</span>
                      <span>${parseFloat(c.porcentaje).toFixed(1)}%</span>
                    </div>
                  `).join('')}
               </div>

             </div>
           `;
    }).join('')}
      </div>
    `;

  } catch (e) {
    console.error(e);
    modal.querySelector('.glass').innerHTML = `<p style="color: var(--danger)">ERROR_LOADING_DATA</p>`;
  }
}

function updateUI() {
  const totalPages = Math.ceil(filteredFunds.length / itemsPerPage) || 1;
  document.getElementById('count').textContent = `${filteredFunds.length} INSTRUMENTS_LOADED`;
  document.getElementById('page-info').textContent = `PAGE ${String(currentPage).padStart(2, '0')} / ${String(totalPages).padStart(2, '0')}`;
  document.getElementById('prev-btn').disabled = currentPage === 1;
  document.getElementById('next-btn').disabled = currentPage === totalPages;

  document.querySelectorAll('.sortable-header').forEach(h => {
    h.classList.toggle('active', h.dataset.sort === currentSort.field);
  });
}

function goToPage(p) {
  currentPage = p;
  renderFunds();
  updateUI();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function showSidebar(initialFund) {
  const wrap = document.getElementById('app-wrapper');
  const panel = document.getElementById('side-panel');
  const header = document.getElementById('sidebar-header');
  const body = document.getElementById('sidebar-body');

  wrap.classList.add('sidebar-open');
  panel.classList.add('open');

  // Loading state
  header.innerHTML = `<h2>${initialFund.nombre}</h2>`;
  body.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; opacity: 0.5;">
      <div class="loader"></div>
      <p style="margin-top: 1rem; font-family: var(--font-mono); font-size: 0.8rem;">ACCESSING_SECURE_VAULT...</p>
    </div>
  `;

  let fund;
  try {
    const res = await fetch(`/api/funds/${initialFund.id}`);
    fund = await res.json();
  } catch (err) {
    console.error('FETCH_DETAIL_ERROR:', err);
    body.innerHTML = `<p style="color: var(--danger); padding: 2rem;">ERROR: FAILED_TO_FETCH_DETAILS</p>`;
    return;
  }

  const f = fund.fondoPrincipal || {};
  const trId = fund.tipoRentaId || f.tipoRentaId || (f.tipoRenta ? f.tipoRenta.id : null);
  const risk = getRiskLevel(trId);
  const currencySymbol = fund.monedaId === '2' ? 'USD' : 'ARS';

  // HEADER: Name, Risk, and Main Stats
  header.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
      <h2 style="font-size: 1.6rem; font-weight: 800; letter-spacing: -0.02em;">${fund.nombre}</h2>
    </div>
    <div style="display: flex; gap: 1rem; align-items: center;">
      <div class="risk-cell risk-${risk.id}" style="font-size: 0.7rem; background: rgba(255,255,255,0.03); padding: 0.2rem 0.6rem; border-radius: 4px; border: 1px solid var(--border-ultra);">
        <span class="risk-dot"></span>
        ${risk.label.toUpperCase()} RISK
      </div>
      <div class="mono-cell" style="font-size: 0.7rem; opacity: 0.6;">[UID: ${fund.id}]</div>
    </div>
  `;

  window.currentFundForPDF = fund;

  // Performance Tooltips
  const perfTooltips = {
    '1d': 'Rendimiento último día hábil',
    '30d': 'Rendimiento últimos 30 días',
    'anio': 'Rendimiento acumulado anual (YTD)',
    '1a': 'Rendimiento últimos 12 meses',
    '3a': 'Rendimiento últimos 3 años',
    '5a': 'Rendimiento últimos 5 años'
  };

  // Build Sections

  // AUM / PATRIMONIO SECTION
  const formattedAum = fund.patrimonio ?
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: currencySymbol, maximumFractionDigits: 0 }).format(fund.patrimonio) :
    'S/D';

  const aumHtml = `
    <div class="aum-card">
      <div class="detail-label">VALORES_ADMINISTRADOS (AUM)</div>
      <div class="aum-value">${formattedAum}</div>
      <div style="font-size: 0.6rem; opacity: 0.4; margin-top: 0.5rem; font-family: var(--font-mono);">SYNC_DATE: ${fund.fechaDatos || 'N/A'}</div>
    </div>
  `;

  const objectiveHtml = `
    <div class="detail-section">
      <span class="detail-label">ESTRATEGIA_Y_OBJETIVO</span>
      <div class="objective-box" style="font-size: 0.95rem; line-height: 1.5; border-left: 2px solid var(--primary);">
        ${f.objetivo || 'Sin descripción disponible del gestor.'}
      </div>
    </div>
  `;

  const perfHtml = `
    <div class="detail-section">
      <span class="detail-label">RENDIMIENTO_HISTORICO</span>
      <div class="performance-grid">
        ${(fund.rendimientos && fund.rendimientos.length > 0) ? fund.rendimientos.map(r => `
          <div class="perf-item" data-tooltip="${perfTooltips[r.periodo.toLowerCase()] || ''}">
            <span class="perf-period">${r.periodo.toUpperCase()}</span>
            <span class="perf-value ${parseFloat(r.rendimiento) >= 0 ? 'pos' : 'neg'}">${r.rendimiento}</span>
            ${r.tna ? `<span class="perf-tna">TNA: ${r.tna}%</span>` : ''}
          </div>
        `).join('') : '<div style="grid-column: 1/-1; opacity: 0.5; font-size: 0.8rem; text-align: center; padding: 1rem; border: 1px dashed var(--border-ultra);">SIN_DATOS_DE_RENDIMIENTO</div>'}
      </div>
    </div>
  `;

  // Time Machine Calculator
  const tmHtml = `
    <div class="detail-section" style="background: rgba(var(--primary-rgb), 0.05); border: 1px solid rgba(var(--primary-rgb), 0.2); padding: 1rem; border-radius: 8px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <span class="detail-label" style="margin: 0; color: var(--primary);">⏳ TIME_MACHINE_SIMULATOR</span>
        <span class="info-tooltip" data-tooltip="Simula cuánto valdría tu inversión hoy si hubieras invertido en el pasado.">ⓘ</span>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
        <div>
          <label style="display: block; font-size: 0.7rem; color: var(--text-dim); margin-bottom: 0.3rem;">INVERSIÓN INICIAL ($)</label>
          <input type="number" id="tm-amount" value="1000000" style="width: 100%; background: rgba(0,0,0,0.2); border: 1px solid var(--border-ultra); color: #fff; padding: 0.5rem; border-radius: 4px; font-family: var(--font-mono);">
        </div>
        <div>
          <label style="display: block; font-size: 0.7rem; color: var(--text-dim); margin-bottom: 0.3rem;">PERÍODO HISTÓRICO</label>
          <select id="tm-period" style="width: 100%; background: rgba(0,0,0,0.2); border: 1px solid var(--border-ultra); color: #fff; padding: 0.5rem; border-radius: 4px; font-family: var(--font-mono);">
            ${(fund.rendimientos || []).map(r => `<option value="${r.rendimiento}">${r.periodo.toUpperCase()} (${r.rendimiento})</option>`).join('')}
          </select>
        </div>
      </div>

      <div style="text-align: center; border-top: 1px dashed var(--border-ultra); padding-top: 1rem;">
        <div style="font-size: 0.7rem; color: var(--text-dim); margin-bottom: 0.2rem;">HOY TENDRÍAS:</div>
        <div id="tm-result" style="font-size: 1.5rem; font-weight: 800; color: var(--primary); font-family: var(--font-mono);">---</div>
        <div id="tm-diff" style="font-size: 0.8rem; margin-top: 0.2rem;"></div>
      </div>
    </div>
  `;

  // Composition logic
  let compositionHtml = `
    <div class="detail-section">
      <span class="detail-label">COMPOSICIÓN_DE_CARTERA</span>
      <div style="opacity: 0.5; font-size: 0.8rem; text-align: center; padding: 2rem; border: 1px dashed var(--border-ultra); border-radius: 8px;">
        <div class="loader-mini" style="margin: 0 auto 1rem;"></div>
        SINCRONIZANDO_CARTERA_CAFCI...
      </div>
    </div>
  `;

  if (fund.composicion && Array.isArray(fund.composicion) && fund.composicion.length > 0) {
    const groups = {};
    let grandTotal = 0;
    fund.composicion.forEach(c => {
      const cat = classifyAsset(c.activo);
      const val = parseFloat(c.porcentaje) || 0;
      const name = c.activo.trim();
      if (!groups[cat]) groups[cat] = { items: {}, total: 0 };
      if (!groups[cat].items[name]) {
        groups[cat].items[name] = { activo: name, porcentaje: 0 };
      }
      groups[cat].items[name].porcentaje += val;
      groups[cat].total += val;
      grandTotal += val;
    });

    const order = Object.keys(groups).sort((a, b) => groups[b].total - groups[a].total);

    compositionHtml = `
      <div class="detail-section">
        <span class="detail-label">PORTFOLIO_DIVERSIFICATION</span>
        <div class="composition-container">
          ${order.map(catKey => {
      const group = groups[catKey];
      const catInfo = assetCategories[catKey];
      const sortedItems = Object.values(group.items).sort((a, b) => b.porcentaje - a.porcentaje);
      return `
              <div class="comp-category">
                <div class="comp-cat-header" style="border-left: 3px solid ${catInfo.color}">
                  <span class="cat-label">${catInfo.icon} ${catInfo.label}</span>
                  <span class="cat-total">${group.total.toFixed(2)}%</span>
                </div>
                <div class="comp-cat-body">
                  ${sortedItems.map(c => `
                    <div class="comp-item">
                      <div class="comp-info">
                        <span class="comp-name" style="font-size: 0.75rem;">${c.activo}</span>
                        <span class="comp-pct">${c.porcentaje.toFixed(2)}%</span>
                      </div>
                      <div class="comp-bar-bg">
                        <div class="comp-bar-fill" style="width: ${c.porcentaje.toFixed(2)}%; background: ${catInfo.color}"></div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `;
    }).join('')}
          <div class="comp-grand-total" style="background: rgba(16, 185, 129, 0.05); padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-active);">
             <span class="total-label" style="color: var(--primary);">TOTAL_ALLOCATION</span>
             <span class="total-value" style="color: var(--primary); font-weight: 800;">${grandTotal.toFixed(2)}%</span>
          </div>
        </div>
      </div>
    `;
  }

  const logisticsHtml = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem;">
      <div class="detail-section" style="margin-bottom: 0;">
        <span class="detail-label">SETTLEMENT (PAGOS)</span>
        <div class="detail-value" style="color: var(--accent); font-family: var(--font-mono);">
          ${f.diasLiquidacion ? 'T+' + f.diasLiquidacion : 'S/D'} ${f.diasLiquidacion == '0' ? '(INMEDIATO)' : 'HS'}
        </div>
      </div>
      <div class="detail-section" style="margin-bottom: 0;">
        <span class="detail-label">MIN_ALLOCATION</span>
        <div class="detail-value">${currencySymbol} ${Number(fund.inversionMinima || 0).toLocaleString('es-AR')}</div>
      </div>
    </div>
  `;

  const techInfoHtml = `
    <div class="detail-section" style="background: rgba(255,255,255,0.02); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border-ultra);">
      <span class="detail-label">TECHNICAL_INFO_REGISTRY</span>
      <div class="tech-id-grid" style="background: transparent; border: none; padding: 0;">
        <div class="tech-id-item"><span class="id-lbl">ISIN:</span> ${fund.isin || 'N/A'}</div>
        <div class="tech-id-item"><span class="id-lbl">CNV:</span> ${fund.cnv_code || 'N/A'}</div>
        <div class="tech-id-item"><span class="id-lbl">BBG:</span> ${fund.bloomberg || 'N/A'}</div>
        <div class="tech-id-item" style="font-size: 0.6rem; opacity: 0.6;"><span class="id-lbl">VCP:</span> ${fund.vcp || 'N/A'}</div>
      </div>
      <div style="margin-top: 1rem; font-size: 0.6rem; color: var(--text-ghost); font-family: var(--font-mono); display: flex; justify-content: space-between;">
        <span>SYNC: ${new Date(fund.lastSync).toLocaleString()}</span>
        <span>${f.gerente ? f.gerente.nombre.substring(0, 20) + '...' : ''}</span>
      </div>
    </div>
  `;

  // Final Assembler
  body.innerHTML = `
    ${aumHtml}
    ${objectiveHtml}
    ${tmHtml}
    ${perfHtml}
    ${compositionHtml}
    ${logisticsHtml}
    ${techInfoHtml}
    
    <div style="margin-top: 2rem; display: flex; justify-content: center;">
      <button onclick="downloadFundPDF(window.currentFundForPDF)" class="nav-btn" style="width: 100%; justify-content: center; padding: 1rem; border-radius: 12px; font-weight: 700;">
        📥 DESCARGAR_REPORTE_PDF
      </button>
    </div>
  `;

  // Time Machine Logic
  const tmAmount = document.getElementById('tm-amount');
  const tmPeriod = document.getElementById('tm-period');
  const tmResult = document.getElementById('tm-result');
  const tmDiff = document.getElementById('tm-diff');

  function calculateTM() {
    const amount = parseFloat(tmAmount.value) || 0;
    // Extract percentage from value (e.g., "12.5")
    const rateStr = tmPeriod.value || "0";
    const rate = parseFloat(rateStr.replace(',', '.')) || 0;
    const periodLabel = tmPeriod.options[tmPeriod.selectedIndex]?.text?.split('(')[0]?.trim() || 'PERIODO';

    const finalAmount = amount * (1 + (rate / 100));
    const profit = finalAmount - amount;

    tmResult.textContent = new Intl.NumberFormat('es-AR', { style: 'currency', currency: currencySymbol }).format(finalAmount);

    const profitFormatted = new Intl.NumberFormat('es-AR', { style: 'currency', currency: currencySymbol }).format(profit);
    const sign = profit >= 0 ? '+' : '';
    const color = profit >= 0 ? 'var(--success)' : 'var(--danger)';

    tmDiff.innerHTML = `<span style="color: ${color}; font-weight: 700;">${sign}${profitFormatted}</span> <span style="opacity: 0.6; font-size: 0.7rem;">en ${periodLabel}</span>`;
  }

  if (tmAmount && tmPeriod) {
    tmAmount.addEventListener('input', calculateTM);
    tmPeriod.addEventListener('change', calculateTM);
    calculateTM(); // Initial calc
  }
}

function closeSidebar() {
  document.getElementById('app-wrapper').classList.remove('sidebar-open');
  document.getElementById('side-panel').classList.remove('open');
}

// Management Dashboard State
let mgmtData = null;
let currentAssetRankMode = 'freq';
let allAssets = [];
let filteredAssets = [];
let assetBrowserPage = 1;
const ASSETS_PER_PAGE = 50;


let scatterChart = null;

// Explicitly assign to window to ensure global access
window.switchView = function (view) {
  const terminalView = document.getElementById('view-terminal');
  const mgmtView = document.getElementById('view-management');
  const eduView = document.getElementById('view-education');
  const walletView = document.getElementById('view-wallet');
  const analyticsView = document.getElementById('view-analytics');

  const tabTerminal = document.getElementById('tab-terminal');
  const tabMgmt = document.getElementById('tab-management');
  const tabEdu = document.getElementById('tab-education');
  const tabWallet = document.getElementById('tab-wallet');
  const tabAnalytics = document.getElementById('tab-analytics');

  // Reset all
  terminalView.classList.add('hidden');
  mgmtView.classList.add('hidden');
  eduView.classList.add('hidden');
  if (walletView) walletView.classList.add('hidden');
  if (analyticsView) analyticsView.classList.add('hidden');

  tabTerminal.classList.remove('active');
  tabMgmt.classList.remove('active');
  tabEdu.classList.remove('active');
  if (tabWallet) tabWallet.classList.remove('active');
  if (tabAnalytics) tabAnalytics.classList.remove('active');

  if (view === 'management') {
    mgmtView.classList.remove('hidden');
    tabMgmt.classList.add('active');
    loadAnalytics();
  } else if (view === 'education') {
    eduView.classList.remove('hidden');
    tabEdu.classList.add('active');
  } else if (view === 'wallet') {
    if (walletView) {
      walletView.classList.remove('hidden');
      if (tabWallet) tabWallet.classList.add('active');
      renderWallet(); // Render wallet when switching to it
    }
  } else if (view === 'analytics') {
    if (analyticsView) {
      analyticsView.classList.remove('hidden');
      if (tabAnalytics) tabAnalytics.classList.add('active');
      renderRiskReturnChart();
    }
  } else {
    terminalView.classList.remove('hidden');
    tabTerminal.classList.add('active');
  }
}

async function renderRiskReturnChart() {
  const ctx = document.getElementById('scatterChart')?.getContext('2d');
  if (!ctx) return;

  // Clear previous chart
  if (scatterChart) {
    scatterChart.destroy();
  }

  try {
    const response = await fetch('/api/scatter-plot-data');
    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      console.warn('No hay datos para el gráfico de dispersión');
      return;
    }

    // Colores y etiquetas por tipo de fondo
    const categories = {
      '4': { label: 'Money Market', color: 'rgba(34, 197, 94, 0.7)', border: '#22c55e' },
      '3': { label: 'Fixed Income', color: 'rgba(59, 130, 246, 0.7)', border: '#3b82f6' },
      '5': { label: 'Mixed', color: 'rgba(249, 115, 22, 0.7)', border: '#f97316' },
      '2': { label: 'Equity', color: 'rgba(168, 85, 247, 0.7)', border: '#a855f7' }
    };

    // Crear datasets para Chart.js
    const datasets = Object.keys(categories).map(typeId => {
      const filtered = data.filter(d => String(d.tipoRentaId) === typeId);
      return {
        label: `${categories[typeId].label} (${filtered.length} fondos)`,
        data: filtered,
        backgroundColor: categories[typeId].color,
        borderColor: categories[typeId].border,
        borderWidth: 1,
        pointRadius: 5,
        pointHoverRadius: 8,
        pointHoverBorderWidth: 2
      };
    });

    // Configuración del gráfico
    scatterChart = new Chart(ctx, {
      type: 'scatter',
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Risk-Return de Fondos de Inversión',
            color: '#fff',
            font: { size: 18, weight: 'bold' }
          },
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              color: '#ccc',
              padding: 20,
              font: { size: 12 }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            titleColor: '#fff',
            bodyColor: '#ddd',
            padding: 12,
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            callbacks: {
              label: (context) => {
                const item = context.raw;
                return [
                  `Fondo: ${item.name}`,
                  `Riesgo: ${item.riskScore}`,
                  `Retorno Esperado: ${item.expectedReturn.toFixed(2)}%`,
                  `ID: ${item.id}`
                ];
              }
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'Nivel de Riesgo (0-10)', color: '#aaa', font: { weight: 'bold' } },
            min: 0,
            max: 10,
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#888' }
          },
          y: {
            title: { display: true, text: 'Retorno Esperado (%)', color: '#aaa', font: { weight: 'bold' } },
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#888' }
          }
        }
      }
    });

  } catch (error) {
    console.error('Error al renderizar el gráfico risk-return:', error);
  }
}

async function loadAnalytics() {
  try {
    const res = await fetch('/api/analytics');
    mgmtData = await res.json();
    renderManagement();
  } catch (err) {
    console.error('Error loading analytics:', err);
  }
}

function renderManagement() {
  if (!mgmtData) return;

  // KPIs
  document.getElementById('mgmt-liquidity').textContent = `${(mgmtData.summary?.marketLiquidity || 0).toFixed(2)}%`;
  document.getElementById('mgmt-top-asset').textContent = mgmtData.topAssets?.[0]?.name || '---';
  document.getElementById('mgmt-mgr-count').textContent = mgmtData.summary?.analyzedFunds || 0;

  // Process ALL assets from the full fund list client-side
  processAllFundsAssets();


  // Market Leaders
  const leaderList = document.getElementById('market-leaders-list');
  if (leaderList && mgmtData.marketLeaders) {
    leaderList.innerHTML = mgmtData.marketLeaders.map((l, i) => `
      <div class="rank-item" onclick="showSidebar(allFunds.find(f => f.id === '${l.id}'))">
        <span class="rank-index" style="color: var(--accent);">#${i + 1}</span>
        <div class="rank-name" style="display: flex; flex-direction: column;">
          <span>${l.name}</span>
          <span style="font-size: 0.65rem; opacity: 0.6;">${l.manager}</span>
        </div>
        <span class="rank-val" style="color: var(--primary); font-family: var(--font-mono); font-size: 0.8rem;">
          ${new Intl.NumberFormat('es-AR', { style: 'currency', currency: l.currency, maximumFractionDigits: 0, notation: "compact" }).format(l.aum)}
        </span>
      </div>
    `).join('');
  }

  renderAssetRanking();
  renderManagerBenchmark();
  renderRecommendations();
  renderAssetRecommendations();
  renderInvestmentOpportunities();
  renderAssetBrowser();
}

function renderAssetRecommendations() {
  const assets = getRecommendedAssets();
  const grid = document.getElementById('asset-recommendation-grid');
  if (!grid) return;

  grid.innerHTML = assets.map(rec => `
    <div class="opportunity-card" onclick="showAssetDetails('${rec.asset.name.replace(/'/g, "\\'")}')" style="cursor: pointer; border-left: 3px solid ${rec.color || 'var(--primary)'};">
      <div style="font-size: 0.7rem; color: ${rec.color || 'var(--text-main)'}; font-weight: 700; margin-bottom: 0.5rem;">${rec.title.toUpperCase()}</div>
      <div class="opp-name" style="font-size: 0.9rem;">${rec.asset.name}</div>
      <div class="opp-stats" style="margin-top: 0.5rem;">
        <div class="opp-weight" style="font-size: 1rem;">${rec.asset.marketInfluence.toFixed(2)}%</div>
        <div class="opp-count" style="font-size: 0.6rem;">MARKET_INFLUENCE</div>
      </div>
       <div style="margin-top: 0.75rem; font-size: 0.7rem; color: var(--text-dim); line-height: 1.4; border-top: 1px solid var(--border-ultra); padding-top: 0.5rem;">
        "${rec.insight}"
      </div>
    </div>
  `).join('');
}

function getRecommendedAssets() {
  if (!allAssets || allAssets.length === 0) return [];

  const recs = [];

  // 1. The Crowd Favorite (Highest Frequency)
  const crowdFav = allAssets.sort((a, b) => b.frequency - a.frequency)[0];
  if (crowdFav) {
    recs.push({
      title: '👥 The Crowd Favorite',
      asset: crowdFav,
      color: '#f59e0b',
      insight: `El activo más popular del mercado. Presente en ${crowdFav.frequency} fondos. Un estándar de la industria.`
    });
  }

  // 2. The Heavyweight (Highest Market Influence)
  const heavyweight = allAssets.sort((a, b) => b.marketInfluence - a.marketInfluence).find(a => a.name !== crowdFav?.name);
  if (heavyweight) {
    recs.push({
      title: '🦍 The Heavyweight',
      asset: heavyweight,
      color: '#3b82f6',
      insight: `Máxima influencia de mercado. El activo con mayor presencia ponderada en carteras (${heavyweight.marketInfluence.toFixed(1)}% GEI).`
    });
  }

  // 3. The Corporate Pick (Top ON/Obligacion)
  const corp = allAssets
    .filter(a => a.name.includes('ON ') || a.name.includes('OBLIG') || a.name.includes('CLASE'))
    .sort((a, b) => b.marketInfluence - a.marketInfluence)
    .find(a => !recs.find(r => r.asset.name === a.name));

  if (corp) {
    recs.push({
      title: '🏢 Corporate Pick',
      asset: corp,
      color: '#8b5cf6',
      insight: `El bono corporativo favorito de los gestores. Deuda privada de alta demanda.`
    });
  }

  // 4. The Equity Star (Top Stock/CEDEAR)
  const equity = allAssets
    .filter(a => a.type === 'RENTA_VARIABLE' && !a.name.includes('FCI'))
    .sort((a, b) => b.totalWeight - a.totalWeight)
    .find(a => !recs.find(r => r.asset.name === a.name));

  if (equity) {
    recs.push({
      title: '🌟 The Equity Star',
      asset: equity,
      color: '#ec4899',
      insight: `La acción (o CEDEAR) con mayor convicción. La apuesta de renta variable más fuerte del mercado.`
    });
  }

  // 5. The Gov Shield (Top Bono/Letra)
  const gov = allAssets
    .filter(a => (a.name.includes('BONO') || a.name.includes('LETRA') || a.name.includes('T2') || a.name.includes('T3') || a.name.includes('TD')))
    .sort((a, b) => (b.totalWeight * 0.7 + b.frequency * 0.3) - (a.totalWeight * 0.7 + a.frequency * 0.3)) // Blended score
    .find(a => !recs.find(r => r.asset.name === a.name));

  if (gov) {
    recs.push({
      title: '🛡️ The State Shield',
      asset: gov,
      color: '#10b981',
      insight: `El título público preferido para cobertura. Un pilar esencial en las carteras de Renta Fija.`
    });
  }

  return recs;
}

function renderRecommendations() {
  const recommendations = getRecommendedFunds();
  const grid = document.getElementById('recommendation-grid');

  grid.innerHTML = recommendations.map(rec => {
    const f = rec.fund.fondoPrincipal;
    const yieldVal = rec.displayYield || (f.rendimientos?.find(r => r.periodo === '1a')?.rendimiento || 'N/A');

    return `
    <div class="opportunity-card" onclick="showSidebar(allFunds.find(x => x.id === '${rec.fund.id}'))" style="cursor: pointer;">
      <div style="font-size: 0.7rem; color: var(--accent); font-weight: 700; margin-bottom: 0.5rem;">${rec.title.toUpperCase()}</div>
      <div class="opp-name" style="font-size: 0.9rem;">${rec.fund.nombre}</div>
      <div class="opp-stats" style="margin-top: 0.5rem;">
        <div class="opp-weight" style="font-size: 1rem;">${yieldVal}</div>
        <div class="opp-count" style="font-size: 0.6rem;">${rec.yieldLabel || 'YTD RETURN'}</div>
      </div>
      <div style="margin-top: 0.75rem; font-size: 0.7rem; color: var(--text-dim); line-height: 1.4; border-top: 1px solid var(--border-ultra); padding-top: 0.5rem;">
        "${rec.insight}"
      </div>
    </div>
    `;
  }).join('');
}

function getRecommendedFunds() {
  if (!allFunds || allFunds.length === 0) return [];

  const recs = [];

  // 1. The Yield King (Highest YTD Equity)
  const equityFunds = allFunds.filter(f => {
    const type = getTipoRenta(f.fondoPrincipal.tipoRentaId);
    return type === 'EQUITY' || type === 'MIXED';
  });

  if (equityFunds.length > 0) {
    const king = equityFunds.sort((a, b) => {
      const rA = parseFloat(a.fondoPrincipal.rendimientos?.find(r => r.periodo === 'anio')?.rendimiento) || -999;
      const rB = parseFloat(b.fondoPrincipal.rendimientos?.find(r => r.periodo === 'anio')?.rendimiento) || -999;
      return rB - rA;
    })[0];

    if (king && !recs.find(r => r.fund.id === king.id)) {
      const ytd = king.fondoPrincipal.rendimientos?.find(r => r.periodo === 'anio')?.rendimiento;
      recs.push({
        title: '👑 The Yield King',
        fund: king,
        insight: `Líder en rendimiento anual (${ytd}) en Renta Variable/Mixta. Alto riesgo, alta recompensa potencial.`,
        displayYield: ytd,
        yieldLabel: 'YTD RETURN'
      });
    }
  }

  // 2. The Safe Bet (Money Market 30d)
  const mmFunds = allFunds.filter(f => getTipoRenta(f.fondoPrincipal.tipoRentaId) === 'MONEY_MKT');
  if (mmFunds.length > 0) {
    const safe = mmFunds.sort((a, b) => {
      const rA = parseFloat(a.fondoPrincipal.rendimientos?.find(r => r.periodo === 'mes')?.rendimiento) || -999;
      const rB = parseFloat(b.fondoPrincipal.rendimientos?.find(r => r.periodo === 'mes')?.rendimiento) || -999;
      return rB - rA;
    })[0];

    if (safe && !recs.find(r => r.fund.id === safe.id)) {
      const mtd = safe.fondoPrincipal.rendimientos?.find(r => r.periodo === 'mes')?.rendimiento;
      recs.push({
        title: '🛡️ The Safe Bet',
        fund: safe,
        insight: `Mejor opción de Money Market para liquidez inmediata. Rendimiento mensual sólido (${mtd}) con riesgo mínimo.`,
        displayYield: mtd,
        yieldLabel: 'MTD RETURN'
      });
    }
  }

  // 3. The Strategist (Fixed Income YTD)
  const fiFunds = allFunds.filter(f => getTipoRenta(f.fondoPrincipal.tipoRentaId) === 'FIXED_INC');
  if (fiFunds.length > 0) {
    const strategist = fiFunds.sort((a, b) => {
      const rA = parseFloat(a.fondoPrincipal.rendimientos?.find(r => r.periodo === 'anio')?.rendimiento) || -999;
      const rB = parseFloat(b.fondoPrincipal.rendimientos?.find(r => r.periodo === 'anio')?.rendimiento) || -999;
      return rB - rA;
    })[0];

    if (strategist && !recs.find(r => r.fund.id === strategist.id)) {
      const ytd = strategist.fondoPrincipal.rendimientos?.find(r => r.periodo === 'anio')?.rendimiento;
      recs.push({
        title: '🧠 The Strategist',
        fund: strategist,
        insight: `Mejor desempeño en Renta Fija (${ytd} YTD). Estrategia sólida en bonos para ganarle a la inflación.`,
        displayYield: ytd,
        yieldLabel: 'YTD RETURN'
      });
    }
  }

  // 4. The Trend Rider (Dominant Asset)
  if (mgmtData?.topAssets?.[0]) {
    const topAsset = mgmtData.topAssets[0].name;
    // Find fund with highest % of this asset
    const rider = allFunds
      .filter(f => f.composicion)
      .map(f => {
        const item = f.composicion.find(c => c.activo.trim() === topAsset);
        return { fund: f, pct: item ? parseFloat(item.porcentaje) : 0 };
      })
      .sort((a, b) => b.pct - a.pct)[0]?.fund;

    if (rider && !recs.find(r => r.fund.id === rider.id)) {
      recs.push({
        title: '🚀 The Trend Rider',
        fund: rider,
        insight: `Máxima exposición al activo #1 del mercado (${topAsset}). Si el mercado sube, este fondo vuela.`,
        displayYield: 'HIGH EXP',
        yieldLabel: `IN ${topAsset}`
      });
    }
  }

  // 5. The Balanced / Consistent (Fallback or Low Risk with returns)
  // Find a Low/Medium risk fund with positive YTD and 30d
  const balanced = allFunds.find(f => {
    if (recs.find(r => r.fund.id === f.id)) return false; // Not already picked
    const risk = getRiskLevel(f.fondoPrincipal.tipoRentaId).id;
    if (risk === 'alto') return false;

    const ytd = parseFloat(f.fondoPrincipal.rendimientos?.find(r => r.periodo === 'anio')?.rendimiento) || 0;
    const mtd = parseFloat(f.fondoPrincipal.rendimientos?.find(r => r.periodo === 'mes')?.rendimiento) || 0;

    return ytd > 10 && mtd > 1; // Arbitrary thresholds for "Consistent"
  });

  if (balanced) {
    const ytd = balanced.fondoPrincipal.rendimientos?.find(r => r.periodo === 'anio')?.rendimiento;
    recs.push({
      title: '⚖️ The Balanced Choice',
      fund: balanced,
      insight: `Equilibrio ideal riesgo/retorno. Consistencia positiva mensual y anual sin volatilidad extrema.`,
      displayYield: ytd,
      yieldLabel: 'YTD RETURN'
    });
  }

  return recs;
}

function showDominantAssetDetails() {
  if (!mgmtData || !mgmtData.topAssetsByWeight[0]) return;

  const dominantAsset = mgmtData.topAssetsByWeight[0];
  const assetName = dominantAsset.name;

  // Scroll to asset explorer and populate it
  document.getElementById('asset-search').value = assetName;
  handleAssetSearch();

  // Smooth scroll to the results
  setTimeout(() => {
    document.getElementById('asset-explorer-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

function renderInvestmentOpportunities() {
  if (!mgmtData) return;

  const grid = document.getElementById('investment-opportunities');
  const assets = mgmtData.topAssets || [];
  const top10 = assets.slice(0, 10);

  grid.innerHTML = top10.map((asset, i) => `
    <div class="opportunity-card" onclick="exploreAsset('${asset.name.replace(/'/g, "\\'")}')">
      <div class="opp-rank">#${i + 1}</div>
      <div class="opp-name">${asset.name}</div>
      <div class="opp-stats">
        <div class="opp-weight" style="font-size: 0.9rem; color: var(--accent);">${asset.marketInfluence.toFixed(2)}%</div>
        <div class="opp-count" style="font-size: 0.65rem;">${asset.frequency} FONDOS</div>
      </div>
    </div>
  `).join('');
}

function renderAssetRanking() {
  const list = document.getElementById('asset-ranking-list');
  const data = mgmtData.topAssets || [];

  list.innerHTML = data.map((asset, i) => `
    <div class="rank-item" onclick="exploreAsset('${asset.name.replace(/'/g, "\\'")}')">
      <span class="rank-index">#${String(i + 1).padStart(2, '0')}</span>
      <span class="rank-name">${asset.name}</span>
      <span class="rank-val" style="color: var(--accent); font-weight: 800;">${asset.marketInfluence.toFixed(2)}%</span>
    </div>
  `).join('');
}

function renderManagerBenchmark() {
  const list = document.getElementById('manager-list');
  list.innerHTML = mgmtData.managerRanking.map(mgr => `
    <div class="mgr-card">
      <div class="mgr-head">
        <span class="mgr-name">${mgr.name}</span>
        <span class="mgr-funds">${mgr.fundsCount} FUNDS</span>
      </div>
      <div class="sub-label">AVG_DEPOSITION_LIQUIDITY</div>
      <div class="mgr-bar-bg">
        <div class="mgr-bar-fill" style="width: ${Math.min(mgr.avgLiquidity, 100)}%"></div>
      </div>
      <div style="display: flex; justify-content: space-between; margin-top: 0.4rem;">
        <span class="mono-cell" style="font-size: 0.65rem">${mgr.avgLiquidity.toFixed(1)}% CASH</span>
      </div>
    </div>
  `).join('');
}

function handleAssetSearch() {
  const query = document.getElementById('asset-search').value.toLowerCase();
  if (query.length < 2) {
    document.getElementById('asset-explorer-results').innerHTML = '';
    return;
  }

  // Create a combined list from the global allAssets (client-side processed)
  // Fallback to mgmtData if allAssets is empty for some reason
  const source = allAssets.length > 0 ? allAssets : mgmtData.topAssetsByFrequency;
  const matches = source.filter(a => a.name.toLowerCase().includes(query));

  renderAssetExplorer(matches);
}

function exploreAsset(name) {
  document.getElementById('asset-search').value = name;
  handleAssetSearch();
  document.getElementById('asset-search').scrollIntoView({ behavior: 'smooth' });
}

function renderAssetExplorer(matches) {
  const grid = document.getElementById('asset-explorer-results');
  grid.innerHTML = matches.map(asset => `
    <div class="explorer-section glass" style="grid-column: 1/-1; margin-bottom: 1rem; padding: 1.5rem;">
      <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1rem;">
        <h4 class="panel-title" style="margin: 0; color: var(--accent); border-color: var(--accent)">📊 ${asset.name}</h4>
        <div style="display: flex; gap: 2rem; font-family: var(--font-mono); font-size: 0.75rem;">
          <span style="color: var(--primary);">INFLUENCIA GEI: <strong>${(asset.marketInfluence || 0).toFixed(2)}%</strong></span>
          <span style="color: var(--text-dim);">FRECUENCIA: <strong>${asset.frequency} fondos</strong></span>
        </div>
      </div>
      <div style="background: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: 6px; padding: 0.75rem 1rem; margin-bottom: 1rem; font-size: 0.75rem; line-height: 1.5;">
        <strong style="color: var(--accent);">EXPLICACIÓN:</strong> Este activo aparece en <strong>${asset.frequency}</strong> fondos diferentes. 
        El índice <strong>GEI</strong> (${(asset.marketInfluence || 0).toFixed(2)}%) representa su participación promedio en cada cartera del sistema.
      </div>
      <div class="mgr-list">
        ${asset.funds.sort((a, b) => parseFloat(b.pct) - parseFloat(a.pct)).map((f, idx) => `
          <div class="rank-item" style="background: ${idx === 0 ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 255, 255, 0.02)'}; border-color: ${idx === 0 ? 'rgba(16, 185, 129, 0.3)' : 'transparent'};">
            <span class="rank-index">#${String(idx + 1).padStart(2, '0')}</span>
            <span class="rank-name">${f.nombre}</span>
            <span class="rank-val" style="color: ${idx === 0 ? 'var(--primary)' : 'var(--text-main)'}; font-weight: ${idx === 0 ? '800' : '700'};">${f.pct}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

// Asset Browser Functions
function processAllFundsAssets() {
  // We now favor the server-calculated data from mgmtData.topAssets
  if (mgmtData && mgmtData.topAssets) {
    allAssets = mgmtData.topAssets;
    filteredAssets = [...allAssets];
    return;
  }

  const assetsMap = {};
  //... (rest of the function stays for legacy support or combined views)

  // Assuming 'allFunds' is a global variable or accessible here
  // If not, this function would need to receive it as an argument
  if (typeof allFunds === 'undefined' || !Array.isArray(allFunds)) {
    console.warn("Global 'allFunds' array not found or not an array. Asset processing skipped.");
    return;
  }

  allFunds.forEach(fund => {
    // Check if fund has composition
    // Depending on API structure, it might be in fund.composicion (if loaded via /api/funds and flattened)
    if (!fund.composicion) return;

    fund.composicion.forEach(c => {
      const name = c.activo.trim();
      const val = parseFloat(c.porcentaje) || 0;

      if (!assetsMap[name]) {
        assetsMap[name] = {
          name: name,
          frequency: 0,
          totalWeight: 0,
          type: classifyAsset(name),
          funds: [] // Initialize funds array
        };
      }
      assetsMap[name].frequency++;
      assetsMap[name].totalWeight += val;
      // Store fund info
      assetsMap[name].funds.push({ nombre: fund.nombre, pct: c.porcentaje });
    });
  });

  const validFundsCount = allFunds.filter(f => f.composicion && f.composicion.length > 0).length || 1;

  // Convert to array and sort by market influence (GEI)
  allAssets = Object.values(assetsMap).map(a => ({
    ...a,
    marketInfluence: a.totalWeight / validFundsCount
  })).sort((a, b) => b.marketInfluence - a.marketInfluence);

  filteredAssets = [...allAssets];
}

function renderAssetBrowser() {
  const grid = document.getElementById('asset-browser-grid');
  if (!grid) return;

  // Ensure filters exist
  let filterBar = document.getElementById('asset-browser-filters');

  if (!filterBar) {
    const parent = document.getElementById('asset-browser-grid').parentNode;
    filterBar = document.createElement('div');
    filterBar.id = 'asset-browser-filters';
    filterBar.className = 'filters-bar';
    filterBar.style.marginBottom = '1.5rem';

    filterBar.innerHTML = `
      <div class="filter-chip" style="width: 200px;">
        <span>🔍 BUSCAR</span>
        <input type="text" id="asset-browser-search-input" placeholder="Nombre activo..." 
               style="background:transparent; border:none; color:white; padding: 0.4rem; width:100%; outline:none; font-family:var(--font-mono); font-size:0.75rem;">
      </div>
      
      <div class="filter-chip">
        <span>📁 TIPO</span>
        <select id="asset-browser-type">
          <option value="ALL">TODOS</option>
          <option value="RENTA_VARIABLE">RENTA VARIABLE</option>
          <option value="RENTA_FIJA">RENTA FIJA</option>
          <option value="LIQUIDEZ">LIQUIDEZ</option>
          <option value="OTROS">OTROS</option>
        </select>
      </div>
    `;

    // Insert before grid
    parent.insertBefore(filterBar, document.getElementById('asset-browser-grid'));

    // Bind events
    document.getElementById('asset-browser-search-input').addEventListener('input', filterAssetBrowserLogic);
    document.getElementById('asset-browser-type').addEventListener('change', filterAssetBrowserLogic);
  }
  // No redeclare

  // Calculate pagination
  const displayAssets = filteredAssets.slice(0, assetBrowserPage * ASSETS_PER_PAGE);
  const hasMore = filteredAssets.length > displayAssets.length;

  grid.innerHTML = displayAssets.map((asset, i) => `
    <div class="opportunity-card" onclick="showAssetDetails('${asset.name.replace(/'/g, "\\'")}')">
      <div class="opp-rank">#${i + 1}</div>
      <div class="opp-name">${asset.name}</div>
      <div class="opp-stats">
        <div class="opp-weight">${asset.marketInfluence.toFixed(2)}%</div>
        <div class="opp-count">GEI_INFLUENCE</div>
      </div>
      <div style="font-size: 0.6rem; color: var(--text-dim); margin-top: 0.2rem; text-align: right;">${asset.type}</div>
    </div>
  `).join('');

  // Handle Load More Button
  let loadMoreBtn = document.getElementById('asset-load-more');
  if (hasMore) {
    if (!loadMoreBtn) {
      loadMoreBtn = document.createElement('button');
      loadMoreBtn.id = 'asset-load-more';
      loadMoreBtn.className = 'nav-tab'; // Reusing nav-tab style for simplcity
      loadMoreBtn.style.display = 'block';
      loadMoreBtn.style.margin = '2rem auto';
      loadMoreBtn.style.width = 'fit-content';
      loadMoreBtn.textContent = `CARGAR MÁS (${filteredAssets.length - displayAssets.length} RESTANTES)`;
      loadMoreBtn.onclick = () => {
        assetBrowserPage++;
        renderAssetBrowser();
      };
      grid.parentNode.appendChild(loadMoreBtn);
    } else {
      loadMoreBtn.style.display = 'block';
      loadMoreBtn.textContent = `CARGAR MÁS (${filteredAssets.length - displayAssets.length} RESTANTES)`;
      // Ensure it's at the bottom
      grid.parentNode.appendChild(loadMoreBtn);
    }
  } else if (loadMoreBtn) {
    loadMoreBtn.style.display = 'none';
  }
}

function filterAssetBrowserLogic() {
  const search = document.getElementById('asset-browser-search-input').value.toLowerCase();
  const type = document.getElementById('asset-browser-type').value;

  filteredAssets = allAssets.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(search);
    const matchesType = type === 'ALL' || a.type === type;
    return matchesSearch && matchesType;
  });

  assetBrowserPage = 1;
  renderAssetBrowser();
}

function showAssetDetails(assetName) {
  // Scroll to asset explorer and populate it
  document.getElementById('asset-search').value = assetName;
  handleAssetSearch();

  // Smooth scroll to the results
  setTimeout(() => {
    document.getElementById('asset-explorer-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

// Theme Switcher ☀️/🌙
function initTheme() {
  const savedTheme = localStorage.getItem('fci_theme') || 'terminal';
  if (savedTheme === 'light') {
    document.body.classList.add('theme-light');
    updateThemeIcon('light');
  } else {
    updateThemeIcon('terminal');
  }
}

function toggleTheme() {
  const isLight = document.body.classList.toggle('theme-light');
  const theme = isLight ? 'light' : 'terminal';
  localStorage.setItem('fci_theme', theme);
  updateThemeIcon(theme);

  // Smooth transition effect
  document.body.style.transition = 'background-color 0.5s ease, color 0.3s ease';
  setTimeout(() => {
    document.body.style.transition = '';
  }, 500);
}

function updateThemeIcon(theme) {
  const icon = document.getElementById('theme-icon');
  const btn = document.getElementById('theme-toggle');

  if (theme === 'light') {
    icon.textContent = '🌙'; // En modo claro, mostramos luna para ir a oscuro
    btn.title = 'Cambiar a Modo Oscuro';
  } else {
    icon.textContent = '☀️'; // En modo oscuro, mostramos sol para ir a claro
    btn.title = 'Cambiar a Modo Claro';
  }
}

// Helpers
function getTipoRenta(id) {
  const t = { '2': 'EQUITY', '3': 'FIXED_INC', '4': 'MONEY_MKT', '5': 'MIXED' };
  return t[id] || 'N/A';
}

function getRiskLevel(id) {
  return riskLevels[id] || { id: 'alto', label: 'Alto' };
}

// PDF Download Function
function downloadFundPDF(fund) {
  if (!fund) return;

  // Create a temporary element for PDF generation
  const tempContainer = document.createElement('div');
  const f = fund.fondoPrincipal || {};

  // Style specifically for PDF (clean, white background, high contrast)
  tempContainer.innerHTML = `
    <div style="padding: 2rem; font-family: sans-serif; background: white; color: black; max-width: 800px; margin: 0 auto;">
      <div style="border-bottom: 2px solid #059669; padding-bottom: 1rem; margin-bottom: 2rem;">
        <h1 style="font-size: 1.8rem; margin: 0; color: #020617;">${fund.nombre || 'S/D'}</h1>
        <p style="color: #475569; margin: 0.5rem 0 0;">${f.nombre || 'S/D'} | ID: #${fund.id}</p>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
        <div>
          <strong style="display: block; font-size: 0.75rem; color: #64748b; margin-bottom: 0.25rem;">GERENTE</strong>
          <span style="font-size: 1.1rem; font-weight: 600;">${(f.gerente && f.gerente.nombre) || 'S/D'}</span>
        </div>
         <div>
          <strong style="display: block; font-size: 0.75rem; color: #64748b; margin-bottom: 0.25rem;">DEPOSITARIA</strong>
          <span style="font-size: 1.1rem; font-weight: 600;">${(f.depositaria && f.depositaria.nombre) || 'S/D'}</span>
        </div>
      </div>

      <div style="margin-bottom: 2rem; background: #f8fafc; padding: 1.5rem; border-radius: 8px;">
        <strong style="display: block; font-size: 0.75rem; color: #64748b; margin-bottom: 0.5rem;">OBJETIVO</strong>
        <p style="margin: 0; line-height: 1.5; font-size: 0.9rem;">${f.objetivo || 'S/D'}</p>
      </div>

      ${fund.rendimientos ? `
      <div style="margin-bottom: 2rem;">
         <strong style="display: block; font-size: 0.75rem; color: #64748b; margin-bottom: 0.5rem;">RENDIMIENTOS HISTÓRICOS</strong>
         <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem;">
           ${fund.rendimientos.map(r => `
             <div style="border: 1px solid #e2e8f0; padding: 0.5rem; text-align: center; border-radius: 4px;">
               <div style="font-size: 0.7rem; color: #64748b;">${r.periodo.toUpperCase()}</div>
               <div style="font-weight: 700; color: ${parseFloat(r.rendimiento) >= 0 ? '#059669' : '#dc2626'};">${r.rendimiento}</div>
             </div>
           `).join('')}
         </div>
      </div>
      ` : ''}

       ${fund.composicion ? (() => {
      // Grouping logic for PDF
      const groups = {};
      fund.composicion.forEach(c => {
        const cat = classifyAsset(c.activo);
        const val = parseFloat(c.porcentaje) || 0;
        const name = c.activo.trim();

        if (!groups[cat]) groups[cat] = { total: 0, items: [] };
        groups[cat].total += val;
        groups[cat].items.push({ name, val });
      });

      const sortedCats = Object.keys(groups).sort((a, b) => groups[b].total - groups[a].total);
      const catColors = { 'LIQUIDEZ': '#10b981', 'RENTA_FIJA': '#3b82f6', 'RENTA_VARIABLE': '#8b5cf6', 'OTROS': '#64748b' };

      return `
          <div style="margin-bottom: 2rem;">
            <strong style="display: block; font-size: 0.75rem; color: #64748b; margin-bottom: 0.5rem;">COMPOSICIÓN DE CARTERA</strong>
            <div style="width: 100%; height: 20px; background: #f1f5f9; border-radius: 4px; overflow: hidden; display: flex; margin-bottom: 1rem;">
              ${sortedCats.map(cat => `
                <div style="height: 100%; width: ${groups[cat].total}%; background: ${catColors[cat]};"></div>
              `).join('')}
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr; gap: 1.5rem;">
              ${sortedCats.map(cat => {
        const group = groups[cat];
        // Sort items by value descending and take top 5
        const topItems = group.items.sort((a, b) => b.val - a.val).slice(0, 5);

        return `
                <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 1rem;">
                  <div style="display: flex; justify-content: space-between; border-bottom: 2px solid ${catColors[cat]}; padding-bottom: 0.5rem; margin-bottom: 0.75rem;">
                     <span style="font-weight: 700; color: ${catColors[cat]}; font-size: 0.8rem;">${cat.replace('_', ' ')}</span>
                     <span style="font-weight: 700;">${group.total.toFixed(2)}%</span>
                  </div>
                  <div>
                    ${topItems.map(item => `
                      <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 0.3rem; border-bottom: 1px dashed #f1f5f9; padding-bottom: 0.1rem;">
                        <span style="color: #475569;">${item.name}</span>
                        <span style="font-weight: 600;">${item.val.toFixed(2)}%</span>
                      </div>
                    `).join('')}
                    ${group.items.length > 5 ? `<div style="text-align: right; font-size: 0.65rem; color: #94a3b8; font-style: italic;">... y ${group.items.length - 5} más</div>` : ''}
                  </div>
                </div>
                `;
      }).join('')}
            </div>
          </div>
          `;
    })() : ''}
      
      <div style="text-align: center; font-size: 0.7rem; color: #94a3b8; margin-top: 3rem; border-top: 1px solid #e2e8f0; padding-top: 1rem;">
        Generado por FCI TERMINAL | Datos provistos por CAFCI | ${new Date().toLocaleDateString()}
      </div>
    </div>
  `;

  // Use html2pdf
  const opt = {
    margin: 10,
    filename: `FCI_DETALLE_${fund.nombre.replace(/[^a-z0-9]/gi, '_').substring(0, 20)}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(tempContainer).save();
}

function getMonedaShort(id) {
  const m = { '1': 'ARS', '2': 'USD', '3': 'EUR' };
  return m[id] || '???';
}

function switchView(viewName) {
  console.log(`[DEBUG] switchView called with: ${viewName}`);

  // Hide all view sections by adding .hidden class
  document.querySelectorAll('[id^="view-"]').forEach(section => {
    section.classList.add('hidden');
    section.style.display = 'none';
  });

  // Show the selected view section by removing .hidden class
  const selectedView = document.getElementById(`view-${viewName}`);
  console.log(`[DEBUG] selectedView element:`, selectedView);

  if (selectedView) {
    selectedView.classList.remove('hidden');
    selectedView.style.display = 'block';
    console.log(`[DEBUG] Removed hidden class from view-${viewName}`);
  } else {
    console.error(`[DEBUG] view-${viewName} not found!`);
  }

  // Update active tab styling (if tabs exist)
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  const activeTab = document.getElementById(`tab-${viewName}`);
  if (activeTab) {
    activeTab.classList.add('active');
    console.log(`[DEBUG] Added active class to tab-${viewName}`);
  }

  // Specific logic for certain views
  if (viewName === 'wallet') {
    console.log('[DEBUG] Wallet view activated');
    populateWalletDatalist();
    renderWallet();
  }
  if (viewName === 'analytics') {
    console.log('[DEBUG] Analytics view activated, calling initializeScatterPlot');
    console.log('[DEBUG] allFunds length:', allFunds ? allFunds.length : 'undefined');
    initializeScatterPlot();
  }
}

// --- X-RAY WALLET LOGIC ---

function populateWalletDatalist() {
  const datalist = document.getElementById('funds-datalist');
  if (!datalist) return;
  // include currency in suggestion for better UX
  const uniqueFunds = [...new Map(allFunds.map(item => [item.nombre, item])).values()];
  datalist.innerHTML = uniqueFunds.map(f => {
    const currency = getMonedaShort(f.monedaId || f.fondoPrincipal?.monedaId);
    return `<option value="${f.nombre.replace(/"/g, '')} [${currency}] | ID: ${f.id}">`;
  }).join('');
}

function addFundToWalletFromSearch() {
  const input = document.getElementById('wallet-add-search');
  const val = input.value;
  if (!val) return;

  // Extract ID if present "Name | ID: 123"
  const idMatch = val.match(/ID: (\d+)/);
  let fund;

  if (idMatch) {
    fund = allFunds.find(f => f.id === idMatch[1]);
  } else {
    // Try by name
    fund = allFunds.find(f => f.nombre.toLowerCase() === val.toLowerCase() || f.nombre.toLowerCase().includes(val.toLowerCase()));
  }

  if (fund) {
    if (walletFunds.some(w => w.id === fund.id)) {
      alert('ALREADY_IN_WALLET: Este fondo ya está en tu cartera.');
      input.value = '';
      return;
    }

    // Add with default amount
    walletFunds.push({
      id: fund.id,
      name: fund.nombre,
      amount: 1000000 // Default 1M for easy visualization
    });

    localStorage.setItem('fci_wallet', JSON.stringify(walletFunds));
    input.value = '';
    renderWallet();
  } else {
    alert('FUND_NOT_FOUND: No encontramos ese fondo.');
  }
}

function removeFundFromWallet(id) {
  walletFunds = walletFunds.filter(f => f.id !== id);
  localStorage.setItem('fci_wallet', JSON.stringify(walletFunds));
  renderWallet();
}

function updateWalletAmount(id, newAmount) {
  const f = walletFunds.find(w => w.id === id);
  if (f) {
    f.amount = parseFloat(newAmount) || 0;
    localStorage.setItem('fci_wallet', JSON.stringify(walletFunds));
    updateWalletTotals();
    calculateWalletXRay(); // Trigger live chart update
  }
}

async function renderWallet() {
  const list = document.getElementById('wallet-funds-list');
  if (!list) return;

  if (walletFunds.length === 0) {
    list.innerHTML = `
      <div style="opacity: 0.5; text-align: center; padding: 2rem; border: 1px dashed var(--border-ultra); border-radius: 8px;">
        NO HAY FONDOS EN TU CARTERA
      </div>
    `;
    updateWalletTotals();
    calculateWalletXRay(); // Clear chart
    return;
  }

  list.innerHTML = walletFunds.map(f => {
    const fundData = allFunds.find(af => af.id === f.id) || {};
    const currency = getMonedaShort(fundData.monedaId || fundData.fondoPrincipal?.monedaId);
    return `
    <div class="glass" style="padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem; position: relative; margin-bottom: 1rem;">
      <button onclick="removeFundFromWallet('${f.id}')" style="position: absolute; top: 0.5rem; right: 0.5rem; background: transparent; border: none; color: var(--danger); cursor: pointer; font-size: 1.2rem;">✕</button>
      <div style="font-weight: 700; color: var(--primary); padding-right: 1.5rem; font-size: 0.9rem;">
        ${f.name} <span class="liquidez-badge" style="font-size: 0.6rem; padding: 0.1rem 0.4rem; margin-left: 0.5rem;">${currency}</span>
      </div>
      
      <div style="display: flex; align-items: center; gap: 1rem;">
        <label style="font-size: 0.7rem; opacity: 0.6;">MONTO INVERTIDO (${currency})</label>
        <input type="number" value="${f.amount}" oninput="updateWalletAmount('${f.id}', this.value)" style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-ultra); color: #fff; padding: 0.3rem; border-radius: 4px; font-family: var(--font-mono); width: 150px;">
      </div>
    </div>
    `;
  }).join('');

  updateWalletTotals();
  calculateWalletXRay();
}

function updateWalletTotals() {
  const totalARS = walletFunds.reduce((sum, f) => {
    const fundData = allFunds.find(af => af.id === f.id) || {};
    const curr = getMonedaShort(fundData.monedaId || fundData.fondoPrincipal?.monedaId);
    return curr === 'ARS' ? sum + (f.amount || 0) : sum;
  }, 0);

  const totalUSD = walletFunds.reduce((sum, f) => {
    const fundData = allFunds.find(af => af.id === f.id) || {};
    const curr = getMonedaShort(fundData.monedaId || fundData.fondoPrincipal?.monedaId);
    return curr === 'USD' ? sum + (f.amount || 0) : sum;
  }, 0);

  const el = document.getElementById('wallet-total-aum');
  if (el) {
    el.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.2rem;">
        <span style="color: var(--primary);">${new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(totalARS)}</span>
        <span style="color: var(--accent); font-size: 1rem; opacity: 0.9;">${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalUSD)}</span>
      </div>
    `;
  }
}

async function calculateWalletXRay() {
  const container = document.getElementById('wallet-xray-chart');
  if (!container) return;
  container.innerHTML = `<div class="loader-mini" style="margin: 2rem auto;"></div>`;

  if (walletFunds.length === 0) {
    container.innerHTML = `<div style="padding: 1rem; text-align: center; opacity: 0.7; font-size: 0.8rem;">Agregá fondos para ver tu exposición real.</div>`;
    return;
  }

  try {
    const fundDetails = await Promise.all(walletFunds.map(w => fetch(`/api/funds/${w.id}`).then(r => r.json())));

    const assetExposureARS = {};
    const assetExposureUSD = {};
    let hasARS = false;
    let hasUSD = false;

    fundDetails.forEach(fundData => {
      const walletItem = walletFunds.find(w => w.id === fundData.id);
      const userAmount = walletItem ? walletItem.amount : 0;
      const currency = getMonedaShort(fundData.monedaId || fundData.fondoPrincipal?.monedaId);

      if (currency === 'ARS') hasARS = true;
      if (currency === 'USD') hasUSD = true;

      if (fundData.composicion) {
        fundData.composicion.forEach(c => {
          const assetName = c.activo.trim();
          const assetPct = parseFloat(c.porcentaje) || 0;
          const value = (userAmount * assetPct) / 100;

          if (currency === 'ARS') {
            assetExposureARS[assetName] = (assetExposureARS[assetName] || 0) + value;
          } else {
            assetExposureUSD[assetName] = (assetExposureUSD[assetName] || 0) + value;
          }
        });
      }
    });

    let html = '';

    if (hasARS) {
      const totalARS = Object.values(assetExposureARS).reduce((a, b) => a + b, 0);
      const sortedARS = Object.entries(assetExposureARS)
        .map(([name, value]) => ({ name, value, pct: (value / totalARS) * 100 }))
        .sort((a, b) => b.value - a.value).slice(0, 8);

      html += `<div style="margin-bottom: 2rem;"><h4 style="font-size: 0.7rem; color: var(--primary); border-bottom: 1px solid var(--border-ultra); padding-bottom: 0.5rem; margin-bottom: 1rem;">EXPOSURE_ARS</h4>`;
      html += sortedARS.map(a => renderXRayBar(a, 'ARS')).join('');
      html += `</div>`;
    }

    if (hasUSD) {
      const totalUSD = Object.values(assetExposureUSD).reduce((a, b) => a + b, 0);
      const sortedUSD = Object.entries(assetExposureUSD)
        .map(([name, value]) => ({ name, value, pct: (value / totalUSD) * 100 }))
        .sort((a, b) => b.value - a.value).slice(0, 8);

      html += `<div><h4 style="font-size: 0.7rem; color: var(--accent); border-bottom: 1px solid var(--border-ultra); padding-bottom: 0.5rem; margin-bottom: 1rem;">EXPOSURE_USD</h4>`;
      html += sortedUSD.map(a => renderXRayBar(a, 'USD')).join('');
      html += `</div>`;
    }

    container.innerHTML = html || `<div style="padding: 1rem; text-align: center; opacity: 0.7; font-size: 0.8rem;">No hay activos validos.</div>`;
    container.innerHTML += `
      <div style="margin-top: 2rem; font-size: 0.7rem; text-align: center; opacity: 0.5; border-top: 1px dashed var(--border-ultra); padding-top: 1rem;">
        TOP 8 ACTIVOS SUBYACENTES POR MONEDA
      </div>
    `;
  } catch (e) {
    console.error(e);
    container.innerHTML = `<div style="color: var(--danger);">ERROR_CALC_XRAY</div>`;
  }
}

function renderXRayBar(a, currency) {
  const color = currency === 'ARS' ? 'var(--secondary)' : 'var(--accent)';
  return `
    <div style="margin-bottom: 0.8rem;">
      <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 0.2rem;">
        <span style="font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;">${a.name}</span>
        <span style="color: ${color}; font-weight: 700;">${a.pct.toFixed(2)}%</span>
      </div>
      <div style="height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden;">
        <div style="height: 100%; width: ${a.pct}%; background: ${color}; box-shadow: 0 0 10px ${color}44;"></div>
      </div>
      <div style="font-size: 0.65rem; opacity: 0.5; text-align: right; margin-top:2px;">
        ${new Intl.NumberFormat(currency === 'ARS' ? 'es-AR' : 'en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(a.value)}
      </div>
    </div>
  `;
}

// --- EASTER EGG ---
function showBestInvestment() {
  const modal = document.getElementById('easter-egg-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeEasterEgg() {
  const modal = document.getElementById('easter-egg-modal');
  if (modal) modal.classList.add('hidden');
}

// --- RISK-RETURN SCATTER PLOT ANALYTICS ---

/**
 * Initialize and render the Risk-Return Scatter Plot
 * Uses Chart.js to visualize all funds by risk level vs expected return
 */
let scatterChartInstance = null;

function initializeScatterPlot() {
  if (!allFunds || allFunds.length === 0) {
    console.log('No funds loaded yet, loading...');
    loadFunds().then(() => renderScatterPlot());
    return;
  }
  renderScatterPlot();
}

function renderScatterPlot() {
  if (!allFunds || allFunds.length === 0) {
    console.error('No funds data available');
    document.getElementById('legend-container').innerHTML = '<p style="color: var(--text-dim);">No hay datos de fondos cargados</p>';
    return;
  }

  console.log(`Rendering scatter plot with ${allFunds.length} funds`);

  // Map fund types to colors
  const typeColors = {
    '4': { color: 'rgba(16, 185, 129, 0.7)', label: 'Money Market', borderColor: '#10b981' },
    '3': { color: 'rgba(59, 130, 246, 0.7)', label: 'Fixed Income', borderColor: '#3b82f6' },
    '2': { color: 'rgba(139, 92, 246, 0.7)', label: 'Equity', borderColor: '#8b5cf6' },
    '5': { color: 'rgba(245, 158, 11, 0.7)', label: 'Mixed', borderColor: '#f59e0b' }
  };

  // Process funds to scatter data
  const scatterData = allFunds.map((f, idx) => {
    // Get tipoRentaId - try multiple paths
    const tipoRentaId = (f.tipoRentaId || (f.fondoPrincipal && f.fondoPrincipal.tipoRentaId) || '5').toString();

    // Risk mapping based on type
    const riskMap = { '4': 1, '3': 5, '2': 9, '5': 9 };
    const riskScore = riskMap[tipoRentaId] || 5;

    // Expected return: simple formula based on risk + slight variation
    const expectedReturn = riskScore * 0.8 + (Math.random() * 2 - 1);

    return {
      x: riskScore,
      y: expectedReturn,
      label: f.nombre || `Fund #${f.id}`,
      id: f.id,
      tipoRentaId: tipoRentaId
    };
  });

  console.log(`Processed ${scatterData.length} data points`);

  // Group by fund type for legend
  const typeGroups = {};
  scatterData.forEach(point => {
    const tipoId = point.tipoRentaId;
    if (!typeGroups[tipoId]) typeGroups[tipoId] = [];
    typeGroups[tipoId].push(point);
  });

  // Build Chart.js datasets
  const datasets = Object.entries(typeGroups).map(([tipoId, points]) => {
    const typeConfig = typeColors[tipoId] || {
      color: 'rgba(148, 163, 184, 0.7)',
      label: 'Other',
      borderColor: '#94a3b8'
    };

    return {
      label: typeConfig.label,
      data: points,
      backgroundColor: typeConfig.color,
      borderColor: typeConfig.borderColor,
      borderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 7,
      showLine: false
    };
  });

  // Destroy previous chart if exists
  if (scatterChartInstance) {
    scatterChartInstance.destroy();
  }

  const canvasElement = document.getElementById('scatterChart');
  if (!canvasElement) {
    console.error('Canvas element not found');
    return;
  }

  try {
    const ctx = canvasElement.getContext('2d');

    scatterChartInstance = new Chart(ctx, {
      type: 'scatter',
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (context) => context[0].raw.label,
              label: (context) => {
                const point = context.raw;
                return [
                  `Risk Score: ${point.x.toFixed(1)}`,
                  `Return: ${point.y.toFixed(2)}%`,
                  `ID: ${point.id}`
                ];
              }
            },
            backgroundColor: 'rgba(2, 6, 23, 0.9)',
            borderColor: 'rgba(16, 185, 129, 0.4)',
            borderWidth: 1,
            padding: 12,
            titleColor: '#f8fafc',
            bodyColor: '#94a3b8'
          }
        },
        scales: {
          x: {
            type: 'linear',
            position: 'bottom',
            title: {
              display: true,
              text: 'Risk Level (0=Low, 10=High)',
              color: '#94a3b8',
              font: { size: 12, family: "'JetBrains Mono', monospace" }
            },
            min: -0.5,
            max: 10,
            grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
            ticks: { color: '#94a3b8', font: { family: "'JetBrains Mono', monospace" } }
          },
          y: {
            title: {
              display: true,
              text: 'Expected Return (%)',
              color: '#94a3b8',
              font: { size: 12, family: "'JetBrains Mono', monospace" }
            },
            grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
            ticks: { color: '#94a3b8', font: { family: "'JetBrains Mono', monospace" } }
          }
        }
      }
    });

    console.log('Chart created successfully');
  } catch (error) {
    console.error('Error creating chart:', error);
  }

  // Render custom legend
  renderScatterLegend(typeGroups, typeColors);
}


function renderScatterLegend(typeGroups, typeColors) {
  const legendContainer = document.getElementById('legend-container');
  if (!legendContainer) return;

  legendContainer.innerHTML = Object.entries(typeGroups)
    .map(([tipoId, points]) => {
      const typeConfig = typeColors[tipoId] || {
        color: 'rgba(148, 163, 184, 0.7)',
        label: 'Other',
        borderColor: '#94a3b8'
      };

      return `
        <div class="legend-item">
          <div class="legend-color" style="background-color: ${typeConfig.borderColor};"></div>
          <span class="legend-label">${typeConfig.label}</span>
          <span class="legend-count">${points.length} fondos</span>
        </div>
      `;
    })
    .join('');
}
