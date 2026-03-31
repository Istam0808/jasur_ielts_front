/**
 * Sanitizes HTML for safe use with dangerouslySetInnerHTML (e.g. reading passages).
 * Works in both browser and Node (SSR) via isomorphic-dompurify.
 */

import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = [
    'p', 'b', 'i', 'em', 'strong', 'br', 'span',
    'ul', 'ol', 'li', 'div',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'u', 'sub', 'sup', 'small',
    'blank'
];
const ALLOWED_ATTR = ['class', 'data-blank-id'];

function sanitizeHtml(html) {
    if (html == null || typeof html !== 'string') return '';

    try {
        return DOMPurify.sanitize(html, {
            ALLOWED_TAGS,
            ALLOWED_ATTR
        });
    } catch (e) {
        return html.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
}

export default sanitizeHtml;
