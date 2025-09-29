# Push Notification Navigation Guide

## 📱 Where Users Go When They Click Notifications

When users tap on push notifications, they are automatically directed to the most relevant screen in the app based on the notification type.

### **🔄 Routine Notifications**
**Notification Types:** `routine_morning`, `routine_evening`
**Destination:** **Routine Screen** (`/(app)/routine`)
**Why:** Users need to see their scheduled routine steps

### **🛍️ Promotional Notifications**
**Notification Types:** `promotional_sale`, `new_product`
**Destination:** **Shop Screen** (`/(app)/shop`)
**Why:** Users want to see products and make purchases

### **☁️ Cloud Sync Promotions**
**Notification Types:** `cloud_sync_promotion`
**Destination:** **Dashboard** (`/(app)/dashboard`) + **Cloud Sync Popup**
**Why:** Users need to enter their email/password to sync data

### **🏆 Achievement Notifications**
**Notification Types:** `points_milestone`, `routine_streak`
**Destination:** **Rewards Screen** (`/(app)/rewards`)
**Why:** Users want to see their points and achievements

### **💡 Educational Notifications**
**Notification Types:** `educational_tip`
**Destination:** **Routine Screen** (`/(app)/routine`)
**Why:** Educational content is related to hair care routines

### **🛒 Cart Reminders**
**Notification Types:** `cart_reminder`
**Destination:** **Cart Screen** (`/(app)/cart`)
**Why:** Users need to complete their purchase

### **❓ Default/Unknown Notifications**
**Notification Types:** Any other type
**Destination:** **Dashboard** (`/(app)/dashboard`)
**Why:** Safe fallback to main app screen

## 🎯 Special Handling for Cloud Sync Promotions

Cloud sync promotions have special behavior:

1. **Navigate to Dashboard** - Takes user to main app screen
2. **Trigger Specific Popup** - Shows the appropriate cloud sync popup based on promotion type:
   - `backup_data` → "Backup Your Hair Journey" popup
   - `cross_device` → "Access Your Data Anywhere" popup
   - `never_lose_data` → "Never Lose Your Progress" popup
   - `sync_progress` → "Sync Your Hair Care Progress" popup
   - `secure_backup` → "Secure Your Hair Care Data" popup
   - `access_anywhere` → "Your Hair Care, Anywhere" popup

## 🔧 Technical Implementation

The navigation is handled in `src/services/notificationService.ts`:

```typescript
private handleNotificationResponse(response: Notifications.NotificationResponse): void {
  const { notification } = response;
  const data = notification.request.content.data;
  const type = data?.type;

  switch (type) {
    case 'routine_morning':
    case 'routine_evening':
      router.push('/(app)/routine');
      break;
    // ... other cases
  }
}
```

## 📊 Analytics Tracking

When users click notifications, the system tracks:
- **Notification Type** - What kind of notification was clicked
- **Click Time** - When the notification was clicked
- **Destination** - Which screen the user was taken to
- **Conversion** - Whether the user completed the intended action

This data is stored in the `notification_promotions` table and can be viewed in the promotion dashboard.

## 🎨 User Experience

The navigation is designed to be:
- **Intuitive** - Users go to the most logical screen
- **Fast** - Direct navigation without extra steps
- **Contextual** - Different notifications lead to different relevant screens
- **Consistent** - Same notification types always go to the same place

## 🔄 Future Enhancements

Potential improvements:
- **Deep Linking** - Direct links to specific products or routine steps
- **Contextual Data** - Pass specific data to screens (e.g., which product to highlight)
- **A/B Testing** - Test different navigation patterns
- **Personalization** - Customize destinations based on user behavior
