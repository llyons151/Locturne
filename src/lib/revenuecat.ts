/**
 * The real store: a `PurchasesProvider` over RevenueCat (react-native-purchases).
 *
 * The SDK is passed in (`RevenueCatSdk`, which the `Purchases` class satisfies), so this file
 * imports only its types and runs under `npm test` against a fake. `startPurchases`
 * (purchases-start.ts) configures the SDK and hands it here. Main app only: the Screen Time
 * extensions never talk to the network.
 *
 * - Prices and trials: offerings from App Store Connect, trial days only when StoreKit says
 *   this Apple ID is eligible for the product's intro offer. When eligibility is unknown the
 *   paywall shows no trial (RevenueCat's advice: never promise a trial that may not come).
 * - Entitlement: `ENTITLEMENT_ID` active, including a trial. Every answer is cached in the App
 *   Group, so a launch with no network still knows a paid user and re-arms a lost night.
 * - Exit-offer arm: picked at random once per install, kept in the App Group and sent to
 *   RevenueCat as the `exit_arm` attribute. `exit_arm` in the current offering's metadata
 *   overrides it for everyone (to end the test without an app update).
 */
import type {
  CustomerInfo,
  INTRO_ELIGIBILITY_STATUS,
  IntroEligibility,
  PURCHASES_ERROR_CODE,
  PurchasesError,
  PurchasesIntroPrice,
  PurchasesOffering,
  PurchasesOfferings,
  PurchasesPackage,
  PurchasesStoreProduct,
} from 'react-native-purchases';

import {
  ATTRIBUTES,
  ENTITLEMENT_ID,
  EXIT_ARMS,
  isExitArm,
  OFFERING_IDS,
  pickExitArm,
  planOf,
  resolveExitArm,
  type ExitArm,
  type ExitOfferArm,
  type KeyValue,
  type Offer,
  type Offers,
  type PurchaseResult,
  type PurchasesProvider,
  type PurchaseTarget,
} from './purchases.ts';

/** The part of the `Purchases` class this provider uses. */
export type RevenueCatSdk = {
  getOfferings(): Promise<PurchasesOfferings>;
  checkTrialOrIntroductoryPriceEligibility(productIds: string[]): Promise<{ [productId: string]: IntroEligibility }>;
  purchasePackage(aPackage: PurchasesPackage): Promise<{ customerInfo: CustomerInfo }>;
  restorePurchases(): Promise<CustomerInfo>;
  getCustomerInfo(): Promise<CustomerInfo>;
  setAttributes(attributes: { [key: string]: string | null }): Promise<void>;
  addCustomerInfoUpdateListener(listener: (info: CustomerInfo) => void): void;
  showManageSubscriptions(): Promise<void>;
};

// The SDK's enum values, checked against its types. Importing the enums themselves would
// load the native module, which `npm test` can't.
const ELIGIBLE = 2 satisfies INTRO_ELIGIBILITY_STATUS;
const CANCELLED: `${PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR}` = '1';
const NOT_ALLOWED: `${PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR}` = '3';
const NETWORK: `${PURCHASES_ERROR_CODE.NETWORK_ERROR}` = '10';
const PENDING: `${PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR}` = '20';
const OFFLINE: `${PURCHASES_ERROR_CODE.OFFLINE_CONNECTION_ERROR}` = '35';

/** What's cached of the last answer about the entitlement. Plist-safe: no nulls. */
export type EntitlementRecord = {
  active: boolean;
  productId?: string;
  /** When the current period ends (ms). Missing for a subscription with no end date. */
  expiresAt?: number;
  /** When the running free trial began (ms). Missing outside a trial. */
  trialStartedAt?: number;
  /** False once the subscription is cancelled: it stays active until `expiresAt`, then ends. */
  willRenew?: boolean;
  checkedAt: number;
};

export const ENTITLEMENT_KEY = 'locturne.entitlement';
export const EXIT_ARM_KEY = 'locturne.exitArm';

/**
 * How long a cached subscription is believed past its end date while the store can't be
 * reached. Renewals happen at the end date, so a paid user offline over a renewal shouldn't
 * lose their lock; three days covers a weekend away.
 */
export const OFFLINE_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

const UNIT_DAYS: Record<string, number> = { DAY: 1, WEEK: 7, MONTH: 30, YEAR: 365 };

/**
 * A RevenueCat public Apple key, or null for the placeholder (then the dev stub runs).
 * `allowTestStore: false` (release builds) also refuses `test_` keys: the Test Store never
 * charges, and Apple rejects it.
 */
export function revenueCatKey(raw: unknown, { allowTestStore = true } = {}): string | null {
  const pattern = allowTestStore ? /^(appl|test)_[A-Za-z0-9]+$/ : /^appl_[A-Za-z0-9]+$/;
  return typeof raw === 'string' && pattern.test(raw.trim()) ? raw.trim() : null;
}

/** Free days in an intro offer, or null when it's not free (a paid intro isn't a trial). */
export function introTrialDays(
  intro: Pick<PurchasesIntroPrice, 'price' | 'periodUnit' | 'periodNumberOfUnits' | 'cycles'> | null,
): number | null {
  if (!intro || intro.price !== 0) return null;
  const unit = UNIT_DAYS[intro.periodUnit.toUpperCase()];
  if (!unit) return null;
  const days = unit * intro.periodNumberOfUnits * Math.max(1, intro.cycles);
  return days > 0 ? days : null;
}

type ProductFields = Pick<
  PurchasesStoreProduct,
  'identifier' | 'price' | 'priceString' | 'currencyCode' | 'introPrice' | 'subscriptionPeriod'
>;

/** One product as the paywall needs it. The trial only when this Apple ID is eligible. */
export function toOffer(product: ProductFields, eligibility: IntroEligibility | undefined): Offer {
  const yearly = product.subscriptionPeriod === 'P1Y' || product.subscriptionPeriod === 'P12M';
  return {
    productId: product.identifier,
    period: yearly ? 'year' : 'month',
    price: product.price,
    currencyCode: product.currencyCode,
    priceString: product.priceString,
    trialDays: eligibility?.status === ELIGIBLE ? introTrialDays(product.introPrice) : null,
  };
}

/** The current offering: the dashboard's "current", else the one named `default`. */
function mainOffering(offerings: PurchasesOfferings): PurchasesOffering | null {
  return offerings.current ?? offerings.all[OFFERING_IDS.default] ?? null;
}

/** An exit arm's single annual package. */
function exitPackage(offerings: PurchasesOfferings, arm: ExitOfferArm): PurchasesPackage | null {
  const offering = offerings.all[OFFERING_IDS[arm]];
  return offering?.annual ?? offering?.availablePackages[0] ?? null;
}

/** The package that buys `target`, or null when the store doesn't have it. */
export function packageFor(offerings: PurchasesOfferings, target: PurchaseTarget): PurchasesPackage | null {
  if (target === 'annual' || target === 'monthly') return mainOffering(offerings)?.[target] ?? null;
  return exitPackage(offerings, target);
}

/** Every product the paywall and the exit offers might show, for one eligibility check. */
export function productIdsIn(offerings: PurchasesOfferings): string[] {
  const targets: PurchaseTarget[] = ['annual', 'monthly', 'half-price', 'longer-trial'];
  const ids = targets.map((t) => packageFor(offerings, t)?.product.identifier);
  return [...new Set(ids.filter((id): id is string => !!id))];
}

/** `exit_arm` in the current offering's metadata, which overrides each install's own arm. */
export function metadataArm(offerings: PurchasesOfferings): ExitArm | null {
  const value = mainOffering(offerings)?.metadata?.exit_arm;
  return typeof value === 'string' && isExitArm(value) ? value : null;
}

/** The store's answer as `Offers`. Throws when the paywall's two plans are missing. */
export function toOffers(
  offerings: PurchasesOfferings,
  eligibility: { [productId: string]: IntroEligibility },
  assignedArm: ExitArm,
): Offers {
  const annual = packageFor(offerings, 'annual');
  const monthly = packageFor(offerings, 'monthly');
  if (!annual || !monthly) throw new Error('The current offering needs an Annual and a Monthly package.');
  const offer = (pkg: PurchasesPackage) => toOffer(pkg.product, eligibility[pkg.product.identifier]);
  const exitOffers: Offers['exitOffers'] = {};
  for (const arm of EXIT_ARMS) {
    if (arm === 'none') continue;
    const pkg = exitPackage(offerings, arm);
    if (pkg) exitOffers[arm] = offer(pkg);
  }
  const built = { annual: offer(annual), monthly: offer(monthly), exitOffers };
  return { ...built, exitArm: resolveExitArm(metadataArm(offerings) ?? assignedArm, built) };
}

/** What to remember of a `CustomerInfo`. */
export function entitlementRecord(info: CustomerInfo, now: Date): EntitlementRecord {
  const entitlement = info.entitlements.active[ENTITLEMENT_ID];
  const checkedAt = now.getTime();
  if (!entitlement?.isActive) return { active: false, checkedAt };
  const record: EntitlementRecord = { active: true, productId: entitlement.productIdentifier, checkedAt };
  if (entitlement.expirationDateMillis != null) record.expiresAt = entitlement.expirationDateMillis;
  if (entitlement.periodType === 'TRIAL') record.trialStartedAt = entitlement.latestPurchaseDateMillis;
  if (entitlement.willRenew === false) record.willRenew = false;
  return record;
}

/** Whether a cached record still counts as paid when the store can't be asked. */
export function cachedEntitlement(record: EntitlementRecord | undefined, now: Date): boolean {
  if (!record?.active) return false;
  // The grace covers a renewal the phone couldn't see offline. A cancelled one won't renew.
  const grace = record.willRenew === false ? 0 : OFFLINE_GRACE_MS;
  return record.expiresAt === undefined || now.getTime() < record.expiresAt + grace;
}

/** A purchase that threw, in the paywall's terms. Closing Apple's sheet isn't an error. */
export function purchaseFailure(error: unknown): PurchaseResult {
  const { code, userCancelled } = (error ?? {}) as Partial<PurchasesError>;
  if (userCancelled || code === CANCELLED) return { status: 'cancelled' };
  // Ask to Buy, or the bank wants a check. RevenueCat reports the approval later.
  if (code === PENDING) return { status: 'pending' };
  if (code === NETWORK || code === OFFLINE) return { status: 'failed', message: 'The App Store didn’t answer.' };
  if (code === NOT_ALLOWED) return { status: 'failed', message: 'Purchases are turned off on this iPhone.' };
  return { status: 'failed', message: 'The App Store couldn’t complete the purchase.' };
}

export type RevenueCatOptions = {
  /** Where the entitlement cache and the exit arm live: the App Group on iOS. */
  store: KeyValue;
  random?: () => number;
  now?: () => Date;
};

export function createRevenueCatPurchases(sdk: RevenueCatSdk, options: RevenueCatOptions): PurchasesProvider {
  const { store, random = Math.random, now = () => new Date() } = options;
  const listeners = new Set<() => void>();
  // While `purchase` or `restore` runs, the update listener stays quiet: their callers arm.
  let inFlight = 0;

  const cached = () => store.get<EntitlementRecord>(ENTITLEMENT_KEY);
  const remember = (info: CustomerInfo) => {
    const record = entitlementRecord(info, now());
    store.set(ENTITLEMENT_KEY, record);
    return record;
  };
  /** The store's answer, else the cache. Throws only with neither. */
  const latest = async (): Promise<EntitlementRecord> => {
    try {
      return remember(await sdk.getCustomerInfo());
    } catch (error) {
      const record = cached();
      if (!record) throw error;
      return cachedEntitlement(record, now()) ? record : { ...record, active: false };
    }
  };
  const tag = (attributes: Record<string, string>) => {
    sdk.setAttributes(attributes).catch(() => {});
  };

  const assignedArm = (): ExitArm => {
    const saved = store.get<string>(EXIT_ARM_KEY);
    if (isExitArm(saved)) return saved;
    const arm = pickExitArm(random());
    store.set(EXIT_ARM_KEY, arm);
    return arm;
  };
  // Every install carries its arm, so the arms compare per install, not per paywall view.
  tag({ [ATTRIBUTES.exitArm]: assignedArm() });

  sdk.addCustomerInfoUpdateListener((info) => {
    const was = cached()?.active === true;
    const record = remember(info);
    if (!inFlight && !was && record.active) listeners.forEach((listener) => listener());
  });

  return {
    stubbed: false,
    async getOffers() {
      const offerings = await sdk.getOfferings();
      let eligibility: { [productId: string]: IntroEligibility } = {};
      try {
        eligibility = await sdk.checkTrialOrIntroductoryPriceEligibility(productIdsIn(offerings));
      } catch {
        // Unknown eligibility: show no trial rather than promise one.
      }
      return toOffers(offerings, eligibility, assignedArm());
    },
    async purchase(target) {
      inFlight += 1;
      try {
        const pkg = packageFor(await sdk.getOfferings(), target);
        if (!pkg) return { status: 'failed', message: 'That plan isn’t available right now.' };
        const { customerInfo } = await sdk.purchasePackage(pkg);
        if (remember(customerInfo).active) return { status: 'purchased' };
        return { status: 'failed', message: 'The purchase went through but isn’t showing yet. Tap Restore in a moment.' };
      } catch (error) {
        return purchaseFailure(error);
      } finally {
        inFlight -= 1;
      }
    },
    async restore() {
      inFlight += 1;
      try {
        return { entitled: remember(await sdk.restorePurchases()).active };
      } finally {
        inFlight -= 1;
      }
    },
    async isEntitled() {
      return (await latest()).active;
    },
    async currentTrialEnd() {
      // In a trial, the entitlement expires when the trial first charges. A cancelled trial
      // never charges, so it has no end to remind about.
      const record = await latest().catch(() => undefined);
      return record?.active && record.trialStartedAt && record.expiresAt && record.willRenew !== false
        ? new Date(record.expiresAt)
        : null;
    },
    async currentPlan() {
      const record = await latest().catch(() => undefined);
      return record?.active && record.productId ? planOf(record.productId) : null;
    },
    async manageSubscriptions() {
      await sdk.showManageSubscriptions();
      return true;
    },
    setAttributes: tag,
    onEntitled(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}
