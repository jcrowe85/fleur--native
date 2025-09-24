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
    console.log('Webhook body type:', body.type);
    console.log('Webhook has event:', !!body.event);
    if (body.event) {
      console.log('Event type:', body.event.type);
      console.log('Event has thread_ts:', !!body.event.thread_ts);
    }
    
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

        // Check if this is a typing indicator command
        if (messageText === 'typing...' || messageText === 'typing' || messageText === 'typing now') {
          console.log('Typing indicator detected for thread:', threadTs);
          
          // Find the most recent user message to link this typing indicator to
          const { data: originalMessage, error: findError } = await supabase
            .from('support_messages')
            .select('user_id')
            .eq('is_from_user', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (findError || !originalMessage) {
            console.error('Could not find original user for typing indicator:', findError);
            return res.status(200).json({ error: 'Original user not found for typing indicator' });
          }

          const appUserId = originalMessage.user_id;

          // Store typing indicator in Supabase
          const { error: insertError } = await supabase
            .from('support_messages')
            .insert({
              user_id: appUserId,
              message_text: 'TYPING_INDICATOR',
              is_from_user: false,
              slack_thread_ts: threadTs,
              slack_message_ts: messageTs,
            });

          if (insertError) {
            console.error('Error storing typing indicator:', insertError);
            return res.status(500).json({ error: 'Failed to store typing indicator' });
          }

          console.log('Typing indicator stored successfully for user:', appUserId);
          return res.status(200).json({ success: true });
        }

        // Find the most recent user message to link this reply to
        // Since we don't have exact thread matching, we'll link to the latest user message
        const { data: originalMessage, error: fetchError } = await supabase
          .from('support_messages')
          .select('user_id')
          .eq('is_from_user', true) // Find user messages
          .order('created_at', { ascending: false }) // Get the most recent
          .limit(1)
          .single();

        if (fetchError || !originalMessage) {
          console.error('Could not find original user for thread:', threadTs, fetchError);
          return res.status(200).json({ error: 'Original user not found for thread' });
        }

        const appUserId = originalMessage.user_id;

        // Clear any existing typing indicators for this user BEFORE storing the reply
        await supabase
          .from('support_messages')
          .delete()
          .eq('user_id', appUserId)
          .eq('message_text', 'TYPING_INDICATOR');

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
