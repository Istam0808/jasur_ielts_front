import React from 'react';

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Split text by a delimiter and return segments; every other segment is "inside" the delimiter.
 * e.g. splitByDelimiter("a ^b^ c", "^") => ["a ", "b", " c"]
 */
function splitByDelimiter(text, delimiter) {
  if (typeof text !== 'string') return [String(text ?? '')];
  const re = new RegExp(escapeRegex(delimiter), 'g');
  const parts = text.split(re);
  return parts;
}

/**
 * Recursively format text with markers: each marker wraps its content in a <span>.
 * markers e.g. ['^', '~']: ^x^ and ~y~ get different spans.
 * Returns React node(s): fragment or array of strings and elements.
 */
export function formatExplanationRecursively(text, markers = [], keyPrefix = '') {
  if (text == null || text === '') return null;
  const str = typeof text === 'string' ? text : String(text);
  if (!Array.isArray(markers) || markers.length === 0) return str;

  const [delim, ...rest] = markers;
  const parts = splitByDelimiter(str, delim);

  const out = [];
  parts.forEach((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (i % 2 === 1) {
      const inner = formatExplanationRecursively(part, rest, key);
      out.push(
        React.createElement(
          'span',
          {
            key,
            className: `explanation-marked explanation-marked-${delim === '`' ? 'backtick' : delim === "'" ? 'quote' : 'highlight'}`,
          },
          inner
        )
      );
    } else {
      const inner = rest.length > 0 ? formatExplanationRecursively(part, rest, key) : part;
      if (inner != null && inner !== '') out.push(React.createElement(React.Fragment, { key }, inner));
    }
  });

  if (out.length === 0) return null;
  if (out.length === 1) return out[0];
  return React.createElement(React.Fragment, null, ...out);
}

/**
 * Like formatExplanationRecursively but marked segments can have pronunciation (e.g. click to speak).
 * options: { enablePronunciation, onSpeak, language }
 */
export function formatExplanationRecursivelyWithPronunciation(text, markers = [], options = {}, keyPrefix = '') {
  if (text == null || text === '') return null;
  const str = typeof text === 'string' ? text : String(text);
  if (!Array.isArray(markers) || markers.length === 0) return str;

  const { enablePronunciation, onSpeak, language = 'en' } = options;
  const [delim, ...rest] = markers;
  const parts = splitByDelimiter(str, delim);

  const out = [];
  parts.forEach((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (i % 2 === 1) {
      const inner = formatExplanationRecursivelyWithPronunciation(part, rest, options, key);
      const className = `explanation-marked explanation-marked-${delim === '`' ? 'backtick' : delim === "'" ? 'quote' : 'highlight'}`;
      const content = [
        inner,
        enablePronunciation && typeof onSpeak === 'function' &&
          React.createElement(
            'button',
            {
              key: `${key}-speak`,
              type: 'button',
              className: 'explanation-speak-btn',
              'aria-label': 'Pronounce',
              onClick: (e) => { e.stopPropagation(); onSpeak(part, language); },
            },
            ' 🔊'
          ),
      ].filter(Boolean);
      out.push(React.createElement('span', { key, className }, ...content));
    } else {
      const inner = rest.length > 0
        ? formatExplanationRecursivelyWithPronunciation(part, rest, options, key)
        : part;
      if (inner != null && inner !== '') out.push(React.createElement(React.Fragment, { key }, inner));
    }
  });

  if (out.length === 0) return null;
  if (out.length === 1) return out[0];
  return React.createElement(React.Fragment, null, ...out);
}

/**
 * Scroll window to top (smooth).
 */
export function scrollToTop() {
  if (typeof window === 'undefined') return;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Scroll to adventure start (e.g. first chapter or top).
 */
export function scrollToAdventureStart() {
  if (typeof window === 'undefined') return;
  const el = document.getElementById('adventure-start') || document.body;
  el.scrollIntoView?.({ behavior: 'smooth', block: 'start' }) || scrollToTop();
}
