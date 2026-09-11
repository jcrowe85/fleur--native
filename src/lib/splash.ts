// src/lib/splash.ts
import * as SplashScreen from "expo-splash-screen";

/**
 * Splash lifecycle, owned in one place.
 *
 * Hiding used to live inside app/index.tsx's IndexGate, which only mounts for
 * the "/" route. Any other entry point — a notification tap that deep-links
 * straight to /routine or /cart, or a dev deep link — never ran hideAsync(),
 * so the native splash stayed up over a fully rendered app and looked like a
 * freeze.
 */
const ready = SplashScreen.preventAutoHideAsync().catch(() => {});

let hidden = false;

/** Resolve after `ms`, so a pending promise can never be the last word. */
function after(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Hide the splash. Safe to call from anywhere, any number of times. */
export async function hideSplash(): Promise<void> {
  if (hidden) return;
  hidden = true;

  // Wait for preventAutoHideAsync, but never longer than a beat.
  //
  // `await ready` on its own is a trap: if that promise never settles — it
  // doesn't in Expo Go — hideAsync() is never reached, and because `hidden` is
  // already latched no later call can retry. The result is the splash sitting
  // over a fully rendered, fully interactive app, with no error logged
  // anywhere to say why. Hiding is safe whether or not the prevent call
  // finished, so a stalled promise must not be able to block it.
  await Promise.race([ready, after(1000)]);
  await SplashScreen.hideAsync().catch(() => {});
}
