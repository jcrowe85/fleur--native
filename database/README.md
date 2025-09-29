# Database Setup for Fleur Hair Care App

This directory contains all the SQL files needed to set up your Supabase database for the Fleur hair care app.

## 📁 Files Overview

### **`complete_schema.sql`** - Complete Database Setup
- **Use this for**: Fresh database setup
- **Contains**: All tables, indexes, policies, functions, triggers, and seed data
- **Run once**: In your Supabase SQL editor

### **`migration_script.sql`** - Update Existing Database
- **Use this for**: Updating an existing database
- **Contains**: Safe migrations that won't break existing data
- **Run multiple times**: Safe to run repeatedly

### **`seed-promotions.sql`** - Example Promotion Templates
- **Use this for**: Adding example promotion templates
- **Contains**: 16 different promotion examples
- **Optional**: Only if you want example data

## 🚀 Quick Setup

### **Option 1: Fresh Database (Recommended)**
```sql
-- Copy and paste the entire content of complete_schema.sql
-- into your Supabase SQL editor and run it
```

### **Option 2: Update Existing Database**
```sql
-- Copy and paste the entire content of migration_script.sql
-- into your Supabase SQL editor and run it
```

## 📊 What Gets Created

### **Tables:**
- `profiles` - User profile information
- `user_sync_data` - Cloud sync data storage
- `sync_analytics` - Sync performance tracking
- `promotion_templates` - Dynamic promotion management
- `notification_promotions` - Promotion delivery tracking
- `support_messages` - Customer support messages

### **Features:**
- ✅ **Row Level Security** - Users can only access their own data
- ✅ **Automatic Timestamps** - Updated_at fields auto-update
- ✅ **Performance Indexes** - Optimized for fast queries
- ✅ **Helper Functions** - Sync stats, cleanup, support replies
- ✅ **Views** - User sync status dashboard
- ✅ **Default Data** - Example promotion templates

## 🔧 Environment Variables Needed

Make sure you have these set in your Supabase project:

```bash
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 🎯 What Each System Does

### **Cloud Sync System**
- Stores user's hair care data (plan, routine, rewards, cart, purchases)
- Tracks sync performance and analytics
- Supports different sync frequencies (immediate, daily, weekly, manual)

### **Promotion Management**
- Dynamic promotion templates that can be updated without app changes
- Tracks promotion delivery, clicks, and conversions
- Supports different priorities and cooldown periods

### **Support Messages**
- Customer support message storage
- Slack integration for support team responses
- Message status tracking (pending, in_progress, resolved)

## 🔍 Verification

After running the schema, you can verify everything is working:

```sql
-- Check if all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'user_sync_data', 'sync_analytics', 'promotion_templates', 'notification_promotions', 'support_messages');

-- Check if promotion templates were seeded
SELECT COUNT(*) FROM promotion_templates;

-- Check if policies are enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_sync_data', 'sync_analytics', 'promotion_templates', 'notification_promotions', 'support_messages');
```

## 🚨 Troubleshooting

### **"Table already exists" errors**
- This is normal if you're running the migration script
- The script uses `IF NOT EXISTS` to avoid conflicts

### **"Policy already exists" errors**
- This is normal if you're running the migration script
- The script checks for existing policies before creating new ones

### **Permission errors**
- Make sure you're using the service role key for admin operations
- Check that RLS policies are correctly configured

## 📈 Next Steps

After setting up the database:

1. **Test the API endpoints** in your server
2. **Create your first promotion** using the web dashboard
3. **Test cloud sync** from the app
4. **Monitor analytics** to see how promotions perform

## 🔗 Related Files

- `../server/src/promotion.router.ts` - API endpoints for promotions
- `../scripts/promotion-dashboard.html` - Web interface for managing promotions
- `../scripts/manage-promotions.js` - Command line tool
- `../docs/CLOUD_SYNC_PROMOTIONS.md` - Complete promotion system documentation
