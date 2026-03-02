// ============================================================
// create-show edge function
// Validates user request, deducts credits, plans show via Claude,
// creates DB records, and triggers script generation pipeline.
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
// Credit calculation (mirrors shared/types.ts calculateCreditsNeeded)
// ---------------------------------------------------------------------------

function calculateCreditsNeeded(
  episodeCount: number,
  lengthMinutes: 15 | 30 | 60,
  voiceTier: 'standard' | 'premium',
): number {
  let creditsPerEpisode: number
  switch (lengthMinutes) {
    case 15:
      creditsPerEpisode = 1
      break
    case 30:
      creditsPerEpisode = 1
      break
    case 60:
      creditsPerEpisode = 2
      break
  }
  const premiumAddon = voiceTier === 'premium' ? 1 : 0
  return episodeCount * (creditsPerEpisode + premiumAddon)
}

// ---------------------------------------------------------------------------
// Claude API – plan the show
// ---------------------------------------------------------------------------

interface ShowPlan {
  title: string
  subtitle: string
  description: string
  icon: string
  host_1_name: string
  host_2_name: string
  episodes: Array<{
    number: number
    title: string
    subtitle: string
    outline: string
  }>
}

async function planShowWithClaude(
  userPrompt: string,
  episodeCount: number,
  episodeLengthMinutes: number,
  anthropicApiKey: string,
): Promise<ShowPlan> {
  const systemPrompt = `You are an expert podcast producer and creative director. Given a podcast concept from a user, you plan out the full show — title, description, episode titles, and detailed outlines for each episode.

Rules:
- The show should feel professional, engaging, and well-structured.
- Choose a punchy, memorable show title.
- Write a compelling 1-2 sentence subtitle.
- Write a 2-3 sentence description for the show.
- Pick an appropriate emoji icon for the show (single emoji).
- Name two distinct podcast hosts. Give them first names only.
- Plan exactly ${episodeCount} episode(s), each targeting ${episodeLengthMinutes} minutes.
- Each episode outline should be 3-5 sentences describing the arc, key talking points, and takeaways.

Respond ONLY with valid JSON matching this schema:
{
  "title": "string",
  "subtitle": "string",
  "description": "string",
  "icon": "emoji",
  "host_1_name": "string",
  "host_2_name": "string",
  "episodes": [
    {
      "number": 1,
      "title": "string",
      "subtitle": "string",
      "outline": "string"
    }
  ]
}`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicApiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Here is the podcast concept:\n\n${userPrompt}\n\nPlan a show with ${episodeCount} episode(s) of ${episodeLengthMinutes} minutes each. Respond with JSON only.`,
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('Claude API error:', response.status, errorBody)
    throw new Error(`Claude API error: ${response.status}`)
  }

  const data = await response.json()
  const textBlock = data.content?.find(
    (block: { type: string }) => block.type === 'text',
  )
  if (!textBlock) {
    throw new Error('No text content in Claude response')
  }

  // Extract JSON – Claude may wrap it in markdown code fences
  let jsonStr = textBlock.text.trim()
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim()
  }

  const plan: ShowPlan = JSON.parse(jsonStr)

  // Validate required fields
  if (
    !plan.title ||
    !plan.episodes ||
    plan.episodes.length !== episodeCount
  ) {
    throw new Error('Invalid show plan from Claude – missing fields or wrong episode count')
  }

  return plan
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ---- Environment variables ----
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')!

    // ---- Authenticate user ----
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Create a client scoped to the calling user (for RLS)
    const supabaseUser = createClient(supabaseUrl, supabaseServiceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    })

    // Also create a service-role client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Resolve user from JWT
    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser(authHeader.replace('Bearer ', ''))

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
    const {
      user_prompt,
      episode_count,
      episode_length_minutes,
      voice_tier,
    } = body

    if (!user_prompt || typeof user_prompt !== 'string' || user_prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'user_prompt is required and must be a non-empty string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (
      !episode_count ||
      typeof episode_count !== 'number' ||
      episode_count < 1 ||
      episode_count > 20
    ) {
      return new Response(
        JSON.stringify({ error: 'episode_count must be a number between 1 and 20' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (![15, 30, 60].includes(episode_length_minutes)) {
      return new Response(
        JSON.stringify({ error: 'episode_length_minutes must be 15, 30, or 60' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (!['standard', 'premium'].includes(voice_tier)) {
      return new Response(
        JSON.stringify({ error: "voice_tier must be 'standard' or 'premium'" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ---- Calculate credits ----
    const creditsNeeded = calculateCreditsNeeded(
      episode_count,
      episode_length_minutes,
      voice_tier,
    )

    // ---- Fetch user profile & check balance ----
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

    if (profile.credits_balance < creditsNeeded) {
      return new Response(
        JSON.stringify({
          error: 'Insufficient credits',
          credits_needed: creditsNeeded,
          credits_available: profile.credits_balance,
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ---- Plan show with Claude ----
    console.log(`Planning show for user ${userId}: "${user_prompt.substring(0, 80)}..."`)

    const plan = await planShowWithClaude(
      user_prompt,
      episode_count,
      episode_length_minutes,
      anthropicApiKey,
    )

    console.log(`Show planned: "${plan.title}" with ${plan.episodes.length} episodes`)

    // ---- Create database records ----

    // 1. Create show record
    const generationConfig = {
      episode_count,
      episode_length_minutes,
      voice_tier,
      host_1_name: plan.host_1_name || 'Alex',
      host_2_name: plan.host_2_name || 'Sam',
    }

    const { data: show, error: showError } = await supabaseAdmin
      .from('shows')
      .insert({
        user_id: userId,
        title: plan.title,
        subtitle: plan.subtitle,
        description: plan.description,
        icon: plan.icon || '🎙️',
        color: '#6366F1', // Default indigo
        user_prompt,
        generation_config: generationConfig,
        status: 'generating',
        episode_count,
        total_duration_minutes: episode_count * episode_length_minutes,
      })
      .select()
      .single()

    if (showError || !show) {
      console.error('Show creation error:', showError)
      throw new Error(`Failed to create show: ${showError?.message}`)
    }

    console.log(`Show record created: ${show.id}`)

    // 2. Create episode records
    const episodeInserts = plan.episodes.map((ep) => ({
      show_id: show.id,
      episode_number: ep.number,
      title: ep.title,
      subtitle: ep.subtitle,
      status: 'pending',
    }))

    const { data: episodes, error: episodesError } = await supabaseAdmin
      .from('episodes')
      .insert(episodeInserts)
      .select()
      .order('episode_number', { ascending: true })

    if (episodesError || !episodes || episodes.length === 0) {
      console.error('Episodes creation error:', episodesError)
      // Clean up the show if episodes fail
      await supabaseAdmin.from('shows').delete().eq('id', show.id)
      throw new Error(`Failed to create episodes: ${episodesError?.message}`)
    }

    console.log(`${episodes.length} episode records created`)

    // 3. Deduct credits from profile
    const newBalance = profile.credits_balance - creditsNeeded

    const { error: creditUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({
        credits_balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (creditUpdateError) {
      console.error('Credit deduction error:', creditUpdateError)
      // Clean up
      await supabaseAdmin.from('episodes').delete().eq('show_id', show.id)
      await supabaseAdmin.from('shows').delete().eq('id', show.id)
      throw new Error(`Failed to deduct credits: ${creditUpdateError.message}`)
    }

    // 4. Create credit_transaction record
    const { error: txnError } = await supabaseAdmin
      .from('credit_transactions')
      .insert({
        user_id: userId,
        amount: -creditsNeeded,
        balance_after: newBalance,
        type: 'generation_spend',
        reference_id: show.id,
        description: `Generated show "${plan.title}" (${episode_count} ep x ${episode_length_minutes}min, ${voice_tier})`,
      })

    if (txnError) {
      console.error('Credit transaction record error:', txnError)
      // Non-fatal — credits were already deducted, log and continue
    }

    // 5. Create generation_job record
    const { data: job, error: jobError } = await supabaseAdmin
      .from('generation_jobs')
      .insert({
        show_id: show.id,
        episode_id: episodes[0].id,
        job_type: 'full_show',
        status: 'queued',
        progress: 0,
      })
      .select()
      .single()

    if (jobError) {
      console.error('Generation job creation error:', jobError)
      // Non-fatal for user response, but log it
    }

    // ---- Store episode outlines in a metadata approach ----
    // We store outlines directly on episodes so generate-script can access them
    for (const ep of plan.episodes) {
      const matchingEpisode = episodes.find(
        (e: { episode_number: number }) => e.episode_number === ep.number,
      )
      if (matchingEpisode) {
        await supabaseAdmin
          .from('episodes')
          .update({ subtitle: ep.subtitle })
          .eq('id', matchingEpisode.id)
      }
    }

    // ---- Trigger generate-script for the first episode ----
    console.log(
      `Triggering script generation for episode 1 (${episodes[0].id})`,
    )

    const generateScriptUrl = `${supabaseUrl}/functions/v1/generate-script`

    // Fire-and-forget: we do not await the full generation
    fetch(generateScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
      },
      body: JSON.stringify({
        show_id: show.id,
        episode_id: episodes[0].id,
        // Pass plan data so generate-script has the outlines
        _plan: plan,
      }),
    }).catch((err) => {
      console.error('Failed to trigger generate-script:', err)
    })

    // ---- Return response ----
    const response = {
      show,
      episodes,
      job: job || null,
      credits_deducted: creditsNeeded,
      credits_remaining: newBalance,
    }

    console.log(`create-show completed successfully for show ${show.id}`)

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('create-show error:', error)
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
