-- =====================================================
-- COMPLETE SUPABASE SCHEMA FOR FLEUR HAIR CARE APP
-- =====================================================
-- Run this entire file in your Supabase SQL editor
-- This consolidates all database changes from:
-- - Cloud sync system
-- - Push notifications
-- - Promotion management
-- - Support messages
-- - User profiles
-- =====================================================

-- =====================================================
-- 1. USER PROFILES & AUTHENTICATION
-- =====================================================

-- Create profiles table if it doesn't exist (Supabase usually creates this)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  handle TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add first-time user tracking columns to existing profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS first_login BOOLEAN DEFAULT true;

-- Add first action tracking column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS has_performed_first_action BOOLEAN DEFAULT false;

-- Add is_guest column for edge function compatibility
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT false;

-- =====================================================
-- 2. CLOUD SYNC SYSTEM
-- =====================================================

-- Create user_sync_data table
CREATE TABLE IF NOT EXISTS user_sync_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  plan_data JSONB,
  routine_data JSONB,
  rewards_data JSONB,
  cart_data JSONB,
  purchase_data JSONB,
  notification_preferences JSONB,
  last_synced TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sync_frequency TEXT DEFAULT 'daily' CHECK (sync_frequency IN ('immediate', 'daily', 'weekly', 'manual')),
  device_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_sync_data_user_id ON user_sync_data(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sync_data_email ON user_sync_data(email);
CREATE INDEX IF NOT EXISTS idx_user_sync_data_last_synced ON user_sync_data(last_synced);

-- Create sync_analytics table for tracking sync statistics
CREATE TABLE IF NOT EXISTS sync_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('manual', 'automatic', 'background')),
  sync_status TEXT NOT NULL CHECK (sync_status IN ('success', 'failed', 'partial')),
  data_size_bytes INTEGER,
  sync_duration_ms INTEGER,
  error_message TEXT,
  device_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for sync analytics
CREATE INDEX IF NOT EXISTS idx_sync_analytics_user_id ON sync_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_analytics_created_at ON sync_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_sync_analytics_sync_type ON sync_analytics(sync_type);

-- =====================================================
-- 3. PROMOTION MANAGEMENT SYSTEM
-- =====================================================

-- Create promotion_templates table for dynamic promotion management
CREATE TABLE IF NOT EXISTS promotion_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  action_text TEXT NOT NULL DEFAULT 'Sync Now',
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  cooldown_days INTEGER NOT NULL DEFAULT 30,
  destination_route TEXT DEFAULT '/(app)/dashboard' CHECK (destination_route IN (
    '/(app)/dashboard',
    '/(app)/routine', 
    '/(app)/shop',
    '/(app)/rewards',
    '/(app)/cart',
    '/(app)/profile',
    '/(app)/login',
    '/(app)/notification-settings',
    '/(app)/schedule-routine',
    '/(app)/schedule-intro'
  )),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notification_promotions table for tracking promotion delivery
CREATE TABLE IF NOT EXISTS notification_promotions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  promotion_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  clicked_at TIMESTAMP WITH TIME ZONE,
  converted_at TIMESTAMP WITH TIME ZONE,
  device_info JSONB
);

-- Create indexes for notification promotions
CREATE INDEX IF NOT EXISTS idx_notification_promotions_user_id ON notification_promotions(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_promotions_sent_at ON notification_promotions(sent_at);
CREATE INDEX IF NOT EXISTS idx_notification_promotions_promotion_type ON notification_promotions(promotion_type);

-- =====================================================
-- 4. SUPPORT MESSAGES SYSTEM
-- =====================================================

-- Create support_messages table (consolidated version)
CREATE TABLE IF NOT EXISTS support_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  is_from_user BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved')),
  slack_thread_ts TEXT,
  slack_message_ts TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for support messages
CREATE INDEX IF NOT EXISTS idx_support_messages_user_id ON support_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON support_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_support_messages_is_from_user ON support_messages(is_from_user);
CREATE INDEX IF NOT EXISTS idx_support_messages_status ON support_messages(status);

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sync_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- User sync data policies
CREATE POLICY "Users can view own sync data" ON user_sync_data
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sync data" ON user_sync_data
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sync data" ON user_sync_data
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sync data" ON user_sync_data
  FOR DELETE USING (auth.uid() = user_id);

-- Sync analytics policies
CREATE POLICY "Users can view own sync analytics" ON sync_analytics
  FOR SELECT USING (auth.uid() = user_id);

-- Promotion templates policies (admin only)
CREATE POLICY "Service role can manage promotion templates" ON promotion_templates
  FOR ALL USING (auth.role() = 'service_role');

-- Notification promotions policies
CREATE POLICY "Users can view own promotion data" ON notification_promotions
  FOR SELECT USING (auth.uid() = user_id);

-- Support messages policies
CREATE POLICY "Users can view their own support messages" ON support_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own support messages" ON support_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all support messages" ON support_messages
  FOR ALL USING (auth.role() = 'service_role');

-- Webhook policy for support replies
CREATE POLICY "Webhook can insert support replies" ON support_messages
  FOR INSERT WITH CHECK (is_from_user = false);

-- =====================================================
-- 6. FUNCTIONS AND TRIGGERS
-- =====================================================

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_sync_data_updated_at
  BEFORE UPDATE ON user_sync_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_promotion_templates_updated_at
  BEFORE UPDATE ON promotion_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_messages_updated_at
  BEFORE UPDATE ON support_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up old analytics data
CREATE OR REPLACE FUNCTION cleanup_old_sync_analytics()
RETURNS void AS $$
BEGIN
  DELETE FROM sync_analytics 
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Function to get sync statistics for a user
CREATE OR REPLACE FUNCTION get_user_sync_stats(p_user_id UUID)
RETURNS TABLE (
  total_syncs BIGINT,
  successful_syncs BIGINT,
  failed_syncs BIGINT,
  last_sync TIMESTAMP WITH TIME ZONE,
  avg_sync_duration_ms NUMERIC,
  total_data_synced_bytes BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_syncs,
    COUNT(CASE WHEN sync_status = 'success' THEN 1 END) as successful_syncs,
    COUNT(CASE WHEN sync_status = 'failed' THEN 1 END) as failed_syncs,
    MAX(created_at) as last_sync,
    AVG(sync_duration_ms) as avg_sync_duration_ms,
    SUM(data_size_bytes) as total_data_synced_bytes
  FROM sync_analytics
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for webhook to insert support replies
CREATE OR REPLACE FUNCTION insert_support_reply(
  p_user_id uuid,
  p_message_text text,
  p_thread_ts text,
  p_message_ts text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO support_messages (
    user_id,
    message_text,
    is_from_user,
    slack_thread_ts,
    slack_message_ts
  ) VALUES (
    p_user_id,
    p_message_text,
    false,
    p_thread_ts,
    p_message_ts
  );
END;
$$;

-- =====================================================
-- 7. VIEWS
-- =====================================================

-- Create a view for sync status dashboard
CREATE OR REPLACE VIEW user_sync_status AS
SELECT 
  usd.user_id,
  usd.email,
  usd.last_synced,
  usd.sync_frequency,
  usd.device_info,
  COUNT(sa.id) as total_syncs,
  COUNT(CASE WHEN sa.sync_status = 'success' THEN 1 END) as successful_syncs,
  COUNT(CASE WHEN sa.sync_status = 'failed' THEN 1 END) as failed_syncs,
  MAX(sa.created_at) as last_sync_attempt
FROM user_sync_data usd
LEFT JOIN sync_analytics sa ON usd.user_id = sa.user_id
GROUP BY usd.user_id, usd.email, usd.last_synced, usd.sync_frequency, usd.device_info;

-- =====================================================
-- 8. PERMISSIONS
-- =====================================================

-- Grant permissions to authenticated users
GRANT SELECT ON user_sync_status TO authenticated;
GRANT EXECUTE ON FUNCTION insert_support_reply TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_sync_stats TO authenticated;

-- Grant permissions for support messages
GRANT INSERT ON support_messages TO authenticated;

-- =====================================================
-- 9. SEED DATA (OPTIONAL)
-- =====================================================

-- Insert default promotion templates
INSERT INTO promotion_templates (type, title, body, action_text, priority, cooldown_days, is_active) VALUES
-- Holiday/Seasonal Promotions
('holiday_sale', '🎄 Holiday Hair Care Sale', 'Get 25% off your entire order this holiday season! Plus, sync your data to never lose your hair care progress.', 'Shop & Sync', 'high', 45, true),
('new_year', '✨ New Year, New Hair Routine', 'Start 2024 with a fresh hair care routine! Sync your data to track your progress all year long.', 'Start Fresh', 'high', 60, true),
('spring_refresh', '🌸 Spring Hair Refresh', 'Spring is here! Time to refresh your hair care routine. Keep your progress safe in the cloud.', 'Spring Sync', 'medium', 40, true),

-- Feature-based Promotions
('new_feature', '🆕 New Feature: Cross-Device Sync', 'We just launched cross-device sync! Access your hair care routine from any device.', 'Try Now', 'high', 30, true),
('routine_insights', '📊 New: Routine Insights', 'Get detailed insights into your hair care routine! Sync your data to unlock personalized analytics.', 'Unlock Insights', 'medium', 35, true),

-- Urgency-based Promotions
('limited_time', '⏰ Limited Time: Free Cloud Backup', 'For a limited time, get free cloud backup of your hair care data. Don''t miss out!', 'Claim Free Backup', 'high', 25, true),
('exclusive_offer', '🎁 Exclusive: Premium Sync Features', 'As a valued user, get exclusive access to premium sync features. Limited time offer!', 'Get Premium', 'high', 50, true),

-- Educational Promotions
('data_security', '🔒 Your Data Security Matters', 'Learn how we protect your hair care data with enterprise-grade security. Sync with confidence!', 'Learn More', 'low', 60, true),
('backup_tips', '💡 Pro Tip: Never Lose Your Progress', 'Did you know? Syncing your data ensures you never lose your hair care routine, even if you switch devices.', 'Sync Now', 'medium', 30, true),

-- Community-based Promotions
('community_feature', '👥 Join the Hair Care Community', 'Connect with other users and share your hair care journey! Sync your data to join the community.', 'Join Community', 'low', 45, true),
('success_stories', '🌟 Success Stories: Real Results', 'See how other users transformed their hair with consistent routines. Sync your data to track your own success!', 'See Results', 'medium', 40, true),

-- Technical Promotions
('app_update', '📱 App Update: Enhanced Sync', 'We just updated the app with faster, more reliable sync! Update now to experience the improvements.', 'Update & Sync', 'medium', 35, true),
('performance_boost', '⚡ Performance Boost: Faster Sync', 'Experience lightning-fast data sync with our latest performance improvements. Try it now!', 'Speed Up', 'low', 30, true),

-- Seasonal Hair Care Promotions
('summer_hair', '☀️ Summer Hair Care Essentials', 'Protect your hair from summer damage! Sync your routine to track your hair''s health all season.', 'Summer Sync', 'medium', 40, true),
('winter_hair', '❄️ Winter Hair Protection', 'Winter can be harsh on your hair. Keep your protective routine synced across all devices.', 'Winter Sync', 'medium', 40, true),

-- Milestone-based Promotions
('app_anniversary', '🎉 Happy Anniversary!', 'Celebrate our app anniversary with special sync features. Thank you for being part of our hair care community!', 'Celebrate', 'high', 90, true),
('user_milestone', '🏆 You''re a Hair Care Champion!', 'You''ve been using our app for a while now. Keep your progress synced to maintain your champion status!', 'Stay Champion', 'medium', 60, true)

ON CONFLICT (type) DO NOTHING; -- Don't overwrite existing templates

-- =====================================================
-- COMPLETE! 
-- =====================================================
-- This schema includes:
-- ✅ User profiles with first-time login tracking
-- ✅ Complete cloud sync system with analytics
-- ✅ Dynamic promotion management system
-- ✅ Support messages with Slack integration
-- ✅ Row Level Security policies
-- ✅ Automatic timestamp updates
-- ✅ Performance indexes
-- ✅ Helper functions and views
-- ✅ Default promotion templates
-- =====================================================
