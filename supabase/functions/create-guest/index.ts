// supabase/functions/create-guest/index.ts
// deno-lint-ignore-file no-explicit-any
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ⚠️ Use non-reserved names (the CLI blocks SUPABASE_* secrets)
const SB_URL = Deno.env.get('SB_URL')
const SB_SERVICE_ROLE_KEY = Deno.env.get('SB_SERVICE_ROLE_KEY')

if (!SB_URL || !SB_SERVICE_ROLE_KEY) {
  throw new Error('Missing SB_URL or SB_SERVICE_ROLE_KEY env vars')
}

function randomPassword(len = 32) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let out = ''
  const arr = new Uint32Array(len)
  crypto.getRandomValues(arr)
  for (const n of arr) out += chars[n % chars.length]
  return out
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } })
  }

  try {
    const supa = createClient(SB_URL, SB_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const body = (await req.json().catch(() => ({}))) as { handleHint?: string }

    const email = `guest_${crypto.randomUUID()}@guest.local`
    const password = randomPassword()
    const { data: created, error: createErr } = await supa.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: 'guest' },
    })
    if (createErr || !created?.user) return json({ error: createErr?.message ?? 'createUser failed' }, 400)

    const userId = created.user.id
    // const handle = (body.handleHint && body.handleHint.trim()) || `Anonymous-${userId.slice(0, 6)}`
    const handle = null;

    const { error: pErr } = await supa.from('profiles').insert({
      user_id: userId,
      handle,
      is_guest: true,
      avatar_url: null,
    })
    if (pErr) return json({ error: pErr.message }, 400)

    // Return one-time credentials; client will sign in immediately
    return json({ email, password, _marker: "create-guest v3 NO-HANDLE" });
    return json({ email, password })
  } catch (e: any) {
    return json({ error: e?.message ?? 'unknown error' }, 500)
  }
})
