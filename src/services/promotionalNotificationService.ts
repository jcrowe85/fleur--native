// src/services/promotionalNotificationService.ts
import { notificationService } from './notificationService';
import { useNotificationStore } from '@/state/notificationStore';

export class PromotionalNotificationService {
  private static instance: PromotionalNotificationService;

  static getInstance(): PromotionalNotificationService {
    if (!PromotionalNotificationService.instance) {
      PromotionalNotificationService.instance = new PromotionalNotificationService();
    }
    return PromotionalNotificationService.instance;
  }

  async sendFlashSaleNotification(
    productName: string,
    discountPercent: number,
    hoursRemaining: number
  ): Promise<void> {
    const title = `🔥 ${discountPercent}% Off ${productName}!`;
    const body = `Limited time offer! Only ${hoursRemaining} hours left. Don't miss out on this amazing deal!`;
    
    await notificationService.schedulePromotionalNotification(
      title,
      body,
      {
        type: 'flash_sale',
        productName,
        discountPercent,
        hoursRemaining,
      }
    );
  }

  async sendNewProductLaunch(
    productName: string,
    isExclusive: boolean = false
  ): Promise<void> {
    const title = isExclusive 
      ? `✨ Exclusive: ${productName} is here!`
      : `🆕 New Product: ${productName}`;
    const body = isExclusive
      ? `Be the first to try our latest hair care innovation. Exclusive early access for you!`
      : `Discover our newest addition to the Fleur collection. Perfect for your hair care routine!`;
    
    await notificationService.schedulePromotionalNotification(
      title,
      body,
      {
        type: 'new_product',
        productName,
        isExclusive,
      }
    );
  }

  async sendSeasonalPromotion(
    season: 'spring' | 'summer' | 'fall' | 'winter',
    discountPercent: number
  ): Promise<void> {
    const seasonEmojis = {
      spring: '🌸',
      summer: '☀️',
      fall: '🍂',
      winter: '❄️'
    };
    
    const seasonNames = {
      spring: 'Spring',
      summer: 'Summer', 
      fall: 'Fall',
      winter: 'Winter'
    };

    const title = `${seasonEmojis[season]} ${seasonNames[season]} Hair Care Sale`;
    const body = `Get ${discountPercent}% off your entire order! Perfect time to refresh your hair care routine for ${seasonNames[season].toLowerCase()}.`;
    
    await notificationService.schedulePromotionalNotification(
      title,
      body,
      {
        type: 'seasonal_sale',
        season,
        discountPercent,
      }
    );
  }

  async sendPersonalizedOffer(
    userName: string,
    productName: string,
    discountPercent: number,
    reason: string
  ): Promise<void> {
    const title = `Hi ${userName}! Special offer just for you 💝`;
    const body = `Since you love ${productName}, here's ${discountPercent}% off your next order. ${reason}`;
    
    await notificationService.schedulePromotionalNotification(
      title,
      body,
      {
        type: 'personalized_offer',
        userName,
        productName,
        discountPercent,
        reason,
      }
    );
  }

  async sendCartAbandonmentReminder(
    cartItems: Array<{ name: string; price: number }>,
    hoursSinceAbandonment: number
  ): Promise<void> {
    const totalItems = cartItems.length;
    const totalValue = cartItems.reduce((sum, item) => sum + item.price, 0);
    const productNames = cartItems.map(item => item.name).join(', ');

    const title = `Don't forget your items! 🛍️`;
    const body = `You have ${totalItems} item${totalItems > 1 ? 's' : ''} worth $${totalValue.toFixed(2)} in your cart: ${productNames}`;
    
    await notificationService.schedulePromotionalNotification(
      title,
      body,
      {
        type: 'cart_reminder',
        cartItems,
        totalValue,
        hoursSinceAbandonment,
      },
      hoursSinceAbandonment * 60 // Convert hours to minutes
    );
  }

  async sendPointsMilestone(
    points: number,
    milestone: 'first_100' | 'first_500' | 'first_1000' | 'custom'
  ): Promise<void> {
    const milestoneMessages = {
      first_100: 'You\'re on your way! 🎯',
      first_500: 'Halfway there! 🚀',
      first_1000: 'You\'re a hair care champion! 🏆',
      custom: 'Amazing progress! 🌟'
    };

    const title = `${points} Points Earned!`;
    const body = `${milestoneMessages[milestone]} Keep up the great work with your hair care routine.`;
    
    await notificationService.schedulePromotionalNotification(
      title,
      body,
      {
        type: 'points_milestone',
        points,
        milestone,
      }
    );
  }

  async sendRoutineStreak(
    streakDays: number,
    userName: string
  ): Promise<void> {
    const streakEmojis = {
      7: '🔥',
      14: '💪',
      30: '🏆',
      60: '👑',
      90: '🌟'
    };

    const emoji = streakEmojis[streakDays as keyof typeof streakEmojis] || '🎉';
    
    const title = `${emoji} ${streakDays} Day Streak!`;
    const body = `Amazing ${userName}! You've maintained your hair care routine for ${streakDays} days in a row. Your hair is thanking you!`;
    
    await notificationService.schedulePromotionalNotification(
      title,
      body,
      {
        type: 'routine_streak',
        streakDays,
        userName,
      }
    );
  }

  async sendEducationalTip(
    tipTitle: string,
    tipContent: string,
    category: 'hair_care' | 'scalp_health' | 'styling' | 'seasonal'
  ): Promise<void> {
    const categoryEmojis = {
      hair_care: '💆‍♀️',
      scalp_health: '🧴',
      styling: '✨',
      seasonal: '🌿'
    };

    const title = `${categoryEmojis[category]} Hair Care Tip`;
    const body = `${tipTitle}: ${tipContent}`;
    
    await notificationService.scheduleEducationalNotification(
      title,
      body,
      {
        type: 'educational_tip',
        tipTitle,
        tipContent,
        category,
      }
    );
  }
}

// Export singleton instance
export const promotionalNotificationService = PromotionalNotificationService.getInstance();
