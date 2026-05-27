/* ============================================================
   CATÁLOGO — Productos CRUD, búsqueda, filtros, exportación
   ============================================================ */

const DEMO_PRODUCTS = [
  { id: 'P001', name: 'Pack Premium',       category: 'Destacados', price: 28000, priceOld: 35000, stock: 15, sku: 'PACK-001', desc: 'Pack completo con todos los productos estrella.',   img: '', link: '', active: true  },
  { id: 'P002', name: 'Remera Logo',         category: 'Ropa',       price:  4500, priceOld: 0,     stock: 42, sku: 'REM-001',  desc: 'Remera 100% algodón con logo bordado.',           img: '', link: '', active: true  },
  { id: 'P003', name: 'Kit Completo',        category: 'Destacados', price: 52000, priceOld: 65000, stock:  6, sku: 'KIT-001',  desc: 'Kit completo para principiantes y avanzados.',    img: '', link: '', active: true  },
  { id: 'P004', name: 'Auriculares Pro',     category: 'Tech',       price:  9200, priceOld: 0,     stock: 23, sku: 'AUR-001',  desc: 'Auriculares inalámbricos con cancelación ruido.', img: '', link: '', active: true  },
  { id: 'P005', name: 'Perfume XL',          category: 'Belleza',    price: 18700, priceOld: 22000, stock:  8, sku: 'PER-001',  desc: 'Perfume importado 100ml. Edición limitada.',      img: '', link: '', active: false }
];

let catalogProducts = [];
let catalogSearch   = '';
let catalogCatFilter = '';
let catalogSort     = 'name';
let editingProductId = null;

async function initCatalogo() {
  catalogProducts = [...DEMO_PRODUCTS, ...(APP_STATE.catalogo.products || [])];
  buildCategoryDatalist();
  renderProductGrid();
  bindCatalogoEvents();

  if (getStoreId()) {
    const dbProds = await dbGetProducts();
    if (dbProds.length) {
      catalogProducts = [...DEMO_PRODUCTS, ...dbProds];
      APP_STATE.catalogo.products = dbProds;
      buildCategoryDatalist();
      renderProductGrid();
    }
  }
}

function buildCategoryDatalist() {
  const cats = [...new Set(catalogProducts.map(p => p.category).filter(Boolean))];
  const dl   = document.getElementById('prod-cat-list');
  const sel  = document.getElementById('catalog-filter-cat');
  if (dl)  dl.innerHTML  = cats.map(c => `<option value="${c}">`).join('');
  if (sel) sel.innerHTML = `<option value="">Todas las categorías</option>` + cats.map(c => `<option value="${c}">${c}</option>`).join('');
}

function getFilteredSorted() {
  let list = [...catalogProducts];
  if (catalogSearch)    list = list.filter(p => p.name.toLowerCase().includes(catalogSearch) || p.sku?.toLowerCase().includes(catalogSearch) || p.category?.toLowerCase().includes(catalogSearch));
  if (catalogCatFilter) list = list.filter(p => p.category === catalogCatFilter);
  list.sort((a, b) => {
    if (catalogSort === 'price-asc')  return a.price - b.price;
    if (catalogSort === 'price-desc') return b.price - a.price;
    if (catalogSort === 'stock')      return b.stock - a.stock;
    return a.name.localeCompare(b.name);
  });
  return list;
}

function renderProductGrid() {
  const grid  = document.getElementById('product-grid');
  const count = document.getElementById('catalog-count');
  if (!grid) return;

  const list = getFilteredSorted();
  if (count) count.textContent = list.length + ' productos';

  if (!list.length) {
    grid.innerHTML = `<div class="catalog-empty"><i class="ti ti-package-off"></i><span>No hay productos que coincidan</span></div>`;
    return;
  }

  grid.innerHTML = list.map(p => {
    const discount = p.priceOld ? Math.round((1 - p.price / p.priceOld) * 100) : 0;
    const stockClass = p.stock === 0 ? 'stock-out' : p.stock < 5 ? 'stock-low' : 'stock-ok';
    return `
      <div class="product-card ${!p.active ? 'product-inactive' : ''}">
        <div class="product-img-wrap">
          ${p.img ? `<img src="${p.img}" alt="${p.name}" class="product-img" onerror="this.style.display='none'" />` : `<div class="product-img-placeholder"><i class="ti ti-photo"></i></div>`}
          ${discount > 0 ? `<span class="product-discount-badge">-${discount}%</span>` : ''}
          ${!p.active ? `<span class="product-inactive-badge">Inactivo</span>` : ''}
        </div>
        <div class="product-body">
          <div class="product-category">${p.category || '—'}</div>
          <div class="product-name">${p.name}</div>
          <div class="product-sku">SKU: ${p.sku || '—'}</div>
          <div class="product-price-row">
            <span class="product-price">${formatCurrency(p.price)}</span>
            ${p.priceOld ? `<span class="product-price-old">${formatCurrency(p.priceOld)}</span>` : ''}
          </div>
          <div class="product-stock ${stockClass}">
            <i class="ti ti-box"></i> Stock: ${p.stock}
          </div>
        </div>
        <div class="product-actions">
          <button class="btn-outline btn-sm" onclick="editProduct('${p.id}')"><i class="ti ti-edit"></i></button>
          <button class="btn-outline btn-sm" onclick="duplicateProduct('${p.id}')"><i class="ti ti-copy"></i></button>
          <button class="btn-outline btn-sm btn-danger-outline" onclick="deleteProduct('${p.id}')"><i class="ti ti-trash"></i></button>
        </div>
      </div>
    `;
  }).join('');
}

function openProductModal(product = null) {
  editingProductId = product?.id || null;
  const modal = document.getElementById('product-modal');
  const title = document.getElementById('product-modal-title');
  if (title) title.textContent = product ? 'Editar producto' : 'Nuevo producto';
  document.getElementById('prod-name').value      = product?.name     || '';
  document.getElementById('prod-category').value  = product?.category || '';
  document.getElementById('prod-price').value     = product?.price    || '';
  document.getElementById('prod-price-old').value = product?.priceOld || '';
  document.getElementById('prod-stock').value     = product?.stock    || '';
  document.getElementById('prod-sku').value       = product?.sku      || '';
  document.getElementById('prod-desc').value      = product?.desc     || '';
  document.getElementById('prod-img').value       = product?.img      || '';
  document.getElementById('prod-link').value      = product?.link     || '';
  document.getElementById('prod-active').checked  = product?.active !== false;
  if (modal) modal.style.display = 'flex';
}

function closeProductModal() {
  document.getElementById('product-modal').style.display = 'none';
  editingProductId = null;
}

function saveProduct() {
  const name  = document.getElementById('prod-name')?.value?.trim();
  const price = parseFloat(document.getElementById('prod-price')?.value);
  if (!name)   { showToast('El nombre es obligatorio', 'error'); return; }
  if (!price)  { showToast('El precio es obligatorio', 'error'); return; }

  const product = {
    id:       editingProductId || 'P' + Date.now(),
    name,
    category: document.getElementById('prod-category')?.value || '',
    price,
    priceOld: parseFloat(document.getElementById('prod-price-old')?.value) || 0,
    stock:    parseInt(document.getElementById('prod-stock')?.value) || 0,
    sku:      document.getElementById('prod-sku')?.value || '',
    desc:     document.getElementById('prod-desc')?.value || '',
    img:      document.getElementById('prod-img')?.value || '',
    link:     document.getElementById('prod-link')?.value || '',
    active:   document.getElementById('prod-active')?.checked
  };

  if (editingProductId) {
    const idx = catalogProducts.findIndex(p => p.id === editingProductId);
    if (idx !== -1) catalogProducts[idx] = product;
  } else {
    catalogProducts.unshift(product);
  }

  APP_STATE.catalogo.products = catalogProducts.filter(p => !DEMO_PRODUCTS.find(d => d.id === p.id));
  saveState();

  if (getStoreId()) {
    try {
      const newId = await dbSaveProduct(product);
      if (!editingProductId) product.id = newId;
    } catch (e) { console.warn('dbSaveProduct:', e); }
  }

  buildCategoryDatalist();
  renderProductGrid();
  closeProductModal();
  showToast(editingProductId ? '✓ Producto actualizado' : '✓ Producto agregado', 'success');
}

function editProduct(id) {
  const p = catalogProducts.find(p => p.id === id);
  if (p) openProductModal(p);
}

async function duplicateProduct(id) {
  const p = catalogProducts.find(p => p.id === id);
  if (!p) return;
  const copy = { ...p, id: 'P' + Date.now(), name: p.name + ' (copia)', sku: '' };
  catalogProducts.unshift(copy);
  APP_STATE.catalogo.products = catalogProducts.filter(p => !DEMO_PRODUCTS.find(d => d.id === p.id));
  saveState();
  if (getStoreId()) {
    try { await dbSaveProduct(copy); } catch (e) { console.warn('dbSaveProduct:', e); }
  }
  renderProductGrid();
  showToast('✓ Producto duplicado', 'success');
}

async function deleteProduct(id) {
  if (!confirm('¿Eliminár este producto?')) return;
  catalogProducts = catalogProducts.filter(p => p.id !== id);
  APP_STATE.catalogo.products = catalogProducts.filter(p => !DEMO_PRODUCTS.find(d => d.id === p.id));
  saveState();
  if (getStoreId() && id.length > 10) {
    try { await dbDeleteProduct(id); } catch (e) { console.warn('dbDeleteProduct:', e); }
  }
  buildCategoryDatalist();
  renderProductGrid();
  showToast('Producto eliminado', 'success');
}

function exportCatalogoCSV() {
  const list = getFilteredSorted();
  const rows = [['ID','Nombre','Categoría','Precio','Precio anterior','Stock','SKU','Activo']];
  list.forEach(p => rows.push([p.id, p.name, p.category, p.price, p.priceOld || '', p.stock, p.sku || '', p.active ? 'Sí' : 'No']));
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `catalogo-productos-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('✓ Catálogo exportado', 'success');
}

function bindCatalogoEvents() {
  document.getElementById('btn-add-product')?.addEventListener('click', () => openProductModal());
  document.getElementById('btn-save-product')?.addEventListener('click', saveProduct);
  document.getElementById('btn-cancel-product')?.addEventListener('click', closeProductModal);
  document.getElementById('btn-close-product-modal')?.addEventListener('click', closeProductModal);
  document.getElementById('btn-export-catalogo')?.addEventListener('click', exportCatalogoCSV);

  // Cerrar modal al hacer click fuera
  document.getElementById('product-modal')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeProductModal();
  });

  // Búsqueda y filtros
  const searchInput = document.getElementById('catalog-search');
  searchInput?.addEventListener('input', debounce(() => {
    catalogSearch = searchInput.value.toLowerCase();
    renderProductGrid();
  }, 250));

  document.getElementById('catalog-filter-cat')?.addEventListener('change', e => {
    catalogCatFilter = e.target.value;
    renderProductGrid();
  });

  document.getElementById('catalog-sort')?.addEventListener('change', e => {
    catalogSort = e.target.value;
    renderProductGrid();
  });
}

window.editProduct      = editProduct;
window.duplicateProduct = duplicateProduct;
window.deleteProduct    = deleteProduct;
