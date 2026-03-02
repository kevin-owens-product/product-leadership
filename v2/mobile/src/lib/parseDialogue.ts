import type { DialogueLine, Chapter } from '@shared/types';

// ============================================================
// Dialogue & Chapter Parsing
// Parses podcast script markdown into structured dialogue lines
// and chapter markers for the player UI.
// ============================================================

const SPEAKER_PATTERN = /^\*\*([^*]+):\*\*\s*(.+)/;
const STAGE_DIRECTION_PATTERN = /^\[.*\]$/;
const CHAPTER_PATTERN = /^###\s+(.+)/;
const DURATION_HINT_PATTERN = /\((\d+)\s*minutes?\)/i;

/**
 * Parses a podcast script (markdown) into an array of DialogueLine objects.
 *
 * Expected format:
 *   **Speaker Name:** Dialogue text here...
 *
 * Lines beginning with [BRACKETS] are treated as stage directions and skipped.
 * Continuation lines (no speaker prefix) are attributed to the most recent speaker.
 */
export function parseDialogue(markdown: string): DialogueLine[] {
  if (!markdown) return [];

  const rawLines = markdown.split('\n');
  const result: DialogueLine[] = [];
  const speakerOrder: string[] = [];
  let lastSpeaker: string | null = null;
  let lastType: 'host1' | 'host2' = 'host1';

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();

    // Skip empty lines and stage directions
    if (!line) continue;
    if (STAGE_DIRECTION_PATTERN.test(line)) continue;

    // Skip chapter headers (handled by parseChapters)
    if (CHAPTER_PATTERN.test(line)) continue;

    // Skip horizontal rules, metadata lines, etc.
    if (line.startsWith('---') || line.startsWith('#')) continue;

    const match = line.match(SPEAKER_PATTERN);

    if (match) {
      const speaker = match[1].trim();
      const text = match[2].trim();

      // Track speaker order for host1/host2 assignment
      if (!speakerOrder.includes(speaker)) {
        speakerOrder.push(speaker);
      }

      const type: 'host1' | 'host2' =
        speakerOrder.indexOf(speaker) === 0 ? 'host1' : 'host2';

      lastSpeaker = speaker;
      lastType = type;

      if (text) {
        result.push({
          speaker,
          text,
          type,
          rawLineIndex: i,
        });
      }
    } else if (lastSpeaker) {
      // Continuation line — attribute to last speaker
      // Only include lines that look like actual dialogue (not markdown artifacts)
      if (line.length > 2 && !line.startsWith('*') && !line.startsWith('>')) {
        result.push({
          speaker: lastSpeaker,
          text: line,
          type: lastType,
          rawLineIndex: i,
        });
      }
    }
  }

  return result;
}

/**
 * Parses chapter/section headers from a podcast script and maps them to
 * approximate time ranges based on word count distribution.
 *
 * Expected format:
 *   ### SECTION NAME
 *   (optional duration hint like "10 minutes")
 *
 * The time mapping uses a proportional word-count approach:
 * each chapter's share of the total duration is proportional to
 * its word count relative to the total script word count.
 */
export function parseChapters(
  markdown: string,
  totalDurationSeconds: number,
): Chapter[] {
  if (!markdown || totalDurationSeconds <= 0) return [];

  const rawLines = markdown.split('\n');

  // First pass: find all chapter boundaries
  interface RawChapter {
    title: string;
    lineIndex: number;
    startLineIndex: number;
    durationHintMinutes: number | null;
  }

  const rawChapters: RawChapter[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    const chapterMatch = line.match(CHAPTER_PATTERN);

    if (chapterMatch) {
      let title = chapterMatch[1].trim();
      let durationHint: number | null = null;

      // Check for duration hint in the title or next line
      const durationMatch = title.match(DURATION_HINT_PATTERN);
      if (durationMatch) {
        durationHint = parseInt(durationMatch[1], 10);
        // Remove the hint from the title
        title = title.replace(DURATION_HINT_PATTERN, '').trim();
      } else if (i + 1 < rawLines.length) {
        const nextLineMatch = rawLines[i + 1]
          .trim()
          .match(DURATION_HINT_PATTERN);
        if (nextLineMatch) {
          durationHint = parseInt(nextLineMatch[1], 10);
        }
      }

      // Clean up title: remove trailing punctuation artifacts
      title = title.replace(/[:\-–—]+$/, '').trim();

      rawChapters.push({
        title,
        lineIndex: rawChapters.length,
        startLineIndex: i,
        durationHintMinutes: durationHint,
      });
    }
  }

  if (rawChapters.length === 0) return [];

  // Second pass: count words per chapter section
  const wordCounts: number[] = [];

  for (let c = 0; c < rawChapters.length; c++) {
    const startLine = rawChapters[c].startLineIndex + 1;
    const endLine =
      c + 1 < rawChapters.length
        ? rawChapters[c + 1].startLineIndex
        : rawLines.length;

    let words = 0;
    for (let i = startLine; i < endLine; i++) {
      const line = rawLines[i].trim();
      if (line && !STAGE_DIRECTION_PATTERN.test(line)) {
        words += line.split(/\s+/).length;
      }
    }

    wordCounts.push(Math.max(words, 1)); // Avoid zero division
  }

  const totalWords = wordCounts.reduce((sum, w) => sum + w, 0);

  // If we have duration hints for all chapters, use those proportionally
  const allHaveHints = rawChapters.every(
    (ch) => ch.durationHintMinutes !== null,
  );

  let chapterDurations: number[];

  if (allHaveHints) {
    const totalHintMinutes = rawChapters.reduce(
      (sum, ch) => sum + (ch.durationHintMinutes ?? 0),
      0,
    );
    chapterDurations = rawChapters.map((ch) => {
      const fraction = (ch.durationHintMinutes ?? 0) / totalHintMinutes;
      return fraction * totalDurationSeconds;
    });
  } else {
    // Use word count proportional distribution
    chapterDurations = wordCounts.map(
      (wc) => (wc / totalWords) * totalDurationSeconds,
    );
  }

  // Build chapter objects with cumulative times
  const chapters: Chapter[] = [];
  let cumulativeSeconds = 0;

  for (let c = 0; c < rawChapters.length; c++) {
    const duration = chapterDurations[c];
    const startSeconds = cumulativeSeconds;
    const endSeconds = cumulativeSeconds + duration;

    chapters.push({
      title: rawChapters[c].title,
      startSeconds: Math.round(startSeconds),
      endSeconds: Math.round(endSeconds),
      duration: Math.round(duration),
      lineIndex: c,
    });

    cumulativeSeconds = endSeconds;
  }

  // Ensure last chapter ends exactly at totalDuration
  if (chapters.length > 0) {
    chapters[chapters.length - 1].endSeconds = totalDurationSeconds;
    chapters[chapters.length - 1].duration =
      totalDurationSeconds - chapters[chapters.length - 1].startSeconds;
  }

  return chapters;
}
