export type Preferences = {
  hiddenIds: string[];
  showSuggestions: boolean;
  sort: 'name' | 'price';
};

const PREFS_KEY = 'nomo.prefs.v1';

export function getPrefs(): Preferences {
  if (typeof window === 'undefined') {
    return { hiddenIds: [], showSuggestions: true, sort: 'name' };
  }
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { hiddenIds: [], showSuggestions: true, sort: 'name' };
    const data = JSON.parse(raw);
    return {
      hiddenIds: Array.isArray(data?.hiddenIds) ? (data.hiddenIds as string[]) : [],
      showSuggestions: typeof data?.showSuggestions === 'boolean' ? data.showSuggestions : true,
      sort: data?.sort === 'price' ? 'price' : 'name',
    } satisfies Preferences;
  } catch {
    return { hiddenIds: [], showSuggestions: true, sort: 'name' };
  }
}

export function setPrefs(next: Preferences) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PREFS_KEY, JSON.stringify(next));
}

export function prefsExists(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(PREFS_KEY) != null;
}


