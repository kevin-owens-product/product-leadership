# Deployment Instructions

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
