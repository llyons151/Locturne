/**
 * Preview data for the Apps tab until Screen Time tokens exist. The real list will come
 * from Apple's picker, which only hands back opaque tokens drawn as Label(token).
 *
 * `rule`: "bedtime" apps sleep on Loc's schedule; "always" apps stay blocked all day.
 */
export type AppRule = 'bedtime' | 'always' | null;

export type AppIcon =
  | { kind: 'brand' }
  | { kind: 'system' }
  | { kind: 'symbol'; bg: string; ios: string; web: string };

export type AppEntry = {
  name: string;
  icon: AppIcon;
  rule: AppRule;
};

const sym = (bg: string, ios: string, web: string): AppIcon => ({ kind: 'symbol', bg, ios, web });
const brand: AppIcon = { kind: 'brand' };
const system: AppIcon = { kind: 'system' };

export const APPS: AppEntry[] = [
  { name: 'App Store', icon: sym('#1C8CFF', 'a.circle.fill', 'shop'), rule: null },
  { name: 'Books', icon: sym('#FF9500', 'book.fill', 'menu_book'), rule: null },
  { name: 'Calendar', icon: sym('#FF3B30', 'calendar', 'calendar_today'), rule: null },
  { name: 'Camera', icon: sym('#636366', 'camera.fill', 'photo_camera'), rule: null },
  { name: 'Chess', icon: sym('#4B7D2F', 'crown.fill', 'chess'), rule: 'bedtime' },
  { name: 'Clock', icon: sym('#1C1C1E', 'clock.fill', 'schedule'), rule: null },
  { name: 'Discord', icon: sym('#5865F2', 'gamecontroller.fill', 'forum'), rule: 'bedtime' },
  { name: 'Duolingo', icon: sym('#58CC02', 'bird.fill', 'school'), rule: null },
  { name: 'Facebook', icon: sym('#0866FF', 'f.cursive', 'group'), rule: 'bedtime' },
  { name: 'Hulu', icon: sym('#1CE783', 'play.tv.fill', 'live_tv'), rule: 'bedtime' },
  { name: 'Instagram', icon: brand, rule: 'bedtime' },
  { name: 'Kindle', icon: sym('#146EB4', 'book.closed.fill', 'auto_stories'), rule: null },
  { name: 'Mail', icon: sym('#1A8CFF', 'envelope.fill', 'mail'), rule: null },
  { name: 'Maps', icon: sym('#34C759', 'map.fill', 'map'), rule: null },
  { name: 'Messages', icon: system, rule: null },
  { name: 'Messenger', icon: sym('#A033FF', 'bolt.horizontal.circle.fill', 'chat'), rule: 'bedtime' },
  { name: 'Music', icon: system, rule: null },
  { name: 'Netflix', icon: brand, rule: 'bedtime' },
  { name: 'Notes', icon: sym('#FFCC00', 'note.text', 'sticky_note_2'), rule: null },
  { name: 'Phone', icon: system, rule: null },
  { name: 'Photos', icon: sym('#FF9F0A', 'photo.fill', 'photo_library'), rule: null },
  { name: 'Pinterest', icon: sym('#E60023', 'pin.fill', 'push_pin'), rule: 'bedtime' },
  { name: 'Podcasts', icon: sym('#9933FF', 'mic.fill', 'podcasts'), rule: null },
  { name: 'Reddit', icon: brand, rule: 'always' },
  { name: 'Safari', icon: system, rule: null },
  { name: 'Snapchat', icon: brand, rule: 'bedtime' },
  { name: 'Spotify', icon: sym('#1DB954', 'waveform', 'graphic_eq'), rule: null },
  { name: 'Threads', icon: sym('#000000', 'at', 'alternate_email'), rule: 'bedtime' },
  { name: 'TikTok', icon: brand, rule: 'always' },
  { name: 'Tinder', icon: sym('#FE3C72', 'flame.fill', 'local_fire_department'), rule: 'bedtime' },
  { name: 'Twitch', icon: brand, rule: 'bedtime' },
  { name: 'Weather', icon: sym('#2F7FE0', 'cloud.sun.fill', 'partly_cloudy_day'), rule: null },
  { name: 'WhatsApp', icon: sym('#25D366', 'phone.bubble.fill', 'chat'), rule: null },
  { name: 'X', icon: brand, rule: 'bedtime' },
  { name: 'YouTube', icon: brand, rule: 'always' },
];
