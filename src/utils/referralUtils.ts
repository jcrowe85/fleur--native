// src/utils/referralUtils.ts
import { useAuthStore } from "@/state/authStore";

/**
 * Generate a unique referral code for a user
 * Format: USER_ID_LAST_6_CHARS + TIMESTAMP_BASE36
 * Example: "ABC123-X7K9M"
 */
export function generateReferralCode(): string {
  try {
    const user = useAuthStore.getState().user;
    const userId = user?.id || "anonymous";
    
    // Get last 6 characters of user ID (or first 6 if shorter)
    const userPrefix = userId.slice(-6).toUpperCase();
    
    // Generate timestamp-based suffix
    const timestamp = Date.now().toString(36).toUpperCase();
    
    return `${userPrefix}-${timestamp}`;
  } catch (error) {
    console.error("Error generating referral code:", error);
    // Fallback to random code
    return `REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }
}

/**
 * Create a referral link with the generated code
 */
export function createReferralLink(referralCode: string): string {
  const baseUrl = "https://fleur.app/download";
  return `${baseUrl}?ref=${referralCode}`;
}

/**
 * Create an enhanced invite message with referral link
 */
export function createInviteMessage(referralCode: string, friendName?: string): string {
  const referralLink = createReferralLink(referralCode);
  
  const greeting = friendName ? `Hey ${friendName}!` : "Hey!";
  
  return `${greeting} I've been using Fleur for my hair care routine and it's been amazing. 

The app helps me track my hair health journey with personalized routines and expert recommendations. I think you'd love it too!

Check it out: ${referralLink}

#HairCare #FleurApp`;
}

/**
 * Validate a referral code format
 */
export function isValidReferralCode(code: string): boolean {
  // Format: 6 chars - 5 chars (e.g., "ABC123-X7K9M")
  const pattern = /^[A-Z0-9]{6}-[A-Z0-9]{5,}$/;
  return pattern.test(code);
}

/**
 * Extract referral code from a URL
 */
export function extractReferralCodeFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('ref');
  } catch (error) {
    console.error("Error extracting referral code from URL:", error);
    return null;
  }
}
