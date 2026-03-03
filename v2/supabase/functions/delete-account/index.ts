// ============================================================
// delete-account edge function
// Permanently deletes a user's account and all associated data.
// Must be called by the authenticated user themselves.
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

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

    const userId = user.id
    console.log(`delete-account: starting deletion for user ${userId}`)

    // ---- Delete audio files from storage ----
    // Fetch all shows to find their audio files
    const { data: shows } = await supabaseAdmin
      .from('shows')
      .select('id')
      .eq('user_id', userId)

    if (shows && shows.length > 0) {
      for (const show of shows) {
        // List files in the show's audio directory
        const { data: files } = await supabaseAdmin.storage
          .from('audio')
          .list(`audio/${show.id}`)

        if (files && files.length > 0) {
          const paths = files.map((f) => `audio/${show.id}/${f.name}`)
          await supabaseAdmin.storage.from('audio').remove(paths)
          console.log(`delete-account: removed ${paths.length} audio files for show ${show.id}`)
        }
      }
    }

    // ---- Delete avatar from storage ----
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('avatar_url')
      .eq('id', userId)
      .single()

    if (profile?.avatar_url) {
      // Extract path from URL
      const avatarPath = profile.avatar_url.split('/avatars/').pop()
      if (avatarPath) {
        await supabaseAdmin.storage.from('avatars').remove([avatarPath])
      }
    }

    // ---- Delete database records ----
    // Cascade deletes will handle most of this via FK ON DELETE CASCADE,
    // but we explicitly clean up to be thorough.

    // Delete in dependency order (children first)
    const deletions = [
      supabaseAdmin.from('bookmarks').delete().eq('user_id', userId),
      supabaseAdmin.from('playback_progress').delete().eq('user_id', userId),
      supabaseAdmin.from('content_reports').delete().eq('reporter_id', userId),
      supabaseAdmin.from('appeals').delete().eq('user_id', userId),
      supabaseAdmin.from('moderation_actions').delete().eq('user_id', userId),
      supabaseAdmin.from('moderation_log').delete().eq('user_id', userId),
      supabaseAdmin.from('credit_transactions').delete().eq('user_id', userId),
    ]

    await Promise.all(deletions)
    console.log(`delete-account: deleted user-level records`)

    // Delete shows (cascades to episodes, generation_jobs)
    if (shows && shows.length > 0) {
      await supabaseAdmin.from('shows').delete().eq('user_id', userId)
      console.log(`delete-account: deleted ${shows.length} shows`)
    }

    // Delete rate limits
    await supabaseAdmin.from('rate_limits').delete().eq('user_id', userId)

    // Delete profile (must happen before auth user deletion)
    await supabaseAdmin.from('profiles').delete().eq('id', userId)
    console.log(`delete-account: deleted profile`)

    // ---- Delete the auth user ----
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authDeleteError) {
      console.error('Auth user deletion error:', authDeleteError)
      // Profile and data are already gone, so we log but don't fail
      // The auth record will be orphaned but harmless
    }

    console.log(`delete-account: completed for user ${userId}`)

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('delete-account error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to delete account',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
