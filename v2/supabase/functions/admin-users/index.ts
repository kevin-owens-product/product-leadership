// ============================================================
// admin-users edge function
// View user moderation history, suspend/unsuspend/ban users.
//
// GET  ?user_id=...            — get user moderation profile
// GET  ?flagged=true&limit=50  — list flagged users
// POST { user_id, action, reason, duration_days }
//   action: "warn" | "suspend" | "unsuspend" | "ban" | "reset_flags"
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireAdmin, createAdminNotification } from '../_shared/admin.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

    // ---- GET: User moderation profile or flagged user list ----
    if (req.method === 'GET') {
      const url = new URL(req.url)
      const userId = url.searchParams.get('user_id')
      const flagged = url.searchParams.get('flagged')

      if (userId) {
        // Single user moderation profile
        const [profileRes, actionsRes, reportsRes, logRes, appealsRes] = await Promise.all([
          supabaseAdmin
            .from('profiles')
            .select('id, display_name, credits_balance, tier, moderation_flags, suspended_until, is_admin, created_at')
            .eq('id', userId)
            .single(),
          supabaseAdmin
            .from('moderation_actions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20),
          supabaseAdmin
            .from('content_reports')
            .select('*, show:shows(id, title)')
            .or(`show_id.in.(select id from shows where user_id='${userId}')`)
            .order('created_at', { ascending: false })
            .limit(20),
          supabaseAdmin
            .from('moderation_log')
            .select('*')
            .eq('user_id', userId)
            .eq('result', 'fail')
            .order('created_at', { ascending: false })
            .limit(20),
          supabaseAdmin
            .from('appeals')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10),
        ])

        return new Response(
          JSON.stringify({
            profile: profileRes.data,
            moderation_actions: actionsRes.data || [],
            reports_against: reportsRes.data || [],
            auto_moderation_failures: logRes.data || [],
            appeals: appealsRes.data || [],
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      if (flagged === 'true') {
        // List users with moderation flags
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100)
        const offset = parseInt(url.searchParams.get('offset') || '0')

        const { data: users, error } = await supabaseAdmin
          .from('profiles')
          .select('id, display_name, credits_balance, tier, moderation_flags, suspended_until, created_at')
          .gt('moderation_flags', 0)
          .order('moderation_flags', { ascending: false })
          .range(offset, offset + limit - 1)

        if (error) throw new Error(error.message)

        return new Response(
          JSON.stringify({ users }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      return new Response(
        JSON.stringify({ error: 'Provide user_id or flagged=true' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ---- POST: Take action on a user ----
    if (req.method === 'POST') {
      const body = await req.json()
      const { user_id, action, reason, duration_days } = body

      if (!user_id || !action) {
        return new Response(
          JSON.stringify({ error: 'user_id and action are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      const validActions = ['warn', 'suspend', 'unsuspend', 'ban', 'reset_flags']
      if (!validActions.includes(action)) {
        return new Response(
          JSON.stringify({ error: `action must be one of: ${validActions.join(', ')}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      // Verify user exists
      const { data: targetProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, display_name, moderation_flags')
        .eq('id', user_id)
        .single()

      if (!targetProfile) {
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      const actionReason = reason || `Admin ${action} action`

      switch (action) {
        case 'warn': {
          await supabaseAdmin
            .from('profiles')
            .update({ moderation_flags: (targetProfile.moderation_flags || 0) + 1 })
            .eq('id', user_id)

          await supabaseAdmin.from('moderation_actions').insert({
            user_id,
            action_type: 'warning',
            reason: actionReason,
            performed_by: adminId,
          })
          break
        }

        case 'suspend': {
          const days = duration_days || 30
          const suspendedUntil = new Date()
          suspendedUntil.setDate(suspendedUntil.getDate() + days)

          await supabaseAdmin
            .from('profiles')
            .update({ suspended_until: suspendedUntil.toISOString() })
            .eq('id', user_id)

          await supabaseAdmin.from('moderation_actions').insert({
            user_id,
            action_type: 'suspended',
            reason: actionReason,
            performed_by: adminId,
            expires_at: suspendedUntil.toISOString(),
          })
          break
        }

        case 'unsuspend': {
          await supabaseAdmin
            .from('profiles')
            .update({ suspended_until: null })
            .eq('id', user_id)

          await supabaseAdmin.from('moderation_actions').insert({
            user_id,
            action_type: 'warning', // logged as admin action
            reason: `Unsuspended: ${actionReason}`,
            performed_by: adminId,
          })
          break
        }

        case 'ban': {
          const banned = new Date('2099-12-31T23:59:59Z')
          await supabaseAdmin
            .from('profiles')
            .update({ suspended_until: banned.toISOString() })
            .eq('id', user_id)

          await supabaseAdmin.from('moderation_actions').insert({
            user_id,
            action_type: 'banned',
            reason: actionReason,
            performed_by: adminId,
          })
          break
        }

        case 'reset_flags': {
          await supabaseAdmin
            .from('profiles')
            .update({ moderation_flags: 0, suspended_until: null })
            .eq('id', user_id)
          break
        }
      }

      return new Response(
        JSON.stringify({ success: true, action, user_id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
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
