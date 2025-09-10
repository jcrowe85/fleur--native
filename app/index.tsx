// app/index.tsx
import { useEffect } from "react";
import * as SplashScreen from "expo-splash-screen";
import OnboardingScreen from "../src/screens/OnboardingScreen"; // adjust path if needed
import WelcomeScreen from "../src/screens/WelcomeScreen"; // adjust path if needed
import SummaryScreen from "../src/screens/plan/SummaryScreen";


SplashScreen.preventAutoHideAsync().catch(() => {});

export default function Index() {
  useEffect(() => {
    (async () => {
      await new Promise(r => setTimeout(r, 1000));
      try { await SplashScreen.hideAsync(); } catch {}
    })();
  }, []);

  return <WelcomeScreen />;
}
