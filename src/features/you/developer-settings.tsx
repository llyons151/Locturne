'use no memo';
// Reads the App Group stores during render (the test lock, moons), which change outside React.

import { SymbolView } from 'expo-symbols';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MenuRow, SwitchRow } from '@/components/controls';
import { sym, ValueRow } from '@/components/grouped-list';
import { Text } from '@/components/text';
import * as haptic from '@/lib/haptics';
import type { WakeMethod } from '@/lib/routine';
import { methodInUse } from '@/lib/scan-code';
import { endTestLock, getTestLock, isScreenTimeAvailable, startTestLock } from '@/lib/screen-time';
import { DisplayFont, Gap, Nocturne, Space, Type } from '@/theme';

import { MOON_RENDER_STYLES, setMoonRender, useMoonRender } from '@/features/dev/moon-render/moon-render';
import { RehearsalSection } from '@/features/dev/rehearsal/rehearsal-section';
import { backToRealApp, SHOT_GROUPS } from '@/features/dev/screenshots/screenshot-pages';
import { LAB_METHODS } from '@/features/dev/wake-lab/wake-lab';
import { fakeTheMorning } from '@/features/dev/wake-lab/wake-preview';
import { devEarnAll, devEarnNext, devForgetMoons, getMoonsAsPage, getMoonWheel, setMoonsAsPage, setMoonWheel } from '@/features/moons/moon-collection';
import { armMoonSim, isMoonSimArmed } from '@/features/moons/moon-sim';
import { useMoon } from '@/features/moons/moon-theme';

import { SETTINGS_BG } from './settings-actions';

/**
 * Settings' Developer page (dev and preview builds only, app/(dev)/developer.tsx): every dev and
 * preview tool that used to fold open at the bottom of Settings, on a page of its own now that
 * Settings is Apple's own list (you-screen.ios.tsx).
 */

function preview(href: Href, method?: WakeMethod) {
  fakeTheMorning(method);
  // Home is the tab next door: switch to it rather than stack a second Home.
  if (href === '/') router.navigate('/');
  else router.push(href);
}

const METHOD_ICONS: Record<WakeMethod, ReturnType<typeof sym>> = {
  steps: sym('figure.walk', 'directions_walk'),
  dance: sym('figure.dance', 'taunt'),
  scan: sym('barcode.viewfinder', 'barcode_scanner'),
  place: sym('mappin.and.ellipse', 'location_on'),
  pushups: sym('figure.strengthtraining.functional', 'fitness_center'),
  downtime: sym('hourglass', 'hourglass_empty'),
};

/**
 * The bedtime apps really sleep, then Home's test morning for `method` (user 2026-10-28: test it
 * as it really appears, from Home's button); winning it wakes them (`pretendWoke`).
 */
function testLock(method: WakeMethod) {
  if (!isScreenTimeAvailable()) return Alert.alert('iPhone only', 'The test lock needs Screen Time, so run it on the phone.');
  // Tests the real thing (user 2026-10-29): with no code or place set up, the test morning fell
  // back on a made-up one that can never be reached.
  if (methodInUse(method) !== method) {
    const scan = method === 'scan';
    return Alert.alert(
      scan ? 'No code yet' : 'No place yet',
      scan ? 'The test scans your real code, so set one up first.' : 'The test checks you in at your real place, so pick one first.',
      [
        { text: 'Not now', style: 'cancel' },
        { text: scan ? 'Set up a code' : 'Pick a place', onPress: () => router.push(scan ? '/code' : '/place-pick') },
      ],
    );
  }
  if (!startTestLock(method)) {
    return Alert.alert('Nothing to lock', 'Allow Screen Time and pick some bedtime apps in Apps first. The test locks those.');
  }
  haptic.done();
  preview('/', method);
}

export function DeveloperSettings() {
  const insets = useSafeAreaInsets();
  const moon = useMoon();
  const render = useMoonRender();
  const [testRun, setTestRun] = useState(getTestLock);
  const [moonsAsPage, setAsPage] = useState(getMoonsAsPage);
  const [moonWheel, setWheel] = useState(getMoonWheel);
  // Only so the row's "On next open" shows straight away.
  const [, setArmed] = useState(false);
  const refresh = useCallback(() => setTestRun(getTestLock()), []);
  useFocusEffect(refresh);
  const icon = (ios: Parameters<typeof sym>[0], android: Parameters<typeof sym>[1]) => ({ iconTint: Nocturne.text, icon: sym(ios, android) });

  return (
    <ScrollView
      style={styles.screen}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Space.l, paddingBottom: insets.bottom + Gap.section }]}
    >
      <View style={styles.head}>
        <View style={styles.side}>
          <Pressable
            onPress={() => {
              haptic.tap();
              router.back();
            }}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={8}
            style={({ pressed }) => [styles.close, pressed && styles.pressed]}
          >
            <SymbolView name={sym('chevron.left', 'chevron_left')} size={13} weight="bold" tintColor={Nocturne.text2} />
          </Pressable>
        </View>
        <Text style={styles.title} accessibilityRole="header">
          Developer
        </Text>
        <View style={styles.side} />
      </View>

      {/* Every screen the App Store set needs, made up and opened in one tap (features/dev/screenshots). */}
      <Fold title="Screenshot pages">
        {SHOT_GROUPS.map((group) => (
          <Group key={group.title} label={group.title}>
            {group.shots.map((shot) => (
              <ValueRow key={shot.label} {...icon('camera', 'photo_camera')} title={shot.label} value="" onPress={shot.open} last />
            ))}
          </Group>
        ))}
        <Group note="Turns the FAKE markings back on and puts Home back to the real state.">
          <ValueRow {...icon('arrow.uturn.backward', 'undo')} title="Back to the real app" value="" onPress={backToRealApp} last />
        </Group>
      </Fold>

      {/* Wear any moon, all unlocked, to test them (features/moons). */}
      <Group
        label="Moon"
        note="Wear any moon, unlocked or not. Unlock the next one and play the victory screen for it (the rare one once the ladder's done), earn the next one quietly, earn them all, or start over with none. The first switch opens the collection as its own page instead of a sheet; the second makes tapping the moon open the moon wheel instead of the collection."
      >
        <ValueRow {...icon('moon.circle', 'dark_mode')} title="Moon" value={moon.name} onPress={() => router.push('/moons' as Href)} last />
        <SwitchRow
          {...icon('rectangle.portrait', 'crop_portrait')}
          title="Moons as a page"
          value={moonsAsPage}
          onChange={(on) => {
            setMoonsAsPage(on);
            setAsPage(on);
          }}
          last
        />
        <SwitchRow
          {...icon('circle.circle', 'radio_button_checked')}
          title="Moon opens the wheel"
          value={moonWheel}
          onChange={(on) => {
            setMoonWheel(on);
            setWheel(on);
          }}
          last
        />
        <ValueRow
          {...icon('sunrise', 'wb_twilight')}
          title="Unlock a moon, with the payoff"
          value={isMoonSimArmed() ? 'On next open' : ''}
          onPress={() => {
            haptic.done();
            armMoonSim();
            setArmed(true);
            Alert.alert('Close Locturne', 'Swipe it away (or just leave it), then open it again. The new moon shows up as if you just won the morning.');
          }}
          last
        />
        <ValueRow
          {...icon('plus.circle', 'add_circle')}
          title="Earn the next moon"
          value=""
          onPress={() => {
            haptic.done();
            devEarnNext();
          }}
          last
        />
        <ValueRow
          {...icon('sparkles', 'auto_awesome')}
          title="Earn every moon"
          value=""
          onPress={() => {
            haptic.done();
            devEarnAll();
          }}
          last
        />
        <ValueRow
          {...icon('arrow.counterclockwise', 'replay')}
          title="Forget my moons"
          value=""
          onPress={() => {
            haptic.tap();
            devForgetMoons();
          }}
          last
        />
      </Group>

      {/* Dev test (user, 2026-11-07): the Blender moon renders on the phone (features/dev/moon-render). */}
      <Group
        label="Moon render test"
        note="The 3D renders in place of today's moon, on the Eclipse, Crescent and Harvest Moon only: wear one of those to see it. Behind the frost blurs the render like the sky's frosted glass, the way today's moons look."
      >
        <MenuRow
          {...icon('circle.lefthalf.filled', 'contrast')}
          title="Render"
          value={render.style}
          options={MOON_RENDER_STYLES}
          onChange={(style) => {
            haptic.tap();
            setMoonRender({ style });
          }}
          last
        />
        <SwitchRow
          {...icon('aqi.medium', 'blur_on')}
          title="Behind the frost"
          value={render.frost}
          onChange={(frost) => setMoonRender({ frost })}
          last
        />
      </Group>

      {/* The whole onboarding again from the first screen. */}
      <Group note="The whole onboarding again from the start. Finishing it saves its answers as your routine.">
        <ValueRow {...icon('arrow.counterclockwise', 'replay')} title="Redo onboarding" value="" onPress={() => router.push('/onboarding?paywall=1')} last />
      </Group>

      {/* A real lock on the bedtime apps, woken by one method (wake-lab.tsx). */}
      {testRun ? (
        <Group label="Morning unlocks" note="A test lock is still on. Your bedtime apps stay asleep until its test morning on Home is won, or it's ended here.">
          <ValueRow {...icon('lock', 'lock')} title="Back to the test morning" value="" onPress={() => preview('/', testRun.method as WakeMethod)} last />
          <ValueRow
            {...icon('lock.open', 'lock_open')}
            title="End the test lock"
            value=""
            onPress={() => {
              haptic.tap();
              endTestLock();
              refresh();
            }}
            last
          />
        </Group>
      ) : (
        <Group
          label="Morning unlocks"
          note="Your bedtime apps sleep right away, for real. Home opens a test morning for the method: win it to wake them. Nothing is recorded and your routine doesn't change."
        >
          {LAB_METHODS.map((m) => (
            <ValueRow key={m.value} iconTint={Nocturne.text} icon={METHOD_ICONS[m.value]} title={m.title} value="" onPress={() => testLock(m.value)} last />
          ))}
        </Group>
      )}

      {/* A real night of minutes from iOS, run with Locturne closed (features/dev/rehearsal). */}
      <View style={styles.divider} />
      <View style={styles.carded}>
        <RehearsalSection headingStyle={styles.label} icons={METHOD_ICONS} />
      </View>
    </ScrollView>
  );
}

/** One group of rows under a hairline: an optional small grey label over it and a grey note under it. */
function Group({ label, note, children }: { label?: string; note?: string; children: ReactNode }) {
  return (
    <>
      <View style={styles.divider} />
      {label ? (
        <Text style={styles.label} accessibilityRole="header">
          {label}
        </Text>
      ) : null}
      <View style={styles.group}>{children}</View>
      {note ? <Text style={styles.note}>{note}</Text> : null}
    </>
  );
}

/** A heading row that folds its groups open and shut, closed to begin with. */
function Fold({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => {
          haptic.tap();
          setOpen((was) => !was);
        }}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [styles.fold, pressed && styles.pressed]}
      >
        <Text style={styles.foldText}>{title}</Text>
        <SymbolView name={sym(open ? 'chevron.down' : 'chevron.right', open ? 'expand_more' : 'chevron_right')} size={13} weight="semibold" tintColor={Nocturne.text3} />
      </Pressable>
      {open ? children : null}
    </>
  );
}

const CLOSE = 30;
const SIDE = 72;
/** Where a row's title starts: its inset, the icon and the gap after it (grouped-list.tsx). */
const TITLE_AT = Space.l + 22 + 14;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: SETTINGS_BG },
  content: { paddingHorizontal: Gap.gutter - Space.l },
  pressed: { opacity: 0.7 },
  head: { flexDirection: 'row', alignItems: 'center', minHeight: CLOSE, marginHorizontal: Space.l, marginBottom: Gap.block },
  close: { width: CLOSE, height: CLOSE, borderRadius: CLOSE / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: Nocturne.frost },
  title: { ...DisplayFont, flex: 1, color: Nocturne.text, fontSize: 22, lineHeight: 28, textAlign: 'center' },
  side: { width: SIDE },
  group: { gap: Space.xs },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Nocturne.edge, marginHorizontal: Space.l, marginVertical: Space.l },
  carded: { marginHorizontal: Space.l },
  label: { ...Type.caption, color: Nocturne.text3, marginLeft: Space.l, marginBottom: Space.s },
  note: { ...Type.caption, color: Nocturne.text3, marginLeft: TITLE_AT, marginRight: Space.l, marginTop: Space.xs },
  fold: { minHeight: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Space.l },
  foldText: { flex: 1, color: Nocturne.text, fontSize: 17 },
});
