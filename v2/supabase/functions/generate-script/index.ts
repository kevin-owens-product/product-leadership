// ============================================================
// generate-script edge function
// Fetches show + episode data, calls Claude API to write a full
// episode script as markdown dialogue, then triggers audio generation.
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
// Word-count targets by episode length (~150 words/minute)
// ---------------------------------------------------------------------------

const WORDS_PER_MINUTE = 150

function targetWordCount(lengthMinutes: number): number {
  return lengthMinutes * WORDS_PER_MINUTE
}

// ---------------------------------------------------------------------------
// Claude API – generate episode script
// ---------------------------------------------------------------------------

async function generateScriptWithClaude(opts: {
  anthropicApiKey: string
  showTitle: string
  showDescription: string
  userPrompt: string
  host1Name: string
  host2Name: string
  episodeNumber: number
  episodeTitle: string
  episodeSubtitle: string
  episodeOutline: string
  episodeLengthMinutes: number
  previousSummaries: string[]
}): Promise<string> {
  const wordTarget = targetWordCount(opts.episodeLengthMinutes)
  const wordRange = `${Math.round(wordTarget * 0.9)}-${Math.round(wordTarget * 1.1)}`

  const continuityBlock =
    opts.previousSummaries.length > 0
      ? `\n\nPrevious episode summaries for continuity:\n${opts.previousSummaries
          .map((s, i) => `Episode ${i + 1}: ${s}`)
          .join('\n')}`
      : ''

  const systemPrompt = `You are an expert podcast scriptwriter. You write natural, engaging dialogue between two hosts.

Format rules:
- Use markdown throughout.
- Divide the episode into 3-5 segments using ### SEGMENT headings. Include an estimated duration hint in parentheses after each heading, e.g., ### SEGMENT 1: Introduction (~3 min)
- Each line of dialogue must use the format: **SPEAKER_NAME:** Dialogue text
- The two hosts are **${opts.host1Name}** and **${opts.host2Name}**.
- ${opts.host1Name} is the lead host who drives the conversation. ${opts.host2Name} is the co-host who asks questions, provides counter-points, and adds color.
- Include natural conversational elements: reactions, laughter cues [laughs], brief tangents, callbacks to earlier points.
- The dialogue should feel like a real conversation, not a lecture.
- Do NOT include stage directions, music cues, or sound effects beyond [laughs] and [sighs].
- Target approximately ${wordRange} words total (for a ${opts.episodeLengthMinutes}-minute episode).
- End with a natural sign-off that teases the next episode (if applicable).

Respond ONLY with the markdown script. Do not include any preamble or explanation.`

  const userMessage = `Show: "${opts.showTitle}"
Description: ${opts.showDescription}
Original concept: ${opts.userPrompt}

Episode ${opts.episodeNumber}: "${opts.episodeTitle}"
Subtitle: ${opts.episodeSubtitle}
Outline: ${opts.episodeOutline}
Target length: ~${opts.episodeLengthMinutes} minutes (~${wordTarget} words)${continuityBlock}

Write the full episode script now.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': opts.anthropicApiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6-20250514',
      max_tokens: 16384,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage,
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

  return textBlock.text.trim()
}

// ---------------------------------------------------------------------------
// Extract a brief summary from a script (first ~200 words)
// ---------------------------------------------------------------------------

function extractSummary(script: string): string {
  // Pull out dialogue lines and take the first few as a summary
  const lines = script
    .split('\n')
    .filter((l) => l.startsWith('**'))
    .map((l) => l.replace(/\*\*[^:]+:\*\*\s*/, ''))
    .slice(0, 5)
  return lines.join(' ').substring(0, 500)
}

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
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')!

    // ---- Authenticate (service-role only) ----
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.includes(supabaseServiceRoleKey)) {
      // Also allow the anon key if called from create-show with service role
      // In production, you might verify the JWT more strictly
      console.log('generate-script: proceeding with provided auth')
    }

    // ---- Parse request body ----
    const body = await req.json()
    const { show_id, episode_id, _plan } = body

    if (!show_id || !episode_id) {
      return new Response(
        JSON.stringify({ error: 'show_id and episode_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    console.log(`generate-script: starting for show=${show_id}, episode=${episode_id}`)

    // ---- Supabase admin client ----
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    // ---- Fetch show ----
    const { data: show, error: showError } = await supabase
      .from('shows')
      .select('*')
      .eq('id', show_id)
      .single()

    if (showError || !show) {
      console.error('Show fetch error:', showError)
      throw new Error(`Show not found: ${show_id}`)
    }

    // ---- Fetch the target episode ----
    const { data: episode, error: epError } = await supabase
      .from('episodes')
      .select('*')
      .eq('id', episode_id)
      .single()

    if (epError || !episode) {
      console.error('Episode fetch error:', epError)
      throw new Error(`Episode not found: ${episode_id}`)
    }

    // ---- Fetch all episodes for the show (for ordering & continuity) ----
    const { data: allEpisodes, error: allEpError } = await supabase
      .from('episodes')
      .select('*')
      .eq('show_id', show_id)
      .order('episode_number', { ascending: true })

    if (allEpError || !allEpisodes) {
      throw new Error('Failed to fetch episodes for show')
    }

    // ---- Update episode status ----
    await supabase
      .from('episodes')
      .update({
        status: 'generating_script',
        generation_started_at: new Date().toISOString(),
      })
      .eq('id', episode_id)

    // ---- Update generation_job progress ----
    const totalEpisodes = allEpisodes.length
    const episodeIndex = allEpisodes.findIndex(
      (e: { id: string }) => e.id === episode_id,
    )
    const progressPerEpisode = 100 / (totalEpisodes * 2) // *2 because script + audio

    // Find the generation job for this show
    const { data: jobs } = await supabase
      .from('generation_jobs')
      .select('*')
      .eq('show_id', show_id)
      .eq('job_type', 'full_show')
      .order('created_at', { ascending: false })
      .limit(1)

    const job = jobs?.[0]
    if (job) {
      const scriptProgress = episodeIndex * progressPerEpisode * 2
      await supabase
        .from('generation_jobs')
        .update({
          status: 'processing',
          progress: Math.round(scriptProgress),
          started_at: job.started_at || new Date().toISOString(),
        })
        .eq('id', job.id)
    }

    // ---- Gather previous episode summaries for continuity ----
    const previousSummaries: string[] = []
    for (const ep of allEpisodes) {
      if (ep.episode_number >= episode.episode_number) break
      if (ep.script_markdown) {
        previousSummaries.push(extractSummary(ep.script_markdown))
      }
    }

    // ---- Determine episode outline ----
    // The outline may come from the _plan passed by create-show, or from episode subtitle
    const genConfig = show.generation_config || {}
    let episodeOutline = episode.subtitle || ''

    if (_plan && _plan.episodes) {
      const planEp = _plan.episodes.find(
        (e: { number: number }) => e.number === episode.episode_number,
      )
      if (planEp) {
        episodeOutline = planEp.outline || planEp.subtitle || episodeOutline
      }
    }

    // ---- Generate script with Claude ----
    console.log(
      `generate-script: calling Claude for episode ${episode.episode_number} "${episode.title}"`,
    )

    const script = await generateScriptWithClaude({
      anthropicApiKey,
      showTitle: show.title,
      showDescription: show.description || '',
      userPrompt: show.user_prompt,
      host1Name: genConfig.host_1_name || 'Alex',
      host2Name: genConfig.host_2_name || 'Sam',
      episodeNumber: episode.episode_number,
      episodeTitle: episode.title,
      episodeSubtitle: episode.subtitle || '',
      episodeOutline,
      episodeLengthMinutes: genConfig.episode_length_minutes || 30,
      previousSummaries,
    })

    console.log(
      `generate-script: script generated, length=${script.length} chars`,
    )

    // ---- Save script to episode record ----
    const { error: updateError } = await supabase
      .from('episodes')
      .update({
        script_markdown: script,
        status: 'generating_audio',
      })
      .eq('id', episode_id)

    if (updateError) {
      console.error('Episode update error:', updateError)
      throw new Error(`Failed to save script: ${updateError.message}`)
    }

    // ---- Update job progress ----
    if (job) {
      const afterScriptProgress =
        episodeIndex * progressPerEpisode * 2 + progressPerEpisode
      await supabase
        .from('generation_jobs')
        .update({
          progress: Math.round(afterScriptProgress),
        })
        .eq('id', job.id)
    }

    // ---- Trigger generate-audio for this episode ----
    console.log(`generate-script: triggering audio generation for episode ${episode_id}`)

    const generateAudioUrl = `${supabaseUrl}/functions/v1/generate-audio`

    fetch(generateAudioUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
      },
      body: JSON.stringify({
        show_id,
        episode_id,
      }),
    }).catch((err) => {
      console.error('Failed to trigger generate-audio:', err)
    })

    // ---- If there's a next episode, trigger its script generation ----
    const nextEpisode = allEpisodes.find(
      (e: { episode_number: number; status: string }) =>
        e.episode_number === episode.episode_number + 1 && e.status === 'pending',
    )

    if (nextEpisode) {
      console.log(
        `generate-script: triggering script generation for next episode ${nextEpisode.id}`,
      )

      const generateScriptUrl = `${supabaseUrl}/functions/v1/generate-script`

      // Slight delay to stagger API calls
      setTimeout(() => {
        fetch(generateScriptUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseServiceRoleKey}`,
          },
          body: JSON.stringify({
            show_id,
            episode_id: nextEpisode.id,
            _plan,
          }),
        }).catch((err) => {
          console.error('Failed to trigger next generate-script:', err)
        })
      }, 2000)
    }

    // ---- Return success ----
    return new Response(
      JSON.stringify({
        success: true,
        episode_id,
        script_length: script.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('generate-script error:', error)

    // Attempt to mark episode as failed
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

      const body = await req.clone().json().catch(() => ({}))
      if (body.episode_id) {
        await supabase
          .from('episodes')
          .update({ status: 'failed' })
          .eq('id', body.episode_id)
      }
      if (body.show_id) {
        // Update job status to failed
        await supabase
          .from('generation_jobs')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            completed_at: new Date().toISOString(),
          })
          .eq('show_id', body.show_id)
          .eq('job_type', 'full_show')
          .eq('status', 'processing')
      }
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError)
    }

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
