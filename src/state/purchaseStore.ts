// src/state/purchaseStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type PurchaseRecord = {
  id: string;
  sku: string;
  name: string;
  priceCents: number;
  quantity: number;
  purchaseDate: string; // ISO date string
  orderId?: string; // Shopify order ID if available
  rewardsAwarded: number; // Points awarded for this purchase
};

type PurchaseState = {
  purchases: PurchaseRecord[];
  addPurchase: (purchase: Omit<PurchaseRecord, "id" | "purchaseDate" | "rewardsAwarded">) => void;
  getPurchasedSkus: () => string[];
  hasPurchased: (sku: string) => boolean;
  getTotalSpent: () => number;
  getTotalRewardsEarned: () => number;
  clearAllPurchases: () => void;
  
  /** true after zustand has rehydrated from disk */
  _hydrated: boolean;
};

function generatePurchaseId(): string {
  return `purchase_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export const usePurchaseStore = create<PurchaseState>()(
  persist(
    (set, get) => ({
      purchases: [],
      
      addPurchase: (purchase) => {
        const rewardsAwarded = Math.floor(purchase.priceCents / 100); // 1 point per dollar
        const newPurchase: PurchaseRecord = {
          ...purchase,
          id: generatePurchaseId(),
          purchaseDate: new Date().toISOString(),
          rewardsAwarded,
        };
        
        set((state) => ({
          purchases: [...state.purchases, newPurchase],
        }));
        
        // Award points to the user for this purchase
        if (rewardsAwarded > 0) {
          // Import and use the rewards store to award points
          const { useRewardsStore } = require('./rewardsStore');
          const { earn } = useRewardsStore.getState();
          earn(rewardsAwarded, "purchase", { 
            purchaseId: newPurchase.id,
            sku: purchase.sku,
            amount: purchase.priceCents / 100
          });
        }
      },
      
      getPurchasedSkus: () => {
        return get().purchases.map(p => p.sku);
      },
      
      hasPurchased: (sku: string) => {
        return get().purchases.some(p => p.sku === sku);
      },
      
      getTotalSpent: () => {
        return get().purchases.reduce((total, purchase) => 
          total + (purchase.priceCents * purchase.quantity), 0
        );
      },
      
      getTotalRewardsEarned: () => {
        return get().purchases.reduce((total, purchase) => 
          total + purchase.rewardsAwarded, 0
        );
      },
      
      clearAllPurchases: () => {
        set({ purchases: [] });
      },
      
      _hydrated: false,
    }),
    {
      name: "fleur-purchases-v1",
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist purchases (not _hydrated)
      partialize: (s) => ({ purchases: s.purchases }),
    }
  )
);

// Flip _hydrated once persistence finishes so the app can gate routing.
usePurchaseStore.persist?.onFinishHydration?.(() => {
  usePurchaseStore.setState({ _hydrated: true });
});
