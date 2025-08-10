import { db } from '@/lib/firebaseClient';
import { doc, getDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import type { Subscription } from '@/lib/data';

export type UserSubsDoc = {
  items: Array<Subscription>;
  updatedAt?: number;
};

export function subsDocRef(userId: string) {
  return doc(db, 'subscriptions', userId);
}

export async function getUserSubs(userId: string): Promise<Subscription[]> {
  const ref = subsDocRef(userId);
  const snap = await getDoc(ref);
  const data = snap.exists() ? (snap.data() as UserSubsDoc) : { items: [] };
  return Array.isArray(data.items) ? data.items : [];
}

export function listenUserSubs(userId: string, cb: (items: Subscription[]) => void) {
  return onSnapshot(subsDocRef(userId), (snap) => {
    const data = snap.exists() ? (snap.data() as UserSubsDoc) : { items: [] };
    cb(Array.isArray(data.items) ? data.items : []);
  });
}

export async function setUserSubs(userId: string, items: Subscription[]) {
  await setDoc(subsDocRef(userId), { items, updatedAt: Date.now() } as UserSubsDoc, { merge: true });
}

export async function upsertUserSub(userId: string, sub: Subscription) {
  const current = await getUserSubs(userId);
  const idx = current.findIndex((s) => s.id === sub.id);
  if (idx >= 0) current[idx] = { ...current[idx], ...sub };
  else current.push(sub);
  await setUserSubs(userId, current);
}

export async function removeUserSub(userId: string, id: string) {
  const current = await getUserSubs(userId);
  const next = current.filter((s) => s.id !== id);
  await setUserSubs(userId, next);
}


