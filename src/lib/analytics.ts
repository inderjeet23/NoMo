import { getFirebaseApp } from './firebaseClient';
import { getAnalytics, logEvent, isSupported } from 'firebase/analytics';

let analyticsReady: Promise<void> | null = null;

async function ensureAnalytics() {
  if (typeof window === 'undefined') return;
  if (!analyticsReady) {
    analyticsReady = (async () => {
      if (await isSupported()) getAnalytics(getFirebaseApp());
    })();
  }
  await analyticsReady;
}

export async function track(event: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  await ensureAnalytics();
  try {
    const analytics = getAnalytics();
    logEvent(analytics, event, params as Record<string, string | number | boolean | null | undefined>);
  } catch {
    // no-op
  }
}


