#!/usr/bin/env node
/**
 * Audio Generation Script for PodLearn
 *
 * Generates high-quality audio from podcast episode markdown files
 * using the ElevenLabs API.
 *
 * Usage:
 *   ELEVENLABS_API_KEY=your_key node generate-audio.js [episode-file] [--all]
 *
 * Options:
 *   --all       Generate audio for all episodes
 *   --list      List available episodes
 *   --voices    List available ElevenLabs voices
 *   --dry-run   Parse and show what would be generated without calling API
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const CONFIG = {
    apiKey: process.env.ELEVENLABS_API_KEY,
    // Default voices - good contrast between the two hosts
    voices: {
        alex: process.env.ALEX_VOICE_ID || 'pNInz6obpgDQGcFmaJgB', // Adam - deep, authoritative
        sam: process.env.SAM_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'    // Bella - warm, curious
    },
    modelId: 'eleven_monolingual_v1',
    outputDir: path.join(__dirname, '..', 'pwa', 'audio'),
    showsDir: path.join(__dirname, '..', 'shows')
};

// Parse command line arguments
const args = process.argv.slice(2);
const flags = {
    all: args.includes('--all'),
    list: args.includes('--list'),
    voices: args.includes('--voices'),
    dryRun: args.includes('--dry-run')
};
const episodeArg = args.find(a => !a.startsWith('--'));

// Utility functions
function log(msg, type = 'info') {
    const prefix = {
        info: '\x1b[36m[INFO]\x1b[0m',
        success: '\x1b[32m[OK]\x1b[0m',
        warn: '\x1b[33m[WARN]\x1b[0m',
        error: '\x1b[31m[ERROR]\x1b[0m'
    };
    console.log(`${prefix[type] || ''} ${msg}`);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Parse markdown file to extract dialogue
function parseEpisode(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const dialogue = [];
    let currentChapter = 'INTRO';

    for (const line of lines) {
        // Track chapters
        if (line.startsWith('### ')) {
            currentChapter = line.replace('### ', '').trim();
            continue;
        }

        // Skip stage directions like [MUSIC FADES]
        if (line.match(/^\*\*\[.*\]\*\*$/)) {
            continue;
        }

        // Parse speaker lines
        const samMatch = line.match(/^\*\*SAM:\*\*\s*(.+)$/);
        const alexMatch = line.match(/^\*\*ALEX:\*\*\s*(.+)$/);

        if (samMatch) {
            dialogue.push({
                speaker: 'sam',
                text: cleanText(samMatch[1]),
                chapter: currentChapter
            });
        } else if (alexMatch) {
            dialogue.push({
                speaker: 'alex',
                text: cleanText(alexMatch[1]),
                chapter: currentChapter
            });
        }
    }

    return dialogue;
}

// Clean text for TTS
function cleanText(text) {
    return text
        .replace(/\*([^*]+)\*/g, '$1') // Remove italics
        .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
        .replace(/`([^`]+)`/g, '$1') // Remove code
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
        .trim();
}

// Make ElevenLabs API request for text-to-speech
async function textToSpeech(text, voiceId, outputPath) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            text: text,
            model_id: CONFIG.modelId,
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75
            }
        });

        const options = {
            hostname: 'api.elevenlabs.io',
            port: 443,
            path: `/v1/text-to-speech/${voiceId}`,
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'xi-api-key': CONFIG.apiKey,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = https.request(options, (res) => {
            if (res.statusCode === 200) {
                const chunks = [];
                res.on('data', chunk => chunks.push(chunk));
                res.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    fs.writeFileSync(outputPath, buffer);
                    resolve(outputPath);
                });
            } else {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    reject(new Error(`API error ${res.statusCode}: ${body}`));
                });
            }
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

// List available voices from ElevenLabs
async function listVoices() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.elevenlabs.io',
            port: 443,
            path: '/v1/voices',
            method: 'GET',
            headers: {
                'xi-api-key': CONFIG.apiKey
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(body));
                } else {
                    reject(new Error(`API error ${res.statusCode}: ${body}`));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

// Find all episodes in the shows directory
function findAllEpisodes() {
    const episodes = [];
    const showDirs = fs.readdirSync(CONFIG.showsDir);

    for (const show of showDirs) {
        if (show.startsWith('_')) continue; // Skip template
        const showPath = path.join(CONFIG.showsDir, show);
        if (!fs.statSync(showPath).isDirectory()) continue;

        const files = fs.readdirSync(showPath);
        for (const file of files) {
            if (file.endsWith('.md') && file.startsWith('episode-')) {
                episodes.push({
                    show,
                    file,
                    path: path.join(showPath, file)
                });
            }
        }
    }

    return episodes;
}

// Generate audio for a single episode
async function generateEpisodeAudio(episodePath, showId) {
    const episodeFile = path.basename(episodePath, '.md');
    const episodeId = episodeFile.replace(/^episode-\d+-/, '').replace(/-/g, '_');

    log(`Parsing ${episodeFile}...`);
    const dialogue = parseEpisode(episodePath);
    log(`Found ${dialogue.length} dialogue lines`);

    if (flags.dryRun) {
        log('Dry run - would generate:', 'info');
        dialogue.slice(0, 5).forEach((d, i) => {
            console.log(`  ${i + 1}. [${d.speaker.toUpperCase()}] ${d.text.slice(0, 60)}...`);
        });
        if (dialogue.length > 5) {
            console.log(`  ... and ${dialogue.length - 5} more lines`);
        }
        return;
    }

    // Create output directory
    const episodeOutputDir = path.join(CONFIG.outputDir, showId, episodeFile);
    fs.mkdirSync(episodeOutputDir, { recursive: true });

    // Generate audio for each line
    log(`Generating audio files in ${episodeOutputDir}...`);
    const manifest = [];

    for (let i = 0; i < dialogue.length; i++) {
        const line = dialogue[i];
        const voiceId = CONFIG.voices[line.speaker];
        const outputFile = path.join(episodeOutputDir, `${String(i).padStart(4, '0')}.mp3`);

        // Show progress
        process.stdout.write(`\r  Generating line ${i + 1}/${dialogue.length}...`);

        try {
            await textToSpeech(line.text, voiceId, outputFile);
            manifest.push({
                index: i,
                speaker: line.speaker,
                text: line.text,
                chapter: line.chapter,
                file: `${String(i).padStart(4, '0')}.mp3`
            });

            // Rate limiting - ElevenLabs has request limits
            await sleep(100);
        } catch (err) {
            log(`\nFailed to generate line ${i}: ${err.message}`, 'error');
            // Continue with next line
        }
    }

    console.log(''); // New line after progress

    // Save manifest
    const manifestPath = path.join(episodeOutputDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    log(`Saved manifest to ${manifestPath}`, 'success');

    // Create combined audio file using ffmpeg if available
    try {
        const listFile = path.join(episodeOutputDir, 'files.txt');
        const fileList = manifest.map(m => `file '${m.file}'`).join('\n');
        fs.writeFileSync(listFile, fileList);

        log(`Audio segments saved. To combine into single MP3:`);
        console.log(`  cd ${episodeOutputDir}`);
        console.log(`  ffmpeg -f concat -safe 0 -i files.txt -c copy combined.mp3`);
    } catch (err) {
        // ffmpeg not critical
    }

    return manifest;
}

// Main execution
async function main() {
    console.log('\n=== PodLearn Audio Generator ===\n');

    // Check for API key
    if (!CONFIG.apiKey && !flags.list) {
        log('ELEVENLABS_API_KEY environment variable not set', 'error');
        console.log('\nTo use this script:');
        console.log('  1. Sign up at https://elevenlabs.io');
        console.log('  2. Get your API key from the profile settings');
        console.log('  3. Run: ELEVENLABS_API_KEY=your_key node generate-audio.js\n');
        console.log('For free tier, you get ~10,000 characters/month.');
        console.log('One episode is roughly 30,000-50,000 characters.\n');
        process.exit(1);
    }

    // List available episodes
    if (flags.list) {
        const episodes = findAllEpisodes();
        log(`Found ${episodes.length} episodes:\n`);
        episodes.forEach((ep, i) => {
            console.log(`  ${i + 1}. [${ep.show}] ${ep.file}`);
        });
        console.log('\nUsage: node generate-audio.js <episode-number>');
        console.log('       node generate-audio.js --all');
        return;
    }

    // List available voices
    if (flags.voices) {
        log('Fetching available voices...');
        try {
            const result = await listVoices();
            console.log('\nAvailable voices:\n');
            result.voices.forEach(v => {
                console.log(`  ${v.name} (${v.voice_id})`);
                if (v.labels) {
                    const labels = Object.entries(v.labels)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(', ');
                    console.log(`    Labels: ${labels}`);
                }
            });
            console.log('\nTo use different voices, set environment variables:');
            console.log('  ALEX_VOICE_ID=voice_id ELEVENLABS_API_KEY=key node generate-audio.js ...');
        } catch (err) {
            log(`Failed to fetch voices: ${err.message}`, 'error');
        }
        return;
    }

    // Generate audio for all episodes
    if (flags.all) {
        const episodes = findAllEpisodes();
        log(`Generating audio for ${episodes.length} episodes...`);

        for (const ep of episodes) {
            console.log(`\n--- ${ep.show}/${ep.file} ---`);
            await generateEpisodeAudio(ep.path, ep.show);
        }
        return;
    }

    // Generate audio for specific episode
    if (episodeArg) {
        const episodes = findAllEpisodes();
        const num = parseInt(episodeArg, 10);

        if (!isNaN(num) && num >= 1 && num <= episodes.length) {
            const ep = episodes[num - 1];
            await generateEpisodeAudio(ep.path, ep.show);
        } else {
            // Try to find by filename
            const ep = episodes.find(e =>
                e.file.includes(episodeArg) ||
                e.path.includes(episodeArg)
            );
            if (ep) {
                await generateEpisodeAudio(ep.path, ep.show);
            } else {
                log(`Episode not found: ${episodeArg}`, 'error');
                console.log('Use --list to see available episodes');
            }
        }
        return;
    }

    // Show help
    console.log('Usage:');
    console.log('  node generate-audio.js --list      List available episodes');
    console.log('  node generate-audio.js --voices    List available ElevenLabs voices');
    console.log('  node generate-audio.js 1           Generate audio for episode 1');
    console.log('  node generate-audio.js --all       Generate audio for all episodes');
    console.log('  node generate-audio.js --dry-run 1 Preview what would be generated');
    console.log('\nEnvironment variables:');
    console.log('  ELEVENLABS_API_KEY  Your ElevenLabs API key (required)');
    console.log('  ALEX_VOICE_ID       Custom voice ID for Alex');
    console.log('  SAM_VOICE_ID        Custom voice ID for Sam');
}

main().catch(err => {
    log(`Fatal error: ${err.message}`, 'error');
    process.exit(1);
});
