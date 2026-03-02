// ============================================================
// purchase-credits edge function
// Handles credit pack purchases. Validates the pack, adds
// credits to the user profile, and records the transaction.
// In production, receipt validation via RevenueCat would happen here.
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ---------------------------------------------------------------------------
// Credit packs (mirrors shared/types.ts CREDIT_PACKS)
// ---------------------------------------------------------------------------

interface CreditPack {
  id: string
  name: string
  credits: number
  price_usd: number
  apple_product_id: string
  google_product_id: string
}

const CREDIT_PACKS: CreditPack[] = [
  {
    id: 'starter',
    name: 'Starter',
    credits: 6,
    price_usd: 6.99,
    apple_product_id: 'com.podcastai.credits.starter',
    google_product_id: 'credits_starter',
  },
  {
    id: 'popular',
    name: 'Popular',
    credits: 15,
    price_usd: 14.99,
    apple_product_id: 'com.podcastai.credits.popular',
    google_product_id: 'credits_popular',
  },
  {
    id: 'pro',
    name: 'Pro',
    credits: 40,
    price_usd: 34.99,
    apple_product_id: 'com.podcastai.credits.pro',
    google_product_id: 'credits_pro',
  },
]

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ---- Environment variables ----
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // ---- Authenticate user ----
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Resolve user from JWT
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''))

    if (userError || !user) {
      console.error('Auth error:', userError)
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const userId = user.id

    // ---- Parse & validate request body ----
    const body = await req.json()
    const { pack_id, receipt, platform } = body

    if (!pack_id || typeof pack_id !== 'string') {
      return new Response(
        JSON.stringify({ error: 'pack_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (!receipt || typeof receipt !== 'string') {
      return new Response(
        JSON.stringify({ error: 'receipt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (!['ios', 'android'].includes(platform)) {
      return new Response(
        JSON.stringify({ error: "platform must be 'ios' or 'android'" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ---- Validate pack_id ----
    const pack = CREDIT_PACKS.find((p) => p.id === pack_id)
    if (!pack) {
      return new Response(
        JSON.stringify({
          error: `Unknown pack_id: ${pack_id}`,
          available_packs: CREDIT_PACKS.map((p) => p.id),
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    console.log(
      `purchase-credits: user=${userId}, pack=${pack_id} (${pack.credits} credits), platform=${platform}`,
    )

    // ---- Receipt validation (placeholder) ----
    // In production, validate the receipt with RevenueCat or directly with
    // Apple/Google to prevent fraud. For now, we trust the receipt if it
    // is a non-empty string.
    //
    // TODO: Implement RevenueCat receipt validation:
    //   const rcApiKey = Deno.env.get('REVENUECAT_API_KEY')!
    //   const validation = await fetch('https://api.revenuecat.com/v1/receipts', {
    //     method: 'POST',
    //     headers: {
    //       'Authorization': `Bearer ${rcApiKey}`,
    //       'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify({
    //       app_user_id: userId,
    //       fetch_token: receipt,
    //       product_id: platform === 'ios' ? pack.apple_product_id : pack.google_product_id,
    //     }),
    //   })

    // ---- Check for duplicate receipt (idempotency) ----
    const { data: existingTxn } = await supabaseAdmin
      .from('credit_transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('reference_id', receipt)
      .eq('type', 'purchase')
      .limit(1)

    if (existingTxn && existingTxn.length > 0) {
      console.warn(
        `purchase-credits: duplicate receipt detected for user=${userId}`,
      )
      // Return current balance without adding credits again
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('credits_balance')
        .eq('id', userId)
        .single()

      return new Response(
        JSON.stringify({
          success: true,
          duplicate: true,
          credits_added: 0,
          credits_balance: profile?.credits_balance ?? 0,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ---- Fetch current profile ----
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError)
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ---- Add credits ----
    const newBalance = profile.credits_balance + pack.credits

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        credits_balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Credit update error:', updateError)
      throw new Error(`Failed to update credits: ${updateError.message}`)
    }

    // ---- Create credit transaction record ----
    const { data: transaction, error: txnError } = await supabaseAdmin
      .from('credit_transactions')
      .insert({
        user_id: userId,
        amount: pack.credits,
        balance_after: newBalance,
        type: 'purchase',
        reference_id: receipt,
        description: `Purchased ${pack.name} pack (${pack.credits} credits) via ${platform}`,
      })
      .select()
      .single()

    if (txnError) {
      console.error('Transaction record error:', txnError)
      // Non-fatal: credits were already added
    }

    console.log(
      `purchase-credits: success, user=${userId}, +${pack.credits} credits, balance=${newBalance}`,
    )

    // ---- Return response ----
    return new Response(
      JSON.stringify({
        success: true,
        credits_added: pack.credits,
        credits_balance: newBalance,
        pack: {
          id: pack.id,
          name: pack.name,
          credits: pack.credits,
        },
        transaction_id: transaction?.id || null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('purchase-credits error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
