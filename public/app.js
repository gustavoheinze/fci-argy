// Fetch funds data and handle filtering/sorting
let allFunds = [];
let filteredFunds = [];
let currentPage = 1;
const itemsPerPage = 10;

async function loadFunds() {
  try {
    const response = await fetch('/api/funds');
    allFunds = await response.json();
    filteredFunds = [...allFunds];
    renderFunds();
    updateCount();
  } catch (error) {
    console.error('Error loading funds:', error);
    document.getElementById('count').textContent = 'Error cargando fondos';
  }
}

function renderFunds() {
  const fundsList = document.getElementById('funds-list');
  fundsList.innerHTML = '';

  // Calcular índices para paginación
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedFunds = filteredFunds.slice(startIndex, endIndex);

  paginatedFunds.forEach(fund => {
    const item = document.createElement('div');
    item.className = 'fund-item';
    item.style.cursor = 'pointer';

    const estadoClass = fund.fondoPrincipal.estado === '1' ? 'activo' : 'inactivo';
    const estadoText = fund.fondoPrincipal.estado === '1' ? '✅ Activo' : '❌ Inactivo';
    const moneda = getMoneda(fund.monedaId || fund.fondoPrincipal.monedaId);

    item.innerHTML = `
      <div class="fund-info">
        <h3 class="fund-name">${fund.nombre}</h3>
        <p style="margin: 0; color: #FFD60A; font-size: 0.85rem; font-weight: 600;">${fund.fondoPrincipal.nombre}</p>
        <div class="fund-meta">
          <div class="fund-meta-item">
            <span class="fund-meta-label">Código CNV</span>
            <span class="fund-meta-value">${fund.fondoPrincipal.codigoCNV}</span>
          </div>
          <div class="fund-meta-item">
            <span class="fund-meta-label">Estado</span>
            <span class="fund-status ${estadoClass}">${estadoText}</span>
          </div>
          <div class="fund-meta-item">
            <span class="fund-meta-label">Moneda</span>
            <span class="fund-meta-value">${moneda}</span>
          </div>
          <div class="fund-meta-item">
            <span class="fund-meta-label">Horizonte</span>
            <span class="fund-meta-value">${fund.fondoPrincipal.horizonteViejo}</span>
          </div>
          <div class="fund-meta-item">
            <span class="fund-meta-label">Tipo de Renta</span>
            <span class="fund-meta-value">${getTipoRenta(fund.fondoPrincipal.tipoRentaId)}</span>
          </div>
          <div class="fund-meta-item">
            <span class="fund-meta-label">Inversión Mínima</span>
            <span class="fund-meta-value">$${fund.inversionMinima}</span>
          </div>
        </div>
      </div>
      <div class="fund-arrow">→</div>
    `;

    item.addEventListener('click', () => showDetailModal(fund));
    fundsList.appendChild(item);
  });

  updatePagination();
}

function getTipoRenta(id) {
  const tipos = {
    '4': 'Renta Fija',
    '5': 'Renta Variable',
  };
  return tipos[id] || `Tipo ${id}`;
}

function getMoneda(id) {
  const monedas = {
    '1': '💵 Pesos ARS',
    '2': '🇺🇸 Dólares USD',
    '3': '€ Euros EUR',
  };
  return monedas[id] || `Moneda ${id}`;
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function showDetailModal(fund) {
  const modal = document.getElementById('modal');
  const modalBody = document.getElementById('modal-body');
  
  const fondo = fund.fondoPrincipal;
  const estadoText = fondo.estado === '1' ? '✅ Activo' : '❌ Inactivo';
  const moneda = getMoneda(fund.monedaId || fondo.monedaId);

  let gerenteHTML = '';
  if (fondo.gerente) {
    gerenteHTML = `
      <div class="gerente-section">
        <h3>📋 Sociedad Gerente</h3>
        <div class="section-grid">
          <div class="detail-item">
            <div class="detail-label">Nombre</div>
            <div class="detail-value">${fondo.gerente.nombre}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Código CNV</div>
            <div class="detail-value">${fondo.gerente.codigoCNV}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">CUIT</div>
            <div class="detail-value">${fondo.gerente.cuit}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Presidente</div>
            <div class="detail-value">${fondo.gerente.presidente}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Localidad</div>
            <div class="detail-value">${fondo.gerente.localidad}, ${fondo.gerente.provincia}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Dirección</div>
            <div class="detail-value">${fondo.gerente.calle} ${fondo.gerente.numero}, ${fondo.gerente.codigoPostal}</div>
          </div>
        </div>
      </div>
    `;
  }

  let depositariaHTML = '';
  if (fondo.depositaria) {
    depositariaHTML = `
      <div class="depositaria-section">
        <h3>🏦 Sociedad Depositaria</h3>
        <div class="section-grid">
          <div class="detail-item">
            <div class="detail-label">Nombre</div>
            <div class="detail-value">${fondo.depositaria.nombre}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Código CNV</div>
            <div class="detail-value">${fondo.depositaria.codigoCNV}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Localidad</div>
            <div class="detail-value">${fondo.depositaria.localidad}, ${fondo.depositaria.provincia}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Dirección</div>
            <div class="detail-value">${fondo.depositaria.calle} ${fondo.depositaria.numero}, ${fondo.depositaria.codigoPostal}</div>
          </div>
        </div>
      </div>
    `;
  }

  modalBody.innerHTML = `
    <div class="modal-detail-header">
      <h2 class="modal-detail-title">${fund.nombre}</h2>
      <p class="modal-detail-subtitle">${fondo.nombre} • CNV: ${fondo.codigoCNV}</p>
    </div>

    <div class="modal-detail-grid">
      <div class="detail-item">
        <div class="detail-label">Estado</div>
        <div class="detail-value"><span class="fund-status ${fondo.estado === '1' ? 'activo' : 'inactivo'}">${estadoText}</span></div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Moneda</div>
        <div class="detail-value">${moneda}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Inversión Mínima</div>
        <div class="detail-value">$${fund.inversionMinima}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Horizonte</div>
        <div class="detail-value">${fondo.horizonteViejo}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Tipo de Renta</div>
        <div class="detail-value">${getTipoRenta(fondo.tipoRentaId)}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Días de Liquidación</div>
        <div class="detail-value">${fondo.diasLiquidacion} días</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Fecha de Inicio</div>
        <div class="detail-value">${formatDate(fondo.inicio)}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Última Actualización</div>
        <div class="detail-value">${formatDate(fondo.updatedAt)}</div>
      </div>
      <div class="detail-objetivo">
        <div class="detail-label">Objetivo del Fondo</div>
        <div class="detail-value">${fondo.objetivo}</div>
      </div>
    </div>

    <div style="margin: 2rem 0; padding: 1.5rem; background: linear-gradient(135deg, rgba(255, 0, 110, 0.05), rgba(255, 214, 10, 0.05)); border-left: 4px solid #FFD60A; border-radius: 8px;">
      <h3 style="margin-top: 0; color: #FFD60A; font-size: 1.1rem; text-transform: uppercase; letter-spacing: 1px; font-weight: 900;">💰 Honorarios</h3>
      <div class="section-grid">
        <div class="detail-item">
          <div class="detail-label">Ingreso</div>
          <div class="detail-value">${fund.honorarioIngreso}%</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Rescate</div>
          <div class="detail-value">${fund.honorarioRescate}%</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Transferencia</div>
          <div class="detail-value">${fund.honorarioTransferencia}%</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Administración Gerente</div>
          <div class="detail-value">${fund.honorarioAdministracionGerente}%</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Administración Depositaria</div>
          <div class="detail-value">${fund.honorarioAdministracionDepositaria}%</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Gasto Ordinario de Gestión</div>
          <div class="detail-value">${fund.gastoOrdinarioGestion}%</div>
        </div>
      </div>
    </div>

    ${gerenteHTML}
    ${depositariaHTML}

    <div class="detail-item">
      <div class="detail-label">Clasificación</div>
      <div class="detail-value">${fondo.clasificacionVieja}</div>
    </div>
  `;

  modal.classList.remove('hidden');
}

function closeModal() {
  const modal = document.getElementById('modal');
  modal.classList.add('hidden');
}

function updateCount() {
  document.getElementById('count').textContent = `📊 Mostrando ${filteredFunds.length} de ${allFunds.length} fondos`;
}

function updatePagination() {
  const totalPages = Math.ceil(filteredFunds.length / itemsPerPage);
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const pageInfo = document.getElementById('page-info');

  // Actualizar info de página
  pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;

  // Desabilitar botones según corresponda
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages || totalPages === 0;
}

function goToPage(page) {
  const totalPages = Math.ceil(filteredFunds.length / itemsPerPage);
  if (page >= 1 && page <= totalPages) {
    currentPage = page;
    renderFunds();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function applyFilters() {
  const search = document.getElementById('search').value.toLowerCase();
  const estado = document.getElementById('estado').value;
  const horizonte = document.getElementById('horizonte').value;
  const tipoRenta = document.getElementById('tipoRenta').value;
  const sortBy = document.getElementById('sort').value;

  filteredFunds = allFunds.filter(fund => {
    const fondo = fund.fondoPrincipal;
    return (
      (search === '' || fund.nombre.toLowerCase().includes(search) || fondo.nombre.toLowerCase().includes(search)) &&
      (estado === '' || fondo.estado === estado) &&
      (horizonte === '' || fondo.horizonteViejo === horizonte) &&
      (tipoRenta === '' || fondo.tipoRentaId === tipoRenta)
    );
  });

  // Sort
  filteredFunds.sort((a, b) => {
    const aFondo = a.fondoPrincipal;
    const bFondo = b.fondoPrincipal;
    
    if (sortBy === 'nombre') {
      return a.nombre.localeCompare(b.nombre);
    } else if (sortBy === 'inicio') {
      return new Date(aFondo.inicio) - new Date(bFondo.inicio);
    } else if (sortBy === 'updatedAt') {
      return new Date(aFondo.updatedAt) - new Date(bFondo.updatedAt);
    }
    return 0;
  });

  // Resetear a página 1 cuando se aplican filtros
  currentPage = 1;
  renderFunds();
  updateCount();
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  loadFunds();
  
  const searchInput = document.getElementById('search');
  const estadoSelect = document.getElementById('estado');
  const horizonteSelect = document.getElementById('horizonte');
  const tipoRentaSelect = document.getElementById('tipoRenta');
  const sortSelect = document.getElementById('sort');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');

  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (estadoSelect) estadoSelect.addEventListener('change', applyFilters);
  if (horizonteSelect) horizonteSelect.addEventListener('change', applyFilters);
  if (tipoRentaSelect) tipoRentaSelect.addEventListener('change', applyFilters);
  if (sortSelect) sortSelect.addEventListener('change', applyFilters);

  // Paginación
  if (prevBtn) prevBtn.addEventListener('click', () => goToPage(currentPage - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => goToPage(currentPage + 1));

  // Modal close handlers
  const modal = document.getElementById('modal');
  const modalClose = document.querySelector('.modal-close');
  
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target.id === 'modal') {
        closeModal();
      }
    });
  }
  
  if (modalClose) {
    modalClose.addEventListener('click', closeModal);
  }
});