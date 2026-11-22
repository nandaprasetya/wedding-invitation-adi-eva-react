import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDb } from '../lib/firebase';
import { buildOrderPayload, generateOrderCode } from '../utils/orderHelpers';

const ORDERS_COLLECTION = 'orders';

export function normalizeOrderCode(rawCode) {
  return String(rawCode || '').trim().toUpperCase().replace(/\s+/g, '');
}

export async function createOrder(formState) {
  const db = getDb();
  const orderCode = generateOrderCode();
  const payload = buildOrderPayload(formState, orderCode);

  await setDoc(doc(db, ORDERS_COLLECTION, orderCode), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return {
    orderCode,
    order: {
      ...payload,
      createdAt: new Date().toISOString(),
    },
  };
}

export async function getOrderByCode(rawCode) {
  const orderCode = normalizeOrderCode(rawCode);
  if (!orderCode) return null;

  const db = getDb();
  const snap = await getDoc(doc(db, ORDERS_COLLECTION, orderCode));
  if (!snap.exists()) return null;

  const data = snap.data();
  const createdAt =
    typeof data.createdAt?.toDate === 'function'
      ? data.createdAt.toDate().toISOString()
      : data.createdAt || null;

  return {
    ...data,
    orderCode: data.orderCode || snap.id,
    createdAt,
  };
}
