#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function opt(name) {
  const key = `--${name}`;
  const i = process.argv.indexOf(key);
  if (i === -1 || i === process.argv.length - 1) return null;
  return process.argv[i + 1];
}

const inputPath = opt('input');
if (!inputPath) {
  console.error('--input <json> is required');
  process.exit(1);
}

const job = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const supertonicDir = job.supertonicDir;
const helperPath = path.join(supertonicDir, 'nodejs', 'helper.js');
const onnxDir = path.join(supertonicDir, 'assets', 'onnx');

const {
  loadTextToSpeech,
  loadVoiceStyle,
  writeWavFile,
} = await import(pathToFileURL(helperPath).href);

console.log(`Loading Supertonic ONNX models from ${onnxDir}`);
const textToSpeech = await loadTextToSpeech(onnxDir, false);

for (let i = 0; i < job.lines.length; i += 1) {
  const line = job.lines[i];
  const voiceStyle = loadVoiceStyle([line.voiceStylePath], false);
  console.log(`line ${i + 1}/${job.lines.length} -> ${line.outputPath}`);
  const { wav } = await textToSpeech.call(
    line.text,
    job.lang || 'en',
    voiceStyle,
    job.totalStep,
    job.speed,
  );
  fs.mkdirSync(path.dirname(line.outputPath), { recursive: true });
  writeWavFile(line.outputPath, wav, textToSpeech.sampleRate);
}
