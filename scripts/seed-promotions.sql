-- scripts/seed-promotions.sql
-- Example promotion templates for cloud sync

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

('user_milestone', '🏆 You''re a Hair Care Champion!', 'You''ve been using our app for a while now. Keep your progress synced to maintain your champion status!', 'Stay Champion', 'medium', 60, true);

-- Update the updated_at timestamp
UPDATE promotion_templates SET updated_at = NOW() WHERE updated_at IS NULL;
