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
    email: $('#news-email'),
    password: $('#news-password'),
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
  let accessToken = sessionStorage.getItem('news_supabase_token') || '';

  const headers = (extra = {}, authenticated = false) => ({
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${authenticated && accessToken ? accessToken : SUPABASE_KEY}`,
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

  async function apiRequest(url, options = {}, authenticated = false) {
    const response = await fetch(url, {
      ...options,
      headers: headers(options.headers || {}, authenticated)
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
    }, true);
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
        }, true);
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
      }, true);
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
      },
      true
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
        }, true);
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
        }, true);
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
      showMessage(`No se pudo guardar: ${error.message}. Verificá que hayas iniciado sesión con el usuario autorizado.`, true);
    } finally {
      ui.saveButton.disabled = false;
      ui.saveButton.textContent = ui.published.checked ? 'Guardar cambios' : 'Guardar borrador';
    }
  }

  async function signInWithSupabase(email, password) {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    if (!response.ok || !data.access_token) {
      throw new Error(data.error_description || data.msg || 'Correo o contraseña incorrectos.');
    }

    accessToken = data.access_token;
    sessionStorage.setItem('news_supabase_token', accessToken);
    return data;
  }

  ui.adminOpen?.addEventListener('click', () => {
    ui.email.value = 'gerocancian2@gmail.com';
    ui.password.value = '';
    ui.loginError.textContent = '';
    ui.loginDialog.showModal();
  });

  ui.loginForm?.addEventListener('submit', async event => {
    event.preventDefault();
    ui.loginError.textContent = '';

    const email = ui.email.value.trim().toLowerCase();
    const password = ui.password.value;

    try {
      const session = await signInWithSupabase(email, password);
      const sessionEmail = String(session.user?.email || '').toLowerCase();

      if (sessionEmail !== 'gerocancian2@gmail.com') {
        accessToken = '';
        sessionStorage.removeItem('news_supabase_token');
        throw new Error('Este correo no está autorizado para administrar.');
      }

      ui.loginDialog.close();
      await loadNews();
      switchTab('editor');
      ui.adminDialog.showModal();

      requestAnimationFrame(() => {
        ui.adminDialog.scrollTop = 0;
        const content = ui.adminDialog.querySelector('.news-admin-content');
        if (content) content.scrollTop = 0;
      });
    } catch (error) {
      ui.loginError.textContent = error.message;
    }
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


// ==========================================================
// B21 — Portal ciudadano, mejoras de noticias y gestión general
// ==========================================================
(() => {
  const SUPABASE_URL = 'https://sxohvjfoontsgzqsyouk.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_3fZv9U_m_RuGujOtSk6zYA_WatgOb_n';
  const ADMIN_EMAIL = 'gerocancian2@gmail.com';
  const token = () => sessionStorage.getItem('news_supabase_token') || '';
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];

  const publicHeaders = {'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`};
  const authHeaders = () => ({'apikey':SUPABASE_KEY,'Authorization':`Bearer ${token()}`});

  async function request(path, options={}, auth=false){
    const response = await fetch(`${SUPABASE_URL}${path}`, {
      ...options,
      headers:{...(auth?authHeaders():publicHeaders),...(options.headers||{})}
    });
    if(!response.ok){
      let data={};
      try{data=await response.json()}catch(e){}
      throw new Error(data.message||data.error_description||data.hint||`Error ${response.status}`);
    }
    if(response.status===204)return null;
    const text=await response.text();
    return text?JSON.parse(text):null;
  }

  const escapeHTML = value => {
    const div=document.createElement('div');
    div.textContent=value||'';
    return div.innerHTML;
  };

  const formatDate = value => value ? new Intl.DateTimeFormat('es-AR',{dateStyle:'long',timeStyle:value.includes('T')?'short':undefined}).format(new Date(value)) : '';

  function getAlertEndDate(alert) {
    if (!alert?.fecha || !alert?.hora_hasta) return null;

    const [year, month, day] = String(alert.fecha).split('-').map(Number);
    const [hour, minute, second = 0] = String(alert.hora_hasta)
      .slice(0, 8)
      .split(':')
      .map(Number);

    if (![year, month, day, hour, minute].every(Number.isFinite)) return null;

    // Se crea expresamente en la hora local del dispositivo.
    const end = new Date(year, month - 1, day, hour, minute, second, 0);
    return Number.isNaN(end.getTime()) ? null : end;
  }

  function alertIsStillActive(alert, now = new Date()) {
    if (!alert || alert.activo === false) return false;

    // Sin fecha u hora final, queda activo hasta desactivarlo manualmente.
    const end = getAlertEndDate(alert);
    if (!end) return true;

    return now.getTime() < end.getTime();
  }

  // Estado de conexión
  const saveStatus=$('#news-save-status');
  function paintConnection(){
    if(!saveStatus)return;
    saveStatus.classList.add('connection-pill');
    saveStatus.classList.toggle('offline',!navigator.onLine);
    if(!navigator.onLine) saveStatus.textContent='Sin conexión';
  }
  addEventListener('online',()=>{paintConnection();location.reload()});
  addEventListener('offline',paintConnection);
  paintConnection();

  // Cerrar sesión
  $('#news-logout-button')?.addEventListener('click', async()=>{
    try{
      if(token()) await request('/auth/v1/logout',{method:'POST'},true);
    }catch(e){}
    sessionStorage.removeItem('news_supabase_token');
    $('#news-admin-dialog')?.close();
    alert('Sesión cerrada correctamente.');
  });

  // Recuperar contraseña
  $('#news-reset-password')?.addEventListener('click', async event => {
    event.preventDefault();

    const button = event.currentTarget;
    const message = $('#news-login-error');
    const email = ($('#news-email')?.value || ADMIN_EMAIL).trim().toLowerCase();

    if (!email || !email.includes('@')) {
      message.textContent = 'Escribí un correo válido.';
      return;
    }

    button.disabled = true;
    button.textContent = 'Enviando correo…';
    message.textContent = '';

    try {
      const redirectTo = `${location.origin}${location.pathname}`;
      const response = await fetch(
        `${SUPABASE_URL}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`,
        {
          method: 'POST',
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email })
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error_description ||
          data.msg ||
          data.message ||
          'Supabase rechazó la solicitud.'
        );
      }

      message.textContent =
        'Correo enviado. Revisá Recibidos, Spam y Correo no deseado.';
    } catch (error) {
      message.textContent = `No se pudo enviar el correo: ${error.message}`;
    } finally {
      button.disabled = false;
      button.textContent = '¿Olvidaste tu contraseña?';
    }
  });

  // Vista previa
  const previewDialog=$('#news-preview-dialog');
  $('#news-preview-button')?.addEventListener('click',()=>{
    const title=$('#news-title')?.value.trim()||'Título de la noticia';
    const category=$('#news-category')?.value||'Comunicado';
    const description=$('#news-description')?.value.trim()||'La descripción completa aparecerá en este lugar.';
    const date=$('#news-date')?.value;
    const image=$('#news-image-preview img')?.src||$('#news-cover-preview img')?.src||'assets/portada-hd.png';
    $('#news-preview-content').innerHTML=`
      <img class="news-reader-image" src="${image}" alt="">
      <article class="news-reader-copy">
        <span>${escapeHTML(category)}</span>
        <h3>${escapeHTML(title)}</h3>
        <time>${date?formatDate(date+'T12:00:00'):''}</time>
        <p>${escapeHTML(description)}</p>
        <div class="news-reader-share"><button type="button">Vista previa — todavía no publicada</button></div>
      </article>`;
    previewDialog?.showModal();
  });
  $('.news-preview-close')?.addEventListener('click',()=>previewDialog?.close());

  // Borrador automático local
  const draftFields=['news-title','news-category','news-custom-category','news-date','news-description','news-featured-check','news-published-check','news-publish-at'];
  let autosaveTimer;
  function collectDraft(){
    const data={};
    draftFields.forEach(id=>{
      const el=$('#'+id);
      if(!el)return;
      data[id]=el.type==='checkbox'?el.checked:el.value;
    });
    return data;
  }
  function saveDraftLocal(){
    const id=$('#news-id')?.value||'new';
    localStorage.setItem(`news-autodraft-${id}`,JSON.stringify({...collectDraft(),savedAt:new Date().toISOString()}));
    if(saveStatus){
      saveStatus.textContent=`Borrador automático ${new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})}`;
      saveStatus.classList.add('saved');
    }
  }
  draftFields.forEach(id=>{
    $('#'+id)?.addEventListener('input',()=>{
      clearTimeout(autosaveTimer);
      autosaveTimer=setTimeout(saveDraftLocal,1200);
    });
  });
  $('#news-new-button')?.addEventListener('click',()=>{
    const saved=localStorage.getItem('news-autodraft-new');
    if(!saved)return;
    const data=JSON.parse(saved);
    if(confirm('Hay un borrador automático sin publicar. ¿Querés recuperarlo?')){
      draftFields.forEach(id=>{
        const el=$('#'+id);
        if(!el||data[id]===undefined)return;
        if(el.type==='checkbox')el.checked=data[id]; else el.value=data[id];
      });
    }
  });

  // Programación: si hay fecha futura, forzar borrador y guardar metadata.
  const newsForm=$('#news-form');
  newsForm?.addEventListener('submit', async()=>{
    const publishAt=$('#news-publish-at')?.value;
    if(publishAt && new Date(publishAt)>new Date()){
      $('#news-published-check').checked=false;
      setTimeout(async()=>{
        const id=$('#news-id')?.value;
        if(!id||!token())return;
        try{
          await request(`/rest/v1/noticias?id=eq.${encodeURIComponent(id)}`,{
            method:'PATCH',
            headers:{'Content-Type':'application/json','Prefer':'return=minimal'},
            body:JSON.stringify({publicar_en:new Date(publishAt).toISOString()})
          },true);
        }catch(e){console.warn(e)}
      },1800);
    }
  },true);

  // Compartir en lector
  const readerContent=$('#news-reader-content');
  const shareObserver=new MutationObserver(()=>{
    if(!readerContent||!readerContent.querySelector('.news-reader-copy')||readerContent.querySelector('.news-reader-share'))return;
    const title=readerContent.querySelector('h3')?.textContent||'Noticia comunal';
    const share=document.createElement('div');
    share.className='news-reader-share';
    const url=location.href.split('#')[0]+'#noticias';
    share.innerHTML=`
      <a target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(title+' '+url)}">WhatsApp</a>
      <a target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}">Facebook</a>
      <button type="button" data-copy-news>Copiar enlace</button>`;
    readerContent.querySelector('.news-reader-copy').appendChild(share);
    share.querySelector('[data-copy-news]').addEventListener('click',async()=>{
      await navigator.clipboard.writeText(url);
      share.querySelector('[data-copy-news]').textContent='Enlace copiado';
    });
  });
  if(readerContent)shareObserver.observe(readerContent,{childList:true,subtree:true});

  // Barra y ventana pública de avisos
  let currentPublicAlerts = [];
  let alertExpirationTimer = null;

  function scheduleNextAlertExpiration(alerts = currentPublicAlerts) {
    clearTimeout(alertExpirationTimer);

    const now = Date.now();
    const expirations = alerts
      .map(getAlertEndDate)
      .filter(Boolean)
      .map(date => date.getTime())
      .filter(timestamp => timestamp > now)
      .sort((a, b) => a - b);

    if (!expirations.length) return;

    // Se ejecuta apenas pasa la hora final. Máximo permitido por setTimeout.
    const delay = Math.min(expirations[0] - now + 500, 2147483647);

    alertExpirationTimer = setTimeout(async () => {
      await loadAlerts();
      await loadImportantSection();

      const dialog = $('#public-alerts-dialog');
      if (dialog?.open) renderPublicAlerts();
    }, delay);
  }

  async function loadAlerts(){
    const box = $('#official-alerts');
    const floatingButton = $('#floating-alerts-button');

    try{
      const rows = await request(
        '/rest/v1/avisos?select=*&activo=eq.true&order=prioridad.desc,created_at.desc'
      );

      currentPublicAlerts = Array.isArray(rows)
        ? rows.filter(alert => alertIsStillActive(alert))
        : [];

      scheduleNextAlertExpiration(currentPublicAlerts);

      if (!currentPublicAlerts.length) {
        if (box) box.hidden = true;
        if (floatingButton) floatingButton.hidden = true;

        const dialog = $('#public-alerts-dialog');
        if (dialog?.open) renderPublicAlerts();
        return;
      }

      const first = currentPublicAlerts[0];

      if (box) {
        box.hidden = false;
        box.className = `official-alerts is-${first.tipo || 'info'}`;
        box.textContent = first.mensaje;
      }

      if (floatingButton) {
        floatingButton.hidden = false;
        const badge = floatingButton.querySelector('b');
        if (badge) badge.textContent = String(currentPublicAlerts.length);
      }
    }catch(error){
      console.warn(error);
      if (box) box.hidden = true;
      if (floatingButton) floatingButton.hidden = true;
    }
  }

  function renderPublicAlerts(){
    const list = $('#public-alerts-list');
    if (!list) return;

    if (!currentPublicAlerts.length) {
      list.innerHTML = '<p>No hay avisos activos por el momento.</p>';
      return;
    }

    list.innerHTML = currentPublicAlerts.map(alert => `
      <article class="portal-public-card public-alert-card ${alert.tipo === 'danger' ? 'urgent' : ''}">
        <span>${escapeHTML(alert.titulo || alert.categoria || 'Aviso comunal')}</span>
        <h4>${escapeHTML(alert.mensaje || '')}</h4>
        ${alert.detalle ? `<p>${escapeHTML(alert.detalle)}</p>` : ''}
        <small>${alert.fecha ? `Fecha: ${escapeHTML(alert.fecha)}` : ''}
        ${alert.hora_desde ? ` · Horario: ${escapeHTML(alert.hora_desde)}${alert.hora_hasta ? ` a ${escapeHTML(alert.hora_hasta)}` : ''}` : ''}</small>
      </article>
    `).join('');
  }

  const publicAlertsDialog = $('#public-alerts-dialog');

  $('#floating-alerts-button')?.addEventListener('click', async () => {
    await loadAlerts();
    renderPublicAlerts();
    publicAlertsDialog?.showModal();
  });

  $('.public-alerts-close')?.addEventListener('click', () => {
    publicAlertsDialog?.close();
  });

  async function loadImportantSection(){
    const container = $('#agenda-dynamic-list');
    if (!container) return;

    const defaults = [
      { key:'luz', label:'Servicios', title:'Sin cortes de luz programados' },
      { key:'agua', label:'Agua', title:'Sin cortes de agua programados' },
      { key:'actos', label:'Comunidad', title:'Sin actos programados' },
      { key:'salud', label:'Salud', title:'Sin operativos programados' },
      { key:'educacion', label:'Educación', title:'Sin actividades programadas' },
      { key:'residuos', label:'Residuos', title:'Sin recolecciones especiales programadas' }
    ];

    const normalize = value => String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    const alertKey = alert => {
      const value = normalize(`${alert.categoria || ''} ${alert.titulo || ''} ${alert.mensaje || ''}`);
      if (value.includes('luz')) return 'luz';
      if (value.includes('agua')) return 'agua';
      if (value.includes('residuo')) return 'residuos';
      if (value.includes('salud') || value.includes('vacun') || value.includes('operativo')) return 'salud';
      if (value.includes('escuel') || value.includes('educa')) return 'educacion';
      if (value.includes('acto') || value.includes('fiesta') || value.includes('comunidad')) return 'actos';
      return 'actos';
    };

    const formatAlertMeta = alert => {
      const parts = [];
      if (alert.fecha) {
        const date = new Date(alert.fecha + 'T12:00:00');
        parts.push(new Intl.DateTimeFormat('es-AR', {
          day:'2-digit', month:'2-digit', year:'numeric'
        }).format(date));
      }
      if (alert.hora_desde) {
        parts.push(`${alert.hora_desde.slice(0,5)}${alert.hora_hasta ? ` a ${alert.hora_hasta.slice(0,5)}` : ''}`);
      }
      return parts.join(' · ') || 'Aviso activo';
    };

    try {
      const [alerts, events] = await Promise.all([
        request('/rest/v1/avisos?select=*&activo=eq.true&order=prioridad.desc,fecha.asc,created_at.desc'),
        request('/rest/v1/eventos?select=*&publicado=eq.true&order=fecha_inicio.asc')
      ]);

      const visibleAlerts = (alerts || []).filter(alert => alertIsStillActive(alert));
      const rows = defaults.map(item => ({ ...item, active:false, meta:'Sin novedades' }));

      visibleAlerts.forEach(alert => {
        const key = alertKey(alert);
        const row = rows.find(item => item.key === key);
        if (!row || row.active) return;
        row.active = true;
        row.title = alert.mensaje || alert.titulo || alert.categoria || 'Aviso comunal';
        row.meta = formatAlertMeta(alert);
        row.urgent = alert.tipo === 'danger';
      });

      const today = new Date();
      const nextEvent = (events || []).find(event => {
        if (!event.fecha_inicio) return true;
        return new Date(event.fecha_inicio) >= new Date(today.getFullYear(), today.getMonth(), today.getDate());
      });

      if (nextEvent) {
        const row = rows.find(item => item.key === 'actos');
        row.active = true;
        row.title = nextEvent.titulo || 'Actividad programada';
        const date = nextEvent.fecha_inicio ? new Date(nextEvent.fecha_inicio) : null;
        const dateText = date ? new Intl.DateTimeFormat('es-AR', {
          day:'2-digit', month:'2-digit', year:'numeric',
          hour:'2-digit', minute:'2-digit'
        }).format(date) : '';
        row.meta = [dateText, nextEvent.lugar].filter(Boolean).join(' · ') || 'Evento programado';
      }

      container.innerHTML = rows.map(row => `
        <article class="${row.active ? 'agenda-active' : 'agenda-default'} ${row.urgent ? 'agenda-urgent' : ''}">
          <span>${escapeHTML(row.label)}</span>
          <strong>${escapeHTML(row.title)}</strong>
          <small>${escapeHTML(row.meta)}</small>
        </article>
      `).join('');
    } catch (error) {
      container.innerHTML = defaults.map(row => `
        <article class="agenda-default">
          <span>${escapeHTML(row.label)}</span>
          <strong>${escapeHTML(row.title)}</strong>
          <small>Sin novedades</small>
        </article>
      `).join('');
    }
  }

  // Portal público
  const portalDialog=$('#portal-dialog');
  const portalContent=$('#portal-dialog-content');

  const openPortalDialogSafely = () => {
    if (portalDialog && !portalDialog.open) portalDialog.showModal();
  };

  $('.portal-dialog-close')?.addEventListener('click',()=>{
    portalDialog?.close();
  });

  async function openPublicModule(name){
    const definitions={
      agenda:{title:'Agenda comunal',table:'eventos',order:'fecha_inicio.asc',render:r=>`
        <article class="portal-public-card"><span>${formatDate(r.fecha_inicio)}</span><h4>${escapeHTML(r.titulo)}</h4><p>${escapeHTML(r.descripcion||'')}</p>${r.lugar?`<small>${escapeHTML(r.lugar)}</small>`:''}</article>`},
      documents:{title:'Documentos públicos',table:'documentos',order:'fecha.desc',render:r=>`
        <article class="portal-public-card"><span>${escapeHTML(r.tipo||'Documento')} · ${formatDate(r.fecha+'T12:00:00')}</span><h4>${escapeHTML(r.titulo)}</h4><p>${escapeHTML(r.descripcion||'')}</p>${r.url?`<a target="_blank" rel="noopener" href="${r.url}">Abrir documento →</a>`:''}</article>`},
      transparency:{title:'Portal de transparencia',table:'documentos',order:'fecha.desc',extra:'&es_transparencia=eq.true',render:r=>`
        <article class="portal-public-card"><span>${escapeHTML(r.tipo||'Información pública')}</span><h4>${escapeHTML(r.titulo)}</h4><p>${escapeHTML(r.descripcion||'')}</p>${r.url?`<a target="_blank" rel="noopener" href="${r.url}">Consultar →</a>`:''}</article>`}
    };

    if(name==='tramites'){
      const SESSION_MS = 5 * 60 * 1000;
      const MAX_ATTEMPTS = 5;
      const BLOCK_MS = 10 * 60 * 1000;
      const sessionKey = 'tramitesBetaSessionV31';
      const attemptsKey = 'tramitesBetaAttemptsV31';
      const deviceKey = 'tramitesBetaDeviceV31';

      const getDeviceToken = () => {
        let value = localStorage.getItem(deviceKey);
        if (!value) {
          value = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
          localStorage.setItem(deviceKey, value);
        }
        return value;
      };

      const clearCitizenSession = () => {
        sessionStorage.removeItem(sessionKey);
      };

      const getCitizenSession = () => {
        try {
          const session = JSON.parse(sessionStorage.getItem(sessionKey) || 'null');
          if (!session || Date.now() >= session.expiresAt) {
            clearCitizenSession();
            return null;
          }
          return session;
        } catch {
          clearCitizenSession();
          return null;
        }
      };

      const saveCitizenSession = data => {
        const session = {
          ...data,
          expiresAt: Date.now() + SESSION_MS
        };
        sessionStorage.setItem(sessionKey, JSON.stringify(session));
        return session;
      };

      const readAttemptState = () => {
        try {
          const state = JSON.parse(localStorage.getItem(attemptsKey) || '{"count":0,"blockedUntil":0}');
          if (state.blockedUntil && Date.now() >= state.blockedUntil) {
            localStorage.removeItem(attemptsKey);
            return {count:0, blockedUntil:0};
          }
          return state;
        } catch {
          return {count:0, blockedUntil:0};
        }
      };

      const registerFailedAttempt = () => {
        const state = readAttemptState();
        const count = Number(state.count || 0) + 1;
        const blockedUntil = count >= MAX_ATTEMPTS ? Date.now() + BLOCK_MS : 0;
        localStorage.setItem(attemptsKey, JSON.stringify({count, blockedUntil}));
        return {count, blockedUntil};
      };

      const clearAttempts = () => localStorage.removeItem(attemptsKey);

      const money = value => new Intl.NumberFormat('es-AR', {
        style:'currency',
        currency:'ARS',
        maximumFractionDigits:2
      }).format(Number(value || 0));

      const renderLogin = () => {
        const state = readAttemptState();
        const blocked = state.blockedUntil > Date.now();
        const minutes = blocked ? Math.ceil((state.blockedUntil - Date.now()) / 60000) : 0;

        portalContent.innerHTML=`
          <div class="portal-public-wrap citizen-account-wrap">
            <span class="citizen-beta-badge">Beta privada</span>
            <h3>Consultar mis tasas</h3>
            <p>Ingresá con el DNI y el código personal entregado por la Comuna. Por seguridad, el sistema no informa cuál de los dos datos es incorrecto.</p>

            <form id="citizen-access-form" class="portal-form citizen-access-form" autocomplete="off">
              <label>DNI
                <input name="dni" inputmode="numeric" maxlength="11" placeholder="Sin puntos ni espacios" autocomplete="username" autofocus required>
              </label>
              <label>Código personal
                <span class="citizen-password-field">
                  <input name="codigo" type="password" maxlength="40" placeholder="Código privado" autocomplete="current-password" required>
                  <button type="button" class="citizen-password-toggle" aria-label="Mostrar código">Ver</button>
                </span>
              </label>
              <button type="submit" class="citizen-login-button" ${blocked ? 'disabled' : ''}>Ingresar y consultar mi cuenta</button>
              <button type="button" class="citizen-access-help">¿No tenés tu código?</button>
              <p data-citizen-message>${blocked ? `Demasiados intentos. Probá nuevamente en ${minutes} minuto${minutes===1?'':'s'}.` : ''}</p>
            </form>

            <div class="citizen-security-note">
              <strong>Acceso protegido</strong>
              <span>La sesión se cierra automáticamente después de 5 minutos. No compartas tu código.</span>
            </div>
          </div>`;

        openPortalDialogSafely();

        const form = $('#citizen-access-form');

        $('.citizen-password-toggle', form)?.addEventListener('click', event => {
          const input = form.elements.codigo;
          const visible = input.type === 'text';
          input.type = visible ? 'password' : 'text';
          event.currentTarget.textContent = visible ? 'Ver' : 'Ocultar';
          event.currentTarget.setAttribute('aria-label', visible ? 'Mostrar código' : 'Ocultar código');
        });

        $('.citizen-access-help', form)?.addEventListener('click', () => {
          const message = $('[data-citizen-message]', form);
          message.textContent = 'Solicitá tu código personal en la Comuna. Por seguridad, no se entrega desde esta página.';
        });

        form?.addEventListener('submit', async event => {
          event.preventDefault();
          const stateNow = readAttemptState();
          const message = $('[data-citizen-message]', form);

          if (stateNow.blockedUntil > Date.now()) {
            message.textContent = 'Acceso temporalmente bloqueado. Esperá unos minutos.';
            return;
          }

          const data = new FormData(form);
          const dni = String(data.get('dni') || '').replace(/\D/g, '');
          const codigo = String(data.get('codigo') || '');

          if (dni.length < 7 || codigo.length < 4) {
            message.textContent = 'No se pudo validar el acceso. Revisá los datos.';
            return;
          }

          message.textContent = 'Validando acceso…';
          form.querySelector('button').disabled = true;

          try {
            const result = await request('/rest/v1/rpc/consultar_estado_cuenta_beta', {
              method:'POST',
              headers:{'Content-Type':'application/json'},
              body:JSON.stringify({
                p_dni:dni,
                p_codigo:codigo,
                p_dispositivo:getDeviceToken()
              })
            });

            if (!result?.ok) {
              const attempt = registerFailedAttempt();
              message.textContent = attempt.blockedUntil
                ? 'Demasiados intentos. El acceso quedó bloqueado durante 10 minutos.'
                : 'No se pudo validar el acceso. Revisá los datos.';
              form.querySelector('button').disabled = Boolean(attempt.blockedUntil);
              return;
            }

            clearAttempts();
            const session = saveCitizenSession({
              dni,
              codigo,
              cuenta:result
            });
            renderAccount(session);
          } catch {
            registerFailedAttempt();
            message.textContent = 'No se pudo validar el acceso. Revisá los datos.';
          } finally {
            if (form.isConnected && !readAttemptState().blockedUntil) {
              form.querySelector('button').disabled = false;
            }
          }
        });
      };

      const renderAccount = session => {
        const account = session.cuenta || {};
        const debts = Array.isArray(account.obligaciones) ? account.obligaciones : [];
        const config = account.pagos || {};
        const pending = debts.filter(row => String(row.estado).toLowerCase() !== 'pagado');
        const total = pending.reduce((sum,row) => sum + Number(row.importe || 0), 0);

        portalContent.innerHTML=`
          <div class="portal-public-wrap citizen-account-wrap">
            <div class="citizen-account-head">
              <div>
                <span class="citizen-beta-badge">Sesión privada · 5 minutos</span>
                <h3>${escapeHTML(account.nombre || 'Mi cuenta')}</h3>
                <p>Estado de tasas y obligaciones cargadas por la Comuna.</p>
              </div>
              <div class="citizen-account-actions">
                <span class="citizen-countdown" id="citizen-countdown">05:00</span>
                <button type="button" class="citizen-refresh" id="citizen-refresh">Actualizar</button>
                <button type="button" class="citizen-print" id="citizen-print">Imprimir resumen</button>
                <button type="button" class="citizen-scroll-down" id="citizen-scroll-down">Ver detalle ↓</button>
                <button type="button" class="citizen-logout" id="citizen-logout">Cerrar sesión</button>
              </div>
            </div>

            <div class="citizen-account-summary">
              <article><span>Pendientes</span><strong>${pending.length}</strong></article>
              <article><span>Total informado</span><strong>${money(total)}</strong></article>
            </div>

            <div class="citizen-debt-list" id="citizen-debt-list">
              ${debts.length ? debts.map(row => `
                <article class="citizen-debt-card ${String(row.estado).toLowerCase()==='pagado'?'is-paid':'is-pending'}">
                  <div>
                    <span>${escapeHTML(row.concepto || 'Tasa comunal')}</span>
                    <h4>${escapeHTML(row.periodo || 'Período sin informar')}</h4>
                    <small>${row.vencimiento ? `Vence: ${escapeHTML(row.vencimiento)}` : 'Sin vencimiento informado'}</small>
                  </div>
                  <div class="citizen-debt-amount">
                    <strong>${money(row.importe)}</strong>
                    <span>${escapeHTML(row.estado || 'Pendiente')}</span>
                  </div>
                  ${String(row.estado).toLowerCase() !== 'pagado' ? `
                    <button type="button" data-report-payment="${row.id}">Informar pago</button>` : ''}
                </article>`).join('') : `
                <div class="citizen-empty-state">
                  <strong>No hay obligaciones cargadas</strong>
                  <span>La Comuna todavía no registró tasas o deudas para esta cuenta.</span>
                </div>`}
            </div>

            <div class="citizen-payment-data">
              <div>
                <span>Datos para transferencia</span>
                <strong>${escapeHTML(config.titular || 'Comuna de La Penca y Caraguatá')}</strong>
              </div>
              <p><b>Alias:</b> <span>${escapeHTML(config.alias || 'A configurar')}</span>
                <button type="button" data-copy="${escapeHTML(config.alias || '')}">Copiar</button></p>
              <p><b>CBU:</b> <span>${escapeHTML(config.cbu || 'A configurar')}</span>
                <button type="button" data-copy="${escapeHTML(config.cbu || '')}">Copiar</button></p>
            </div>

            <div class="citizen-session-warning">
              Esta consulta se cerrará automáticamente por seguridad.
            </div>
            <button type="button" class="citizen-scroll-top" id="citizen-scroll-top">Volver arriba ↑</button>
          </div>`;

        const updateCountdown = () => {
          const active = getCitizenSession();
          const counter = $('#citizen-countdown');
          if (!counter || !active) return;

          const remaining = Math.max(0, active.expiresAt - Date.now());
          const minutes = Math.floor(remaining / 60000);
          const seconds = Math.floor((remaining % 60000) / 1000);
          counter.textContent = `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
        };

        clearInterval(window.__citizenCountdownInterval);
        updateCountdown();
        window.__citizenCountdownInterval = setInterval(updateCountdown, 1000);

        $('#citizen-refresh')?.addEventListener('click', async event => {
          const button = event.currentTarget;
          const active = getCitizenSession();
          if (!active) {
            renderLogin();
            return;
          }

          button.disabled = true;
          button.textContent = 'Actualizando…';

          try {
            const result = await request('/rest/v1/rpc/consultar_estado_cuenta_beta', {
              method:'POST',
              headers:{'Content-Type':'application/json'},
              body:JSON.stringify({
                p_dni:active.dni,
                p_codigo:active.codigo,
                p_dispositivo:getDeviceToken()
              })
            });

            if (!result?.ok) throw new Error();
            renderAccount(saveCitizenSession({dni:active.dni,codigo:active.codigo,cuenta:result}));
          } catch {
            button.disabled = false;
            button.textContent = 'Actualizar';
            alert('No se pudo actualizar la cuenta.');
          }
        });

        $('#citizen-print')?.addEventListener('click', () => window.print());

        $('#citizen-scroll-down')?.addEventListener('click', () => {
          const wrap = $('.portal-public-wrap', portalContent);
          const list = $('#citizen-debt-list');
          if (wrap && list) {
            wrap.scrollTo({
              top: Math.max(0, list.offsetTop - 20),
              behavior:'smooth'
            });
          }
        });

        $('#citizen-scroll-top')?.addEventListener('click', () => {
          $('.portal-public-wrap', portalContent)?.scrollTo({top:0,behavior:'smooth'});
        });

        $('#citizen-logout')?.addEventListener('click', () => {
          clearTimeout(window.__citizenSessionTimer);
          clearInterval(window.__citizenCountdownInterval);
          clearCitizenSession();
          renderLogin();
        });

        $$('[data-copy]', portalContent).forEach(button => button.addEventListener('click', async () => {
          const value = button.dataset.copy;
          if (!value) return;
          await navigator.clipboard.writeText(value);
          button.textContent = 'Copiado';
          setTimeout(() => button.textContent = 'Copiar', 1200);
        }));

        $$('[data-report-payment]', portalContent).forEach(button => button.addEventListener('click', () => {
          const debt = debts.find(row => String(row.id) === button.dataset.reportPayment);
          renderPaymentForm(session, debt);
        }));

        clearTimeout(window.__citizenSessionTimer);
        window.__citizenSessionTimer = setTimeout(() => {
          clearCitizenSession();
          if (portalDialog.open) {
            renderLogin();
            const msg = $('[data-citizen-message]');
            if (msg) msg.textContent = 'La sesión se cerró automáticamente por seguridad.';
          }
        }, Math.max(1000, session.expiresAt - Date.now()));
      };

      const renderPaymentForm = (session, debt) => {
        const account = session.cuenta || {};
        const config = account.pagos || {};
        portalContent.innerHTML=`
          <div class="portal-public-wrap citizen-account-wrap">
            <button type="button" class="citizen-back" id="citizen-back">← Volver a mi cuenta</button>
            <span class="citizen-beta-badge">Informar pago</span>
            <h3>${escapeHTML(debt?.concepto || 'Pago comunal')}</h3>
            <p>Completá los datos. Después se abrirá WhatsApp con el mensaje preparado. El comprobante se adjunta desde WhatsApp.</p>

            <form id="citizen-payment-form" class="portal-form citizen-payment-form">
              <label>Concepto
                <input name="concepto" value="${escapeHTML(debt?.concepto || '')}" required>
              </label>
              <label>Importe pagado
                <input name="importe" type="number" min="0" step="0.01" value="${Number(debt?.importe || 0)}" required>
              </label>
              <label>Fecha del pago
                <input name="fecha_pago" type="date" required>
              </label>
              <label>Referencia o número de operación
                <input name="referencia" maxlength="100" placeholder="Opcional">
              </label>
              <label class="citizen-file-label">Comprobante
                <input name="comprobante" type="file" accept="image/*,.pdf">
                <small>Por seguridad, en esta beta se adjunta manualmente dentro de WhatsApp.</small>
              </label>
              <button type="submit">Guardar aviso y abrir WhatsApp</button>
              <p data-payment-message></p>
            </form>
          </div>`;

        $('#citizen-back')?.addEventListener('click', () => renderAccount(getCitizenSession() || session));

        $('#citizen-payment-form')?.addEventListener('submit', async event => {
          event.preventDefault();
          const activeSession = getCitizenSession();
          const message = $('[data-payment-message]', event.target);

          if (!activeSession) {
            clearCitizenSession();
            renderLogin();
            return;
          }

          const formData = new FormData(event.target);
          const payload = {
            p_dni:activeSession.dni,
            p_codigo:activeSession.codigo,
            p_dispositivo:getDeviceToken(),
            p_obligacion_id:debt?.id || null,
            p_concepto:String(formData.get('concepto') || ''),
            p_importe:Number(formData.get('importe') || 0),
            p_fecha_pago:String(formData.get('fecha_pago') || ''),
            p_referencia:String(formData.get('referencia') || ''),
            p_comprobante_nombre:String(formData.get('comprobante')?.name || '')
          };

          message.textContent = 'Registrando el aviso de pago…';

          try {
            const result = await request('/rest/v1/rpc/informar_pago_beta', {
              method:'POST',
              headers:{'Content-Type':'application/json'},
              body:JSON.stringify(payload)
            });

            if (!result?.ok) throw new Error('No se pudo registrar.');

            const whatsapp = String(config.whatsapp || '5493498502213').replace(/\D/g,'');
            const text = [
              'Hola, envío información de un pago comunal.',
              `Nombre: ${account.nombre || ''}`,
              `DNI: terminado en ${String(activeSession.dni).slice(-4)}`,
              `Concepto: ${payload.p_concepto}`,
              `Importe: ${money(payload.p_importe)}`,
              `Fecha: ${payload.p_fecha_pago}`,
              payload.p_referencia ? `Referencia: ${payload.p_referencia}` : '',
              payload.p_comprobante_nombre
                ? `Comprobante seleccionado: ${payload.p_comprobante_nombre} (lo adjunto en este chat).`
                : 'Adjunto el comprobante en este chat.'
            ].filter(Boolean).join('\n');

            message.textContent = 'Aviso registrado. Se abrirá WhatsApp.';
            window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
          } catch {
            message.textContent = 'No se pudo registrar el pago. Probá nuevamente.';
          }
        });
      };

      const existing = getCitizenSession();
      if (existing) renderAccount(existing);
      else renderLogin();
      return;
    }

    if(name==='providers'){
      portalContent.innerHTML=`
        <div class="portal-public-wrap"><h3>Registro de proveedores</h3><p>Completá los datos para incorporarte al registro comunal.</p>
        <form id="provider-form" class="portal-form">
          <input name="nombre" placeholder="Nombre o razón social" required>
          <input name="cuit" placeholder="CUIT" required>
          <input name="rubro" placeholder="Rubro o servicio" required>
          <input name="telefono" placeholder="Teléfono" required>
          <input name="email" type="email" placeholder="Correo electrónico" required>
          <input name="localidad" placeholder="Localidad">
          <textarea name="detalle" placeholder="Detalle adicional"></textarea>
          <button>Enviar registro</button><p data-form-message></p>
        </form></div>`;
      openPortalDialogSafely();
      $('#provider-form').addEventListener('submit',async e=>{
        e.preventDefault(); const f=new FormData(e.target); const data=Object.fromEntries(f);
        try{
          await request('/rest/v1/proveedores',{method:'POST',headers:{'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify(data)});
          $('[data-form-message]',e.target).textContent='Registro enviado correctamente.';
          e.target.reset();
        }catch(err){$('[data-form-message]',e.target).textContent=err.message}
      });
      return;
    }

    if(name==='surveys'){
      portalContent.innerHTML='<div class="portal-public-wrap"><h3>Encuestas vecinales</h3><p>Consultas abiertas para participar.</p><div id="survey-public-list" class="portal-public-list"></div></div>';
      openPortalDialogSafely();
      try{
        const rows=await request('/rest/v1/encuestas?select=*&activa=eq.true&order=created_at.desc');
        $('#survey-public-list').innerHTML=rows?.length?rows.map(r=>`
          <article class="portal-public-card" data-survey="${r.id}">
            <span>Encuesta abierta</span><h4>${escapeHTML(r.pregunta)}</h4>
            <div class="portal-form">${(r.opciones||[]).map((o,i)=>`<button type="button" data-vote="${i}">${escapeHTML(o)}</button>`).join('')}</div>
            <small data-vote-message></small>
          </article>`).join(''):'<p>No hay encuestas abiertas.</p>';
        $$('[data-vote]').forEach(btn=>btn.addEventListener('click',async()=>{
          const card=btn.closest('[data-survey]');
          try{
            await request('/rest/v1/votos_encuesta',{method:'POST',headers:{'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({encuesta_id:card.dataset.survey,opcion:Number(btn.dataset.vote)})});
            $('[data-vote-message]',card).textContent='Tu voto fue registrado.';
            $$('button',card).forEach(b=>b.disabled=true);
          }catch(err){$('[data-vote-message]',card).textContent=err.message}
        }));
      }catch(e){$('#survey-public-list').innerHTML=`<p>${escapeHTML(e.message)}</p>`}
      return;
    }

    const def=definitions[name];
    portalContent.innerHTML=`<div class="portal-public-wrap"><h3>${def.title}</h3><p>Información cargada y actualizada desde la administración comunal.</p><div class="portal-public-list"><p>Cargando…</p></div></div>`;
    openPortalDialogSafely();
    try{
      const rows=await request(`/rest/v1/${def.table}?select=*&publicado=eq.true${def.extra||''}&order=${def.order}`);
      $('.portal-public-list',portalContent).innerHTML=rows?.length?rows.map(def.render).join(''):'<p>No hay contenido publicado por el momento.</p>';
    }catch(e){$('.portal-public-list',portalContent).innerHTML=`<p>${escapeHTML(e.message)}</p>`}
  }
  $$('[data-portal-open]').forEach(b=>b.addEventListener('click',()=>openPublicModule(b.dataset.portalOpen)));

  // Suscripción
  $('#subscribe-form')?.addEventListener('submit',async e=>{
    e.preventDefault();
    const email=$('#subscribe-email').value.trim().toLowerCase();
    try{
      await request('/rest/v1/suscriptores',{method:'POST',headers:{'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({email})});
      $('#subscribe-message').textContent='Suscripción registrada correctamente.';
      e.target.reset();
    }catch(err){$('#subscribe-message').textContent=err.message}
  });

  // Admin general genérico
  const adminDialog=$('#portal-admin-dialog');
  $('#residents-admin-open')?.addEventListener('click',()=>{
    if(!token()){alert('Primero iniciá sesión.');return}

    adminDialog.showModal();

    const target = $('[data-portal-admin-tab="residents"]');

    $$('[data-portal-admin-tab]').forEach(button=>{
      button.classList.toggle('active', button === target);
    });

    $$('[data-portal-admin-panel]').forEach(section=>{
      section.classList.toggle(
        'active',
        section.dataset.portalAdminPanel === 'residents'
      );
    });

    loadAdminPanel('residents');
  });

  $('#portal-admin-open')?.addEventListener('click',()=>{
    if(!token()){alert('Primero iniciá sesión.');return}
    adminDialog.showModal(); loadAdminPanel('alerts');
  });
  $('.portal-admin-close')?.addEventListener('click',()=>adminDialog.close());
  const keepResidentsTabVisible = () => {
    const tab = $('[data-portal-admin-tab="residents"]');
    if (!tab) return;
    tab.hidden = false;
    tab.style.display = 'flex';
    tab.style.visibility = 'visible';
    tab.style.opacity = '1';
  };

  keepResidentsTabVisible();
  window.addEventListener('resize', keepResidentsTabVisible);

  $$('[data-portal-admin-tab]').forEach(btn=>btn.addEventListener('click',()=>{
    $$('[data-portal-admin-tab]').forEach(b=>b.classList.toggle('active',b===btn));
    $$('[data-portal-admin-panel]').forEach(p=>p.classList.toggle('active',p.dataset.portalAdminPanel===btn.dataset.portalAdminTab));
    loadAdminPanel(btn.dataset.portalAdminTab);
  }));

  const configs={
    alerts:{table:'avisos',title:'Avisos importantes',fields:[
      ['categoria','Tipo de aviso','select',[
        'Corte de luz',
        'Corte de agua',
        'Recolección de residuos',
        'Cambio de horario',
        'Calle cortada',
        'Alerta meteorológica',
        'Otro aviso'
      ]],
      ['fecha','Fecha','date'],
      ['hora_desde','Desde','time'],
      ['hora_hasta','Hasta','time'],
      ['detalle','Información adicional','textarea'],
      ['activo','Mostrar aviso','checkbox']
    ],summary:r=>r.titulo||r.mensaje},
    events:{table:'eventos',title:'Agenda comunal',fields:[
      ['titulo','Título','text'],['descripcion','Descripción','textarea'],['fecha_inicio','Fecha y hora','datetime-local'],['lugar','Lugar','text'],['publicado','Publicado','checkbox']
    ],summary:r=>r.titulo},
    documents:{table:'documentos',title:'Documentos públicos',fields:[
      ['titulo','Título','text'],['tipo','Tipo','text'],['descripcion','Descripción','textarea'],['fecha','Fecha','date'],['url','Enlace al documento','url'],['es_transparencia','Mostrar en transparencia','checkbox'],['publicado','Publicado','checkbox']
    ],summary:r=>r.titulo},
    surveys:{table:'encuestas',title:'Encuestas vecinales',fields:[
      ['pregunta','Pregunta','text'],['opciones_texto','Opciones, una por línea','textarea'],['activa','Activa','checkbox']
    ],summary:r=>r.pregunta}
  };

  function fieldHTML([name,label,type,options]){
    if(type==='textarea')return `<label>${label}<textarea name="${name}"></textarea></label>`;
    if(type==='select')return `<label>${label}<select name="${name}">${options.map(o=>`<option>${o}</option>`).join('')}</select></label>`;
    if(type==='checkbox')return `<label><input name="${name}" type="checkbox"> ${label}</label>`;
    return `<label>${label}<input name="${name}" type="${type}"></label>`;
  }

  async function loadAdminPanel(name){
    const panel=$(`[data-portal-admin-panel="${name}"]`);
    if(!panel)return;
    if(name==='residents'){
      panel.innerHTML=`
        <div class="portal-admin-module-head residents-head">
          <div>
            <h4>Datos de habitantes</h4>
            <small>Personas, tasas, vencimientos, pagos e importación masiva.</small>
          </div>
          <button type="button" class="residents-help-button" id="residents-help">Cómo usarlo</button>
        </div>

        <div class="residents-admin-shell">
          <nav class="residents-subnav" aria-label="Secciones de datos de habitantes">
            <button type="button" class="active" data-residents-view="people">Personas</button>
            <button type="button" data-residents-view="accounts">Cuentas y tasas</button>
            <button type="button" data-residents-view="import">Importar datos</button>
            <button type="button" data-residents-view="payments">Pagos informados</button>
          </nav>
          <div id="residents-admin-content" class="residents-admin-content"></div>
        </div>`;

      const content = $('#residents-admin-content');
      let currentView = 'people';

      const currency = value => new Intl.NumberFormat('es-AR',{
        style:'currency',
        currency:'ARS'
      }).format(Number(value || 0));

      const showMessage = (container, text, type='ok') => {
        if (!container) return;
        container.textContent = text;
        container.className = `residents-message is-${type}`;
      };

      const renderPeople = async () => {
        content.innerHTML=`
          <div class="residents-toolbar">
            <div>
              <h5>Habitantes registrados</h5>
              <p>Creá accesos individuales o buscá una persona ya cargada.</p>
            </div>
            <label class="residents-search">Buscar
              <input id="residents-search-input" placeholder="Nombre o últimos números del DNI">
            </label>
          </div>

          <div class="residents-two-columns">
            <form id="resident-form" class="residents-card residents-form">
              <h6>Nueva persona</h6>
              <label>Nombre completo<input name="nombre" required></label>
              <label>DNI<input name="dni" inputmode="numeric" required></label>
              <label>Código personal<input name="codigo" minlength="6" required></label>
              <label class="resident-check"><input name="activo" type="checkbox" checked> Acceso activo</label>
              <button type="submit" class="residents-primary-button">Guardar datos</button>
              <p class="residents-message" data-resident-message></p>
            </form>

            <div class="residents-card">
              <div id="residents-list">Cargando…</div>
            </div>
          </div>`;

        let rows = [];

        const draw = query => {
          const list = $('#residents-list');
          const normalized = String(query || '').toLowerCase().trim();
          const filtered = rows.filter(row => {
            const name = String(row.nombre || '').toLowerCase();
            const dni = String(row.dni_normalizado || '');
            return !normalized || name.includes(normalized) || dni.endsWith(normalized);
          });

          list.innerHTML = filtered.length ? filtered.map(row => `
            <article class="resident-person-card" data-resident="${row.id}">
              <div>
                <strong>${escapeHTML(row.nombre)}</strong>
                <small>DNI terminado en ${escapeHTML(String(row.dni_normalizado).slice(-4))}</small>
              </div>
              <span class="resident-status ${row.activo ? 'active' : 'inactive'}">${row.activo ? 'Activo' : 'Inactivo'}</span>
              <div class="resident-card-actions">
                <button type="button" data-resident-account>Abrir cuenta</button>
                <button type="button" data-reset-code>Cambiar código</button>
                <button type="button" class="danger" data-toggle-resident>${row.activo ? 'Desactivar' : 'Activar'}</button>
              </div>
            </article>`).join('') : '<p>No se encontraron personas.</p>';

          $$('[data-resident-account]', list).forEach(button => button.addEventListener('click', () => {
            const card = button.closest('[data-resident]');
            renderAccounts(card.dataset.resident);
            $$('.residents-subnav button').forEach(btn => btn.classList.toggle('active', btn.dataset.residentsView === 'accounts'));
            currentView = 'accounts';
          }));

          $$('[data-reset-code]', list).forEach(button => button.addEventListener('click', async () => {
            const card = button.closest('[data-resident]');
            const code = prompt('Nuevo código personal (mínimo 6 caracteres):');
            if (!code || code.length < 6) return;
            await request('/rest/v1/rpc/admin_cambiar_codigo_contribuyente', {
              method:'POST',
              headers:{'Content-Type':'application/json'},
              body:JSON.stringify({p_contribuyente_id:card.dataset.resident,p_codigo:code})
            }, true);
            alert('Código actualizado correctamente.');
          }));

          $$('[data-toggle-resident]', list).forEach(button => button.addEventListener('click', async () => {
            const card = button.closest('[data-resident]');
            const row = rows.find(item => String(item.id) === card.dataset.resident);
            await request(`/rest/v1/contribuyentes?id=eq.${card.dataset.resident}`, {
              method:'PATCH',
              headers:{'Content-Type':'application/json','Prefer':'return=minimal'},
              body:JSON.stringify({activo:!row.activo})
            }, true);
            await loadRows();
          }));
        };

        const loadRows = async () => {
          const list = $('#residents-list');
          try {
            rows = await request('/rest/v1/contribuyentes?select=id,nombre,dni_normalizado,activo,created_at&order=nombre.asc', {}, true);
            draw($('#residents-search-input')?.value || '');
          } catch (error) {
            list.textContent = error.message;
          }
        };

        $('#residents-search-input')?.addEventListener('input', event => draw(event.target.value));

        $('#resident-form')?.addEventListener('submit', async event => {
          event.preventDefault();
          const form = event.target;
          const data = new FormData(form);
          const message = $('[data-resident-message]', form);
          showMessage(message,'Guardando…');

          try {
            const result = await request('/rest/v1/rpc/admin_crear_contribuyente_beta', {
              method:'POST',
              headers:{'Content-Type':'application/json'},
              body:JSON.stringify({
                p_nombre:String(data.get('nombre') || ''),
                p_dni:String(data.get('dni') || '').replace(/\D/g,''),
                p_codigo:String(data.get('codigo') || ''),
                p_activo:data.get('activo') === 'on'
              })
            }, true);

            if (!result?.ok) throw new Error(result?.mensaje || 'No se pudo guardar.');
            showMessage(message,'Persona guardada correctamente.');
            form.reset();
            form.elements.activo.checked = true;
            await loadRows();
          } catch (error) {
            showMessage(message,error.message,'error');
          }
        });

        await loadRows();
      };

      const renderAccounts = async selectedResidentId => {
        content.innerHTML=`
          <div class="residents-toolbar">
            <div>
              <h5>Cuentas y tasas</h5>
              <p>Gestioná agua, luz, tasa por hectárea, inmobiliaria y otros conceptos.</p>
            </div>
          </div>

          <div class="residents-two-columns">
            <form id="account-form" class="residents-card residents-form">
              <h6>Nueva tasa o deuda</h6>
              <label>Persona<select name="contribuyente_id" required><option value="">Cargando…</option></select></label>
              <label>Concepto
                <select name="concepto" required>
                  <option>Agua</option>
                  <option>Luz</option>
                  <option>Tasa comunal</option>
                  <option>Tasa por hectárea</option>
                  <option>Tasa inmobiliaria</option>
                  <option>Otro</option>
                </select>
              </label>
              <label>Período<input name="periodo" placeholder="Ej.: Julio 2026" required></label>
              <label>Importe<input name="importe" type="number" min="0" step="0.01" required></label>
              <label>Vencimiento<input name="vencimiento" type="date"></label>
              <label>Estado
                <select name="estado">
                  <option>Pendiente</option>
                  <option>Pagado</option>
                  <option>Vencido</option>
                </select>
              </label>
              <button type="submit" class="residents-primary-button">Guardar tasa o deuda</button>
              <p class="residents-message" data-account-message></p>
            </form>

            <div class="residents-card">
              <div class="residents-list-filter">
                <label>Filtrar persona<select id="accounts-filter"><option value="">Todas</option></select></label>
                <label>Filtrar estado
                  <select id="accounts-state-filter">
                    <option value="">Todos</option>
                    <option>Pendiente</option>
                    <option>Pagado</option>
                    <option>Vencido</option>
                  </select>
                </label>
              </div>
              <div id="accounts-list">Cargando…</div>
            </div>
          </div>`;

        let contributors = [];
        let obligations = [];
        const personSelect = $('#account-form select[name="contribuyente_id"]');
        const filterSelect = $('#accounts-filter');

        const draw = () => {
          const selectedPerson = filterSelect.value;
          const selectedState = $('#accounts-state-filter').value;
          const list = $('#accounts-list');

          const rows = obligations.filter(row =>
            (!selectedPerson || row.contribuyente_id === selectedPerson) &&
            (!selectedState || row.estado === selectedState)
          );

          list.innerHTML = rows.length ? rows.map(row => `
            <article class="resident-obligation-card" data-obligation="${row.id}">
              <div>
                <strong>${escapeHTML(row.contribuyentes?.nombre || 'Persona')}</strong>
                <span>${escapeHTML(row.concepto)} · ${escapeHTML(row.periodo)}</span>
                <small>${row.vencimiento ? `Vence: ${escapeHTML(row.vencimiento)}` : 'Sin vencimiento'}</small>
              </div>
              <div class="resident-obligation-value">
                <strong>${currency(row.importe)}</strong>
                <span class="resident-status ${String(row.estado).toLowerCase()}">${escapeHTML(row.estado)}</span>
              </div>
              <div class="resident-card-actions">
                <button type="button" data-toggle-paid>${row.estado === 'Pagado' ? 'Marcar pendiente' : 'Marcar pagado'}</button>
                <button type="button" class="danger" data-delete-obligation>Borrar</button>
              </div>
            </article>`).join('') : '<p>No hay tasas para este filtro.</p>';

          $$('[data-toggle-paid]', list).forEach(button => button.addEventListener('click', async () => {
            const card = button.closest('[data-obligation]');
            const row = obligations.find(item => String(item.id) === card.dataset.obligation);
            const estado = row.estado === 'Pagado' ? 'Pendiente' : 'Pagado';
            await request(`/rest/v1/obligaciones?id=eq.${card.dataset.obligation}`, {
              method:'PATCH',
              headers:{'Content-Type':'application/json','Prefer':'return=minimal'},
              body:JSON.stringify({estado,updated_at:new Date().toISOString()})
            }, true);
            await loadObligations();
          }));

          $$('[data-delete-obligation]', list).forEach(button => button.addEventListener('click', async () => {
            const card = button.closest('[data-obligation]');
            if (!confirm('¿Borrar esta tasa?')) return;
            await request(`/rest/v1/obligaciones?id=eq.${card.dataset.obligation}`, {
              method:'DELETE',
              headers:{'Prefer':'return=minimal'}
            }, true);
            await loadObligations();
          }));
        };

        const loadObligations = async () => {
          obligations = await request('/rest/v1/obligaciones?select=*,contribuyentes(nombre)&order=created_at.desc', {}, true);
          draw();
        };

        contributors = await request('/rest/v1/contribuyentes?select=id,nombre,dni_normalizado&activo=eq.true&order=nombre.asc', {}, true);
        const options = contributors.map(row =>
          `<option value="${row.id}">${escapeHTML(row.nombre)} · DNI …${escapeHTML(String(row.dni_normalizado).slice(-4))}</option>`
        ).join('');

        personSelect.innerHTML = '<option value="">Seleccionar persona</option>' + options;
        filterSelect.innerHTML = '<option value="">Todas</option>' + options;

        if (selectedResidentId) {
          personSelect.value = selectedResidentId;
          filterSelect.value = selectedResidentId;
        }

        filterSelect.addEventListener('change', draw);
        $('#accounts-state-filter').addEventListener('change', draw);

        $('#account-form').addEventListener('submit', async event => {
          event.preventDefault();
          const form = event.target;
          const data = Object.fromEntries(new FormData(form));
          const message = $('[data-account-message]', form);
          showMessage(message,'Guardando…');

          try {
            data.importe = Number(data.importe || 0);
            if (!data.vencimiento) delete data.vencimiento;
            await request('/rest/v1/obligaciones', {
              method:'POST',
              headers:{'Content-Type':'application/json','Prefer':'return=minimal'},
              body:JSON.stringify(data)
            }, true);
            showMessage(message,'Tasa guardada correctamente.');
            const keepPerson = data.contribuyente_id;
            form.reset();
            form.elements.contribuyente_id.value = keepPerson;
            await loadObligations();
          } catch (error) {
            showMessage(message,error.message,'error');
          }
        });

        await loadObligations();
      };

      const renderImport = () => {
        content.innerHTML=`
          <div class="residents-toolbar">
            <div>
              <h5>Importar datos</h5>
              <p>Cargá muchas personas y tasas de una sola vez desde Excel guardado como CSV.</p>
            </div>
          </div>

          <div class="residents-import-grid">
            <section class="residents-card">
              <h6>Formato para personas</h6>
              <p>Columnas requeridas:</p>
              <code>nombre,dni,codigo,activo</code>
              <p class="residents-import-example">Ejemplo:<br>Juan Pérez,12345678,LP583921,true</p>
              <input type="file" id="import-people-file" accept=".csv,text/csv">
              <button type="button" class="residents-primary-button" id="import-people-button">Importar personas</button>
              <p class="residents-message" id="import-people-message"></p>
            </section>

            <section class="residents-card">
              <h6>Formato para tasas</h6>
              <p>Columnas requeridas:</p>
              <code>dni,concepto,periodo,importe,vencimiento,estado</code>
              <p class="residents-import-example">Ejemplo:<br>12345678,Agua,Julio 2026,25000,2026-07-31,Pendiente</p>
              <input type="file" id="import-debts-file" accept=".csv,text/csv">
              <button type="button" class="residents-primary-button" id="import-debts-button">Importar tasas</button>
              <p class="residents-message" id="import-debts-message"></p>
            </section>
          </div>

          <div class="residents-card residents-import-note">
            <strong>Importación masiva</strong>
            <p>Podés preparar el archivo en Excel, elegir “Guardar como CSV UTF-8” y cargarlo acá. El sistema valida fila por fila y evita que tengas que escribir todo manualmente.</p>
          </div>`;

        const parseCsv = text => {
          const lines = text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(line => line.trim());
          if (lines.length < 2) return [];
          const separator = lines[0].includes(';') ? ';' : ',';
          const headers = lines[0].split(separator).map(value => value.trim().toLowerCase());

          return lines.slice(1).map(line => {
            const values = line.split(separator).map(value => value.trim());
            return Object.fromEntries(headers.map((header,index) => [header, values[index] ?? '']));
          });
        };

        $('#import-people-button').addEventListener('click', async () => {
          const file = $('#import-people-file').files[0];
          const message = $('#import-people-message');
          if (!file) return showMessage(message,'Elegí un archivo CSV.','error');

          const rows = parseCsv(await file.text());
          showMessage(message,`Importando ${rows.length} personas…`);

          try {
            const result = await request('/rest/v1/rpc/admin_importar_contribuyentes_beta', {
              method:'POST',
              headers:{'Content-Type':'application/json'},
              body:JSON.stringify({p_filas:rows})
            }, true);

            showMessage(message,`Importación terminada: ${result?.creados || 0} creados, ${result?.actualizados || 0} actualizados y ${result?.errores || 0} errores.`);
          } catch (error) {
            showMessage(message,error.message,'error');
          }
        });

        $('#import-debts-button').addEventListener('click', async () => {
          const file = $('#import-debts-file').files[0];
          const message = $('#import-debts-message');
          if (!file) return showMessage(message,'Elegí un archivo CSV.','error');

          const rows = parseCsv(await file.text());
          showMessage(message,`Importando ${rows.length} tasas…`);

          try {
            const result = await request('/rest/v1/rpc/admin_importar_obligaciones_beta', {
              method:'POST',
              headers:{'Content-Type':'application/json'},
              body:JSON.stringify({p_filas:rows})
            }, true);

            showMessage(message,`Importación terminada: ${result?.creados || 0} tasas creadas y ${result?.errores || 0} errores.`);
          } catch (error) {
            showMessage(message,error.message,'error');
          }
        });
      };

      const renderPayments = async () => {
        content.innerHTML=`
          <div class="residents-toolbar">
            <div>
              <h5>Pagos informados</h5>
              <p>Aprobá o rechazá comprobantes enviados desde el portal.</p>
            </div>
          </div>
          <div class="residents-card"><div id="residents-payments-list">Cargando…</div></div>`;

        const list = $('#residents-payments-list');

        try {
          const rows = await request('/rest/v1/pagos_informados?select=*,contribuyentes(nombre,dni_normalizado)&order=created_at.desc', {}, true);

          list.innerHTML = rows?.length ? rows.map(row => `
            <article class="resident-payment-card" data-payment="${row.id}">
              <div>
                <strong>${escapeHTML(row.contribuyentes?.nombre || 'Persona')}</strong>
                <span>${escapeHTML(row.concepto)} · ${currency(row.importe)}</span>
                <small>${escapeHTML(row.fecha_pago || '')}${row.referencia ? ` · Ref. ${escapeHTML(row.referencia)}` : ''}</small>
              </div>
              <span class="resident-status ${String(row.estado).toLowerCase()}">${escapeHTML(row.estado)}</span>
              <div class="resident-card-actions">
                <button type="button" data-payment-status="Aprobado">Aprobar</button>
                <button type="button" class="danger" data-payment-status="Rechazado">Rechazar</button>
              </div>
            </article>`).join('') : '<p>No hay pagos informados.</p>';

          $$('[data-payment-status]', list).forEach(button => button.addEventListener('click', async () => {
            const card = button.closest('[data-payment]');
            const estado = button.dataset.paymentStatus;
            await request(`/rest/v1/pagos_informados?id=eq.${card.dataset.payment}`, {
              method:'PATCH',
              headers:{'Content-Type':'application/json','Prefer':'return=minimal'},
              body:JSON.stringify({estado})
            }, true);
            renderPayments();
          }));
        } catch (error) {
          list.textContent = error.message;
        }
      };

      const renderCurrent = () => {
        if (currentView === 'people') renderPeople();
        if (currentView === 'accounts') renderAccounts();
        if (currentView === 'import') renderImport();
        if (currentView === 'payments') renderPayments();
      };

      $$('.residents-subnav button').forEach(button => button.addEventListener('click', () => {
        currentView = button.dataset.residentsView;
        $$('.residents-subnav button').forEach(btn => btn.classList.toggle('active', btn === button));
        renderCurrent();
      }));

      $('#residents-help')?.addEventListener('click', () => {
        alert('1. Importá personas o crealas manualmente.\n2. Cargá o importá las tasas.\n3. La persona entra con DNI y código.\n4. Cuando paga, informa el pago y administración lo aprueba.');
      });

      renderPeople();
      return;
    }

    if(name==='providers'){

      panel.innerHTML=`
        <div class="portal-admin-module-head">
          <h4>Proveedores registrados</h4>
          <small>Solicitudes recibidas desde la página</small>
        </div>
        <div class="portal-admin-list portal-admin-wide-list" id="providers-admin-list">Cargando…</div>`;
      try{
        const rows = await request('/rest/v1/proveedores?select=*&order=created_at.desc', {}, true);
        const list = $('#providers-admin-list');
        list.innerHTML = rows?.length ? rows.map(row => `
          <article class="portal-admin-item provider-admin-item" data-provider="${row.id}">
            <strong>${escapeHTML(row.nombre)}</strong>
            <small>${escapeHTML(row.rubro)} · CUIT ${escapeHTML(row.cuit)}</small>
            <p>${escapeHTML(row.telefono)} · ${escapeHTML(row.email)}${row.localidad ? ` · ${escapeHTML(row.localidad)}` : ''}</p>
            ${row.detalle ? `<p>${escapeHTML(row.detalle)}</p>` : ''}
            <div class="portal-admin-item-actions">
              <select data-provider-status>
                ${['Recibido','En revisión','Aprobado','Descartado'].map(status =>
                  `<option ${row.estado === status ? 'selected' : ''}>${status}</option>`
                ).join('')}
              </select>
              <button class="edit" data-provider-save>Guardar estado</button>
              <button class="danger" data-provider-delete>Borrar</button>
            </div>
          </article>`).join('') : '<p>No hay proveedores registrados.</p>';

        $$('[data-provider-save]', list).forEach(button => button.addEventListener('click', async () => {
          const card = button.closest('[data-provider]');
          const estado = $('[data-provider-status]', card).value;
          await request(`/rest/v1/proveedores?id=eq.${card.dataset.provider}`, {
            method:'PATCH',
            headers:{'Content-Type':'application/json','Prefer':'return=minimal'},
            body:JSON.stringify({estado})
          }, true);
          button.textContent='Guardado';
          setTimeout(() => button.textContent='Guardar estado', 1200);
        }));

        $$('[data-provider-delete]', list).forEach(button => button.addEventListener('click', async () => {
          const card = button.closest('[data-provider]');
          if (!confirm('¿Borrar este proveedor?')) return;
          await request(`/rest/v1/proveedores?id=eq.${card.dataset.provider}`, {
            method:'DELETE',
            headers:{'Prefer':'return=minimal'}
          }, true);
          loadAdminPanel('providers');
        }));
      }catch(error){
        $('#providers-admin-list').textContent = error.message;
      }
      return;
    }

    if(name==='subscribers'){
      panel.innerHTML=`
        <div class="portal-admin-module-head">
          <h4>Suscripciones</h4>
          <small>Correos que solicitaron recibir novedades</small>
        </div>
        <div class="portal-admin-list portal-admin-wide-list" id="subscribers-admin-list">Cargando…</div>`;
      try{
        const rows = await request('/rest/v1/suscriptores?select=*&order=created_at.desc', {}, true);
        const list = $('#subscribers-admin-list');
        list.innerHTML = rows?.length ? rows.map(row => `
          <article class="portal-admin-item subscriber-admin-item" data-subscriber="${row.id}">
            <strong>${escapeHTML(row.email)}</strong>
            <small>${row.activo ? 'Suscripción activa' : 'Suscripción inactiva'}</small>
            <div class="portal-admin-item-actions">
              <button class="edit" data-subscriber-toggle>${row.activo ? 'Desactivar' : 'Activar'}</button>
              <button class="danger" data-subscriber-delete>Borrar</button>
            </div>
          </article>`).join('') : '<p>No hay suscriptores.</p>';

        $$('[data-subscriber-toggle]', list).forEach(button => button.addEventListener('click', async () => {
          const card = button.closest('[data-subscriber]');
          const row = rows.find(item => String(item.id) === card.dataset.subscriber);
          await request(`/rest/v1/suscriptores?id=eq.${card.dataset.subscriber}`, {
            method:'PATCH',
            headers:{'Content-Type':'application/json','Prefer':'return=minimal'},
            body:JSON.stringify({activo: !row.activo})
          }, true);
          loadAdminPanel('subscribers');
        }));

        $$('[data-subscriber-delete]', list).forEach(button => button.addEventListener('click', async () => {
          const card = button.closest('[data-subscriber]');
          if (!confirm('¿Borrar esta suscripción?')) return;
          await request(`/rest/v1/suscriptores?id=eq.${card.dataset.subscriber}`, {
            method:'DELETE',
            headers:{'Prefer':'return=minimal'}
          }, true);
          loadAdminPanel('subscribers');
        }));
      }catch(error){
        $('#subscribers-admin-list').textContent = error.message;
      }
      return;
    }

    if(name==='stats'){
      panel.innerHTML='<div class="portal-admin-module-head"><h4>Estadísticas generales</h4></div><div class="portal-admin-list" id="portal-stats">Cargando…</div>';
      try{
        const [news,subs,providers,votes]=await Promise.all([
          request('/rest/v1/noticias?select=id,publicada,eliminada'),
          request('/rest/v1/suscriptores?select=id'),
          request('/rest/v1/proveedores?select=id'),
          request('/rest/v1/votos_encuesta?select=id')
        ]);
        $('#portal-stats').innerHTML=`
          <article class="portal-admin-item"><strong>${news?.length||0}</strong><small>Noticias totales</small></article>
          <article class="portal-admin-item"><strong>${news?.filter(n=>n.publicada&&!n.eliminada).length||0}</strong><small>Noticias publicadas</small></article>
          <article class="portal-admin-item"><strong>${subs?.length||0}</strong><small>Suscriptores</small></article>
          <article class="portal-admin-item"><strong>${providers?.length||0}</strong><small>Proveedores registrados</small></article>
          <article class="portal-admin-item"><strong>${votes?.length||0}</strong><small>Votos en encuestas</small></article>`;
      }catch(e){$('#portal-stats').textContent=e.message}
      return;
    }

    const cfg=configs[name];
    const alertHelp = name === 'alerts'
      ? `<div class="alerts-admin-help">
          <strong>Crear un aviso es simple</strong>
          <span>Elegí el tipo, indicá fecha y horario, agregá un detalle solamente si hace falta y marcá “Mostrar aviso”.</span>
        </div>`
      : '';

    panel.innerHTML=`
      <div class="portal-admin-module-head"><h4>${cfg.title}</h4><small>Guardado online en Supabase</small></div>
      ${alertHelp}
      <div class="portal-admin-grid">
        <form class="portal-admin-form" data-module-form>
          <input type="hidden" name="id">
          ${cfg.fields.map(fieldHTML).join('')}
          <button class="portal-save-button" type="submit">Guardar cambios</button>
          <small data-module-message></small>
        </form>
        <div class="portal-admin-list" data-module-list>Cargando…</div>
      </div>`;

    const form=$('[data-module-form]',panel);
    form.addEventListener('submit',async e=>{
      e.preventDefault();
      const fd=new FormData(form); const payload={};
      cfg.fields.forEach(([key,,type])=>{
        const el=form.elements[key];
        if(type==='checkbox')payload[key]=el.checked;
        else if(type==='number')payload[key]=Number(el.value||0);
        else payload[key]=el.value.trim();
      });
      if(name==='surveys'){
        payload.opciones=(payload.opciones_texto||'').split('\n').map(x=>x.trim()).filter(Boolean);
        delete payload.opciones_texto;
      }

      if(name==='alerts'){
        const category = payload.categoria || 'Otro aviso';
        const dateText = payload.fecha
          ? new Intl.DateTimeFormat('es-AR', {day:'2-digit', month:'2-digit', year:'numeric'})
              .format(new Date(payload.fecha + 'T12:00:00'))
          : '';
        const timeRange = payload.hora_desde
          ? ` de ${payload.hora_desde}${payload.hora_hasta ? ` a ${payload.hora_hasta}` : ''}`
          : '';
        const datePart = dateText ? ` el ${dateText}` : '';
        const detailPart = payload.detalle ? `. ${payload.detalle}` : '';

        payload.titulo = category;
        payload.mensaje = `${category}${datePart}${timeRange}${detailPart}`;
        payload.tipo = ['Corte de luz','Corte de agua','Alerta meteorológica','Calle cortada']
          .includes(category) ? 'danger' : 'info';
        payload.prioridad = payload.activo ? 10 : 0;
      }

      const id=form.elements.id.value;
      try{
        await request(`/rest/v1/${cfg.table}${id?`?id=eq.${id}`:''}`,{
          method:id?'PATCH':'POST',
          headers:{'Content-Type':'application/json','Prefer':'return=minimal'},
          body:JSON.stringify(payload)
        },true);
        $('[data-module-message]',form).textContent='Guardado correctamente.';
        form.reset(); form.elements.id.value='';
        loadAdminPanel(name); loadAlerts(); loadImportantSection();
      }catch(err){$('[data-module-message]',form).textContent=err.message}
    });

    try{
      const rows=await request(`/rest/v1/${cfg.table}?select=*&order=created_at.desc`,{},true);
      const list=$('[data-module-list]',panel);
      list.innerHTML=rows?.length?rows.map(r=>`
        <article class="portal-admin-item" data-row="${r.id}">
          <strong>${escapeHTML(cfg.summary(r))}</strong>
          <small>${r.created_at?formatDate(r.created_at):''}</small>
          <div class="portal-admin-item-actions">
            <button class="edit" data-edit>Editar</button>
            <button class="danger" data-delete>Borrar</button>
          </div>
        </article>`).join(''):'<p>No hay registros.</p>';

      $$('[data-edit]',list).forEach(btn=>btn.addEventListener('click',()=>{
        const id=btn.closest('[data-row]').dataset.row; const row=rows.find(r=>String(r.id)===id);
        form.elements.id.value=row.id;
        cfg.fields.forEach(([key,,type])=>{
          const el=form.elements[key]; if(!el)return;
          let value=row[key];
          if(name==='surveys'&&key==='opciones_texto')value=(row.opciones||[]).join('\n');
          if(type==='checkbox')el.checked=Boolean(value);
          else if(type==='datetime-local'&&value)el.value=new Date(value).toISOString().slice(0,16);
          else el.value=value??'';
        });
        form.scrollIntoView({behavior:'smooth'});
      }));
      $$('[data-delete]',list).forEach(btn=>btn.addEventListener('click',async()=>{
        const id=btn.closest('[data-row]').dataset.row;
        if(!confirm('¿Borrar definitivamente este registro?'))return;
        await request(`/rest/v1/${cfg.table}?id=eq.${id}`,{method:'DELETE',headers:{'Prefer':'return=minimal'}},true);
        loadAdminPanel(name); loadAlerts(); loadImportantSection();
      }));
    }catch(e){$('[data-module-list]',panel).textContent=e.message}
  }


  const heroTramitesLink = $('#hero-tramites-link');

  heroTramitesLink?.addEventListener('click', event => {
    event.preventDefault();

    const section = $('#portal-ciudadano');
    section?.scrollIntoView({
      behavior:'smooth',
      block:'start'
    });

    setTimeout(() => {
      $('[data-portal-open="tramites"]')?.focus();
    }, 650);
  });

  loadAlerts();
  loadImportantSection();

  // Respaldo periódico y refresco al volver a abrir la pestaña o la app.
  const refreshExpiredAlerts = async () => {
    await loadAlerts();
    await loadImportantSection();

    const dialog = $('#public-alerts-dialog');
    if (dialog?.open) renderPublicAlerts();
  };

  setInterval(refreshExpiredAlerts, 30000);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshExpiredAlerts();
  });

  window.addEventListener('focus', refreshExpiredAlerts);
  window.addEventListener('pageshow', refreshExpiredAlerts);
})();


// ==========================================================
// B22 — Protección visual de fotografías y orden del panel
// ==========================================================
(() => {
  document.addEventListener('error', event => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement)) return;
    if (image.dataset.fallbackApplied === 'true') return;
    image.dataset.fallbackApplied = 'true';
    image.src = 'assets/portada-hd.png';
  }, true);

  const sortSelect = document.querySelector('#news-sort');
  const adminList = document.querySelector('#news-admin-list');

  function reorderVisibleNews() {
    if (!sortSelect || !adminList) return;
    const cards = [...adminList.querySelectorAll('.news-admin-item')];
    if (cards.length < 2) return;

    cards.sort((a, b) => {
      const titleA = (a.querySelector('.news-admin-copy > strong')?.textContent || '').trim();
      const titleB = (b.querySelector('.news-admin-copy > strong')?.textContent || '').trim();

      if (sortSelect.value === 'title') {
        return titleA.localeCompare(titleB, 'es');
      }
      if (sortSelect.value === 'oldest') {
        return -1;
      }
      return 0;
    });

    cards.forEach(card => adminList.appendChild(card));
  }

  sortSelect?.addEventListener('change', reorderVisibleNews);

  if (adminList) {
    new MutationObserver(() => {
      if (sortSelect?.value === 'title') reorderVisibleNews();
    }).observe(adminList, { childList: true });
  }
})();


// ==========================================================
// V28 — Posición fija y ordenada de Avisos, Noticias y WhatsApp
// ==========================================================
(() => {
  const resetFloatingButtons = () => {
    const settings = [
      ['.floating-alerts', '150px'],
      ['.floating-news', '84px'],
      ['.floating-whatsapp', '18px']
    ];

    [
      'floatingNewsPositionB18Final',
      'floatingWhatsAppPositionB18Final'
    ].forEach(key => localStorage.removeItem(key));

    settings.forEach(([selector, bottom]) => {
      const element = document.querySelector(selector);
      if (!element) return;
      element.classList.remove('dragging', 'was-dragged');
      element.style.removeProperty('left');
      element.style.removeProperty('top');
      element.style.setProperty('right', '18px', 'important');
      element.style.setProperty('bottom', bottom, 'important');
    });
  };

  resetFloatingButtons();
  addEventListener('resize', resetFloatingButtons);
})();


// V36 — Limpieza de temporizadores visuales al cerrar el portal.
document.querySelector('#portal-dialog')?.addEventListener('close', () => {
  clearInterval(window.__citizenCountdownInterval);
});
