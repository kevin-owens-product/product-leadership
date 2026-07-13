// Episode Markdown skeleton used by cli/new-episode.js. Kept as its own
// module so the unit tests can assert that freshly scaffolded episodes pass
// the linter in cli/validate-lib.js.

function titleCase(name) {
    return String(name)
        .toLowerCase()
        .replace(/(^|[\s.'-])\S/g, (c) => c.toUpperCase());
}

// Every reference line starts with a backtick or plain word so none of the
// pipeline parsers (speaker/cue regexes are anchored to line start) can
// mistake the examples for real dialogue or cues — even though the whole
// block is also inside an HTML comment.
export const CUE_REFERENCE_COMMENT = `<!--
  Format reference (this comment is ignored by the player and the TTS pipeline):

  Dialogue   ->  one paragraph of speech per line, label in bold with the colon
                 INSIDE the markers:  **ALEX:** Welcome to the show.
  Chapters   ->  every "### HEADING" starts a new chapter in the player.
  Cues       ->  place one cue alone on its own line, exactly as shown:
    \`[PAUSE]\`        short beat (0.8s)
    \`[LONG PAUSE]\`   longer beat (1.8s)
    \`[MUSIC STING]\`  musical accent (1.0s)
    \`[MUSIC FADES]\`  fade transition (1.2s)
    \`[INTRO MUSIC]\`  opening theme (1.5s)
    \`[OUTRO MUSIC]\`  closing theme (1.5s)
    \`[SFX]\` or \`[SOUND]\`            sound effect (0.7s)
    \`[AMBIENCE]\` or \`[AMBIENT BED]\` background bed (1.0s)
  Anything else in [BRACKETS] on its own line is a stage direction — it is
  skipped entirely and produces no pause in the audio.
  Expression -> inline tags inside dialogue add vocal nuance to the TTS and
                 never appear in the transcript:
    \`<laugh>\`   audible laugh   (**ALEX:** <laugh> No way, really?)
    \`<breath>\`  breath beat
    \`<sigh>\`    sigh beat

  Run "npm run validate" any time to lint this file.
-->`;

/**
 * Render a new-episode Markdown skeleton.
 *
 * @param {object} opts
 * @param {number} opts.number Episode number.
 * @param {string} opts.title Episode title.
 * @param {string} [opts.subtitle]
 * @param {string} opts.showTitle
 * @param {string[]} opts.speakers Uppercase speaker labels (voiceMap keys),
 *   in speaking order. At least one required.
 */
export function renderEpisodeSkeleton({ number, title, subtitle = '', showTitle, speakers }) {
    const roster = (speakers && speakers.length > 0 ? speakers : ['HOST']).map((s) => String(s).toUpperCase());
    const [first, second] = roster;
    const hosts = roster.map(titleCase).join(' & ');
    const co = second || first;

    const lines = [
        `# Episode ${number}: ${title}`,
        subtitle ? `## "${subtitle}"` : null,
        '',
        '**Duration:** ~30 minutes',
        `**Hosts:** ${hosts}`,
        `**Podcast:** ${showTitle}`,
        '',
        '---',
        '',
        CUE_REFERENCE_COMMENT,
        '',
        '### INTRO',
        '',
        '[INTRO MUSIC]',
        '',
        `**${first}:** Welcome to ${showTitle}! Today we're talking about ${title.toLowerCase()}.`,
        '',
        `**${co}:** Here's what you'll take away from this episode.`,
        '',
        '---',
        '',
        '### SEGMENT 1: First Topic',
        '',
        `**${first}:** Start the first segment here.`,
        '',
        `**${co}:** Keep each line to a single spoken paragraph.`,
        '',
        '[PAUSE]',
        '',
        '---',
        '',
        '### OUTRO',
        '',
        `**${first}:** That's it for this episode — thanks for listening!`,
        '',
        '[OUTRO MUSIC]',
        ''
    ];
    return lines.filter((l) => l !== null).join('\n');
}
