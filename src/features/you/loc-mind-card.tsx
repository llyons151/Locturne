import { Alert, StyleSheet } from 'react-native';

import { SwitchRow } from '@/components/controls';
import { Card, ControlRow, sym, ValueRow } from '@/components/grouped-list';
import { Text } from '@/components/text';
import { forgetMind, respectWord, setMindOn, stageFor, suspicionWord } from '@/lib/loc-mind';
import { Nocturne, Type } from '@/theme';

import { refreshMind, useMind } from '@/features/home/use-loc-mind';

/**
 * What Loc thinks of you (lib/loc-mind.ts, docs/LOC_PERSONALITY.md), in his words, so it's never
 * a mystery why he's acting the way he is. It all stays on this phone. Switch it off and he acts
 * the same whatever you do; "Make Loc forget" starts him over (your stage stays: it's from your
 * mornings).
 */
export function LocMindCard({ mornings }: { mornings: number }) {
  const mind = useMind();
  const on = !mind.off;
  const forget = () =>
    Alert.alert('Make Loc forget?', 'He’ll forget everything you’ve done. Your mornings stay.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Forget',
        style: 'destructive',
        onPress: () => {
          forgetMind();
          refreshMind();
        },
      },
    ]);
  return (
    <Card footer="Only on this phone. It changes how Loc acts and what he says, never your apps or your mornings.">
      <ControlRow icon={sym('person.2.fill', 'group')} title="You are his">
        <Text style={styles.value}>{stageFor(mornings).label}</Text>
      </ControlRow>
      {on ? (
        <>
          <ControlRow icon={sym('star.fill', 'star')} title="Respect">
            <Text style={styles.value}>{respectWord(mind.respect)}</Text>
          </ControlRow>
          <ControlRow icon={sym('eye.fill', 'visibility')} title="Suspicion">
            <Text style={styles.value}>{suspicionWord(mind.suspicion)}</Text>
          </ControlRow>
        </>
      ) : null}
      <SwitchRow
        icon={sym('brain.head.profile', 'psychology')}
        title="Loc remembers you"
        value={on}
        onChange={(v) => {
          setMindOn(v);
          refreshMind();
        }}
        last={!on}
      />
      {on ? <ValueRow icon={sym('eraser.fill', 'ink_eraser')} title="Make Loc forget" value="" onPress={forget} last /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  value: { color: Nocturne.text2, ...Type.body },
});
