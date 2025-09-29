# Cloud Sync Promotion System

This document explains how to send new promotions that didn't ship with the app.

## 🚀 Overview

The cloud sync promotion system allows you to:
- Create new promotion templates dynamically
- Send promotions to specific users or all unsynced users
- Track promotion performance and analytics
- Manage promotions without app updates

## 📋 Methods to Send New Promotions

### 1. **Server-Side API (Recommended)**

The most flexible approach is using the backend API to manage promotions dynamically.

#### **API Endpoints:**

```bash
# Create a new promotion template
POST /api/promotions/template
{
  "type": "holiday_sale",
  "title": "🎄 Holiday Sale - 25% Off!",
  "body": "Get 25% off your entire order this holiday season!",
  "actionText": "Shop Now",
  "priority": "high",
  "cooldownDays": 30,
  "isActive": true
}

# Send promotion to users
POST /api/promotions/send
{
  "promotionType": "holiday_sale",
  "title": "🎄 Holiday Sale - 25% Off!",
  "body": "Get 25% off your entire order this holiday season!",
  "actionText": "Shop Now",
  "userIds": ["user1", "user2"] // Optional: leave empty for all unsynced users
}

# Get promotion analytics
GET /api/promotions/analytics
GET /api/promotions/analytics/holiday_sale
```

### 2. **Command Line Tool**

Use the interactive command line tool for quick promotion management:

```bash
# Make the script executable
chmod +x scripts/manage-promotions.js

# Run the promotion manager
node scripts/manage-promotions.js
```

**Features:**
- Create new promotion templates
- Send promotions to users
- View analytics and performance metrics
- Interactive prompts for easy use

### 3. **Web Dashboard**

Open the HTML dashboard in your browser for a visual interface:

```bash
# Open the dashboard
open scripts/promotion-dashboard.html
# or
firefox scripts/promotion-dashboard.html
```

**Features:**
- Visual form for creating promotions
- Real-time analytics display
- Easy promotion sending interface
- Responsive design for mobile/desktop

### 4. **Database Direct Insert**

For bulk operations or automated scripts:

```sql
-- Insert new promotion template
INSERT INTO promotion_templates (type, title, body, action_text, priority, cooldown_days, is_active) 
VALUES (
  'black_friday',
  '🛍️ Black Friday Mega Sale',
  'Up to 50% off everything! Plus free cloud backup for life.',
  'Shop Now',
  'high',
  7,
  true
);

-- Send to all unsynced users
INSERT INTO notification_promotions (user_id, promotion_type, title, body, sent_at)
SELECT 
  user_id,
  'black_friday',
  '🛍️ Black Friday Mega Sale',
  'Up to 50% off everything! Plus free cloud backup for life.',
  NOW()
FROM user_sync_data 
WHERE user_id IS NULL; -- Users who haven't synced yet
```

## 🎯 Promotion Types & Examples

### **Seasonal Promotions**
```json
{
  "type": "holiday_sale",
  "title": "🎄 Holiday Hair Care Sale",
  "body": "Get 25% off your entire order this holiday season! Plus, sync your data to never lose your hair care progress.",
  "actionText": "Shop & Sync",
  "priority": "high",
  "cooldownDays": 45
}
```

### **Feature Announcements**
```json
{
  "type": "new_feature",
  "title": "🆕 New Feature: Cross-Device Sync",
  "body": "We just launched cross-device sync! Access your hair care routine from any device.",
  "actionText": "Try Now",
  "priority": "high",
  "cooldownDays": 30
}
```

### **Urgency-Based**
```json
{
  "type": "limited_time",
  "title": "⏰ Limited Time: Free Cloud Backup",
  "body": "For a limited time, get free cloud backup of your hair care data. Don't miss out!",
  "actionText": "Claim Free Backup",
  "priority": "high",
  "cooldownDays": 25
}
```

### **Educational**
```json
{
  "type": "data_security",
  "title": "🔒 Your Data Security Matters",
  "body": "Learn how we protect your hair care data with enterprise-grade security. Sync with confidence!",
  "actionText": "Learn More",
  "priority": "low",
  "cooldownDays": 60
}
```

## 📊 Analytics & Tracking

### **Key Metrics:**
- **Total Sent**: Number of promotions sent
- **Total Clicked**: Number of users who clicked the promotion
- **Total Converted**: Number of users who synced after clicking
- **Click Rate**: Percentage of sent promotions that were clicked
- **Conversion Rate**: Percentage of clicked promotions that converted

### **Viewing Analytics:**

```bash
# Command line
node scripts/manage-promotions.js
# Select option 3: View analytics

# Web dashboard
open scripts/promotion-dashboard.html
# Click "Analytics" tab

# API
curl http://localhost:3000/api/promotions/analytics
```

## 🔄 How It Works

### **1. Promotion Creation**
- Create promotion templates in the database
- Set priority, cooldown periods, and active status
- Templates can be reused multiple times

### **2. Promotion Delivery**
- App checks for new promotions every 6 hours
- Respects user's notification preferences
- Only sends to users who haven't synced yet
- Respects cooldown periods between promotions

### **3. User Interaction**
- Users receive push notifications
- Clicking opens the cloud sync popup
- Successful sync is tracked as conversion

### **4. Analytics Collection**
- All interactions are logged in the database
- Real-time analytics available via API
- Performance metrics help optimize future promotions

## 🛠️ Setup Instructions

### **1. Database Setup**
```bash
# Run the schema in your Supabase SQL editor
psql -f database/schema.sql

# Seed with example promotions
psql -f scripts/seed-promotions.sql
```

### **2. Server Setup**
```bash
# Install dependencies
cd server
npm install @supabase/supabase-js

# Set environment variables
export SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Start the server
npm start
```

### **3. App Integration**
The app automatically fetches new promotions from the server. No app update required!

## 🎨 Best Practices

### **Promotion Design:**
- Use emojis to make titles eye-catching
- Keep body text concise and benefit-focused
- Use action-oriented button text
- Test different priorities and cooldown periods

### **Timing:**
- High priority for urgent/time-sensitive offers
- Longer cooldowns for less urgent promotions
- Consider user time zones and app usage patterns

### **Content:**
- Focus on user benefits (data security, cross-device access)
- Use social proof and urgency when appropriate
- A/B test different messaging approaches

### **Frequency:**
- Maximum 1-2 promotions per month per user
- Respect cooldown periods to avoid spam
- Monitor conversion rates and adjust frequency

## 🚨 Troubleshooting

### **Promotions Not Sending:**
1. Check if user has notification permissions
2. Verify user hasn't already synced
3. Check cooldown periods
4. Ensure promotion is marked as active

### **Analytics Not Updating:**
1. Verify database connections
2. Check API endpoint responses
3. Ensure proper error handling in app

### **Server Connection Issues:**
1. Check API_BASE environment variable
2. Verify server is running
3. Check network connectivity
4. Review server logs for errors

## 📈 Future Enhancements

- **A/B Testing**: Test different promotion messages
- **Segmentation**: Send different promotions to different user groups
- **Scheduling**: Schedule promotions for specific times
- **Personalization**: Customize promotions based on user behavior
- **Automation**: Trigger promotions based on user actions

## 🔗 Related Files

- `server/src/promotion.router.ts` - API endpoints
- `src/services/cloudSyncPromotionService.ts` - Client-side service
- `scripts/manage-promotions.js` - Command line tool
- `scripts/promotion-dashboard.html` - Web dashboard
- `database/schema.sql` - Database schema
- `scripts/seed-promotions.sql` - Example promotions
