import * as SplashScreen from 'expo-splash-screen';

/**
 * The launch screen stays up until the first screen worth seeing has drawn (`revealApp`). The app
 * always starts on the tabs, and a first launch then opens onboarding over them, so without this
 * Home showed for a few frames before onboarding came up (user 2026-10-29: "a fast flicker").
 * Held from the root layout's first import; a backstop lifts it if nothing reveals in time.
 */
const BACKSTOP_MS = 3000;

let revealed = false;

export function holdSplash(): void {
  SplashScreen.setOptions({ fade: true, duration: 200 });
  SplashScreen.preventAutoHideAsync().catch(() => {});
  setTimeout(revealApp, BACKSTOP_MS);
}

/** Lifts the launch screen, once. */
export function revealApp(): void {
  if (revealed) return;
  revealed = true;
  SplashScreen.hide();
}
