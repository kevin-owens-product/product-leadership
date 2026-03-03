// ============================================================
// Shared content moderation utilities
// Used by create-show, generate-script, and report-content
// edge functions.
// ============================================================

export type ViolationCategory =
  | 'illegal_content'
  | 'hate_speech'
  | 'harassment'
  | 'sexual_content'
  | 'violence'
  | 'dangerous_content'
  | 'misinformation'

export interface ModerationResult {
  safe: boolean
  category: ViolationCategory | null
  reason: string | null
}

// ---------------------------------------------------------------------------
// Content policy — single source of truth for all prompts and checks
// ---------------------------------------------------------------------------

export const CONTENT_POLICY = `Content Policy — the following content is strictly prohibited:
1. ILLEGAL CONTENT: Child exploitation, terrorism promotion, human trafficking, fraud schemes.
2. HATE SPEECH: Racist, sexist, homophobic, transphobic, or religiously discriminatory content. Slurs, dehumanisation, or calls for violence against any group.
3. HARASSMENT: Content targeting specific individuals for abuse, doxxing, threats, or intimidation.
4. SEXUAL CONTENT: Explicit sexual material, pornographic content, or sexual content involving minors.
5. GRAPHIC VIOLENCE: Gratuitous depictions of gore, torture, or glorification of real-world violence.
6. DANGEROUS CONTENT: Instructions for weapons, explosives, drugs manufacturing, or self-harm.
7. HEALTH MISINFORMATION: Deliberately false medical claims that could endanger life (e.g. "don't vaccinate", fake cancer cures).

Nuance: Mature topics (crime, war, addiction, controversial politics) are allowed when treated responsibly and educationally. The policy targets glorification, incitement, and exploitation — not discussion.`

// ---------------------------------------------------------------------------
// System prompt for the moderation classifier
// ---------------------------------------------------------------------------

const MODERATION_SYSTEM_PROMPT = `You are a content moderation classifier for a podcast generation platform. Users submit prompts describing what podcast they want to create, and you determine if the request violates the content policy.

${CONTENT_POLICY}

Respond ONLY with valid JSON matching this schema:
{
  "safe": true/false,
  "category": null or one of ["illegal_content", "hate_speech", "harassment", "sexual_content", "violence", "dangerous_content", "misinformation"],
  "reason": null or a brief explanation (1-2 sentences)
}

Be strict about clear violations but do not flag legitimate educational, journalistic, or discussion-oriented content. A podcast about "the history of organized crime" is fine. A podcast that "teaches listeners how to run a drug cartel" is not.`

// ---------------------------------------------------------------------------
// moderateContent — screen text via Claude Haiku
// ---------------------------------------------------------------------------

export async function moderateContent(
  text: string,
  anthropicApiKey: string,
): Promise<ModerationResult> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        system: MODERATION_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Review this podcast creation prompt for policy violations:\n\n${text.substring(0, 4000)}`,
          },
        ],
      }),
    })

    if (!response.ok) {
      console.error('Moderation API error:', response.status)
      // Fail open — don't block users if the moderation service is down,
      // but log it so we can investigate.
      return { safe: true, category: null, reason: null }
    }

    const data = await response.json()
    const textBlock = data.content?.find(
      (block: { type: string }) => block.type === 'text',
    )
    if (!textBlock) {
      return { safe: true, category: null, reason: null }
    }

    let jsonStr = textBlock.text.trim()
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim()
    }

    const result = JSON.parse(jsonStr) as ModerationResult
    return {
      safe: result.safe === true,
      category: result.category || null,
      reason: result.reason || null,
    }
  } catch (error) {
    console.error('Moderation check error:', error)
    // Fail open on parse errors — log for investigation.
    return { safe: true, category: null, reason: null }
  }
}

// ---------------------------------------------------------------------------
// moderateScript — check a generated script for policy violations
// Uses a lighter prompt since the script was already generated by Claude.
// ---------------------------------------------------------------------------

export async function moderateScript(
  script: string,
  anthropicApiKey: string,
): Promise<ModerationResult> {
  try {
    // Take a representative sample — full scripts can be very long
    const sample = script.substring(0, 8000)

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        system: `You are a content moderation classifier. Review the following podcast script for policy violations.

${CONTENT_POLICY}

Respond ONLY with valid JSON: { "safe": true/false, "category": null or violation category, "reason": null or brief explanation }`,
        messages: [
          {
            role: 'user',
            content: `Review this generated podcast script:\n\n${sample}`,
          },
        ],
      }),
    })

    if (!response.ok) {
      return { safe: true, category: null, reason: null }
    }

    const data = await response.json()
    const textBlock = data.content?.find(
      (block: { type: string }) => block.type === 'text',
    )
    if (!textBlock) {
      return { safe: true, category: null, reason: null }
    }

    let jsonStr = textBlock.text.trim()
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim()
    }

    const result = JSON.parse(jsonStr) as ModerationResult
    return {
      safe: result.safe === true,
      category: result.category || null,
      reason: result.reason || null,
    }
  } catch (error) {
    console.error('Script moderation error:', error)
    return { safe: true, category: null, reason: null }
  }
}

// ---------------------------------------------------------------------------
// logModerationResult — write to moderation_log table
// ---------------------------------------------------------------------------

export async function logModerationResult(
  supabaseAdmin: { from: (table: string) => any },
  opts: {
    userId: string
    showId?: string
    episodeId?: string
    checkType: 'prompt_screen' | 'script_review' | 'plan_review'
    inputText: string
    result: ModerationResult
    modelUsed?: string
  },
) {
  try {
    await supabaseAdmin.from('moderation_log').insert({
      user_id: opts.userId,
      show_id: opts.showId || null,
      episode_id: opts.episodeId || null,
      check_type: opts.checkType,
      input_text: opts.inputText.substring(0, 2000), // truncate for storage
      result: opts.result.safe ? 'pass' : 'fail',
      category: opts.result.category,
      reason: opts.result.reason,
      model_used: opts.modelUsed || 'claude-haiku-4-5-20251001',
    })
  } catch (error) {
    // Non-fatal — don't block the pipeline if logging fails
    console.error('Failed to log moderation result:', error)
  }
}

// ---------------------------------------------------------------------------
// incrementModerationFlags — bump user flag count, auto-suspend at threshold
// ---------------------------------------------------------------------------

export async function incrementModerationFlags(
  supabaseAdmin: { from: (table: string) => any },
  userId: string,
): Promise<{ newCount: number; suspended: boolean }> {
  // Fetch current count
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('moderation_flags')
    .eq('id', userId)
    .single()

  const newCount = (profile?.moderation_flags ?? 0) + 1
  const AUTO_SUSPEND_THRESHOLD = 3
  const suspended = newCount >= AUTO_SUSPEND_THRESHOLD

  const update: Record<string, unknown> = {
    moderation_flags: newCount,
  }

  if (suspended) {
    // Suspend for 30 days
    const suspendedUntil = new Date()
    suspendedUntil.setDate(suspendedUntil.getDate() + 30)
    update.suspended_until = suspendedUntil.toISOString()
  }

  await supabaseAdmin.from('profiles').update(update).eq('id', userId)

  return { newCount, suspended }
}
