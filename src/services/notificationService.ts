// src/services/notificationService.ts
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { RoutineStep, Period } from '@/state/routineStore';
import { cloudSyncPromotionService } from './cloudSyncPromotionService';

// Conditional imports for Expo Go compatibility
let Notifications: any = null;
let Device: any = null;
let Constants: any = null;

try {
  Notifications = require('expo-notifications');
  Device = require('expo-device');
  Constants = require('expo-constants');
} catch (error) {
  console.warn('expo-notifications not available in Expo Go. Notifications will be disabled.');
}

// Configure notification behavior (only if available)
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export type NotificationType = 
  | 'routine_morning' 
  | 'routine_evening'
  | 'promotional_sale'
  | 'new_product'
  | 'points_milestone'
  | 'routine_streak'
  | 'educational_tip'
  | 'cart_reminder';

export type NotificationPreferences = {
  routineNotifications: boolean;
  promotionalNotifications: boolean;
  educationalNotifications: boolean;
  communityNotifications: boolean;
  quietHoursStart?: string; // "22:00"
  quietHoursEnd?: string;   // "08:00"
};

export class NotificationService {
  private static instance: NotificationService;
  private expoPushToken: string | null = null;
  private preferences: NotificationPreferences = {
    routineNotifications: true,
    promotionalNotifications: false,
    educationalNotifications: false,
    communityNotifications: false,
  };

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize(): Promise<void> {
    if (!Notifications) {
      console.warn('Notifications not available - skipping initialization');
      return;
    }
    
    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Notification permissions not granted');
        return;
      }

      // Get push token (optional - may fail in Expo Go)
      if (Device && Device.isDevice && Constants) {
        try {
          const token = await Notifications.getExpoPushTokenAsync({
            projectId: Constants?.expoConfig?.extra?.eas?.projectId,
          });
          this.expoPushToken = token.data;
          console.log('Expo push token:', this.expoPushToken);
        } catch (error) {
          console.warn('Could not get Expo push token (expected in Expo Go):', error.message);
        }
      } else {
        console.log('Must use physical device for push notifications');
      }

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        try {
          await Notifications.setNotificationChannelAsync('routine', {
            name: 'Routine Reminders',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
          });

          await Notifications.setNotificationChannelAsync('promotional', {
            name: 'Promotions & Offers',
            importance: Notifications.AndroidImportance.DEFAULT,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
          });

          await Notifications.setNotificationChannelAsync('educational', {
            name: 'Hair Care Tips',
            importance: Notifications.AndroidImportance.DEFAULT,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
          });
        } catch (error) {
          console.warn('Could not set up notification channels:', error.message);
        }
      }

      // Set up notification response listener
      this.setupNotificationResponseListener();
    } catch (error) {
      console.warn('Failed to initialize notifications (expected in Expo Go):', error.message);
    }
  }

  async scheduleRoutineNotifications(steps: RoutineStep[]): Promise<void> {
    if (!Notifications) {
      console.warn('Notifications not available - skipping routine notifications');
      return;
    }
    
    // Cancel existing routine notifications
    await this.cancelRoutineNotifications();

    if (!this.preferences.routineNotifications) return;

    const morningSteps = steps.filter(step => step.period === 'morning' && step.enabled);
    const eveningSteps = steps.filter(step => step.period === 'evening' && step.enabled);

    // Schedule morning notification
    if (morningSteps.length > 0) {
      const firstMorningStep = morningSteps.sort((a, b) => 
        a.time?.localeCompare(b.time || '') || 0
      )[0];
      
      if (firstMorningStep.time) {
        await this.scheduleNotification({
          type: 'routine_morning',
          title: 'Good morning! 🌅',
          body: `Time for your morning hair care routine. You have ${morningSteps.length} step${morningSteps.length > 1 ? 's' : ''} to complete.`,
          data: { 
            period: 'morning',
            stepCount: morningSteps.length,
            firstStep: firstMorningStep.name 
          },
          time: this.getNotificationTime(firstMorningStep.time, -30), // 30 minutes before
        });
      }
    }

    // Schedule evening notification
    if (eveningSteps.length > 0) {
      const firstEveningStep = eveningSteps.sort((a, b) => 
        a.time?.localeCompare(b.time || '') || 0
      )[0];
      
      if (firstEveningStep.time) {
        await this.scheduleNotification({
          type: 'routine_evening',
          title: 'Evening routine time! 🌙',
          body: `Don't forget your evening hair care routine. You have ${eveningSteps.length} step${eveningSteps.length > 1 ? 's' : ''} to complete.`,
          data: { 
            period: 'evening',
            stepCount: eveningSteps.length,
            firstStep: firstEveningStep.name 
          },
          time: this.getNotificationTime(firstEveningStep.time, -30), // 30 minutes before
        });
      }
    }
  }

  async schedulePromotionalNotification(
    title: string,
    body: string,
    data: any = {},
    delayMinutes: number = 0
  ): Promise<void> {
    if (!this.preferences.promotionalNotifications) return;

    await this.scheduleNotification({
      type: 'promotional_sale',
      title,
      body,
      data,
      time: delayMinutes > 0 ? new Date(Date.now() + delayMinutes * 60 * 1000) : undefined,
    });
  }

  async scheduleEducationalNotification(
    title: string,
    body: string,
    data: any = {}
  ): Promise<void> {
    if (!this.preferences.educationalNotifications) return;

    await this.scheduleNotification({
      type: 'educational_tip',
      title,
      body,
      data,
    });
  }

  async scheduleCartReminder(cartItems: any[], delayHours: number = 24): Promise<void> {
    if (cartItems.length === 0) return;

    const productNames = cartItems.map(item => item.name).join(', ');
    const totalItems = cartItems.length;

    await this.scheduleNotification({
      type: 'cart_reminder',
      title: 'Don\'t forget your items! 🛍️',
      body: `You have ${totalItems} item${totalItems > 1 ? 's' : ''} in your cart: ${productNames}`,
      data: { cartItems },
      time: new Date(Date.now() + delayHours * 60 * 60 * 1000),
    });
  }

  async schedulePointsMilestone(points: number): Promise<void> {
    await this.scheduleNotification({
      type: 'points_milestone',
      title: 'Points milestone reached! 🎉',
      body: `You've earned ${points} points! Keep up the great work with your hair care routine.`,
      data: { points },
    });
  }

  async scheduleRoutineStreak(streakDays: number): Promise<void> {
    await this.scheduleNotification({
      type: 'routine_streak',
      title: `${streakDays} day streak! 🔥`,
      body: `Amazing! You've maintained your hair care routine for ${streakDays} days in a row.`,
      data: { streakDays },
    });
  }

  private async scheduleNotification({
    type,
    title,
    body,
    data,
    time,
  }: {
    type: NotificationType;
    title: string;
    body: string;
    data?: any;
    time?: Date;
  }): Promise<void> {
    try {
      const trigger = time ? { date: time } : null;
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { 
            type, 
            destinationRoute: data?.destinationRoute,
            ...data 
          },
          sound: true,
          channelId: this.getChannelId(type),
        },
        trigger,
      });
    } catch (error) {
      console.error('Failed to schedule notification:', error);
    }
  }

  private getChannelId(type: NotificationType): string {
    switch (type) {
      case 'routine_morning':
      case 'routine_evening':
      case 'routine_streak':
        return 'routine';
      case 'promotional_sale':
      case 'new_product':
      case 'cart_reminder':
        return 'promotional';
      case 'educational_tip':
      case 'points_milestone':
        return 'educational';
      default:
        return 'routine';
    }
  }

  private getNotificationTime(timeString: string, offsetMinutes: number): Date {
    const [time, period] = timeString.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    
    let hour24 = hours;
    if (period === 'PM' && hours !== 12) hour24 += 12;
    if (period === 'AM' && hours === 12) hour24 = 0;
    
    const notificationTime = new Date();
    notificationTime.setHours(hour24, minutes + offsetMinutes, 0, 0);
    
    // If the time has passed today, schedule for tomorrow
    if (notificationTime <= new Date()) {
      notificationTime.setDate(notificationTime.getDate() + 1);
    }
    
    return notificationTime;
  }

  async cancelRoutineNotifications(): Promise<void> {
    if (!Notifications) return;
    
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const routineNotifications = scheduledNotifications.filter(
      notification => 
        notification.content.data?.type === 'routine_morning' ||
        notification.content.data?.type === 'routine_evening'
    );
    
    for (const notification of routineNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }

  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<void> {
    this.preferences = { ...this.preferences, ...preferences };
    
    // If routine notifications are disabled, cancel them
    if (!this.preferences.routineNotifications) {
      await this.cancelRoutineNotifications();
    }
  }

  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }

  async isAppActive(): Promise<boolean> {
    // This would need to be implemented based on your app state management
    // For now, we'll assume the app is active if we're in the foreground
    return true; // You might want to implement this based on your app's state
  }

  private setupNotificationResponseListener(): void {
    if (!Notifications) return;
    
    // Listen for notification responses (when user taps notification)
    Notifications.addNotificationResponseReceivedListener(response => {
      this.handleNotificationResponse(response);
    });
  }

  private handleNotificationResponse(response: Notifications.NotificationResponse): void {
    const { notification } = response;
    const data = notification.request.content.data;
    const type = data?.type;
    const destinationRoute = data?.destinationRoute;

    console.log('Notification clicked:', type, data);

    // If a specific destination route is provided, use it
    if (destinationRoute) {
      console.log('Navigating to custom route:', destinationRoute);
      router.push(destinationRoute);
      return;
    }

    // Fallback to default navigation based on notification type
    switch (type) {
      case 'routine_morning':
      case 'routine_evening':
        // Navigate to routine screen
        router.push('/(app)/routine');
        break;

      case 'promotional_sale':
      case 'new_product':
        // Navigate to shop screen for promotional notifications
        router.push('/(app)/shop');
        break;

      case 'cloud_sync_promotion':
        // For cloud sync promotions, trigger the appropriate popup based on promotion type
        const promotionType = data?.promotionType;
        this.triggerCloudSyncPopup(promotionType);
        break;

      case 'points_milestone':
      case 'routine_streak':
        // Navigate to rewards screen for achievements
        router.push('/(app)/rewards');
        break;

      case 'educational_tip':
        // Navigate to routine screen for educational content
        router.push('/(app)/routine');
        break;

      case 'cart_reminder':
        // Navigate to cart screen
        router.push('/(app)/cart');
        break;

      default:
        // Default to dashboard
        router.push('/(app)/dashboard');
        break;
    }
  }

  private triggerCloudSyncPopup(promotionType?: string): void {
    // Navigate to dashboard first
    router.push('/(app)/dashboard');
    
    // Then trigger the appropriate cloud sync popup
    // We'll use a small delay to ensure navigation completes
    setTimeout(() => {
      switch (promotionType) {
        case 'backup_data':
          cloudSyncPromotionService.showBackupPopup();
          break;
        case 'cross_device':
          cloudSyncPromotionService.showCrossDevicePopup();
          break;
        case 'never_lose_data':
          cloudSyncPromotionService.showNeverLoseDataPopup();
          break;
        case 'sync_progress':
          cloudSyncPromotionService.showSyncProgressPopup();
          break;
        case 'secure_backup':
          cloudSyncPromotionService.showSecureBackupPopup();
          break;
        case 'access_anywhere':
          cloudSyncPromotionService.showAccessAnywherePopup();
          break;
        default:
          // Default cloud sync popup
          cloudSyncPromotionService.showPopup('Sync Your Data', 'Enter your email and password to sync your hair care data to the cloud.');
          break;
      }
    }, 500);
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();
