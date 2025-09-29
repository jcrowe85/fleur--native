// server/src/promotion.router.ts
import express from 'express';
import { supabase } from './services/supabase';

const router = express.Router();

// Get active promotions for a user
router.get('/active/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get user's last promotion dates
    const { data: lastPromotions } = await supabase
      .from('notification_promotions')
      .select('promotion_type, sent_at')
      .eq('user_id', userId)
      .order('sent_at', { ascending: false });

    // Get all available promotions from database
    const { data: availablePromotions } = await supabase
      .from('promotion_templates')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (!availablePromotions) {
      return res.json({ promotions: [] });
    }

    // Filter promotions based on cooldown and user history
    const now = new Date();
    const eligiblePromotions = availablePromotions.filter((promotion: any) => {
      const lastSent = lastPromotions?.find((p: any) => p.promotion_type === promotion.type);
      if (!lastSent) return true;

      const daysSinceLastSent = (now.getTime() - new Date(lastSent.sent_at).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceLastSent >= promotion.cooldown_days;
    });

    res.json({ promotions: eligiblePromotions });
  } catch (error) {
    console.error('Error fetching active promotions:', error);
    res.status(500).json({ error: 'Failed to fetch promotions' });
  }
});

// Create a new promotion template
router.post('/template', async (req, res) => {
  try {
    const { type, title, body, actionText, priority, cooldownDays, destinationRoute, isActive } = req.body;

    const { data, error } = await supabase
      .from('promotion_templates')
      .insert({
        type,
        title,
        body,
        action_text: actionText,
        priority,
        cooldown_days: cooldownDays,
        destination_route: destinationRoute || '/(app)/dashboard',
        is_active: isActive,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ promotion: data });
  } catch (error) {
    console.error('Error creating promotion template:', error);
    res.status(500).json({ error: 'Failed to create promotion' });
  }
});

// Update a promotion template
router.put('/template/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('promotion_templates')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ promotion: data });
  } catch (error) {
    console.error('Error updating promotion template:', error);
    res.status(500).json({ error: 'Failed to update promotion' });
  }
});

// Send promotion to specific users
router.post('/send', async (req, res) => {
  try {
    const { promotionType, userIds, title, body, actionText, destinationRoute } = req.body;

    // If userIds is not provided, send to all eligible users
    let targetUsers = userIds;
    if (!targetUsers || targetUsers.length === 0) {
      const { data: allUsers } = await supabase
        .from('user_sync_data')
        .select('user_id')
        .is('user_id', null); // Users who haven't synced yet
      
      targetUsers = allUsers?.map((u: any) => u.user_id) || [];
    }

    // Record the promotion for each user
    const promotionRecords = targetUsers.map((userId: any) => ({
      user_id: userId,
      promotion_type: promotionType,
      title,
      body,
      destination_route: destinationRoute || '/(app)/dashboard',
      sent_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('notification_promotions')
      .insert(promotionRecords);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ 
      message: `Promotion sent to ${targetUsers.length} users`,
      sentCount: targetUsers.length
    });
  } catch (error) {
    console.error('Error sending promotion:', error);
    res.status(500).json({ error: 'Failed to send promotion' });
  }
});

// Get promotion analytics
router.get('/analytics/:promotionType', async (req, res) => {
  try {
    const { promotionType } = req.params;
    
    let query = supabase
      .from('notification_promotions')
      .select('*');

    if (promotionType) {
      query = query.eq('promotion_type', promotionType);
    }

    const { data: promotions, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Calculate analytics
    const totalSent = promotions.length;
    const totalClicked = promotions.filter((p: any) => p.clicked_at).length;
    const totalConverted = promotions.filter((p: any) => p.converted_at).length;

    const analytics = {
      totalSent,
      totalClicked,
      totalConverted,
      clickRate: totalSent > 0 ? (totalClicked / totalSent * 100).toFixed(2) : 0,
      conversionRate: totalSent > 0 ? (totalConverted / totalSent * 100).toFixed(2) : 0,
      promotions: promotions.map((p: any) => ({
        id: p.id,
        userId: p.user_id,
        type: p.promotion_type,
        sentAt: p.sent_at,
        clickedAt: p.clicked_at,
        convertedAt: p.converted_at
      }))
    };

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching promotion analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default router;
