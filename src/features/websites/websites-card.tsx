'use no memo';
// Reads the App Group's websites during render, which change outside React (the extension
// settles waiting removals), so it stays out of the React Compiler like the Apps tab.

import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { EditRow, ICON, ListCard } from '@/features/apps/apps-list';
import { startsLabel } from '@/features/apps/pending-note';
import * as haptic from '@/lib/haptics';
import { looserEditsStartAt, readLock } from '@/lib/lock-controller';
import { editedSelection, isScreenTimeAvailable, isStoodDown, reapplyStandingBlocks } from '@/lib/screen-time';
import { addSite, getSites, MAX_SITES, removeSite, sitesChangeAt, type AddSiteResult, type SiteList } from '@/lib/websites';
import { Nocturne, Space, Type } from '@/theme';

const PROMPT_TITLE = 'Add a website';
const PROMPT_BODY = 'Type its address, like reddit.com. Every page on it sleeps in Safari and other browsers.';

const REFUSED: Record<Exclude<AddSiteResult, { ok: true }>['reason'], string> = {
  invalid: 'That doesn’t look like a website. Try something like reddit.com.',
  duplicate: 'That website is already on this list.',
  full: `iOS can block up to ${MAX_SITES} websites. Remove one to add another.`,
};

/** Asks for an address in the system's own text prompt (a plain prompt in the web preview). */
function askForSite(onSite: (text: string) => void) {
  if (Platform.OS === 'ios') {
    Alert.prompt(PROMPT_TITLE, PROMPT_BODY, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Add', isPreferred: true, onPress: (text?: string) => text && onSite(text) },
    ], 'plain-text', '', 'url');
    return;
  }
  const text = globalThis.prompt?.(`${PROMPT_TITLE}\n${PROMPT_BODY}`);
  if (text) onSite(text);
}

/**
 * A list's websites, typed in by hand (websites.ts): Apple's picker only offers sites from
 * Safari's history. An Add website row, then one row per site with a remove button. A site
 * added sleeps at once with its list; a removed one keeps sleeping until the next bedtime, like
 * the apps, and the note under the card says when.
 */
export function WebsitesCard({ list }: { list: SiteList }) {
  // Bumped after an edit, so the rows re-read the App Group.
  const [, setRevision] = useState(0);
  const sites = getSites(list);
  const now = new Date();

  const add = () => {
    haptic.tap();
    askForSite((text) => {
      const result = addSite(list, text);
      if (!result.ok) {
        Alert.alert('Couldn’t add it', REFUSED[result.reason]);
        return;
      }
      haptic.done();
      // Only tightens: the filter takes it now if the list is asleep.
      reapplyStandingBlocks();
      setRevision((r) => r + 1);
    });
  };

  const remove = (site: string) => {
    haptic.tap();
    removeSite(list, site, looserEditsStartAt(new Date(), list));
    setRevision((r) => r + 1);
  };

  return (
    <ListCard note={<Note list={list} now={now} />}>
      <EditRow label="Add website" onPress={add} divided={sites.length > 0} />
      {sites.map((site, i) => (
        <View key={site} style={styles.row}>
          <View style={styles.globe}>
            <SymbolView name={{ ios: 'globe', android: 'language', web: 'language' }} size={ICON * 0.5} tintColor={Nocturne.text2} />
          </View>
          <View style={[styles.rowBody, i < sites.length - 1 && styles.separator]}>
            <Text style={styles.label} numberOfLines={1}>
              {site}
            </Text>
            <Pressable
              onPress={() => remove(site)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${site}`}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <SymbolView
                name={{ ios: 'minus.circle.fill', android: 'remove_circle', web: 'remove_circle' }}
                size={22}
                tintColor={Nocturne.text3}
              />
            </Pressable>
          </View>
        </View>
      ))}
    </ListCard>
  );
}

/**
 * Under the card: when removed sites wake, or, for bedtime, that the sites sleep with the
 * bedtime apps (with none picked, nothing holds the night).
 */
function Note({ list, now }: { list: SiteList; now: Date }) {
  const changeAt = sitesChangeAt(list);
  let text: string | null = null;
  if (changeAt) {
    const phase = readLock(now).phase;
    const asleep = !isStoodDown() && (list === 'always' || phase === 'night' || phase === 'morning');
    text = asleep
      ? `Websites you removed stay asleep. Your change starts ${startsLabel(changeAt, now)}.`
      : `Websites you removed won’t sleep from ${startsLabel(changeAt, now).replace(/^at /, '')}.`;
  } else if (list === 'night' && getSites('night').length > 0 && isScreenTimeAvailable() && editedSelection('night').size === 0) {
    text = 'These sleep with your bedtime apps. Pick at least one app above so the night can start.';
  }
  return text ? <Text style={styles.footer}>{text}</Text> : null;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, gap: 14 },
  globe: {
    width: ICON,
    height: ICON,
    borderRadius: ICON / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Nocturne.surface,
  },
  rowBody: { flex: 1, minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: Space.s, paddingRight: 16 },
  separator: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Nocturne.edge },
  label: { flex: 1, color: Nocturne.text, fontSize: 17, fontWeight: '500' },
  footer: { ...Type.caption, color: Nocturne.text2, marginHorizontal: Space.l, marginTop: Space.s, textAlign: 'center' },
  pressed: { opacity: 0.6 },
});
