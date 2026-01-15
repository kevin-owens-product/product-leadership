#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read all episode files
const episodeFiles = [
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

const episodes = episodeFiles.map(ep => {
    const content = fs.readFileSync(path.join(__dirname, '..', ep.file), 'utf8');
    return {
        ...ep,
        content: content.replace(/`/g, '\\`').replace(/\$/g, '\\$')
    };
});

console.log('Building PWA with', episodes.length, 'episodes...');

// Generate the episodes data
const episodesData = episodes.map(ep => `{
    id: ${ep.id},
    title: "${ep.title}",
    subtitle: "${ep.subtitle}",
    content: \`${ep.content}\`
}`).join(',\n');

fs.writeFileSync(path.join(__dirname, 'dist', 'episodes-data.js'), `const EPISODES_DATA = [${episodesData}];`);

console.log('Episodes data written to dist/episodes-data.js');
console.log('Done!');
