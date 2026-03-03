// ============================================================
// admin-reports edge function
// List, filter, and action content reports. Admin-only.
//
// GET  ?status=pending&limit=50&offset=0  — list reports
// POST { report_id, action, review_notes } — action a report
//   action: "dismiss" | "warn_user" | "remove_content" | "suspend_user" | "ban_user"
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

    // ---- GET: List reports ----
    if (req.method === 'GET') {
      const url = new URL(req.url)
      const status = url.searchParams.get('status') || undefined
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100)
      const offset = parseInt(url.searchParams.get('offset') || '0')

      let query = supabaseAdmin
        .from('content_reports')
        .select(`
          *,
          reporter:profiles!reporter_id(id, display_name, email:id),
          show:shows(id, title, user_id, user_prompt, status),
          episode:episodes(id, title, episode_number, status)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (status) {
        query = query.eq('status', status)
      }

      const { data: reports, error, count } = await query

      if (error) {
        throw new Error(`Failed to fetch reports: ${error.message}`)
      }

      return new Response(
        JSON.stringify({ reports, total: count }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ---- POST: Action a report ----
    if (req.method === 'POST') {
      const body = await req.json()
      const { report_id, action, review_notes } = body

      if (!report_id || !action) {
        return new Response(
          JSON.stringify({ error: 'report_id and action are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      const validActions = ['dismiss', 'warn_user', 'remove_content', 'suspend_user', 'ban_user']
      if (!validActions.includes(action)) {
        return new Response(
          JSON.stringify({ error: `action must be one of: ${validActions.join(', ')}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      // Fetch the report
      const { data: report, error: reportError } = await supabaseAdmin
        .from('content_reports')
        .select('*, show:shows(id, user_id, title)')
        .eq('id', report_id)
        .single()

      if (reportError || !report) {
        return new Response(
          JSON.stringify({ error: 'Report not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      const targetUserId = report.show?.user_id

      // Update report status
      await supabaseAdmin
        .from('content_reports')
        .update({
          status: action === 'dismiss' ? 'dismissed' : 'actioned',
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminId,
          review_notes: review_notes || null,
        })
        .eq('id', report_id)

      // Take the appropriate action
      if (action === 'dismiss') {
        // No further action needed
      } else if (targetUserId) {
        const actionMap: Record<string, string> = {
          warn_user: 'warning',
          remove_content: 'content_removed',
          suspend_user: 'suspended',
          ban_user: 'banned',
        }

        // Create moderation action record
        await supabaseAdmin.from('moderation_actions').insert({
          user_id: targetUserId,
          action_type: actionMap[action],
          reason: `Admin action on report ${report_id}: ${review_notes || report.reason}`,
          show_id: report.show_id || null,
          report_id: report_id,
          performed_by: adminId,
          expires_at: action === 'suspend_user'
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            : null,
        })

        // Apply the action to the user
        if (action === 'warn_user') {
          await supabaseAdmin
            .from('profiles')
            .update({ moderation_flags: (report.show?.moderation_flags || 0) + 1 })
            .eq('id', targetUserId)
        }

        if (action === 'remove_content' && report.show_id) {
          await supabaseAdmin
            .from('shows')
            .update({ status: 'archived' })
            .eq('id', report.show_id)
        }

        if (action === 'suspend_user') {
          const suspendedUntil = new Date()
          suspendedUntil.setDate(suspendedUntil.getDate() + 30)
          await supabaseAdmin
            .from('profiles')
            .update({ suspended_until: suspendedUntil.toISOString() })
            .eq('id', targetUserId)
        }

        if (action === 'ban_user') {
          // Permanent suspension (far future date)
          const banned = new Date('2099-12-31T23:59:59Z')
          await supabaseAdmin
            .from('profiles')
            .update({ suspended_until: banned.toISOString() })
            .eq('id', targetUserId)
        }
      }

      return new Response(
        JSON.stringify({ success: true, action }),
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
