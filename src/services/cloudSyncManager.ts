// src/services/cloudSyncManager.ts
import { AppState, type AppStateStatus, type NativeEventSubscription } from 'react-native';
import { cloudSyncService } from './cloudSyncService';
import { cloudSyncPromotionService } from './cloudSyncPromotionService';

export class CloudSyncManager {
  private static instance: CloudSyncManager;
  private promotionCheckInterval: NodeJS.Timeout | null = null;
  private backgroundSyncInterval: NodeJS.Timeout | null = null;
  private appStateSubscription: NativeEventSubscription | null = null;
  private isInitialized = false;

  static getInstance(): CloudSyncManager {
    if (!CloudSyncManager.instance) {
      CloudSyncManager.instance = new CloudSyncManager();
    }
    return CloudSyncManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize cloud sync service
      await cloudSyncService.initialize();

      // Start promotion checking (check every 6 hours)
      this.startPromotionChecking();

      // Start background sync (check every 30 minutes)
      this.startBackgroundSync();

      this.appStateSubscription = AppState.addEventListener(
        'change',
        this.handleAppStateChange
      );

      this.isInitialized = true;
      console.log('Cloud sync manager initialized');
    } catch (error) {
      console.error('Failed to initialize cloud sync manager:', error);
    }
  }

  private startPromotionChecking(): void {
    this.promotionCheckInterval = setInterval(() => {
      this.checkAndSendPromotion().catch((error) =>
        console.error('Error checking for promotions:', error)
      );
    }, 6 * 60 * 60 * 1000);

    this.checkAndSendPromotion().catch(() => {});
  }

  private startBackgroundSync(): void {
    this.backgroundSyncInterval = setInterval(() => {
      this.performBackgroundSync().catch((error) =>
        console.error('Error performing background sync:', error)
      );
    }, 30 * 60 * 1000);
  }

  /**
   * Timers do not run reliably while the app is backgrounded, and holding them
   * open drains battery. Pause on background and sync once on resume, which is
   * what the 30-minute timer was really trying to achieve.
   */
  private handleAppStateChange = (next: AppStateStatus): void => {
    if (next === 'active') {
      if (!this.backgroundSyncInterval) this.startBackgroundSync();
      this.performBackgroundSync().catch(() => {});
    } else if (this.backgroundSyncInterval) {
      clearInterval(this.backgroundSyncInterval);
      this.backgroundSyncInterval = null;
    }
  };

  private async checkAndSendPromotion(): Promise<void> {
    // Import authStore dynamically to avoid circular dependency
    const { useAuthStore } = await import('@/state/authStore');
    const { isCloudSynced } = useAuthStore.getState();
    
    // Don't send promotions if user is already synced
    if (isCloudSynced) {
      return;
    }

    // Check if we should send a promotion
    const sent = await cloudSyncPromotionService.checkAndSendPromotion();
    if (sent) {
      console.log('Cloud sync promotion sent');
    }
  }

  private async performBackgroundSync(): Promise<void> {
    // Import authStore dynamically to avoid circular dependency
    const { useAuthStore } = await import('@/state/authStore');
    const { isCloudSynced } = useAuthStore.getState();
    
    // Only perform background sync if user is synced
    if (!isCloudSynced) {
      return;
    }

    await cloudSyncService.performBackgroundSync();
  }

  async sendFirstLoginPromotion(): Promise<void> {
    // Import authStore dynamically to avoid circular dependency
    const { useAuthStore } = await import('@/state/authStore');
    const { isCloudSynced } = useAuthStore.getState();
    
    if (!isCloudSynced) {
      await cloudSyncPromotionService.sendFirstLoginPromotion();
    }
  }

  async sendMonthlyReminder(): Promise<void> {
    // Import authStore dynamically to avoid circular dependency
    const { useAuthStore } = await import('@/state/authStore');
    const { isCloudSynced } = useAuthStore.getState();
    
    if (!isCloudSynced) {
      await cloudSyncPromotionService.sendMonthlyReminder();
    }
  }

  async onUserSync(): Promise<void> {
    // Reset promotion count when user syncs
    cloudSyncPromotionService.resetPromotionCount();
    
    // Note: We no longer update the auth store here to prevent false positive sync states.
    // The cloudSyncService handles auth store updates after successful database operations.
    console.log('✅ User sync completed - promotion count reset');
  }

  async onDataChange(): Promise<void> {
    // Import authStore dynamically to avoid circular dependency
    const { useAuthStore } = await import('@/state/authStore');
    const { isCloudSynced } = useAuthStore.getState();
    
    // If user is synced and frequency is immediate, sync right away
    if (isCloudSynced && cloudSyncService.getSyncFrequency() === 'immediate') {
      await cloudSyncService.performBackgroundSync();
    }
  }

  // Cleanup method
  destroy(): void {
    if (this.promotionCheckInterval) {
      clearInterval(this.promotionCheckInterval);
      this.promotionCheckInterval = null;
    }

    if (this.backgroundSyncInterval) {
      clearInterval(this.backgroundSyncInterval);
      this.backgroundSyncInterval = null;
    }

    this.appStateSubscription?.remove();
    this.appStateSubscription = null;

    this.isInitialized = false;
  }

  // Get sync statistics
  async getSyncStats() {
    return {
      syncStatus: cloudSyncService.getStatus(),
      lastSyncAttempt: cloudSyncService.getLastSyncAttempt(),
      syncFrequency: cloudSyncService.getSyncFrequency(),
      promotionStats: await cloudSyncPromotionService.getPromotionStats(),
    };
  }
}

// Export singleton instance
export const cloudSyncManager = CloudSyncManager.getInstance();
