/* ===========================================
   MI TIENDA ARGENTINA — app.js
   =========================================== */

'use strict';

// ── Configuración ──────────────────────────────────────────────
const CONFIG = {
  whatsappNumber: '34600000000',          // ← Cambiar por tu número
  productosPorPagina: 12,
  jsonPath: 'data/productos.json',
  tiendaNombre: 'Mi Tienda Argentina',
};

// ── Emojis por categoría ────────────────────────────────────────
const EMOJIS_CAT = {
  'Yerba Mate':         ['🧉', '🌿'],
  'Mates y Accesorios': ['🫖', '☕'],
  'Alfajores':          ['🍫', '🍪'],
  'Dulces':             ['🍯', '🫙'],
  'Galletitas':         ['🍪', '🥐'],
  'Golosinas':          ['🍬', '🍭'],
  'Vinos':              ['🍷', '🍇'],
  'Bebidas':            ['🥃', '🍶'],
  'Almacén':            ['🧂', '🌽'],
  'Otros Productos':    ['📦', '🎁'],
};

// ── Estado global ───────────────────────────────────────────────
const state = {
  todos:        [],
  filtrados:    [],
  categorias:   [],
  catActiva:    'Todos',
  busqueda:     '',
  orden:        'default',
  pagina:       1,
};

// ── DOM refs ────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const DOM = {
  grid:       () => $('productosGrid'),
  categorias: () => $('categorias'),
  pagination: () => $('pagination'),
  countText:  () => $('countText'),
  search:     () => $('searchInput'),
  searchClear:() => $('searchClear'),
  sort:       () => $('sortSelect'),
  emptyState: () => $('emptyState'),
  emptyQuery: () => $('emptyQuery'),
  modal:      () => $('modalOverlay'),
  modalClose: () => $('modalClose'),
  modalContent:() => $('modalContent'),
  toast:      () => $('toast'),
  contactForm:() => $('contactForm'),
};

// ── INIT ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  iniciar();
  bindEventos();
});

async function iniciar() {
  mostrarSkeletons();
  try {
    const res  = await fetch(CONFIG.jsonPath);
    const data = await res.json();
    state.todos     = data.productos;
    state.filtrados = [...state.todos];
    buildCategorias(data.productos);
    renderizar();
  } catch (err) {
    console.error('Error al cargar productos:', err);
    DOM.grid().innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:3rem;color:#666;">
        <div style="font-size:3rem;margin-bottom:1rem;">⚠️</div>
        <p>Error al cargar el catálogo. Verificá la conexión.</p>
        <button onclick="iniciar()" style="margin-top:1rem;padding:.5rem 1.2rem;background:#1a2744;color:#fff;border:none;border-radius:99px;cursor:pointer;">Reintentar</button>
      </div>`;
  }
}

// ── Skeletons ───────────────────────────────────────────────────
function mostrarSkeletons() {
  const grid = DOM.grid();
  grid.innerHTML = Array(CONFIG.productosPorPagina).fill(0).map(() =>
    `<div class="skeleton skeleton-card"></div>`
  ).join('');
}

// ── Categorías ──────────────────────────────────────────────────
function buildCategorias(productos) {
  const cats = [...new Set(productos.map(p => p.categoria))];
  state.categorias = cats;

  const cont = DOM.categorias();
  // Mantener "Todos"
  const todosBtn = cont.querySelector('[data-cat="Todos"]');
  cats.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'cat-pill';
    btn.dataset.cat = cat;
    btn.textContent = cat;
    btn.addEventListener('click', () => seleccionarCategoria(cat, btn));
    cont.appendChild(btn);
  });
}

function seleccionarCategoria(cat, btn) {
  state.catActiva = cat;
  state.pagina    = 1;

  document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  aplicarFiltros();
}

// ── Filtros + orden ─────────────────────────────────────────────
function aplicarFiltros() {
  let lista = [...state.todos];

  // Filtro categoría
  if (state.catActiva !== 'Todos') {
    lista = lista.filter(p => p.categoria === state.catActiva);
  }

  // Filtro búsqueda
  if (state.busqueda.trim()) {
    const q = state.busqueda.toLowerCase();
    lista = lista.filter(p =>
      p.nombre.toLowerCase().includes(q) ||
      p.descripcion.toLowerCase().includes(q) ||
      p.categoria.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q)
    );
  }

  // Orden
  switch (state.orden) {
    case 'precio_asc':  lista.sort((a,b) => a.precio_venta - b.precio_venta);          break;
    case 'precio_desc': lista.sort((a,b) => b.precio_venta - a.precio_venta);          break;
    case 'nombre_asc':  lista.sort((a,b) => a.nombre.localeCompare(b.nombre));         break;
    case 'margen_desc': lista.sort((a,b) => b.margen_beneficio - a.margen_beneficio);  break;
  }

  state.filtrados = lista;
  state.pagina    = 1;
  renderizar();
}

// ── Render principal ────────────────────────────────────────────
function renderizar() {
  const total     = state.filtrados.length;
  const inicio    = (state.pagina - 1) * CONFIG.productosPorPagina;
  const pagina    = state.filtrados.slice(inicio, inicio + CONFIG.productosPorPagina);
  const totalPags = Math.ceil(total / CONFIG.productosPorPagina);

  // Empty state
  if (total === 0) {
    DOM.grid().innerHTML = '';
    DOM.emptyState().style.display = 'block';
    DOM.emptyQuery().textContent = state.busqueda || state.catActiva;
    DOM.pagination().innerHTML = '';
    DOM.countText().textContent = '0 productos';
    return;
  }

  DOM.emptyState().style.display = 'none';
  DOM.countText().textContent = `${total} producto${total !== 1 ? 's' : ''}`;

  // Grid
  DOM.grid().innerHTML = pagina.map((p, i) => crearCardHTML(p, i)).join('');

  // Paginación
  renderPaginacion(totalPags);

  // Eventos en cards
  document.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', e => {
      // No abrir modal si el clic fue en el enlace de WA
      if (e.target.closest('.btn-wa-card')) return;
      const id = card.dataset.id;
      const producto = state.todos.find(p => p.id === id);
      if (producto) abrirModal(producto);
    });
  });
}

// ── Card HTML ───────────────────────────────────────────────────
function crearCardHTML(p, index) {
  const emoji   = EMOJIS_CAT[p.categoria] || ['📦'];
  const emojiMain = emoji[0];
  const catIndex  = state.categorias.indexOf(p.categoria) % 10;
  const waMsg     = generarMsgWA(p);
  const waUrl     = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(waMsg)}`;
  const precioFmt = formatPrecio(p.precio_venta);
  const beneficio = p.margen_beneficio ? `+${formatPrecio(p.margen_beneficio)}` : '';

  return `
    <article
      class="product-card"
      role="listitem"
      data-id="${p.id}"
      style="animation-delay:${index * 0.04}s"
      aria-label="${p.nombre}"
      itemscope
      itemtype="https://schema.org/Product"
    >
      ${p.destacado ? '<div class="card-badge">⭐ Destacado</div>' : ''}

      <div class="card-img-wrap">
        <img
          class="card-img"
          src="${p.imagen}"
          alt="${p.nombre}"
          loading="lazy"
          itemprop="image"
          onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
        />
        <div class="card-img-placeholder placeholder-cat-${catIndex}" style="display:none">
          <span>${emojiMain}</span>
          <span class="label">${p.categoria}</span>
        </div>
      </div>

      <div class="card-body">
        <div class="card-category">${p.categoria}</div>
        <h3 class="card-name" itemprop="name">${p.nombre}</h3>
        <p class="card-desc" itemprop="description">${p.descripcion}</p>
      </div>

      <div class="card-footer">
        <div class="card-pricing">
          <div class="card-price-sale" itemprop="offers" itemscope itemtype="https://schema.org/Offer">
            <span itemprop="priceCurrency" content="EUR"></span>
            <span itemprop="price" content="${p.precio_venta}">${precioFmt} €</span>
          </div>
          <div class="card-price-provider">
            PVP ref.: ${formatPrecio(p.precio_proveedor)} €
            ${beneficio ? `<span class="card-price-margin">${beneficio}</span>` : ''}
          </div>
        </div>
        <div class="card-actions">
          <a
            href="${waUrl}"
            class="btn-wa-card"
            target="_blank"
            rel="noopener"
            aria-label="Solicitar ${p.nombre} por WhatsApp"
            onclick="event.stopPropagation()"
          >
            💬 Pedir
          </a>
          <button class="btn-detail" aria-label="Ver detalle">👁</button>
        </div>
      </div>
    </article>
  `;
}

// ── Paginación HTML ─────────────────────────────────────────────
function renderPaginacion(total) {
  if (total <= 1) { DOM.pagination().innerHTML = ''; return; }

  const p   = state.pagina;
  let html  = '';

  html += `<button class="page-btn" ${p === 1 ? 'disabled' : ''} onclick="cambiarPagina(${p-1})">← Ant.</button>`;

  for (let i = 1; i <= total; i++) {
    if (total > 7 && i > 2 && i < total - 1 && Math.abs(i - p) > 1) {
      if (i === 3 || i === total - 2) html += `<span style="padding:.4rem .3rem;color:#aaa">…</span>`;
      continue;
    }
    html += `<button class="page-btn ${i === p ? 'active' : ''}" onclick="cambiarPagina(${i})">${i}</button>`;
  }

  html += `<button class="page-btn" ${p === total ? 'disabled' : ''} onclick="cambiarPagina(${p+1})">Sig. →</button>`;

  DOM.pagination().innerHTML = html;
}

function cambiarPagina(n) {
  state.pagina = n;
  renderizar();
  document.getElementById('catalogo').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Modal ───────────────────────────────────────────────────────
function abrirModal(p) {
  const emoji     = (EMOJIS_CAT[p.categoria] || ['📦'])[0];
  const catIndex  = state.categorias.indexOf(p.categoria) % 10;
  const waMsg     = generarMsgWA(p);
  const waUrl     = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(waMsg)}`;

  DOM.modalContent().innerHTML = `
    <div style="position:relative">
      <img
        class="modal-img"
        src="${p.imagen}"
        alt="${p.nombre}"
        loading="lazy"
        onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
      />
      <div
        class="card-img-placeholder placeholder-cat-${catIndex}"
        style="display:none;height:280px;border-radius:20px 20px 0 0"
      >
        <span style="font-size:4rem">${emoji}</span>
        <span class="label">${p.categoria}</span>
      </div>
    </div>
    <div class="modal-body">
      <div class="modal-cat">${p.categoria}</div>
      <h2 class="modal-title">${p.nombre}</h2>
      <p class="modal-desc">${p.descripcion}</p>

      <div class="modal-pricing">
        <span class="modal-price">${formatPrecio(p.precio_venta)} €</span>
        <span class="modal-badge-margen">+${p.margen_porcentaje}% margen</span>
        ${p.destacado ? '<span style="background:#fff8e1;color:#c8a84b;border-radius:4px;padding:2px 8px;font-size:.75rem;font-weight:700;">⭐ Destacado</span>' : ''}
      </div>

      <div class="modal-info-row">
        <span>PVP referencia: <strong>${formatPrecio(p.precio_proveedor)} €</strong></span>
        <span>Beneficio est.: <strong style="color:#28a745">+${formatPrecio(p.margen_beneficio)} €</strong></span>
        <span>Disponibilidad: <strong>${p.disponibilidad}</strong></span>
        <span>Moneda: <strong>EUR</strong></span>
      </div>

      <div class="modal-actions">
        <a href="${waUrl}" class="btn btn--whatsapp" target="_blank" rel="noopener">
          💬 Solicitar por WhatsApp
        </a>
        <a href="${p.url_origen}" class="btn btn--outline" target="_blank" rel="noopener nofollow">
          Ver en proveedor
        </a>
      </div>
      <div class="modal-sku">SKU: ${p.sku} · ID: ${p.id}</div>
    </div>
  `;

  DOM.modal().style.display = 'flex';
  document.body.style.overflow = 'hidden';

  // Schema.org inline
  insertarSchemaProducto(p);
}

function cerrarModal() {
  DOM.modal().style.display = 'none';
  document.body.style.overflow = '';
}

// ── Schema.org dinámico ─────────────────────────────────────────
function insertarSchemaProducto(p) {
  const existente = document.getElementById('schema-producto-dinamico');
  if (existente) existente.remove();

  const schema = {
    '@context': 'https://schema.org',
    '@type':    'Product',
    name:         p.nombre,
    description:  p.descripcion,
    image:        p.imagen,
    sku:          p.sku,
    category:     p.categoria,
    offers: {
      '@type':       'Offer',
      price:          p.precio_venta,
      priceCurrency:  'EUR',
      availability:   p.disponibilidad === 'En stock'
                        ? 'https://schema.org/InStock'
                        : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name:    CONFIG.tiendaNombre,
      },
    },
  };

  const sc    = document.createElement('script');
  sc.type     = 'application/ld+json';
  sc.id       = 'schema-producto-dinamico';
  sc.textContent = JSON.stringify(schema);
  document.head.appendChild(sc);
}

// ── WhatsApp helper ─────────────────────────────────────────────
function generarMsgWA(p) {
  return `Hola! 👋 Estoy interesado en:\n\n` +
         `📦 *${p.nombre}*\n` +
         `💰 Precio: ${formatPrecio(p.precio_venta)} €\n` +
         `🔖 SKU: ${p.sku}\n\n` +
         `¿Podés confirmarme disponibilidad y envío? Gracias!`;
}

// ── Formato precio ──────────────────────────────────────────────
function formatPrecio(n) {
  return Number(n).toFixed(2).replace('.', ',');
}

// ── Toast ───────────────────────────────────────────────────────
function mostrarToast(msg) {
  const t = DOM.toast();
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ── Reset filtros ───────────────────────────────────────────────
function resetFiltros() {
  state.catActiva = 'Todos';
  state.busqueda  = '';
  state.orden     = 'default';
  state.pagina    = 1;

  DOM.search().value = '';
  DOM.sort().value   = 'default';
  DOM.searchClear().classList.remove('visible');

  document.querySelectorAll('.cat-pill').forEach(b => {
    b.classList.toggle('active', b.dataset.cat === 'Todos');
  });

  state.filtrados = [...state.todos];
  renderizar();
}

// ── Contact form ────────────────────────────────────────────────
function bindFormContacto() {
  const form = DOM.contactForm();
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();

    const nombre  = $('nombre').value.trim();
    const email   = $('email').value.trim();
    const pais    = $('pais').value;
    const mensaje = $('mensaje').value.trim();

    if (!nombre || !email || !mensaje) {
      mostrarToast('⚠️ Completá los campos obligatorios.');
      return;
    }

    const texto =
      `Hola! 👋 Soy *${nombre}* (${email}).\n` +
      (pais ? `País de entrega: *${pais}*.\n` : '') +
      `\n${mensaje}`;

    const url = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank', 'noopener');
    mostrarToast('✅ Redirigido a WhatsApp');
    form.reset();
  });
}

// ── Eventos globales ────────────────────────────────────────────
function bindEventos() {
  // Búsqueda con debounce
  let timer;
  DOM.search().addEventListener('input', e => {
    clearTimeout(timer);
    const val = e.target.value;
    DOM.searchClear().classList.toggle('visible', val.length > 0);
    timer = setTimeout(() => {
      state.busqueda = val;
      aplicarFiltros();
    }, 280);
  });

  // Limpiar búsqueda
  DOM.searchClear().addEventListener('click', () => {
    DOM.search().value = '';
    DOM.searchClear().classList.remove('visible');
    state.busqueda = '';
    aplicarFiltros();
    DOM.search().focus();
  });

  // Ordenar
  DOM.sort().addEventListener('change', e => {
    state.orden = e.target.value;
    aplicarFiltros();
  });

  // Categoria "Todos"
  document.querySelector('[data-cat="Todos"]').addEventListener('click', function() {
    state.catActiva = 'Todos';
    state.pagina    = 1;
    document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    aplicarFiltros();
  });

  // Modal close
  DOM.modalClose().addEventListener('click', cerrarModal);
  DOM.modal().addEventListener('click', e => {
    if (e.target === DOM.modal()) cerrarModal();
  });

  // Keyboard
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') cerrarModal();
  });

  // Hamburger (mobile search toggle)
  $('hamburger').addEventListener('click', () => {
    const sh = document.querySelector('.header__search');
    if (sh) {
      sh.style.display = sh.style.display === 'none' || !sh.style.display
        ? 'block' : 'none';
    }
  });

  // Formulario de contacto
  bindFormContacto();

  // Scroll-based header shadow
  window.addEventListener('scroll', () => {
    const header = $('header');
    if (header) header.classList.toggle('scrolled', window.scrollY > 10);
  }, { passive: true });
}

// ── Exponer al global para onclick en HTML ──────────────────────
window.cambiarPagina = cambiarPagina;
window.resetFiltros  = resetFiltros;
