import { subscribeItems, addItem, updateItem, deleteItem, clearBought } from './db.js';

const CATEGORIES = [
  { id: 'vegetables', name: 'Vegetables', emoji: '\u{1F966}' },
  { id: 'grocery', name: 'Grocery', emoji: '\u{1F6D2}' },
  { id: 'medicine', name: 'Medicine', emoji: '\u{1F48A}' },
  { id: 'dress', name: 'Dress', emoji: '\u{1F455}' },
  { id: 'utensils', name: 'Utensils', emoji: '\u{1F374}' },
  { id: 'book', name: 'Book', emoji: '\u{1F4DA}' },
  { id: 'other', name: 'Other Items', emoji: '\u{1F4E6}' }
];

const categoryById = new Map(CATEGORIES.map((category) => [category.id, category]));

const view = document.getElementById('view');
const backBtn = document.getElementById('backBtn');
const infoDialog = document.getElementById('infoDialog');
const toastEl = document.getElementById('toast');

let pendingPhoto = null;
let toastTimer = null;
let allItems = [];
let itemsLoaded = false;

/* ---------------- helpers ---------------- */

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}

function showToast(message, actionLabel, onAction) {
  clearTimeout(toastTimer);
  toastEl.textContent = '';
  toastEl.append(document.createTextNode(message));

  if (actionLabel && onAction) {
    const button = document.createElement('button');
    button.textContent = actionLabel;
    button.className = 'btn-danger-text';
    button.style.color = '#7ce7b2';
    button.style.marginLeft = '10px';
    button.addEventListener('click', () => {
      toastEl.classList.remove('show');
      onAction();
    });
    toastEl.append(button);
    toastEl.style.pointerEvents = 'auto';
  } else {
    toastEl.style.pointerEvents = 'none';
  }

  toastEl.classList.add('show');
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 4000);
}

function readPhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxSide = 800;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      image.onerror = () => reject(new Error('Could not read that image.'));
      image.src = reader.result;
    };
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsDataURL(file);
  });
}

function openLightbox(src) {
  const dialog = document.createElement('dialog');
  dialog.className = 'lightbox';
  const image = document.createElement('img');
  image.src = src;
  image.alt = 'Item photo';
  dialog.append(image);
  dialog.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
}

function itemSubtitle(item) {
  const parts = [];
  if (item.brand) parts.push(`Brand: ${item.brand}`);
  if (item.quantity) parts.push(`Qty: ${item.quantity}`);
  return parts.join('  \u00B7  ');
}

function renderItemRow(item, { showCategory = false } = {}) {
  const category = categoryById.get(item.categoryId);
  const subtitle = itemSubtitle(item);
  const thumb = item.photo
    ? `<img class="item-thumb" src="${item.photo}" alt="Photo of ${escapeHtml(item.name)}" data-photo="${item.id}" />`
    : `<div class="item-thumb placeholder" aria-hidden="true">${category ? category.emoji : '\u{1F4E6}'}</div>`;

  return `
    <li class="item" data-id="${item.id}">
      <input type="checkbox" aria-label="Mark ${escapeHtml(item.name)} as bought" data-buy="${item.id}" />
      ${thumb}
      <div class="item-body">
        <div class="item-name">${escapeHtml(item.name)}</div>
        <div class="item-sub">${showCategory && category ? escapeHtml(category.name) + (subtitle ? '  \u00B7  ' : '') : ''}${escapeHtml(subtitle)}</div>
      </div>
      <button class="btn-danger-text" data-delete="${item.id}" aria-label="Delete ${escapeHtml(item.name)}">Delete</button>
    </li>`;
}

/* ---------------- views ---------------- */

function renderHome() {
  const pending = allItems.filter((item) => !item.bought);

  const cards = CATEGORIES.map((category) => {
    const count = pending.filter((item) => item.categoryId === category.id).length;
    return `
      <button class="cat-card" data-goto="#/category/${category.id}">
        <span class="cat-emoji" aria-hidden="true">${category.emoji}</span>
        <span class="cat-meta">
          <span class="cat-name">${category.name}</span>
          <span class="cat-count">${count} item${count === 1 ? '' : 's'}</span>
        </span>
      </button>`;
  }).join('');

  view.innerHTML = `
    <h2 class="page-title">Categories</h2>
    <p class="page-sub">Pick a category to add what you need.</p>
    <div class="cat-grid">${cards}</div>
    <button class="btn btn-primary btn-block" data-goto="#/all">
      All items to buy (${pending.length})
    </button>`;
}

function renderCategory(categoryId) {
  const category = categoryById.get(categoryId);
  if (!category) {
    location.hash = '#/';
    return;
  }

  const items = allItems.filter(
    (item) => item.categoryId === categoryId && !item.bought
  );

  const list = items.length
    ? `<ul class="item-list">${items.map((item) => renderItemRow(item)).join('')}</ul>`
    : `<div class="empty"><div class="big">${category.emoji}</div><p>No items yet in ${category.name}.</p></div>`;

  // If the form for this same category is already on screen, only refresh the
  // list below it so an in-progress sync update doesn't wipe what's being typed.
  const existingForm = document.getElementById('addForm');
  if (existingForm && existingForm.dataset.categoryId === categoryId) {
    const listHost = document.getElementById('itemListHost');
    const countEl = document.getElementById('itemCount');
    if (listHost) listHost.innerHTML = list;
    if (countEl) countEl.textContent = String(items.length);
    return;
  }

  view.innerHTML = `
    <h2 class="page-title">${category.emoji} ${category.name}</h2>
    <p class="page-sub">Add an item with your preferred brand, quantity and a sample photo.</p>

    <form class="card" id="addForm" data-category-id="${category.id}" autocomplete="off">
      <div class="field">
        <label for="itemName">Item name *</label>
        <input type="text" id="itemName" name="name" required maxlength="60" placeholder="e.g. Tomatoes" />
      </div>
      <div class="field-row">
        <div class="field">
          <label for="itemBrand">Preferred brand</label>
          <input type="text" id="itemBrand" name="brand" maxlength="40" placeholder="Optional" />
        </div>
        <div class="field">
          <label for="itemQty">Preferred quantity</label>
          <input type="text" id="itemQty" name="quantity" maxlength="20" placeholder="e.g. 1 kg" />
        </div>
      </div>
      <div class="field">
        <label for="itemPhoto">Sample photo / screenshot</label>
        <div class="photo-row">
          <img id="photoPreview" class="photo-preview" alt="" src="icons/icon.svg" />
          <input type="file" id="itemPhoto" accept="image/*" />
        </div>
      </div>
      <button type="submit" class="btn btn-primary btn-block">Add to ${category.name}</button>
    </form>

    <h3 class="group-heading">In this list <span id="itemCount" class="count">${items.length}</span></h3>
    <div id="itemListHost">${list}</div>`;

  pendingPhoto = null;
  document.getElementById('itemPhoto').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) {
      pendingPhoto = null;
      return;
    }
    try {
      pendingPhoto = await readPhoto(file);
      document.getElementById('photoPreview').src = pendingPhoto;
    } catch (error) {
      pendingPhoto = null;
      showToast(error.message);
    }
  });

  document.getElementById('addForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const fields = event.target.elements;
    const name = fields.name.value.trim();
    if (!name) return;

    await addItem({
      categoryId,
      name,
      brand: fields.brand.value.trim(),
      quantity: fields.quantity.value.trim(),
      photo: pendingPhoto
    });

    pendingPhoto = null;
    showToast(`${name} added`);
  });
}

function renderAll() {
  const items = allItems.filter((item) => !item.bought);

  if (!items.length) {
    view.innerHTML = `
      <h2 class="page-title">All items to buy</h2>
      <div class="empty"><div class="big">\u{1F389}</div><p>Nothing left to buy. The list is clear!</p></div>
      <button class="btn btn-ghost btn-block" data-goto="#/">Back to categories</button>`;
    return;
  }

  const groups = CATEGORIES
    .map((category) => ({
      category,
      items: items.filter((item) => item.categoryId === category.id)
    }))
    .filter((group) => group.items.length)
    .map((group) => `
      <h3 class="group-heading">
        ${group.category.emoji} ${group.category.name}
        <span class="count">${group.items.length}</span>
      </h3>
      <ul class="item-list">${group.items.map((item) => renderItemRow(item)).join('')}</ul>`)
    .join('');

  view.innerHTML = `
    <h2 class="page-title">All items to buy</h2>
    <p class="page-sub">Sorted by category. Tick an item once you have bought it.</p>
    ${groups}
    <button class="btn btn-ghost btn-block" id="clearBoughtBtn">Clear bought history</button>`;

  document.getElementById('clearBoughtBtn').addEventListener('click', async () => {
    await clearBought(allItems);
    showToast('Bought items cleared');
  });
}

/* ---------------- routing ---------------- */

function render() {
  if (!itemsLoaded) {
    view.innerHTML = '<p class="page-sub">Loading your list...</p>';
    return;
  }

  const hash = location.hash || '#/';
  backBtn.classList.toggle('hidden', hash === '#/');

  if (hash.startsWith('#/category/')) {
    renderCategory(hash.replace('#/category/', ''));
  } else if (hash === '#/all') {
    renderAll();
  } else {
    renderHome();
  }

  view.focus();
}

/* ---------------- global events ---------------- */

view.addEventListener('click', async (event) => {
  const navTarget = event.target.closest('[data-goto]');
  if (navTarget) {
    location.hash = navTarget.dataset.goto;
    return;
  }

  const photoTarget = event.target.closest('[data-photo]');
  if (photoTarget) {
    openLightbox(photoTarget.src);
    return;
  }

  const deleteTarget = event.target.closest('[data-delete]');
  if (deleteTarget) {
    await deleteItem(deleteTarget.dataset.delete);
    showToast('Item deleted');
  }
});

view.addEventListener('change', async (event) => {
  const checkbox = event.target.closest('[data-buy]');
  if (!checkbox || !checkbox.checked) return;

  const id = checkbox.dataset.buy;
  await updateItem(id, { bought: true });
  showToast('Marked as bought', 'Undo', async () => {
    await updateItem(id, { bought: false });
  });
});

backBtn.addEventListener('click', () => {
  location.hash = '#/';
});

document.getElementById('menuBtn').addEventListener('click', () => infoDialog.showModal());

window.addEventListener('hashchange', render);

subscribeItems(
  (items) => {
    allItems = items;
    itemsLoaded = true;
    render();
  },
  (error) => {
    console.error(error);
    showToast('Could not sync - check your Firebase setup');
  }
);

render();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      /* offline support is optional */
    });
  });
}
