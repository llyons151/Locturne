/**
 * Throws like iOS does when UserDefaults is handed something that isn't a property list. A JS
 * `null` crosses the bridge as NSNull, and `-[NSUserDefaults setObject:forKey:]` raises on it,
 * which crashes the app.
 */
export function assertPlist(value: unknown, path = 'value'): void {
  if (value === null) throw new Error(`Attempt to insert non-property list object (NSNull) at ${path}`);
  if (Array.isArray(value)) value.forEach((v, i) => assertPlist(v, `${path}[${i}]`));
  else if (typeof value === 'object' && value !== undefined) {
    for (const [k, v] of Object.entries(value)) if (v !== undefined) assertPlist(v, `${path}.${k}`);
  }
}

/**
 * A small fake of react-native-device-activity for the exits and scan tests, which only need
 * the App Group and a record of shield calls. Use it before importing anything that imports
 * screen-time.ts:
 *
 *   const fake = fakeDeviceActivity();
 *   mock.module('react-native-device-activity', { namedExports: fake.exports });
 *
 * `available: false` makes screen-time.ts keep its records in memory, as on web.
 */
export function fakeDeviceActivity({ available = true } = {}) {
  const state = {
    available,
    store: {} as Record<string, unknown>,
    calls: [] as [string, ...unknown[]][],
    activities: [] as string[],
  };
  const ids = () => (state.store.familyActivitySelectionIds ??= {}) as Record<string, string>;
  const record =
    (name: string) =>
    (...args: unknown[]) => {
      state.calls.push([name, ...args]);
    };

  const exports = {
    AuthorizationStatus: { notDetermined: 0, denied: 1, approved: 2 },
    isAvailable: () => state.available,
    getAuthorizationStatus: () => 2,
    requestAuthorization: async () => {},
    pollAuthorizationStatus: async () => 2,
    onAuthorizationStatusChange: () => ({ remove: () => {} }),
    getFamilyActivitySelectionId: (id: string) => ids()[id],
    setFamilyActivitySelectionId: ({ id, familyActivitySelection }: { id: string; familyActivitySelection: string }) => {
      ids()[id] = familyActivitySelection;
    },
    activitySelectionMetadata: ({ activitySelectionId }: { activitySelectionId: string }) => ({
      applicationCount: ids()[activitySelectionId] ? 2 : 0,
      categoryCount: 0,
      webdomainCount: 0,
      includeEntireCategory: false,
    }),
    intersection: () => undefined,
    union: record('union'),
    blockSelection: record('blockSelection'),
    unblockSelection: record('unblockSelection'),
    isShieldActive: () => state.calls.some(([name]) => name === 'blockSelection'),
    updateShield: record('updateShield'),
    updateShieldWithId: record('updateShieldWithId'),
    setWebContentFilterPolicy: record('setWebContentFilterPolicy'),
    clearWebContentFilterPolicy: record('clearWebContentFilterPolicy'),
    configureActions: record('configureActions'),
    startMonitoring: async (name: string) => {
      state.calls.push(['startMonitoring', name]);
      state.activities.push(name);
    },
    stopMonitoring: (names: string[]) => {
      state.calls.push(['stopMonitoring', names]);
      state.activities = state.activities.filter((a) => !names.includes(a));
    },
    cleanUpAfterActivity: record('cleanUpAfterActivity'),
    getActivities: () => [...state.activities],
    getEvents: () => [],
    // Like the real bridge: a missing key is null, not undefined.
    userDefaultsGet: (key: string) => state.store[key] ?? null,
    userDefaultsSet: (key: string, value: unknown) => {
      assertPlist(value, key);
      state.store[key] = value;
    },
    userDefaultsRemove: (key: string) => {
      delete state.store[key];
    },
  };

  /** Clears the App Group and the call log between tests. */
  const reset = () => {
    state.store = {};
    state.calls.length = 0;
    state.activities = [];
  };

  /**
   * A bedtime schedule armed long ago, so mornings are locked until proven (`armedInTime` in
   * lock-state.ts). Without it every morning reads as free, as on the day of install.
   */
  const armedNight = (since = new Date(2026, 0, 1)) => ({
    bedtime: 23 * 60,
    morningStart: 7 * 60,
    windows: 16,
    armedAt: since.toISOString(),
    since: since.toISOString(),
  });
  /**
   * Writes it to the fake App Group. With `available: false`, screen-time.ts keeps records in
   * memory instead, so those tests store `armedNight()` with `sharedSet`.
   */
  const arm = (since?: Date) => {
    state.store['locturne.armedNight'] = armedNight(since);
  };

  /** Which selection ids a shield call named, in order. */
  const shielded = (name: 'blockSelection' | 'unblockSelection') =>
    state.calls
      .filter(([call]) => call === name)
      .map(([, input]) => (input as { activitySelectionId: string }).activitySelectionId);

  return { state, exports, reset, ids, shielded, arm, armedNight };
}
