'use no memo';
// Reads the App Group stores during render (limits, picks), which change outside React, so it
// stays out of the React Compiler like the screens that use it.

import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { removePick, type RemovedPick } from 'blocked-apps';

import { ScreenTimePicker } from '@/components/screen-time-picker';
import { armIfPaid } from '@/hooks/use-app-start';
import { useProtection } from '@/hooks/use-protection';
import { editLimit, freeLimitId, isLimitId, renameLimit, type DailyLimit, type LimitId } from '@/lib/daily-limits';
import * as haptic from '@/lib/haptics';
import { looserEditsStartAt, onLockChange } from '@/lib/lock-controller';
import { rescheduleNotifications } from '@/lib/notifications';
import {
  armLimit,
  beginListEdit,
  clearSelection,
  draftId,
  finishListEdit,
  getArmedNight,
  getLimits,
  isStoodDown,
  reapplyStandingBlocks,
  requestAccess,
  saveLimits,
  selectionSize,
  type StandingList,
} from '@/lib/screen-time';

import { isPickerSettling, settlePicker } from './picker-settle';

// Limits iOS is still arming. Shared by the Apps tab and a list's page, so an edit on one
// waits for an arm started on the other.
const armingLimits = new Set<LimitId>();

/**
 * Everything that changes the live lists (the bedtime and always lists, and daily limits): the
 * Apps tab and a list's own page (`list-page.tsx`) share it. Render `picker` somewhere on the
 * screen: it's Apple's app picker while one is open.
 */
export function useListActions() {
  // Not just the cached access flag: iOS keeps reporting "approved" after a revoke.
  const [protection, recheckProtection] = useProtection();
  const [editing, setEditing] = useState<StandingList | null>(null);
  // Bumped whenever the picks may have changed, so counts and native rows re-read them.
  const [revision, setRevision] = useState(0);
  const [limits, setLimits] = useState(getLimits);
  const [limitError, setLimitError] = useState<string | null>(null);
  const refresh = useCallback(() => {
    recheckProtection();
    setLimits(getLimits());
    setRevision((r) => r + 1);
  }, [recheckProtection]);

  // Onboarding, the Screen Time lab or the other screen can change the picks while this one is hidden.
  useFocusEffect(refresh);
  // And after each sync: settling limits on return awaits iOS per limit, so the rows read on
  // `active` can be one step behind (a used-up mark not yet forgotten, or a re-fire just in).
  useEffect(() => onLockChange(() => refresh()), [refresh]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => state === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);

  const saveAndArm = async (next: DailyLimit[], arm?: DailyLimit) => {
    setLimitError(null);
    // Saved before arming: iOS can report a tightened limit as used up the moment it's armed,
    // and the extension judges that against the saved minutes (a stale-threshold check), so
    // the old, looser number must already be gone.
    const before = getLimits().find((l) => l.id === arm?.id);
    saveLimits(next);
    setLimits(next);
    if (arm) {
      armingLimits.add(arm.id);
      try {
        await armLimit(arm);
      } catch {
        // Never imply a limit is on when iOS refused it (GAME_PLAN, "Reliability"): this one
        // goes back to what iOS is still enforcing, on disk and on screen. Only this one: an
        // edit to another limit may have landed meanwhile.
        // In place, so the rows keep their order.
        const reverted = before
          ? getLimits().map((l) => (l.id === arm.id ? before : l))
          : getLimits().filter((l) => l.id !== arm.id);
        saveLimits(reverted);
        setLimits(reverted);
        setLimitError("iOS wouldn't start that limit. Try again in a moment.");
        return;
      } finally {
        armingLimits.delete(arm.id);
      }
    }
    setLimits(getLimits());
  };

  /** Stricter edits start now; looser ones (and removing it) wait for bedtime (`editLimit`). */
  const setMinutes = (id: LimitId, minutes: number | null) => {
    haptic.tap();
    if (armingLimits.has(id) || isPickerSettling(id)) {
      setLimitError('Still saving this limit. Try again in a moment.');
      return;
    }
    const now = new Date();
    const current = getLimits();
    const next = editLimit(current, id, minutes, looserEditsStartAt(now), now);
    const after = next.find((l) => l.id === id);
    const before = current.find((l) => l.id === id);
    saveAndArm(next, after && after.minutes !== before?.minutes ? after : undefined);
  };

  /** A name is only words on screen: saved now, nothing for iOS to arm. */
  const setName = (id: LimitId, name: string) => {
    const next = renameLimit(getLimits(), id, name);
    saveLimits(next);
    setLimits(next);
  };

  /**
   * Apple's picker closed on a list's draft. Added apps join now; removed ones wait for
   * bedtime (`finishListEdit`). Newly added apps may need shielding straight away.
   */
  const pickedList = (list: StandingList) => {
    finishListEdit(list, looserEditsStartAt(new Date(), list));
    if (isLimitId(list)) pickedLimit(list);
    reapplyStandingBlocks();
    // An empty bedtime list left the night unarmed (`armIfPaid` skips it): arm it now, as the
    // Routine tab's save does, or the apps just added stay awake until Locturne is reopened.
    if (list === 'night' && !getArmedNight()) armIfPaid();
    // Tonight's bedtime warning and the morning note only come when apps will sleep: re-plan
    // them for the list as it stands at bedtime (an emptied or refilled list changes that).
    if (list === 'night') rescheduleNotifications().catch(() => {});
    refresh();
  };

  // A limit's list changed: a new limit starts at 30 minutes; an existing one is re-armed,
  // because iOS keeps its own copy of the picks.
  const pickedLimit = (id: LimitId) => {
    const current = getLimits();
    const existing = current.find((l) => l.id === id);
    if (existing) return saveAndArm(current, existing);
    if (selectionSize(id) === 0) return clearSelection(id);
    const created: DailyLimit = { id, minutes: 30 };
    saveAndArm([...current, created], created);
  };

  /** Opens Apple's picker on a draft of the list. Only here, never on render. */
  const edit = async (list: StandingList) => {
    haptic.tap();
    // Onboarding always gets access, so this is only a revoke (or a stale first launch):
    // ask again first, since Apple's picker needs it.
    if (protection !== 'on' && !(await askAccess())) return;
    if (isPickerSettling(list) || (isLimitId(list) && armingLimits.has(list))) {
      setLimitError('Still saving this limit. Try again in a moment.');
      return;
    }
    beginListEdit(list);
    setEditing(list);
  };

  const addLimit = () => {
    const id = freeLimitId(getLimits());
    if (id) edit(id);
  };

  /**
   * A row swiped away (or deleted in Edit mode). The same path as the picker: the draft
   * loses the pick, then `pickedList` saves it, so the removal still waits for bedtime.
   */
  const removed = (list: StandingList, pick: RemovedPick) => {
    haptic.tap();
    if (isPickerSettling(list) || (isLimitId(list) && armingLimits.has(list))) {
      setLimitError('Still saving this limit. Try again in a moment.');
      refresh();
      return;
    }
    beginListEdit(list);
    if (!removePick(draftId(list), pick)) {
      refresh();
      return;
    }
    pickedList(list);
  };

  // The repair path when protection is off: once access is back, put the shields back.
  const askAccess = async (): Promise<boolean> => {
    setLimitError(null);
    try {
      if ((await requestAccess()) !== 'approved') throw new Error('refused');
      reapplyStandingBlocks();
      return true;
    } catch {
      setLimitError("Screen Time access wasn't turned on. You can try again when you're ready.");
      return false;
    } finally {
      refresh();
    }
  };

  const allow = () => {
    haptic.tap();
    askAccess();
  };

  // Onboarding can't be finished without access, so a page is always the finished one.
  // Only a revoke in Settings (`off`) adds the row to turn it back on.
  const revoked = protection === 'off';

  const picker = editing ? (
    <ScreenTimePicker
      // A draft of the list, so removals can wait for bedtime (`beginListEdit`).
      list={draftId(editing)}
      // The library saves the new picks 0.1s after Done (a debounce), so refreshing on
      // close alone reads the old list. It reports once the save lands; refresh then.
      onPicked={refresh}
      onClose={() => {
        const closed = editing;
        setEditing(null);
        refresh();
        // In case the picker unmounts before its report arrives.
        settlePicker(closed, () => pickedList(closed));
      }}
    />
  ) : null;

  return {
    revision,
    limits,
    limitError,
    revoked,
    // No subscription: picks and limits are kept, but nothing sleeps (standDown).
    unpaid: !revoked && isStoodDown(),
    picker,
    edit,
    removed,
    setMinutes,
    setName,
    addLimit,
    allow,
  };
}
