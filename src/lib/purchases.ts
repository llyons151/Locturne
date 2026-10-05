/**
 * Locturne's only door to the App Store's subscriptions. Screens call these functions and
 * never a store SDK. The real store is RevenueCat (`createRevenueCatPurchases` in
 * revenuecat.ts), set at startup by `startPurchases` (purchases-start.ts).
 *
 * GAME_PLAN, "Money": a hard paywall with Annual (7-day trial, the default) and Monthly
 * (no trial), and one exit offer picked by an A/B test. Every price and every trial string
 * on screen comes from `getOffers()`: StoreKit's localized prices, and a trial only when
 * this Apple ID is eligible for the intro offer.
 *
 * Without a RevenueCat key (the placeholder in app.json), in Expo Go and on the web the
 * provider is `createDevPurchases()`, a stub that charges nothing. `isStubbed()` says so, and
 * the paywall shows a preview note while it's true. docs/REVENUECAT_SETUP.md has the setup.
 *
 * Pure TypeScript with no React Native imports, so it runs under `npm test`.
 */

/** The plans on the paywall. */
export type PlanId = 'annual' | 'monthly';

/**
 * The exit-offer test (docs/sub-club/APPLIED_TO_LOCTURNE.md, test 3). Each install gets an
 * arm at random, once (`pickExitArm`), unless the store overrides it (revenuecat.ts):
 * - `none`: closing the paywall exits.
 * - `half-price`: a separate annual product in the same subscription group, same trial.
 * - `longer-trial`: another full-price annual product whose intro offer is 14 days, since a
 *   product has only one intro offer at a time. Trial-eligible only.
 */
export const EXIT_ARMS = ['none', 'half-price', 'longer-trial'] as const;

/**
 * Whether the exit offer can show outside the review tools. Off for 1.0: Apple has rejected
 * offers shown on closing the paywall under 5.6 (docs/APP_REVIEW_AUDIT.md, R2). Turn it on
 * only in a build that goes through review with it on, never from the dashboard.
 */
export const EXIT_OFFER_LIVE = false;
export type ExitArm = (typeof EXIT_ARMS)[number];
export type ExitOfferArm = Exclude<ExitArm, 'none'>;

/** What can be bought: a paywall plan, or the exit offer of one arm. */
export type PurchaseTarget = PlanId | ExitOfferArm;

/*
 * The store's names for everything. App Store Connect and the RevenueCat dashboard must use
 * exactly these (docs/REVENUECAT_SETUP.md). A product ID can never be reused, even deleted.
 */

/** App Store Connect product IDs, all in one subscription group. */
export const PRODUCT_IDS = {
  /** $59.99 a year, 7-day free intro offer. */
  annual: 'locturne.annual',
  /** $9.99 a month, no intro offer. */
  monthly: 'locturne.monthly',
  /** The `half-price` exit offer: $29.99 a year, 7-day free intro offer. */
  'half-price': 'locturne.annual.halfprice',
  /** The `longer-trial` exit offer: $59.99 a year, 14-day free intro offer. */
  'longer-trial': 'locturne.annual.longtrial',
} as const satisfies Record<PurchaseTarget, string>;

/**
 * RevenueCat offerings. `default` (the current offering) holds the paywall's Annual and
 * Monthly packages; each exit arm has its own offering with one Annual package.
 */
export const OFFERING_IDS = {
  default: 'default',
  'half-price': 'exit-half-price',
  'longer-trial': 'exit-longer-trial',
} as const satisfies Record<'default' | ExitOfferArm, string>;

/** The one RevenueCat entitlement every product unlocks. The lock arms only while it's active. */
export const ENTITLEMENT_ID = 'pro';

/** Custom attributes on the RevenueCat customer, for the funnel and the exit-offer test. */
export const ATTRIBUTES = {
  /** "How'd you find me?" from onboarding. */
  found: 'found',
  /** The exit-offer arm this install was assigned, whether it was shown or not. */
  exitArm: 'exit_arm',
  /** "true" once the exit offer has been shown. */
  exitOfferShown: 'exit_offer_shown',
} as const;

/** One product as the store describes it to this person. */
export type Offer = {
  productId: string;
  period: 'year' | 'month';
  /** For math only (savings, per month). Show `priceString`. */
  price: number;
  /** ISO 4217, e.g. "USD". */
  currencyCode: string;
  /** Localized by the store, e.g. "$59.99" or "59,99 €". */
  priceString: string;
  /**
   * The price per month, formatted by the store like `priceString` (RevenueCat's
   * `pricePerMonthString`), so the annual plan's "/month" line matches its billed price.
   * Missing in the dev stub: `perMonth` then formats it in the phone's locale.
   */
  pricePerMonthString?: string;
  /** Free days before the first charge, or null when there's no trial or this Apple ID isn't eligible. */
  trialDays: number | null;
};

export type Offers = {
  annual: Offer;
  monthly: Offer;
  /** This person's exit-offer arm. Already `none` where the arm can't apply (see `resolveExitArm`). */
  exitArm: ExitArm;
  /** An arm is missing when the store didn't return its offering: that arm then offers nothing. */
  exitOffers: Partial<Record<ExitOfferArm, Offer>>;
};

export type PurchaseResult =
  | { status: 'purchased' }
  /** The person closed Apple's sheet. Not an error: say nothing. */
  | { status: 'cancelled' }
  /** Ask to Buy or a bank check: not paid yet, so nothing arms. */
  | { status: 'pending' }
  /**
   * `retry: false` when trying again is the wrong advice: the purchase went through and only
   * needs a Restore, so the paywall says the message alone.
   */
  | { status: 'failed'; message: string; retry?: false };

export interface PurchasesProvider {
  /** True for the dev stub: nothing is charged. */
  readonly stubbed: boolean;
  getOffers(): Promise<Offers>;
  purchase(target: PurchaseTarget): Promise<PurchaseResult>;
  /** Restore Purchases. Resolves to whether a subscription is active afterwards. */
  restore(): Promise<{ entitled: boolean }>;
  /** An active subscription, including a running trial. The lock arms only when true. */
  isEntitled(): Promise<boolean>;
  /**
   * When the current free trial first charges, or null outside a trial. The reminder is
   * planned back from it, so a 14-day exit-offer trial gets its own date.
   */
  currentTrialEnd(): Promise<Date | null>;
  /** The plan behind the active subscription, or null without one. For the You tab. */
  currentPlan(): Promise<PlanId | null>;
  /**
   * Apple's manage-subscriptions sheet, inside the app. Resolves to false where there's no
   * sheet (the stub), so the caller opens Apple's subscriptions page instead.
   */
  manageSubscriptions(): Promise<boolean>;
  /** Custom attributes on the store's customer record (`ATTRIBUTES`). Never throws. */
  setAttributes(attributes: Record<string, string>): void;
  /**
   * Calls `listener` when a subscription becomes active outside `purchase` and `restore`
   * (which report their own): an Ask to Buy approval arriving while the app runs, say.
   * Returns the unsubscribe.
   */
  onEntitled(listener: () => void): () => void;
}

/* Pure helpers, shared by every provider and the paywall. */

/** "Save 49%": the annual price against twelve months of monthly. */
export function annualSavingsPercent(offers: Pick<Offers, 'annual' | 'monthly'>): number {
  // The nudge keeps float error (48 against 5 a month is 19.999…%) from dropping a point.
  return Math.floor((1 - offers.annual.price / (offers.monthly.price * 12)) * 100 + 1e-9);
}

/** A price in the offer's currency, e.g. the annual plan's per-month line. */
export function formatPrice(amount: number, currencyCode: string, locale?: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currencyCode}`;
  }
}

/**
 * The annual plan's per-month line, "$5.00". Smaller than the billed price (App Review 3.1.2).
 * The store's own string when it gave one, so it's formatted like the billed price.
 */
export function perMonth(offer: Offer, locale?: string): string {
  if (offer.pricePerMonthString) return offer.pricePerMonthString;
  return formatPrice(offer.period === 'year' ? offer.price / 12 : offer.price, offer.currencyCode, locale);
}

/**
 * An extra free week means nothing to someone with no trial left, so they get no offer.
 * Neither does an arm whose product the store didn't return.
 */
export function resolveExitArm(arm: ExitArm, offers: Pick<Offers, 'exitOffers'>): ExitArm {
  if (arm === 'none') return arm;
  const offer = offers.exitOffers[arm];
  if (!offer) return 'none';
  return arm === 'longer-trial' && offer.trialDays === null ? 'none' : arm;
}

/** An equal three-way split. `random` is in [0, 1), as from `Math.random()`. */
export function pickExitArm(random: number): ExitArm {
  const index = Math.floor(random * EXIT_ARMS.length);
  return EXIT_ARMS[Math.min(Math.max(index, 0), EXIT_ARMS.length - 1)];
}

/** The plan a product belongs to. Every annual product (the exit offers too) is `annual`. */
export function planOf(productId: string): PlanId {
  return productId === PRODUCT_IDS.monthly ? 'monthly' : 'annual';
}

/** When a trial that starts at `from` first charges. */
export function trialEndsAt(trialDays: number, from = new Date()): Date {
  const end = new Date(from);
  end.setDate(end.getDate() + trialDays);
  return end;
}

/**
 * The day of the trial the reminder lands on, for a trial starting `now`. It's at noon, at
 * least two days before the charge (`planTrialReminder`), so a trial started before noon
 * hears a day earlier.
 */
export function reminderDay(trialDays: number, now = new Date()): number {
  return Math.max(1, trialDays - 2 - (now.getHours() < 12 ? 1 : 0));
}

export function isExitArm(value: string | undefined): value is ExitArm {
  return (EXIT_ARMS as readonly string[]).includes(value ?? '');
}

/* The dev stub. */

/** Where a provider keeps what it must remember. On iOS it's the App Group; off-device, memory. */
export type KeyValue = { get<T>(key: string): T | undefined; set(key: string, value: unknown): void };

export function memoryKeyValue(): KeyValue {
  const map = new Map<string, unknown>();
  return { get: <T>(key: string) => map.get(key) as T | undefined, set: (key, value) => void map.set(key, value) };
}

/**
 * The stub's catalog, in USD. These are the decided prices (GAME_PLAN "Money"); in the real
 * app they come from App Store Connect through RevenueCat, so change them there, not here.
 */
export const DEV_CATALOG = {
  annual: 59.99,
  monthly: 9.99,
  annualOffer: 29.99,
  trialDays: 7,
  extendedTrialDays: 14,
} as const;

/** The stub's arm, and the one to ship if the test is stopped (GAME_PLAN: 14 days free leads). */
export const DEFAULT_EXIT_ARM: ExitArm = 'longer-trial';

type DevEntitlement = { target: PurchaseTarget; at: number; trialEndsAt: number | null };
const DEV_KEY = 'locturne.devEntitlement';

export type DevPurchasesOptions = {
  /** Pretend this Apple ID already used its trial. */
  trialEligible?: boolean;
  exitArm?: ExitArm;
  store?: KeyValue;
  /** Fake store latency, so busy states show in the preview. */
  latencyMs?: number;
  /** What `purchase` resolves to; defaults to `purchased`. For tests and QA. */
  outcome?: PurchaseResult['status'];
  now?: () => Date;
};

/** The stub, plus the attributes it was given (for tests). */
export type DevPurchases = PurchasesProvider & { readonly attributes: Record<string, string> };

/**
 * A stand-in store that charges nothing. Purchases always "succeed" (unless `outcome` says
 * otherwise) and are remembered in `store`, so Restore finds them. `startPurchases` uses it
 * only where there's no RevenueCat key or no native store, never in a build with a real key.
 */
export function createDevPurchases(options: DevPurchasesOptions = {}): DevPurchases {
  const {
    trialEligible = true,
    exitArm = DEFAULT_EXIT_ARM,
    store = memoryKeyValue(),
    latencyMs = 0,
    outcome = 'purchased',
    now = () => new Date(),
  } = options;
  const wait = () => new Promise<void>((resolve) => setTimeout(resolve, latencyMs));
  const usd = (price: number) => formatPrice(price, 'USD', 'en-US');
  const product = (productId: string, period: Offer['period'], price: number, trialDays: number | null): Offer => ({
    productId,
    period,
    price,
    currencyCode: 'USD',
    priceString: usd(price),
    trialDays: trialEligible ? trialDays : null,
  });
  const entitlement = () => store.get<DevEntitlement>(DEV_KEY) ?? null;
  const attributes: Record<string, string> = {};

  const offers = (): Offers => {
    const built: Offers = {
      annual: product(PRODUCT_IDS.annual, 'year', DEV_CATALOG.annual, DEV_CATALOG.trialDays),
      monthly: product(PRODUCT_IDS.monthly, 'month', DEV_CATALOG.monthly, null),
      exitArm,
      exitOffers: {
        'half-price': product(PRODUCT_IDS['half-price'], 'year', DEV_CATALOG.annualOffer, DEV_CATALOG.trialDays),
        'longer-trial': product(PRODUCT_IDS['longer-trial'], 'year', DEV_CATALOG.annual, DEV_CATALOG.extendedTrialDays),
      },
    };
    return { ...built, exitArm: resolveExitArm(exitArm, built) };
  };

  return {
    stubbed: true,
    attributes,
    async getOffers() {
      await wait();
      return offers();
    },
    async purchase(target) {
      await wait();
      if (outcome === 'failed') return { status: 'failed', message: 'The App Store couldn’t complete the purchase.' };
      if (outcome !== 'purchased') return { status: outcome };
      const all = offers();
      const offer = target === 'annual' || target === 'monthly' ? all[target] : all.exitOffers[target];
      const at = now();
      const trialEnd = offer?.trialDays ? trialEndsAt(offer.trialDays, at).getTime() : null;
      store.set(DEV_KEY, { target, at: at.getTime(), trialEndsAt: trialEnd } satisfies DevEntitlement);
      return { status: 'purchased' };
    },
    async restore() {
      await wait();
      return { entitled: entitlement() !== null };
    },
    async isEntitled() {
      return entitlement() !== null;
    },
    async currentTrialEnd() {
      const ends = entitlement()?.trialEndsAt;
      return ends ? new Date(ends) : null;
    },
    async currentPlan() {
      const target = entitlement()?.target;
      return target ? planOf(PRODUCT_IDS[target]) : null;
    },
    async manageSubscriptions() {
      return false;
    },
    setAttributes(next) {
      Object.assign(attributes, next);
    },
    onEntitled() {
      // Nothing is ever approved later here.
      return () => {};
    },
  };
}

/**
 * A release build with no real store key: nothing can be bought, and nothing counts as
 * paid, so a misconfigured build never gives the app away (purchases-start.ts).
 */
export function createClosedPurchases(): PurchasesProvider {
  return {
    stubbed: false,
    async getOffers() {
      throw new Error('No store key in this build.');
    },
    async purchase() {
      return { status: 'failed', message: 'The App Store couldn’t complete the purchase.' };
    },
    async restore() {
      return { entitled: false };
    },
    async isEntitled() {
      return false;
    },
    async currentTrialEnd() {
      return null;
    },
    async currentPlan() {
      return null;
    },
    async manageSubscriptions() {
      return false;
    },
    setAttributes() {},
    onEntitled() {
      return () => {};
    },
  };
}

/* The provider in use. */

// Closed until startup picks a store: nothing that runs early can unlock anything.
let provider: PurchasesProvider = createClosedPurchases();

/** Swap in the real store (RevenueCat) at startup, or a configured stub in tests. */
export function setPurchasesProvider(next: PurchasesProvider): void {
  provider = next;
}

export const isStubbed = () => provider.stubbed;
export const getOffers = () => provider.getOffers();
let buying = false;
/**
 * Buys `target`. A second call while one is still with the App Store (a double tap lands in
 * the same frame, before any busy state renders) resolves as `cancelled`, so it says nothing
 * and starts no second purchase.
 */
export const purchase = async (target: PurchaseTarget): Promise<PurchaseResult> => {
  if (buying) return { status: 'cancelled' };
  buying = true;
  try {
    return await provider.purchase(target);
  } finally {
    buying = false;
  }
};
/** True while a `purchase` is with the App Store. Set synchronously, so a same-frame second tap sees it. */
export const isPurchasing = () => buying;
export const restore = () => provider.restore();
export const isEntitled = () => provider.isEntitled();
export const currentTrialEnd = () => provider.currentTrialEnd();
export const currentPlan = () => provider.currentPlan();
export const manageSubscriptions = () => provider.manageSubscriptions();
export const setAttributes =(attributes: Record<string, string>) => provider.setAttributes(attributes);
export const onEntitled = (listener: () => void) => provider.onEntitled(listener);
