// Markdown dialogue parsing — pure functions, no DOM.
//
// Episodes are Markdown with `**SPEAKER:** text` lines (or the audio-drama
// `[NAME] text` form), production cues like `[PAUSE]`, and an optional
// `**Speaker Voices:**` map assigning speakers to the alex/sam voices.

export const SPEAKER_LINE_RE = /^\*\*([A-Z][A-Z0-9 '&()./-]*):\*\*\s*(.*)$/;
export const BRACKET_SPEAKER_LINE_RE = /^\[([A-Z][A-Z0-9 '&()./-]*)\]\s+(.+)$/;
export const BRACKET_CUE_LINE_RE = /^\[(PAUSE|LONG PAUSE|MUSIC STING|MUSIC FADES?|INTRO MUSIC|OUTRO MUSIC|SFX|SOUND|AMBIENCE|AMBIENT BED)(?:\s*[-:]\s*[^\]]+)?\]$/i;

export function normalizeSpeakerName(speakerName) {
    return String(speakerName || '').trim().toUpperCase();
}

export function isContinuationDialogueLine(trimmed) {
    return Boolean(trimmed) &&
        !trimmed.startsWith('*') &&
        !trimmed.startsWith('-') &&
        !trimmed.startsWith('|') &&
        !trimmed.startsWith('#') &&
        trimmed !== '---';
}

export function parseSpeakerVoiceMap(content) {
    const voiceMap = {};
    const mapLine = content.split('\n').find((line) =>
        /^\*\*(?:Speaker\s+Voices?|Voice\s*Map):\*\*/i.test(line.trim())
    );
    if (!mapLine) return voiceMap;

    const matches = mapLine.trim().match(/^\*\*(?:Speaker\s+Voices?|Voice\s*Map):\*\*\s*(.+)$/i);
    if (!matches || !matches[1]) return voiceMap;

    const entries = matches[1].split(/[;,]+/);
    entries.forEach((entry) => {
        const parsed = entry.trim().match(/^(.+?)\s*(?:=|:|->)\s*(alex|sam)\s*$/i);
        if (!parsed) return;
        const speakerName = normalizeSpeakerName(parsed[1]);
        const speakerVoice = parsed[2].toLowerCase();
        if (speakerName) {
            voiceMap[speakerName] = speakerVoice;
        }
    });

    return voiceMap;
}

export function parseMarkdown(content, voiceOverrides = {}) {
    const lines = content.split('\n');
    const dialogue = [];
    let currentSpeakerType = null;
    let currentSpeakerLabel = null;
    const speakerMap = {};
    Object.entries(voiceOverrides).forEach(([speaker, voiceType]) => {
        const normalizedSpeaker = normalizeSpeakerName(speaker);
        if ((voiceType === 'alex' || voiceType === 'sam') && normalizedSpeaker) {
            speakerMap[normalizedSpeaker] = voiceType;
        }
    });
    let speakerCount = Object.keys(speakerMap).length;

    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        const trimmed = line.trim();
        if (!trimmed) {
            continue;
        }

        if (trimmed.startsWith('#') || trimmed.startsWith('|') ||
            trimmed.startsWith('---') || trimmed.startsWith('*Next') || trimmed.startsWith('[Read')) {
            currentSpeakerType = null;
            currentSpeakerLabel = null;
            continue;
        }

        // Match dialogue patterns:
        // - **NAME:** text (standard PodLearn format)
        // - [NAME] text (audio-drama/script format)
        const speakerMatch = trimmed.match(SPEAKER_LINE_RE) || trimmed.match(BRACKET_SPEAKER_LINE_RE);
        const dirMatch = trimmed.match(/^\*?\*?\[(.+)\]\*?\*?$/);

        if (speakerMatch) {
            const speakerName = speakerMatch[1].trim();
            const normalizedSpeaker = normalizeSpeakerName(speakerName);
            const text = (speakerMatch[2] || '').trim();

            // Ignore metadata-like bold labels that are not dialogue lines.
            if (!text) {
                currentSpeakerType = null;
                currentSpeakerLabel = null;
                continue;
            }

            // Assign voice type (alternating between alex and sam voices)
            if (!speakerMap[normalizedSpeaker]) {
                speakerMap[normalizedSpeaker] = speakerCount % 2 === 0 ? 'alex' : 'sam';
                speakerCount++;
            }

            const voiceType = speakerMap[normalizedSpeaker];
            dialogue.push({
                speaker: speakerName,
                text: cleanText(text),
                type: voiceType,
                rawLine: i
            });
            currentSpeakerType = voiceType;
            currentSpeakerLabel = speakerName;
        } else if (dirMatch || BRACKET_CUE_LINE_RE.test(trimmed)) {
            // Stage directions and production cues like [PAUSE] / [MUSIC STING]
            // are not spoken by the TTS layer.
            currentSpeakerType = null;
            currentSpeakerLabel = null;
            continue;
        } else if (currentSpeakerType && isContinuationDialogueLine(trimmed)) {
            const continuation = cleanText(trimmed);
            if (continuation) {
                dialogue.push({
                    speaker: currentSpeakerLabel || 'Narration',
                    text: continuation,
                    type: currentSpeakerType,
                    rawLine: i
                });
            }
        }
    }
    return dialogue;
}

export function cleanText(text) {
    return text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/`/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/```[\s\S]*?```/g, 'code block')
        // TTS expression tags (<laugh>, <breath>, <sigh>) are audio-only
        // directives — never show them in the transcript.
        .replace(/<\s*[a-zA-Z_]+\s*>/g, ' ')
        .replace(/ {2,}/g, ' ')
        .trim();
}

// Align chapter entries (parsed from headings) to the dialogue line that
// follows each heading, keeping indexes monotonically non-decreasing.
export function alignChapterLineIndexes(chapterList, lines) {
    if (!Array.isArray(chapterList) || chapterList.length === 0 || !Array.isArray(lines)) return;
    if (lines.length === 0) {
        chapterList.forEach((chapter) => { chapter.lineIndex = 0; });
        return;
    }

    chapterList.forEach((chapter, idx) => {
        const nextRawLine = chapterList[idx + 1]?.rawLine ?? Number.POSITIVE_INFINITY;
        const lineIndex = lines.findIndex((line) =>
            Number.isInteger(line.rawLine) &&
            line.rawLine > chapter.rawLine &&
            line.rawLine < nextRawLine
        );
        if (lineIndex >= 0) {
            chapter.lineIndex = lineIndex;
        }
    });

    chapterList[0].lineIndex = Math.max(0, chapterList[0].lineIndex || 0);
    for (let i = 1; i < chapterList.length; i += 1) {
        if (chapterList[i].lineIndex < chapterList[i - 1].lineIndex) {
            chapterList[i].lineIndex = chapterList[i - 1].lineIndex;
        }
    }
}
