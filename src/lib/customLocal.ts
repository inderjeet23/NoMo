export type CustomLocal = {
  id: string;
  name: string;
  pricePerMonthUsd: number;
  cancelUrl?: string;
  cadence?: 'month' | 'year';
  nextChargeAt?: string;
  notifyEmail?: boolean;
};

const KEY = 'nomo.custom.v1';

export function getCustomLocal(): CustomLocal[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (Array.isArray(data)) return data as CustomLocal[];
    return [];
  } catch {
    return [];
  }
}

export function setCustomLocal(list: CustomLocal[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function upsertCustomLocal(entry: CustomLocal) {
  const list = getCustomLocal();
  const idx = list.findIndex((x) => x.id === entry.id);
  if (idx >= 0) list[idx] = { ...list[idx], ...entry };
  else list.push(entry);
  setCustomLocal(list);
}

export function removeCustomLocal(id: string) {
  const list = getCustomLocal();
  const next = list.filter((x) => x.id !== id);
  setCustomLocal(next);
}


