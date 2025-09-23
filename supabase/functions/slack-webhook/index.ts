// supabase/functions/slack-webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    console.log('Received webhook:', JSON.stringify(body, null, 2))
    
    // Handle Slack URL verification
    if (body.type === 'url_verification') {
      return new Response(body.challenge, { headers: corsHeaders })
    }

    // Handle Slack events
    if (body.event && body.event.type === 'message') {
      const event = body.event
      
      // Only process messages in threads (replies to support messages)
      if (event.thread_ts && !event.bot_id && event.subtype !== 'bot_message') {
        console.log('Processing thread reply:', event)
        
        // Create Supabase client with service role key
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )
        
        // Find the user ID associated with this thread
        const { data: originalMessage, error: findError } = await supabaseClient
          .from('support_messages')
          .select('user_id')
          .eq('slack_thread_ts', event.thread_ts)
          .eq('is_from_user', true)
          .single()

        if (findError) {
          console.error('Error finding original message:', findError)
          return new Response(
            JSON.stringify({ error: 'Could not find original message' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (originalMessage) {
          // Insert the support team's reply
          const { error: insertError } = await supabaseClient
            .from('support_messages')
            .insert({
              user_id: originalMessage.user_id,
              message_text: event.text,
              is_from_user: false,
              slack_thread_ts: event.thread_ts,
              slack_message_ts: event.ts,
            })

          if (insertError) {
            console.error('Error inserting reply:', insertError)
            return new Response(
              JSON.stringify({ error: 'Could not save reply' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          console.log('Successfully saved support reply for user:', originalMessage.user_id)
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
