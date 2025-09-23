// webhook/api/slack-webhook.js commenting for auto verzel redeployment
// Deploy this to Vercel as a serverless function

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key for server-side operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;
    console.log('Received webhook:', JSON.stringify(body, null, 2));
    
    // Handle Slack URL verification
    if (body.type === 'url_verification') {
      return res.status(200).send(body.challenge);
    }

    // Handle Slack events
    if (body.event && body.event.type === 'message') {
      const event = body.event;
      
      // Only process messages in threads (replies to support messages)
      if (event.thread_ts && !event.bot_id && event.subtype !== 'bot_message') {
        console.log('Processing thread reply:', event);
        
        // Find the user ID associated with this thread
        const { data: originalMessage, error: findError } = await supabase
          .from('support_messages')
          .select('user_id')
          .eq('slack_thread_ts', event.thread_ts)
          .eq('is_from_user', true)
          .single();

        if (findError) {
          console.error('Error finding original message:', findError);
          return res.status(500).json({ error: 'Could not find original message' });
        }

        if (originalMessage) {
          // Insert the support team's reply
          const { error: insertError } = await supabase
            .from('support_messages')
            .insert({
              user_id: originalMessage.user_id,
              message_text: event.text,
              is_from_user: false,
              slack_thread_ts: event.thread_ts,
              slack_message_ts: event.ts,
            });

          if (insertError) {
            console.error('Error inserting reply:', insertError);
            return res.status(500).json({ error: 'Could not save reply' });
          }

          console.log('Successfully saved support reply for user:', originalMessage.user_id);
        }
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
