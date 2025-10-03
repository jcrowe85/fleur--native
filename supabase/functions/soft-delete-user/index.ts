// supabase/functions/soft-delete-user/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.5'

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Authorization header missing')
    }

    const token = authHeader.replace('Bearer ', '')

    // Initialize Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from provided token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      throw new Error('Invalid or expired token')
    }

    // Parse request body
    const { userId } = await req.json()
    
    if (!userId || userId !== user.id) {
      throw new Error('Invalid user ID')
    }

    console.log(`Starting soft delete for user: ${userId}`)

    // 1. Mark profile as deleted and anonymize
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        deleted_at: new Date().toISOString(),
        email: null,
        display_name: 'Deleted User',
        handle: null,
        avatar_url: null,
      })
      .eq('id', userId)

    if (profileError) {
      console.error('Profile update error:', profileError)
      // Don't throw - continue with other deletions
    }

    // 2. Anonymize community posts
    const { error: postsError } = await supabaseAdmin
      .from('posts')
      .update({
        content: '[Content deleted by user]',
        author_id: null,
      })
      .eq('author_id', userId)

    if (postsError) {
      console.error('Posts update error:', postsError)
    }

    // 3. Anonymize comments
    const { error: commentsError } = await supabaseAdmin
      .from('comments')
      .update({
        content: '[Comment deleted by user]',
        author_id: null,
      })
      .eq('author_id', userId)

    if (commentsError) {
      console.error('Comments update error:', commentsError)
    }

    // 4. Delete support messages
    const { error: supportError } = await supabaseAdmin
      .from('support_messages')
      .delete()
      .eq('user_id', userId)

    if (supportError) {
      console.error('Support messages delete error:', supportError)
    }

    // 5. Log the deletion for business purposes
    const { error: logError } = await supabaseAdmin
      .from('user_deletions')
      .insert({
        user_id: userId,
        deleted_at: new Date().toISOString(),
        deletion_type: 'soft_delete',
        reason: 'user_requested'
      })

    if (logError) {
      console.error('Log insertion error:', logError)
      // Don't throw - this is just logging
    }

    // 6. Delete from auth.users (this will prevent login)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authError) {
      console.error('Auth user delete error:', authError)
      throw new Error(`Failed to delete auth user: ${authError.message}`)
    }

    console.log(`Soft delete completed for user: ${userId}`)

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Account deleted successfully',
      userId: userId
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Soft delete error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
