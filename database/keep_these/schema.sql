-- Supabase schema for Fleur hair care app cloud sync
-- Run this in your Supabase SQL editor

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

-- Create RLS (Row Level Security) policies
ALTER TABLE user_sync_data ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own data
CREATE POLICY "Users can view own sync data" ON user_sync_data
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sync data" ON user_sync_data
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sync data" ON user_sync_data
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sync data" ON user_sync_data
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_user_sync_data_updated_at
  BEFORE UPDATE ON user_sync_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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

-- Enable RLS for sync analytics
ALTER TABLE sync_analytics ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own sync analytics
CREATE POLICY "Users can view own sync analytics" ON sync_analytics
  FOR SELECT USING (auth.uid() = user_id);

-- Create promotion_templates table for dynamic promotion management
CREATE TABLE IF NOT EXISTS promotion_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  action_text TEXT NOT NULL DEFAULT 'Sync Now',
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  cooldown_days INTEGER NOT NULL DEFAULT 30,
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

-- Enable RLS for notification promotions
ALTER TABLE notification_promotions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own promotion data
CREATE POLICY "Users can view own promotion data" ON notification_promotions
  FOR SELECT USING (auth.uid() = user_id);

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

-- Grant access to the view
GRANT SELECT ON user_sync_status TO authenticated;

-- Create function to clean up old analytics data (optional)
CREATE OR REPLACE FUNCTION cleanup_old_sync_analytics()
RETURNS void AS $$
BEGIN
  DELETE FROM sync_analytics 
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Create function to get sync statistics for a user
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
