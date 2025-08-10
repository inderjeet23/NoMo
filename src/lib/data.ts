export type Subscription = {
  id: string;
  name: string;
  pricePerMonthUsd: number;
  cancelUrl: string;
  websiteUrl?: string;
  renewsInDays?: number;
  cadence?: 'month' | 'year';
  nextChargeAt?: string; // ISO date string
};

export const subscriptions: Subscription[] = [
  {
    id: "netflix",
    name: "Netflix",
    pricePerMonthUsd: 15.49,
    cancelUrl: "https://www.netflix.com/cancelplan",
    websiteUrl: "https://www.netflix.com",
    renewsInDays: 5,
  },
  {
    id: "spotify",
    name: "Spotify",
    pricePerMonthUsd: 9.99,
    cancelUrl: "https://www.spotify.com/account/subscription/",
    websiteUrl: "https://www.spotify.com",
  },
  {
    id: "adobe-cc",
    name: "Adobe Creative Cloud",
    pricePerMonthUsd: 52.99,
    cancelUrl: "https://account.adobe.com/plans",
    websiteUrl: "https://www.adobe.com",
  },
];
