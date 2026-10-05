# Analytics (PostHog)

Built October 3, 2026. This covers what the app sends, how to turn it on, and the views in
PostHog that answer three questions:
1. **Onboarding:** where do people drop off before the paywall, and what predicts a trial?
2. **Activation:** do trial starters prove a first morning (LAUNCH_PLAN §5's key metric)?
3. **Retention:** do they keep opening the app and proving mornings, and does the block
   actually start every night?

Code: [src/lib/analytics.ts](../src/lib/analytics.ts) (the event list and privacy rules,
pure and tested) and [src/lib/analytics-start.ts](../src/lib/analytics-start.ts) (PostHog
setup, unlock and night reporting, screen views).

## Turning it on

1. Create a PostHog Cloud project (free tier: 1M events a month). **US or EU:** pick one
   and keep it; it can't be moved later. US is the default in `app.json`.
2. Copy the project API key (`phc_…`) into `app.json` → `expo.extra.posthog.apiKey`. If you
   picked EU, set `host` to `https://eu.i.posthog.com`.
3. **Make a new dev build.** The SDK needs native modules (`expo-application`,
   `expo-device`, `expo-file-system`, `expo-localization`), so the dev build on your phone
   won't have them until you rebuild (`eas build --profile development`).
4. In PostHog → Project settings → **Filter out internal and test users**, add
   `app_env = development` and `store_stubbed = true`. Every insight then excludes your own
   testing when its "Filter out internal and test users" box is ticked (the default).
5. **RevenueCat → Integrations → PostHog:** paste the same project key. The app sets the
   `$posthogUserId` attribute, so trial conversions, renewals, cancellations and refunds
   arrive as events on the same person. Without this, PostHog only sees the trial *start*.
6. Fill the privacy policy TODOs (region, retention) and update the App Privacy label
   (section "Privacy" below).

With the placeholder key, or on the web preview, nothing is sent and nothing breaks.

## Privacy rules (enforced in code)

These keep the app inside what [privacy.html](../web/public/privacy.html) and
[PRIVACY_LABELS.md](app-store/PRIVACY_LABELS.md) promise:

| Never sent | Sent instead |
|---|---|
| Which apps were picked | `apps_picked.count` |
| Step counts, stairs, altitude | the method (`morning_unlocked.method`) and how the walk ended |
| Exact age | `age_bracket` (13-17, 18-24, 25-34, 35+) |
| Anything after "under 13" | nothing: `stopForChild` opts the install out for good |
| Bedtime and wake times | nothing (ONBOARDING_RESEARCH: don't attach routine times to a funnel) |
| Screen recordings, tap targets | nothing: session replay and touch autocapture are off, because the screen shows the picked apps' names |

The Screen Time extensions never load the SDK. Error tracking (uncaught exceptions and
unhandled rejections) is on, as the policy lists "error reports".

## Events

Every event also carries `app_env`, `store_stubbed`, `onboarding_version`, PostHog's
device and app properties, and, once answered, the super properties
`onboarding_found`, `onboarding_method`, `onboarding_age_bracket` and
`onboarding_timeBack`. That means any event can be split by how they found the app or
which wake-up method they picked. All quiz answers are also set on the person.

### Onboarding

| Event | When | Properties |
|---|---|---|
| `onboarding_started` | the flow opens | `rerun`, `entry_step` |
| `onboarding_step_viewed` | every step shown | `step`, `step_index`, `depth`, `editing`, `previous_step`, `ms_on_previous` |
| `onboarding_answered` | leaving a quiz step forwards | `question`, `answer` |
| `walk_started` / `walk_finished` | the 20-step walk | `result` (done, denied, unavailable), `seconds` |
| `screen_time_access` | after Apple's prompt | `result` |
| `apps_picked` | Apple's picker closes with at least one app picked (closing it empty sends nothing) | `count` |
| `paywall_viewed` | `offer`, `plans`, `declined` | `page`, `exit_arm` (null until prices load), `prices_loaded`, `trial_days` (the annual plan's; on `declined`, the exit offer's) |
| `offers_failed` | the store didn't return prices | |
| `purchase_started` / `purchase_result` | a plan is tapped (and an Ask to Buy approval, `target` = `approved`) | `target`, `page`, `status` |
| `purchase_result` (`page` = `later`) | an Ask to Buy approval found after the paywall closed: on the next open, or while the app runs elsewhere. Once per waiting purchase. | `target` = `approved`, `page` = `later`, `status` = `purchased` |
| `restore_result` | Restore | `found`, `step` |
| `onboarding_completed` | setup saved and armed in the flow | `via` (`purchase`; `restore` when Restore found a subscription; `entitled` when already subscribed as the flow opened, nothing restored), `depth` |
| `night_armed` | after arming tonight | `status`, `reason`, `now` |
| `motion_access` | the post-purchase Motion ask | `result` |
| `onboarding_exited` | the close button | `step`, `depth`, `setup_saved`, `saw_paywall` |

An approval that lands after the paywall closed sends `purchase_result` with `page` = `later`
but no `onboarding_completed`: the setup was saved when the purchase went pending, and nothing
in the flow finished. Count paying users from `purchase_result` (purchased), as the views
below do, not from `onboarding_completed`.

Bump `ONBOARDING_VERSION` in analytics.ts whenever the flow changes enough that its funnel
shouldn't be compared with the old one, and split funnels by it.

### The app

| Event | When | Properties |
|---|---|---|
| `Application Opened`, `Application Became Active`, `Application Installed`, … | PostHog lifecycle events | |
| `$screen` | each route (tabs, wake, scan, exits) | `$screen_name` |
| `morning_unlocked` | any proof: stairs, steps, scan, pass, emergency | `method`, `after_start` (bucket: before, <5, 5-15, 15-30, 30-60, 60+, from the morning start of the routine the proof was judged under), `morning_number` |
| `night_checked` | once per finished night, on the next open | `verdict` (onTime, late, missed, noShield), `late_by_minutes` |
| `pass_used` | a pass is spent | `passes_left` |
| `emergency_unlock` | the emergency unlock | `phase`, `paused_night`, `ended_block_now`, `unlocked_morning` |
| `notifications_permission` | iOS's answer changes | `granted` |
| `notification_opened` | a notification is tapped | `kind` (morning, bedtime, shieldTap, trial, revoked) |
| `$exception` | an uncaught JS error | PostHog's error fields |

## The views to build in PostHog

Create one dashboard, "Locturne", with these insights.

**1. Onboarding funnel** (Funnel, by unique users, 1 day window):
`onboarding_started` → `onboarding_step_viewed` step = `reveal` → step = `tomorrow` →
`screen_time_access` result = granted → `apps_picked` → `paywall_viewed` →
`purchase_result` status = purchased. Break down by `onboarding_version`. The biggest drop
is where to work next. Also break down by `onboarding_found` to see which video angle
brings buyers rather than installs. (Not step = `walk`: it's skipped late at night, so
night-time installers would all read as drop-offs there.)

**2. Every-step drop-off** (Funnel, or a Trends table of `onboarding_step_viewed` unique
users broken down by `step`). Sort by `step_index`. Add a second Trends insight on
`ms_on_previous` (median, by `previous_step`) to find the screens people stall on.

**3. Paywall conversion** (Trends, formula): unique `purchase_result` (purchased) ÷ unique
`paywall_viewed`, broken down by `exit_arm` and `onboarding_found`. Compare `declined`
page conversions to see if the exit offer pays.

**4. Activation** (Funnel, 3 day window): `purchase_result` status = purchased →
`night_checked` verdict = onTime → `morning_unlocked`. This is the trial's job: get them to
one proven morning. Break down by `onboarding_method`.

**5. Retention** (Retention insight): start event `purchase_result` (purchased), return
event `morning_unlocked`, daily, 14 days. A second one with return event
`Application Became Active` for general use. Break down by `onboarding_method` to see if
downstairs people stick better than steps people.

**6. Does it work?** (Trends): `night_checked` broken down by `verdict`, as a % stacked
chart. Anything but `onTime` is a product bug or an iOS limit; alert on `missed` +
`noShield` above 5%.

**7. Escape hatches** (Trends): `pass_used` and `emergency_unlock` per user per week. Lots
of emergency unlocks mean the lock is too strict or the methods too hard.

**8. Revenue** (needs step 5 of setup): RevenueCat's events (by default
`rc_trial_converted_event`, `rc_renewal_event`, `rc_cancellation_event`; check the names on
the integration page) in a funnel from `purchase_result`, broken down
by `onboarding_found`, judged at day 35 as GAME_PLAN says.

## Next steps (not built)

- **Experiments with PostHog feature flags.** The exit offer arm comes from RevenueCat
  today. Onboarding copy or step-order tests could use PostHog flags + Experiments, with
  `purchase_result` as the goal. Needs enough traffic: at a few hundred installs a week,
  run one test at a time.
- **Surveys:** a one-question PostHog survey after the third proven morning ("How likely
  are you to recommend Locturne?"). It would need the policy to mention surveys.
