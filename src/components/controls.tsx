import { useState } from 'react';
import { StyleSheet, Switch, Text } from 'react-native';

import { DayPicker } from '@/components/day-picker';
import { ChoiceRow, ControlRow, EditSheet, Section, ValueRow } from '@/components/grouped-list';
import { TimeWheel } from '@/components/time-wheel';
import { formatPreset } from '@/lib/text';
import { Nocturne, Type } from '@/theme';

import {
  nightsLabel,
  type MenuRowProps,
  type NightsRowProps,
  type SwitchRowProps,
  type TimeRowProps,
} from './control-types';

/**
 * The Routine tab's editable rows. On iPhone (`controls.ios.tsx`) they're Apple's own
 * controls: a compact time button, pull-down menus and a system sheet. This file is the
 * web preview's stand-in, which can't render SwiftUI.
 */

export function TimeRow({ icon, title, value, onChange, presets, invalid, last }: TimeRowProps) {
  const [draft, setDraft] = useState<number | null>(null);
  const problem = draft === null ? null : (invalid?.(draft) ?? null);
  return (
    <>
      <ValueRow icon={icon} title={title} value={formatPreset(value)} onPress={() => setDraft(value)} hint="Opens an editor" last={last} />
      <EditSheet
        open={draft !== null}
        title={title}
        onCancel={() => setDraft(null)}
        onDone={() => {
          if (draft !== null && !problem) onChange(draft);
          setDraft(null);
        }}
      >
        {draft !== null ? (
          <>
            <TimeWheel value={draft} onChange={setDraft} presets={presets} />
            {problem ? <Text style={styles.note}>{problem}</Text> : null}
          </>
        ) : null}
      </EditSheet>
    </>
  );
}

export function MenuRow<T extends string | number>({ icon, title, value, options, onChange, last }: MenuRowProps<T>) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value)?.label ?? '';
  return (
    <>
      <ValueRow icon={icon} title={title} value={current} onPress={() => setOpen(true)} hint="Opens an editor" last={last} />
      <EditSheet open={open} title={title} onCancel={() => setOpen(false)} onDone={() => setOpen(false)}>
        <Section>
          {options.map((o, i) => (
            <ChoiceRow
              key={o.value}
              title={o.label}
              selected={o.value === value}
              onPress={() => {
                onChange(o.value);
                setOpen(false);
              }}
              last={i === options.length - 1}
            />
          ))}
        </Section>
      </EditSheet>
    </>
  );
}

export function NightsRow({ icon, value, onChange, last }: NightsRowProps) {
  const [draft, setDraft] = useState<number[] | null>(null);
  return (
    <>
      <ValueRow icon={icon} title="Nights" value={nightsLabel(value)} onPress={() => setDraft(value)} hint="Opens an editor" last={last} />
      <EditSheet
        open={draft !== null}
        title="Nights"
        onCancel={() => setDraft(null)}
        onDone={() => {
          if (draft) onChange(draft);
          setDraft(null);
        }}
      >
        <DayPicker value={draft ?? value} onChange={setDraft} />
        <Text style={styles.note}>A night that&apos;s off has no morning lock either.</Text>
      </EditSheet>
    </>
  );
}

export function SwitchRow({ icon, title, value, onChange, last }: SwitchRowProps) {
  return (
    <ControlRow icon={icon} title={title} last={last}>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={title}
        // A neutral track; the iPhone build uses the system switch instead.
        trackColor={{ false: Nocturne.raised, true: Nocturne.text2 }}
        thumbColor={Nocturne.text}
      />
    </ControlRow>
  );
}

const styles = StyleSheet.create({
  note: { ...Type.secondary, color: Nocturne.text2, textAlign: 'center' },
});
