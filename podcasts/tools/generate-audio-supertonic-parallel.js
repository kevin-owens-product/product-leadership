#!/usr/bin/env node
/**
 * Parallel Supertonic episode runner.
 *
 * This preserves the underlying synthesis quality by delegating each episode to
 * generate-audio-supertonic.js with the same --total-step / --speed settings,
 * but runs a small number of episode jobs concurrently. On the local 12-logical
 * CPU machine, --jobs 2 is a good default because each Supertonic worker already
 * uses several CPU cores.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SHOWS_DIR = path.join(ROOT, 'shows');
const GENERATOR = path.join(__dirname, 'generate-audio-supertonic.js');
const args = process.argv.slice(2);

function values(name) {
  const out = [];
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === `--${name}` && i < args.length - 1) out.push(args[i + 1]);
  }
  return out;
}

function opt(name, fallback) {
  const i = args.indexOf(`--${name}`);
  if (i === -1 || i === args.length - 1) return fallback;
  return args[i + 1];
}

function flag(name) {
  return args.includes(`--${name}`);
}

function die(message) {
  console.error(`[ERROR] ${message}`);
  process.exit(1);
}

function loadShow(showId) {
  const manifestPath = path.join(SHOWS_DIR, showId, 'podcast.json');
  if (!fs.existsSync(manifestPath)) die(`Show manifest not found: ${manifestPath}`);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  return { showId, manifest };
}

const shows = values('show');
if (shows.length === 0) die('Pass one or more --show <id> values.');

const jobs = Math.max(1, Number.parseInt(opt('jobs', '2'), 10) || 2);
const totalStep = String(opt('total-step', '8'));
const speed = String(opt('speed', '1.0'));
const force = flag('force');
const dryRun = flag('dry-run');

const tasks = shows.flatMap((showId) => {
  const { manifest } = loadShow(showId);
  return manifest.episodes.map((episode) => ({
    showId,
    episodeId: episode.id,
    title: episode.title,
  }));
});

console.log(`Supertonic parallel runner: ${tasks.length} episodes, jobs=${jobs}, total-step=${totalStep}, speed=${speed}`);
for (const task of tasks) {
  console.log(`  ${task.showId} #${task.episodeId}: ${task.title}`);
}

if (dryRun) process.exit(0);

let next = 0;
let running = 0;
let failed = false;

function runTask(task) {
  return new Promise((resolve, reject) => {
    const childArgs = [
      GENERATOR,
      '--show', task.showId,
      '--episode', String(task.episodeId),
      '--total-step', totalStep,
      '--speed', speed,
    ];
    if (force) childArgs.push('--force');

    console.log(`\n=== start ${task.showId} #${task.episodeId} ===`);
    const child = spawn(process.execPath, childArgs, {
      cwd: ROOT,
      env: process.env,
      stdio: 'inherit',
    });

    child.on('exit', (code, signal) => {
      if (code === 0) {
        console.log(`=== done ${task.showId} #${task.episodeId} ===`);
        resolve();
      } else {
        reject(new Error(`${task.showId} #${task.episodeId} failed with ${signal || `exit ${code}`}`));
      }
    });
  });
}

function pump() {
  while (!failed && running < jobs && next < tasks.length) {
    const task = tasks[next];
    next += 1;
    running += 1;
    runTask(task)
      .catch((err) => {
        failed = true;
        console.error(`[ERROR] ${err.message}`);
      })
      .finally(() => {
        running -= 1;
        if (failed) process.exitCode = 1;
        if (!failed && next < tasks.length) pump();
        if (running === 0 && next >= tasks.length) {
          if (failed) process.exit(1);
          console.log('\nDone.');
        }
      });
  }
}

pump();
