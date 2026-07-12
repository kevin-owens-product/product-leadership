// Small pure formatting/color helpers shared across UI modules.

// m:ss below an hour, h:mm:ss above.
export function formatClock(totalSeconds) {
    if (!Number.isFinite(totalSeconds) || totalSeconds < 0) totalSeconds = 0;
    const total = Math.round(totalSeconds);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    const m = String(minutes).padStart(hours > 0 ? 2 : 1, '0');
    const s = String(seconds).padStart(2, '0');
    return hours > 0 ? `${hours}:${m}:${s}` : `${m}:${s}`;
}

// Adjust a hex color toward black (amount<0) or white (amount>0). Tolerant of
// short (#abc) and long (#aabbcc) forms; returns input unchanged on parse fail.
export function shadeHex(hex, amount) {
    const m = String(hex).trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!m) return hex;
    let h = m[1];
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const adjust = (v) => {
        const target = amount < 0 ? 0 : 255;
        const next = v + (target - v) * Math.abs(amount);
        return Math.max(0, Math.min(255, Math.round(next)));
    };
    const toHex = (v) => v.toString(16).padStart(2, '0');
    return `#${toHex(adjust(r))}${toHex(adjust(g))}${toHex(adjust(b))}`;
}
