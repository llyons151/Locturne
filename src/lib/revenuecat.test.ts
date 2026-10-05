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
  DEVICE_SEEN_AT_KEY,
  ENTITLEMENT_KEY,
  entitlementRecord,
  EXIT_ARM_KEY,
  introTrialDays,
  OFFLINE_GRACE_MS,
  purchaseFailure,
  revenueCatKey,
  SEEN_AT_KEY,
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
  return { entitlements: { active: entitlement ? { pro: entitlement } : {}, all: entitlement ? { pro: entitlement } : {} } } as unknown as CustomerInfo;
}

type Fake = RevenueCatSdk & {
  attributes: Record<string, string | null>;
  invalidated: number;
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
    invalidated: 0,
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
    async invalidateCustomerInfoCache() {
      fake.invalidated += 1;
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

test('a clock set back past expiry keeps nothing paid, from the store\'s cache or ours', async () => {
  const store = memoryKeyValue();
  const lapsed = new Date(2026, 10, 1);
  const expiresAt = lapsed.getTime() - 30 * DAY;
  // The server last answered a month after a cancelled plan ended; then the clock goes back.
  store.set(SEEN_AT_KEY, lapsed.getTime());
  const back = new Date(expiresAt - DAY);
  const sdk = fakeSdk();
  sdk.info = { ...customer({ productId: PRODUCT_IDS.annual, expiresAt, willRenew: false }), requestDate: back.toISOString() } as CustomerInfo;
  assert.equal(await provider(sdk, store, 0.9, back).isEntitled(), false);
  store.set(ENTITLEMENT_KEY, { active: true, expiresAt, willRenew: false, checkedAt: back.getTime() });
  assert.equal(await provider(fakeSdk({ offline: true }), store, 0.9, back).isEntitled(), false);
});

test('a clock once set forward doesn\'t lock a paying user out', async () => {
  const store = memoryKeyValue();
  const today = new Date(2026, 10, 1);
  const ahead = new Date(today.getTime() + 14 * DAY);
  const sdk = fakeSdk();
  sdk.info = signed(customer({ productId: PRODUCT_IDS.annual, expiresAt: today.getTime() - DAY }), today);
  await provider(sdk, store, 0.9, ahead).isEntitled();
  // Clock set right; a trial bought a minute later runs 7 days. The server's fresh answer
  // counts although the clock is now behind the time the phone last showed.
  const later = new Date(today.getTime() + 60_000);
  sdk.info = signed(customer({ productId: PRODUCT_IDS.annual, expiresAt: today.getTime() + 7 * DAY }), later);
  assert.equal(await provider(sdk, store, 0.9, later).isEntitled(), true);
  assert.equal(sdk.invalidated, 1, 'asked afresh, the clock being behind the time seen');
});

/** A server answer at `at`, signed (Trusted Entitlements). */
function signed(info: CustomerInfo, at: Date, verification = 'VERIFIED'): CustomerInfo {
  return { ...info, requestDate: at.toISOString(), entitlements: { ...info.entitlements, verification } } as CustomerInfo;
}

test('a clock set back before the plan ended makes the store answer afresh', async () => {
  const store = memoryKeyValue();
  const expiresAt = new Date(2026, 10, 1).getTime();
  // Last answered a week before a cancelled plan ended; opened next after it ended, clock a month back.
  const lastSeen = expiresAt - 7 * DAY;
  store.set(SEEN_AT_KEY, lastSeen);
  const back = new Date(expiresAt - 30 * DAY);
  const plan = customer({ productId: PRODUCT_IDS.annual, expiresAt, willRenew: false });
  const sdk = fakeSdk();
  // The SDK's cache, judged by the set-back clock, says active until asked afresh.
  sdk.getCustomerInfo = async () =>
    sdk.invalidated
      ? signed(customer(null), new Date(expiresAt + DAY))
      : ({ ...plan, requestDate: new Date(lastSeen).toISOString() } as CustomerInfo);
  assert.equal(await provider(sdk, store, 0.9, back).isEntitled(), false);
  assert.equal(sdk.invalidated, 1);
  // No answer at all with the clock behind: the cache doesn't count.
  store.set(ENTITLEMENT_KEY, { active: true, expiresAt, willRenew: false, checkedAt: lastSeen });
  assert.equal(await provider(fakeSdk({ offline: true }), store, 0.9, back).isEntitled(), false);
});

test('an answer that fails Trusted Entitlements counts as unpaid and moves no clock', async () => {
  const store = memoryKeyValue();
  const sdk = fakeSdk();
  const info = customer({ productId: PRODUCT_IDS.annual, expiresAt: Date.now() + 365 * DAY });
  sdk.info = {
    ...info,
    requestDate: new Date(2099, 0, 1).toISOString(),
    entitlements: { ...info.entitlements, verification: 'FAILED' },
  } as CustomerInfo;
  assert.equal(await provider(sdk, store).isEntitled(), false);
  assert.equal(store.get(SEEN_AT_KEY), undefined);
});

test('cached values of the wrong type fail closed', async () => {
  const store = memoryKeyValue();
  store.set(ENTITLEMENT_KEY, { active: 'false', checkedAt: 0 });
  assert.equal(await provider(fakeSdk({ offline: true }), store).isEntitled(), false);
});

test('only a signed server answer moves the server time seen', async () => {
  const store = memoryKeyValue();
  const today = new Date(2026, 10, 1);
  const ahead = new Date(today.getTime() + 365 * DAY);
  const plan = customer({ productId: PRODUCT_IDS.annual, expiresAt: today.getTime() + 30 * DAY });
  const sdk = fakeSdk();
  // A restore during a RevenueCat outage with the clock a year ahead: built on the phone.
  sdk.info = signed(plan, ahead, 'VERIFIED_ON_DEVICE');
  await provider(sdk, store, 0.9, ahead).isEntitled();
  assert.equal(store.get(SEEN_AT_KEY), undefined);
  // Clock set right, the server answers: still paid.
  sdk.info = signed(plan, today);
  assert.equal(await provider(sdk, store, 0.9, today).isEntitled(), true);
  assert.equal(store.get(SEEN_AT_KEY), today.getTime());
});

test('an answer built on the phone counts only after the server\'s time has been seen, clock not behind', async () => {
  const today = new Date(2026, 10, 1);
  const plan = customer({ productId: PRODUCT_IDS.annual, expiresAt: today.getTime() + 30 * DAY });
  const sdk = fakeSdk();
  sdk.info = signed(plan, today, 'VERIFIED_ON_DEVICE');
  // A fresh install (or reinstall) with RevenueCat unreachable: not yet.
  assert.equal(await provider(sdk, memoryKeyValue(), 0.9, today).isEntitled(), false);
  // Seen the server before, clock right: an outage doesn't stand a payer down.
  const store = memoryKeyValue();
  store.set(SEEN_AT_KEY, today.getTime() - DAY);
  assert.equal(await provider(sdk, store, 0.9, today).isEntitled(), true);
});

test('a clock wound back again and again, RevenueCat blocked before a cancelled plan ended, stops counting', async () => {
  const store = memoryKeyValue();
  const expiresAt = new Date(2026, 10, 1).getTime();
  // The last signed answer, a week before the plan ends; then RevenueCat is blocked for good.
  const lastSeen = expiresAt - 7 * DAY;
  store.set(SEEN_AT_KEY, lastSeen);
  const plan = customer({ productId: PRODUCT_IDS.annual, expiresAt, willRenew: false });
  const sdk = fakeSdk();
  // The real SDK vends its disk cache without throwing, and judges it active by a clock before the end.
  sdk.getCustomerInfo = async () => signed(plan, new Date(lastSeen));
  // Long past the end, the clock is set to a day before it: nothing tells this from a real day.
  assert.equal(await provider(sdk, store, 0.9, new Date(expiresAt - DAY)).isEntitled(), true);
  // It runs on to the evening, and the app is opened again.
  assert.equal(await provider(sdk, store, 0.9, new Date(expiresAt - 2 * 60 * 60 * 1000)).isEntitled(), true);
  // Next morning, wound back to a day before the end again: behind a time the phone already showed.
  assert.equal(await provider(sdk, store, 0.9, new Date(expiresAt - DAY)).isEntitled(), false);
  assert.equal(sdk.invalidated, 1);
  // Unblocked, the server answers: a payer is paid again at once, even with the clock still back.
  const renewed = customer({ productId: PRODUCT_IDS.annual, expiresAt: expiresAt + 365 * DAY });
  sdk.getCustomerInfo = async () => signed(renewed, new Date(expiresAt + 30 * DAY));
  assert.equal(await provider(sdk, store, 0.9, new Date(expiresAt - DAY)).isEntitled(), true);
  assert.equal(store.get(DEVICE_SEEN_AT_KEY), expiresAt - DAY, 'a fresh answer resets the time the phone showed');
});

test('the SDK\'s cache is judged by the app\'s rule: a cancelled plan ends on time, a renewing one keeps its grace', async () => {
  const expiresAt = new Date(2026, 10, 1).getTime();
  const lastSeen = expiresAt - DAY;
  // Clock right, RevenueCat unreachable two days after the end: the SDK judges its cache by
  // its requestDate for three days, so it still says active.
  const now = new Date(expiresAt + 2 * DAY - 60_000);
  const cancelled = memoryKeyValue();
  cancelled.set(SEEN_AT_KEY, lastSeen);
  const ended = fakeSdk();
  ended.getCustomerInfo = async () => signed(customer({ productId: PRODUCT_IDS.annual, expiresAt, willRenew: false }), new Date(lastSeen));
  assert.equal(await provider(ended, cancelled, 0.9, now).isEntitled(), false);
  // A plan that renews, offline over its renewal: the offline grace keeps it paid.
  const renewing = memoryKeyValue();
  renewing.set(SEEN_AT_KEY, lastSeen);
  const payer = fakeSdk();
  payer.getCustomerInfo = async () => signed(customer({ productId: PRODUCT_IDS.annual, expiresAt }), new Date(lastSeen));
  assert.equal(await provider(payer, renewing, 0.9, now).isEntitled(), true);
  // A fresh answer is the server's word, judged by its own time.
  payer.getCustomerInfo = async () => signed(customer({ productId: PRODUCT_IDS.annual, expiresAt: expiresAt + 365 * DAY }), now);
  assert.equal(await provider(payer, renewing, 0.9, now).isEntitled(), true);
});

test('a renewal missed offline keeps its grace even after the SDK drops it from active', async () => {
  const store = memoryKeyValue();
  // Last online Friday 08:00; the plan renewed Saturday 20:00 with no signal; opened Monday 09:00.
  const friday = new Date(2026, 9, 2, 8);
  const renewed = new Date(2026, 9, 3, 20).getTime();
  const monday = new Date(2026, 9, 5, 9);
  store.set(SEEN_AT_KEY, friday.getTime());
  const plan = customer({ productId: PRODUCT_IDS.monthly, expiresAt: renewed });
  // The SDK's cache, filtered by the phone's clock more than three days after it was fetched.
  const sdk = fakeSdk();
  sdk.info = { ...signed(plan, friday), entitlements: { ...plan.entitlements, active: {}, verification: 'VERIFIED' } } as CustomerInfo;
  assert.equal(await provider(sdk, store, 0.9, monday).isEntitled(), true);
  // Cancelled instead: it ends on time.
  const cancelled = customer({ productId: PRODUCT_IDS.monthly, expiresAt: renewed, willRenew: false });
  sdk.info = { ...signed(cancelled, friday), entitlements: { ...cancelled.entitlements, active: {}, verification: 'VERIFIED' } } as CustomerInfo;
  assert.equal(await provider(sdk, store, 0.9, monday).isEntitled(), false);
});

test('a refund the server already reported stays unpaid when the SDK serves it from its cache', async () => {
  const store = memoryKeyValue();
  const refunded = new Date(2026, 10, 1, 12);
  // Refunded: the entitlement ended at the refund, still marked as renewing.
  const ended = customer({ productId: PRODUCT_IDS.annual, expiresAt: refunded.getTime() - 60_000 });
  const answer = { ...signed(ended, refunded), entitlements: { ...ended.entitlements, active: {}, verification: 'VERIFIED' } } as CustomerInfo;
  const sdk = fakeSdk();
  sdk.info = answer;
  assert.equal(await provider(sdk, store, 0.9, refunded).isEntitled(), false);
  // The same answer again, now the SDK's cache: a minute and nearly three days later.
  assert.equal(await provider(sdk, store, 0.9, new Date(refunded.getTime() + 60_000)).isEntitled(), false);
  assert.equal(await provider(sdk, store, 0.9, new Date(refunded.getTime() + 2.9 * DAY)).isEntitled(), false);
});
