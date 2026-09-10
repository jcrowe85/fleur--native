// supabase/functions/send-verification-code/index.ts
//
// Issues and verifies email confirmation codes.
//
// This function used to accept {email, code} from any unauthenticated caller
// and mail whatever it was given — an open relay on a verified sending domain.
// The code is now generated here, stored hashed, and checked here; the caller
// must present a valid Supabase JWT and only ever sees "sent" or "verified".
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CODE_TTL_MINUTES = 10
const MAX_ATTEMPTS = 5
/** Minimum gap between code requests for one user, in seconds. */
const RESEND_COOLDOWN_SECONDS = 60

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/** Cryptographically random 6-digit code. Math.random() is not suitable here. */
function generateCode(): string {
  const bytes = new Uint32Array(1)
  crypto.getRandomValues(bytes)
  return String(bytes[0] % 1_000_000).padStart(6, '0')
}

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
}

/** Resolve the caller from their bearer token. */
async function getCaller(req: Request) {
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  if (!token) return null

  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) return null
  return data.user
}

function buildEmailHtml(code: string, expiresIn: number): string {
  return `<!DOCTYPE html>
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
      </html>`
}

async function sendEmail(to: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not configured')
    return false
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Fleur Hair Care <team@tryfleur.com>',
      to: [to],
      subject: 'Fleur Verification Code',
      html,
    }),
  })

  if (!res.ok) {
    console.error('Resend rejected the message:', await res.text())
    return false
  }
  return true
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const user = await getCaller(req)
  if (!user) return json({ error: 'Unauthorized' }, 401)

  let payload: { action?: string; email?: string; code?: string }
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }

  const action = payload.action ?? 'send'
  const email = (payload.email ?? '').trim().toLowerCase()

  if (!isValidEmail(email)) return json({ error: 'Please enter a valid email address' }, 400)

  // -------------------------------------------------------------------------
  // send
  // -------------------------------------------------------------------------
  if (action === 'send') {
    const { data: recent } = await admin
      .from('email_verification_codes')
      .select('created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (recent) {
      const elapsed = (Date.now() - new Date(recent.created_at).getTime()) / 1000
      if (elapsed < RESEND_COOLDOWN_SECONDS) {
        return json(
          {
            error: `Please wait ${Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed)}s before requesting another code.`,
          },
          429
        )
      }
    }

    const code = generateCode()
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000)

    // Retire any outstanding codes for this user so only the newest works.
    await admin
      .from('email_verification_codes')
      .update({ consumed_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('consumed_at', null)

    const { error: insertError } = await admin.from('email_verification_codes').insert({
      user_id: user.id,
      email,
      code_hash: await sha256(code),
      expires_at: expiresAt.toISOString(),
    })

    if (insertError) {
      console.error('Could not store verification code:', insertError)
      return json({ error: 'Could not send verification code' }, 500)
    }

    const sent = await sendEmail(email, buildEmailHtml(code, CODE_TTL_MINUTES))
    if (!sent) return json({ error: 'Could not send verification email' }, 502)

    // The code itself is deliberately never returned to the client.
    return json({ success: true, expiresInMinutes: CODE_TTL_MINUTES })
  }

  // -------------------------------------------------------------------------
  // verify
  // -------------------------------------------------------------------------
  if (action === 'verify') {
    const submitted = (payload.code ?? '').trim()
    if (!/^\d{6}$/.test(submitted)) return json({ error: 'Enter the 6-digit code' }, 400)

    const { data: record } = await admin
      .from('email_verification_codes')
      .select('id, code_hash, attempts, expires_at, consumed_at')
      .eq('user_id', user.id)
      .eq('email', email)
      .is('consumed_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!record) return json({ error: 'No active code. Request a new one.' }, 404)

    if (new Date(record.expires_at) <= new Date()) {
      await admin
        .from('email_verification_codes')
        .update({ consumed_at: new Date().toISOString() })
        .eq('id', record.id)
      return json({ error: 'That code has expired. Request a new one.' }, 410)
    }

    if (record.attempts >= MAX_ATTEMPTS) {
      await admin
        .from('email_verification_codes')
        .update({ consumed_at: new Date().toISOString() })
        .eq('id', record.id)
      return json({ error: 'Too many attempts. Request a new code.' }, 429)
    }

    if ((await sha256(submitted)) !== record.code_hash) {
      await admin
        .from('email_verification_codes')
        .update({ attempts: record.attempts + 1 })
        .eq('id', record.id)

      const remaining = MAX_ATTEMPTS - (record.attempts + 1)
      return json(
        { error: `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` },
        400
      )
    }

    await admin
      .from('email_verification_codes')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', record.id)

    return json({ success: true, verified: true })
  }

  return json({ error: 'Unknown action' }, 400)
})
