import { StyleSheet } from 'react-native';

import { Card, ControlRow, sym } from '@/components/grouped-list';
import { Text } from '@/components/text';
import { respectWord, stageFor, suspicionWord } from '@/lib/loc-mind';
import { Nocturne, Type } from '@/theme';

import { useMind } from '@/features/home/use-loc-mind';

/**
 * What Loc thinks of you (lib/loc-mind.ts, docs/LOC_PERSONALITY.md), in his words, so it's never
 * a mystery why he's acting the way he is. It all stays on this phone.
 */
export function LocMindCard({ mornings }: { mornings: number }) {
  const mind = useMind();
  return (
    <Card footer="Only on this phone. It changes how Loc acts and what he says, never your apps or your mornings.">
      <ControlRow icon={sym('person.2.fill', 'group')} title="You are his">
        <Text style={styles.value}>{stageFor(mornings).label}</Text>
      </ControlRow>
      <ControlRow icon={sym('star.fill', 'star')} title="Respect">
        <Text style={styles.value}>{respectWord(mind.respect)}</Text>
      </ControlRow>
      <ControlRow icon={sym('eye.fill', 'visibility')} title="Suspicion" last>
        <Text style={styles.value}>{suspicionWord(mind.suspicion)}</Text>
      </ControlRow>
    </Card>
  );
}

const styles = StyleSheet.create({
  value: { color: Nocturne.text2, ...Type.body },
});
