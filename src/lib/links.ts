/**
 * The fine-print links, on locturne.com (the locturne_landing Astro site, live since 2026-10-04). Apple requires working Terms
 * (EULA) and Privacy links on the paywall and in App Store Connect before review, and the
 * support page is the listing's Support URL.
 */
export const LEGAL_URLS = {
  terms: 'https://locturne.com/terms',
  privacy: 'https://locturne.com/privacy',
  support: 'https://locturne.com/support',
} as const;

/** Where "Send feedback" goes. Set up the mailbox before review (docs/TODO.md, Website). */
export const SUPPORT_EMAIL = 'hello@locturne.com';
