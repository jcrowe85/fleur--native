// src/services/notificationExamples.ts
// Example usage of the notification system for testing and admin purposes

import { promotionalNotificationService } from './promotionalNotificationService';
import { notificationService } from './notificationService';

export class NotificationExamples {
  // Example: Send a flash sale notification
  static async sendFlashSaleExample(): Promise<void> {
    await promotionalNotificationService.sendFlashSaleNotification(
      'Bloom Hair+Scalp Serum',
      25,
      6 // 6 hours remaining
    );
  }

  // Example: Send a new product launch notification
  static async sendNewProductExample(): Promise<void> {
    await promotionalNotificationService.sendNewProductLaunch(
      'Silk Pillowcase',
      true // exclusive early access
    );
  }

  // Example: Send a seasonal promotion
  static async sendSeasonalPromotionExample(): Promise<void> {
    await promotionalNotificationService.sendSeasonalPromotion(
      'spring',
      20 // 20% off
    );
  }

  // Example: Send a personalized offer
  static async sendPersonalizedOfferExample(): Promise<void> {
    await promotionalNotificationService.sendPersonalizedOffer(
      'Sarah',
      'Gentle Shampoo',
      15,
      'We noticed you love our gentle formulas!'
    );
  }

  // Example: Send a cart abandonment reminder
  static async sendCartReminderExample(): Promise<void> {
    await promotionalNotificationService.sendCartAbandonmentReminder(
      [
        { name: 'Bloom Hair+Scalp Serum', price: 48.00 },
        { name: 'Gentle Shampoo', price: 28.00 }
      ],
      24 // 24 hours since abandonment
    );
  }

  // Example: Send a points milestone notification
  static async sendPointsMilestoneExample(): Promise<void> {
    await promotionalNotificationService.sendPointsMilestone(
      500,
      'first_500'
    );
  }

  // Example: Send a routine streak notification
  static async sendRoutineStreakExample(): Promise<void> {
    await promotionalNotificationService.sendRoutineStreak(
      14,
      'Sarah'
    );
  }

  // Example: Send an educational tip
  static async sendEducationalTipExample(): Promise<void> {
    await promotionalNotificationService.sendEducationalTip(
      'Winter Hair Care',
      'Protect your hair from harsh winter weather by using a leave-in conditioner and avoiding excessive heat styling.',
      'seasonal'
    );
  }

  // Example: Send a routine reminder (this would be called automatically)
  static async sendRoutineReminderExample(): Promise<void> {
    // This is typically called automatically when routines are saved
    // But you can test it manually
    const mockRoutineSteps = [
      {
        id: '1',
        name: 'Bloom Hair+Scalp Serum',
        enabled: true,
        period: 'morning' as const,
        time: '8:00 AM',
        frequency: 'Daily' as const,
        days: [1, 2, 3, 4, 5], // Monday to Friday
        instructions: 'Apply 3-4 drops to clean scalp',
        product: 'Bloom Hair+Scalp Serum',
        icon: 'droplet',
      },
      {
        id: '2',
        name: 'Gentle Shampoo',
        enabled: true,
        period: 'evening' as const,
        time: '8:00 PM',
        frequency: '3x/week' as const,
        days: [1, 3, 5], // Monday, Wednesday, Friday
        instructions: 'Massage into wet hair and scalp',
        product: 'Gentle Shampoo',
        icon: 'zap',
      }
    ];

    await notificationService.scheduleRoutineNotifications(mockRoutineSteps);
  }

  // Test all notification types
  static async testAllNotifications(): Promise<void> {
    console.log('Testing all notification types...');
    
    try {
      await this.sendFlashSaleExample();
      console.log('✅ Flash sale notification sent');
      
      await this.sendNewProductExample();
      console.log('✅ New product notification sent');
      
      await this.sendSeasonalPromotionExample();
      console.log('✅ Seasonal promotion sent');
      
      await this.sendPersonalizedOfferExample();
      console.log('✅ Personalized offer sent');
      
      await this.sendCartReminderExample();
      console.log('✅ Cart reminder sent');
      
      await this.sendPointsMilestoneExample();
      console.log('✅ Points milestone sent');
      
      await this.sendRoutineStreakExample();
      console.log('✅ Routine streak sent');
      
      await this.sendEducationalTipExample();
      console.log('✅ Educational tip sent');
      
      await this.sendRoutineReminderExample();
      console.log('✅ Routine reminder scheduled');
      
      console.log('🎉 All notification tests completed successfully!');
    } catch (error) {
      console.error('❌ Error testing notifications:', error);
    }
  }
}

// Export for easy testing
export const notificationExamples = NotificationExamples;
