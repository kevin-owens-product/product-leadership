// ============================================================
// submit-appeal edge function
// Allows suspended users to appeal their suspension.
// Max 1 pending appeal at a time.
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireAuth, createAdminNotification } from '../_shared/admin.ts'

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

    const userId = await requireAuth(supabaseUser, authHeader)

    // ---- GET: Fetch user's appeals ----
    if (req.method === 'GET') {
      const { data: appeals } = await supabaseAdmin
        .from('appeals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10)

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('suspended_until, moderation_flags')
        .eq('id', userId)
        .single()

      return new Response(
        JSON.stringify({
          appeals: appeals || [],
          suspended_until: profile?.suspended_until || null,
          moderation_flags: profile?.moderation_flags || 0,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ---- POST: Submit a new appeal ----
    if (req.method === 'POST') {
      const body = await req.json()
      const { reason } = body

      if (!reason || typeof reason !== 'string' || reason.trim().length < 20) {
        return new Response(
          JSON.stringify({ error: 'Please provide a detailed reason for your appeal (at least 20 characters).' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      // Check if user is actually suspended
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('suspended_until, moderation_flags')
        .eq('id', userId)
        .single()

      if (!profile?.suspended_until || new Date(profile.suspended_until) <= new Date()) {
        return new Response(
          JSON.stringify({ error: 'Your account is not currently suspended.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      // Check for existing pending appeal
      const { count } = await supabaseAdmin
        .from('appeals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'pending')

      if ((count ?? 0) > 0) {
        return new Response(
          JSON.stringify({ error: 'You already have a pending appeal. Please wait for it to be reviewed.' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      // Find the most recent moderation action
      const { data: latestAction } = await supabaseAdmin
        .from('moderation_actions')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      // Create the appeal
      const { data: appeal, error: insertError } = await supabaseAdmin
        .from('appeals')
        .insert({
          user_id: userId,
          action_id: latestAction?.id || null,
          reason: reason.substring(0, 2000),
          status: 'pending',
        })
        .select()
        .single()

      if (insertError) {
        throw new Error(`Failed to submit appeal: ${insertError.message}`)
      }

      // Notify admins
      await createAdminNotification(supabaseAdmin, {
        type: 'new_appeal',
        title: 'New suspension appeal',
        body: `User submitted an appeal: "${reason.substring(0, 100)}..."`,
        referenceId: appeal.id,
      })

      return new Response(
        JSON.stringify({ success: true, appeal_id: appeal.id }),
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
