// src/services/cloudSyncService.ts
import { supabase } from './supabase';
import { useAuthStore } from '@/state/authStore';
import { usePlanStore } from '@/state/planStore';
import { useRoutineStore } from '@/state/routineStore';
import { useRewardsStore } from '@/state/rewardsStore';
import { useCartStore } from '@/state/cartStore';
import { usePurchaseStore } from '@/state/purchaseStore';
import { useNotificationStore } from '@/state/notificationStore';

export type SyncStatus = 'not_synced' | 'syncing' | 'synced' | 'error';
export type SyncFrequency = 'immediate' | 'daily' | 'weekly' | 'manual';

export interface CloudSyncData {
  user_id: string;
  email: string;
  plan_data: any;
  routine_data: any;
  rewards_data: any;
  cart_data: any;
  purchase_data: any;
  notification_preferences: any;
  last_synced: string;
  sync_frequency: SyncFrequency;
  device_info: {
    platform: string;
    version: string;
    last_active: string;
  };
}

export class CloudSyncService {
  private static instance: CloudSyncService;
  private syncStatus: SyncStatus = 'not_synced';
  private lastSyncAttempt: Date | null = null;
  private syncFrequency: SyncFrequency = 'daily';
  private isOnline: boolean = true;
  private lastAuthAttempt: number | null = null;

  static getInstance(): CloudSyncService {
    if (!CloudSyncService.instance) {
      CloudSyncService.instance = new CloudSyncService();
    }
    return CloudSyncService.instance;
  }

  async initialize(): Promise<void> {
    // Check if user is already synced
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await this.checkSyncStatus(user.id);
    }
  }

  async syncToCloud(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      this.syncStatus = 'syncing';

      // Input validation and sanitization
      const sanitizedEmail = email.trim().toLowerCase();
      const sanitizedPassword = password.trim();

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(sanitizedEmail)) {
        this.syncStatus = 'error';
        return { success: false, error: 'Please enter a valid email address' };
      }

      // Validate password strength
      if (sanitizedPassword.length < 8) {
        this.syncStatus = 'error';
        return { success: false, error: 'Password must be at least 8 characters long' };
      }

      // Check for common weak passwords
      const weakPasswords = ['password', '12345678', 'qwerty123', 'password123'];
      if (weakPasswords.includes(sanitizedPassword.toLowerCase())) {
        this.syncStatus = 'error';
        return { success: false, error: 'Please choose a stronger password' };
      }

      // Rate limiting check (basic implementation)
      const now = Date.now();
      const lastAttempt = this.getLastAuthAttempt();
      if (lastAttempt && now - lastAttempt < 5000) { // 5 second cooldown
        this.syncStatus = 'error';
        return { success: false, error: 'Please wait before trying again' };
      }
      this.setLastAuthAttempt(now);

      // Create or sign in user with enhanced error handling
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password: sanitizedPassword,
      });

      if (authError) {
        // If sign in fails, try to sign up
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: sanitizedEmail,
          password: sanitizedPassword,
          options: {
            data: {
              created_at: new Date().toISOString(),
              app_version: '1.0.0',
              platform: 'mobile'
            }
          }
        });

        if (signUpError) {
          this.syncStatus = 'error';
          // Don't expose internal error details for security
          const userFriendlyError = this.getUserFriendlyError(signUpError.message);
          return { success: false, error: userFriendlyError };
        }
      }

      const user = authData?.user || (await supabase.auth.getUser()).data.user;
      if (!user) {
        this.syncStatus = 'error';
        return { success: false, error: 'Authentication failed. Please try again.' };
      }

      // Collect all local data
      const syncData = await this.collectLocalData(user.id, email);

      // Upload to cloud
      const { error: uploadError } = await supabase
        .from('user_sync_data')
        .upsert(syncData, { onConflict: 'user_id' });

      if (uploadError) {
        this.syncStatus = 'error';
        return { success: false, error: uploadError.message };
      }

      this.syncStatus = 'synced';
      this.lastSyncAttempt = new Date();

      // Update auth store with user info
      useAuthStore.getState().setUser({
        id: user.id,
        email: user.email!,
        isCloudSynced: true,
      });

      return { success: true };
    } catch (error) {
      this.syncStatus = 'error';
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async syncFromCloud(): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'No authenticated user' };
      }

      // Fetch cloud data
      const { data: cloudData, error } = await supabase
        .from('user_sync_data')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      if (!cloudData) {
        return { success: false, error: 'No cloud data found' };
      }

      // Restore local data
      await this.restoreLocalData(cloudData);

      this.syncStatus = 'synced';
      this.lastSyncAttempt = new Date();

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async performBackgroundSync(): Promise<void> {
    if (!this.shouldSync()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const syncData = await this.collectLocalData(user.id, user.email!);
      
      await supabase
        .from('user_sync_data')
        .upsert(syncData, { onConflict: 'user_id' });

      this.lastSyncAttempt = new Date();
    } catch (error) {
      console.error('Background sync failed:', error);
    }
  }

  private async collectLocalData(userId: string, email: string): Promise<CloudSyncData> {
    const planData = usePlanStore.getState();
    const routineData = useRoutineStore.getState();
    const rewardsData = useRewardsStore.getState();
    const cartData = useCartStore.getState();
    const purchaseData = usePurchaseStore.getState();
    const notificationData = useNotificationStore.getState();

    return {
      user_id: userId,
      email,
      plan_data: {
        plan: planData.plan,
        hasSeenScheduleIntro: planData.hasSeenScheduleIntro,
      },
      routine_data: {
        steps: routineData.steps,
        completedByDate: routineData.completedByDate,
        hasSeenScheduleIntro: routineData.hasSeenScheduleIntro,
      },
      rewards_data: {
        pointsTotal: rewardsData.pointsTotal,
        pointsHistory: rewardsData.pointsHistory,
      },
      cart_data: {
        items: cartData.items,
      },
      purchase_data: {
        purchases: purchaseData.purchases,
      },
      notification_preferences: notificationData.preferences,
      last_synced: new Date().toISOString(),
      sync_frequency: this.syncFrequency,
      device_info: {
        platform: 'mobile', // You can get actual platform info
        version: '1.0.0', // You can get actual app version
        last_active: new Date().toISOString(),
      },
    };
  }

  private async restoreLocalData(cloudData: CloudSyncData): Promise<void> {
    // Restore plan data
    if (cloudData.plan_data) {
      usePlanStore.setState({
        plan: cloudData.plan_data.plan,
        hasSeenScheduleIntro: cloudData.plan_data.hasSeenScheduleIntro,
      });
    }

    // Restore routine data
    if (cloudData.routine_data) {
      useRoutineStore.setState({
        steps: cloudData.routine_data.steps,
        completedByDate: cloudData.routine_data.completedByDate,
        hasSeenScheduleIntro: cloudData.routine_data.hasSeenScheduleIntro,
      });
    }

    // Restore rewards data
    if (cloudData.rewards_data) {
      useRewardsStore.setState({
        pointsTotal: cloudData.rewards_data.pointsTotal,
        pointsHistory: cloudData.rewards_data.pointsHistory,
      });
    }

    // Restore cart data
    if (cloudData.cart_data) {
      useCartStore.setState({
        items: cloudData.cart_data.items,
      });
    }

    // Restore purchase data
    if (cloudData.purchase_data) {
      usePurchaseStore.setState({
        purchases: cloudData.purchase_data.purchases,
      });
    }

    // Restore notification preferences
    if (cloudData.notification_preferences) {
      useNotificationStore.setState({
        preferences: cloudData.notification_preferences,
      });
    }
  }

  private shouldSync(): boolean {
    if (!this.isOnline) return false;
    if (this.syncStatus === 'syncing') return false;

    const now = new Date();
    const lastSync = this.lastSyncAttempt;

    if (!lastSync) return true;

    switch (this.syncFrequency) {
      case 'immediate':
        return true;
      case 'daily':
        return now.getTime() - lastSync.getTime() > 24 * 60 * 60 * 1000;
      case 'weekly':
        return now.getTime() - lastSync.getTime() > 7 * 24 * 60 * 60 * 1000;
      case 'manual':
        return false;
      default:
        return false;
    }
  }

  private async checkSyncStatus(userId: string): Promise<void> {
    try {
      const { data } = await supabase
        .from('user_sync_data')
        .select('last_synced, sync_frequency')
        .eq('user_id', userId)
        .single();

      if (data) {
        this.syncStatus = 'synced';
        this.lastSyncAttempt = new Date(data.last_synced);
        this.syncFrequency = data.sync_frequency || 'daily';
      }
    } catch (error) {
      console.error('Failed to check sync status:', error);
    }
  }

  // Getters
  getStatus(): SyncStatus {
    return this.syncStatus;
  }

  getLastSyncAttempt(): Date | null {
    return this.lastSyncAttempt;
  }

  getSyncFrequency(): SyncFrequency {
    return this.syncFrequency;
  }

  setSyncFrequency(frequency: SyncFrequency): void {
    this.syncFrequency = frequency;
  }

  setOnlineStatus(isOnline: boolean): void {
    this.isOnline = isOnline;
  }

  // Security helper methods
  private getLastAuthAttempt(): number | null {
    return this.lastAuthAttempt;
  }

  private setLastAuthAttempt(timestamp: number): void {
    this.lastAuthAttempt = timestamp;
  }

  private getUserFriendlyError(errorMessage: string): string {
    // Map internal Supabase errors to user-friendly messages
    const errorMap: Record<string, string> = {
      'Invalid login credentials': 'Invalid email or password. Please check your credentials and try again.',
      'Email not confirmed': 'Please check your email and click the confirmation link before signing in.',
      'User already registered': 'An account with this email already exists. Please sign in instead.',
      'Password should be at least 6 characters': 'Password must be at least 8 characters long.',
      'Signup is disabled': 'Account creation is currently disabled. Please contact support.',
      'Email rate limit exceeded': 'Too many attempts. Please wait a few minutes before trying again.',
      'Password rate limit exceeded': 'Too many password attempts. Please wait before trying again.',
    };

    // Return user-friendly error or generic message
    return errorMap[errorMessage] || 'An error occurred. Please try again.';
  }
}

// Export singleton instance
export const cloudSyncService = CloudSyncService.getInstance();
