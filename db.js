const DB_NAME = 'trackit';
const DB_VERSION = 1;
const STORE = 'items';

let dbPromise;

function openDb() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('categoryId', 'categoryId', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

async function tx(mode, run) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const store = transaction.objectStore(STORE);
    let result;
    try {
      result = run(store);
    } catch (error) {
      transaction.abort();
      reject(error);
      return;
    }
    transaction.oncomplete = () => resolve(result && result.__req ? result.__req.result : result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export async function addItem(item) {
  return tx('readwrite', (store) => ({
    __req: store.add({
      categoryId: item.categoryId,
      name: item.name,
      brand: item.brand || '',
      quantity: item.quantity || '',
      photo: item.photo || null,
      bought: false,
      createdAt: Date.now()
    })
  }));
}

export async function getAllItems() {
  const items = await tx('readonly', (store) => ({ __req: store.getAll() }));
  return items.sort((a, b) => a.createdAt - b.createdAt);
}

export async function getItemsByCategory(categoryId) {
  const items = await getAllItems();
  return items.filter((item) => item.categoryId === categoryId);
}

export async function updateItem(id, changes) {
  return tx('readwrite', (store) => {
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const existing = getRequest.result;
      if (existing) store.put({ ...existing, ...changes });
    };
  });
}

export async function deleteItem(id) {
  return tx('readwrite', (store) => {
    store.delete(id);
  });
}

export async function clearBought() {
  const items = await getAllItems();
  const boughtIds = items.filter((item) => item.bought).map((item) => item.id);
  return tx('readwrite', (store) => {
    boughtIds.forEach((id) => store.delete(id));
  });
}
