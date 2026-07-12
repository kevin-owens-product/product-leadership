#!/usr/bin/env node
// D5 contrast audit — parses the oklch tokens out of styles/base.css :root,
// resolves the pairings the design system depends on, and computes WCAG 2.1
// contrast ratios. Also sweeps the §3 adaptive show-palette formula across
// every real show hue (plus worst-case hues) and checks the DESIGN.md clamps.
//
// Exit code 1 if any required pairing fails its threshold.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---- oklch → sRGB (same math as src/ui/artwork.js) ----
function oklchToLinearSrgb(L, C, H) {
  const hr = (H * Math.PI) / 180;
  const a = C * Math.cos(hr), b = C * Math.sin(hr);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  ];
}
function clamp01(x) { return Math.min(1, Math.max(0, x)); }
function oklchToSrgb(L, C, H) {
  // Chroma-reduce into gamut like the browser does for oklch() fallback.
  let c = C;
  let rgb = oklchToLinearSrgb(L, c, H);
  while (rgb.some(v => v < -0.0001 || v > 1.0001) && c > 0.0005) {
    c -= 0.0025;
    rgb = oklchToLinearSrgb(L, c, H);
  }
  return rgb.map(clamp01);
}
function relLum([r, g, b]) {
  // inputs are LINEAR sRGB already
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(fg, bg) {
  const l1 = relLum(fg), l2 = relLum(bg);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}
// Alpha-composite fg-with-alpha over bg (both linear rgb triples).
function over(fg, alpha, bg) {
  return fg.map((v, i) => v * alpha + bg[i] * (1 - alpha));
}

// ---- Parse :root tokens from base.css ----
const css = readFileSync(path.join(ROOT, 'styles/base.css'), 'utf8');
const rootBlock = css.match(/:root\s*{([\s\S]*?)\n}/)[1];
const tokens = {};
for (const m of rootBlock.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
  tokens[m[1]] = m[2].trim();
}
function resolve(name, depth = 0) {
  if (depth > 8) throw new Error('var loop ' + name);
  let v = tokens[name];
  if (!v) throw new Error('missing token ' + name);
  const vm = v.match(/^var\((--[\w-]+)\)$/);
  if (vm) return resolve(vm[1], depth + 1);
  return v;
}
function parseOklch(str) {
  const m = str.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.%]+))?\s*\)/);
  if (!m) return null;
  const alpha = m[4] ? (m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4])) : 1;
  return { L: +m[1], C: +m[2], H: +m[3], alpha };
}
function tokenRgb(name) {
  const o = parseOklch(resolve(name));
  if (!o) throw new Error(`token ${name} is not oklch: ${resolve(name)}`);
  return { rgb: oklchToSrgb(o.L, o.C, o.H), alpha: o.alpha };
}

let failures = 0;
const rows = [];
function check(label, fgName, bgName, min, { fgRgb, bgRgb } = {}) {
  const fg = fgRgb || tokenRgb(fgName);
  let bg = bgRgb || tokenRgb(bgName);
  let bgSolid = bg.rgb;
  if (bg.alpha < 1) bgSolid = over(bg.rgb, bg.alpha, tokenRgb('--surface-0').rgb);
  let fgSolid = fg.rgb;
  if (fg.alpha < 1) fgSolid = over(fg.rgb, fg.alpha, bgSolid);
  const r = contrast(fgSolid, bgSolid);
  const ok = r >= min;
  if (!ok) failures++;
  rows.push(`${ok ? 'PASS' : 'FAIL'}  ${r.toFixed(2).padStart(5)}  (min ${min})  ${label}`);
}

// ---- Core token pairings ----
for (const surf of ['--surface-0', '--surface-1', '--surface-2']) {
  check(`text-primary on ${surf}`, '--text-primary', surf, 4.5);
  check(`text-secondary on ${surf}`, '--text-secondary', surf, 4.5);
  check(`accent-text (accent-200) on ${surf}`, '--accent-200', surf, 4.5);
}
// Tertiary text is only used for de-emphasized meta at >=14px; hold it to 3:1 (large-text tier).
check('text-tertiary on --surface-0 (de-emphasized meta, 3:1 tier)', '--text-tertiary', '--surface-0', 3);
check('text-tertiary on --surface-1 (de-emphasized meta, 3:1 tier)', '--text-tertiary', '--surface-1', 3);
check('on-accent ink on --accent-500', '--on-accent', '--accent-500', 4.5);
check('on-accent ink on --accent-300 (hover)', '--on-accent', '--accent-300', 4.5);
check('success text on --surface-1', '--success', '--surface-1', 4.5);
check('warning text on --surface-1', '--warning', '--surface-1', 4.5);
check('danger text on --surface-1', '--danger', '--surface-1', 4.5);

// ---- Adaptive show palette (DESIGN.md §3 formula) across real + worst-case hues ----
const SHOW_HUES = { frontier: 205, 'ap-mastery': 160, 'cc-mastery': 285, deadwater: 185, 'the-edge': 245, unpacked: 315, forge: 62, harness: 225, ember: 43, 'worst-yellow': 100, 'worst-green': 135 };
const surface0 = tokenRgb('--surface-0');
for (const [name, h] of Object.entries(SHOW_HUES)) {
  const accent = { rgb: oklchToSrgb(0.74, 0.145, h), alpha: 1 };
  const onAccent = { rgb: oklchToSrgb(0.16, 0.035, h), alpha: 1 };
  const text = { rgb: oklchToSrgb(0.85, 0.075, h), alpha: 1 };
  const wash = { rgb: oklchToSrgb(0.315, 0.055, h), alpha: 1 };
  check(`show-text on surface-0 [${name} h=${h}]`, null, null, 4.5, { fgRgb: text, bgRgb: surface0 });
  check(`show-text on show-wash [${name} h=${h}]`, null, null, 4.5, { fgRgb: text, bgRgb: wash });
  check(`show-on-accent on show-accent [${name} h=${h}]`, null, null, 4.5, { fgRgb: onAccent, bgRgb: accent });
}

console.log(rows.join('\n'));
console.log(failures === 0 ? '\nAll contrast pairings pass.' : `\n${failures} pairing(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
