export type LocalSubscription = {
  id: string;
  name: string;
  pricePerMonthUsd: number;
  cancelUrl: string;
};

const STORAGE_KEY = "nomo.local.subscriptions";

export function getLocalSubscriptions(): LocalSubscription[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (Array.isArray(data)) return data as LocalSubscription[];
    return [];
  } catch {
    return [];
  }
}

export function addLocalSubscription(sub: LocalSubscription) {
  if (typeof window === "undefined") return;
  const existing = getLocalSubscriptions();
  const next = [...existing, sub];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}


