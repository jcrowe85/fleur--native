// src/services/cloudSyncPromotionService.ts
import { notificationService } from './notificationService';
import { cloudSyncService } from './cloudSyncService';

export type SyncPromotionType = 
  | 'backup_data'
  | 'cross_device'
  | 'never_lose_data'
  | 'sync_progress'
  | 'secure_backup'
  | 'access_anywhere';

export interface SyncPromotionMessage {
  type: SyncPromotionType;
  title: string;
  body: string;
  actionText: string;
  priority: 'low' | 'medium' | 'high';
  cooldownDays: number; // Minimum days between this type of promotion
}

export class CloudSyncPromotionService {
  private static instance: CloudSyncPromotionService;
  private lastPromotionDates: Map<SyncPromotionType, Date> = new Map();
  private promotionCount: number = 0;

  static getInstance(): CloudSyncPromotionService {
    if (!CloudSyncPromotionService.instance) {
      CloudSyncPromotionService.instance = new CloudSyncPromotionService();
    }
    return CloudSyncPromotionService.instance;
  }

  private async getPromotionMessages(): Promise<SyncPromotionMessage[]> {
    try {
      // Try to fetch promotions from server first
      const serverUrl = process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:3000';
      const response = await fetch(`${serverUrl}/api/promotions/active/current-user`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.promotions && data.promotions.length > 0) {
          return data.promotions.map((promotion: any) => ({
            type: promotion.type,
            title: promotion.title,
            body: promotion.body,
            actionText: promotion.action_text,
            priority: promotion.priority,
            cooldownDays: promotion.cooldown_days,
          }));
        }
      }
    } catch (error) {
      console.warn('Failed to fetch server promotions, using fallback:', error);
    }

    // Fallback to hardcoded promotions
    return [
      {
        type: 'backup_data',
        title: 'Backup Your Hair Journey 📱',
        body: 'Keep your routine progress safe! Backup your data to never lose your hair care achievements.',
        actionText: 'Backup Now',
        priority: 'medium',
        cooldownDays: 30,
      },
      {
        type: 'cross_device',
        title: 'Access Your Data Anywhere 🌐',
        body: 'Switch between devices seamlessly! Sync your routine and progress across all your devices.',
        actionText: 'Sync Data',
        priority: 'medium',
        cooldownDays: 25,
      },
      {
        type: 'never_lose_data',
        title: 'Never Lose Your Progress 💾',
        body: 'Your hair care journey is precious. Secure it in the cloud so you never lose your routine or points.',
        actionText: 'Secure Now',
        priority: 'high',
        cooldownDays: 35,
      },
      {
        type: 'sync_progress',
        title: 'Sync Your Hair Care Progress 📊',
        body: 'Keep your routine streak and points safe across all devices. Never miss a day of progress!',
        actionText: 'Sync Progress',
        priority: 'medium',
        cooldownDays: 28,
      },
      {
        type: 'secure_backup',
        title: 'Secure Your Hair Care Data 🔒',
        body: 'Your personalized routine and progress deserve protection. Backup securely to the cloud.',
        actionText: 'Backup Securely',
        priority: 'high',
        cooldownDays: 40,
      },
      {
        type: 'access_anywhere',
        title: 'Your Hair Care, Anywhere 📱💻',
        body: 'Access your routine on your phone, tablet, or computer. Keep your hair care consistent everywhere.',
        actionText: 'Enable Sync',
        priority: 'low',
        cooldownDays: 20,
      },
    ];
  }

  async checkAndSendPromotion(): Promise<boolean> {
    // Don't send if user is already synced
    if (cloudSyncService.getStatus() === 'synced') {
      return false;
    }

    // Don't send if we've sent too many promotions recently
    if (this.promotionCount >= 3) {
      return false;
    }

    const availablePromotions = await this.getAvailablePromotions();
    if (availablePromotions.length === 0) {
      return false;
    }

    // Select promotion based on priority and randomness
    const selectedPromotion = this.selectPromotion(availablePromotions);
    if (!selectedPromotion) {
      return false;
    }

    // Send the promotion
    await this.sendPromotion(selectedPromotion);
    
    // Update tracking
    this.lastPromotionDates.set(selectedPromotion.type, new Date());
    this.promotionCount++;

    return true;
  }

  private async getAvailablePromotions(): Promise<SyncPromotionMessage[]> {
    const allPromotions = await this.getPromotionMessages();
    const now = new Date();

    return allPromotions.filter(promotion => {
      const lastSent = this.lastPromotionDates.get(promotion.type);
      if (!lastSent) return true;

      const daysSinceLastSent = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceLastSent >= promotion.cooldownDays;
    });
  }

  private selectPromotion(availablePromotions: SyncPromotionMessage[]): SyncPromotionMessage | null {
    if (availablePromotions.length === 0) return null;

    // Prioritize high priority promotions
    const highPriority = availablePromotions.filter(p => p.priority === 'high');
    if (highPriority.length > 0) {
      return highPriority[Math.floor(Math.random() * highPriority.length)];
    }

    // Then medium priority
    const mediumPriority = availablePromotions.filter(p => p.priority === 'medium');
    if (mediumPriority.length > 0) {
      return mediumPriority[Math.floor(Math.random() * mediumPriority.length)];
    }

    // Finally low priority
    const lowPriority = availablePromotions.filter(p => p.priority === 'low');
    if (lowPriority.length > 0) {
      return lowPriority[Math.floor(Math.random() * lowPriority.length)];
    }

    return null;
  }

  private async sendPromotion(promotion: SyncPromotionMessage): Promise<void> {
    await notificationService.schedulePromotionalNotification(
      promotion.title,
      promotion.body,
      {
        type: 'cloud_sync_promotion',
        promotionType: promotion.type,
        actionText: promotion.actionText,
        priority: promotion.priority,
      }
    );
  }

  async sendFirstLoginPromotion(): Promise<void> {
    // Special promotion for first-time users
    const firstLoginPromotion: SyncPromotionMessage = {
      type: 'backup_data',
      title: 'Welcome to Fleur! 🎉',
      body: 'Start your hair care journey right! Backup your data to keep your progress safe from day one.',
      actionText: 'Get Started',
      priority: 'high',
      cooldownDays: 0,
    };

    await this.sendPromotion(firstLoginPromotion);
  }

  async sendMonthlyReminder(): Promise<void> {
    // Monthly reminder with different messaging
    const monthlyPromotions = [
      {
        type: 'never_lose_data' as SyncPromotionType,
        title: 'Monthly Check-in: Secure Your Data 📅',
        body: 'It\'s been a while since you backed up your hair care progress. Keep your routine safe!',
        actionText: 'Backup Now',
        priority: 'medium' as const,
        cooldownDays: 0,
      },
      {
        type: 'cross_device' as SyncPromotionType,
        title: 'Monthly Reminder: Sync Your Progress 🔄',
        body: 'Your hair care routine deserves to be accessible everywhere. Sync your data today!',
        actionText: 'Sync Now',
        priority: 'medium' as const,
        cooldownDays: 0,
      },
    ];

    const selectedPromotion = monthlyPromotions[Math.floor(Math.random() * monthlyPromotions.length)];
    await this.sendPromotion(selectedPromotion);
  }

  // Reset promotion count (call this monthly or when user syncs)
  resetPromotionCount(): void {
    this.promotionCount = 0;
  }

  // Get promotion statistics
  getPromotionStats(): {
    totalPromotions: number;
    lastPromotionDate: Date | null;
    availablePromotions: number;
  } {
    const availablePromotions = this.getAvailablePromotions();
    const lastPromotionDate = Array.from(this.lastPromotionDates.values())
      .sort((a, b) => b.getTime() - a.getTime())[0] || null;

    return {
      totalPromotions: this.promotionCount,
      lastPromotionDate,
      availablePromotions: availablePromotions.length,
    };
  }

  // Public methods for triggering specific popups (used by notification service)
  showBackupPopup(): void {
    // This will be handled by the app layout's cloud sync popup
    console.log('Triggering backup popup');
  }

  showCrossDevicePopup(): void {
    console.log('Triggering cross device popup');
  }

  showNeverLoseDataPopup(): void {
    console.log('Triggering never lose data popup');
  }

  showSyncProgressPopup(): void {
    console.log('Triggering sync progress popup');
  }

  showSecureBackupPopup(): void {
    console.log('Triggering secure backup popup');
  }

  showAccessAnywherePopup(): void {
    console.log('Triggering access anywhere popup');
  }

  showPopup(title: string, message: string): void {
    console.log('Triggering generic popup:', title, message);
  }
}

// Export singleton instance
export const cloudSyncPromotionService = CloudSyncPromotionService.getInstance();
