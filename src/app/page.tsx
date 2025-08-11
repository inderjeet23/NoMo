"use client";
import Header from "./components/Header";
import SubscriptionList from "./components/SubscriptionList";
import ConciergeForm from "./components/ConciergeForm";
import { subscriptions } from "@/lib/data";
import { getLocalSubscriptions } from "@/lib/localSubs";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getUserSubs, listenUserSubs, setUserSubs } from "@/lib/firestoreSubs";
import OverviewWidgets from "./components/OverviewWidgets";

export default function Home() {
  const { data: session } = useSession();
  const [allSubs, setAllSubs] = useState(subscriptions);
  const [visibleActive, setVisibleActive] = useState(subscriptions);

  useEffect(() => {
    // Anonymous: localStorage; Authenticated: Firestore
    const uid = (session?.user as unknown as { id?: string })?.id || session?.user?.email || null;
    if (!uid) {
      const locals = getLocalSubscriptions();
      const base = [...subscriptions, ...locals.map((l) => ({ ...l }))];
      setAllSubs(base);
      setVisibleActive(base);
      return;
    }
    // Authenticated: load once and subscribe to changes
    let unsubscribe: (() => void) | undefined;
    (async () => {
      const initial = await getUserSubs(uid);
      const base = initial; // Do not seed defaults into Firestore for signed-in users
      setAllSubs(base);
      setVisibleActive(base);
      unsubscribe = listenUserSubs(uid, (items) => {
        const list = items && items.length ? items : subscriptions;
        setAllSubs(list);
        setVisibleActive(list);
      });
    })();
    return () => { if (unsubscribe) unsubscribe(); };
  }, [session]);

  return (
    <main className="min-h-screen bg-app text-app px-3 sm:px-4 pb-24">
      <Header />

      <div className="w-full max-w-5xl mx-auto grid gap-6 sm:gap-8">
        <OverviewWidgets items={visibleActive} />
        <SubscriptionList
          items={allSubs}
          onItemsChange={(list)=>{ setVisibleActive(list); }}
        />

        <section className="mt-8 card p-6">
          <h3 className="text-xl font-extrabold mb-3">Still need help? ✉️ Request Concierge</h3>
          <ConciergeForm />
        </section>
      </div>
    </main>
  );
}
