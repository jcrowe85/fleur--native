// slack-webhook-handler.js
// This is a serverless function that handles Slack replies
// Deploy this to Vercel, Netlify, or your preferred platform

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    
    // Handle Slack event
    if (body.type === 'url_verification') {
      return {
        statusCode: 200,
        body: body.challenge
      };
    }

    // Handle message events
    if (body.event && body.event.type === 'message') {
      const { event: slackEvent } = body;
      
      // Only process messages in threads (replies)
      if (slackEvent.thread_ts && !slackEvent.bot_id) {
        // Extract user ID from thread context
        // You'll need to store the mapping between thread_ts and user_id
        const userId = await getUserIdFromThread(slackEvent.thread_ts);
        
        if (userId) {
          await supabase
            .from('support_messages')
            .insert({
              user_id: userId,
              message_text: slackEvent.text,
              is_from_user: false,
              slack_thread_ts: slackEvent.thread_ts,
              slack_message_ts: slackEvent.ts,
            });
        }
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    console.error('Error processing webhook:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

async function getUserIdFromThread(threadTs) {
  // This function needs to map thread_ts to user_id
  // You can store this mapping in a separate table or in the existing messages
  const { data } = await supabase
    .from('support_messages')
    .select('user_id')
    .eq('slack_thread_ts', threadTs)
    .eq('is_from_user', true)
    .single();
    
  return data?.user_id;
}
