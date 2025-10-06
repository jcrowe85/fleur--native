// supabase/functions/send-verification-code/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    const { email, code, expiresAt } = await req.json()

    if (!email || !code) {
      return new Response(
        JSON.stringify({ error: 'Email and code are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Format expiration time
    const expiresDate = new Date(expiresAt)
    const expiresIn = Math.ceil((expiresDate.getTime() - Date.now()) / 60000) // minutes

    // Email template
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Fleur Verification Code</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f5f5f5;
            }
            .container {
              background: white;
              border-radius: 12px;
              padding: 40px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              color: #120d0a;
              margin-bottom: 10px;
            }
            .code-container {
              background: #f8f9fa;
              border: 2px dashed #dee2e6;
              border-radius: 8px;
              padding: 20px;
              text-align: center;
              margin: 30px 0;
            }
            .verification-code {
              font-size: 32px;
              font-weight: bold;
              letter-spacing: 8px;
              color: #120d0a;
              font-family: 'Courier New', monospace;
            }
            .instructions {
              background: #e3f2fd;
              border-left: 4px solid #2196f3;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .warning {
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
              color: #856404;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">Fleur</div>
              <h1>Verify Your Email</h1>
            </div>
            
            <p>Hi there!</p>
            
            <p>You're setting up cloud sync for your Fleur hair care routine. To complete the process, please enter the verification code below in the app:</p>
            
            <div class="code-container">
              <div class="verification-code">${code}</div>
            </div>
            
            <div class="instructions">
              <strong>How to use this code:</strong>
              <ol>
                <li>Return to the Fleur app</li>
                <li>Enter the 6-digit code above</li>
                <li>Your data will be synced to the cloud</li>
              </ol>
            </div>
            
            <div class="warning">
              <strong>Important:</strong> This code will expire in ${expiresIn} minutes for security reasons. If you didn't request this code, please ignore this email.
            </div>
            
            <p>Once verified, your hair care routine, progress, and points will be safely backed up to the cloud so you can access them from any device.</p>
            
            <div class="footer">
              <p>This email was sent by Fleur Hair Care App</p>
              <p>If you have any questions, please contact our support team.</p>
            </div>
          </div>
        </body>
      </html>
    `

    // Send email using Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not found in environment variables')
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Fleur Hair Care <team@tryfleur.com>', // Using Resend's test domain
        to: [email],
        subject: 'Fleur Verification Code',
        html: emailHtml
      })
    })

    const emailResult = await emailResponse.json()

    if (!emailResponse.ok) {
      console.error('Failed to send email via Resend:', emailResult)
      return new Response(
        JSON.stringify({ error: 'Failed to send verification email' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ Verification email sent via Resend:', emailResult.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Verification code sent successfully',
        emailId: emailResult.id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error sending verification code:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
