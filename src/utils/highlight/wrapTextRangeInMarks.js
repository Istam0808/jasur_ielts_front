/**
 * IELTS-style highlight: wrap only text segments in <mark>, never block containers.
 */

/**
 * @param {Node} textNode
 * @param {Node} root
 * @param {(el: Element) => boolean} isExcludedAncestor
 */
function isTextNodeAllowed(textNode, root, isExcludedAncestor) {
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return false;
    if (!root.contains(textNode)) return false;
    const parent = textNode.parentElement;
    if (!parent) return false;
    if (isExcludedAncestor(parent)) return false;
    const tag = parent.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE') return false;
    return true;
}

/**
 * @param {Range} range
 * @param {Node} root
 * @param {(el: Element) => boolean} isExcludedAncestor
 * @returns {Text[]}
 */
function getIntersectingTextNodes(range, root, isExcludedAncestor) {
    const common =
        range.commonAncestorContainer.nodeType === Node.TEXT_NODE
            ? range.commonAncestorContainer.parentNode
            : range.commonAncestorContainer;

    if (!common || !root.contains(common)) return [];

    const walker = document.createTreeWalker(
        common,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode(node) {
                if (!isTextNodeAllowed(node, root, isExcludedAncestor)) {
                    return NodeFilter.FILTER_REJECT;
                }
                if (!range.intersectsNode(node)) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );

    /** @type {Text[]} */
    const out = [];
    let n;
    while ((n = walker.nextNode())) {
        out.push(/** @type {Text} */ (n));
    }
    return out;
}

/**
 * @param {Range} range
 * @param {Node} root
 * @param {string} highlightId
 * @param {string} markClassName
 * @param {(el: Element) => boolean} isExcludedAncestor
 * @returns {boolean}
 */
export function wrapTextRangeInMarks(range, root, highlightId, markClassName, isExcludedAncestor) {
    if (!range || range.collapsed || !root) return false;

    const textNodes = getIntersectingTextNodes(range, root, isExcludedAncestor);
    if (textNodes.length === 0) return false;

    const startContainer = range.startContainer;
    const endContainer = range.endContainer;
    const startOffset = range.startOffset;
    const endOffset = range.endOffset;

    for (let i = textNodes.length - 1; i >= 0; i -= 1) {
        const textNode = textNodes[i];
        let start = 0;
        let end = textNode.length;

        if (textNode === startContainer) start = startOffset;
        if (textNode === endContainer) end = endOffset;

        if (start >= end) continue;

        let work = textNode;
        if (end < work.length) {
            work.splitText(end);
        }
        let mid = work;
        if (start > 0) {
            mid = work.splitText(start);
        }
        if (!mid.length) continue;

        const mark = document.createElement('mark');
        mark.className = markClassName;
        mark.setAttribute('data-highlight-id', highlightId);

        mid.parentNode.insertBefore(mark, mid);
        mark.appendChild(mid);
    }

    return true;
}
