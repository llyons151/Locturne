import { SymbolView } from 'expo-symbols';
import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren, type ReactNode } from 'react';
import { AccessibilityInfo, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View, type StyleProp, type TextStyle } from 'react-native';
import { Text } from '@/components/text';
import Animated, {
  cubicBezier,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OnSky, PrimaryButton } from '@/components/buttons';
import { PressScale } from '@/components/press-scale';
import { useOnMoon } from '@/components/moon-surface';
import { MotionPage, Reveal, WordsIn, type TextMotion } from '@/components/motion';
import { useCompact } from '@/hooks/use-compact';
import * as haptic from '@/lib/haptics';
import { noOrphan } from '@/lib/text';
import { CTA_HEIGHT, DISPLAY_MAX_SCALE, DisplayFont, Gap, Nocturne, Radius, Space, Type, VoiceSize } from '@/theme';

/** Above this text scale the page body scrolls instead of clipping. */
const SCROLL_ABOVE_SCALE = 1.3;

/** Where the bar is: which of the three chapters, and how far through it (0–1). */
export type Progress = { chapter: number; value: number; chapters: number };

type ShellProps = PropsWithChildren<{
  /** Null hides the bar. */
  progress: Progress | null;
  /** Every heading, line and caption centred (onboarding). Off, they start at the left (the cancel flow). */
  centered?: boolean;
  onBack?: () => void;
  /** Missing hides Exit: a first setup can't be left before it's saved. */
  onExit?: () => void;
  footer?: ReactNode;
  /** Off lets a page run past the body's bottom, over the button's area (`build`'s ground sliding off). */
  clip?: boolean;
}>;

/** Fixed full-screen page: top bar, content, and a bottom action that never scrolls away. */
export function Shell({ progress, centered = false, onBack, onExit, footer, clip = true, children }: ShellProps) {
  // Pad with the provider's window insets; the native SafeAreaView can measure zero inside a full-screen modal.
  const insets = useSafeAreaInsets();
  // Pages are laid out to fit at the standard text sizes. Past that (B13: larger Dynamic Type
  // settings), a five-option question or a long paragraph won't fit, so the body scrolls.
  const { fontScale } = useWindowDimensions();
  const scrolls = fontScale > SCROLL_ABOVE_SCALE;
  return (
    // The button floats clear of the bottom (Insight Timer, user 2026-10-26): never flush on a phone without a home bar.
    <View style={[styles.shell, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, Space.l) }]}>
      <View style={styles.topBar}>
        <Pressable
          onPress={onBack}
          disabled={!onBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={[styles.roundButton, !onBack && styles.hidden]}
        >
          <SymbolView
            name={{ ios: 'arrow.left', android: 'arrow_back', web: 'arrow_back' }}
            size={20}
            weight="semibold"
            tintColor={Nocturne.text}
          />
        </Pressable>
        {progress === null ? <View style={styles.progress} /> : <ChapterBar progress={progress} />}
        <Pressable
          onPress={onExit}
          disabled={!onExit}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Exit"
          accessibilityElementsHidden={!onExit}
          style={[styles.exitButton, !onExit && styles.hidden]}
        >
          <Text style={styles.exit}>Exit</Text>
        </Pressable>
      </View>
      {/* At standard text sizes pages never scroll: every screen is laid out to fit, with tighter layouts on short phones. */}
      <Centered.Provider value={centered}>
        {scrolls ? (
          <ScrollView
            testID="onboarding-body"
            style={styles.scroll}
            contentContainerStyle={[styles.body, styles.grow]}
            showsVerticalScrollIndicator
          >
            {children}
          </ScrollView>
        ) : (
          <View testID="onboarding-body" style={[styles.scroll, styles.body, !clip && styles.unclipped]}>
            {children}
          </View>
        )}
        {footer ? <View testID="onboarding-footer" style={styles.footer}>{footer}</View> : null}
      </Centered.Provider>
    </View>
  );
}

/**
 * Three short bars, one per chapter (your nights, your mornings, your apps), after Headway's
 * split bar: finished chapters are full, the current one eases to its value.
 */
function ChapterBar({ progress }: { progress: Progress }) {
  const { chapter, value, chapters } = progress;
  const overall = (chapter + value) / chapters;
  return (
    <View
      style={[styles.progress, styles.chapters]}
      accessibilityRole="progressbar"
      accessibilityLabel={`Part ${chapter + 1} of ${chapters}`}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(overall * 100) }}
    >
      {Array.from({ length: chapters }, (_, i) => (
        // The current chapter always shows a stub, as in the user's reference (2026-10-26): you're in it.
        <ChapterTrack key={i} value={i < chapter ? 1 : i === chapter ? Math.max(value, CURRENT_STUB) : 0} />
      ))}
    </View>
  );
}

/** How much of the current chapter's track shows before any of it is done. */
const CURRENT_STUB = 0.14;

function ChapterTrack({ value }: { value: number }) {
  const reduced = useReducedMotion();
  const fill = useSharedValue(value);
  useEffect(() => {
    // Fills as the page it finished leaves, not after the next one lands (Duolingo's bar pays out on Continue).
    fill.value = reduced ? value : withTiming(value, { duration: 350, easing: Easing.out(Easing.cubic) });
  }, [value, reduced, fill]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  return (
    <View style={styles.track}>
      <Animated.View style={[styles.trackFill, fillStyle]} />
    </View>
  );
}

const Centered = createContext(false);

/** Whether this page's text is centred: the whole onboarding, or anything on the quiz moon. */
function useCentered() {
  const centered = useContext(Centered);
  const moon = useOnMoon();
  return centered || moon;
}

/** How long a page takes to leave, and how far into that the next one starts arriving. */
export const EXIT_MS = 180;
const FOOTER_EXIT_MS = 150;
const ENTER_AFTER_MS = 140;
/**
 * A sheet sliding up onto the screen or down off it (`build`'s ground and button). In takes its
 * time and settles softly (user 2026-10-26: 480ms "super fast", not buttery); out can be quicker.
 */
export const SLIDE_IN_MS = 720;
export const SLIDE_OUT_MS = 480;
/** In decelerating, like a sheet coming to rest; out gathering speed, like a dropped curtain. */
export const SLIDE_IN_CURVE = [0.25, 1, 0.5, 1] as const;
export const SLIDE_OUT_CURVE = [0.32, 0, 0.67, 0] as const;
const SLIDE_IN_EASING = cubicBezier(...SLIDE_IN_CURVE) as unknown as string;
const SLIDE_OUT_EASING = cubicBezier(...SLIDE_OUT_CURVE) as unknown as string;

type Leaving = 'forward' | 'back';
/**
 * `held`: a page that runs its own way out (`build`: Loc leaves, then the ground slides) stays
 * this long instead of fading, and the page that replaced it waits that long to come in. 0 for
 * the usual fade.
 */
export type SwapPage<T> = { key: string; value: T; leaving: Leaving | null; replaced: boolean; held: number };

/**
 * The page on screen plus, for a moment, the one it replaced, on its way out
 * (docs/DUOLINGO_MOTION.md: pages leave instead of cutting). Render every entry, keyed by its
 * `key`, under one parent: the leaving page keeps its key and parent, so React keeps it mounted
 * as it was and it doesn't replay its entrance. A smaller `depth` means the user went back.
 * `holds` gives a page's own exit time, for pages that run their own way out.
 */
export function useSwap<T>(key: string, depth: number, value: T | null, holds?: (key: string) => number): SwapPage<T>[] {
  // Reads the last value put on screen while rendering the swap, which the compiler won't allow.
  'use no memo';
  const reduced = useReducedMotion();
  const [shown, setShown] = useState({ key, depth });
  const [leaving, setLeaving] = useState<SwapPage<T> | null>(null);
  // The value last put on screen, which is what leaves when the key changes.
  const last = useRef(value);
  /* eslint-disable react-hooks/refs -- the leaving page must keep its last props, or a picked answer un-picks on the way out */
  if (shown.key !== key) {
    setShown({ key, depth });
    setLeaving(
      reduced || last.current === null
        ? null
        : {
            key: shown.key,
            value: last.current,
            leaving: depth < shown.depth ? 'back' : 'forward',
            replaced: false,
            held: holds?.(shown.key) ?? 0,
          },
    );
  }
  /* eslint-enable react-hooks/refs */
  useEffect(() => {
    last.current = value;
  });
  useEffect(() => {
    if (!leaving) return;
    const id = setTimeout(() => setLeaving(null), leaving.held || EXIT_MS);
    return () => clearTimeout(id);
  }, [leaving]);
  const pages: SwapPage<T>[] = leaving ? [leaving] : [];
  if (value !== null) pages.push({ key, value, leaving: null, replaced: leaving !== null, held: leaving?.held ?? 0 });
  return pages;
}

/** A page's way out: its entrance in reverse, fading back into a blur where it stands. Nothing slides. */
function exitAnimation(duration: number) {
  return {
    animationName: {
      from: { opacity: 1, filter: 'blur(0px)' },
      to: { opacity: 0, filter: 'blur(8px)' },
    },
    animationDuration: `${duration}ms`,
    animationTimingFunction: 'ease-in',
    animationFillMode: 'forwards',
  } as const;
}

/**
 * A sheet's slide, by `distance` (the screen's height): `in` up from below to its place, `out`
 * from its place down off the screen, after `delay` ms. Everything that moves as one sheet uses
 * this, so its parts can't drift apart.
 */
export function slideAnimation(way: 'in' | 'out', distance: number, delay = 0) {
  const off = { transform: [{ translateY: distance }] };
  const on = { transform: [{ translateY: 0 }] };
  return {
    animationName: way === 'in' ? { from: off, to: on } : { from: on, to: off },
    animationDuration: `${way === 'in' ? SLIDE_IN_MS : SLIDE_OUT_MS}ms`,
    animationDelay: `${delay}ms`,
    animationTimingFunction: way === 'in' ? SLIDE_IN_EASING : SLIDE_OUT_EASING,
    animationFillMode: 'both',
  } as const;
}

const LeavingContext = createContext<Leaving | null>(null);
/** Whether the page this is in is on its way out, for a page that runs its own exit (`held`). */
export function useLeaving() {
  return useContext(LeavingContext) !== null;
}

/**
 * One page of onboarding. Keyed by step, so every entrance replays on each page. While
 * `leaving` it lies over the next page and fades out, or, `held`, stays put while it runs its
 * own way out; a page that `replaced` another holds its entrance until that one is nearly gone.
 */
export function StepEnter({
  motion = 'focus',
  leaving = null,
  replaced = false,
  held = 0,
  children,
}: PropsWithChildren<{ motion?: TextMotion; leaving?: Leaving | null; replaced?: boolean; held?: number }>) {
  return (
    <Animated.View
      style={[styles.page, leaving && [StyleSheet.absoluteFill, styles.inert, !held && exitAnimation(EXIT_MS)]]}
      accessibilityElementsHidden={leaving !== null}
      importantForAccessibility={leaving ? 'no-hide-descendants' : 'auto'}
    >
      <LeavingContext.Provider value={leaving}>
        <MotionPage motion={motion} offset={replaced ? held || ENTER_AFTER_MS : 0}>
          {children}
        </MotionPage>
      </LeavingContext.Provider>
    </Animated.View>
  );
}

export function Eyebrow({ children }: PropsWithChildren) {
  const center = useCentered();
  return (
    <Reveal>
      <Text style={[styles.eyebrow, center && styles.centered]}>{children}</Text>
    </Reveal>
  );
}

export function Title({ children, style }: { children: string; style?: StyleProp<TextStyle> }) {
  const center = useCentered();
  const compact = useCompact();
  return <WordsIn text={noOrphan(children)} style={[styles.title, compact && Type.headingCompact, center && styles.centered, style]} header />;
}

export function Body({ children, style }: PropsWithChildren<{ style?: StyleProp<TextStyle> }>) {
  const moon = useOnMoon();
  const center = useCentered();
  return (
    <Reveal>
      <Text style={[styles.body2, center && styles.centered, moon && styles.bodyOnMoon, style]}>{typeof children === 'string' ? noOrphan(children) : children}</Text>
    </Reveal>
  );
}

/** Loc talking: the display font, entering with the page's text motion. */
export function Voice({
  text,
  size = 34,
  delay = 0,
  header,
  center: centerProp,
}: {
  text: string;
  size?: number;
  /** The earliest this line starts, in ms after the page opens. */
  delay?: number;
  /** Set when the line is the page's title, so VoiceOver announces it as one. */
  header?: boolean;
  /** Centered text, on a page that otherwise starts lines at the left. */
  center?: boolean;
}) {
  const center = useCentered() || centerProp;
  const compact = useCompact();
  return (
    <WordsIn
      key={text}
      text={noOrphan(text)}
      style={[
        styles.voice,
        { fontSize: size, lineHeight: size * 1.08 },
        // A page's title in his words looks like every other title.
        header && (compact ? Type.headingCompact : Type.heading),
        center && { textAlign: 'center' },
      ]}
      delay={delay}
      header={header}
      maxFontSizeMultiplier={DISPLAY_MAX_SCALE}
    />
  );
}

/**
 * Holds its place but stays invisible until `ready`, then fades up: a button that waits for
 * an answer or a payoff never shows as a grey, dead-looking pill, and the page doesn't jump
 * when it arrives.
 */
export function Ready({ ready, children }: PropsWithChildren<{ ready: boolean }>) {
  const reduced = useReducedMotion();
  const shown = useSharedValue(ready ? 1 : 0);
  useEffect(() => {
    shown.value = reduced ? (ready ? 1 : 0) : withTiming(ready ? 1 : 0, { duration: 260 });
  }, [ready, reduced, shown]);
  const style = useAnimatedStyle(() => ({ opacity: shown.value, transform: [{ translateY: (1 - shown.value) * 6 }] }));
  return (
    <Animated.View style={[style, { pointerEvents: ready ? 'auto' : 'none' }]} accessibilityElementsHidden={!ready}>
      {children}
    </Animated.View>
  );
}

/**
 * His reply to the answer just picked, on the question's own screen: one voice line (and,
 * for `tried`, a plain sentence under it). Keyed by the answer, so a new pick replays it.
 */
export function Reply({ text, detail, children }: PropsWithChildren<{ text?: string; detail?: string }>) {
  return (
    <View style={styles.reply} accessibilityLiveRegion="polite">
      {/* A line that changes in place (a running total): it comes in once, then only its own parts move. */}
      {children ? <Reveal>{children}</Reveal> : null}
      {text ? (
        <>
          <Voice key={text} text={text} size={VoiceSize.aside} center />
          {detail ? (
            <Reveal key={detail} delay={350}>
              <Text style={styles.replyDetail}>{noOrphan(detail)}</Text>
            </Reveal>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

/**
 * A drawing of one of his notifications, the way iOS shows a banner in dark mode (a grey
 * card, no tint). Clearly a preview: labelled, and never shaped like Apple's permission alert.
 */
export function NotePreview({ time, title, body }: { time: string; title: string; body: string }) {
  return (
    <Reveal rise>
      <View style={styles.note} accessible accessibilityLabel={`Preview of a notification at ${time}: ${title} ${body}`}>
      <View style={styles.noteIcon}>
        <SymbolView name={{ ios: 'moon.zzz.fill', android: 'bedtime', web: 'bedtime' }} size={16} tintColor="#FFFFFF" />
      </View>
      <View style={styles.noteText}>
        <View style={styles.noteHead}>
          <Text style={styles.noteApp}>LOCTURNE</Text>
          <Text style={styles.noteTime}>{time}</Text>
        </View>
        <Text style={styles.noteTitle}>{title}</Text>
        <Text style={styles.noteBody}>{body}</Text>
      </View>
      </View>
    </Reveal>
  );
}

/**
 * Tonight, filling in as it's set up (Lose It's program card): bedtime → alarm, how they'll
 * prove they're up, how many apps. Slots not chosen yet are left out, not shown as a dash.
 */
export function TonightStrip({ parts }: { parts: (string | null)[] }) {
  const center = useCentered();
  return (
    <Reveal style={[styles.strip, center && styles.stripCentered]}>
      <Text style={styles.stripLabel}>TONIGHT</Text>
      <Text style={[styles.stripText, center && styles.centered]} numberOfLines={2}>
        {parts.filter((part) => part !== null).join('  ·  ')}
      </Text>
    </Reveal>
  );
}

const FOOTER_DELAY_MS = 450;

/**
 * Footer buttons fade up shortly after the page's first line starts, without waiting for it to finish.
 * A text link (Skip, Restore, Not now) always goes under the primary button, never above it.
 */
export function FooterEnter({
  children,
  secondary,
  leaving = null,
  alone = false,
  selfTimed = false,
  sheet = false,
  held = 0,
  wash = false,
}: PropsWithChildren<{
  secondary?: ReactNode;
  /** Over the quiz's pale wash: darker not-ready button and a stronger link (user 2026-10-26); the dark sky keeps the old look. */
  wash?: boolean;
  leaving?: Leaving | null;
  /** It rides its page's sheet (`build`): slides up with it once the last page is gone, and down with it, instead of fading. */
  sheet?: boolean;
  /** Coming in after a page that ran its own way out (`SwapPage.held`), or, leaving, how long its own page takes to go. */
  held?: number;
  /** Its parts time their own entrance (the opener's lines), so the block doesn't fade in over them. */
  selfTimed?: boolean;
  /**
   * Leaving with nothing coming in yet (the moon is still flying): it keeps its place, or the
   * footer collapses under it and the buttons and the page above jump as they fade.
   */
  alone?: boolean;
}>) {
  const reduced = useReducedMotion();
  const { height } = useWindowDimensions();
  // Still invisible until it fades in, so a double tap on the last page's button can't land here.
  const [live, setLive] = useState(reduced);
  // After a held page, the buttons wait until it has gone (user 2026-10-26).
  const delay = sheet ? EXIT_MS : Math.max(FOOTER_DELAY_MS, held);
  useEffect(() => {
    if (live) return;
    const id = setTimeout(() => setLive(true), sheet ? EXIT_MS + SLIDE_IN_MS : delay);
    return () => clearTimeout(id);
  }, [live, sheet, delay]);
  return (
    <Animated.View
      accessibilityElementsHidden={leaving !== null}
      importantForAccessibility={leaving ? 'no-hide-descendants' : 'auto'}
      style={[
        styles.footerStack,
        { pointerEvents: live ? 'auto' : 'none' },
        leaving
          ? [
              !alone && styles.footerLeaving,
              styles.inert,
              sheet ? slideAnimation('out', height, held - SLIDE_OUT_MS) : exitAnimation(FOOTER_EXIT_MS),
            ]
          : !reduced && sheet
            ? slideAnimation('in', height, delay)
            : !reduced &&
              !selfTimed && {
                animationName: {
                  from: { opacity: 0, transform: [{ translateY: 8 }] },
                  to: { opacity: 1, transform: [{ translateY: 0 }] },
                },
                animationDuration: '420ms',
                animationDelay: `${delay}ms`,
                animationTimingFunction: 'ease-out',
                animationFillMode: 'backwards',
              },
      ]}
    >
      <OnSky.Provider value={wash}>
        {children}
        {/* The link's room is kept on every page, so the main button never moves and can be tapped straight through (user 2026-10-26). */}
        <View style={styles.secondarySlot}>{secondary}</View>
      </OnSky.Provider>
    </Animated.View>
  );
}

/** Single-choice list. Selecting an option advances after a short beat. The answers arrive together, after the question. */
export function Options<T>({
  options,
  value,
  onChoose,
  tone = 'sky',
  dense = false,
}: {
  options: { label: string; value: T }[];
  value: T | undefined;
  onChoose: (value: T) => void;
  /** 'moon': black pills sitting on the risen quiz moon. */
  tone?: 'sky' | 'moon';
  /** Short phones: tighter gaps between the pills, so five answers, his reply and the button all fit. */
  dense?: boolean;
}) {
  const moon = tone === 'moon';
  // Only over the quiz's pale wash; on the dark sky (the pain question) they stay outline-only.
  const wash = useOnMoon();
  const center = useCentered();
  // Short phones (an SE): five full-height answers, his reply and the button don't fit, so the pills shrink there.
  const short = useCompact();
  return (
    <Reveal rise>
      <View style={[styles.options, dense && styles.optionsDense]} accessibilityRole="radiogroup">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <PressScale
              key={option.label}
              onPress={() => {
                haptic.tap();
                onChoose(option.value);
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              style={[
                styles.option,
                center && styles.optionCentered,
                moon && styles.optionMoon,
                moon && wash && styles.optionMoonWash,
                short && styles.optionShort,
                selected && (moon ? styles.optionMoonSelected : styles.optionSelected),
              ]}
            >
              <Text
                style={[
                  styles.optionLabel,
                  center && styles.centered,
                  moon && styles.optionLabelMoon,
                  selected && (moon ? styles.optionLabelMoonSelected : styles.optionLabelSelected),
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {option.label}
              </Text>
            </PressScale>
          );
        })}
      </View>
    </Reveal>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Reveal style={styles.appChipSlot}>
      <PressScale
        onPress={() => {
          haptic.tap();
          onPress();
        }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected }}
        style={[styles.appChip, selected && styles.chipSelected]}
      >
        <Text style={[styles.appChipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
      </PressScale>
    </Reveal>
  );
}

/** Marks anything simulated in this draft, per GAME_PLAN: never imply a native feature works. */
export function PreviewNote({ children }: PropsWithChildren) {
  return (
    <Reveal style={styles.previewNote}>
      <Text style={styles.previewLabel}>PREVIEW</Text>
      <Text style={styles.previewText}>{children}</Text>
    </Reveal>
  );
}

const HOLD_MS = 1600;
const DONE_BEAT_MS = 700;
const QUICK_TAP_MS = 350;
const HINT_MS = 1800;

// Mobile browsers turn a long press into text selection or a callout menu, which cancels the hold.
const noLongPressMenu =
  Platform.OS === 'web'
    ? ({ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', touchAction: 'none' } as object)
    : null;

/**
 * Press and hold to agree. Haptics build while the fill grows; letting go resets it.
 * VoiceOver users get the same agreement through the default activate action.
 */
export function HoldButton({
  label,
  doneLabel,
  onComplete,
}: {
  label: string;
  doneLabel: string;
  onComplete: () => void;
}) {
  const progress = useSharedValue(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pulse = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const [phase, setPhase] = useState<'idle' | 'holding' | 'hint' | 'done'>('idle');
  const pressedAt = useRef(0);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const screenReader = useScreenReader();

  const stopTimers = () => {
    if (timer.current) clearTimeout(timer.current);
    if (pulse.current) clearInterval(pulse.current);
    if (hintTimer.current) clearTimeout(hintTimer.current);
  };

  useEffect(() => stopTimers, []);

  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  const finish = () => {
    stopTimers();
    progress.value = 1;
    setPhase('done');
    haptic.done();
    timer.current = setTimeout(onComplete, DONE_BEAT_MS);
  };

  const start = () => {
    if (phase === 'done') return;
    stopTimers();
    pressedAt.current = Date.now();
    setPhase('holding');
    progress.value = withTiming(1, { duration: HOLD_MS });
    let beat = 0;
    pulse.current = setInterval(() => {
      beat += 1;
      if (beat > 5) haptic.thud();
      else haptic.tick();
    }, 200);
    timer.current = setTimeout(finish, HOLD_MS);
  };

  const cancel = () => {
    if (phase === 'done') return;
    stopTimers();
    progress.value = withTiming(0, { duration: 200 });
    // A quick tap is the most common first try: say what to do instead of doing nothing.
    if (Date.now() - pressedAt.current < QUICK_TAP_MS) {
      haptic.tick();
      setPhase('hint');
      hintTimer.current = setTimeout(() => setPhase('idle'), HINT_MS);
    } else {
      setPhase('idle');
    }
  };

  const text =
    phase === 'done'
      ? doneLabel
      : phase === 'holding'
        ? 'Keep holding'
        : phase === 'hint'
          ? 'Hold it. Don’t just tap.'
          : label;

  // Holding isn't practical with VoiceOver or Switch Control: offer a plain button instead.
  if (screenReader && phase !== 'done') {
    return <PrimaryButton label="I agree" onPress={finish} />;
  }

  return (
    <Pressable
      onPressIn={start}
      onPressOut={cancel}
      style={noLongPressMenu}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Press and hold. With VoiceOver, double-tap to agree."
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'activate' && phase !== 'done') finish();
      }}
    >
      <View style={[styles.hold, noLongPressMenu]}>
        <Animated.View style={[styles.holdFill, fillStyle]} />
        <Text selectable={false} style={[styles.holdLabel, phase === 'done' && styles.holdLabelDone, noLongPressMenu]}>
          {text}
        </Text>
      </View>
    </Pressable>
  );
}

function useScreenReader() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    // React Native Web can't detect screen readers reliably; the hold's activate action still covers it.
    if (Platform.OS === 'web') return;
    let active = true;
    AccessibilityInfo.isScreenReaderEnabled().then((value) => {
      if (active) setEnabled(value);
    });
    const subscription = AccessibilityInfo.addEventListener('screenReaderChanged', setEnabled);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  return enabled;
}

/** Layout shared by every onboarding page: where content starts, and the standard gaps. */
export const page = StyleSheet.create({
  // Every dark-sky page anchors here, so headlines start at the same height on each one.
  top: { flex: 1, paddingTop: Gap.pageTop },
  gapHeadline: { height: Gap.headline },
  gapAside: { height: Gap.aside },
  gapBlock: { height: Gap.block },
  gapSection: { height: Gap.section },
});

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flex: 1, minHeight: 0, overflow: 'hidden' },
  unclipped: { overflow: 'visible' },
  hidden: { opacity: 0 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: Gap.gutter,
    paddingTop: 6,
    paddingBottom: 10,
  },
  // A bare chevron in the bar's white, not a filled circle: it reads as part of the bar beside it.
  roundButton: { width: 24, height: 34, alignItems: 'flex-start', justifyContent: 'center' },
  progress: { flex: 1 },
  chapters: { flexDirection: 'row', gap: 6 },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: Nocturne.progressTrack, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: 4, backgroundColor: Nocturne.text },
  exitButton: { minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' },
  exit: { color: Nocturne.text2, fontSize: 15, fontWeight: '500' },
  body: { paddingHorizontal: Gap.gutter, paddingBottom: Space.l },
  /** A scrolling body still fills the page, so flex layouts inside it keep their shape. */
  grow: { flexGrow: 1 },
  footer: { paddingHorizontal: Gap.gutter, paddingTop: Space.s, paddingBottom: Space.xl },
  eyebrow: { ...Type.label, marginBottom: Gap.headline },
  title: { color: Nocturne.text, ...Type.heading },
  body2: { color: Nocturne.text2, ...Type.body },
  bodyOnMoon: { color: Nocturne.text, textAlign: 'center' },
  centered: { textAlign: 'center' },
  voice: { ...DisplayFont, color: Nocturne.text, letterSpacing: -0.3 },
  footerStack: { gap: Space.s },
  // One TextButton line: 15pt text plus its 4pt padding top and bottom.
  secondarySlot: { minHeight: 28, justifyContent: 'center' },
  // The button on its way out lies over the next page's, which hasn't faded in yet.
  footerLeaving: { position: 'absolute', top: 0, left: 0, right: 0 },
  page: { flex: 1 },
  inert: { pointerEvents: 'none' },
  reply: { minHeight: 52, justifyContent: 'center', gap: Space.s },
  replyDetail: { color: Nocturne.text, ...Type.secondary, textAlign: 'center' },
  note: {
    flexDirection: 'row',
    gap: Space.m,
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 22,
    backgroundColor: 'rgba(44,44,48,0.92)',
  },
  noteIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' },
  noteText: { flex: 1, gap: 2 },
  noteHead: { flexDirection: 'row', justifyContent: 'space-between' },
  noteApp: { color: Nocturne.text2, fontSize: 12, fontWeight: '600', letterSpacing: 0.6 },
  noteTime: { color: Nocturne.text2, fontSize: 12 },
  noteTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  noteBody: { color: '#FFFFFF', fontSize: 15, lineHeight: 20 },
  strip: {
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Nocturne.line,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 3,
  },
  stripLabel: { ...Type.label, fontSize: 11 },
  stripText: { color: Nocturne.text, fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
  stripCentered: { alignItems: 'center' },
  options: { gap: Space.m },
  optionsDense: { gap: Space.s },
  // Every answer is the size of the button under it.
  option: {
    minHeight: CTA_HEIGHT,
    borderRadius: Radius.pill,
    backgroundColor: Nocturne.surface,
    borderWidth: 1,
    borderColor: Nocturne.edge,
    paddingHorizontal: 18,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  optionShort: { minHeight: 46, paddingVertical: 11 },
  optionCentered: { alignItems: 'center' },
  optionSelected: { backgroundColor: Nocturne.cta, borderColor: Nocturne.cta },
  optionLabel: { color: Nocturne.text, fontSize: 17, fontWeight: '500' },
  optionLabelSelected: { color: Nocturne.onCta },
  // On the quiz moon: outline-only pills (a black fill vanished into the night sky), centred like the rest of the moon page;
  // picked fills moon-white.
  optionMoon: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: Radius.pill,
    alignItems: 'center',
  },
  // Over the quiz's pale wash the outline washed out (2026-10-26): a dark see-through fill holds the white label.
  optionMoonWash: { backgroundColor: 'rgba(12,16,40,0.28)', borderColor: 'rgba(255,255,255,0.25)' },
  optionMoonSelected: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  optionLabelMoon: { color: '#FFFFFF', textAlign: 'center' },
  optionLabelMoonSelected: { color: '#000000' },
  chipSelected: { backgroundColor: Nocturne.cta },
  chipLabelSelected: { color: Nocturne.onCta },
  appChip: {
    borderRadius: Radius.control,
    backgroundColor: Nocturne.surface,
    borderWidth: 1,
    borderColor: Nocturne.edge,
    paddingVertical: 16,
    alignItems: 'center',
  },
  appChipSlot: { width: '47.5%' },
  appChipLabel: { color: Nocturne.text, fontSize: 16, fontWeight: '500' },
  previewNote: {
    flexDirection: 'row',
    gap: Space.m,
    alignItems: 'flex-start',
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Nocturne.line,
    padding: Space.l,
  },
  previewLabel: { ...Type.label, marginTop: 1 },
  previewText: { flex: 1, color: Nocturne.text2, ...Type.caption },
  // Outlined at rest: a grey fill would read as disabled.
  hold: {
    minHeight: CTA_HEIGHT,
    paddingVertical: 14,
    borderRadius: Radius.pill,
    borderWidth: 2,
    borderColor: Nocturne.text,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: Nocturne.cta },
  holdLabel: { color: '#FFFFFF', fontSize: 17, fontWeight: '600', mixBlendMode: 'difference' },
  holdLabelDone: { ...DisplayFont, fontSize: 20 },
});
