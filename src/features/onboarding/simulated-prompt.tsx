import { Modal, StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';

import { PrimaryButton } from '@/components/buttons';
import { Gap, Nocturne, Radius, Space, Type } from '@/theme';

/**
 * Stands in for anything the preview can't really do yet (system prompts, purchases, links),
 * so the draft never implies a native feature works.
 */
export type Simulated = { message: string; then: () => void };

export function SimulatedPrompt({ prompt, onContinue }: { prompt: Simulated | null; onContinue: () => void }) {
  return (
    <Modal visible={prompt !== null} transparent animationType="fade" onRequestClose={onContinue}>
      <PromptCard message={prompt?.message ?? ''} onContinue={onContinue} />
    </Modal>
  );
}

function PromptCard({ message, onContinue }: { message: string; onContinue: () => void }) {
  return (
    <View style={styles.modalScrim}>
      <View style={styles.modalCard}>
        <Text style={styles.modalLabel}>PREVIEW</Text>
        <Text style={styles.modalText}>{message}</Text>
        <PrimaryButton label="Continue" onPress={onContinue} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modalScrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: Gap.gutter,
  },
  modalCard: { backgroundColor: Nocturne.raised, borderRadius: Radius.card, padding: Space.xl, gap: Space.m },
  modalLabel: Type.label,
  modalText: { color: Nocturne.text, ...Type.body },
});
