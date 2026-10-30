import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { SymbolView } from 'expo-symbols';

import { PANEL_RADIUS } from '@/components/app-tabs';
import { PrimaryButton, TextButton } from '@/components/buttons';
import { sym } from '@/components/grouped-list';
import { CountText } from '@/components/count-text';
import { Track } from '@/components/meter';
import { Text } from '@/components/text';
import * as haptic from '@/lib/haptics';
import { pushupsLine, spokenRep } from '@/lib/wake/lines';
import { TURN_DEG, type PhoneHint, type PhoneTurn } from '@/lib/wake/phone-hint';
import { PUSHUPS, repProgress, type PoseFrame, type PushupsSession } from '@/lib/wake/pushups';
import { getRepsDone } from '@/lib/wake/pushups-done';
import { CTA_HEIGHT, Gap, Nocturne, Space, Type } from '@/theme';

import { hush, isPoseCameraAvailable, PoseCameraView, say, type PoseCameraError } from '../../../modules/pose-camera';
import { LocBubble } from '../home/loc-bubble';
import { LOC_VIEW, type LocMood } from '../home/loc-rig';
import LocStage from '../home/loc-stage';
import { FAST_TIMEOUT_MS, PREVIEW_PHONES, type PushupsPreview } from '../dev/wake-lab/pushups-preview';
import { useCameraAccess, type CameraAccess } from './camera-access';
import { DemoCamera } from './demo-camera';
import { Body, Voice } from './parts';
import { PoseOverlay } from './pose-overlay';
import { usePhone } from './use-phone-hint';
import { usePushups } from './use-pushups';

/** Loc's width in points, both ways up; his canvas is the screen's width, as on Home. */
const LOC_PT = 116;
/** About how long he takes to run in under the covers and pop up (loc-rig ARRIVE), before his first line. */
const ARRIVE_MS = 1_300;
/** His bubble's tail, as a share of his canvas's height up from its bottom: just over his head. */
const BUBBLE_AT = 0.78;
/** The black ledge he stands on, holding the meter, above the home bar; sideways, thinner. */
const LEDGE = Space.l + 6;
const LEDGE_SIDE = Space.l + 6 + Space.m;
/** The ledge's extra room for Keep going after a timeout. */
const AGAIN = CTA_HEIGHT + Space.l;
/** A beat on the last rep before the apps wake, so the count and his line land. */
const MET_BEAT_MS = 1_600;
/** Out of sight at least this long before he says "Go on." again on finding you. */
const GO_AGAIN_MS = 8_000;

/**
 * Push-ups (GAME_PLAN, "Wake-up methods"; camera version 2026-10-10): stand the phone on the
 * floor side-on, and the front camera counts. This page explains the setup and asks for the
 * camera; Start opens the camera full screen (`PushupsCamera`). "Walk N steps instead" is always
 * on offer, like every method.
 */
export function PushupsView({
  goal,
  target,
  onMet,
  onSteps,
  footer,
  preview,
  morning,
}: {
  /** The step goal, for "walk instead". */
  goal: number;
  /** The real morning's key, so its push-up total is kept across closing the camera. None in the wake lab. */
  morning?: string;
  /** The wake lab only (You → Developer → Push-up preview): forced states and a pretend body. Never the real morning. */
  preview?: PushupsPreview;
  /** Push-ups to do: the routine's `pushupGoal`. */
  target: number;
  onMet: () => void;
  onSteps: () => void;
  footer?: ReactNode;
}) {
  const camera = useCameraAccess();
  // The preview's "Continue" grants pretend access.
  const [previewGranted, setPreviewGranted] = useState(false);
  const setup = preview?.setup ?? 'real';
  // A preview's drawn body needs neither the camera nor the Swift module, so it shows on a build without them.
  const drawn = !!preview && (preview.scene !== 'camera' || !!fails(preview));
  const access: CameraAccess =
    setup === 'denied' ? 'denied' : setup === 'ask' && !previewGranted ? 'ask' : drawn ? 'granted' : camera.access;
  const request =
    setup === 'denied'
      ? async () => false
      : setup === 'ask' && !previewGranted
        ? async () => {
            setPreviewGranted(true);
            return true;
          }
        : camera.request;
  const available = (isPoseCameraAvailable || drawn) && setup !== 'oldBuild';
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState<PoseCameraError | null>(null);
  const instead = `Walk ${goal} steps instead`;
  // Read each render: closing the camera re-renders this page with the total so far.
  const done = getRepsDone(morning);
  // Screen Time or a profile keeps the camera off; Settings can't change that, so only walking is offered.
  const restricted = access === 'restricted' || failed === 'restricted';

  if (!available || restricted || failed === 'noCamera' || failed === 'model') {
    const why = !available
      ? 'This build of the app can’t count push-ups yet. It needs the next update.'
      : restricted
        ? 'The camera is restricted on this phone, by Screen Time or a profile.'
        : failed === 'model'
          ? 'The pose model didn’t load. Check the connection and try again.'
          : 'The front camera wouldn’t start.';
    return (
      <View style={styles.page}>
        <View style={styles.top}>
          <Voice text="I can't see you on this phone." />
          <Body>{`${why} Walk ${goal} steps instead; they count the same.`}</Body>
        </View>
        <View style={styles.flex} />
        <View style={styles.bottom}>
          {failed && !restricted ? <TextButton label="Try again" onPress={() => setFailed(null)} /> : null}
          <PrimaryButton label={instead} onPress={onSteps} />
          {footer}
        </View>
      </View>
    );
  }

  // The camera said no but access reads as granted again (back from Settings): Start, and it's tried again.
  const denied = access === 'denied' || (failed === 'denied' && access !== 'granted');
  const begin = async () => {
    haptic.tap();
    if (access !== 'granted' && !(await request())) return;
    setFailed(null);
    setOpen(true);
  };

  return (
    <View style={styles.page}>
      <View style={styles.top}>
        <Voice text={denied ? 'I need the camera for this.' : pushupsLine('idle', 0, target, null)} />
        <Body>
          {denied
            ? 'Camera access is off for Locturne, so I can’t count push-ups. Turn it on in Settings.'
            : `Turn me sideways and lean me against something on the floor, two steps away and side-on to you, so I can see all of you. Then ${
                done > 0 ? `${Math.max(0, target - done)} more push-ups; you've done ${done}` : `${target} push-ups`
              }. I count out loud.`}
        </Body>
      </View>

      <View style={styles.flex} />
      {denied ? null : <SetupSketch />}
      <View style={styles.flex} />

      <View style={styles.bottom}>
        {denied ? null : <Text style={styles.fine}>The camera looks for your body on this phone. Nothing is recorded.</Text>}
        <PrimaryButton
          // HIG: the button before Apple's prompt says Continue, never "Allow" (App Review 5.1.1(iv)).
          label={denied ? 'Open Settings' : access === 'ask' ? 'Continue' : 'Start'}
          onPress={begin}
          disabled={access === 'checking'}
        />
        <TextButton label={instead} onPress={onSteps} />
        {footer}
      </View>

      {open ? (
        <PushupsCamera
          target={target}
          morning={morning}
          preview={preview}
          onMet={() => {
            // Closed either way: if the morning ended meanwhile (bedtime came round), nothing
            // replaces this page, and the camera mustn't stay up on a finished set.
            setOpen(false);
            onMet();
          }}
          onClose={() => setOpen(false)}
          onError={(reason) => {
            setOpen(false);
            setFailed(reason);
          }}
        />
      ) : null}
    </View>
  );
}

/** The setup at a glance: the phone leaning on the floor, you side-on in a plank in front of it. Left out on short screens, where Start comes first. */
function SetupSketch() {
  const { height } = useWindowDimensions();
  if (height < 700) return null;
  const ink = Nocturne.text2;
  const faint = Nocturne.text3;
  return (
    <View style={styles.sketch} accessible accessibilityLabel="The phone on its side, leaning on the floor, two steps from you, side-on.">
      <Svg width={260} height={110} viewBox="0 0 260 110">
        <Line x1={8} y1={98} x2={252} y2={98} stroke={faint} strokeWidth={1.5} strokeLinecap="round" />
        {/* The phone on its long edge, leaning back a little, camera facing you. */}
        <Rect x={8} y={72} width={48} height={24} rx={5} stroke={ink} strokeWidth={2.5} fill="none" transform="rotate(-8 32 96)" />
        <Circle cx={51} cy={80} r={1.8} fill={ink} />
        {/* You, in a plank, head toward the phone. */}
        <Circle cx={96} cy={60} r={7.5} stroke={ink} strokeWidth={2.5} fill="none" />
        <Line x1={106} y1={66} x2={232} y2={92} stroke={ink} strokeWidth={2.5} strokeLinecap="round" />
        <Line x1={108} y1={67} x2={108} y2={97} stroke={ink} strokeWidth={2.5} strokeLinecap="round" />
        <Line x1={232} y1={92} x2={238} y2={97} stroke={ink} strokeWidth={2.5} strokeLinecap="round" />
      </Svg>
    </View>
  );
}

/**
 * A neutral dark fade, so white type reads over the picture. Black only, never tinted. Its width in
 * points: "100%" inside the turned layer came out the upright screen's width, so on its side each
 * fade stopped halfway along with a hard edge (user 2026-10-29).
 */
function Scrim({ width, height, flip }: { width: number; height: number; flip?: boolean }) {
  const id = flip ? 'scrimUp' : 'scrimDown';
  return (
    <Svg width={width} height={height} style={flip ? styles.scrimBottom : styles.scrimTop} pointerEvents="none">
      <Defs>
        <LinearGradient id={id} x1="0" y1={flip ? '1' : '0'} x2="0" y2={flip ? '0' : '1'}>
          <Stop offset="0" stopColor="#000000" stopOpacity={0.6} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect width={width} height={height} fill={`url(#${id})`} />
    </Svg>
  );
}

const PHONE_LINES: Record<PhoneHint, string> = {
  flat: 'Stand me up. I can only see the ceiling.',
  upsideDown: 'Other way up. Please.',
  tall: 'On my side. I can’t fit all of you in.',
};

/** Which way the phone stands: the preview's pretend one, or the accelerometer's. Upright until it knows. */
function useTurn(
  live: boolean,
  finding: boolean,
  preview?: PushupsPreview,
): { turn: PhoneTurn; hint: PhoneHint | null; upright: boolean } {
  const sensed = usePhone(live);
  const forced = preview && preview.phone !== 'sensor' ? PREVIEW_PHONES[preview.phone] : null;
  const turn = forced?.turn ?? sensed.turn ?? 'portrait';
  const hint = forced ? (live ? forced.hint : null) : sensed.hint;
  // Upright counts too: the nudge to turn it only while he's still looking for you. `upright` is the
  // accelerometer's alone, never a preview's pretend turn: the camera learns its angle from it.
  return { turn, hint: hint === 'tall' && !finding ? null : hint, upright: sensed.turn === 'portrait' && sensed.hint !== 'flat' };
}

/**
 * The wake lab's numbers, for tuning on a phone (docs/PUSHUP_TESTS.md): what the rules see right
 * now against what a rep needs. The thresholds are JS, so they can be changed by update, not build.
 */
function TuningReadout({ session, pose }: { session: PushupsSession | null; pose: PoseFrame | null }) {
  if (!session) return null;
  const n = (v: number | null, digits = 0) => (v === null ? '–' : v.toFixed(digits));
  const lines = [
    `${session.status}${session.hint ? ` / ${session.hint}` : ''}${session.miss ? ` · miss ${session.miss}` : ''}`,
    `elbow ${n(session.elbow)}°  (down ≤${PUSHUPS.downDeg}, up ≥${PUSHUPS.upDeg})`,
    `drop ${n(session.drop, 2)}  (need ${PUSHUPS.minDrop}, or ${PUSHUPS.deepDrop} held)  low frames ${session.lowFrames}`,
  ];
  // What the iPhone handed over: the picture's size, how Vision read it, and how sure it was.
  const info = pose?.info;
  if (info) lines.push(`${info.w}×${info.h} ${info.upright ? 'stood up' : 'old table'} · read ${info.read} · seen ${info.score.toFixed(2)}/4`);
  return (
    <View style={styles.tuning} pointerEvents="none">
      {lines.map((l) => (
        <Text key={l} style={styles.tuningText}>
          {l}
        </Text>
      ))}
    </View>
  );
}

/** The preview's broken camera, if it asks for one. */
const fails = (p: PushupsPreview) => (p.setup === 'noCamera' || p.setup === 'model' ? p.setup : undefined);

const moodFor = (s: PushupsSession | null): LocMood => {
  if (!s || s.status === 'finding') return 'groggy';
  if (s.status === 'met') return 'smug';
  if (s.miss) return 'betrayed';
  return 'awake';
};

/** The ledge floods up over everything, then drains back down into the turned layout. */
const FLOOD_UP = { duration: 480, easing: Easing.bezier(0.45, 0, 0.55, 1) };
const FLOOD_DOWN = { duration: 900, easing: Easing.bezier(0.22, 1, 0.36, 1) };
/** A beat fully black while the new layout settles under it. */
const FLOOD_HOLD_MS = 140;

/**
 * Turning with the phone (user 2026-10-29: tilting the layout round looked glitchy). The black
 * ledge floods up over the picture, the screen swaps to the turned layout under it, and the black
 * drains back down to the new ledge, the picture and Loc coming back as it goes. `flood` is 0 (the
 * ledge where it sits) to 1 (black to the top); `shown` is the turn laid out, which trails `turn`
 * while it's black. Transform and opacity only (the iOS fast path). Reduce Motion: quicker, same shape.
 */
function useFlood(turn: PhoneTurn) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(turn);
  const flood = useSharedValue(0);

  useEffect(() => {
    if (turn === shown) return;
    const swap = (finished?: boolean) => {
      'worklet';
      if (finished) scheduleOnRN(setShown, turn);
    };
    flood.set(withTiming(1, reduced ? { duration: 120 } : FLOOD_UP, swap));
  }, [turn, shown, reduced, flood]);

  useEffect(() => {
    flood.set(withDelay(FLOOD_HOLD_MS, withTiming(0, reduced ? { duration: 160 } : FLOOD_DOWN)));
  }, [shown, reduced, flood]);

  return { shown, flood };
}

/**
 * The ledge's top corners: the black curves up into the picture's rounded bottom corners, as
 * Home's strip meets its panel (PANEL_RADIUS); Loc's covers bend up the same curve.
 */
function Corners({ width }: { width: number }) {
  const R = PANEL_RADIUS;
  return (
    <Svg width={width} height={R} pointerEvents="none">
      <Path d={`M0 0 L0 ${R} L${R} ${R} A${R} ${R} 0 0 1 0 0 Z`} fill="#000000" />
      <Path d={`M${width} 0 L${width} ${R} L${width - R} ${R} A${R} ${R} 0 0 0 ${width} 0 Z`} fill="#000000" />
    </Svg>
  );
}

/**
 * The set itself, full screen: the front camera, you traced in white over it, the count big at
 * the top, and Loc, black as on Home, standing on a black ledge at the bottom that fills as the
 * reps come, saying what he thinks of it. Nothing else to read: the phone is on the floor and
 * you're down there, so he says the count out loud too. Walking instead is on Home, not here.
 */
export function PushupsCamera({
  target,
  onMet,
  onClose,
  onError,
  preview,
  morning,
}: {
  target: number;
  morning?: string;
  preview?: PushupsPreview;
  onMet: () => void;
  onClose: () => void;
  onError: (reason: PoseCameraError) => void;
}) {
  const safe = useSafeAreaInsets();
  const screen = useWindowDimensions();
  const { session, pose, start, cancel, onPose } = usePushups(target, preview?.fastTimeout ? FAST_TIMEOUT_MS : undefined, morning);

  const status = session?.status ?? 'finding';
  const timedOut = status === 'timedOut';
  // The phone on its side (the main way) or upright. The app stays portrait; this screen turns its
  // own contents to stand up with the phone, as the Camera app turns its icons, and the camera is
  // told the same, so the joints come back in the turned screen's points (PoseCameraModule.swift).
  const { turn: sensed, hint: phone, upright } = useTurn(status !== 'met' && !timedOut, status === 'finding', preview);
  const { shown: turn, flood } = useFlood(sensed);
  const side = turn !== 'portrait';
  const width = side ? screen.height : screen.width;
  const height = side ? screen.width : screen.height;
  // The notch and the home bar end up at the turned screen's ends.
  const insets = {
    top: side ? Space.l : safe.top,
    bottom: side ? Space.l : safe.bottom,
    left: turn === 'landscapeLeft' ? safe.top : turn === 'landscapeRight' ? safe.bottom : 0,
    right: turn === 'landscapeLeft' ? safe.bottom : turn === 'landscapeRight' ? safe.top : 0,
  };
  // Smaller on an SE, and sideways, so the count leaves room for you in the picture.
  const short = height < 700;
  const reps = session?.reps ?? 0;
  const met = status === 'met';
  const counting = status === 'counting' || met;
  // His bubble waits for him: he runs in under the covers first.
  const [arrived, setArrived] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setArrived(true), ARRIVE_MS);
    return () => clearTimeout(t);
  }, []);
  const metNow = useRef(met);
  useEffect(() => {
    metNow.current = met;
  }, [met]);

  // Start as the camera opens; the session ends with the screen. A finished set's last line
  // ("10. Fine. I'm up.") is left to finish rather than cut off.
  useEffect(() => {
    start();
    return () => {
      cancel();
      if (!metNow.current) hush();
    };
  }, [start, cancel]);

  // VoiceOver reads the count itself; his voice on top of it would talk over it.
  const silent = useRef(false);
  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled()
      .then((on) => (silent.current = on))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', (on) => (silent.current = on));
    return () => sub.remove();
  }, []);

  // Each rep: the count out loud, and a tap. Not the morning's saved total the session opens on.
  const said = useRef<number | null>(null);
  const live = session !== null;
  useEffect(() => {
    if (!live) return;
    if (said.current !== null && reps > said.current) {
      haptic.tick();
      if (!silent.current) say(spokenRep(reps, target));
      AccessibilityInfo.announceForAccessibility(`${reps} of ${target}`);
    }
    said.current = reps;
  }, [live, reps, target]);

  // Found you: say go, out loud, since you may already be down there. Once, and again only after
  // you've been out of sight a good while: when the camera keeps losing and finding you, it said
  // "Go." every time it found you again (user, 2026-10-14).
  const seen = status === 'counting';
  const lostAt = useRef<number | null>(null);
  const saidGo = useRef(false);
  useEffect(() => {
    if (!seen) {
      if (saidGo.current && lostAt.current === null) lostAt.current = Date.now();
      return;
    }
    const away = lostAt.current === null ? 0 : Date.now() - lostAt.current;
    lostAt.current = null;
    if (silent.current || (saidGo.current && away < GO_AGAIN_MS)) return;
    say(saidGo.current || (said.current ?? 0) > 0 ? 'Go on.' : 'Go.');
    saidGo.current = true;
  }, [seen]);

  // Read when the beat ends, so a parent re-rendering meanwhile doesn't restart it.
  const onMetNow = useRef(onMet);
  useEffect(() => {
    onMetNow.current = onMet;
  }, [onMet]);
  // Once: after the beat, or straight away if the screen is closed during it (the reps are done).
  const finished = useRef(false);
  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    onMetNow.current();
  };
  const finishNow = useRef(finish);
  useEffect(() => {
    finishNow.current = finish;
  });
  useEffect(() => {
    if (!met) return;
    const t = setTimeout(() => finishNow.current(), MET_BEAT_MS);
    return () => clearTimeout(t);
  }, [met]);
  const close = () => (met ? finish() : onClose());

  // The phone lying flat, upside down or upright: say that first, it's why he can't see (all of) you.
  // His bubble is the only words on the picture: the setup is on Home, before Start.
  const line = phone ? PHONE_LINES[phone] : pushupsLine(status, reps, target, session?.miss ?? null, session?.hint ?? null);
  const locH = Math.round((LOC_PT * LOC_VIEW.height) / LOC_VIEW.width);
  // The same object between renders: the camera re-renders this about 30 times a second, and
  // Loc's DOM view would otherwise be handed new props every time. The whole width, as on Home,
  // so the covers he runs in under bend up the ledge's corners at the screen's edges.
  const dom = useMemo(
    () => ({
      style: { width, height: locH, backgroundColor: 'transparent' },
      scrollEnabled: false,
      bounces: false,
      contentInsetAdjustmentBehavior: 'never' as const,
    }),
    [width, locH],
  );
  const ledge = (side ? LEDGE_SIDE : LEDGE + Math.max(insets.bottom, Space.l)) + (timedOut ? AGAIN : 0);
  const ends = { paddingLeft: Gap.gutter + insets.left, paddingRight: Gap.gutter + insets.right };
  // Loc in the bottom-left corner, out of the way of you, his bubble over him reading from the
  // same edge (user 2026-10-29: in the middle, he and his lines covered the person).
  const edge = Gap.gutter + insets.left;
  const offset = (edge + LOC_PT / 2) / width - 0.5;
  // The black: sits as the ledge, and floods up to the top while the screen turns.
  const ground = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - flood.get()) * (height - ledge) }] }));
  // The meter goes first as the black comes up, and comes back last.
  const ledgeIn = useAnimatedStyle(() => ({ opacity: Math.max(0, 1 - flood.get() * 3) }));
  const drawn = !!preview && (preview.scene !== 'camera' || !!fails(preview));

  return (
    <Modal visible animationType="fade" presentationStyle="fullScreen" onRequestClose={close} statusBarTranslucent>
      <View style={styles.camera}>
        {drawn ? null : (
          <PoseCameraView style={StyleSheet.absoluteFill} active={!met && !timedOut} turn={turn} upright={upright} onPose={onPose} onCameraError={onError} />
        )}
        {/* Everything over the picture, turned to stand up with the phone. */}
        <View
          style={[
            styles.turned,
            { width, height, left: (screen.width - width) / 2, top: (screen.height - height) / 2 },
            side && { transform: [{ rotate: `${TURN_DEG[turn]}deg` }] },
          ]}
        >
          {drawn ? (
            <DemoCamera
              style={StyleSheet.absoluteFill}
              scene={preview!.scene === 'camera' ? 'nobody' : preview!.scene}
              fail={fails(preview!)}
              active={!met && !timedOut}
              onPose={onPose}
              onCameraError={onError}
              tagTop={insets.top + (side ? 96 : 180)}
            />
          ) : null}
          <PoseOverlay pose={pose} counting={counting} />
          <Scrim width={width} height={insets.top + (side ? 120 : 190)} />
          <Scrim width={width} height={ledge + Space.xxxl} flip />

          <View
            style={[styles.reading, { top: insets.top + (side ? 0 : short ? Space.l : Space.xxl) }]}
            accessible
            accessibilityLabel={`${reps} of ${target} push-ups.`}
          >
            {/* Rolls each rep, as Home's and the onboarding's counts do. */}
            <View style={!counting && styles.countIdle}>
              <CountText value={String(reps)} size={short || side ? 68 : 96} />
            </View>
          </View>

          <Pressable
            onPress={close}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={met ? 'Done' : 'Stop'}
            style={({ pressed }) => [styles.close, { top: insets.top + Space.s, right: Gap.gutter + insets.right }, pressed && styles.pressed]}
          >
            <SymbolView name={sym('xmark', 'close')} size={15} weight="bold" tintColor={Nocturne.text} />
          </Pressable>

          {preview?.readout ? <TuningReadout session={session} pose={pose} /> : null}

          <View style={[styles.loc, { height: locH, bottom: ledge - 1 }]} pointerEvents="none">
            <LocStage mood={moodFor(session)} share={LOC_PT / width} offset={offset} present dom={dom} />
          </View>
          {arrived ? (
            <View style={[styles.speech, { left: edge, bottom: ledge + Math.round(locH * BUBBLE_AT) }]} pointerEvents="box-none">
              <LocBubble key={line} line={line.replace(/\*/g, '')} onDismiss={() => {}} smoked />
            </View>
          ) : null}

          <Animated.View style={[styles.ground, { height: height + PANEL_RADIUS }, ground]} pointerEvents="none">
            <Corners width={width} />
            <View style={styles.black} />
          </Animated.View>
          <Animated.View style={[styles.ledge, ends, { height: ledge, paddingBottom: side ? Space.m : Math.max(insets.bottom, Space.l) }, ledgeIn]}>
            <Track progress={session ? repProgress(session) : 0} />
            {timedOut ? (
              // The reps done stay: a long set with a break in it carries on from where it was.
              <Animated.View entering={FadeIn.duration(250)} style={side && styles.againSide}>
                <PrimaryButton label={reps > 0 ? 'Keep going' : 'Start again'} onPress={start} />
              </Animated.View>
            ) : null}
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, gap: Space.l },
  flex: { flex: 1, minHeight: Space.xl },
  top: { gap: Space.l, marginTop: Space.xxl },
  bottom: { gap: Space.l, paddingBottom: Space.s },
  fine: { ...Type.caption, color: Nocturne.text3, textAlign: 'center' },
  sketch: { alignItems: 'center' },

  camera: { flex: 1, backgroundColor: '#000000' },
  turned: { position: 'absolute', overflow: 'hidden' },
  scrimTop: { position: 'absolute', top: 0, left: 0 },
  scrimBottom: { position: 'absolute', bottom: 0, left: 0 },
  close: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  pressed: { opacity: 0.6 },
  reading: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  countIdle: { opacity: 0.45 },
  loc: { position: 'absolute', left: 0, right: 0 },
  tuning: { position: 'absolute', top: '30%', left: Gap.gutter, right: Gap.gutter, padding: Space.s, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.6)' },
  tuningText: { ...Type.caption, color: Nocturne.text, fontVariant: ['tabular-nums'] },
  speech: { position: 'absolute', alignItems: 'flex-start' },
  ground: { position: 'absolute', left: 0, right: 0, top: -PANEL_RADIUS },
  black: { flex: 1, backgroundColor: '#000000' },
  ledge: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: Space.l, gap: Space.l },
  againSide: { alignSelf: 'flex-end', minWidth: 220 },
});
