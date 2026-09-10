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

/** Hide the splash. Safe to call from anywhere, any number of times. */
export async function hideSplash(): Promise<void> {
  if (hidden) return;
  hidden = true;
  await ready;
  await SplashScreen.hideAsync().catch(() => {});
}
