// src/services/cloudSyncManager.ts
import { cloudSyncService } from './cloudSyncService';
import { cloudSyncPromotionService } from './cloudSyncPromotionService';
import { useAuthStore } from '@/state/authStore';

export class CloudSyncManager {
  private static instance: CloudSyncManager;
  private promotionCheckInterval: NodeJS.Timeout | null = null;
  private backgroundSyncInterval: NodeJS.Timeout | null = null;
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

      this.isInitialized = true;
      console.log('Cloud sync manager initialized');
    } catch (error) {
      console.error('Failed to initialize cloud sync manager:', error);
    }
  }

  private startPromotionChecking(): void {
    // Check for promotions every 6 hours
    this.promotionCheckInterval = setInterval(async () => {
      try {
        await this.checkAndSendPromotion();
      } catch (error) {
        console.error('Error checking for promotions:', error);
      }
    }, 6 * 60 * 60 * 1000); // 6 hours

    // Also check immediately
    this.checkAndSendPromotion();
  }

  private startBackgroundSync(): void {
    // Perform background sync every 30 minutes
    this.backgroundSyncInterval = setInterval(async () => {
      try {
        await this.performBackgroundSync();
      } catch (error) {
        console.error('Error performing background sync:', error);
      }
    }, 30 * 60 * 1000); // 30 minutes
  }

  private async checkAndSendPromotion(): Promise<void> {
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
    const { isCloudSynced } = useAuthStore.getState();
    
    // Only perform background sync if user is synced
    if (!isCloudSynced) {
      return;
    }

    await cloudSyncService.performBackgroundSync();
  }

  async sendFirstLoginPromotion(): Promise<void> {
    const { isCloudSynced } = useAuthStore.getState();
    
    if (!isCloudSynced) {
      await cloudSyncPromotionService.sendFirstLoginPromotion();
    }
  }

  async sendMonthlyReminder(): Promise<void> {
    const { isCloudSynced } = useAuthStore.getState();
    
    if (!isCloudSynced) {
      await cloudSyncPromotionService.sendMonthlyReminder();
    }
  }

  async onUserSync(): Promise<void> {
    // Reset promotion count when user syncs
    cloudSyncPromotionService.resetPromotionCount();
    
    // Update auth store
    const { data: { user } } = await cloudSyncService['supabase'].auth.getUser();
    if (user) {
      useAuthStore.getState().setUser({
        id: user.id,
        email: user.email!,
        isCloudSynced: true,
      });
    }
  }

  async onDataChange(): Promise<void> {
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

    this.isInitialized = false;
  }

  // Get sync statistics
  getSyncStats() {
    return {
      syncStatus: cloudSyncService.getStatus(),
      lastSyncAttempt: cloudSyncService.getLastSyncAttempt(),
      syncFrequency: cloudSyncService.getSyncFrequency(),
      promotionStats: cloudSyncPromotionService.getPromotionStats(),
    };
  }
}

// Export singleton instance
export const cloudSyncManager = CloudSyncManager.getInstance();
