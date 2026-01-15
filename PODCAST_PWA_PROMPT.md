# Podcast PWA Creation Prompt

## Overview

Create a Progressive Web App (PWA) for listening to educational podcast content using browser-based text-to-speech. The app should support multiple podcast series, work offline, and provide a native app-like experience on both Android and iOS devices.

---

## Core Requirements

### 1. Progressive Web App Structure

Create a single-page PWA with the following file structure:

```
podcasts/
├── pwa/
│   ├── index.html      # Main app (all HTML, CSS, JS in one file)
│   ├── sw.js           # Service worker for offline support
│   ├── manifest.json   # PWA manifest
│   ├── version.json    # Version tracking for auto-updates
│   ├── _headers        # Netlify cache headers (if deploying to Netlify)
│   ├── icon.svg        # App icon
│   └── podcasts.js     # Dynamic podcast registry
└── shows/
    ├── [podcast-id]/
    │   ├── podcast.json           # Podcast metadata
    │   ├── episode-01-title.md    # Episode content
    │   ├── episode-02-title.md
    │   └── ...
    └── [another-podcast]/
        └── ...
```

### 2. User Interface Views

The app should have three main views:

#### Home View
- Grid/list of available podcast series
- Each podcast shows: icon, title, subtitle, episode count
- Colored cards matching each podcast's theme color
- Version badge in corner

#### Episode List View
- Breadcrumb navigation back to home
- Podcast header with icon, title, description
- List of episodes with:
  - Episode number and title
  - Play button for each episode
- Home button in header

#### Player View
- Navigation: breadcrumbs, home button, back to episodes button
- Now playing info: podcast name, episode title
- Large play/pause button with progress ring
- Playback controls:
  - Skip backward 15 seconds
  - Skip forward 30 seconds
  - Previous/Next segment buttons
- Progress bar (draggable)
- Current time / Total time display
- Speed control (0.5x to 2.0x)
- Auto-play next toggle
- Sleep timer (15, 30, 45, 60 minutes, or off)
- Collapsible voice selection panel
- Collapsible chapters panel
- Collapsible bookmarks panel

### 3. Text-to-Speech Engine

Use the Web Speech API (`speechSynthesis`) with these features:

#### Dual Voice Support
- Two distinct voices for dialogue (Host 1 and Host 2)
- Voice selection dropdowns populated from `speechSynthesis.getVoices()`
- Auto-select different voices (attempt male/female or just different)
- Save voice preferences to localStorage
- Preview button to hear both voices

#### Playback Controls
- Play/Pause with proper state management
- Cancel speech on pause (required for Web Speech API)
- Resume from current segment
- Speed adjustment (affects `SpeechSynthesisUtterance.rate`)
- Track progress through dialogue segments

#### Mobile Compatibility
- Native dropdown appearance for iOS/Android
- Touch-friendly controls (min 44px touch targets)
- Handle `voiceschanged` event (voices load asynchronously)
- Guidance for Android TTS voice variant settings

### 4. Episode Content Format

Episodes are written in Markdown with this structure:

```markdown
# Episode Title

## Introduction

**HOST1:** Opening dialogue here.

**HOST2:** Response dialogue here.

## Section Title

**HOST1:** More content...

**[MUSIC TRANSITION]**

**HOST2:** Continuing after transition...

## Another Section

**HOST1:** The parser should handle any section headers.

*Next Episode: Preview of next episode*
```

#### Markdown Parser Requirements
- Extract speaker dialogue: `**SPEAKERNAME:** text`
- Support ANY speaker names (not hardcoded)
- Assign voices alternating (first speaker = Host 1, second = Host 2)
- Skip stage directions in brackets: `**[DIRECTION]**` or `*[direction]*`
- Skip lines starting with `#`, `|`, `---`, `*Next`, `[Read`
- Combine continuation lines with previous speaker
- Clean text: remove markdown formatting, smart quotes, etc.

### 5. Chapters and Bookmarks

#### Chapters
- Auto-generate from `## Section Headers` in markdown
- Display chapter list in player
- Click to jump to chapter (find segment index)
- Highlight current chapter during playback

#### Bookmarks
- User can add bookmarks at current position
- Store: episode ID, segment index, timestamp, optional note
- Display bookmark list with jump-to functionality
- Delete bookmarks
- Persist to localStorage

### 6. Sleep Timer

- Options: Off, 15, 30, 45, 60 minutes
- Visual countdown in button
- Auto-pause playback when timer expires
- Reset on new selection

### 7. Offline Support & Caching

#### Service Worker Strategy
```javascript
// Network-first for dynamic content
const NETWORK_FIRST = ['/podcasts.js', '/', '/index.html'];

// Never cache version.json
if (url.pathname.endsWith('version.json')) {
    return fetch(request);
}

// Network-first: try network, fall back to cache
async function networkFirst(request) {
    try {
        const response = await fetch(request);
        cache.put(request, response.clone());
        return response;
    } catch {
        return cache.match(request);
    }
}

// Cache-first for static assets
async function cacheFirst(request) {
    const cached = await cache.match(request);
    return cached || fetch(request);
}
```

#### Cache Management
- Version cache name: `podlearn-v{N}`
- Delete old caches on activate
- Pre-cache essential assets

### 8. Auto-Update Mechanism

Implement automatic update detection:

```javascript
const APP_VERSION = '1.0.0';

(async function checkForUpdates() {
    try {
        const response = await fetch('version.json?_=' + Date.now(), {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' }
        });
        const data = await response.json();

        if (data.version !== APP_VERSION) {
            // Unregister service workers
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const reg of registrations) await reg.unregister();

            // Clear all caches
            const cacheNames = await caches.keys();
            for (const name of cacheNames) await caches.delete(name);

            // Force reload
            window.location.reload(true);
        }
    } catch (e) {
        console.log('Version check skipped (offline)');
    }
})();
```

### 9. State Persistence

Save to localStorage:
- Current podcast and episode
- Playback position (segment index)
- Selected voices (by index)
- Playback speed
- Auto-play preference
- Bookmarks per episode
- Sleep timer state

### 10. PWA Manifest

```json
{
    "name": "PodLearn",
    "short_name": "PodLearn",
    "description": "Educational podcasts with text-to-speech",
    "start_url": "/index.html",
    "display": "standalone",
    "background_color": "#0a0a0f",
    "theme_color": "#6366f1",
    "icons": [
        { "src": "icon.svg", "sizes": "any", "type": "image/svg+xml" }
    ]
}
```

### 11. Styling Guidelines

- Dark theme by default
- CSS custom properties for theming:
  ```css
  :root {
      --bg-primary: #0a0a0f;
      --bg-secondary: #12121a;
      --bg-tertiary: #1a1a24;
      --text-primary: #ffffff;
      --text-secondary: #a0a0a0;
      --accent: #6366f1;
      --alex-color: #6366f1;  /* Host 1 */
      --sam-color: #22c55e;   /* Host 2 */
  }
  ```
- Responsive design (mobile-first)
- Smooth transitions and animations
- Progress ring animation for play button
- Touch-friendly sizing throughout

---

## Podcast Series: Claude Code Mastery

Create a comprehensive podcast series teaching users how to effectively use Claude Code (Anthropic's CLI tool for Claude).

### Podcast Metadata

```json
{
    "id": "claude-code-mastery",
    "title": "Claude Code Mastery",
    "subtitle": "Master AI-Powered Software Development",
    "description": "Learn to leverage Claude Code for faster, smarter software development. From basic commands to advanced workflows.",
    "color": "#6366f1",
    "icon": "🤖",
    "episodes": [
        {"id": 1, "file": "episode-01-getting-started.md", "title": "Getting Started with Claude Code"},
        {"id": 2, "file": "episode-02-core-commands.md", "title": "Core Commands & Navigation"},
        {"id": 3, "file": "episode-03-code-editing.md", "title": "Code Reading & Editing"},
        {"id": 4, "file": "episode-04-search-explore.md", "title": "Search & Codebase Exploration"},
        {"id": 5, "file": "episode-05-git-workflow.md", "title": "Git Workflow & Collaboration"},
        {"id": 6, "file": "episode-06-testing-debugging.md", "title": "Testing & Debugging"},
        {"id": 7, "file": "episode-07-project-setup.md", "title": "Project Setup & Configuration"},
        {"id": 8, "file": "episode-08-advanced-prompting.md", "title": "Advanced Prompting Techniques"},
        {"id": 9, "file": "episode-09-mcp-tools.md", "title": "MCP Servers & Custom Tools"},
        {"id": 10, "file": "episode-10-best-practices.md", "title": "Best Practices & Productivity Tips"}
    ]
}
```

### Episode Content Guidelines

Use two hosts:
- **ALEX:** Senior developer, Claude Code power user, practical focus
- **JAMIE:** Developer learning Claude Code, asks clarifying questions

Each episode should be 45-60 minutes of content when read aloud (approximately 6,000-8,000 words).

### Episode Outlines

#### Episode 1: Getting Started with Claude Code
- What is Claude Code and why use it
- Installation: `npm install -g @anthropic-ai/claude-code`
- First run and authentication
- Understanding the interface
- Basic conversation flow
- The permission system (allowing/denying tool use)
- Slash commands overview (/help, /clear, /status)
- Setting up in VS Code and other IDEs

#### Episode 2: Core Commands & Navigation
- Understanding how Claude Code reads your codebase
- Asking questions about code
- File navigation and exploration
- The Read tool and when it's used
- Glob patterns for finding files
- Working directory context
- Multi-file operations
- Keyboard shortcuts and efficiency tips

#### Episode 3: Code Reading & Editing
- How Claude reads files (Read tool)
- Making edits (Edit tool) - find and replace
- Creating new files (Write tool)
- When to edit vs write
- Reviewing proposed changes
- Handling large files
- Working with different file types
- Jupyter notebook support

#### Episode 4: Search & Codebase Exploration
- Grep for content search
- Glob for file patterns
- Using the Explore agent for complex searches
- Understanding search results
- Combining search strategies
- Finding definitions, usages, patterns
- Navigating unfamiliar codebases
- Architecture discovery

#### Episode 5: Git Workflow & Collaboration
- Git status and diff integration
- Creating commits with Claude
- Writing good commit messages
- Branch management
- Creating pull requests with gh
- Code review assistance
- Merge conflict resolution
- Git best practices with AI

#### Episode 6: Testing & Debugging
- Running tests through Claude Code
- Understanding test output
- Debugging failing tests
- Adding new tests
- Test-driven development workflow
- Error message interpretation
- Stack trace analysis
- Common debugging patterns

#### Episode 7: Project Setup & Configuration
- CLAUDE.md project documentation
- Setting allowed/disallowed tools
- Custom instructions per project
- Environment setup
- Dependency management
- Build configuration
- CI/CD integration considerations
- Team configuration sharing

#### Episode 8: Advanced Prompting Techniques
- Being specific vs being vague
- Providing context effectively
- Multi-step task breakdown
- Using todo lists for complex tasks
- Iterative refinement
- When to intervene vs let Claude work
- Recovering from mistakes
- Prompt patterns that work well

#### Episode 9: MCP Servers & Custom Tools
- What is MCP (Model Context Protocol)
- Built-in MCP capabilities
- Adding external MCP servers
- Common MCP tools (web search, databases, APIs)
- Configuring MCP in settings
- Security considerations
- Building custom MCP servers
- Enterprise MCP patterns

#### Episode 10: Best Practices & Productivity Tips
- Daily workflow optimization
- Project organization for AI assistance
- Code review with Claude
- Documentation generation
- Refactoring strategies
- Performance considerations
- Staying in control
- The future of AI-assisted development
- Community resources and learning more

---

## Implementation Notes

### Key Technical Challenges

1. **Service Worker Caching**: Use network-first for dynamic content, never cache version.json
2. **Voice Loading**: Voices load asynchronously - use `onvoiceschanged` event
3. **Mobile Touch**: Ensure all interactive elements are at least 44px
4. **Speech API Quirks**: Must cancel speech before changing utterance
5. **iOS Compatibility**: Test on Safari - some voice behaviors differ
6. **State Management**: Save state frequently, restore on load

### Testing Checklist

- [ ] PWA installs on Android
- [ ] PWA installs on iOS
- [ ] Offline playback works
- [ ] Auto-update triggers on version change
- [ ] Voice selection works on mobile
- [ ] Sleep timer pauses correctly
- [ ] Bookmarks persist across sessions
- [ ] Progress saves when closing app
- [ ] All episodes parse correctly
- [ ] Speed control affects playback
- [ ] Chapter navigation works

### Deployment

For Netlify deployment, include `_headers` file:
```
/podcasts.js
  Cache-Control: no-cache, no-store, must-revalidate

/version.json
  Cache-Control: no-cache, no-store, must-revalidate

/sw.js
  Cache-Control: no-cache, no-store, must-revalidate
```

---

## Summary

This prompt describes a full-featured podcast PWA that:
- Supports multiple podcast series
- Uses browser TTS with dual voices
- Works offline with smart caching
- Auto-updates when new versions deploy
- Provides chapters, bookmarks, sleep timer
- Works on desktop, Android, and iOS
- Includes a 10-episode series teaching Claude Code

The key differentiator is using text-to-speech instead of audio files, making it easy to create and update educational content without recording equipment.
