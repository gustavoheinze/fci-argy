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
  const n = name.toUpperCase();
  if (n.includes('PZO FI') || n.includes('CTA CTE') || n.includes('CAJA DE AHORRO') || n.includes('CAUCION') || n.includes('EFECTIVO')) return 'LIQUIDEZ';
  if (n.includes('BONO') || n.includes('LETRA') || n.includes('LECAP') || n.includes('LEZER') || n.includes('ON ') || n.includes('TITULO') || n.includes('TZ')) return 'RENTA_FIJA';
  if (n.includes('ACCION') || n.includes('CEDEAR') || n.includes('GRUPO') || n.includes('PAMPA') || n.includes('YPF') || n.includes('VALE')) return 'RENTA_VARIABLE';
  return 'OTROS';
}

// Terminal Engine Logic
let allFunds = [];
let filteredFunds = [];
let currentPage = 1;
const itemsPerPage = 15;
let currentSort = { field: 'nombre', order: 'asc' };
let favorites = JSON.parse(localStorage.getItem('fci_favorites') || '[]');
let showFavsOnly = false;

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadFunds();
  setupEventListeners();
});

async function loadFunds() {
  try {
    const response = await fetch('/api/funds');
    allFunds = await response.json();
    applyFilters();
  } catch (error) {
    console.error('SYSTEM_ERROR:', error);
    document.getElementById('count').textContent = 'ERR: FETCH_FAILED';
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
    const f = fund.fondoPrincipal;
    const r = getRiskLevel(f.tipoRentaId).id;
    const isFav = favorites.includes(fund.id);
    return (
      (search === '' || fund.nombre.toLowerCase().includes(search) || f.nombre.toLowerCase().includes(search)) &&
      (estado === '' || f.estado === estado) &&
      (moneda === '' || (fund.monedaId || f.monedaId) === moneda) &&
      (horizonte === '' || f.horizonteViejo === horizonte) &&
      (tipoRenta === '' || f.tipoRentaId === tipoRenta) &&
      (riesgo === '' || r === riesgo) &&
      (!showFavsOnly || isFav)
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
    const risk = getRiskLevel(fund.fondoPrincipal.tipoRentaId);
    const row = document.createElement('div');
    const isFav = favorites.includes(fund.id);
    row.className = 'grid-row';
    row.innerHTML = `
      <div class="mono-cell" style="display: flex; align-items: center; gap: 0.5rem;">
        <span class="fav-heart ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); toggleFavorite('${fund.id}')">❤</span>
        #${fund.id}
      </div>
      <div class="name-cell">${fund.nombre}</div>
      <div class="type-cell">${getTipoRenta(fund.fondoPrincipal.tipoRentaId)}</div>
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

function toggleFavorite(id) {
  const index = favorites.indexOf(id);
  if (index > -1) favorites.splice(index, 1);
  else favorites.push(id);
  localStorage.setItem('fci_favorites', JSON.stringify(favorites));
  renderFunds();
}

function toggleFavsOnly() {
  showFavsOnly = !showFavsOnly;
  document.getElementById('fav-filter-btn').classList.toggle('active', showFavsOnly);
  applyFilters();
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

function showSidebar(fund) {
  const f = fund.fondoPrincipal;
  const wrap = document.getElementById('app-wrapper');
  const panel = document.getElementById('side-panel');
  const header = document.getElementById('sidebar-header');
  const body = document.getElementById('sidebar-body');

  wrap.classList.add('sidebar-open');
  panel.classList.add('open');

  header.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: baseline;">
      <h2 style="font-size: 1.5rem;">${fund.nombre}</h2>
      <span class="mono-cell" style="font-size: 0.8rem; opacity: 0.5;">[${fund.id}]</span>
    </div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
      <p class="type-cell">${f.nombre}</p>
      <div class="risk-cell risk-${getRiskLevel(f.tipoRentaId).id}">
        <span class="risk-dot"></span>
        ${getRiskLevel(f.tipoRentaId).label.toUpperCase()}
      </div>
    </div>
  `;

  const perfTooltips = {
    '1d': 'DAY: Rendimiento histórico del último día hábil procesado',
    '30d': '30D: Rendimiento acumulado de los últimos 30 días corridos',
    '7d': '7D: Rendimiento acumulado de los últimos 7 días',
    'mes': 'MTD: Rendimiento acumulado desde el primer día del mes actual',
    'anio': 'YTD: Rendimiento acumulado desde el inicio del año calendario (1 de Enero)',
    '1a': '1Y: Rendimiento total compuesto de los últimos 12 meses (Anual)'
  };

  body.innerHTML = `
    <div class="detail-section" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
       <div>
         <span class="detail-label">CLASE_ID</span>
         <div class="detail-value">#${fund.id}</div>
       </div>
       <div>
         <span class="detail-label">FONDO_ID</span>
         <div class="detail-value">#${fund.fondoId}</div>
       </div>
    </div>
    <div class="detail-section">
      <span class="detail-label">OBJECTIVE_STRATEGY</span>
      <div class="objective-box">${f.objetivo}</div>
    </div>

    ${fund.rendimientos ? `
    <div class="detail-section">
      <span class="detail-label">HISTORICAL_PERFORMANCE</span>
      <div class="performance-grid">
        ${fund.rendimientos.map(r => `
          <div class="perf-item" data-tooltip="${perfTooltips[r.periodo.toLowerCase()] || 'Rendimiento histórico'}">
            <span class="perf-period">${r.periodo.toUpperCase()}</span>
            <span class="perf-value ${parseFloat(r.rendimiento) >= 0 ? 'pos' : 'neg'}">${r.rendimiento}</span>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    ${fund.composicion ? (() => {
      // Grouping logic
      const groups = {};
      let grandTotal = 0;

      fund.composicion.forEach(c => {
        const cat = classifyAsset(c.activo);
        const val = parseFloat(c.porcentaje) || 0;
        if (!groups[cat]) groups[cat] = { items: [], total: 0 };
        groups[cat].items.push(c);
        groups[cat].total += val;
        grandTotal += val;
      });

      // Sort categories by total weighted descending
      const order = Object.keys(groups).sort((a, b) => groups[b].total - groups[a].total);

      return `
      <div class="detail-section">
        <span class="detail-label">PORTFOLIO_DIVERSIFICATION</span>
        <div class="composition-container">
          ${order.map(catKey => {
        const group = groups[catKey];
        if (!group) return '';
        const catInfo = assetCategories[catKey];
        return `
              <div class="comp-category">
                <div class="comp-cat-header" style="border-left: 3px solid ${catInfo.color}">
                  <span class="cat-label">${catInfo.icon} ${catInfo.label}</span>
                  <span class="cat-total">${group.total.toFixed(2)}%</span>
                </div>
                <div class="comp-cat-body">
                  ${group.items.sort((a, b) => parseFloat(b.porcentaje) - parseFloat(a.porcentaje)).map(c => `
                    <div class="comp-item">
                      <div class="comp-info">
                        <span class="comp-name">${c.activo}</span>
                        <span class="comp-pct">${c.porcentaje}</span>
                      </div>
                      <div class="comp-bar-bg">
                        <div class="comp-bar-fill" style="width: ${c.porcentaje}; background: ${catInfo.color}"></div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `;
      }).join('')}

          <div class="comp-grand-total">
             <span class="total-label">FUNDS_TOTAL_ALLOCATION</span>
             <span class="total-value">${grandTotal.toFixed(2)}%</span>
          </div>
        </div>
      </div>
      `;
    })() : ''}

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
      <div class="detail-section">
        <span class="detail-label">MGMT_ENTITY</span>
        <div class="detail-value">${f.gerente.nombre}</div>
      </div>
      <div class="detail-section">
        <span class="detail-label">CUSTODIAN</span>
        <div class="detail-value">${f.depositaria.nombre}</div>
      </div>
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
      <div class="detail-section">
        <span class="detail-label">SETTLEMENT</span>
        <div class="detail-value">T+${f.diasLiquidacion}</div>
      </div>
      <div class="detail-section">
        <span class="detail-label">MIN_ALLOCATION</span>
        <div class="detail-value">$${Number(fund.inversionMinima).toLocaleString('es-AR')}</div>
      </div>
    </div>
    <div class="detail-section">
      <span class="detail-label">HISTORICAL_START</span>
      <div class="detail-value">${new Date(f.inicio).toLocaleDateString()}</div>
    </div>
  `;
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

function switchView(view) {
  const terminalView = document.getElementById('view-terminal');
  const mgmtView = document.getElementById('view-management');
  const tabTerminal = document.getElementById('tab-terminal');
  const tabMgmt = document.getElementById('tab-management');

  if (view === 'management') {
    terminalView.classList.add('hidden');
    mgmtView.classList.remove('hidden');
    tabTerminal.classList.remove('active');
    tabMgmt.classList.add('active');
    loadAnalytics();
  } else {
    terminalView.classList.remove('hidden');
    mgmtView.classList.add('hidden');
    tabTerminal.classList.add('active');
    tabMgmt.classList.remove('active');
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
  document.getElementById('mgmt-liquidity').textContent = `${mgmtData.summary.marketLiquidity.toFixed(2)}%`;
  document.getElementById('mgmt-top-asset').textContent = mgmtData.topAssetsByWeight[0]?.name || '---';
  document.getElementById('mgmt-mgr-count').textContent = mgmtData.summary.analyzedFunds;

  // Populate all assets for browser
  allAssets = mgmtData.topAssetsByFrequency; // All unique assets
  filteredAssets = [...allAssets];

  renderAssetRanking(currentAssetRankMode);
  renderManagerBenchmark();
  renderInvestmentOpportunities();
  renderAssetBrowser();
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
  const top10 = mgmtData.topAssetsByWeight.slice(0, 10);

  grid.innerHTML = top10.map((asset, i) => `
    <div class="opportunity-card" onclick="exploreAsset('${asset.name.replace(/'/g, "\\'")}')">
      <div class="opp-rank">#${i + 1}</div>
      <div class="opp-name">${asset.name}</div>
      <div class="opp-stats">
        <div class="opp-weight">${asset.totalWeight.toFixed(2)}%</div>
        <div class="opp-count">${asset.frequency} FONDOS</div>
      </div>
    </div>
  `).join('');
}

function changeAssetRanking(mode) {
  currentAssetRankMode = mode;
  document.getElementById('btn-rank-freq').classList.toggle('active', mode === 'freq');
  document.getElementById('btn-rank-weight').classList.toggle('active', mode === 'weight');
  renderAssetRanking(mode);
}

function renderAssetRanking(mode) {
  const list = document.getElementById('asset-ranking-list');
  const data = mode === 'freq' ? mgmtData.topAssetsByFrequency : mgmtData.topAssetsByWeight;

  list.innerHTML = data.map((asset, i) => `
    <div class="rank-item" onclick="exploreAsset('${asset.name.replace(/'/g, "\\'")}')">
      <span class="rank-index">#${String(i + 1).padStart(2, '0')}</span>
      <span class="rank-name">${asset.name}</span>
      <span class="rank-val">${mode === 'freq' ? asset.frequency + 'F' : asset.totalWeight.toFixed(1) + '%'}</span>
    </div>
  `).join('');
}

function renderManagerBenchmark() {
  const list = document.getElementById('manager-list');
  list.innerHTML = mgmtData.managerRanking.map(mgr => `
    <div class="mgr-card">
      <div class="mgr-head">
        <span class="mgr-name">${mgr.name}</span>
        <span class="mgr-funds">${mgr.funds} FUNDS</span>
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

  // Create a combined list of all assets from the analytics data
  const allAssets = mgmtData.topAssetsByFrequency; // Using frequency list as base
  const matches = allAssets.filter(a => a.name.toLowerCase().includes(query));

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
          <span style="color: var(--primary);">PESO TOTAL: <strong>${asset.totalWeight.toFixed(2)}%</strong></span>
          <span style="color: var(--text-dim);">FRECUENCIA: <strong>${asset.frequency} fondos</strong></span>
        </div>
      </div>
      <div style="background: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: 6px; padding: 0.75rem 1rem; margin-bottom: 1rem; font-size: 0.75rem; line-height: 1.5;">
        <strong style="color: var(--accent);">EXPLICACIÓN:</strong> Este activo aparece en <strong>${asset.frequency}</strong> fondos diferentes. 
        El "peso total" (${asset.totalWeight.toFixed(2)}%) es la suma de todos los porcentajes que representa en cada fondo.
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
function renderAssetBrowser() {
  const grid = document.getElementById('asset-browser-grid');
  const displayAssets = filteredAssets.slice(0, 50); // Show first 50 to avoid overwhelming UI

  grid.innerHTML = displayAssets.map((asset, i) => `
    <div class="opportunity-card" onclick="showAssetDetails('${asset.name.replace(/'/g, "\\'")}')">
      <div class="opp-rank">#${i + 1}</div>
      <div class="opp-name">${asset.name}</div>
      <div class="opp-stats">
        <div class="opp-weight">${asset.totalWeight.toFixed(2)}%</div>
        <div class="opp-count">${asset.frequency} FONDOS</div>
      </div>
    </div>
  `).join('');

  // Show count
  const searchBox = document.getElementById('asset-browser-search');
  if (filteredAssets.length < allAssets.length) {
    searchBox.placeholder = `MOSTRANDO ${displayAssets.length} DE ${filteredAssets.length} ACTIVOS...`;
  } else {
    searchBox.placeholder = `${allAssets.length} ACTIVOS ÚNICOS - BUSCAR...`;
  }
}

function filterAssetBrowser() {
  const query = document.getElementById('asset-browser-search').value.toLowerCase();

  if (query.length === 0) {
    filteredAssets = [...allAssets];
  } else {
    filteredAssets = allAssets.filter(a => a.name.toLowerCase().includes(query));
  }

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

function getMonedaShort(id) {
  const m = { '1': 'ARS', '2': 'USD', '3': 'EUR' };
  return m[id] || '???';
}