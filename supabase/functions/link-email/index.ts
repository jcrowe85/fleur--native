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
    console.log('=== LINK-EMAIL DEBUG START ===')
    
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    console.log('Auth header present:', !!authHeader)
    
    if (!authHeader) {
      console.log('ERROR: Missing authorization header')
      throw new Error('Missing authorization header')
    }

    // Extract the user's access token
    const token = authHeader.replace('Bearer ', '')
    console.log('Token length:', token.length)

    // Create Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    
    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasAnonKey: !!supabaseAnonKey
    })

    // Admin client for all operations (more reliable for edge functions)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Get the current user from the token using the admin client
    console.log('Attempting to get user from token using admin client...')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    console.log('User lookup result:', { 
      hasUser: !!user, 
      userId: user?.id,
      userEmail: user?.email,
      error: userError?.message 
    })
    
    if (userError || !user) {
      console.log('ERROR: Invalid user token:', userError?.message)
      console.log('Token preview:', token.substring(0, 50) + '...')
      throw new Error('Invalid or expired token')
    }

    // Parse request body
    console.log('Parsing request body...')
    const { email, password } = await req.json()
    console.log('Parsed email:', email)
    console.log('Parsed password length:', password?.length || 0)
    
    if (!email || !email.trim()) {
      console.log('ERROR: Email is missing or empty')
      throw new Error('Email is required')
    }

    if (!password || !password.trim()) {
      console.log('ERROR: Password is missing or empty')
      throw new Error('Password is required')
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      console.log('ERROR: Invalid email format:', email)
      throw new Error('Invalid email format')
    }

    // Validate password strength
    if (password.trim().length < 8) {
      console.log('ERROR: Password too short:', password.trim().length)
      throw new Error('Password must be at least 8 characters long')
    }

    // Check if the user is a guest user
    const isGuestUser = user.email?.includes('@guest.local')
    console.log('Is guest user:', isGuestUser)
    console.log('Current user email:', user.email)
    
    if (!isGuestUser) {
      console.log('ERROR: Not a guest user')
      throw new Error('This function is only for guest users')
    }

    // Update the user's email and password using admin API
    console.log('Attempting to update user with admin API...')
    console.log('User ID:', user.id)
    console.log('New email:', email.trim())
    console.log('Password length:', password.trim().length)
    
    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        email: email.trim(),
        password: password.trim(),
        email_confirm: true, // Auto-confirm the email for better UX
      }
    )

    console.log('Update result:', {
      hasUpdatedUser: !!updatedUser,
      updatedUserId: updatedUser?.user?.id,
      updatedUserEmail: updatedUser?.user?.email,
      hasError: !!updateError,
      errorMessage: updateError?.message,
      errorCode: updateError?.status
    })

    if (updateError) {
      console.error('UPDATE ERROR DETAILS:', {
        message: updateError.message,
        status: updateError.status,
        name: updateError.name,
        details: updateError
      })
      throw new Error(`Failed to update email: ${updateError.message}`)
    }

    if (!updatedUser?.user) {
      console.log('ERROR: Update succeeded but no user data returned')
      throw new Error('User update succeeded but no user data returned')
    }
    
    console.log('✅ User update successful!')

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

