"use client";
import Header from "./components/Header";
import SubscriptionList from "./components/SubscriptionList";
import ConciergeForm from "./components/ConciergeForm";
import { subscriptions } from "@/lib/data";
import { getLocalSubscriptions } from "@/lib/localSubs";
import { useEffect, useState } from "react";

export default function Home() {
  const [allSubs, setAllSubs] = useState(subscriptions);

  useEffect(() => {
    const locals = getLocalSubscriptions();
    if (locals.length) {
      setAllSubs((prev) => [
        ...prev,
        ...locals.map((l) => ({ ...l })),
      ]);
    }
  }, []);

  return (
    <main className="min-h-screen bg-black text-white px-4 pb-24">
      <Header />

      <div className="w-full max-w-5xl mx-auto grid gap-8">
        <SubscriptionList items={allSubs} />

        <section className="mt-8 bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
          <h3 className="text-xl font-extrabold mb-3">Still need help? ✉️ Request Concierge</h3>
          <ConciergeForm />
        </section>
      </div>
    </main>
  );
}
