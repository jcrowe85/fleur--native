// src/services/notificationService.ts
import { Platform } from 'react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import type { RoutineStep } from '@/state/routineStore';
import { useNotificationStore } from '@/state/notificationStore';
// cloudSyncPromotionService is imported lazily inside triggerCloudSyncPopup.
// A static import here closes a require cycle
// (notificationService -> cloudSyncPromotionService -> cloudSyncService ->
// routineStore -> notificationService) that Metro warns about and that leaves
// whichever module is entered second holding undefined references.

/**
 * Foreground presentation.
 *
 * `shouldShowAlert` is deprecated in SDK 54 and is ignored on its own — a
 * handler that only sets it never renders a foreground notification. The
 * banner/list flags are what the current runtime reads.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type NotificationType =
  | 'routine_morning'
  | 'routine_evening'
  | 'routine_weekly'
  | 'promotional_sale'
  | 'new_product'
  | 'points_milestone'
  | 'routine_streak'
  | 'educational_tip'
  | 'cart_reminder'
  | 'cloud_sync_promotion';

export type NotificationPreferences = {
  routineNotifications: boolean;
  promotionalNotifications: boolean;
  educationalNotifications: boolean;
  communityNotifications: boolean;
  quietHoursStart?: string; // "22:00"
  quietHoursEnd?: string; // "08:00"
};

/** Android notification channels, created once at initialize(). */
const CHANNELS = {
  routine: { name: 'Routine Reminders', importance: Notifications.AndroidImportance.HIGH },
  promotional: { name: 'Promotions & Offers', importance: Notifications.AndroidImportance.DEFAULT },
  educational: { name: 'Hair Care Tips', importance: Notifications.AndroidImportance.DEFAULT },
} as const;

type ChannelId = keyof typeof CHANNELS;

function channelFor(type: NotificationType): ChannelId {
  switch (type) {
    case 'routine_morning':
    case 'routine_evening':
    case 'routine_weekly':
    case 'routine_streak':
      return 'routine';
    case 'promotional_sale':
    case 'new_product':
    case 'cart_reminder':
    case 'cloud_sync_promotion':
      return 'promotional';
    default:
      return 'educational';
  }
}

/**
 * Parse "8:00 AM" / "20:30" into 24h components.
 * Returns null for anything unparseable so callers can skip rather than
 * schedule a notification at NaN o'clock.
 */
export function parseTimeOfDay(input?: string): { hour: number; minute: number } | null {
  if (!input) return null;

  const match = input.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (minute < 0 || minute > 59) return null;

  if (meridiem === 'PM' && hour !== 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;
  if (hour < 0 || hour > 23) return null;

  return { hour, minute };
}

/** Shift a wall-clock time by a number of minutes, wrapping across midnight. */
function shiftMinutes(time: { hour: number; minute: number }, delta: number) {
  const total = (time.hour * 60 + time.minute + delta + 24 * 60) % (24 * 60);
  return { hour: Math.floor(total / 60), minute: total % 60 };
}

/** Sort key for a routine step's time. */
function timeRank(step: RoutineStep): number {
  const parsed = parseTimeOfDay(step.time);
  return parsed ? parsed.hour * 60 + parsed.minute : Number.MAX_SAFE_INTEGER;
}

export class NotificationService {
  private static instance: NotificationService;
  private expoPushToken: string | null = null;
  private responseSubscription: Notifications.EventSubscription | null = null;
  private initialized = false;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Preferences live in the persisted notification store.
   *
   * They used to be a plain instance field, which meant every cold start reset
   * them to the defaults — so a user who had switched routine reminders off got
   * them again on the next launch.
   */
  getPreferences(): NotificationPreferences {
    return useNotificationStore.getState().preferences;
  }

  async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<void> {
    useNotificationStore.getState().updatePreferences(preferences);

    if (!this.getPreferences().routineNotifications) {
      await this.cancelRoutineNotifications();
    }
  }

  /** True once the OS has granted notification permission. */
  async hasPermission(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Ask the OS for notification permission.
   *
   * Call this from a screen where the user has just asked for reminders — not
   * on app launch. A cold prompt on first open converts poorly and is a common
   * App Store review note.
   */
  async requestPermission(): Promise<boolean> {
    const store = useNotificationStore.getState();
    const { status: existing } = await Notifications.getPermissionsAsync();

    let final = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      final = status;
    }

    store.setHasRequestedPermissions(true);
    return final === 'granted';
  }

  /**
   * Set up channels and listeners. Safe to call more than once.
   * Deliberately does NOT request permission — see requestPermission().
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    try {
      if (Platform.OS === 'android') {
        await Promise.all(
          (Object.keys(CHANNELS) as ChannelId[]).map((id) =>
            Notifications.setNotificationChannelAsync(id, {
              name: CHANNELS[id].name,
              importance: CHANNELS[id].importance,
              vibrationPattern: [0, 250, 250, 250],
              lightColor: '#FF231F7C',
            })
          )
        );
      }

      this.setupResponseListener();

      if (await this.hasPermission()) {
        await this.registerPushToken();
      }
    } catch (error) {
      console.warn('[notifications] initialize failed:', error);
    }
  }

  private async registerPushToken(): Promise<void> {
    if (!Device.isDevice) return;

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      (Constants as any)?.easConfig?.projectId;

    if (!projectId) {
      // Without an EAS project id getExpoPushTokenAsync throws; remote push is
      // simply unavailable until the project is linked to EAS.
      if (__DEV__) console.warn('[notifications] no EAS projectId; skipping push token');
      return;
    }

    try {
      const token = await Notifications.getExpoPushTokenAsync({ projectId });
      this.expoPushToken = token.data;
    } catch (error) {
      console.warn('[notifications] could not obtain push token:', error);
    }
  }

  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }

  // -------------------------------------------------------------------------
  // Routine reminders
  // -------------------------------------------------------------------------

  /**
   * Schedule the daily morning and evening routine reminders.
   *
   * Two things were broken here before:
   *  - the trigger was a bare `{ date }` object, which SDK 51+ rejects, so no
   *    routine reminder was ever actually scheduled; and
   *  - even had it worked, a DATE trigger fires exactly once, so a user would
   *    have received a single reminder rather than a daily one.
   */
  async scheduleRoutineNotifications(steps: RoutineStep[]): Promise<void> {
    await this.cancelRoutineNotifications();

    if (!this.getPreferences().routineNotifications) return;
    if (!(await this.hasPermission())) return;

    const enabled = steps.filter((step) => step.enabled);

    for (const period of ['morning', 'evening'] as const) {
      const periodSteps = enabled
        .filter((step) => step.period === period)
        .sort((a, b) => timeRank(a) - timeRank(b));

      if (periodSteps.length === 0) continue;

      const first = parseTimeOfDay(periodSteps[0].time);
      if (!first) continue;

      // Nudge 15 minutes ahead of the first step.
      const at = shiftMinutes(first, -15);

      await this.schedule({
        type: period === 'morning' ? 'routine_morning' : 'routine_evening',
        title: period === 'morning' ? 'Good morning! 🌅' : 'Evening routine time! 🌙',
        body:
          period === 'morning'
            ? `Your morning hair care routine is coming up — ${periodSteps.length} step${periodSteps.length > 1 ? 's' : ''} today.`
            : `Don't forget your evening routine — ${periodSteps.length} step${periodSteps.length > 1 ? 's' : ''} to go.`,
        data: { period, stepCount: periodSteps.length },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: at.hour,
          minute: at.minute,
        },
      });
    }

    // Weekly treatments get their own reminder on their scheduled day.
    const weekly = enabled
      .filter((step) => step.period === 'weekly')
      .sort((a, b) => timeRank(a) - timeRank(b));

    if (weekly.length > 0) {
      const first = weekly[0];
      const at = parseTimeOfDay(first.time) ?? { hour: 20, minute: 0 };
      // days are 0=Sun..6=Sat; expo weekdays are 1=Sun..7=Sat.
      const day = first.days?.[0] ?? 1;

      await this.schedule({
        type: 'routine_weekly',
        title: 'Weekly treatment day ✨',
        body: `Time for ${first.name}.`,
        data: { period: 'weekly' },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: ((day % 7) + 1),
          hour: at.hour,
          minute: at.minute,
        },
      });
    }
  }

  async cancelRoutineNotifications(): Promise<void> {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const routine = scheduled.filter((n) =>
        String(n.content.data?.type ?? '').startsWith('routine_')
      );
      await Promise.all(
        routine.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
      );
    } catch (error) {
      console.warn('[notifications] failed to cancel routine reminders:', error);
    }
  }

  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.warn('[notifications] failed to cancel all:', error);
    }
  }

  // -------------------------------------------------------------------------
  // One-off notifications
  // -------------------------------------------------------------------------

  async schedulePromotionalNotification(
    title: string,
    body: string,
    data: Record<string, unknown> = {},
    delayMinutes = 0
  ): Promise<void> {
    if (!this.getPreferences().promotionalNotifications) return;
    await this.schedule({
      type: 'promotional_sale',
      title,
      body,
      data,
      trigger: this.afterMinutes(delayMinutes),
    });
  }

  async scheduleEducationalNotification(
    title: string,
    body: string,
    data: Record<string, unknown> = {}
  ): Promise<void> {
    if (!this.getPreferences().educationalNotifications) return;
    await this.schedule({ type: 'educational_tip', title, body, data, trigger: null });
  }

  async scheduleCartReminder(cartItems: any[], delayHours = 24): Promise<void> {
    if (!cartItems?.length) return;
    if (!this.getPreferences().promotionalNotifications) return;

    const names = cartItems.map((i) => i.name).filter(Boolean).join(', ');
    await this.schedule({
      type: 'cart_reminder',
      title: "Don't forget your items! 🛍️",
      body: `You have ${cartItems.length} item${cartItems.length > 1 ? 's' : ''} waiting: ${names}`,
      data: { itemCount: cartItems.length },
      trigger: this.afterMinutes(delayHours * 60),
    });
  }

  async schedulePointsMilestone(points: number): Promise<void> {
    await this.schedule({
      type: 'points_milestone',
      title: 'Points milestone reached! 🎉',
      body: `You've earned ${points} points. Keep it going!`,
      data: { points },
      trigger: null,
    });
  }

  async scheduleRoutineStreak(streakDays: number): Promise<void> {
    if (!this.getPreferences().routineNotifications) return;
    await this.schedule({
      type: 'routine_streak',
      title: `${streakDays} day streak! 🔥`,
      body: `You've kept your routine going for ${streakDays} days in a row.`,
      data: { streakDays },
      trigger: null,
    });
  }

  private afterMinutes(minutes: number): Notifications.NotificationTriggerInput {
    if (minutes <= 0) return null;
    return {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.round(minutes * 60),
      repeats: false,
    };
  }

  private async schedule({
    type,
    title,
    body,
    data,
    trigger,
  }: {
    type: NotificationType;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    trigger: Notifications.NotificationTriggerInput;
  }): Promise<void> {
    try {
      const channelId = channelFor(type);
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          data: { type, ...data },
        },
        // channelId belongs on the trigger, not the content — putting it on the
        // content meant every Android notification fell back to the default
        // channel and ignored the importance we configured.
        trigger:
          trigger && typeof trigger === 'object' && !(trigger instanceof Date)
            ? ({ ...trigger, channelId } as Notifications.NotificationTriggerInput)
            : trigger,
      });
    } catch (error) {
      console.error(`[notifications] failed to schedule ${type}:`, error);
    }
  }

  // -------------------------------------------------------------------------
  // Tap handling
  // -------------------------------------------------------------------------

  private setupResponseListener(): void {
    // Replace rather than stack — initialize() used to add a new listener on
    // every call, so a tap fired the handler once per initialize().
    this.responseSubscription?.remove();
    this.responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => this.handleNotificationResponse(response)
    );
  }

  private handleNotificationResponse(response: Notifications.NotificationResponse): void {
    const data = response.notification.request.content.data as Record<string, any> | undefined;
    const type = data?.type as NotificationType | undefined;

    if (typeof data?.destinationRoute === 'string') {
      router.push(data.destinationRoute as any);
      return;
    }

    switch (type) {
      case 'routine_morning':
      case 'routine_evening':
      case 'routine_weekly':
      case 'educational_tip':
        router.push('/(app)/routine');
        break;

      case 'promotional_sale':
      case 'new_product':
        router.push('/(app)/shop');
        break;

      case 'cloud_sync_promotion':
        this.triggerCloudSyncPopup(data?.promotionType);
        break;

      case 'points_milestone':
      case 'routine_streak':
        router.push('/(app)/rewards');
        break;

      case 'cart_reminder':
        // The cart lives at /cart, not /(app)/cart — the old route did not exist
        // and the push was a no-op.
        router.push('/cart');
        break;

      default:
        router.push('/(app)/dashboard');
        break;
    }
  }

  private triggerCloudSyncPopup(promotionType?: string): void {
    router.push('/(app)/dashboard');

    setTimeout(async () => {
      const { cloudSyncPromotionService } = await import('./cloudSyncPromotionService');

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
          cloudSyncPromotionService.showPopup(
            'Sync Your Data',
            'Enter your email and password to sync your hair care data to the cloud.'
          );
          break;
      }
    }, 500);
  }

  /** Detach listeners (used by dev reset / sign-out paths). */
  teardown(): void {
    this.responseSubscription?.remove();
    this.responseSubscription = null;
    this.initialized = false;
  }
}

export const notificationService = NotificationService.getInstance();
