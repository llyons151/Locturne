/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  annualSavingsPercent,
  createClosedPurchases,
  createDevPurchases,
  DEV_CATALOG,
  formatPrice,
  getOffers,
  isEntitled,
  isExitArm,
  memoryKeyValue,
  perMonth,
  pickExitArm,
  planOf,
  PRODUCT_IDS,
  purchase,
  reminderDay,
  resolveExitArm,
  restore,
  setPurchasesProvider,
  trialEndsAt,
  currentTrialEnd,
} from './purchases.ts';

test('the stub offers the decided plans, with trials only on annual', async () => {
  const offers = await createDevPurchases().getOffers();
  assert.equal(offers.annual.price, DEV_CATALOG.annual);
  assert.equal(offers.annual.priceString, '$59.99');
  assert.equal(offers.annual.trialDays, 7);
  assert.equal(offers.monthly.priceString, '$9.99');
  assert.equal(offers.monthly.trialDays, null);
  assert.equal(offers.exitOffers['half-price']?.priceString, '$29.99');
  assert.equal(offers.exitOffers['longer-trial']?.trialDays, 14);
  assert.equal(offers.exitArm, 'longer-trial');
});

test('no intro-offer eligibility: no trial anywhere, and no longer-trial arm', async () => {
  const offers = await createDevPurchases({ trialEligible: false }).getOffers();
  assert.equal(offers.annual.trialDays, null);
  assert.equal(offers.exitOffers['half-price']?.trialDays, null);
  assert.equal(offers.exitArm, 'none');
  // Half price still makes sense without a trial.
  const half = await createDevPurchases({ trialEligible: false, exitArm: 'half-price' }).getOffers();
  assert.equal(half.exitArm, 'half-price');
});

test('resolveExitArm keeps none and half-price as they are', async () => {
  const offers = await createDevPurchases().getOffers();
  assert.equal(resolveExitArm('none', offers), 'none');
  assert.equal(resolveExitArm('half-price', offers), 'half-price');
  assert.equal(resolveExitArm('longer-trial', offers), 'longer-trial');
});

test('savings and per-month come from the offer prices', async () => {
  const offers = await createDevPurchases().getOffers();
  assert.equal(annualSavingsPercent(offers), 49);
  // Round storefront prices whose float result lands a hair under a whole number.
  const priced = (annual: number, monthly: number) =>
    annualSavingsPercent({ annual: { ...offers.annual, price: annual }, monthly: { ...offers.monthly, price: monthly } });
  assert.equal(priced(48, 5), 20);
  assert.equal(priced(66, 10), 45);
  assert.equal(priced(54, 5), 10);
  assert.equal(perMonth(offers.annual, 'en-US'), '$5.00');
  assert.equal(perMonth(offers.monthly, 'en-US'), '$9.99');
  // The store's string wins, so it's formatted like the billed price, not the phone's locale.
  assert.equal(perMonth({ ...offers.annual, pricePerMonthString: 'US$5.00' }, 'de-DE'), 'US$5.00');
  assert.equal(formatPrice(59.99, 'EUR', 'de-DE'), '59,99 €');
});

test('a purchase entitles, remembers when the trial ends, and restores', async () => {
  const store = memoryKeyValue();
  const at = new Date(2026, 9, 3, 21, 0);
  const stub = createDevPurchases({ store, now: () => at });
  assert.equal(await stub.isEntitled(), false);
  assert.deepEqual(await stub.restore(), { entitled: false });

  assert.deepEqual(await stub.purchase('annual'), { status: 'purchased' });
  assert.equal(await stub.isEntitled(), true);
  assert.equal((await stub.currentTrialEnd())?.getTime(), trialEndsAt(7, at).getTime());

  // A fresh install on the same Apple ID: Restore finds it.
  const again = createDevPurchases({ store });
  assert.deepEqual(await again.restore(), { entitled: true });
});

test('monthly has no trial to remember', async () => {
  const stub = createDevPurchases();
  await stub.purchase('monthly');
  assert.equal(await stub.currentTrialEnd(), null);
});

test('the longer-trial exit offer ends 14 days out', async () => {
  const at = new Date(2026, 9, 3, 21, 0);
  const stub = createDevPurchases({ now: () => at });
  await stub.purchase('longer-trial');
  assert.equal((await stub.currentTrialEnd())?.getTime(), trialEndsAt(14, at).getTime());
});

test('cancelled, pending and failed purchases entitle nothing', async () => {
  for (const outcome of ['cancelled', 'pending', 'failed'] as const) {
    const stub = createDevPurchases({ outcome });
    const result = await stub.purchase('annual');
    assert.equal(result.status, outcome);
    assert.equal(await stub.isEntitled(), false);
  }
});

test('the module-level functions use the provider that was set', async () => {
  setPurchasesProvider(createDevPurchases({ exitArm: 'none' }));
  assert.equal((await getOffers()).exitArm, 'none');
  assert.equal(await isEntitled(), false);
  await purchase('half-price');
  assert.equal(await isEntitled(), true);
  assert.deepEqual(await restore(), { entitled: true });
  assert.ok(await currentTrialEnd());
});

test('a second purchase while one is in flight starts nothing', async () => {
  setPurchasesProvider(createDevPurchases({ latencyMs: 20 }));
  const [first, second] = await Promise.all([purchase('annual'), purchase('annual')]);
  assert.deepEqual(first, { status: 'purchased' });
  assert.deepEqual(second, { status: 'cancelled' });
  // Once it's done, the next one goes through.
  assert.deepEqual(await purchase('monthly'), { status: 'purchased' });
});

test('trial dates', () => {
  const start = new Date(2026, 9, 3);
  assert.equal(trialEndsAt(7, start).getDate(), 10);
  assert.equal(trialEndsAt(14, start).getMonth(), 9);
  const afternoon = new Date(2026, 9, 3, 15);
  assert.equal(reminderDay(7, afternoon), 5);
  assert.equal(reminderDay(14, afternoon), 12);
  assert.equal(reminderDay(2, afternoon), 1);
  // Before noon, noon two days before the charge has already gone: it's the day before.
  assert.equal(reminderDay(7, new Date(2026, 9, 3, 9)), 4);
  assert.ok(isExitArm('half-price'));
  assert.ok(!isExitArm('lifetime'));
  assert.ok(!isExitArm(undefined));
});

test('a missing exit offering resolves to no offer', () => {
  assert.equal(resolveExitArm('half-price', { exitOffers: {} }), 'none');
  assert.equal(resolveExitArm('longer-trial', { exitOffers: {} }), 'none');
});

test('pickExitArm splits evenly into three and never runs off the end', () => {
  assert.equal(pickExitArm(0), 'none');
  assert.equal(pickExitArm(0.34), 'half-price');
  assert.equal(pickExitArm(0.67), 'longer-trial');
  assert.equal(pickExitArm(1), 'longer-trial');
  const counts = { none: 0, 'half-price': 0, 'longer-trial': 0 };
  for (let i = 0; i < 300; i++) counts[pickExitArm(i / 300)] += 1;
  assert.deepEqual(counts, { none: 100, 'half-price': 100, 'longer-trial': 100 });
});

test('every product ID maps to its plan, and each target has its own product', () => {
  assert.equal(planOf(PRODUCT_IDS.monthly), 'monthly');
  assert.equal(planOf(PRODUCT_IDS.annual), 'annual');
  assert.equal(planOf(PRODUCT_IDS['half-price']), 'annual');
  assert.equal(planOf(PRODUCT_IDS['longer-trial']), 'annual');
  assert.equal(new Set(Object.values(PRODUCT_IDS)).size, 4);
});

test('the stub reports the plan bought and keeps attributes', async () => {
  const stub = createDevPurchases();
  assert.equal(await stub.currentPlan(), null);
  await stub.purchase('longer-trial');
  assert.equal(await stub.currentPlan(), 'annual');
  stub.setAttributes({ found: 'tiktok' });
  assert.deepEqual(stub.attributes, { found: 'tiktok' });
});

test('a release build with no store key sells nothing and unlocks nothing', async () => {
  const closed = createClosedPurchases();
  await assert.rejects(closed.getOffers());
  assert.equal((await closed.purchase('annual')).status, 'failed');
  assert.deepEqual(await closed.restore(), { entitled: false });
  assert.equal(await closed.isEntitled(), false);
});
