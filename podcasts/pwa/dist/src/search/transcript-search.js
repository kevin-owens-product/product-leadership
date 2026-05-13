import { escapeRegExp } from '../security/sanitize.js';

export function clearHighlight(textEl) {
  if (!textEl) return;
  textEl.textContent = textEl.textContent;
}

export function applyLiteralHighlight(textEl, query) {
  if (!textEl) return;
  const text = textEl.textContent;
  if (!query) {
    textEl.textContent = text;
    return;
  }

  const escaped = escapeRegExp(query);
  const regex = new RegExp(`(${escaped})`, 'gi');
  const fragment = document.createDocumentFragment();
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
    }
    const span = document.createElement('span');
    span.className = 'highlight';
    span.textContent = match[0];
    fragment.appendChild(span);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
  }

  textEl.textContent = '';
  textEl.appendChild(fragment);
}

export function includesQuery(text, query) {
  if (!query) return false;
  return String(text || '').toLowerCase().includes(query.toLowerCase());
}
