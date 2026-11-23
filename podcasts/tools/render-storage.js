'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

// Register before inspecting the other participants so two processes cannot
// both enter, even if they start together. Dead workers cannot hold a claim.
function withRenderLock(cacheDir, action) {
  const claim = '.owner-' + process.pid + '-' + randomUUID();
  const own = path.join(cacheDir, claim);
  fs.writeFileSync(own, '', { flag: 'wx' });
  try {
    for (const name of fs.readdirSync(cacheDir)) {
      const match = /^\.owner-(\d+)-/.exec(name);
      if (!match || name === claim) continue;
      try {
        process.kill(Number(match[1]), 0);
      } catch (error) {
        if (error.code === 'ESRCH') {
          fs.rmSync(path.join(cacheDir, name), { force: true });
          continue;
        }
        if (error.code !== 'EPERM') throw error;
      }
      throw new Error('Another process is using the render for ' + cacheDir + '. Retry when it finishes.');
    }
    return action();
  } finally {
    fs.rmSync(own, { force: true });
  }
}

// All three paths share a filesystem. Restore the previous complete render
// if the staged directory cannot take its place.
function replaceDirectory(staged, target, backup) {
  if (fs.existsSync(target)) fs.renameSync(target, backup);
  try {
    fs.renameSync(staged, target);
  } catch (error) {
    if (fs.existsSync(backup)) fs.renameSync(backup, target);
    throw error;
  }
}

module.exports = { replaceDirectory, withRenderLock };
