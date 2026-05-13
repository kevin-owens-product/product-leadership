const DEFAULT_SECONDS_PER_LINE = 3;
const DEFAULT_WORDS_PER_MINUTE = 140;

function isContinuationDialogueLine(trimmed) {
  return Boolean(trimmed) &&
    !trimmed.startsWith('*') &&
    !trimmed.startsWith('-') &&
    !trimmed.startsWith('|') &&
    !trimmed.startsWith('#') &&
    trimmed !== '---';
}

function countWords(text) {
  const normalized = text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/`/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[^\w\s'-]/g, ' ')
    .trim();
  if (!normalized) return 0;
  return normalized.split(/\s+/).filter(Boolean).length;
}

function extractTimingText(line, speakerLineRe) {
  const trimmed = line.trim();
  if (!trimmed || trimmed === '---') return '';
  if (/^###\s+/.test(trimmed)) return '';
  if (/^##?\s+/.test(trimmed)) return '';
  if (/^\*\*(Duration|Hosts?):/i.test(trimmed)) return '';
  if (trimmed.startsWith('*Next') || trimmed.startsWith('[Read')) return '';

  const speakerMatch = trimmed.match(speakerLineRe);
  if (speakerMatch) {
    return (speakerMatch[2] || '').trim();
  }

  if (trimmed.startsWith('*') || trimmed.startsWith('|')) return '';
  return trimmed;
}

export function extractEpisodeDurationMinutes(content) {
  const durationMatch = content.match(/\*\*Duration:\*\*\s*~?\s*(\d+(?:\.\d+)?)\s*minutes?/i);
  if (!durationMatch) return null;
  const minutes = parseFloat(durationMatch[1]);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : null;
}

export function parseChaptersFromContent(content, speakerLineRe) {
  const lines = content.split('\n');
  const chapters = [];
  let dialogueLineCount = 0;
  let inSpeakerBlock = false;

  const assignFirstLineIndexForPendingChapter = () => {
    for (let j = chapters.length - 1; j >= 0; j -= 1) {
      if (chapters[j].lineIndex === -1) {
        chapters[j].lineIndex = dialogueLineCount;
        break;
      }
    }
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();

    const chapterMatch = line.match(/^###\s+(.+)/);
    if (chapterMatch) {
      let title = chapterMatch[1].trim();
      const hintedDuration = title.match(/\((\d+(?:\.\d+)?)\s*minutes?\)/i);
      title = title.replace(/\*\*/g, '').replace(/\(\d+(?:\.\d+)?\s*minutes?\)/i, '').trim();
      title = title.replace(/:\s*$/, '');

      chapters.push({
        title,
        lineIndex: -1,
        hintedMinutes: hintedDuration ? parseFloat(hintedDuration[1]) : null,
        rawLine: i
      });
      inSpeakerBlock = false;
      continue;
    }

    if (!line) continue;

    const speakerMatch = line.match(speakerLineRe);
    if (speakerMatch && (speakerMatch[2] || '').trim()) {
      assignFirstLineIndexForPendingChapter();
      dialogueLineCount += 1;
      inSpeakerBlock = true;
      continue;
    }

    if (inSpeakerBlock && isContinuationDialogueLine(line)) {
      assignFirstLineIndexForPendingChapter();
      dialogueLineCount += 1;
      continue;
    }

    if (line.startsWith('*') || line.startsWith('-') || line.startsWith('|') || line.startsWith('#') || line === '---') {
      inSpeakerBlock = false;
    }
  }

  chapters.forEach((chapter, idx) => {
    if (chapter.lineIndex === -1) {
      chapter.lineIndex = idx === 0 ? 0 : dialogueLineCount;
    }
  });

  const episodeDurationMinutes = extractEpisodeDurationMinutes(content);
  const episodeDurationSeconds = episodeDurationMinutes ? episodeDurationMinutes * 60 : null;
  const avgSecondsPerLine = episodeDurationSeconds && dialogueLineCount > 0
    ? episodeDurationSeconds / dialogueLineCount
    : DEFAULT_SECONDS_PER_LINE;

  const chapterWordWeights = chapters.map((chapter, idx) => {
    const nextChapter = chapters[idx + 1];
    const startRawLine = chapter.rawLine + 1;
    const endRawLine = nextChapter ? nextChapter.rawLine : lines.length;
    let weight = 0;

    for (let i = startRawLine; i < endRawLine; i += 1) {
      const timingText = extractTimingText(lines[i], speakerLineRe);
      weight += countWords(timingText);
    }

    return weight > 0 ? weight : 1;
  });

  const hintedTotalMinutes = chapters.reduce((sum, chapter) =>
    sum + (chapter.hintedMinutes || 0), 0
  );
  const unhintedIndices = chapters
    .map((chapter, idx) => (chapter.hintedMinutes ? -1 : idx))
    .filter(idx => idx >= 0);
  const unhintedWeightTotal = unhintedIndices.reduce((sum, idx) =>
    sum + chapterWordWeights[idx], 0
  );
  const unhintedBudgetMinutes = episodeDurationMinutes
    ? Math.max(unhintedIndices.length, episodeDurationMinutes - hintedTotalMinutes)
    : null;

  chapters.forEach((chapter, idx) => {
    const nextChapter = chapters[idx + 1];
    const endLine = nextChapter ? nextChapter.lineIndex : dialogueLineCount;
    const lineSpan = Math.max(1, endLine - chapter.lineIndex);

    let minutes = chapter.hintedMinutes;
    if (!minutes) {
      if (unhintedBudgetMinutes && unhintedWeightTotal > 0) {
        const weight = chapterWordWeights[idx];
        minutes = Math.round((unhintedBudgetMinutes * weight) / unhintedWeightTotal);
      } else if (chapterWordWeights[idx] > 0) {
        minutes = Math.round(chapterWordWeights[idx] / DEFAULT_WORDS_PER_MINUTE);
      } else {
        minutes = Math.round((lineSpan * avgSecondsPerLine) / 60);
      }
    }

    chapter.duration = minutes > 0 ? minutes : 1;
  });

  if (episodeDurationMinutes && chapters.length > 0 && unhintedIndices.length > 0) {
    const targetTotalMinutes = Math.max(chapters.length, Math.round(episodeDurationMinutes));
    const currentTotalMinutes = chapters.reduce((sum, chapter) => sum + chapter.duration, 0);
    let delta = targetTotalMinutes - currentTotalMinutes;

    const adjustableIndices = unhintedIndices.length > 0
      ? [...unhintedIndices]
      : [chapters.length - 1];

    for (let i = adjustableIndices.length - 1; i >= 0 && delta !== 0; i -= 1) {
      const chapter = chapters[adjustableIndices[i]];
      if (delta > 0) {
        chapter.duration += delta;
        delta = 0;
      } else {
        const removable = chapter.duration - 1;
        if (removable <= 0) continue;
        const take = Math.min(removable, -delta);
        chapter.duration -= take;
        delta += take;
      }
    }

    if (delta > 0) {
      chapters[chapters.length - 1].duration += delta;
    }
  }

  let elapsedMinutes = 0;
  chapters.forEach((chapter) => {
    chapter.startMinute = elapsedMinutes;
    elapsedMinutes += chapter.duration;
    chapter.endMinute = elapsedMinutes;
  });

  return chapters;
}
