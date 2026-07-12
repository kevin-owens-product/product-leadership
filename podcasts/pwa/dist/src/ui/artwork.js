// Identity engine (DESIGN.md §3 + §5) — every show gets ONE hue, and from
// it: designed generated cover art (layered gradients + motif + grain +
// wordmark, drawn on canvas at 2x and cached as a data URL) and the
// adaptive --show-* palette applied to <body> while a show context is
// active. Contrast for every text/fill pairing is computed and clamped
// here, at generation time — never eyeballed.

// Ember reference fill — hex twin of --accent-500 oklch(0.665 0.180 43).
// Kept for callers that need a plain CSS color fallback.
export const DEFAULT_ACCENT = '#e0703c';

// ---------------------------------------------------------------------------
// Show identities: hue + companion-hue spread + designed motif + wordmark.
// Deterministic hash fallback covers shows added later without a curated row.
// ---------------------------------------------------------------------------

const SHOW_IDENTITIES = {
    'agentic-coding-frontier': { hue: 205, spread: 55, motif: 'nodes', wordmark: 'FRONTIER' },
    'ap-finance-mastery': { hue: 160, spread: 45, motif: 'bars', wordmark: 'AP MASTERY' },
    'claude-code-mastery': { hue: 285, spread: -35, motif: 'caret', wordmark: 'CC MASTERY' },
    'deadwater': { hue: 185, spread: 40, motif: 'waves', wordmark: 'DEADWATER' },
    'foreign-service-prep': { hue: 245, spread: 30, motif: 'globe', wordmark: 'THE EDGE' },
    'tech-leadership': { hue: 315, spread: -40, motif: 'rings', wordmark: 'UNPACKED' },
    'the-forge-podcast': { hue: 62, spread: -28, motif: 'embers', wordmark: 'THE FORGE' },
    'the-harness': { hue: 225, spread: 50, motif: 'weave', wordmark: 'THE HARNESS' }
};

const MOTIFS = ['nodes', 'bars', 'caret', 'waves', 'globe', 'rings', 'embers', 'weave'];

function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

export function getShowIdentity(podcast) {
    const id = typeof podcast === 'string' ? podcast : podcast?.id;
    if (!id) return { hue: 43, spread: -20, motif: 'embers', wordmark: '' };
    if (SHOW_IDENTITIES[id]) return SHOW_IDENTITIES[id];
    // Deterministic fallback: golden-angle hue from the id hash.
    const h = hashString(id);
    const title = (typeof podcast === 'object' && podcast?.title) || id;
    return {
        hue: Math.round((h * 137.508) % 360),
        spread: (h % 2 ? -1 : 1) * (28 + (h % 33)),
        motif: MOTIFS[h % MOTIFS.length],
        wordmark: title.split(/\s+/)[0].toUpperCase().slice(0, 12)
    };
}

// ---------------------------------------------------------------------------
// OKLCH → sRGB (for canvas fills and contrast math)
// ---------------------------------------------------------------------------

function oklchToLinearSrgb(L, C, H) {
    const hRad = (H * Math.PI) / 180;
    const a = C * Math.cos(hRad);
    const b = C * Math.sin(hRad);
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.291485548 * b;
    const l = l_ * l_ * l_;
    const m = m_ * m_ * m_;
    const s = s_ * s_ * s_;
    return [
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
    ];
}

function inGamut(rgb) {
    return rgb.every((v) => v >= -0.0005 && v <= 1.0005);
}

// Resolve an OKLCH triple to in-gamut linear sRGB, shrinking chroma if needed.
function resolveLinear(L, C, H) {
    let c = C;
    let rgb = oklchToLinearSrgb(L, c, H);
    let guard = 0;
    while (!inGamut(rgb) && c > 0.001 && guard++ < 32) {
        c *= 0.9;
        rgb = oklchToLinearSrgb(L, c, H);
    }
    return rgb.map((v) => Math.min(1, Math.max(0, v)));
}

function gamma(v) {
    return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

// CSS color string for canvas fills (canvas wants sRGB).
export function oklchToCss(L, C, H, alpha = 1) {
    const [r, g, b] = resolveLinear(L, C, H).map(gamma);
    const to255 = (v) => Math.round(v * 255);
    return alpha >= 1
        ? `rgb(${to255(r)}, ${to255(g)}, ${to255(b)})`
        : `rgba(${to255(r)}, ${to255(g)}, ${to255(b)}, ${alpha})`;
}

// WCAG relative luminance / contrast from OKLCH triples.
function wcagLuminance(L, C, H) {
    const [r, g, b] = resolveLinear(L, C, H);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(fg, bg) {
    const l1 = wcagLuminance(...fg);
    const l2 = wcagLuminance(...bg);
    const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
    return (hi + 0.05) / (lo + 0.05);
}

// Push a foreground's OKLCH lightness away from the background until the
// pairing measures ≥ `ratio`. `direction` is +1 (lighten) or -1 (darken).
function clampLightness([L, C, H], bg, ratio, direction) {
    let l = L;
    let guard = 0;
    while (contrastRatio([l, C, H], bg) < ratio && guard++ < 60) {
        l += direction * 0.01;
        if (l >= 0.99 || l <= 0.05) break;
    }
    return [Math.min(0.99, Math.max(0.05, l)), C, H];
}

// ---------------------------------------------------------------------------
// Adaptive palette — the DESIGN.md §3 formula, contrast-clamped per hue.
// ---------------------------------------------------------------------------

// --surface-0 (page background) from styles/base.css.
const SURFACE_0 = [0.162, 0.011, 56];

const paletteCache = new Map();

export function getShowPalette(podcast) {
    const identity = getShowIdentity(podcast);
    const cached = paletteCache.get(identity.hue);
    if (cached) return cached;
    const h = identity.hue;

    const wash = [0.315, 0.055, h];
    // Tinted text must read on both the wash and the page background.
    let text = clampLightness([0.85, 0.075, h], wash, 4.5, +1);
    text = clampLightness(text, SURFACE_0, 4.5, +1);
    const accent = [0.74, 0.145, h];
    // Glyphs on show-accent fills: dark ink, clamped against the fill.
    const onAccent = clampLightness([0.16, 0.035, h], accent, 4.5, -1);

    const css = (t, alpha) => oklchString(t, alpha);
    const palette = {
        hue: h,
        identity,
        accent: css(accent),
        accentDeep: css([0.52, 0.11, h]),
        text: css(text),
        wash: css(wash),
        chip: css(accent, 0.14),
        onAccent: css(onAccent),
        glow: css([0.6, 0.13, h], 0.38)
    };
    paletteCache.set(identity.hue, palette);
    return palette;
}

// Emit palette entries as CSS oklch() strings so the browser does the
// rendering; the JS sRGB path above is only for measurement + canvas.
function oklchString([L, C, H], alpha) {
    const l = +L.toFixed(3);
    const c = +C.toFixed(3);
    return alpha === undefined
        ? `oklch(${l} ${c} ${H})`
        : `oklch(${l} ${c} ${H} / ${alpha})`;
}

// ---------------------------------------------------------------------------
// Palette application: --show-* on <body> while a show context is active.
// Also bridges --accent/--accent-text on <html> so pre-D3 components that
// still consume the generic accent follow the show (the light theme shadows
// --accent-text with its own darker value on body — see components.css).
// ---------------------------------------------------------------------------

const BODY_PROPS = ['--show-hue', '--show-accent', '--show-accent-deep',
    '--show-text', '--show-wash', '--show-chip', '--show-on-accent', '--show-glow'];

export function applyShowPalette(podcast) {
    if (typeof document === 'undefined') return null;
    const p = getShowPalette(podcast);
    const body = document.body.style;
    body.setProperty('--show-hue', String(p.hue));
    body.setProperty('--show-accent', p.accent);
    body.setProperty('--show-accent-deep', p.accentDeep);
    body.setProperty('--show-text', p.text);
    body.setProperty('--show-wash', p.wash);
    body.setProperty('--show-chip', p.chip);
    body.setProperty('--show-on-accent', p.onAccent);
    body.setProperty('--show-glow', p.glow);
    document.documentElement.style.setProperty('--accent', p.accent);
    document.documentElement.style.setProperty('--accent-text', p.text);
    return p;
}

export function clearShowPalette() {
    if (typeof document === 'undefined') return;
    for (const prop of BODY_PROPS) document.body.style.removeProperty(prop);
    document.documentElement.style.removeProperty('--accent');
    document.documentElement.style.removeProperty('--accent-text');
}

// ---------------------------------------------------------------------------
// Cover art. One 1024px (512 @2x) canvas per show, cached as a PNG data
// URL — crisp from mini-player thumb (44px) to hero (320px) and accepted
// by Media Session. Layers: dual gradient field → designed motif → grain
// → letterspaced wordmark. No initials-on-a-gradient, no emoji.
// ---------------------------------------------------------------------------

const artworkCache = new Map();

export function generatePodcastArtwork(podcast) {
    if (!podcast) return null;
    const cached = artworkCache.get(podcast.id);
    if (cached) return cached;
    if (typeof document === 'undefined') return null;

    const identity = getShowIdentity(podcast);
    const size = 1024;               // 512 CSS px @2x retina
    const u = size / 400;            // motif coordinate unit (400-grid)
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const h = identity.hue;
    const h2 = ((identity.hue + identity.spread) % 360 + 360) % 360;

    // Layer 1: deep dual-hue field (diagonal) + companion-hue glow (top-left).
    const bg = ctx.createLinearGradient(0, 0, size, size * 1.2);
    bg.addColorStop(0, oklchToCss(0.34, 0.075, h));
    bg.addColorStop(0.55, oklchToCss(0.235, 0.06, h));
    bg.addColorStop(1, oklchToCss(0.16, 0.045, h2));
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);

    const glow = ctx.createRadialGradient(size * 0.28, size * 0.2, 0, size * 0.28, size * 0.2, size * 0.9);
    glow.addColorStop(0, oklchToCss(0.6, 0.11, h2, 0.5));
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);

    // Layer 2: the show's designed motif.
    drawMotif(ctx, identity.motif, h, h2, u);

    // Layer 3: seeded grain so flat fields don't band.
    drawGrain(ctx, size, hashString(podcast.id));

    // Layer 4: letterspaced caps wordmark.
    const wordmark = identity.wordmark || (podcast.title || '').split(/\s+/)[0].toUpperCase();
    if (wordmark) {
        ctx.fillStyle = oklchToCss(0.9, 0.04, h, 0.92);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const fontPx = Math.round(size * 0.042);
        ctx.font = `600 ${fontPx}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
        drawTracked(ctx, wordmark, size / 2, size * 0.9, fontPx * 0.32);
    }

    let dataUrl;
    try {
        dataUrl = canvas.toDataURL('image/png');
    } catch (err) {
        console.warn('Artwork generation failed:', err);
        return null;
    }
    artworkCache.set(podcast.id, dataUrl);
    return dataUrl;
}

// Centered text with manual letterspacing (canvas letterSpacing support is
// uneven across engines).
function drawTracked(ctx, text, cx, y, tracking) {
    const widths = [...text].map((ch) => ctx.measureText(ch).width);
    const total = widths.reduce((a, b) => a + b, 0) + tracking * (text.length - 1);
    let x = cx - total / 2;
    ctx.save();
    ctx.textAlign = 'left';
    [...text].forEach((ch, i) => {
        ctx.fillText(ch, x, y);
        x += widths[i] + tracking;
    });
    ctx.restore();
}

function drawGrain(ctx, size, seed) {
    let state = seed || 1;
    const rand = () => {
        // xorshift32 — deterministic per show id.
        state ^= state << 13; state >>>= 0;
        state ^= state >> 17;
        state ^= state << 5; state >>>= 0;
        return state / 4294967296;
    };
    const dots = 7000;
    for (let i = 0; i < dots; i++) {
        const x = rand() * size;
        const y = rand() * size;
        const light = rand() > 0.5;
        const a = 0.015 + rand() * 0.035;
        ctx.fillStyle = light ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;
        ctx.fillRect(x, y, 1.6, 1.6);
    }
}

// Motifs share the comps' 400-unit grid; `u` scales to canvas pixels.
function drawMotif(ctx, motif, h, h2, u) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (motif === 'waves') {
        for (let i = 0; i < 6; i++) {
            const y = (150 + i * 42) * u;
            const o = 0.16 + i * 0.11;
            ctx.strokeStyle = oklchToCss(0.78, 0.1, h, o);
            ctx.lineWidth = (5 + i * 1.5) * u;
            ctx.beginPath();
            ctx.moveTo(-20 * u, y);
            ctx.bezierCurveTo(60 * u, y - 34 * u, 140 * u, y + 34 * u, 220 * u, y);
            ctx.bezierCurveTo(300 * u, y - 34 * u, 380 * u, y - 34 * u, 440 * u, y);
            ctx.stroke();
        }
        ctx.fillStyle = oklchToCss(0.88, 0.06, h, 0.85);
        ctx.beginPath();
        ctx.arc(300 * u, 88 * u, 34 * u, 0, Math.PI * 2);
        ctx.fill();
    } else if (motif === 'embers') {
        const shards = [[70, 330, 36, 150], [140, 300, 52, 210], [212, 330, 40, 170], [276, 296, 60, 230], [330, 330, 30, 120]];
        shards.forEach(([x, yb, w, ht], i) => {
            ctx.fillStyle = oklchToCss(0.62 + i * 0.05, 0.14, i % 2 ? h2 : h, 0.55 + i * 0.08);
            ctx.beginPath();
            ctx.moveTo(x * u, yb * u);
            ctx.lineTo((x + w / 2) * u, (yb - ht) * u);
            ctx.lineTo((x + w) * u, yb * u);
            ctx.closePath();
            ctx.fill();
        });
        ctx.fillStyle = oklchToCss(0.85, 0.13, h, 0.9);
        ctx.beginPath();
        ctx.arc(205 * u, 120 * u, 46 * u, 0, Math.PI * 2);
        ctx.fill();
    } else if (motif === 'nodes') {
        const pts = [[80, 300], [160, 180], [300, 240], [240, 90], [90, 120], [330, 110], [200, 330]];
        const links = [[0, 1], [1, 2], [1, 3], [3, 4], [3, 5], [2, 6], [0, 6], [4, 1]];
        ctx.strokeStyle = oklchToCss(0.75, 0.09, h, 0.4);
        ctx.lineWidth = 3 * u;
        for (const [a, b] of links) {
            ctx.beginPath();
            ctx.moveTo(pts[a][0] * u, pts[a][1] * u);
            ctx.lineTo(pts[b][0] * u, pts[b][1] * u);
            ctx.stroke();
        }
        pts.forEach(([x, y], i) => {
            ctx.fillStyle = oklchToCss(0.7 + (i % 3) * 0.07, 0.12, i % 2 ? h2 : h, 0.9);
            ctx.beginPath();
            ctx.arc(x * u, y * u, (i === 1 || i === 3 ? 26 : 13) * u, 0, Math.PI * 2);
            ctx.fill();
        });
    } else if (motif === 'rings') {
        [200, 156, 112, 68].forEach((r, i) => {
            ctx.strokeStyle = oklchToCss(0.6 + i * 0.08, 0.11, i % 2 ? h2 : h, 0.35 + i * 0.16);
            ctx.lineWidth = (10 + i * 4) * u;
            ctx.beginPath();
            ctx.arc(320 * u, 110 * u, r * u, 0, Math.PI * 2);
            ctx.stroke();
        });
    } else if (motif === 'bars') {
        const bars = [[60, 140], [125, 200], [190, 120], [255, 260], [320, 180]];
        bars.forEach(([x, ht], i) => {
            ctx.fillStyle = oklchToCss(0.62 + i * 0.05, 0.12, i % 2 ? h2 : h, 0.5 + i * 0.1);
            roundRect(ctx, x * u, (360 - ht) * u, 34 * u, ht * u, 17 * u);
            ctx.fill();
        });
    } else if (motif === 'caret') {
        ctx.strokeStyle = oklchToCss(0.85, 0.11, h, 0.95);
        ctx.lineWidth = 30 * u;
        ctx.beginPath();
        ctx.moveTo(110 * u, 130 * u);
        ctx.lineTo(200 * u, 205 * u);
        ctx.lineTo(110 * u, 280 * u);
        ctx.stroke();
        ctx.strokeStyle = oklchToCss(0.75, 0.12, h2, 0.9);
        ctx.beginPath();
        ctx.moveTo(230 * u, 285 * u);
        ctx.lineTo(325 * u, 285 * u);
        ctx.stroke();
    } else if (motif === 'globe') {
        ctx.strokeStyle = oklchToCss(0.8, 0.09, h, 0.9);
        ctx.lineWidth = 7 * u;
        ctx.beginPath();
        ctx.arc(200 * u, 205 * u, 118 * u, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 5 * u;
        ctx.strokeStyle = oklchToCss(0.75, 0.1, h, 0.55);
        ellipse(ctx, 200 * u, 205 * u, 52 * u, 118 * u);
        ctx.strokeStyle = oklchToCss(0.75, 0.1, h, 0.3);
        ctx.lineWidth = 4 * u;
        ellipse(ctx, 200 * u, 205 * u, 96 * u, 118 * u);
        ctx.strokeStyle = oklchToCss(0.75, 0.1, h2, 0.5);
        ctx.lineWidth = 5 * u;
        ctx.beginPath();
        ctx.moveTo(84 * u, 168 * u); ctx.lineTo(316 * u, 168 * u);
        ctx.moveTo(84 * u, 242 * u); ctx.lineTo(316 * u, 242 * u);
        ctx.stroke();
    } else if (motif === 'weave') {
        ctx.lineWidth = 22 * u;
        ctx.strokeStyle = oklchToCss(0.78, 0.1, h, 0.85);
        ctx.beginPath();
        ctx.moveTo(80 * u, 280 * u);
        ctx.bezierCurveTo(80 * u, 160 * u, 200 * u, 160 * u, 200 * u, 280 * u);
        ctx.bezierCurveTo(200 * u, 400 * u, 320 * u, 400 * u, 320 * u, 280 * u);
        ctx.stroke();
        ctx.strokeStyle = oklchToCss(0.66, 0.12, h2, 0.7);
        ctx.beginPath();
        ctx.moveTo(80 * u, 160 * u);
        ctx.bezierCurveTo(80 * u, 280 * u, 200 * u, 280 * u, 200 * u, 160 * u);
        ctx.bezierCurveTo(200 * u, 40 * u, 320 * u, 40 * u, 320 * u, 160 * u);
        ctx.stroke();
    }
    ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, w, h, r);
    } else {
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }
}

function ellipse(ctx, cx, cy, rx, ry) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
}
