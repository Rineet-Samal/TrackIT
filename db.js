import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const itemsCol = collection(firestore, 'items');

export function subscribeItems(onChange, onError) {
  const itemsQuery = query(itemsCol, orderBy('createdAt', 'asc'));
  return onSnapshot(
    itemsQuery,
    (snapshot) => {
      const items = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      onChange(items);
    },
    onError
  );
}

export async function addItem(item) {
  await addDoc(itemsCol, {
    categoryId: item.categoryId,
    name: item.name,
    brand: item.brand || '',
    quantity: item.quantity || '',
    photo: item.photo || null,
    bought: false,
    createdAt: Date.now()
  });
}

export async function updateItem(id, changes) {
  await updateDoc(doc(firestore, 'items', id), changes);
}

export async function deleteItem(id) {
  await deleteDoc(doc(firestore, 'items', id));
}

export async function clearBought(items) {
  const boughtItems = items.filter((item) => item.bought);
  if (!boughtItems.length) return;
  const batch = writeBatch(firestore);
  boughtItems.forEach((item) => batch.delete(doc(firestore, 'items', item.id)));
  await batch.commit();
}
