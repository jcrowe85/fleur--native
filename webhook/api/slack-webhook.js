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
    // Parse the request body
    let body;
    if (typeof req.body === 'string') {
      body = JSON.parse(req.body);
    } else {
      body = req.body;
    }
    
    console.log('Received webhook:', JSON.stringify(body, null, 2));
    
    // Handle Slack URL verification challenge
    if (body.type === 'url_verification') {
      console.log('URL verification challenge:', body.challenge);
      res.status(200).send(body.challenge);
      return;
    }

    // Handle Slack events for bi-directional messaging
    if (body.event && body.event.type === 'message') {
      const event = body.event;
      
      // Only process messages in threads (replies to support messages)
      // and not from bots or the app itself
      if (event.thread_ts && !event.bot_id && event.subtype !== 'bot_message' && event.user) {
        console.log('Processing thread reply:', event);
        
        const userId = event.user; // This is the Slack user ID of the replier
        const messageText = event.text;
        const threadTs = event.thread_ts;
        const messageTs = event.ts;

        // Find the original user_id from our database using the thread_ts
        const { data: originalMessage, error: fetchError } = await supabase
          .from('support_messages')
          .select('user_id')
          .eq('slack_thread_ts', threadTs)
          .eq('is_from_user', true) // Find the original user message in this thread
          .single();

        if (fetchError || !originalMessage) {
          console.error('Could not find original user for thread:', threadTs, fetchError);
          return res.status(200).json({ error: 'Original user not found for thread' });
        }

        const appUserId = originalMessage.user_id;

        // Store the reply in Supabase
        const { error: insertError } = await supabase
          .from('support_messages')
          .insert({
            user_id: appUserId,
            message_text: messageText,
            is_from_user: false, // Support team message
            slack_thread_ts: threadTs,
            slack_message_ts: messageTs,
          });

        if (insertError) {
          console.error('Error storing support reply in Supabase:', insertError);
          return res.status(500).json({ error: 'Failed to store reply' });
        }

        console.log('Support reply stored successfully for user:', appUserId);
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
