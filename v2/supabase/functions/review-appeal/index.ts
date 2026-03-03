// ============================================================
// review-appeal edge function
// Admin reviews and approves/denies an appeal. Admin-only.
//
// POST { appeal_id, decision, admin_response }
//   decision: "approved" | "denied"
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireAdmin } from '../_shared/admin.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabaseUser = createClient(supabaseUrl, supabaseServiceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

    const adminId = await requireAdmin(supabaseUser, supabaseAdmin, authHeader)

    const body = await req.json()
    const { appeal_id, decision, admin_response } = body

    if (!appeal_id || !decision) {
      return new Response(
        JSON.stringify({ error: 'appeal_id and decision are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (!['approved', 'denied'].includes(decision)) {
      return new Response(
        JSON.stringify({ error: 'decision must be "approved" or "denied"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Fetch the appeal
    const { data: appeal, error: appealError } = await supabaseAdmin
      .from('appeals')
      .select('*')
      .eq('id', appeal_id)
      .single()

    if (appealError || !appeal) {
      return new Response(
        JSON.stringify({ error: 'Appeal not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (appeal.status !== 'pending' && appeal.status !== 'reviewing') {
      return new Response(
        JSON.stringify({ error: 'Appeal has already been reviewed' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Update the appeal
    await supabaseAdmin
      .from('appeals')
      .update({
        status: decision,
        admin_response: admin_response || null,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', appeal_id)

    // If approved, lift the suspension and reset flags
    if (decision === 'approved') {
      await supabaseAdmin
        .from('profiles')
        .update({
          suspended_until: null,
          moderation_flags: 0,
        })
        .eq('id', appeal.user_id)

      // Log the unsuspension
      await supabaseAdmin.from('moderation_actions').insert({
        user_id: appeal.user_id,
        action_type: 'warning', // using warning type for admin notes
        reason: `Suspension lifted via approved appeal ${appeal_id}. Admin note: ${admin_response || 'Appeal approved'}`,
        performed_by: adminId,
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        appeal_id,
        decision,
        user_id: appeal.user_id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error: any) {
    const status = error?.status || 500
    const message = error?.message || 'Internal server error'
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
