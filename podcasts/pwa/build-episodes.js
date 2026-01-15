#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const episodeMeta = [
    { id: 1, file: 'episode-01-ai-machine-learning-fundamentals.md', title: 'AI & Machine Learning Fundamentals', subtitle: "The CPO's Guide to the AI Revolution" },
    { id: 2, file: 'episode-02-large-language-models.md', title: 'Large Language Models Deep Dive', subtitle: 'LLMs Demystified' },
    { id: 3, file: 'episode-03-software-engineering-excellence.md', title: 'Software Engineering Excellence', subtitle: 'Building World-Class Teams' },
    { id: 4, file: 'episode-04-software-architecture-patterns.md', title: 'Software Architecture Patterns', subtitle: 'Building Systems That Last' },
    { id: 5, file: 'episode-05-systems-design-at-scale.md', title: 'Systems Design at Scale', subtitle: 'Building for Millions' },
    { id: 6, file: 'episode-06-monorepos-code-organization.md', title: 'Monorepos & Code Organization', subtitle: 'One Repo to Rule Them All?' },
    { id: 7, file: 'episode-07-design-systems.md', title: 'Design Systems & Components', subtitle: 'Building Consistent UI at Scale' },
    { id: 8, file: 'episode-08-testing-strategy.md', title: 'Testing Strategy', subtitle: 'Building Confidence in Your Code' },
    { id: 9, file: 'episode-09-api-design-best-practices.md', title: 'API Design Best Practices', subtitle: 'Interfaces Developers Love' },
    { id: 10, file: 'episode-10-security-development-methodologies.md', title: 'Security & Methodologies', subtitle: 'The Grand Finale' }
];

const podcastsDir = path.join(__dirname, '..');
const distDir = path.join(__dirname, 'dist');

// Create dist directory
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

console.log('Building podcast PWA...\n');

// Read and process episodes
const episodes = episodeMeta.map(meta => {
    const filePath = path.join(podcastsDir, meta.file);
    console.log(`Processing: ${meta.file}`);

    let content = fs.readFileSync(filePath, 'utf8');
    // Escape backticks and dollar signs for template literal
    content = content.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');

    return {
        id: meta.id,
        title: meta.title,
        subtitle: meta.subtitle,
        content: content
    };
});

// Generate episodes.js
const episodesJs = `// Auto-generated episode data - ${new Date().toISOString()}
const EPISODES = ${JSON.stringify(episodes, null, 2)};
`;

fs.writeFileSync(path.join(distDir, 'episodes.js'), episodesJs);
console.log('\nGenerated: episodes.js');

// Copy other files
const filesToCopy = ['index.html', 'manifest.json', 'sw.js', 'icon.svg'];
filesToCopy.forEach(file => {
    const src = path.join(__dirname, file);
    const dest = path.join(distDir, file);
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`Copied: ${file}`);
    }
});

// Create a simple PNG placeholder instruction
const readmeContent = `# Deployment Instructions

## Quick Deploy to Netlify

1. Go to https://app.netlify.com/drop
2. Drag and drop this entire 'dist' folder
3. Done! You'll get a URL like https://random-name.netlify.app

## Add to Home Screen on Android

1. Open the deployed URL in Chrome
2. Tap the menu (three dots)
3. Tap "Add to Home Screen" or "Install App"
4. The app will work offline!

## Icons

The app uses icon.svg. For better PWA support, convert it to PNG:
- icon-192.png (192x192)
- icon-512.png (512x512)

You can use https://cloudconvert.com/svg-to-png

## Files in this folder

- index.html - The main app
- episodes.js - All 10 episodes embedded
- manifest.json - PWA manifest
- sw.js - Service worker for offline support
- icon.svg - App icon
`;

fs.writeFileSync(path.join(distDir, 'README.md'), readmeContent);
console.log('Created: README.md');

console.log('\n✓ Build complete! Deploy the dist/ folder to Netlify.\n');
