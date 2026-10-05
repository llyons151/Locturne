/// <reference types="node" />

/**
 * The RevenueCat provider against a fake SDK: store answers → paywall strings, purchase
 * outcomes, the entitlement cache, and the exit-offer arm.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { CustomerInfo, IntroEligibility, PurchasesOfferings, PurchasesPackage } from 'react-native-purchases';

import { ATTRIBUTES, memoryKeyValue, PRODUCT_IDS, type KeyValue } from './purchases.ts';
import {
  cachedEntitlement,
  createRevenueCatPurchases,
  ENTITLEMENT_KEY,
  entitlementRecord,
  EXIT_ARM_KEY,
  introTrialDays,
  OFFLINE_GRACE_MS,
  purchaseFailure,
  revenueCatKey,
  toOffer,
  type EntitlementRecord,
  type RevenueCatSdk,
} from './revenuecat.ts';

const DAY = 24 * 60 * 60 * 1000;
const ELIGIBLE: IntroEligibility = { status: 2, description: '' };
const INELIGIBLE: IntroEligibility = { status: 1, description: '' };
const UNKNOWN: IntroEligibility = { status: 0, description: '' };

const week = (weeks: number) => ({ price: 0, priceString: '$0.00', cycles: 1, period: `P${weeks}W`, periodUnit: 'WEEK', periodNumberOfUnits: weeks });

function product(identifier: string, price: number, period: 'P1Y' | 'P1M', introWeeks: number | null, currency = 'USD') {
  const priceString = currency === 'EUR' ? `${price.toFixed(2).replace('.', ',')} €` : `$${price.toFixed(2)}`;
  return { identifier, price, priceString, currencyCode: currency, subscriptionPeriod: period, introPrice: introWeeks ? week(introWeeks) : null };
}

function pkg(offeringIdentifier: string, item: ReturnType<typeof product>): PurchasesPackage {
  return { identifier: item.subscriptionPeriod === 'P1Y' ? '$rc_annual' : '$rc_monthly', offeringIdentifier, product: item } as unknown as PurchasesPackage;
}

function catalog(options: { metadata?: Record<string, unknown>; exits?: boolean; currency?: string } = {}): PurchasesOfferings {
  const { metadata = {}, exits = true, currency = 'USD' } = options;
  const main = {
    identifier: 'default',
    metadata,
    annual: pkg('default', product(PRODUCT_IDS.annual, 59.99, 'P1Y', 1, currency)),
    monthly: pkg('default', product(PRODUCT_IDS.monthly, 9.99, 'P1M', null, currency)),
    availablePackages: [] as PurchasesPackage[],
  };
  const half = pkg('exit-half-price', product(PRODUCT_IDS['half-price'], 29.99, 'P1Y', 1, currency));
  const longer = pkg('exit-longer-trial', product(PRODUCT_IDS['longer-trial'], 59.99, 'P1Y', 2, currency));
  const all: Record<string, unknown> = { default: main };
  if (exits) {
    all['exit-half-price'] = { identifier: 'exit-half-price', metadata: {}, annual: half, availablePackages: [half] };
    all['exit-longer-trial'] = { identifier: 'exit-longer-trial', metadata: {}, annual: null, availablePackages: [longer] };
  }
  return { current: main, all } as unknown as PurchasesOfferings;
}

function customer(active: { productId: string; trial?: boolean; startedAt?: number; expiresAt?: number | null; willRenew?: boolean } | null): CustomerInfo {
  const entitlement = active && {
    identifier: 'pro',
    isActive: true,
    periodType: active.trial ? 'TRIAL' : 'NORMAL',
    productIdentifier: active.productId,
    willRenew: active.willRenew ?? true,
    latestPurchaseDateMillis: active.startedAt ?? 0,
    expirationDateMillis: active.expiresAt === undefined ? (active.startedAt ?? 0) + 7 * DAY : active.expiresAt,
  };
  return { entitlements: { active: entitlement ? { pro: entitlement } : {}, all: {} } } as unknown as CustomerInfo;
}

type Fake = RevenueCatSdk & {
  attributes: Record<string, string | null>;
  bought: string[];
  info: CustomerInfo;
  push(info: CustomerInfo): void;
};

function fakeSdk(options: {
  offerings?: PurchasesOfferings;
  eligibility?: (id: string) => IntroEligibility;
  purchaseError?: unknown;
  offline?: boolean;
  /** Fire the update listener in the middle of `purchasePackage`, like the real SDK can. */
  updateDuringPurchase?: boolean;
} = {}): Fake {
  const { offerings = catalog(), eligibility = () => ELIGIBLE } = options;
  let listener: ((info: CustomerInfo) => void) | null = null;
  const fake: Fake = {
    attributes: {},
    bought: [],
    info: customer(null),
    push(info) {
      fake.info = info;
      listener?.(info);
    },
    async getOfferings() {
      if (options.offline) throw { code: '10' };
      return offerings;
    },
    async checkTrialOrIntroductoryPriceEligibility(ids) {
      return Object.fromEntries(ids.map((id) => [id, eligibility(id)]));
    },
    async purchasePackage(aPackage) {
      if (options.purchaseError) throw options.purchaseError;
      fake.bought.push(aPackage.product.identifier);
      const info = customer({ productId: aPackage.product.identifier, trial: !!aPackage.product.introPrice, startedAt: 1000 });
      if (options.updateDuringPurchase) fake.push(info);
      fake.info = info;
      return { customerInfo: info };
    },
    async restorePurchases() {
      return fake.info;
    },
    async getCustomerInfo() {
      if (options.offline) throw { code: '35' };
      return fake.info;
    },
    async setAttributes(attributes) {
      Object.assign(fake.attributes, attributes);
    },
    addCustomerInfoUpdateListener(next) {
      listener = next;
    },
    async showManageSubscriptions() {},
  };
  return fake;
}

const provider = (sdk: RevenueCatSdk, store: KeyValue = memoryKeyValue(), random = 0.9, now = new Date(2026, 10, 1)) =>
  createRevenueCatPurchases(sdk, { store, random: () => random, now: () => now });

test('the key: only a real public Apple (or Test Store) key turns RevenueCat on', () => {
  assert.equal(revenueCatKey('REPLACE_WITH_REVENUECAT_PUBLIC_APPLE_KEY'), null);
  assert.equal(revenueCatKey(''), null);
  assert.equal(revenueCatKey(undefined), null);
  assert.equal(revenueCatKey('goog_abc123'), null);
  assert.equal(revenueCatKey(' appl_AbC123 '), 'appl_AbC123');
  assert.equal(revenueCatKey('test_AbC123'), 'test_AbC123');
  assert.equal(revenueCatKey('test_AbC123', { allowTestStore: false }), null);
  assert.equal(revenueCatKey('appl_AbC123', { allowTestStore: false }), 'appl_AbC123');
});

test('intro offers: free weeks and days count, paid intros are not trials', () => {
  assert.equal(introTrialDays(week(1)), 7);
  assert.equal(introTrialDays(week(2)), 14);
  assert.equal(introTrialDays({ price: 0, periodUnit: 'DAY', periodNumberOfUnits: 3, cycles: 1 }), 3);
  assert.equal(introTrialDays({ price: 0.99, periodUnit: 'WEEK', periodNumberOfUnits: 1, cycles: 1 }), null);
  assert.equal(introTrialDays(null), null);
});

test('eligibility decides the trial: unknown or ineligible shows none', () => {
  const annual = product(PRODUCT_IDS.annual, 59.99, 'P1Y', 1);
  assert.equal(toOffer(annual, ELIGIBLE).trialDays, 7);
  assert.equal(toOffer(annual, INELIGIBLE).trialDays, null);
  assert.equal(toOffer(annual, UNKNOWN).trialDays, null);
  assert.equal(toOffer(annual, undefined).trialDays, null);
  assert.equal(toOffer(annual, ELIGIBLE).period, 'year');
  assert.equal(toOffer(product(PRODUCT_IDS.monthly, 9.99, 'P1M', null), ELIGIBLE).period, 'month');
});

test('offers come from the store, localized, with the exit products', async () => {
  const offers = await provider(fakeSdk({ offerings: catalog({ currency: 'EUR' }) })).getOffers();
  assert.equal(offers.annual.priceString, '59,99 €');
  assert.equal(offers.annual.currencyCode, 'EUR');
  assert.equal(offers.annual.trialDays, 7);
  assert.equal(offers.monthly.trialDays, null);
  assert.equal(offers.exitOffers['half-price']?.productId, PRODUCT_IDS['half-price']);
  assert.equal(offers.exitOffers['half-price']?.trialDays, 7);
  // Found through availablePackages when the package isn't typed Annual.
  assert.equal(offers.exitOffers['longer-trial']?.trialDays, 14);
});

test('a used-up trial: no trial strings and no longer-trial arm', async () => {
  const offers = await provider(fakeSdk({ eligibility: () => INELIGIBLE }), memoryKeyValue(), 0.9).getOffers();
  assert.equal(offers.annual.trialDays, null);
  assert.equal(offers.exitArm, 'none');
});

test('eligibility that fails to load shows no trial rather than a wrong one', async () => {
  const sdk = fakeSdk();
  sdk.checkTrialOrIntroductoryPriceEligibility = async () => {
    throw new Error('no');
  };
  assert.equal((await provider(sdk).getOffers()).annual.trialDays, null);
});

test('no Annual or Monthly in the current offering fails, so the paywall says the store isn’t answering', async () => {
  const offerings = { current: null, all: {} } as unknown as PurchasesOfferings;
  await assert.rejects(provider(fakeSdk({ offerings })).getOffers());
});

test('the exit arm is picked once, kept, and sent as an attribute', async () => {
  const store = memoryKeyValue();
  const sdk = fakeSdk();
  assert.equal((await provider(sdk, store, 0.5).getOffers()).exitArm, 'half-price');
  assert.equal(store.get(EXIT_ARM_KEY), 'half-price');
  assert.equal(sdk.attributes[ATTRIBUTES.exitArm], 'half-price');
  // A later launch draws a different number but keeps the arm.
  assert.equal((await provider(fakeSdk(), store, 0.1).getOffers()).exitArm, 'half-price');
});

test('offering metadata overrides the arm; missing exit offerings mean no offer', async () => {
  const forced = catalog({ metadata: { exit_arm: 'none' } });
  assert.equal((await provider(fakeSdk({ offerings: forced }), memoryKeyValue(), 0.5).getOffers()).exitArm, 'none');
  const bogus = catalog({ metadata: { exit_arm: 'lifetime' } });
  assert.equal((await provider(fakeSdk({ offerings: bogus }), memoryKeyValue(), 0.5).getOffers()).exitArm, 'half-price');
  const bare = catalog({ exits: false });
  assert.equal((await provider(fakeSdk({ offerings: bare }), memoryKeyValue(), 0.9).getOffers()).exitArm, 'none');
});

test('each target buys its own product, and a purchase entitles and caches', async () => {
  const store = memoryKeyValue();
  const sdk = fakeSdk();
  const rc = provider(sdk, store);
  assert.equal(await rc.isEntitled(), false);
  assert.deepEqual(await rc.purchase('longer-trial'), { status: 'purchased' });
  await rc.purchase('half-price');
  await rc.purchase('monthly');
  await rc.purchase('annual');
  assert.deepEqual(sdk.bought, [PRODUCT_IDS['longer-trial'], PRODUCT_IDS['half-price'], PRODUCT_IDS.monthly, PRODUCT_IDS.annual]);
  assert.equal(await rc.isEntitled(), true);
  assert.equal((await rc.currentTrialEnd())?.getTime(), 1000 + 7 * DAY);
  assert.equal(await rc.currentPlan(), 'annual');
  assert.equal(store.get<EntitlementRecord>(ENTITLEMENT_KEY)?.active, true);
});

test('cancel, Ask to Buy and errors', async () => {
  assert.deepEqual(await provider(fakeSdk({ purchaseError: { code: '1', userCancelled: true } })).purchase('annual'), { status: 'cancelled' });
  assert.deepEqual(await provider(fakeSdk({ purchaseError: { code: '20' } })).purchase('annual'), { status: 'pending' });
  const failed = await provider(fakeSdk({ purchaseError: { code: '10' } })).purchase('annual');
  assert.equal(failed.status, 'failed');
  assert.equal(purchaseFailure({ code: '35' }).status, 'failed');
  assert.equal(purchaseFailure(new Error('boom')).status, 'failed');
  assert.equal(purchaseFailure(undefined).status, 'failed');
  const missing = await provider(fakeSdk({ offerings: catalog({ exits: false }) })).purchase('half-price');
  assert.equal(missing.status, 'failed');
});

test('Restore reports the subscription the store finds', async () => {
  const sdk = fakeSdk();
  const rc = provider(sdk);
  assert.deepEqual(await rc.restore(), { entitled: false });
  sdk.info = customer({ productId: PRODUCT_IDS.monthly });
  assert.deepEqual(await rc.restore(), { entitled: true });
  assert.equal(await rc.currentPlan(), 'monthly');
  assert.equal(await rc.currentTrialEnd(), null);
});

test('a cancelled trial stays paid until its end but has no trial end to remind about', async () => {
  const sdk = fakeSdk();
  sdk.info = customer({ productId: PRODUCT_IDS.annual, trial: true, startedAt: 1000 });
  const rc = provider(sdk);
  assert.equal((await rc.currentTrialEnd())?.getTime(), 1000 + 7 * DAY);
  sdk.info = customer({ productId: PRODUCT_IDS.annual, trial: true, startedAt: 1000, willRenew: false });
  assert.equal(await rc.isEntitled(), true);
  assert.equal(await rc.currentTrialEnd(), null);
});

test('offline, the cached answer decides, with grace past the end date', async () => {
  const store = memoryKeyValue();
  const now = new Date(2026, 10, 1);
  const online = fakeSdk();
  online.info = customer({ productId: PRODUCT_IDS.annual, startedAt: now.getTime() - DAY, expiresAt: now.getTime() + 300 * DAY });
  assert.equal(await provider(online, store, 0.9, now).isEntitled(), true);

  // Next launch, no network: still paid, so useAppStart re-arms the lost night.
  assert.equal(await provider(fakeSdk({ offline: true }), store, 0.9, now).isEntitled(), true);
  const later = new Date(now.getTime() + 300 * DAY + OFFLINE_GRACE_MS + 1);
  assert.equal(await provider(fakeSdk({ offline: true }), store, 0.9, later).isEntitled(), false);

  // Nothing cached and no network: say so, so callers try again later.
  await assert.rejects(provider(fakeSdk({ offline: true })).isEntitled());
});

test('cachedEntitlement', () => {
  const now = new Date(2026, 10, 1);
  assert.equal(cachedEntitlement(undefined, now), false);
  assert.equal(cachedEntitlement({ active: false, checkedAt: 0 }, now), false);
  assert.equal(cachedEntitlement({ active: true, checkedAt: 0 }, now), true);
  assert.equal(cachedEntitlement({ active: true, expiresAt: now.getTime() - OFFLINE_GRACE_MS + 1, checkedAt: 0 }, now), true);
  assert.equal(cachedEntitlement({ active: true, expiresAt: now.getTime() - OFFLINE_GRACE_MS, checkedAt: 0 }, now), false);
  // Cancelled: it won't renew, so there's no offline renewal to wait for.
  assert.equal(cachedEntitlement({ active: true, willRenew: false, expiresAt: now.getTime() - 1, checkedAt: 0 }, now), false);
  // A clock set back before the last check doesn't keep a lapsed subscription paid offline.
  const later = now.getTime() + 2 * 60 * 60 * 1000;
  assert.equal(cachedEntitlement({ active: true, expiresAt: later + 1, checkedAt: later }, now), false);
  assert.equal(cachedEntitlement({ active: true, expiresAt: later + 1, checkedAt: now.getTime() + 60_000 }, now), true);
});

test('entitlementRecord keeps only plist-safe fields', () => {
  const record = entitlementRecord(customer({ productId: PRODUCT_IDS.annual, expiresAt: null }), new Date(5));
  assert.deepEqual(record, { active: true, productId: PRODUCT_IDS.annual, checkedAt: 5 });
  assert.deepEqual(entitlementRecord(customer(null), new Date(5)), { active: false, checkedAt: 5 });
});

test('onEntitled fires for an approval that arrives later, not for a purchase in flight', async () => {
  const sdk = fakeSdk({ updateDuringPurchase: true });
  const rc = provider(sdk);
  let fired = 0;
  const stop = rc.onEntitled(() => (fired += 1));

  // The purchase's own update, mid-purchase and after: the paywall arms, not the listener.
  await rc.purchase('annual');
  sdk.push(sdk.info);
  assert.equal(fired, 0);

  // Ask to Buy: pending now, approved later while the app runs.
  const teen = fakeSdk({ purchaseError: { code: '20' } });
  const teenRc = provider(teen);
  teenRc.onEntitled(() => (fired += 1));
  assert.deepEqual(await teenRc.purchase('annual'), { status: 'pending' });
  teen.push(customer({ productId: PRODUCT_IDS.annual, trial: true }));
  assert.equal(fired, 1);
  // Further updates while still subscribed don't fire again.
  teen.push(customer({ productId: PRODUCT_IDS.annual, trial: true }));
  assert.equal(fired, 1);

  stop();
});

test('attributes go to the customer record', () => {
  const sdk = fakeSdk();
  provider(sdk).setAttributes({ [ATTRIBUTES.found]: 'tiktok' });
  assert.equal(sdk.attributes.found, 'tiktok');
});
