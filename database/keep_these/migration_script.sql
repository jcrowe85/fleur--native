-- =====================================================
-- MIGRATION SCRIPT FOR EXISTING FLEUR DATABASE
-- =====================================================
-- Run this if you already have some tables and want to add the new features
-- This script is safe to run multiple times (uses IF NOT EXISTS)
-- =====================================================

-- =====================================================
-- 1. ADD MISSING COLUMNS TO EXISTING TABLES
-- =====================================================

-- Add first-time user tracking to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS first_login BOOLEAN DEFAULT true;

-- =====================================================
-- 2. CREATE NEW TABLES (IF NOT EXISTS)
-- =====================================================

-- User sync data table
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

-- Sync analytics table
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

-- Promotion templates table
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

-- Notification promotions table
CREATE TABLE IF NOT EXISTS notification_promotions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  promotion_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  destination_route TEXT DEFAULT '/(app)/dashboard',
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  clicked_at TIMESTAMP WITH TIME ZONE,
  converted_at TIMESTAMP WITH TIME ZONE,
  device_info JSONB
);

-- Support messages table (consolidated version)
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

-- =====================================================
-- 3. ADD MISSING COLUMNS TO EXISTING SUPPORT MESSAGES
-- =====================================================

-- Add missing columns to existing support_messages table
ALTER TABLE support_messages 
ADD COLUMN IF NOT EXISTS is_from_user BOOLEAN DEFAULT true;

ALTER TABLE support_messages 
ADD COLUMN IF NOT EXISTS slack_thread_ts TEXT;

ALTER TABLE support_messages 
ADD COLUMN IF NOT EXISTS slack_message_ts TEXT;

ALTER TABLE support_messages 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

ALTER TABLE support_messages 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing records to have is_from_user = true (since they're from users)
UPDATE support_messages 
SET is_from_user = true 
WHERE is_from_user IS NULL;

-- =====================================================
-- 4. CREATE INDEXES (IF NOT EXISTS)
-- =====================================================

-- User sync data indexes
CREATE INDEX IF NOT EXISTS idx_user_sync_data_user_id ON user_sync_data(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sync_data_email ON user_sync_data(email);
CREATE INDEX IF NOT EXISTS idx_user_sync_data_last_synced ON user_sync_data(last_synced);

-- Sync analytics indexes
CREATE INDEX IF NOT EXISTS idx_sync_analytics_user_id ON sync_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_analytics_created_at ON sync_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_sync_analytics_sync_type ON sync_analytics(sync_type);

-- Notification promotions indexes
CREATE INDEX IF NOT EXISTS idx_notification_promotions_user_id ON notification_promotions(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_promotions_sent_at ON notification_promotions(sent_at);
CREATE INDEX IF NOT EXISTS idx_notification_promotions_promotion_type ON notification_promotions(promotion_type);

-- Support messages indexes
CREATE INDEX IF NOT EXISTS idx_support_messages_user_id ON support_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON support_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_support_messages_is_from_user ON support_messages(is_from_user);
CREATE INDEX IF NOT EXISTS idx_support_messages_status ON support_messages(status);

-- =====================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE user_sync_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. CREATE POLICIES (IF NOT EXISTS)
-- =====================================================

-- User sync data policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_sync_data' AND policyname = 'Users can view own sync data') THEN
    CREATE POLICY "Users can view own sync data" ON user_sync_data
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_sync_data' AND policyname = 'Users can insert own sync data') THEN
    CREATE POLICY "Users can insert own sync data" ON user_sync_data
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_sync_data' AND policyname = 'Users can update own sync data') THEN
    CREATE POLICY "Users can update own sync data" ON user_sync_data
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_sync_data' AND policyname = 'Users can delete own sync data') THEN
    CREATE POLICY "Users can delete own sync data" ON user_sync_data
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Sync analytics policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sync_analytics' AND policyname = 'Users can view own sync analytics') THEN
    CREATE POLICY "Users can view own sync analytics" ON sync_analytics
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- Promotion templates policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'promotion_templates' AND policyname = 'Service role can manage promotion templates') THEN
    CREATE POLICY "Service role can manage promotion templates" ON promotion_templates
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- Notification promotions policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notification_promotions' AND policyname = 'Users can view own promotion data') THEN
    CREATE POLICY "Users can view own promotion data" ON notification_promotions
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- Support messages policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'support_messages' AND policyname = 'Users can view their own support messages') THEN
    CREATE POLICY "Users can view their own support messages" ON support_messages
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'support_messages' AND policyname = 'Users can insert their own support messages') THEN
    CREATE POLICY "Users can insert their own support messages" ON support_messages
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'support_messages' AND policyname = 'Service role can manage all support messages') THEN
    CREATE POLICY "Service role can manage all support messages" ON support_messages
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'support_messages' AND policyname = 'Webhook can insert support replies') THEN
    CREATE POLICY "Webhook can insert support replies" ON support_messages
      FOR INSERT WITH CHECK (is_from_user = false);
  END IF;
END $$;

-- =====================================================
-- 7. CREATE FUNCTIONS (IF NOT EXISTS)
-- =====================================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_sync_analytics()
RETURNS void AS $$
BEGIN
  DELETE FROM sync_analytics 
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- User sync stats function
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

-- Support reply function
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
-- 8. CREATE TRIGGERS (IF NOT EXISTS)
-- =====================================================

-- User sync data trigger
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_sync_data_updated_at') THEN
    CREATE TRIGGER update_user_sync_data_updated_at
      BEFORE UPDATE ON user_sync_data
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Promotion templates trigger
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_promotion_templates_updated_at') THEN
    CREATE TRIGGER update_promotion_templates_updated_at
      BEFORE UPDATE ON promotion_templates
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Support messages trigger
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_support_messages_updated_at') THEN
    CREATE TRIGGER update_support_messages_updated_at
      BEFORE UPDATE ON support_messages
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- =====================================================
-- 9. CREATE VIEWS (IF NOT EXISTS)
-- =====================================================

-- User sync status view
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
-- 10. GRANT PERMISSIONS
-- =====================================================

-- Grant permissions to authenticated users
GRANT SELECT ON user_sync_status TO authenticated;
GRANT EXECUTE ON FUNCTION insert_support_reply TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_sync_stats TO authenticated;
GRANT INSERT ON support_messages TO authenticated;

-- =====================================================
-- 11. SEED DEFAULT PROMOTION TEMPLATES
-- =====================================================

-- Insert default promotion templates (only if they don't exist)
INSERT INTO promotion_templates (type, title, body, action_text, priority, cooldown_days, is_active) VALUES
('holiday_sale', '🎄 Holiday Hair Care Sale', 'Get 25% off your entire order this holiday season! Plus, sync your data to never lose your hair care progress.', 'Shop & Sync', 'high', 45, true),
('new_year', '✨ New Year, New Hair Routine', 'Start 2024 with a fresh hair care routine! Sync your data to track your progress all year long.', 'Start Fresh', 'high', 60, true),
('spring_refresh', '🌸 Spring Hair Refresh', 'Spring is here! Time to refresh your hair care routine. Keep your progress safe in the cloud.', 'Spring Sync', 'medium', 40, true),
('new_feature', '🆕 New Feature: Cross-Device Sync', 'We just launched cross-device sync! Access your hair care routine from any device.', 'Try Now', 'high', 30, true),
('limited_time', '⏰ Limited Time: Free Cloud Backup', 'For a limited time, get free cloud backup of your hair care data. Don''t miss out!', 'Claim Free Backup', 'high', 25, true),
('data_security', '🔒 Your Data Security Matters', 'Learn how we protect your hair care data with enterprise-grade security. Sync with confidence!', 'Learn More', 'low', 60, true)
ON CONFLICT (type) DO NOTHING;

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
-- Your database now includes:
-- ✅ Cloud sync system
-- ✅ Promotion management
-- ✅ Support messages
-- ✅ All necessary indexes and policies
-- ✅ Default promotion templates
-- =====================================================
