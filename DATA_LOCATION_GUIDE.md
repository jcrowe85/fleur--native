# 📊 Fleur App - Data Storage Guide

## Where Is Your Data Stored?

### 🔐 **Authentication & Email**
**Table:** `auth.users` (Supabase Auth table)
- Your **email address** (after linking)
- Password (hashed)
- Email confirmation status
- Last sign-in time
- User ID (UUID)

**How to view:**
```sql
SELECT id, email, created_at, email_confirmed_at
FROM auth.users
WHERE email = 'your-email@example.com';
```

---

### 👤 **Profile Information**
**Table:** `profiles`
- User ID (links to auth.users)
- Email (copy for easy access)
- First name / Last name
- Avatar URL (profile photo)
- Handle (username)
- Display name
- Created/updated timestamps

**How to view:**
```sql
SELECT * FROM profiles
WHERE email = 'your-email@example.com';
```

**Note:** The schema shows basic columns, but your app may have added more columns like `handle`, `display_name`, and `avatar_url` via migrations.

---

### 💾 **Routine, Points & Progress Data**
**Table:** `user_sync_data`

This is where **ALL your app data** is stored in JSONB format:

| Column | Contains |
|--------|----------|
| `routine_data` | Your routine steps, schedule, completion history |
| `rewards_data` | Points, rewards, ledger, grants, referrals |
| `plan_data` | Your hair care plan, recommendations |
| `cart_data` | Shopping cart items |
| `purchase_data` | Purchase history |
| `notification_preferences` | Notification settings |

**How to view your data:**
```sql
SELECT 
  user_id,
  email,
  routine_data,
  rewards_data,
  last_synced
FROM user_sync_data
WHERE email = 'your-email@example.com';
```

**Example - View your points:**
```sql
SELECT 
  email,
  rewards_data->>'pointsTotal' as total_points,
  rewards_data->>'pointsAvailable' as available_points
FROM user_sync_data
WHERE email = 'your-email@example.com';
```

---

### 📝 **Community Posts**
**Table:** `posts`
- Post ID
- Author ID (your user ID)
- Content (text/images)
- Likes count
- Created/updated timestamps

**How to view your posts:**
```sql
SELECT * FROM posts
WHERE author_id = 'your-user-id'
ORDER BY created_at DESC;
```

---

### 💬 **Comments**
**Table:** `comments`
- Comment ID
- Post ID
- Author ID
- Content
- Created timestamp

**How to view your comments:**
```sql
SELECT * FROM comments
WHERE author_id = 'your-user-id'
ORDER BY created_at DESC;
```

---

### 💙 **Likes**
**Table:** `likes`
- User ID
- Post/Comment ID
- Type (post or comment)
- Created timestamp

---

### 📞 **Support Messages**
**Table:** `support_messages`
- Message ID
- User ID
- Message content
- Slack thread ID (for responses)
- Created timestamp

**How to view your support conversations:**
```sql
SELECT * FROM support_messages
WHERE user_id = 'your-user-id'
ORDER BY created_at DESC;
```

---

## 🔍 How to Find Your Data in Supabase

### Method 1: SQL Editor
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/atnuvjxdtucwjiatnajt)
2. Click "SQL Editor"
3. Run the queries from `check_my_data.sql`

### Method 2: Table Editor
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/atnuvjxdtucwjiatnajt)
2. Click "Table Editor"
3. Select the table you want to view
4. Use filters to find your data by email or user ID

---

## 🆔 Finding Your User ID

If you linked your email successfully, you can find your user ID:

```sql
SELECT id FROM auth.users
WHERE email = 'your-email@example.com';
```

Or check in your app's console logs - the user ID is logged when you sign in.

---

## ❓ Why Don't I See My Data?

If you don't see your data in the database, it might be because:

1. **Data is still local** - The app stores data locally by default
2. **Sync hasn't run yet** - Cloud sync happens when you:
   - Link your email
   - Manually trigger sync
   - App syncs automatically

3. **Check if sync is enabled** - Look for the cloud sync service in the app

---

## 🔄 How to Trigger Data Sync

Your app should automatically sync data when you link an email. To verify:

1. Check `user_sync_data` table for your email
2. If no entry exists, the sync service may need to be triggered manually
3. Look for sync functions in: `src/services/cloudSyncManager.ts`

---

## 📊 Quick Data Check

Run this in Supabase SQL Editor to see if your data exists:

```sql
-- Check if you have an account
SELECT 'Found user' as status, email, created_at 
FROM auth.users 
WHERE email = 'YOUR_EMAIL_HERE'

UNION ALL

-- Check if you have synced data
SELECT 'Found sync data' as status, email, last_synced::text as created_at
FROM user_sync_data
WHERE email = 'YOUR_EMAIL_HERE';
```

Replace `YOUR_EMAIL_HERE` with your actual email address.

---

## 🛠 Need Help?

- View your data: Use Supabase Dashboard > Table Editor
- Query your data: Use Supabase Dashboard > SQL Editor  
- API access: Use Supabase REST API or client libraries

**Project URL:** https://atnuvjxdtucwjiatnajt.supabase.co
**Dashboard:** https://supabase.com/dashboard/project/atnuvjxdtucwjiatnajt

