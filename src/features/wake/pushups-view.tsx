import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Line, LinearGradient, Rect, Stop } from 'react-native-svg';
import { SymbolView } from 'expo-symbols';

import { PrimaryButton, TextButton } from '@/components/buttons';
import { sym } from '@/components/grouped-list';
import { Track } from '@/components/meter';
import { Text } from '@/components/text';
import * as haptic from '@/lib/haptics';
import { pushupsLine, spokenRep } from '@/lib/wake/lines';
import type { PhoneHint } from '@/lib/wake/phone-hint';
import { PUSHUPS, repProgress, type PushupsSession } from '@/lib/wake/pushups';
import { Gap, Nocturne, NUMBER_FONT, Space, Type } from '@/theme';

import { hush, isPoseCameraAvailable, PoseCameraView, say, type PoseCameraError } from '../../../modules/pose-camera';
import { LocBubble } from '../home/loc-bubble';
import { LOC_VIEW, type LocMood } from '../home/loc-rig';
import LocStage from '../home/loc-stage';
import { FAST_TIMEOUT_MS, type PushupsPreview } from '../dev/wake-lab/pushups-preview';
import { useCameraAccess, type CameraAccess } from './camera-access';
import { DemoCamera } from './demo-camera';
import { Body, Voice } from './parts';
import { PoseOverlay } from './pose-overlay';
import { usePhoneHint } from './use-phone-hint';
import { usePushups } from './use-pushups';

/** Loc's width as a share of the screen, as on Home (loc.tsx). */
const LOC_SHARE = 0.27;
/** His bubble's tail, as a share of his canvas's height up from its bottom: just over his head. */
const BUBBLE_AT = 0.78;
/** The black strip under him: the meter and the buttons. */
const STRIP = 132;
/** A beat on the last rep before the apps wake, so the count and his line land. */
const MET_BEAT_MS = 1_600;

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
}: {
  /** The step goal, for "walk instead". */
  goal: number;
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
  const access: CameraAccess = setup === 'denied' ? 'denied' : setup === 'ask' && !previewGranted ? 'ask' : camera.access;
  const request =
    setup === 'denied'
      ? async () => false
      : setup === 'ask' && !previewGranted
        ? async () => {
            setPreviewGranted(true);
            return true;
          }
        : camera.request;
  const available = isPoseCameraAvailable && setup !== 'oldBuild';
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState<PoseCameraError | null>(null);
  const instead = `Walk ${goal} steps instead`;
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
            : `Lean me against something on the floor, two steps away and side-on to you, so I can see all of you. Then ${target} push-ups. I count out loud.`}
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
          instead={instead}
          preview={preview}
          onMet={() => {
            // Closed either way: if the morning ended meanwhile (bedtime came round), nothing
            // replaces this page, and the camera mustn't stay up on a finished set.
            setOpen(false);
            onMet();
          }}
          onSteps={() => {
            setOpen(false);
            onSteps();
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
    <View style={styles.sketch} accessible accessibilityLabel="The phone leaning upright on the floor, two steps from you, side-on.">
      <Svg width={260} height={110} viewBox="0 0 260 110">
        <Line x1={8} y1={98} x2={252} y2={98} stroke={faint} strokeWidth={1.5} strokeLinecap="round" />
        {/* The phone, leaning back a little, camera facing you. */}
        <Rect x={20} y={46} width={24} height={50} rx={5} stroke={ink} strokeWidth={2.5} fill="none" transform="rotate(-8 32 96)" />
        <Circle cx={36.5} cy={52} r={1.8} fill={ink} />
        {/* You, in a plank, head toward the phone. */}
        <Circle cx={96} cy={60} r={7.5} stroke={ink} strokeWidth={2.5} fill="none" />
        <Line x1={106} y1={66} x2={232} y2={92} stroke={ink} strokeWidth={2.5} strokeLinecap="round" />
        <Line x1={108} y1={67} x2={108} y2={97} stroke={ink} strokeWidth={2.5} strokeLinecap="round" />
        <Line x1={232} y1={92} x2={238} y2={97} stroke={ink} strokeWidth={2.5} strokeLinecap="round" />
      </Svg>
    </View>
  );
}

/** A neutral dark fade, so white type reads over the picture. Black only, never tinted. */
function Scrim({ height, flip }: { height: number; flip?: boolean }) {
  const id = flip ? 'scrimUp' : 'scrimDown';
  return (
    <Svg width="100%" height={height} style={flip ? styles.scrimBottom : styles.scrimTop} pointerEvents="none">
      <Defs>
        <LinearGradient id={id} x1="0" y1={flip ? '1' : '0'} x2="0" y2={flip ? '0' : '1'}>
          <Stop offset="0" stopColor="#000000" stopOpacity={0.7} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

const PHONE_LINES: Record<PhoneHint, string> = {
  flat: 'Stand me up. I can only see the ceiling.',
  sideways: 'Stand me up tall, not on my side.',
  upsideDown: 'Other way up. Please.',
};

const PHONE_PILLS: Record<PhoneHint, string> = {
  flat: 'Lean me upright against something, screen facing you.',
  sideways: 'Turn me upright, the tall way.',
  upsideDown: 'Turn me the right way up.',
};

/**
 * The wake lab's numbers, for tuning on a phone (docs/PUSHUP_TESTS.md): what the rules see right
 * now against what a rep needs. The thresholds are JS, so they can be changed by update, not build.
 */
function TuningReadout({ session }: { session: PushupsSession | null }) {
  if (!session) return null;
  const n = (v: number | null, digits = 0) => (v === null ? '–' : v.toFixed(digits));
  const lines = [
    `${session.status}${session.hint ? ` / ${session.hint}` : ''}${session.miss ? ` · miss ${session.miss}` : ''}`,
    `elbow ${n(session.elbow)}°  (down ≤${PUSHUPS.downDeg}, up ≥${PUSHUPS.upDeg})`,
    `drop ${n(session.drop, 2)}  (need ${PUSHUPS.minDrop})  low frames ${session.lowFrames}`,
  ];
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

/**
 * The set itself, full screen: the front camera, you traced in white over it, the count big at
 * the top, and Loc on the black strip at the bottom, as on Home, saying what he thinks of it.
 * The phone is on the floor and you're looking down, so he says the count out loud too.
 */
function PushupsCamera({
  target,
  instead,
  onMet,
  onSteps,
  onClose,
  onError,
  preview,
}: {
  target: number;
  instead: string;
  preview?: PushupsPreview;
  onMet: () => void;
  onSteps: () => void;
  onClose: () => void;
  onError: (reason: PoseCameraError) => void;
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { session, pose, start, cancel, onPose } = usePushups(target, preview?.fastTimeout ? FAST_TIMEOUT_MS : undefined);
  const again = () => start(true);
  // Smaller on an SE, so the count leaves room for you in the picture.
  const short = height < 700;
  const [quiet, setQuiet] = useState(false);

  const status = session?.status ?? 'finding';
  const reps = session?.reps ?? 0;
  const met = status === 'met';
  const counting = status === 'counting' || met;
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
  const [screenReader, setScreenReader] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(setScreenReader).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReader);
    return () => sub.remove();
  }, []);
  const silent = useRef(false);
  useEffect(() => {
    silent.current = quiet || screenReader;
  }, [quiet, screenReader]);

  // Each rep: the count out loud, and a tap.
  const said = useRef(0);
  useEffect(() => {
    if (reps > said.current) {
      haptic.tick();
      if (!silent.current) say(spokenRep(reps, target));
      AccessibilityInfo.announceForAccessibility(`${reps} of ${target}`);
    }
    said.current = reps;
  }, [reps, target]);

  // Found you: say go, out loud, since you may already be down there.
  const seen = status === 'counting';
  useEffect(() => {
    if (!seen || silent.current) return;
    say(said.current > 0 ? 'Go on.' : 'Go.');
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

  const timedOut = status === 'timedOut';
  // The phone lying flat or on its side: say that first, it's why he can't see you.
  const sensed = usePhoneHint(!met && !timedOut);
  const phone = preview && preview.phone !== 'upright' ? (met || timedOut ? null : preview.phone) : sensed;
  const line = phone ? PHONE_LINES[phone] : pushupsLine(status, reps, target, session?.miss ?? null, session?.hint ?? null);
  const locH = Math.round((width * LOC_SHARE * LOC_VIEW.height) / LOC_VIEW.width);
  // The same object between renders: the camera re-renders this about 30 times a second, and Loc's
  // DOM view would otherwise be handed new props every time.
  const dom = useMemo(
    () => ({
      style: { width, height: locH, backgroundColor: 'transparent' },
      scrollEnabled: false,
      bounces: false,
      contentInsetAdjustmentBehavior: 'never' as const,
    }),
    [width, locH],
  );
  const strip = STRIP + Math.max(insets.bottom, Space.l);
  const pill = phone
    ? PHONE_PILLS[phone]
    : status === 'finding'
      ? session?.hint === 'notPlank'
        ? 'Get into a plank, side-on to me.'
        : 'Lights on. Two steps back, side-on, all of you in the picture.'
      : null;

  return (
    <Modal visible animationType="fade" presentationStyle="fullScreen" onRequestClose={close} statusBarTranslucent>
      <View style={styles.camera}>
        {preview && (preview.scene !== 'camera' || fails(preview)) ? (
          <DemoCamera
            style={StyleSheet.absoluteFill}
            scene={preview.scene === 'camera' ? 'nobody' : preview.scene}
            fail={fails(preview)}
            active={!met && !timedOut}
            onPose={onPose}
            onCameraError={onError}
          />
        ) : (
          <PoseCameraView style={StyleSheet.absoluteFill} active={!met && !timedOut} onPose={onPose} onCameraError={onError} />
        )}
        <PoseOverlay pose={pose} counting={counting} />
        <Scrim height={insets.top + 200} />
        <Scrim height={strip + locH + 80} flip />

        <View style={[styles.bar, { paddingTop: insets.top }]}>
          <Text style={Type.label}>Push-ups</Text>
          <Pressable onPress={close} hitSlop={12} accessibilityRole="button" accessibilityLabel={met ? 'Done' : 'Stop'}>
            <SymbolView name={sym('xmark', 'close')} size={20} weight="semibold" tintColor={Nocturne.text} />
          </Pressable>
        </View>

        <View style={[styles.reading, short && styles.readingShort]} accessible accessibilityLabel={`${reps} of ${target} push-ups.`}>
          <Text style={[styles.count, short && styles.countShort, !counting && styles.countIdle]} maxFontSizeMultiplier={1.2}>
            {reps}
          </Text>
          <Text style={styles.of}>{`of ${target} push-ups`}</Text>
        </View>

        {preview?.readout ? <TuningReadout session={session} /> : null}

        {pill ? (
          <Animated.View key={pill} entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)} style={styles.hint} pointerEvents="none">
            <Text style={styles.hintText}>{pill}</Text>
          </Animated.View>
        ) : null}

        <View style={[styles.loc, { height: locH, bottom: strip - 1 }]} pointerEvents="none">
          <LocStage
            mood={moodFor(session)}
            share={LOC_SHARE}
            present
            ink={Nocturne.text3}
            dom={dom}
          />
        </View>
        <View style={[styles.speech, { bottom: strip + Math.round(locH * BUBBLE_AT) }]} pointerEvents="box-none">
          <LocBubble key={line} line={line.replace(/\*/g, '')} onDismiss={() => {}} />
        </View>

        <View style={[styles.strip, { height: strip, paddingBottom: Math.max(insets.bottom, Space.l) }]}>
          <Track progress={session ? repProgress(session) : 0} />
          <View style={styles.actions}>
            {timedOut ? (
              // The reps done stay: a long set with a break in it carries on from where it was.
              <PrimaryButton label="Start again" onPress={again} />
            ) : (
              <TextButton label={quiet ? 'Count out loud' : 'Count quietly'} onPress={() => setQuiet((q) => !q)} />
            )}
            {met ? null : <TextButton label={instead} onPress={onSteps} />}
          </View>
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
  scrimTop: { position: 'absolute', top: 0, left: 0 },
  scrimBottom: { position: 'absolute', bottom: 0, left: 0 },
  bar: {
    position: 'absolute',
    top: 0,
    left: Gap.gutter,
    right: Gap.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  reading: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', marginTop: 96 },
  count: { ...NUMBER_FONT, color: Nocturne.text, fontSize: 112, lineHeight: 120, fontVariant: ['tabular-nums'] },
  countShort: { fontSize: 76, lineHeight: 84 },
  readingShort: { marginTop: 64 },
  countIdle: { opacity: 0.45 },
  of: { ...Type.body, color: Nocturne.text, fontWeight: '600' },
  hint: { position: 'absolute', top: '42%', left: Gap.gutter, right: Gap.gutter, alignItems: 'center' },
  hintText: {
    ...Type.body,
    color: Nocturne.text,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: Space.l,
    paddingVertical: Space.s,
    borderRadius: 999,
    overflow: 'hidden',
  },
  loc: { position: 'absolute', left: 0, right: 0 },
  tuning: { position: 'absolute', top: '30%', left: Gap.gutter, right: Gap.gutter, padding: Space.s, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.6)' },
  tuningText: { ...Type.caption, color: Nocturne.text, fontVariant: ['tabular-nums'] },
  speech: { position: 'absolute', left: Space.l, right: Space.l, alignItems: 'center' },
  strip: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    paddingHorizontal: Gap.gutter,
    paddingTop: Space.xl,
    gap: Space.l,
  },
  actions: { alignItems: 'center', gap: Space.s },
});
