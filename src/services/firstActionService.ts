// src/services/firstActionService.ts
import { supabase } from './supabase';

export class FirstActionService {
  /**
   * Check if user has performed their first action from Supabase
   */
  static async hasPerformedFirstAction(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('has_performed_first_action')
        .eq('id', user.id)
        .single();

      if (error) {
        console.warn('Failed to fetch first action status:', error);
        return false; // Default to false if we can't fetch
      }

      return profile?.has_performed_first_action || false;
    } catch (error) {
      console.warn('Error checking first action status:', error);
      return false;
    }
  }

  /**
   * Mark that user has performed their first action in Supabase
   */
  static async markFirstActionPerformed(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          has_performed_first_action: true,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to mark first action as performed:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error marking first action as performed:', error);
      return false;
    }
  }

  /**
   * Sync local state with Supabase state
   * Returns the authoritative state from Supabase
   */
  static async syncFirstActionState(localState: boolean): Promise<boolean> {
    try {
      const cloudState = await this.hasPerformedFirstAction();
      
      // If cloud says user has performed first action, use that
      if (cloudState) {
        return true;
      }
      
      // If local says user has performed first action but cloud doesn't, sync to cloud
      if (localState && !cloudState) {
        const success = await this.markFirstActionPerformed();
        return success;
      }
      
      // Otherwise, use local state
      return localState;
    } catch (error) {
      console.warn('Error syncing first action state:', error);
      return localState; // Fall back to local state
    }
  }
}
