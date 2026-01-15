#!/bin/bash

# Build script to create the PWA with embedded episodes
cd "$(dirname "$0")"

echo "Building Tech Leadership Unpacked PWA..."

# Create dist directory
mkdir -p dist

# Read all episode files and create a JavaScript data file
cat > dist/episodes.js << 'HEADER'
// Auto-generated episode data
const EPISODES = [
HEADER

for i in {1..10}; do
    case $i in
        1) file="episode-01-ai-machine-learning-fundamentals.md"; title="AI & Machine Learning Fundamentals"; subtitle="The CPO's Guide to the AI Revolution";;
        2) file="episode-02-large-language-models.md"; title="Large Language Models Deep Dive"; subtitle="LLMs Demystified";;
        3) file="episode-03-software-engineering-excellence.md"; title="Software Engineering Excellence"; subtitle="Building World-Class Teams";;
        4) file="episode-04-software-architecture-patterns.md"; title="Software Architecture Patterns"; subtitle="Building Systems That Last";;
        5) file="episode-05-systems-design-at-scale.md"; title="Systems Design at Scale"; subtitle="Building for Millions";;
        6) file="episode-06-monorepos-code-organization.md"; title="Monorepos & Code Organization"; subtitle="One Repo to Rule Them All?";;
        7) file="episode-07-design-systems.md"; title="Design Systems & Components"; subtitle="Building Consistent UI at Scale";;
        8) file="episode-08-testing-strategy.md"; title="Testing Strategy"; subtitle="Building Confidence in Your Code";;
        9) file="episode-09-api-design-best-practices.md"; title="API Design Best Practices"; subtitle="Interfaces Developers Love";;
        10) file="episode-10-security-development-methodologies.md"; title="Security & Methodologies"; subtitle="The Grand Finale";;
    esac

    echo "Processing Episode $i: $title"

    # Escape backticks and create episode entry
    content=$(cat "../$file" | sed 's/`/\\`/g' | sed 's/\$/\\$/g')

    if [ $i -lt 10 ]; then
        comma=","
    else
        comma=""
    fi

    cat >> dist/episodes.js << EOF
{
    id: $i,
    title: "$title",
    subtitle: "$subtitle",
    content: \`$content\`
}$comma
EOF

done

echo "];" >> dist/episodes.js

echo "Episodes data generated!"
echo "Now copy index.html, manifest.json, and sw.js to dist/"
cp index.html dist/
cp manifest.json dist/
cp sw.js dist/
cp icon-192.png dist/ 2>/dev/null || echo "Warning: icon-192.png not found"
cp icon-512.png dist/ 2>/dev/null || echo "Warning: icon-512.png not found"

echo "Build complete! Deploy the dist/ folder to Netlify."
