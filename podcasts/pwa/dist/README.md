# PodLearn - Custom Podcast Player

## Deployment

### Quick Deploy to Netlify
1. Connect your GitHub repo to Netlify
2. Set build command to: `cd podcasts/pwa && node build-episodes.js`
3. Set publish directory to: `podcasts/pwa/dist`

### Manual Deploy
1. Run `node build-episodes.js` in this directory
2. Deploy the `dist/` folder

## Creating Your Own Podcasts

1. Create a new folder in `shows/` (e.g., `shows/my-podcast/`)

2. Add a `podcast.json` file:
```json
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
```

3. Add episode markdown files with dialogue format:
```markdown
# Episode 1: Title

### INTRO

**ALEX:** Welcome to the show!

**SAM:** Great to be here.

### SEGMENT 1: Topic Name

**ALEX:** Let's talk about...
```

4. Run `node build-episodes.js` to rebuild

## Files

- `index.html` - Main app
- `podcasts.js` - All podcasts and episodes (auto-generated)
- `manifest.json` - PWA manifest
- `sw.js` - Service worker for offline
- `icon.svg` - App icon
