// src/services/purchase.ts
import { usePurchaseStore, PurchaseRecord } from "@/state/purchaseStore";
import { useRewardsStore } from "@/state/rewardsStore";

export type PurchaseVerificationResult = {
  success: boolean;
  orderId?: string;
  error?: string;
};

/**
 * Verify a purchase with Shopify and award rewards
 * This would integrate with your Shopify API to verify the order
 */
export async function verifyAndRecordPurchase(
  orderId: string,
  expectedSkus: string[],
  expectedTotalCents: number
): Promise<PurchaseVerificationResult> {
  try {
    // TODO: Replace with actual Shopify API call
    // For now, we'll simulate a successful verification
    const mockVerification = await mockShopifyVerification(orderId, expectedSkus, expectedTotalCents);
    
    if (!mockVerification.success) {
      return {
        success: false,
        error: mockVerification.error || "Purchase verification failed",
      };
    }

    // Record the purchase locally
    const purchaseStore = usePurchaseStore.getState();
    const rewardsStore = useRewardsStore.getState();
    
    // Add each purchased item to the purchase store
    for (const item of mockVerification.purchasedItems) {
      purchaseStore.addPurchase({
        sku: item.sku,
        name: item.name,
        priceCents: item.priceCents,
        quantity: item.quantity,
        orderId: orderId,
      });
    }
    
    // Award rewards (1 point per dollar spent)
    const totalRewards = Math.floor(expectedTotalCents / 100);
    rewardsStore.addPoints(totalRewards, `Purchase rewards for order ${orderId}`);
    
    return {
      success: true,
      orderId: orderId,
    };
    
  } catch (error) {
    console.error("Purchase verification error:", error);
    return {
      success: false,
      error: "Failed to verify purchase",
    };
  }
}

/**
 * Mock Shopify verification - replace with real API call
 */
async function mockShopifyVerification(
  orderId: string,
  expectedSkus: string[],
  expectedTotalCents: number
): Promise<{
  success: boolean;
  purchasedItems: Array<{
    sku: string;
    name: string;
    priceCents: number;
    quantity: number;
  }>;
  error?: string;
}> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // For now, always return success
  // In real implementation, this would call Shopify API to verify the order
  return {
    success: true,
    purchasedItems: expectedSkus.map(sku => ({
      sku,
      name: getProductName(sku),
      priceCents: getProductPrice(sku),
      quantity: 1,
    })),
  };
}

/**
 * Get product name by SKU - this should match your cart store
 */
function getProductName(sku: string): string {
  const SKU_NAME: Record<string, string> = {
    "fleur-serum": "Fleur Peptide Hair Serum",
    "fleur-derma-stamp": "Fleur Derma Stamp",
    "fleur-cleanser-generic": "Fleur Cleanser",
    "fleur-conditioner-generic": "Fleur Conditioner",
  };
  
  return SKU_NAME[sku] || sku;
}

/**
 * Get product price by SKU - this should match your cart store
 */
function getProductPrice(sku: string): number {
  const SKU_PRICE_CENTS: Record<string, number> = {
    "fleur-serum": 4800,
    "fleur-derma-stamp": 3000,
    "fleur-cleanser-generic": 1800,
    "fleur-conditioner-generic": 1800,
  };
  
  return SKU_PRICE_CENTS[sku] || 0;
}

/**
 * Handle successful checkout completion
 * This should be called after a successful Shopify checkout
 */
export async function handleSuccessfulCheckout(
  orderId: string,
  cartItems: Array<{ sku: string; quantity: number; priceCents: number }>
): Promise<PurchaseVerificationResult> {
  const expectedSkus = cartItems.map(item => item.sku);
  const expectedTotalCents = cartItems.reduce(
    (total, item) => total + (item.priceCents * item.quantity),
    0
  );
  
  return await verifyAndRecordPurchase(orderId, expectedSkus, expectedTotalCents);
}
