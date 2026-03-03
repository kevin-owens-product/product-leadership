// ============================================================
// generate-audio edge function
// Parses episode script into dialogue lines, calls OpenAI TTS
// for each line, concatenates MP3 chunks, uploads to storage,
// and updates episode/show status.
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
// TTS configuration (mirrors shared/types.ts TTS_CONFIGS)
// ---------------------------------------------------------------------------

interface TTSConfig {
  model: string
  voice1: string
  voice2: string
}

const TTS_CONFIGS: Record<string, TTSConfig> = {
  standard: {
    model: 'tts-1',
    voice1: 'onyx',
    voice2: 'nova',
  },
  premium: {
    model: 'tts-1-hd',
    voice1: 'onyx',
    voice2: 'nova',
  },
}

// ---------------------------------------------------------------------------
// Parse dialogue lines from markdown script
// ---------------------------------------------------------------------------

interface DialogueLine {
  speaker: string
  text: string
  type: 'host1' | 'host2'
}

function parseDialogueLines(
  scriptMarkdown: string,
  host1Name: string,
  host2Name: string,
): DialogueLine[] {
  const lines: DialogueLine[] = []
  const rawLines = scriptMarkdown.split('\n')

  // Match lines like: **SpeakerName:** dialogue text
  const dialoguePattern = /^\*\*([^*]+)\*\*:\s*(.+)$/

  for (const raw of rawLines) {
    const trimmed = raw.trim()
    if (!trimmed) continue

    const match = trimmed.match(dialoguePattern)
    if (!match) continue

    const speaker = match[1].trim()
    const text = match[2].trim()

    if (!text) continue

    // Clean the text: remove markdown formatting cues but keep [laughs] etc.
    const cleanedText = text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .trim()

    if (!cleanedText) continue

    // Determine host type based on speaker name
    const isHost1 =
      speaker.toLowerCase() === host1Name.toLowerCase() ||
      speaker.toLowerCase().includes(host1Name.toLowerCase())

    lines.push({
      speaker,
      text: cleanedText,
      type: isHost1 ? 'host1' : 'host2',
    })
  }

  return lines
}

// ---------------------------------------------------------------------------
// OpenAI TTS API call
// ---------------------------------------------------------------------------

async function generateTTSAudio(
  text: string,
  voice: string,
  model: string,
  openaiApiKey: string,
): Promise<Uint8Array> {
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: text,
      voice,
      response_format: 'mp3',
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error(`OpenAI TTS error (${response.status}):`, errorBody)
    throw new Error(`OpenAI TTS API error: ${response.status}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  return new Uint8Array(arrayBuffer)
}

// ---------------------------------------------------------------------------
// Estimate audio duration from character count
// Average speaking rate: ~1000 characters per 60 seconds
// ---------------------------------------------------------------------------

function estimateAudioDuration(totalCharacters: number): number {
  return Math.round((totalCharacters / 1000) * 60)
}

// ---------------------------------------------------------------------------
// Concatenate multiple Uint8Array buffers
// ---------------------------------------------------------------------------

function concatenateBuffers(buffers: Uint8Array[]): Uint8Array {
  const totalLength = buffers.reduce((sum, buf) => sum + buf.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const buf of buffers) {
    result.set(buf, offset)
    offset += buf.length
  }
  return result
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Keep a reference to request body for error handling
  let requestBody: { show_id?: string; episode_id?: string } = {}

  try {
    // ---- Environment variables ----
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!

    // ---- Parse request body ----
    requestBody = await req.json()
    const { show_id, episode_id } = requestBody

    if (!show_id || !episode_id) {
      return new Response(
        JSON.stringify({ error: 'show_id and episode_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    console.log(`generate-audio: starting for show=${show_id}, episode=${episode_id}`)

    // ---- Supabase admin client ----
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    // ---- Fetch episode ----
    const { data: episode, error: epError } = await supabase
      .from('episodes')
      .select('*')
      .eq('id', episode_id)
      .single()

    if (epError || !episode) {
      console.error('Episode fetch error:', epError)
      throw new Error(`Episode not found: ${episode_id}`)
    }

    if (!episode.script_markdown) {
      throw new Error(`Episode ${episode_id} has no script_markdown`)
    }

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

    // ---- Determine TTS configuration ----
    const genConfig = show.generation_config || {}
    const voiceTier = genConfig.voice_tier || 'standard'
    const ttsConfig = TTS_CONFIGS[voiceTier] || TTS_CONFIGS.standard
    const host1Name = genConfig.host_1_name || 'Alex'
    const host2Name = genConfig.host_2_name || 'Sam'

    console.log(
      `generate-audio: using model=${ttsConfig.model}, voices=${ttsConfig.voice1}/${ttsConfig.voice2}`,
    )

    // ---- Update episode status ----
    await supabase
      .from('episodes')
      .update({ status: 'generating_audio' })
      .eq('id', episode_id)

    // ---- Parse dialogue lines ----
    const dialogueLines = parseDialogueLines(
      episode.script_markdown,
      host1Name,
      host2Name,
    )

    if (dialogueLines.length === 0) {
      throw new Error('No dialogue lines found in script')
    }

    console.log(`generate-audio: parsed ${dialogueLines.length} dialogue lines`)

    // ---- Generate TTS audio for each line ----
    const audioChunks: Uint8Array[] = []
    let totalCharacters = 0
    let processedLines = 0

    // Find generation job for progress updates
    const { data: jobs } = await supabase
      .from('generation_jobs')
      .select('*')
      .eq('show_id', show_id)
      .eq('job_type', 'full_show')
      .order('created_at', { ascending: false })
      .limit(1)

    const job = jobs?.[0]

    // Fetch all episodes for progress calculation
    const { data: allEpisodes } = await supabase
      .from('episodes')
      .select('id, episode_number, status')
      .eq('show_id', show_id)
      .order('episode_number', { ascending: true })

    const totalEpisodes = allEpisodes?.length || 1
    const episodeIndex = allEpisodes?.findIndex(
      (e: { id: string }) => e.id === episode_id,
    ) ?? 0
    const progressPerEpisode = 100 / (totalEpisodes * 2)

    // Process lines in batches to manage memory and provide progress
    const BATCH_SIZE = 5

    for (let i = 0; i < dialogueLines.length; i += BATCH_SIZE) {
      const batch = dialogueLines.slice(i, i + BATCH_SIZE)

      // Process batch lines sequentially to maintain order and avoid rate limits
      for (const line of batch) {
        const voice =
          line.type === 'host1' ? ttsConfig.voice1 : ttsConfig.voice2

        try {
          const audioData = await generateTTSAudio(
            line.text,
            voice,
            ttsConfig.model,
            openaiApiKey,
          )

          audioChunks.push(audioData)
          totalCharacters += line.text.length
          processedLines++
        } catch (ttsError) {
          console.error(
            `TTS error for line ${processedLines + 1} (${line.speaker}):`,
            ttsError,
          )
          // On TTS failure, skip the line rather than failing the entire episode
          // This is a trade-off: partial audio vs. no audio
          console.warn(`Skipping line: "${line.text.substring(0, 50)}..."`)
          processedLines++
        }
      }

      // Update job progress periodically
      if (job && i % (BATCH_SIZE * 2) === 0) {
        const lineProgress = processedLines / dialogueLines.length
        const audioPhaseProgress = progressPerEpisode * lineProgress
        const baseProgress =
          episodeIndex * progressPerEpisode * 2 + progressPerEpisode
        const currentProgress = baseProgress + audioPhaseProgress

        await supabase
          .from('generation_jobs')
          .update({ progress: Math.min(Math.round(currentProgress), 99) })
          .eq('id', job.id)
      }

      console.log(
        `generate-audio: processed ${processedLines}/${dialogueLines.length} lines`,
      )
    }

    if (audioChunks.length === 0) {
      throw new Error('No audio chunks were generated successfully')
    }

    // ---- Concatenate all MP3 chunks ----
    console.log(
      `generate-audio: concatenating ${audioChunks.length} audio chunks`,
    )
    const finalAudio = concatenateBuffers(audioChunks)
    console.log(`generate-audio: final audio size = ${finalAudio.length} bytes`)

    // ---- Upload to Supabase Storage ----
    const storagePath = `audio/${show_id}/episode-${episode.episode_number}.mp3`

    const { error: uploadError } = await supabase.storage
      .from('audio')
      .upload(storagePath, finalAudio, {
        contentType: 'audio/mpeg',
        upsert: true,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      throw new Error(`Failed to upload audio: ${uploadError.message}`)
    }

    console.log(`generate-audio: uploaded to ${storagePath}`)

    // ---- Get public URL ----
    const {
      data: { publicUrl },
    } = supabase.storage.from('audio').getPublicUrl(storagePath)

    console.log(`generate-audio: public URL = ${publicUrl}`)

    // ---- Estimate audio duration ----
    const estimatedDuration = estimateAudioDuration(totalCharacters)

    // ---- Update episode record ----
    const { error: updateError } = await supabase
      .from('episodes')
      .update({
        audio_url: publicUrl,
        audio_duration_seconds: estimatedDuration,
        status: 'ready',
        generation_completed_at: new Date().toISOString(),
      })
      .eq('id', episode_id)

    if (updateError) {
      console.error('Episode update error:', updateError)
      throw new Error(`Failed to update episode: ${updateError.message}`)
    }

    console.log(
      `generate-audio: episode ${episode_id} marked as ready (${estimatedDuration}s estimated)`,
    )

    // ---- Check if all episodes are ready ----
    const { data: updatedEpisodes } = await supabase
      .from('episodes')
      .select('id, status')
      .eq('show_id', show_id)

    const allReady = updatedEpisodes?.every(
      (e: { status: string }) => e.status === 'ready',
    )
    const anyFailed = updatedEpisodes?.some(
      (e: { status: string }) => e.status === 'failed',
    )

    if (allReady) {
      console.log(`generate-audio: all episodes ready, updating show status`)

      await supabase
        .from('shows')
        .update({
          status: 'ready',
          updated_at: new Date().toISOString(),
        })
        .eq('id', show_id)

      // Mark job as completed
      if (job) {
        await supabase
          .from('generation_jobs')
          .update({
            status: 'completed',
            progress: 100,
            completed_at: new Date().toISOString(),
          })
          .eq('id', job.id)
      }
    } else if (anyFailed) {
      // If any episode failed, mark show as failed
      await supabase
        .from('shows')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', show_id)

      if (job) {
        await supabase
          .from('generation_jobs')
          .update({
            status: 'failed',
            error_message: 'One or more episodes failed to generate',
            completed_at: new Date().toISOString(),
          })
          .eq('id', job.id)
      }
    } else {
      // Update job progress for this completed episode
      if (job) {
        const completedProgress =
          (episodeIndex + 1) * progressPerEpisode * 2
        await supabase
          .from('generation_jobs')
          .update({
            progress: Math.min(Math.round(completedProgress), 99),
          })
          .eq('id', job.id)
      }
    }

    // ---- Trigger next episode script generation if needed ----
    // Check if there's a next episode still pending
    const nextPendingEpisode = allEpisodes?.find(
      (e: { episode_number: number; status: string }) =>
        e.episode_number > (episode.episode_number || 0) &&
        e.status === 'pending',
    )

    if (nextPendingEpisode) {
      console.log(
        `generate-audio: triggering script generation for next pending episode ${nextPendingEpisode.id}`,
      )

      const generateScriptUrl = `${supabaseUrl}/functions/v1/generate-script`

      fetch(generateScriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseServiceRoleKey}`,
        },
        body: JSON.stringify({
          show_id,
          episode_id: nextPendingEpisode.id,
        }),
      }).catch((err) => {
        console.error('Failed to trigger next generate-script:', err)
      })
    }

    // ---- Return success ----
    return new Response(
      JSON.stringify({
        success: true,
        episode_id,
        audio_url: publicUrl,
        audio_duration_seconds: estimatedDuration,
        audio_size_bytes: finalAudio.length,
        dialogue_lines_processed: processedLines,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('generate-audio error:', error)

    // Attempt to mark episode as failed
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

      if (requestBody.episode_id) {
        await supabase
          .from('episodes')
          .update({
            status: 'failed',
            generation_completed_at: new Date().toISOString(),
          })
          .eq('id', requestBody.episode_id)
      }

      if (requestBody.show_id) {
        await supabase
          .from('generation_jobs')
          .update({
            status: 'failed',
            error_message:
              error instanceof Error ? error.message : 'Unknown error',
            completed_at: new Date().toISOString(),
          })
          .eq('show_id', requestBody.show_id)
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
