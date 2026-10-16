/** Stand-in for `expo/dom` outside Expo: the studio runs straight in the page, not in a webview. */
export const IS_DOM = false;
export type DOMProps = Record<string, unknown>;
