// src/services/cloudSyncService.ts
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';
import { usePlanStore } from '@/state/planStore';
import { useRoutineStore } from '@/state/routineStore';
import { useRewardsStore } from '@/state/rewardsStore';
import { useCartStore } from '@/state/cartStore';
import { usePurchaseStore } from '@/state/purchaseStore';
import { useNotificationStore } from '@/state/notificationStore';
import { useProfileStore } from '@/state/profileStore';
import { isGuestEmail } from '@/state/authStore';

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

      // Check if user is already logged in with a real email (not guest)
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser?.email && !isGuestEmail(currentUser.email)) {
        console.log('⚠️ User already logged in with real email, skipping syncToCloud');
        return { success: false, error: 'User is already logged in with a real account. Please sign out first.' };
      }

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

      // Get current user (should be the guest user)
      const { data: { user: guestUser } } = await supabase.auth.getUser();
      if (!guestUser) {
        this.syncStatus = 'error';
        return { success: false, error: 'No user session found. Please restart the app and try again.' };
      }

      console.log('Current user:', guestUser.email, '(guest:', isGuestEmail(guestUser.email), ')');

      // Try to sign in with the supplied credentials first. Success means the
      // email already has an account; failure with "Invalid login credentials"
      // means we should attach the email to the current guest instead.
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: sanitizedEmail,
          password: sanitizedPassword,
        });

      let user = signInData?.user ?? null;

      if (signInError) {
        if (!signInError.message.includes("Invalid login credentials")) {
          this.syncStatus = "error";
          return { success: false, error: this.getUserFriendlyError(signInError.message) };
        }

        // Promote the guest account by attaching this email + password.
        const { data: updateData, error: updateError } =
          await supabase.functions.invoke("link-email", {
            body: { email: sanitizedEmail, password: sanitizedPassword },
          });

        if (updateError) {
          this.syncStatus = "error";
          return {
            success: false,
            error: updateError.message || "Could not link that email. Please try again.",
          };
        }

        if (!updateData?.success || !updateData?.user) {
          this.syncStatus = "error";
          return {
            success: false,
            error: updateData?.error || "Could not link that email. Please try again.",
          };
        }

        // Re-read the session so `user` is a real Supabase user, not a stub.
        const { data: refreshed } = await supabase.auth.getUser();
        user = refreshed.user ?? ({ id: updateData.user.id, email: updateData.user.email } as any);
      } else {
        // Signing in above already replaced the guest session with the real
        // one. The previous implementation called supabase.auth.signOut() at
        // this point "to sign out the guest user", which destroyed the session
        // it had just established — getUser() then returned null and this path
        // always reported "Failed to switch to existing account", making it
        // impossible to sign back in on a second device.
        if (!user) {
          this.syncStatus = "error";
          return { success: false, error: "Could not complete sign in. Please try again." };
        }
      }

      if (!user?.id) {
        this.syncStatus = "error";
        return { success: false, error: "Could not complete sign in. Please try again." };
      }

      // Collect all local data
      const syncData = await this.collectLocalData(user.id, sanitizedEmail);

      // Upload full data to cloud
      const { error: uploadError } = await supabase
        .from('user_sync_data')
        .upsert(syncData, { onConflict: 'user_id' });

      if (uploadError) {
        this.syncStatus = 'error';
        console.error('❌ Database insert failed:', uploadError);
        return { success: false, error: uploadError.message };
      }

      // Only update sync status and auth store AFTER successful database insert
      this.syncStatus = 'synced';
      this.lastSyncAttempt = new Date();

      // Update auth store with user info (imported dynamically to avoid circular dependency)
      const { useAuthStore } = await import('@/state/authStore');
      useAuthStore.getState().setUser({
        id: user.id,
        email: user.email!,
        isCloudSynced: true,
      });

      console.log('✅ Cloud sync completed successfully - user marked as synced');
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

      // maybeSingle: a user with no backup yet is a normal state, not an error.
      // `.single()` returned PGRST116 here and the caller logged it as a failure.
      const { data: cloudData, error } = await supabase
        .from('user_sync_data')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching cloud data:', error);
        return { success: false, error: error.message };
      }

      if (!cloudData) {
        return { success: false, error: 'No cloud backup found for this account' };
      }

      console.log('🔍 Raw cloud data from database:', {
        hasRoutineData: !!cloudData.routine_data,
        routineDataType: typeof cloudData.routine_data,
        routineDataString: JSON.stringify(cloudData.routine_data).substring(0, 200) + '...'
      });

      // Restore local data.
      //
      // We deliberately do NOT clear local storage afterwards. The previous
      // implementation called clearLocalStorageAfterRestore() right here, which
      // deleted the persisted copies of the state it had just written — so the
      // restored routine, points and plan survived only until the next app
      // launch, at which point the user was back to an empty account.
      await this.restoreLocalData(cloudData);

      this.syncStatus = 'synced';
      this.lastSyncAttempt = new Date();

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /** Upload the current local state, regardless of sync frequency settings. */
  async pushLocalData(userId: string, email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const syncData = await this.collectLocalData(userId, email);
      const { error } = await supabase
        .from('user_sync_data')
        .upsert(syncData, { onConflict: 'user_id' });

      if (error) return { success: false, error: error.message };

      this.lastSyncAttempt = new Date();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async performBackgroundSync(): Promise<void> {
    if (!this.shouldSync()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return;

    const result = await this.pushLocalData(user.id, user.email);
    if (!result.success) console.warn('Background sync failed:', result.error);
  }

  async collectLocalData(userId: string, email: string): Promise<CloudSyncData> {
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
      },
      routine_data: {
        steps: routineData.steps,
        completedByDate: routineData.completedByDate,
        hasSeenScheduleIntro: routineData.hasSeenScheduleIntro,
        hasBeenCustomized: routineData.hasBeenCustomized,
        hasBuiltFromPlan: routineData.hasBuiltFromPlan,
        lastSavedFromScheduling: routineData.lastSavedFromScheduling,
      },
      rewards_data: {
        pointsTotal: rewardsData.pointsTotal,
        pointsAvailable: rewardsData.pointsAvailable,
        pointsHistory: rewardsData.pointsHistory,
        streakDays: rewardsData.streakDays,
        lastCheckInISO: rewardsData.lastCheckInISO,
        ledger: rewardsData.ledger,
        grants: rewardsData.grants,
        dailyRoutinePoints: rewardsData.dailyRoutinePoints,
        lastRoutineDate: rewardsData.lastRoutineDate,
        referralCount: rewardsData.referralCount,
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
        platform: Platform.OS,
        version: Constants.expoConfig?.version ?? 'unknown',
        last_active: new Date().toISOString(),
      },
    };
  }

  private async restoreLocalData(cloudData: CloudSyncData): Promise<void> {
    console.log('🔄 Restoring local data from cloud:', {
      hasPlanData: !!cloudData.plan_data,
      hasRoutineData: !!cloudData.routine_data,
      hasRewardsData: !!cloudData.rewards_data,
      hasCartData: !!cloudData.cart_data,
      hasPurchaseData: !!cloudData.purchase_data,
    });

    // Restore plan data
    if (cloudData.plan_data) {
      usePlanStore.setState({
        plan: cloudData.plan_data.plan,
      });
      console.log('✅ Plan data restored:', { hasPlan: !!cloudData.plan_data.plan });
    }

    // Restore routine data
    if (cloudData.routine_data) {
      console.log('🔍 Raw routine data from cloud:', {
        stepsLength: cloudData.routine_data.steps?.length || 0,
        stepsPreview: cloudData.routine_data.steps?.slice(0, 2) || [],
        hasBeenCustomized: cloudData.routine_data.hasBeenCustomized,
        hasBuiltFromPlan: cloudData.routine_data.hasBuiltFromPlan
      });
      
      // Only overwrite fields the backup actually carries. Spreading undefined
      // into the store used to null out `steps`, and every `steps.length` read
      // downstream then threw.
      const routine = cloudData.routine_data;
      useRoutineStore.setState({
        ...(Array.isArray(routine.steps) ? { steps: routine.steps } : {}),
        ...(routine.completedByDate ? { completedByDate: routine.completedByDate } : {}),
        hasSeenScheduleIntro: !!routine.hasSeenScheduleIntro,
        hasBeenCustomized: !!routine.hasBeenCustomized,
        hasBuiltFromPlan: !!routine.hasBuiltFromPlan,
        lastSavedFromScheduling: routine.lastSavedFromScheduling ?? null,
      });
      
      // Verify the data was actually set
      const verifyState = useRoutineStore.getState();
      console.log('✅ Routine data restored:', { 
        stepsCount: verifyState.steps?.length || 0,
        hasBeenCustomized: verifyState.hasBeenCustomized,
        stepsPreview: verifyState.steps?.slice(0, 2) || []
      });
    }

    // Restore rewards data
    if (cloudData.rewards_data) {
      useRewardsStore.setState({
        pointsTotal: cloudData.rewards_data.pointsTotal,
        pointsAvailable: cloudData.rewards_data.pointsAvailable,
        pointsHistory: cloudData.rewards_data.pointsHistory,
        streakDays: cloudData.rewards_data.streakDays,
        lastCheckInISO: cloudData.rewards_data.lastCheckInISO,
        ledger: cloudData.rewards_data.ledger,
        grants: cloudData.rewards_data.grants,
        dailyRoutinePoints: cloudData.rewards_data.dailyRoutinePoints,
        lastRoutineDate: cloudData.rewards_data.lastRoutineDate,
        referralCount: cloudData.rewards_data.referralCount,
      });
      console.log('✅ Rewards data restored:', { 
        pointsTotal: cloudData.rewards_data.pointsTotal,
        pointsAvailable: cloudData.rewards_data.pointsAvailable,
        ledgerLength: cloudData.rewards_data.ledger?.length || 0 
      });
    }

    // Restore cart data
    if (Array.isArray(cloudData.cart_data?.items)) {
      useCartStore.setState({
        items: cloudData.cart_data.items,
      });
      console.log('✅ Cart data restored:', { itemsCount: cloudData.cart_data.items?.length || 0 });
    }

    // Restore purchase data
    if (Array.isArray(cloudData.purchase_data?.purchases)) {
      usePurchaseStore.setState({
        purchases: cloudData.purchase_data.purchases,
      });
      console.log('✅ Purchase data restored:', { purchasesCount: cloudData.purchase_data.purchases?.length || 0 });
    }

    // Restore notification preferences
    if (cloudData.notification_preferences) {
      useNotificationStore.setState({
        preferences: cloudData.notification_preferences,
      });
      console.log('✅ Notification preferences restored');
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
      'already registered': 'An account with this email already exists. Please use a different email or sign in with your existing password.',
      'already exists': 'An account with this email already exists. Please use a different email or sign in with your existing password.',
    };

    // Return user-friendly error or generic message
    return errorMap[errorMessage] || 'An error occurred. Please try again.';
  }
}

// Export singleton instance
export const cloudSyncService = CloudSyncService.getInstance();
