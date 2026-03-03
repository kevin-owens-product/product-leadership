// ============================================================
// report-content edge function
// Allows authenticated users to report shows or episodes that
// contain inappropriate content.
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createAdminNotification } from '../_shared/admin.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const VALID_REASONS = [
  'illegal_content',
  'hate_speech',
  'harassment',
  'sexual_content',
  'violence',
  'dangerous_content',
  'misinformation',
  'other',
] as const

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    const supabaseUser = createClient(supabaseUrl, supabaseServiceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser(authHeader.replace('Bearer ', ''))

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ---- Parse request ----
    const body = await req.json()
    const { show_id, episode_id, reason, description } = body

    if (!show_id && !episode_id) {
      return new Response(
        JSON.stringify({ error: 'Either show_id or episode_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (!reason || !VALID_REASONS.includes(reason)) {
      return new Response(
        JSON.stringify({
          error: `reason must be one of: ${VALID_REASONS.join(', ')}`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ---- Rate-limit: max 10 reports per user per day ----
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    const { count } = await supabaseAdmin
      .from('content_reports')
      .select('*', { count: 'exact', head: true })
      .eq('reporter_id', user.id)
      .gte('created_at', oneDayAgo.toISOString())

    if ((count ?? 0) >= 10) {
      return new Response(
        JSON.stringify({ error: 'Report limit reached. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ---- Prevent duplicate reports ----
    const dupeQuery = supabaseAdmin
      .from('content_reports')
      .select('id', { count: 'exact', head: true })
      .eq('reporter_id', user.id)

    if (show_id) dupeQuery.eq('show_id', show_id)
    if (episode_id) dupeQuery.eq('episode_id', episode_id)

    const { count: dupeCount } = await dupeQuery

    if ((dupeCount ?? 0) > 0) {
      return new Response(
        JSON.stringify({ error: 'You have already reported this content.' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ---- Insert report ----
    const { data: report, error: insertError } = await supabaseAdmin
      .from('content_reports')
      .insert({
        reporter_id: user.id,
        show_id: show_id || null,
        episode_id: episode_id || null,
        reason,
        description: description?.substring(0, 1000) || null,
        status: 'pending',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Report insertion error:', insertError)
      throw new Error('Failed to submit report')
    }

    console.log(
      `Content report created: ${report.id} by user ${user.id} for ${show_id ? 'show' : 'episode'} ${show_id || episode_id}`,
    )

    // Notify admins
    await createAdminNotification(supabaseAdmin, {
      type: 'new_report',
      title: `New content report: ${reason}`,
      body: `User reported ${show_id ? 'a show' : 'an episode'} for ${reason}. ${description ? `Details: ${description.substring(0, 200)}` : ''}`,
      referenceId: report.id,
    })

    return new Response(
      JSON.stringify({ success: true, report_id: report.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('report-content error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
