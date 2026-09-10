// src/hooks/useRewardsPopup.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { useRewardsStore } from "@/state/rewardsStore";

type PopupData = {
  points: number;
  reason: string;
  description?: string;
};

/** Reward reasons that deserve a celebratory popup. */
const CELEBRATED_REASONS = new Set([
  "seven_day_streak_bonus",
  "post_engagement_likes",
  "post_engagement_comments",
  // "refer_friend" has its own FriendReferredPopup.
]);

/**
 * Shows a popup when a noteworthy reward lands.
 *
 * This used to expose a `checkForBigRewards()` that the app layout called on a
 * 1-second `setInterval`. Two problems: it woke the JS thread every second for
 * the entire life of the app, and it re-fired for the *same* ledger entry every
 * tick — so once a streak bonus landed, dismissing the popup just brought it
 * straight back, forever, until another reward displaced it.
 *
 * Now it subscribes to the store and fires once per new ledger entry.
 */
export function useRewardsPopup() {
  const [popupData, setPopupData] = useState<PopupData | null>(null);
  const [visible, setVisible] = useState(false);

  /** Ledger id of the most recent entry we have already reacted to. */
  const lastSeenIdRef = useRef<string | null>(
    useRewardsStore.getState().ledger[0]?.id ?? null
  );

  const showPopup = useCallback((data: PopupData) => {
    setPopupData(data);
    setVisible(true);
  }, []);

  const hidePopup = useCallback(() => {
    setVisible(false);
    // Clear the payload once the exit animation has finished.
    setTimeout(() => setPopupData(null), 300);
  }, []);

  useEffect(() => {
    const unsubscribe = useRewardsStore.subscribe((state) => {
      const latest = state.ledger[0];
      if (!latest || latest.id === lastSeenIdRef.current) return;

      lastSeenIdRef.current = latest.id;

      if (latest.delta > 0 && CELEBRATED_REASONS.has(latest.reason)) {
        showPopup({
          points: latest.delta,
          reason: latest.reason,
          description: latest.meta?.description,
        });
      }
    });

    return unsubscribe;
  }, [showPopup]);

  return { visible, popupData, showPopup, hidePopup };
}
