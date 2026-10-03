import { Host } from '@expo/ui';
import { Button, Form, LabeledContent, Section, ShareLink, Text } from '@expo/ui/swift-ui';
import { foregroundStyle, monospacedDigit, textSelection } from '@expo/ui/swift-ui/modifiers';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Nocturne } from '@/theme';

import { formatReport } from './report';
import { useDiagnostics } from './use-diagnostics';

/**
 * Hidden diagnostics for beta testers (GAME_PLAN, Step 2: honest status), at /diagnostics.
 * A plain Settings-style grouped list built from Apple's own controls: armed windows, the
 * extension's heartbeats, the nightly self-check, morning proofs, the routine, protection
 * and notifications. "Share report" opens the system share sheet, whose Copy puts the whole
 * report on the clipboard for pasting into a message.
 */
export function Diagnostics() {
  const [sections, refresh] = useDiagnostics();
  const report = formatReport(sections);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Host style={styles.host} colorScheme="dark">
        <Form>
          <Section footer={<Text>Tap Copy in the share sheet, then paste the report into your message to us.</Text>}>
            <ShareLink item={report} subject="Locturne diagnostics">
              <Text>Share report</Text>
            </ShareLink>
            <Button onPress={refresh}>
              <Text>Refresh</Text>
            </Button>
          </Section>
          {sections.map((section) => (
            <Section
              key={section.title}
              title={section.title}
              footer={section.footer ? <Text>{section.footer}</Text> : undefined}
            >
              {section.rows.map(([label, value], i) => (
                <LabeledContent key={`${label}-${i}`} label={label}>
                  <Text modifiers={[foregroundStyle(Nocturne.text2), monospacedDigit(), textSelection(true)]}>
                    {value}
                  </Text>
                </LabeledContent>
              ))}
            </Section>
          ))}
        </Form>
      </Host>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Nocturne.bg },
  host: { flex: 1 },
});
