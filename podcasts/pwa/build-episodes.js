#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const showsDir = path.join(__dirname, '..', 'shows');
const distDir = path.join(__dirname, 'dist');

// Create dist directory
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

console.log('Building PodLearn Multi-Podcast App...\n');

// Find all podcasts
const podcasts = [];

if (fs.existsSync(showsDir)) {
    const dirs = fs.readdirSync(showsDir, { withFileTypes: true })
        .filter(d => d.isDirectory() && !d.name.startsWith('_'));

    for (const dir of dirs) {
        const podcastDir = path.join(showsDir, dir.name);
        const manifestPath = path.join(podcastDir, 'podcast.json');

        if (fs.existsSync(manifestPath)) {
            console.log(`\n📻 Processing podcast: ${dir.name}`);

            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            const podcastData = {
                id: manifest.id,
                title: manifest.title,
                subtitle: manifest.subtitle,
                description: manifest.description,
                author: manifest.author || 'Unknown',
                color: manifest.color || '#6366f1',
                icon: manifest.icon || '🎙️',
                episodes: []
            };

            // Process each episode
            for (const epMeta of manifest.episodes) {
                const epPath = path.join(podcastDir, epMeta.file);

                if (fs.existsSync(epPath)) {
                    console.log(`   ✓ ${epMeta.file}`);
                    let content = fs.readFileSync(epPath, 'utf8');
                    // Escape for template literal
                    content = content.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');

                    podcastData.episodes.push({
                        id: epMeta.id,
                        title: epMeta.title,
                        subtitle: epMeta.subtitle,
                        content: content
                    });
                } else {
                    console.log(`   ✗ Missing: ${epMeta.file}`);
                }
            }

            podcasts.push(podcastData);
        }
    }
}

if (podcasts.length === 0) {
    console.log('\n⚠️  No podcasts found. Create shows/<name>/podcast.json to add podcasts.');
}

// Generate podcasts.js
const podcastsJs = `// Auto-generated podcast data - ${new Date().toISOString()}
window.PODCASTS = ${JSON.stringify(podcasts, null, 2)};
`;

fs.writeFileSync(path.join(distDir, 'podcasts.js'), podcastsJs);
console.log('\n✓ Generated: podcasts.js');

// Copy static root files
const filesToCopy = ['index.html', 'manifest.json', 'sw.js', 'icon.svg', '_headers', 'version.json'];
filesToCopy.forEach(file => {
    const src = path.join(__dirname, file);
    const dest = path.join(distDir, file);
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`✓ Copied: ${file}`);
    }
});

// Copy audio files if they exist
const audioSrcDir = path.join(__dirname, 'audio');
const audioDistDir = path.join(distDir, 'audio');

function copyDirRecursive(src, dest) {
    if (!fs.existsSync(src)) return 0;
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    let count = 0;
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            count += copyDirRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
            count++;
        }
    }
    return count;
}

if (fs.existsSync(audioSrcDir)) {
    const audioCount = copyDirRecursive(audioSrcDir, audioDistDir);
    if (audioCount > 0) {
        console.log(`✓ Copied: ${audioCount} audio files`);
    }
}

// Copy ES module source files used by index.html
const srcModulesDir = path.join(__dirname, 'src');
const srcModulesDistDir = path.join(distDir, 'src');
if (fs.existsSync(srcModulesDir)) {
    const sourceCount = copyDirRecursive(srcModulesDir, srcModulesDistDir);
    if (sourceCount > 0) {
        console.log(`✓ Copied: ${sourceCount} source module files`);
    }
}

// Create README
const readmeContent = `# PodLearn - Custom Podcast Player

## Deployment

### Quick Deploy to Netlify
1. Connect your GitHub repo to Netlify
2. Set build command to: \`cd podcasts/pwa && node build-episodes.js\`
3. Set publish directory to: \`podcasts/pwa/dist\`

### Manual Deploy
1. Run \`node build-episodes.js\` in this directory
2. Deploy the \`dist/\` folder

## Creating Your Own Podcasts

1. Create a new folder in \`shows/\` (e.g., \`shows/my-podcast/\`)

2. Add a \`podcast.json\` file:
\`\`\`json
{
  "id": "my-podcast",
  "title": "My Podcast Title",
  "subtitle": "A great podcast",
  "description": "What this podcast is about",
  "author": "Your Name",
  "color": "#6366f1",
  "icon": "🎙️",
  "episodes": [
    {
      "id": 1,
      "file": "episode-01.md",
      "title": "Episode Title",
      "subtitle": "Episode subtitle"
    }
  ]
}
\`\`\`

3. Add episode markdown files with dialogue format:
\`\`\`markdown
# Episode 1: Title

### INTRO

**ALEX:** Welcome to the show!

**SAM:** Great to be here.

### SEGMENT 1: Topic Name

**ALEX:** Let's talk about...
\`\`\`

4. Run \`node build-episodes.js\` to rebuild

## Files

- \`index.html\` - Main app
- \`podcasts.js\` - All podcasts and episodes (auto-generated)
- \`manifest.json\` - PWA manifest
- \`sw.js\` - Service worker for offline
- \`icon.svg\` - App icon
`;

fs.writeFileSync(path.join(distDir, 'README.md'), readmeContent);
console.log('✓ Created: README.md');

console.log(`\n✓ Build complete! ${podcasts.length} podcast(s) with ${podcasts.reduce((sum, p) => sum + p.episodes.length, 0)} total episodes.`);
console.log('Deploy the dist/ folder to Netlify.\n');
