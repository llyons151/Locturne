import { SymbolView } from 'expo-symbols';
import { createContext, use, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type GestureResponderEvent, type PressableProps } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { Text } from '@/components/text';
import { Nocturne } from '@/theme';

/** The room the Delete button takes when a row is swiped open. */
const ACTION = 84;
const CIRCLE = 52;
/** iOS's system red in dark mode. */
const RED = '#FF453A';

// One row open at a time, as in Mail: opening another closes it.
let open: SwipeableMethods | null = null;

/**
 * Swipe a row left to show a round red Delete button, like Mail's Trash on iOS 26 (user, 2026-11-05).
 * The button grows in as the row slides over. Tapping it closes the row and calls `onDelete`,
 * which asks first (the same alert as the sheet's own Delete). Without `onDelete` the row
 * doesn't swipe.
 */
export function SwipeDelete({
  children,
  onDelete,
  fill,
}: {
  children: ReactNode;
  onDelete?: () => void;
  /** Stretch to the parent's height (a card with a set height). */
  fill?: boolean;
}) {
  const self = useRef<SwipeableMethods | null>(null);
  // Moving (dragged, or settling after): letting go mustn't also count as a tap on the row.
  const moving = useRef(false);
  const isOpen = useRef(false);
  const press = useCallback((fn: () => void) => {
    if (moving.current) return;
    // Open, a tap on the row just closes it, as in Mail.
    if (isOpen.current) return self.current?.close();
    fn();
  }, []);
  const guard = useMemo(() => ({ press }), [press]);
  if (!onDelete) return fill ? <View style={styles.fill}>{children}</View> : <>{children}</>;
  const start = () => {
    moving.current = true;
  };
  return (
    <SwipeGuard value={guard}>
    <ReanimatedSwipeable
      ref={self}
      friction={1.6}
      rightThreshold={ACTION / 2}
      overshootRight={false}
      containerStyle={fill ? styles.fill : undefined}
      childrenContainerStyle={fill ? styles.fill : undefined}
      onSwipeableOpenStartDrag={start}
      onSwipeableCloseStartDrag={start}
      onSwipeableWillOpen={() => {
        if (open && open !== self.current) open.close();
        open = self.current;
      }}
      onSwipeableOpen={() => {
        moving.current = false;
        isOpen.current = true;
      }}
      onSwipeableClose={() => {
        moving.current = false;
        isOpen.current = false;
        if (open === self.current) open = null;
      }}
      renderRightActions={(progress, _translation, methods) => (
        <DeleteAction
          progress={progress}
          onPress={() => {
            methods.close();
            onDelete();
          }}
        />
      )}
    >
      {children}
    </ReanimatedSwipeable>
    </SwipeGuard>
  );
}

const SwipeGuard = createContext<{ press: (fn: () => void) => void }>({ press: (fn) => fn() });

/** The row inside a `SwipeDelete`: letting go of a swipe isn't also a tap, and a tap on an open row closes it. */
export function SwipePressable({ onPress, ...props }: PressableProps) {
  const { press } = use(SwipeGuard);
  return <Pressable {...props} onPress={onPress ? (e: GestureResponderEvent) => press(() => onPress(e)) : undefined} />;
}

function DeleteAction({ progress, onPress }: { progress: SharedValue<number>; onPress: () => void }) {
  const grow = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0.15, 0.6], [0, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(progress.get(), [0.15, 1], [0.5, 1], Extrapolation.CLAMP) }],
  }));
  return (
    <Animated.View style={[styles.action, grow]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Delete"
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <SymbolView name={{ ios: 'trash.fill', android: 'delete', web: 'delete' }} size={22} tintColor="#FFFFFF" />
      </Pressable>
      <Text style={styles.label}>Delete</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  action: { width: ACTION, alignItems: 'center', justifyContent: 'center', gap: 6 },
  button: { width: CIRCLE, height: CIRCLE, borderRadius: CIRCLE / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: RED },
  label: { color: Nocturne.text2, fontSize: 13, fontWeight: '500' },
  pressed: { opacity: 0.7 },
  fill: { flex: 1 },
});
