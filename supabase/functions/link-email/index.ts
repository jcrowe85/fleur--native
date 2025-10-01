// supabase/functions/link-email/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Extract the user's access token
    const token = authHeader.replace('Bearer ', '')

    // Create Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    // Client for user operations
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Admin client for updating email
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Get the current user from the token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error('Invalid or expired token')
    }

    // Parse request body
    const { email, password } = await req.json()
    
    if (!email || !email.trim()) {
      throw new Error('Email is required')
    }

    if (!password || !password.trim()) {
      throw new Error('Password is required')
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      throw new Error('Invalid email format')
    }

    // Validate password strength
    if (password.trim().length < 8) {
      throw new Error('Password must be at least 8 characters long')
    }

    // Check if the user is a guest user
    const isGuestUser = user.email?.includes('@guest.local')
    
    if (!isGuestUser) {
      throw new Error('This function is only for guest users')
    }

    // Update the user's email and password using admin API
    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        email: email.trim(),
        password: password.trim(),
        email_confirm: true, // Auto-confirm the email for better UX
      }
    )

    if (updateError) {
      console.error('Update error:', updateError)
      throw new Error(`Failed to update email: ${updateError.message}`)
    }

    // Also update the profile table if needed
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ email: email.trim() })
      .eq('id', user.id)

    if (profileError) {
      console.warn('Profile update warning:', profileError)
      // Don't fail if profile update fails - email is already updated
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email linked successfully',
        user: {
          id: updatedUser.user.id,
          email: updatedUser.user.email,
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Link email error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to link email',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

