const DEFAULT_SECONDS_PER_LINE = 3;

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

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();

    const speakerMatch = line.match(speakerLineRe);
    if (speakerMatch && (speakerMatch[2] || '').trim()) {
      for (let j = chapters.length - 1; j >= 0; j -= 1) {
        if (chapters[j].lineIndex === -1) {
          chapters[j].lineIndex = dialogueLineCount;
          break;
        }
      }
      dialogueLineCount += 1;
    }

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

  chapters.forEach((chapter, idx) => {
    const nextChapter = chapters[idx + 1];
    const endLine = nextChapter ? nextChapter.lineIndex : dialogueLineCount;
    const lineSpan = Math.max(1, endLine - chapter.lineIndex);

    let minutes = chapter.hintedMinutes;
    if (!minutes) {
      minutes = Math.round((lineSpan * avgSecondsPerLine) / 60);
    }

    chapter.duration = minutes > 0 ? minutes : 1;
  });

  return chapters;
}
