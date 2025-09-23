// src/utils/testSignupBonus.ts
import { useRewardsStore } from "@/state/rewardsStore";

export const resetSignupBonusForTesting = () => {
  const { grants } = useRewardsStore.getState();
  console.log("Current grants before reset:", grants);
  
  // Reset the signup bonus grant
  useRewardsStore.setState((state) => ({
    grants: {
      ...state.grants,
      signupBonus: undefined,
    },
  }));
  
  console.log("Signup bonus reset for testing");
  console.log("New grants:", useRewardsStore.getState().grants);
};

export const checkSignupBonusStatus = () => {
  const { grants, pointsAvailable } = useRewardsStore.getState();
  console.log("=== Signup Bonus Status ===");
  console.log("Signup bonus awarded:", grants.signupBonus);
  console.log("Current points:", pointsAvailable);
  console.log("All grants:", grants);
  console.log("========================");
};

export const resetAllForTesting = () => {
  // Reset signup bonus
  useRewardsStore.setState((state) => ({
    grants: {
      ...state.grants,
      signupBonus: undefined,
    },
  }));
  
  // Reset check-in popup shown date
  const { useCheckInStore } = require("@/state/checkinStore");
  useCheckInStore.getState().resetAll();
  
  console.log("All testing data reset - restart app to test signup bonus flow");
};
