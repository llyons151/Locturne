import { Host } from '@expo/ui';
import {
  BottomSheet,
  Button,
  DatePicker,
  Form,
  Group,
  HStack,
  Image,
  NavigationStack,
  Picker,
  Section,
  Spacer,
  Text,
  Toolbar,
  ToolbarItem,
} from '@expo/ui/swift-ui';
import {
  datePickerStyle,
  foregroundStyle,
  labelsHidden,
  navigationTitle,
  pickerStyle,
  presentationDetents,
  presentationDragIndicator,
  tag,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';

import { ControlRow, ValueRow } from '@/components/grouped-list';
import * as haptic from '@/lib/haptics';
import { Nocturne } from '@/theme';

import { nightsLabel, type MenuRowProps, type NightsRowProps, type TimeRowProps } from './control-types';

/**
 * The Routine tab's editable rows on iPhone, built from Apple's own controls (HIG: Pickers,
 * Sheets, Lists and tables):
 * - Times use the compact date picker: the time sits in the row, and a tap opens the
 *   system's wheels in place. No custom sheet.
 * - Short lists of choices use a pull-down menu.
 * - Nights opens a system sheet with a grabber, medium and large detents, swipe to dismiss,
 *   and a checkmark list like Clock's "Repeat". Each tap applies straight away, so the sheet
 *   only needs the standard Close button.
 */

const timeAsDate = (minutes: number) => new Date(2000, 0, 1, 0, minutes);

export function TimeRow({ icon, title, value, onChange, invalid, last }: TimeRowProps) {
  return (
    <ControlRow icon={icon} title={title} last={last}>
      <Host matchContents colorScheme="dark">
        <DatePicker
          selection={timeAsDate(value)}
          displayedComponents={['hourAndMinute']}
          onDateChange={(date) => {
            const minutes = date.getHours() * 60 + date.getMinutes();
            // A time that can't work (bedtime equal to morning start) is refused; the
            // controlled picker springs back to the last good value.
            if (!invalid?.(minutes)) onChange(minutes);
            else haptic.thud();
          }}
          modifiers={[datePickerStyle('compact'), labelsHidden(), tint(Nocturne.text)]}
        />
      </Host>
    </ControlRow>
  );
}

export function MenuRow<T extends string | number>({ icon, title, value, options, onChange, last }: MenuRowProps<T>) {
  return (
    <ControlRow icon={icon} title={title} last={last}>
      <Host matchContents colorScheme="dark">
        <Picker
          selection={value}
          onSelectionChange={(next: T) => onChange(next)}
          modifiers={[pickerStyle('menu'), labelsHidden(), tint(Nocturne.text2)]}
        >
          {options.map((o) => (
            <Text key={o.value} modifiers={[tag(o.value)]}>
              {o.label}
            </Text>
          ))}
        </Picker>
      </Host>
    </ControlRow>
  );
}

/** Monday first, like onboarding's day picker: 0 is Monday night. */
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function NightsRow({ icon, value, onChange, last }: NightsRowProps) {
  const [open, setOpen] = useState(false);
  const toggle = (day: number) => {
    haptic.tap();
    onChange(value.includes(day) ? value.filter((d) => d !== day) : [...value, day].sort((a, b) => a - b));
  };

  return (
    <>
      <ValueRow icon={icon} title="Nights" value={nightsLabel(value)} onPress={() => setOpen(true)} last={last} />
      <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme="dark">
        <BottomSheet isPresented={open} onIsPresentedChange={setOpen}>
          <Group modifiers={[presentationDetents(['medium', 'large']), presentationDragIndicator('visible')]}>
            <NavigationStack>
              <Toolbar>
                <Form modifiers={[navigationTitle('Nights')]}>
                  <Section footer={<Text>Each night starts that evening. A night that&apos;s off has no morning lock either.</Text>}>
                    {DAYS.map((day, i) => (
                      <Button key={day} onPress={() => toggle(i)}>
                        <HStack>
                          <Text modifiers={[foregroundStyle(Nocturne.text)]}>{`${day} night`}</Text>
                          <Spacer />
                          {value.includes(i) ? (
                            <Image systemName="checkmark" modifiers={[foregroundStyle(Nocturne.text)]} />
                          ) : null}
                        </HStack>
                      </Button>
                    ))}
                  </Section>
                </Form>
                <Toolbar.Content>
                  <ToolbarItem placement="cancellationAction">
                    <Button role="close" onPress={() => setOpen(false)} />
                  </ToolbarItem>
                </Toolbar.Content>
              </Toolbar>
            </NavigationStack>
          </Group>
        </BottomSheet>
      </Host>
    </>
  );
}
