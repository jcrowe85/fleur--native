// src/services/firstTimeUser.ts
import { supabase } from "./supabase";

export interface FirstTimeUserData {
  isFirstLogin: boolean;
}

/**
 * Check if this is the user's first time accessing the app
 * This prevents users from rigging the app to get free points
 */
export async function checkFirstLogin(): Promise<FirstTimeUserData> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      // No session = first time user
      return {
        isFirstLogin: true
      };
    }

    // Check database for user's first login status
    const { data, error } = await supabase
      .from('profiles')
      .select('first_login')
      .eq('user_id', session.user.id)
      .single();

    if (error) {
      // If no record exists, this is a first-time user
      if (error.code === 'PGRST116') {
        return {
          isFirstLogin: true
        };
      }
      // If columns don't exist yet (migration not run), treat as first-time user
      if (error.code === '42703') { // column does not exist
        console.warn('Profile columns not yet added - treating as first-time user');
        return {
          isFirstLogin: true
        };
      }
      throw error;
    }

    return {
      isFirstLogin: data.first_login ?? true
    };
  } catch (error) {
    console.error('Error checking first login status:', error);
    // Default to first-time user on error
    return {
      isFirstLogin: true
    };
  }
}

/**
 * Mark user as no longer first login (signup bonus received)
 * This function is safe to call even if no session exists yet
 */
export async function markFirstLoginComplete(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      console.warn('No session found when marking first login complete - this is normal during app initialization');
      return true; // Return true since the bonus was awarded locally
    }

    // Update user profile to mark first login as complete
    const { error } = await supabase
      .from('profiles')
      .update({
        first_login: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', session.user.id);

    if (error) {
      // If columns don't exist yet (migration not run), just log and continue
      if (error.code === '42703') { // column does not exist
        console.warn('Profile columns not yet added - migration may not have been run yet');
        return true; // Still return true since the bonus was awarded locally
      }
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error marking first login complete:', error);
    return false;
  }
}

/**
 * Retry marking first login complete when session becomes available
 * This can be called later when the user is properly authenticated
 */
export async function retryMarkFirstLoginComplete(maxRetries: number = 3): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Session is available, try to mark complete
        return await markFirstLoginComplete();
      }
      
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    } catch (error) {
      console.log(`Retry ${i + 1} failed:`, error);
    }
  }
  
  console.warn('Failed to mark first login complete after retries - session may not be ready');
  return true; // Still return true since bonus was awarded locally
}
