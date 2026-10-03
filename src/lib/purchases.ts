/**
 * Locturne's only door to the App Store's subscriptions. Screens call these functions and
 * never a store SDK, so RevenueCat drops in later as one `PurchasesProvider`
 * (`setPurchasesProvider`) without touching the paywall.
 *
 * GAME_PLAN, "Money": a hard paywall with Annual (7-day trial, the default) and Monthly
 * (no trial), and one exit offer picked by an A/B test. Every price and every trial string
 * on screen comes from `getOffers()`: StoreKit's localized prices, and a trial only when
 * this Apple ID is eligible for the intro offer.
 *
 * **Until RevenueCat is integrated, the provider is `createDevPurchases()`, a stub that
 * charges nothing.** `isStubbed()` says so, and the paywall shows a preview note while it's true.
 *
 * Pure TypeScript with no React Native imports, so it runs under `npm test`.
 */

/** The plans on the paywall. */
export type PlanId = 'annual' | 'monthly';

/**
 * The exit-offer test (docs/sub-club/APPLIED_TO_LOCTURNE.md, test 3), assigned by remote
 * config in the real app:
 * - `none`: closing the paywall exits.
 * - `half-price`: a separate annual product in the same subscription group, same trial.
 * - `longer-trial`: the full-price annual with a longer intro offer. Trial-eligible only.
 */
export const EXIT_ARMS = ['none', 'half-price', 'longer-trial'] as const;
export type ExitArm = (typeof EXIT_ARMS)[number];
export type ExitOfferArm = Exclude<ExitArm, 'none'>;

/** What can be bought: a paywall plan, or the exit offer of one arm. */
export type PurchaseTarget = PlanId | ExitOfferArm;

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
  /** Free days before the first charge, or null when there's no trial or this Apple ID isn't eligible. */
  trialDays: number | null;
};

export type Offers = {
  annual: Offer;
  monthly: Offer;
  /** This person's exit-offer arm. Already `none` where the arm can't apply (see `resolveExitArm`). */
  exitArm: ExitArm;
  exitOffers: Record<ExitOfferArm, Offer>;
};

export type PurchaseResult =
  | { status: 'purchased' }
  /** The person closed Apple's sheet. Not an error: say nothing. */
  | { status: 'cancelled' }
  /** Ask to Buy or a bank check: not paid yet, so nothing arms. */
  | { status: 'pending' }
  | { status: 'failed'; message: string };

export interface PurchasesProvider {
  /** True for the dev stub: nothing is charged. */
  readonly stubbed: boolean;
  getOffers(): Promise<Offers>;
  purchase(target: PurchaseTarget): Promise<PurchaseResult>;
  /** Restore Purchases. Resolves to whether a subscription is active afterwards. */
  restore(): Promise<{ entitled: boolean }>;
  /** An active subscription, including a running trial. The lock arms only when true. */
  isEntitled(): Promise<boolean>;
  /** When the current free trial began, or null outside a trial. For the day-5 reminder. */
  trialStartedAt(): Promise<Date | null>;
}

/* Pure helpers, shared by every provider and the paywall. */

/** "Save 49%": the annual price against twelve months of monthly. */
export function annualSavingsPercent(offers: Pick<Offers, 'annual' | 'monthly'>): number {
  return Math.floor((1 - offers.annual.price / (offers.monthly.price * 12)) * 100);
}

/** A price in the offer's currency, e.g. the annual plan's per-month line. */
export function formatPrice(amount: number, currencyCode: string, locale?: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currencyCode}`;
  }
}

/** The annual plan's per-month line, "$5.00". Smaller than the billed price (App Review 3.1.2). */
export function perMonth(offer: Offer, locale?: string): string {
  return formatPrice(offer.period === 'year' ? offer.price / 12 : offer.price, offer.currencyCode, locale);
}

/** An extra free week means nothing to someone with no trial left, so they get no offer. */
export function resolveExitArm(arm: ExitArm, offers: Pick<Offers, 'exitOffers'>): ExitArm {
  return arm === 'longer-trial' && offers.exitOffers['longer-trial'].trialDays === null ? 'none' : arm;
}

/** When a trial that starts at `from` first charges. */
export function trialEndsAt(trialDays: number, from = new Date()): Date {
  const end = new Date(from);
  end.setDate(end.getDate() + trialDays);
  return end;
}

/** The day the reminder lands: two days before the charge (the paywall's toggle says so). */
export function reminderDay(trialDays: number): number {
  return Math.max(1, trialDays - 2);
}

export function isExitArm(value: string | undefined): value is ExitArm {
  return (EXIT_ARMS as readonly string[]).includes(value ?? '');
}

/* The dev stub. */

/** Where the stub keeps its fake entitlement. Off-device it lives in memory. */
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

/** The default arm until remote config assigns one (GAME_PLAN: 14 days free leads). */
export const DEFAULT_EXIT_ARM: ExitArm = 'longer-trial';

type DevEntitlement = { target: PurchaseTarget; at: number; trialStartedAt: number | null };
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

/**
 * A stand-in store that charges nothing. Purchases always "succeed" (unless `outcome` says
 * otherwise) and are remembered in `store`, so Restore finds them.
 * DEV ONLY: replace with the RevenueCat provider before TestFlight.
 */
export function createDevPurchases(options: DevPurchasesOptions = {}): PurchasesProvider {
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

  const offers = (): Offers => {
    const built: Offers = {
      annual: product('locturne.annual', 'year', DEV_CATALOG.annual, DEV_CATALOG.trialDays),
      monthly: product('locturne.monthly', 'month', DEV_CATALOG.monthly, null),
      exitArm,
      exitOffers: {
        'half-price': product('locturne.annual.offer', 'year', DEV_CATALOG.annualOffer, DEV_CATALOG.trialDays),
        'longer-trial': product('locturne.annual', 'year', DEV_CATALOG.annual, DEV_CATALOG.extendedTrialDays),
      },
    };
    return { ...built, exitArm: resolveExitArm(exitArm, built) };
  };

  return {
    stubbed: true,
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
      const at = now().getTime();
      store.set(DEV_KEY, { target, at, trialStartedAt: offer.trialDays ? at : null } satisfies DevEntitlement);
      return { status: 'purchased' };
    },
    async restore() {
      await wait();
      return { entitled: entitlement() !== null };
    },
    async isEntitled() {
      return entitlement() !== null;
    },
    async trialStartedAt() {
      const started = entitlement()?.trialStartedAt;
      return started ? new Date(started) : null;
    },
  };
}

/* The provider in use. */

let provider: PurchasesProvider = createDevPurchases({ latencyMs: 400 });

/** Swap in the real store (RevenueCat) at startup, or a configured stub in tests. */
export function setPurchasesProvider(next: PurchasesProvider): void {
  provider = next;
}

export const isStubbed = () => provider.stubbed;
export const getOffers = () => provider.getOffers();
export const purchase = (target: PurchaseTarget) => provider.purchase(target);
export const restore = () => provider.restore();
export const isEntitled = () => provider.isEntitled();
export const trialStartedAt = () => provider.trialStartedAt();
