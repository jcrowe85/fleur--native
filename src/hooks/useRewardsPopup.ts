// src/hooks/useRewardsPopup.ts
import { useState, useCallback } from "react";
import { useRewardsStore } from "@/state/rewardsStore";

type PopupData = {
  points: number;
  reason: string;
  description?: string;
};

export function useRewardsPopup() {
  const [popupData, setPopupData] = useState<PopupData | null>(null);
  const [visible, setVisible] = useState(false);

  const showPopup = useCallback((data: PopupData) => {
    setPopupData(data);
    setVisible(true);
  }, []);

  const hidePopup = useCallback(() => {
    setVisible(false);
    // Clear data after animation completes
    setTimeout(() => {
      setPopupData(null);
    }, 300);
  }, []);

  // Monitor rewards store for big rewards
  const ledger = useRewardsStore((s) => s.ledger);
  
  // Check for big rewards that should trigger popup
  const checkForBigRewards = useCallback(() => {
    if (ledger.length === 0) return;
    
    const latestEntry = ledger[0];
    const shouldShowPopup = [
      "seven_day_streak_bonus",
      "post_engagement_likes", 
      "post_engagement_comments",
      "refer_friend",
    ].includes(latestEntry.reason);

    if (shouldShowPopup && latestEntry.delta > 0) {
      showPopup({
        points: latestEntry.delta,
        reason: latestEntry.reason,
        description: latestEntry.meta?.description,
      });
    }
  }, [ledger, showPopup]);

  return {
    visible,
    popupData,
    showPopup,
    hidePopup,
    checkForBigRewards,
  };
}
