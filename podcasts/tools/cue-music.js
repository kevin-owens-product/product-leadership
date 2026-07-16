/**
 * cue-music.js — synthesizes short musical cues for production tags.
 *
 * Replaces the silence previously rendered for [INTRO MUSIC], [OUTRO MUSIC],
 * [MUSIC STING] and [MUSIC FADES] with a small, deterministic per-show theme:
 * a Karplus-Strong pluck motif over a soft detuned-sine pad. Every parameter
 * derives from a hash of the show id (plus optional per-show overrides), so
 * regeneration is reproducible and each show keeps a recognizable identity.
 *
 * Output: mono 16-bit PCM WAV at 44.1 kHz — identical framing to the TTS and
 * silence WAVs, so ffmpeg concat stays happy. Peak level is kept well below
 * speech (~ -10 dBFS) so cues never jump out of the mix.
 *
 * No dependencies. [PAUSE]/[SFX]/[AMBIENCE] cues are not handled here and
 * remain silence.
 */
'use strict';

const fs = require('fs');

const SAMPLE_RATE = 44100;

// Rendered length of each music cue, in seconds. This is the single source of
// truth: renderCue() lays out its motif against these, and the authoring
// pipeline's pre-audio duration estimates import them so an estimate can never
// drift from what actually gets rendered.
const MUSIC_CUE_SECONDS = {
  'INTRO MUSIC': 4.2,
  'OUTRO MUSIC': 5.5,
  'MUSIC STING': 1.8,
  'MUSIC FADE': 2.8,
  'MUSIC FADES': 2.8,
};

const MUSIC_CUES = new Set(Object.keys(MUSIC_CUE_SECONDS));

// Hand-tuned characters for shows whose tone we know; everything else gets
// hash-derived defaults so new shows sound reasonable with zero config.
const SHOW_OVERRIDES = {
  'the-influence-brief': { rootHz: 220.0, mode: 'majorPentatonic', brightness: 0.9, tempo: 96 },
  'the-decision-room': { rootHz: 174.61, mode: 'minorPentatonic', brightness: 0.7, tempo: 84 },
};

const MODES = {
  majorPentatonic: [0, 2, 4, 7, 9, 12, 14, 16],
  minorPentatonic: [0, 3, 5, 7, 10, 12, 15, 17],
};

function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function themeForShow(showId) {
  const seed = hashString(String(showId));
  const rand = mulberry32(seed);
  const roots = [174.61, 196.0, 220.0, 246.94, 261.63]; // F3..C4
  const base = {
    rootHz: roots[Math.floor(rand() * roots.length)],
    mode: rand() < 0.5 ? 'majorPentatonic' : 'minorPentatonic',
    brightness: 0.6 + rand() * 0.4, // pluck damping / pad harmonic weight
    tempo: 80 + Math.floor(rand() * 32),
  };
  const theme = Object.assign(base, SHOW_OVERRIDES[showId] || {});
  // Keep the id on the theme: the pluck noise bursts seed from it, so two
  // shows that happen to draw the same rootHz still sound distinct.
  theme.showId = String(showId);
  const motifRand = mulberry32(seed ^ 0x9e3779b9);
  const degrees = MODES[theme.mode];
  // 4-note motif: starts on the root, ends on root or fifth so it resolves.
  const motif = [0];
  for (let i = 0; i < 2; i++) motif.push(degrees[1 + Math.floor(motifRand() * (degrees.length - 2))]);
  motif.push(motifRand() < 0.5 ? 0 : 7);
  theme.motif = motif;
  return theme;
}

function semitone(rootHz, st) {
  return rootHz * Math.pow(2, st / 12);
}

/** Karplus-Strong plucked string into buf at sample offset. */
function pluck(buf, startSample, freq, seconds, amp, damping, rand) {
  const period = Math.max(2, Math.round(SAMPLE_RATE / freq));
  const line = new Float32Array(period);
  for (let i = 0; i < period; i++) line[i] = (rand() * 2 - 1) * amp;
  const n = Math.min(buf.length - startSample, Math.round(seconds * SAMPLE_RATE));
  let idx = 0;
  for (let i = 0; i < n; i++) {
    const cur = line[idx];
    const nxt = line[(idx + 1) % period];
    const out = cur;
    line[idx] = (cur + nxt) * 0.5 * damping;
    // Gentle onset ramp avoids a click on the noise burst.
    const onset = i < 64 ? i / 64 : 1;
    buf[startSample + i] += out * onset;
    idx = (idx + 1) % period;
  }
}

/** Detuned sine pad chord into buf. attack/release in seconds. */
function pad(buf, startSample, freqs, seconds, amp, attack, release, brightness) {
  const n = Math.min(buf.length - startSample, Math.round(seconds * SAMPLE_RATE));
  const aN = Math.max(1, Math.round(attack * SAMPLE_RATE));
  const rN = Math.max(1, Math.round(release * SAMPLE_RATE));
  for (const f of freqs) {
    for (const det of [0.9985, 1.0015]) {
      const w1 = (2 * Math.PI * f * det) / SAMPLE_RATE;
      const w2 = w1 * 2; // one octave partial for a little shimmer
      for (let i = 0; i < n; i++) {
        let env = 1;
        if (i < aN) env = i / aN;
        if (n - i < rN) env = Math.min(env, (n - i) / rN);
        // Squared envelope = smoother swell.
        env *= env;
        const s = Math.sin(w1 * i) + brightness * 0.25 * Math.sin(w2 * i);
        buf[startSample + i] += (s * amp * env) / (freqs.length * 2);
      }
    }
  }
}

function normalize(buf, peakTarget) {
  let peak = 0;
  for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i]));
  if (peak === 0) return;
  const g = peakTarget / peak;
  for (let i = 0; i < buf.length; i++) buf[i] *= g;
}

function renderCue(cue, theme) {
  const rand = mulberry32(hashString(`${theme.showId || theme.rootHz}:${cue}`));
  const r = theme.rootHz;
  const chord = [r, semitone(r, theme.mode === 'majorPentatonic' ? 4 : 3), semitone(r, 7)];
  const beat = 60 / theme.tempo;
  const damping = 0.994 + theme.brightness * 0.004;
  const seconds = MUSIC_CUE_SECONDS[cue];
  if (!seconds) throw new Error(`Not a music cue: ${cue}`);
  let build;

  switch (cue) {
    case 'INTRO MUSIC': {
      build = (buf) => {
        pad(buf, 0, chord, seconds, 0.5, 1.1, 1.0, theme.brightness);
        theme.motif.forEach((st, i) => {
          const at = Math.round((0.55 + i * beat * 0.75) * SAMPLE_RATE);
          pluck(buf, at, semitone(r * 2, st), 1.6, 0.8, damping, rand);
        });
      };
      break;
    }
    case 'OUTRO MUSIC': {
      build = (buf) => {
        pad(buf, 0, chord, seconds, 0.5, 0.6, 2.2, theme.brightness);
        const motif = theme.motif.slice().reverse();
        motif.forEach((st, i) => {
          const at = Math.round((0.4 + i * beat * 0.9) * SAMPLE_RATE);
          pluck(buf, at, semitone(r * 2, st), 2.0, 0.75, damping, rand);
        });
        // Closing root an octave down, left to ring out under the fade.
        pluck(buf, Math.round((0.4 + motif.length * beat * 0.9) * SAMPLE_RATE), r, 2.5, 0.9, damping, rand);
      };
      break;
    }
    case 'MUSIC STING': {
      build = (buf) => {
        pluck(buf, 0, r * 2, 1.6, 0.9, damping, rand);
        pluck(buf, Math.round(0.14 * SAMPLE_RATE), semitone(r * 2, 7), 1.5, 0.7, damping, rand);
        pad(buf, 0, [r], seconds, 0.3, 0.05, 0.9, theme.brightness);
      };
      break;
    }
    case 'MUSIC FADE':
    case 'MUSIC FADES': {
      build = (buf) => {
        pad(buf, 0, chord, seconds, 0.5, 0.05, 2.4, theme.brightness);
        pluck(buf, 0, r * 2, 1.2, 0.4, damping, rand);
      };
      break;
    }
    default:
      throw new Error(`Not a music cue: ${cue}`);
  }

  const buf = new Float32Array(Math.round(seconds * SAMPLE_RATE));
  build(buf);
  normalize(buf, 0.3);
  return buf;
}

function writeWavMono16(outputPath, samples) {
  const pcmLength = samples.length * 2;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + pcmLength, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(pcmLength, 40);
  const pcm = Buffer.alloc(pcmLength);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    pcm.writeInt16LE(Math.round(s * 32767), i * 2);
  }
  fs.writeFileSync(outputPath, Buffer.concat([header, pcm]));
}

function isMusicCue(cue) {
  return MUSIC_CUES.has(String(cue).toUpperCase());
}

function renderCueWav(outputPath, cue, showId) {
  const theme = themeForShow(showId);
  writeWavMono16(outputPath, renderCue(String(cue).toUpperCase(), theme));
}

module.exports = { isMusicCue, renderCueWav, themeForShow, MUSIC_CUES, MUSIC_CUE_SECONDS };
