const ENTITY_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

export function escapeHtml(value) {
  const text = value == null ? '' : String(value);
  return text.replace(/[&<>"']/g, (ch) => ENTITY_MAP[ch]);
}

export function escapeRegExp(value) {
  const text = value == null ? '' : String(value);
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function safeColor(value, fallback = '#6366f1') {
  const text = value == null ? '' : String(value).trim();
  if (/^#[0-9a-f]{3,8}$/i.test(text)) return text;
  if (/^rgb\((\s*\d+\s*,){2}\s*\d+\s*\)$/i.test(text)) return text;
  if (/^rgba\((\s*\d+\s*,){3}\s*(0|1|0?\.\d+)\s*\)$/i.test(text)) return text;
  return fallback;
}
