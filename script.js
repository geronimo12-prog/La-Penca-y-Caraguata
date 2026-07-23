const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

document.body.classList.add('intro-active');
const intro = $('#intro-screen');
const closeIntro = () => {
  if (!intro) return;
  intro.classList.add('hidden');
  document.body.classList.remove('intro-active');
};
setTimeout(closeIntro, 2600);
if (intro) intro.addEventListener('click', closeIntro);

const header = $('.header');
const progress = $('.scroll-progress span');
window.addEventListener('scroll', () => {
  if (header) header.classList.toggle('scrolled', scrollY > 40);
  const max = document.documentElement.scrollHeight - innerHeight;
  if (progress) progress.style.width = max > 0 ? `${scrollY / max * 100}%` : '0%';
}, { passive: true });

function updateClock() {
  const now = new Date();
  const weekday = $('#weekday');
  const date = $('#date');
  const time = $('#time');
  if (weekday) weekday.textContent = new Intl.DateTimeFormat('es-AR', { weekday: 'long' }).format(now);
  if (date) date.textContent = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long' }).format(now);
  if (time) time.textContent = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' }).format(now);
}
updateClock();
setInterval(updateClock, 30000);

const menuButton = $('.menu-button');
const menuPanel = $('.menu-panel');
const menuClose = $('.menu-close');
function setMenu(open) {
  if (!menuPanel || !menuButton) return;
  menuPanel.classList.toggle('open', open);
  menuPanel.setAttribute('aria-hidden', open ? 'false' : 'true');
  menuButton.setAttribute('aria-expanded', open ? 'true' : 'false');
  document.body.classList.toggle('menu-open', open);
}
if (menuButton) menuButton.addEventListener('click', () => setMenu(true));
if (menuClose) menuClose.addEventListener('click', () => setMenu(false));
const backdrop = $('.menu-backdrop');
if (backdrop) backdrop.addEventListener('click', () => setMenu(false));
$$('.menu-content nav a').forEach(a => a.addEventListener('click', () => setMenu(false)));

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: .12 });
$$('.reveal').forEach(el => observer.observe(el));

const instButtons = [...$$('.institution-tabs button')];
const instPanels = [...$$('.institution-panel')];
let instIndex = 0;
let instTimer;
function setInstitution(index) {
  if (!instButtons.length || !instPanels.length) return;
  instIndex = (index + instButtons.length) % instButtons.length;
  const target = instButtons[instIndex].dataset.target;
  instButtons.forEach((b, i) => b.classList.toggle('active', i === instIndex));
  instPanels.forEach(p => p.classList.toggle('active', p.dataset.panel === target));
  const progressBar = $('#institution-progress');
  if (progressBar) progressBar.style.width = `${(instIndex + 1) / instButtons.length * 100}%`;
  clearTimeout(instTimer);
  instTimer = setTimeout(() => setInstitution(instIndex + 1), 7000);
}
instButtons.forEach((b, i) => b.addEventListener('click', () => setInstitution(i)));
setInstitution(0);

const search = $('#service-search');
if (search) {
  search.addEventListener('input', () => {
    const q = search.value.toLowerCase().trim();
    $$('#service-grid button').forEach(btn => {
      btn.classList.toggle('hidden', q && !btn.dataset.name.includes(q));
    });
  });
}

const dialog = $('#service-dialog');
$$('#service-grid button').forEach(btn => btn.addEventListener('click', () => dialog && dialog.showModal()));
if (dialog) {
  const closeButton = dialog.querySelector('button');
  if (closeButton) closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', e => {
    if (e.target === dialog) dialog.close();
  });
}

window.addEventListener('scroll', () => {
  const hero = $('.hero-image');
  if (hero && scrollY < innerHeight * 1.15) {
    hero.style.transform = `scale(1.03) translateY(${scrollY * .07}px)`;
  }
}, { passive: true });

const galleryItems = [...$$('[data-gallery-item]')].map(el => ({
  src: el.dataset.src,
  title: el.dataset.title,
  copy: el.dataset.copy,
  trigger: el
}));
const galleryDialog = $('#gallery-dialog');
const galleryImage = $('#gallery-image');
const galleryTitle = $('#gallery-title');
const galleryCopy = $('#gallery-copy');
const galleryKicker = $('#gallery-kicker');
let galleryIndex = 0;

function renderGallery(index) {
  if (!galleryItems.length || !galleryImage || !galleryTitle || !galleryCopy || !galleryKicker) return;
  galleryIndex = (index + galleryItems.length) % galleryItems.length;
  const item = galleryItems[galleryIndex];
  galleryImage.src = item.src;
  galleryImage.alt = item.title;
  galleryTitle.textContent = item.title;
  galleryCopy.textContent = item.copy;
  galleryKicker.textContent = `Galería · ${galleryIndex + 1}/${galleryItems.length}`;
}

function openGallery(index) {
  if (!galleryDialog) return;
  renderGallery(index);
  galleryDialog.showModal();
}

galleryItems.forEach((item, index) => {
  item.trigger.addEventListener('click', () => openGallery(index));
});

if (galleryDialog) {
  const closeGallery = $('.gallery-close');
  const prevButton = $('.gallery-nav.prev');
  const nextButton = $('.gallery-nav.next');
  if (closeGallery) closeGallery.addEventListener('click', () => galleryDialog.close());
  if (prevButton) prevButton.addEventListener('click', () => renderGallery(galleryIndex - 1));
  if (nextButton) nextButton.addEventListener('click', () => renderGallery(galleryIndex + 1));
  galleryDialog.addEventListener('click', e => {
    if (e.target === galleryDialog) galleryDialog.close();
  });
}

window.addEventListener('keydown', e => {
  if (!galleryDialog || !galleryDialog.open) return;
  if (e.key === 'ArrowLeft') renderGallery(galleryIndex - 1);
  if (e.key === 'ArrowRight') renderGallery(galleryIndex + 1);
});


// ==========================================================
// B19 — Noticias conectadas a Supabase
// ==========================================================
(() => {
  const PIN = '2026';
  const DEFAULT_IMAGE = 'assets/portada-hd.png';
  const SUPABASE_URL = 'https://sxohvjfoontsgzqsyouk.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_3fZv9U_m_RuGujOtSk6zYA_WatgOb_n';
  const TABLE_URL = `${SUPABASE_URL}/rest/v1/noticias`;
  const STORAGE_BUCKET = 'noticias-imagenes';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const ui = {
    loginDialog: $('#news-login-dialog'),
    adminDialog: $('#news-admin-dialog'),
    readerDialog: $('#news-reader-dialog'),
    loginForm: $('#news-login-form'),
    pin: $('#news-pin'),
    loginError: $('#news-login-error'),
    adminOpen: $('.footer-admin .news-admin-open'),
    adminClose: $('.news-admin-close'),
    readerClose: $('.news-reader-close'),
    form: $('#news-form'),
    id: $('#news-id'),
    title: $('#news-title'),
    category: $('#news-category'),
    customCategoryWrap: $('#news-custom-category-wrap'),
    customCategory: $('#news-custom-category'),
    date: $('#news-date'),
    description: $('#news-description'),
    image: $('#news-image'),
    imagePreview: $('#news-image-preview'),
    coverImage: $('#news-cover-image'),
    coverPreview: $('#news-cover-preview'),
    featured: $('#news-featured-check'),
    published: $('#news-published-check'),
    saveButton: $('#news-save-button'),
    cancelButton: $('#news-form-cancel'),
    deleteCurrent: $('#news-delete-current'),
    newButton: $('#news-new-button'),
    editorMode: $('#news-editor-mode'),
    editorTitle: $('#news-editor-title'),
    saveStatus: $('#news-save-status'),
    formMessage: $('#news-form-message'),
    adminList: $('#news-admin-list'),
    totalCount: $('#news-total-count'),
    publishedCount: $('#news-published-count'),
    search: $('#news-search'),
    statusFilter: $('#news-status-filter'),
    publicFeatured: $('#news-featured'),
    publicList: $('#news-list'),
    publicEmpty: $('#news-empty'),
    readerContent: $('#news-reader-content')
  };

  let news = [];
  let currentImage = '';
  let currentCoverImage = '';
  let pendingMainFile = null;
  let pendingCoverFile = null;
  let formDirty = false;

  const headers = (extra = {}) => ({
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    ...extra
  });

  function normalizeItem(item) {
    return {
      id: String(item.id),
      title: String(item.titulo || 'Noticia sin título'),
      category: String(item.categoria || 'Otros'),
      date: item.fecha || new Date().toISOString().slice(0, 10),
      description: String(item.descripcion || ''),
      image: item.imagen_url || DEFAULT_IMAGE,
      coverImage: item.portada_url || item.imagen_url || DEFAULT_IMAGE,
      featured: Boolean(item.destacada),
      published: item.publicada !== false,
      createdAt: item.created_at || '',
      updatedAt: item.updated_at || ''
    };
  }

  async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: headers(options.headers || {})
    });

    if (!response.ok) {
      let detail = '';
      try {
        const body = await response.json();
        detail = body.message || body.error_description || body.hint || body.details || '';
      } catch (error) {
        detail = await response.text();
      }
      throw new Error(detail || `Error ${response.status}`);
    }

    if (response.status === 204) return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  async function loadNews() {
    try {
      const rows = await apiRequest(
        `${TABLE_URL}?select=*&order=destacada.desc,fecha.desc,created_at.desc`
      );
      news = Array.isArray(rows) ? rows.map(normalizeItem) : [];
      renderPublic();
      renderAdmin();
    } catch (error) {
      console.error(error);
      news = [];
      renderPublic();
      renderAdmin();
      showMessage(`No se pudieron cargar las noticias: ${error.message}`, true);
    }
  }

  function escapeHTML(value) {
    const element = document.createElement('div');
    element.textContent = value || '';
    return element.innerHTML;
  }

  function formatDate(value) {
    if (!value) return '';
    return new Intl.DateTimeFormat('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date(value + 'T12:00:00'));
  }

  function sortedNews(items = news) {
    return [...items].sort((a, b) => {
      if (a.featured !== b.featured) return Number(b.featured) - Number(a.featured);
      return new Date(b.date) - new Date(a.date);
    });
  }

  function renderPublic() {
    const published = sortedNews(news.filter(item => item.published));
    const featured = published.find(item => item.featured) || published[0];
    const rest = featured ? published.filter(item => item.id !== featured.id) : [];

    ui.publicFeatured.innerHTML = featured ? `
      <img src="${featured.coverImage || featured.image}" alt="${escapeHTML(featured.title)}">
      <div class="news-featured-copy">
        <span>${escapeHTML(featured.category)}</span>
        <h3>${escapeHTML(featured.title)}</h3>
        <p>${escapeHTML(featured.description.slice(0, 260))}${featured.description.length > 260 ? '…' : ''}</p>
        <small>${formatDate(featured.date)}</small>
        <b class="news-card-read">Leer noticia completa →</b>
      </div>
    ` : '';

    if (featured) {
      ui.publicFeatured.dataset.newsId = featured.id;
      ui.publicFeatured.onclick = () => openReader(featured.id);
    } else {
      ui.publicFeatured.removeAttribute('data-news-id');
      ui.publicFeatured.onclick = null;
    }

    ui.publicList.innerHTML = rest.map(item => `
      <article class="news-card-beta" data-public-news="${item.id}">
        <img src="${item.coverImage || item.image}" alt="${escapeHTML(item.title)}">
        <div>
          <span>${escapeHTML(item.category)}</span>
          <h3>${escapeHTML(item.title)}</h3>
          <p>${escapeHTML(item.description.slice(0, 170))}${item.description.length > 170 ? '…' : ''}</p>
          <small>${formatDate(item.date)}</small>
          <b class="news-card-read">Leer completa →</b>
        </div>
      </article>
    `).join('');

    $$('[data-public-news]', ui.publicList).forEach(card => {
      card.addEventListener('click', () => openReader(card.dataset.publicNews));
    });

    ui.publicEmpty.hidden = published.length > 0;
  }

  function openReader(id) {
    const item = news.find(entry => entry.id === id && entry.published);
    if (!item) return;

    ui.readerContent.innerHTML = `
      <img class="news-reader-image" src="${item.image}" alt="${escapeHTML(item.title)}">
      <article class="news-reader-copy">
        <span>${escapeHTML(item.category)}</span>
        <h3>${escapeHTML(item.title)}</h3>
        <time>${formatDate(item.date)}</time>
        <p>${escapeHTML(item.description)}</p>
      </article>
    `;
    ui.readerDialog.showModal();
  }

  function renderAdmin() {
    const query = (ui.search?.value || '').trim().toLowerCase();
    const filter = ui.statusFilter?.value || 'all';

    const items = sortedNews(news).filter(item => {
      const matchesQuery = !query ||
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query);

      const matchesStatus =
        filter === 'all' ||
        (filter === 'published' && item.published) ||
        (filter === 'draft' && !item.published) ||
        (filter === 'featured' && item.featured);

      return matchesQuery && matchesStatus;
    });

    if (ui.totalCount) ui.totalCount.textContent = `${news.length} ${news.length === 1 ? 'noticia' : 'noticias'}`;
    const publishedCount = news.filter(item => item.published).length;
    if (ui.publishedCount) ui.publishedCount.textContent = `${publishedCount} publicadas`;

    if (!items.length) {
      ui.adminList.innerHTML = `
        <div class="news-admin-empty">
          <strong>No hay noticias cargadas</strong>
          <span>Entrá al Editor y creá la primera publicación.</span>
        </div>
      `;
      return;
    }

    ui.adminList.innerHTML = items.map(item => `
      <article class="news-admin-item">
        <div class="news-admin-thumb"><img src="${item.coverImage || item.image}" alt=""></div>
        <div class="news-admin-copy">
          <div class="news-admin-meta">
            <span class="news-status-badge ${item.published ? 'news-status-published' : 'news-status-draft'}">
              ${item.published ? 'Publicada' : 'Borrador'}
            </span>
            ${item.featured ? '<span class="news-status-badge news-status-featured">Destacada</span>' : ''}
            <span class="news-status-badge">${escapeHTML(item.category)} · ${formatDate(item.date)}</span>
          </div>
          <strong>${escapeHTML(item.title)}</strong>
          <p>${escapeHTML(item.description.slice(0, 150))}${item.description.length > 150 ? '…' : ''}</p>
        </div>
        <div class="news-admin-actions">
          <button class="news-edit" type="button" data-action="edit" data-id="${item.id}">Editar</button>
          <button class="news-toggle" type="button" data-action="toggle" data-id="${item.id}">
            ${item.published ? 'Despublicar' : 'Publicar'}
          </button>
          <button class="news-feature-button" type="button" data-action="feature" data-id="${item.id}">
            ${item.featured ? 'Quitar destacada' : 'Destacar'}
          </button>
          <button class="news-delete" type="button" data-action="delete" data-id="${item.id}">Borrar</button>
        </div>
      </article>
    `).join('');

    $$('[data-action]', ui.adminList).forEach(button => {
      button.addEventListener('click', async () => {
        const { action, id } = button.dataset;
        button.disabled = true;
        try {
          if (action === 'edit') editNews(id);
          if (action === 'toggle') await togglePublished(id);
          if (action === 'feature') await toggleFeatured(id);
          if (action === 'delete') await deleteNews(id);
        } finally {
          button.disabled = false;
        }
      });
    });
  }

  function switchTab(name) {
    $$('.news-admin-tab').forEach(button => {
      button.classList.toggle('active', button.dataset.newsTab === name);
    });
    $$('.news-admin-panel').forEach(panel => {
      panel.classList.toggle('active', panel.dataset.newsPanel === name);
    });
    $$('[data-open-news-panel]').forEach(button => {
      button.classList.toggle('active', button.dataset.openNewsPanel === name);
    });
  }

  function updateCategoryField() {
    const isOther = ui.category.value === 'Otros';
    ui.customCategoryWrap.hidden = !isOther;
    ui.customCategory.required = isOther;
    if (!isOther) ui.customCategory.value = '';
  }

  function setDirty(isDirty) {
    formDirty = isDirty;
    ui.saveStatus.textContent = isDirty ? 'Cambios sin guardar' : 'Sin cambios pendientes';
    ui.saveStatus.className = `news-save-status${isDirty ? ' changed' : ''}`;
  }

  function showMessage(text, error = false) {
    if (!ui.formMessage) return;
    ui.formMessage.textContent = text;
    ui.formMessage.style.color = error ? '#a42520' : '#17632d';
  }

  function updateImagePreview(source = '') {
    currentImage = source || '';
    ui.imagePreview.innerHTML = currentImage
      ? `<img src="${currentImage}" alt="Vista previa">`
      : '<span>Vista previa de la fotografía principal</span>';

    if (!currentCoverImage) {
      ui.coverPreview.innerHTML = currentImage
        ? `<img src="${currentImage}" alt="Vista previa de portada automática">`
        : '<span>La portada usará la fotografía principal</span>';
    }
  }

  function updateCoverPreview(source = '') {
    currentCoverImage = source || '';
    const effective = currentCoverImage || currentImage;
    ui.coverPreview.innerHTML = effective
      ? `<img src="${effective}" alt="Vista previa de portada">`
      : '<span>La portada usará la fotografía principal</span>';
  }

  function resetForm() {
    ui.form.reset();
    ui.id.value = '';
    ui.date.value = new Date().toISOString().slice(0, 10);
    ui.published.checked = true;
    ui.featured.checked = false;
    ui.category.value = 'Obras públicas';
    updateCategoryField();
    currentImage = '';
    currentCoverImage = '';
    pendingMainFile = null;
    pendingCoverFile = null;
    updateImagePreview('');
    updateCoverPreview('');
    ui.editorMode.textContent = 'Nueva publicación';
    ui.editorTitle.textContent = 'Crear una noticia';
    ui.saveButton.textContent = 'Guardar y publicar';
    ui.deleteCurrent.hidden = true;
    showMessage('');
    setDirty(false);
  }

  function editNews(id) {
    const item = news.find(entry => entry.id === id);
    if (!item) return;

    switchTab('editor');
    ui.id.value = item.id;
    ui.title.value = item.title;

    const existsInOptions = [...ui.category.options].some(option => option.value === item.category);
    if (existsInOptions && item.category !== 'Otros') {
      ui.category.value = item.category;
      ui.customCategory.value = '';
    } else {
      ui.category.value = 'Otros';
      ui.customCategory.value = item.category;
    }
    updateCategoryField();

    ui.date.value = item.date;
    ui.description.value = item.description;
    ui.featured.checked = item.featured;
    ui.published.checked = item.published;
    pendingMainFile = null;
    pendingCoverFile = null;
    updateImagePreview(item.image);
    updateCoverPreview(item.coverImage || '');

    ui.editorMode.textContent = 'Editando publicación';
    ui.editorTitle.textContent = item.title;
    ui.saveButton.textContent = item.published ? 'Guardar cambios' : 'Guardar borrador';
    ui.deleteCurrent.hidden = false;
    showMessage('Estás editando una noticia existente.');
    setDirty(false);
  }

  async function patchNews(id, payload) {
    await apiRequest(`${TABLE_URL}?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify(payload)
    });
  }

  async function togglePublished(id) {
    const item = news.find(entry => entry.id === id);
    if (!item) return;
    showMessage('Actualizando noticia…');
    try {
      await patchNews(id, { publicada: !item.published });
      await loadNews();
      showMessage('Estado actualizado correctamente.');
    } catch (error) {
      showMessage(`No se pudo actualizar: ${error.message}`, true);
    }
  }

  async function toggleFeatured(id) {
    const item = news.find(entry => entry.id === id);
    if (!item) return;
    showMessage('Actualizando noticia destacada…');

    try {
      if (!item.featured) {
        await apiRequest(`${TABLE_URL}?destacada=eq.true`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Prefer: 'return=minimal'
          },
          body: JSON.stringify({ destacada: false })
        });
        await patchNews(id, { destacada: true, publicada: true });
      } else {
        await patchNews(id, { destacada: false });
      }
      await loadNews();
      showMessage('Noticia destacada actualizada.');
    } catch (error) {
      showMessage(`No se pudo actualizar: ${error.message}`, true);
    }
  }

  async function deleteNews(id) {
    const item = news.find(entry => entry.id === id);
    if (!item) return;

    const accepted = confirm(
      `¿Borrar definitivamente la noticia "${item.title}"?\n\nEsta acción no se puede deshacer.`
    );
    if (!accepted) return;

    showMessage('Borrando noticia…');

    try {
      await apiRequest(`${TABLE_URL}?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' }
      });
      if (ui.id.value === id) resetForm();
      await loadNews();
      showMessage('La noticia fue borrada correctamente.');
    } catch (error) {
      showMessage(`No se pudo borrar: ${error.message}`, true);
    }
  }

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('No se pudo leer la fotografía.'));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error('El archivo no es una imagen válida.'));
        image.onload = () => {
          const maxWidth = 1500;
          const maxHeight = 1000;
          const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
          const width = Math.max(1, Math.round(image.width * scale));
          const height = Math.max(1, Math.round(image.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext('2d');
          context.drawImage(image, 0, 0, width, height);
          canvas.toBlob(
            blob => blob ? resolve(blob) : reject(new Error('No se pudo preparar la fotografía.')),
            'image/jpeg',
            0.8
          );
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function processImageInput(input, target) {
    const file = input.files[0];
    if (!file) return;

    showMessage('Preparando fotografía…');

    try {
      const compressedBlob = await compressImage(file);
      const previewURL = URL.createObjectURL(compressedBlob);

      if (target === 'main') {
        pendingMainFile = compressedBlob;
        updateImagePreview(previewURL);
      } else {
        pendingCoverFile = compressedBlob;
        updateCoverPreview(previewURL);
      }

      showMessage('Fotografía lista para subir.');
      setDirty(true);
    } catch (error) {
      showMessage(error.message, true);
      input.value = '';
    }
  }

  async function uploadImage(blob, type, newsId) {
    const path = `${newsId}/${type}-${Date.now()}.jpg`;
    await apiRequest(
      `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${path}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'image/jpeg',
          'x-upsert': 'true'
        },
        body: blob
      }
    );
    return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
  }

  async function submitForm(event) {
    event.preventDefault();

    const title = ui.title.value.trim();
    const description = ui.description.value.trim();
    const customCategory = ui.customCategory.value.trim();
    const category = ui.category.value === 'Otros' ? customCategory : ui.category.value;

    if (!title || !description || !ui.date.value || !category) {
      showMessage('Completá el título, la categoría, la fecha y la descripción.', true);
      return;
    }

    ui.saveButton.disabled = true;
    ui.saveButton.textContent = 'Guardando…';
    showMessage('Subiendo información a Supabase…');

    const id = ui.id.value || crypto.randomUUID();
    const old = news.find(item => item.id === id);

    try {
      if (ui.featured.checked) {
        await apiRequest(`${TABLE_URL}?destacada=eq.true`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Prefer: 'return=minimal'
          },
          body: JSON.stringify({ destacada: false })
        });
      }

      let finalMainImage = old?.image || DEFAULT_IMAGE;
      let finalCoverImage = old?.coverImage || '';

      if (pendingMainFile) {
        finalMainImage = await uploadImage(pendingMainFile, 'principal', id);
      } else if (currentImage && !currentImage.startsWith('blob:')) {
        finalMainImage = currentImage;
      }

      if (pendingCoverFile) {
        finalCoverImage = await uploadImage(pendingCoverFile, 'portada', id);
      } else if (currentCoverImage && !currentCoverImage.startsWith('blob:')) {
        finalCoverImage = currentCoverImage;
      }

      if (!finalCoverImage) finalCoverImage = finalMainImage;

      const payload = {
        id,
        titulo: title,
        categoria: category,
        descripcion: description,
        fecha: ui.date.value,
        imagen_url: finalMainImage,
        portada_url: finalCoverImage,
        destacada: ui.featured.checked,
        publicada: ui.published.checked
      };

      if (old) {
        await patchNews(id, payload);
      } else {
        await apiRequest(TABLE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Prefer: 'return=minimal'
          },
          body: JSON.stringify(payload)
        });
      }

      await loadNews();
      const saved = news.find(item => item.id === id);

      ui.id.value = id;
      pendingMainFile = null;
      pendingCoverFile = null;
      currentImage = saved?.image || finalMainImage;
      currentCoverImage = saved?.coverImage || finalCoverImage;
      ui.editorMode.textContent = 'Publicación guardada';
      ui.editorTitle.textContent = title;
      ui.deleteCurrent.hidden = false;
      ui.saveStatus.textContent = 'Guardado en Supabase';
      ui.saveStatus.className = 'news-save-status saved';
      showMessage(ui.published.checked
        ? 'Noticia guardada y visible desde todos los dispositivos.'
        : 'Noticia guardada como borrador en Supabase.');

      formDirty = false;
      setTimeout(() => {
        ui.saveStatus.textContent = 'Sin cambios pendientes';
        ui.saveStatus.className = 'news-save-status';
      }, 2200);
    } catch (error) {
      console.error(error);
      showMessage(`No se pudo guardar: ${error.message}`, true);
    } finally {
      ui.saveButton.disabled = false;
      ui.saveButton.textContent = ui.published.checked ? 'Guardar cambios' : 'Guardar borrador';
    }
  }

  ui.adminOpen?.addEventListener('click', () => {
    ui.pin.value = '';
    ui.loginError.textContent = '';
    ui.loginDialog.showModal();
  });

  ui.loginForm?.addEventListener('submit', async event => {
    event.preventDefault();

    if (ui.pin.value !== PIN) {
      ui.loginError.textContent = 'PIN incorrecto.';
      return;
    }

    ui.loginDialog.close();
    await loadNews();
    switchTab('editor');
    ui.adminDialog.showModal();
    requestAnimationFrame(() => {
      ui.adminDialog.scrollTop = 0;
      const content = ui.adminDialog.querySelector('.news-admin-content');
      if (content) content.scrollTop = 0;
      ui.title?.scrollIntoView({ block: 'center' });
    });
  });

  $('.news-dialog-close')?.addEventListener('click', () => ui.loginDialog.close());
  ui.adminClose?.addEventListener('click', () => ui.adminDialog.close());
  ui.readerClose?.addEventListener('click', () => ui.readerDialog.close());

  $$('.news-admin-tab').forEach(button => {
    button.addEventListener('click', () => switchTab(button.dataset.newsTab));
  });

  ui.newButton?.addEventListener('click', () => {
    switchTab('editor');
    resetForm();
  });

  ui.cancelButton?.addEventListener('click', () => {
    if (formDirty && !confirm('Hay cambios sin guardar. ¿Limpiar igualmente?')) return;
    resetForm();
  });

  ui.deleteCurrent?.addEventListener('click', () => {
    if (ui.id.value) deleteNews(ui.id.value);
  });

  ui.category?.addEventListener('change', () => {
    updateCategoryField();
    setDirty(true);
  });

  ui.description?.addEventListener('input', () => setDirty(true));

  [ui.title, ui.customCategory, ui.date, ui.featured, ui.published].forEach(control => {
    control?.addEventListener('input', () => setDirty(true));
    control?.addEventListener('change', () => {
      if (control === ui.published) {
        ui.saveButton.textContent = ui.published.checked ? 'Guardar y publicar' : 'Guardar borrador';
      }
      setDirty(true);
    });
  });

  ui.image?.addEventListener('change', () => processImageInput(ui.image, 'main'));
  ui.coverImage?.addEventListener('change', () => processImageInput(ui.coverImage, 'cover'));
  ui.form?.addEventListener('submit', submitForm);
  ui.search?.addEventListener('input', renderAdmin);
  ui.statusFilter?.addEventListener('change', renderAdmin);

  resetForm();
  loadNews();
})();




// ==========================================================
// B18 FINAL — botones flotantes movibles
// ==========================================================
(() => {
  function makeDraggable(element, storageKey) {
    if (!element) return;

    let dragging = false;
    let moved = false;
    let offsetX = 0;
    let offsetY = 0;

    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (saved && Number.isFinite(saved.left) && Number.isFinite(saved.top)) {
        element.style.left = `${saved.left}px`;
        element.style.top = `${saved.top}px`;
        element.style.right = 'auto';
        element.style.bottom = 'auto';
      }
    } catch (error) {}

    element.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;

      const rect = element.getBoundingClientRect();
      dragging = true;
      moved = false;
      offsetX = event.clientX - rect.left;
      offsetY = event.clientY - rect.top;

      element.classList.add('dragging');
      element.setPointerCapture?.(event.pointerId);
    });

    element.addEventListener('pointermove', event => {
      if (!dragging) return;

      const limitLeft = Math.max(8, window.innerWidth - element.offsetWidth - 8);
      const limitTop = Math.max(8, window.innerHeight - element.offsetHeight - 8);

      const left = Math.max(8, Math.min(event.clientX - offsetX, limitLeft));
      const top = Math.max(8, Math.min(event.clientY - offsetY, limitTop));

      element.style.left = `${left}px`;
      element.style.top = `${top}px`;
      element.style.right = 'auto';
      element.style.bottom = 'auto';
      moved = true;
      event.preventDefault();
    });

    function stopDragging(event) {
      if (!dragging) return;

      dragging = false;
      element.classList.remove('dragging');

      try {
        element.releasePointerCapture?.(event.pointerId);
      } catch (error) {}

      if (moved) {
        const rect = element.getBoundingClientRect();
        localStorage.setItem(storageKey, JSON.stringify({
          left: Math.round(rect.left),
          top: Math.round(rect.top)
        }));
      }
    }

    element.addEventListener('pointerup', stopDragging);
    element.addEventListener('pointercancel', stopDragging);

    element.addEventListener('click', event => {
      if (!moved) return;
      event.preventDefault();
      event.stopPropagation();
      moved = false;
    }, true);

    window.addEventListener('resize', () => {
      if (!element.style.left || !element.style.top) return;

      const rect = element.getBoundingClientRect();
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - element.offsetWidth - 8));
      const top = Math.max(8, Math.min(rect.top, window.innerHeight - element.offsetHeight - 8));

      element.style.left = `${left}px`;
      element.style.top = `${top}px`;
      localStorage.setItem(storageKey, JSON.stringify({
        left: Math.round(left),
        top: Math.round(top)
      }));
    });
  }

  makeDraggable(document.querySelector('.floating-news'), 'floatingNewsPositionB18Final');
  makeDraggable(document.querySelector('.floating-whatsapp'), 'floatingWhatsAppPositionB18Final');
})();


// ==========================================================
// B18 FINAL — acceso directo a editar y borrar
// ==========================================================
(() => {
  const managerButtons = [...document.querySelectorAll('[data-open-news-panel]')];
  const managerCount = document.querySelector('#news-manager-count');

  function openManagerPanel(name) {
    document.querySelectorAll('.news-admin-tab').forEach(button => {
      button.classList.toggle('active', button.dataset.newsTab === name);
    });

    document.querySelectorAll('.news-admin-panel').forEach(panel => {
      panel.classList.toggle('active', panel.dataset.newsPanel === name);
    });

    managerButtons.forEach(button => {
      button.classList.toggle('active', button.dataset.openNewsPanel === name);
    });

    const content = document.querySelector('.news-admin-content');
    if (content) content.scrollTo({ top: 0, behavior: 'smooth' });
  }

  managerButtons.forEach(button => {
    button.addEventListener('click', () => {
      openManagerPanel(button.dataset.openNewsPanel);
    });
  });

  document.querySelectorAll('.news-admin-tab').forEach(button => {
    button.addEventListener('click', () => {
      const name = button.dataset.newsTab;
      managerButtons.forEach(managerButton => {
        managerButton.classList.toggle('active', managerButton.dataset.openNewsPanel === name);
      });
    });
  });

  function updateManagerCount() {
    const totalText = document.querySelector('#news-total-count')?.textContent || '0';
    const match = totalText.match(/\d+/);
    if (managerCount) managerCount.textContent = match ? match[0] : '0';
  }

  const observerTarget = document.querySelector('#news-total-count');
  if (observerTarget) {
    const observer = new MutationObserver(updateManagerCount);
    observer.observe(observerTarget, { childList: true, characterData: true, subtree: true });
  }

  updateManagerCount();

  // Al terminar de editar o crear, la lista queda disponible desde el botón superior.
  document.addEventListener('click', event => {
    const editButton = event.target.closest('[data-action="edit"]');
    if (editButton) {
      managerButtons.forEach(button => {
        button.classList.toggle('active', button.dataset.openNewsPanel === 'editor');
      });
    }
  });
})();
