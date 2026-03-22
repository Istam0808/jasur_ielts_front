import { getNodePath, resolveNodePath } from './nodePath';

/**
 * Serialized range: child-index paths from root (stable if DOM structure matches after re-render).
 * @typedef {Object} SerializedRange
 * @property {number[]} startPath
 * @property {number} startOffset
 * @property {number[]} endPath
 * @property {number} endOffset
 */

/**
 * @param {Range} range
 * @param {Node} root
 * @returns {SerializedRange | null}
 */
export function serializeRange(range, root) {
    if (!range || !root) return null;

    const startPath = getNodePath(range.startContainer, root);
    const endPath = getNodePath(range.endContainer, root);

    if (startPath === null || endPath === null) return null;

    return {
        startPath,
        startOffset: range.startOffset,
        endPath,
        endOffset: range.endOffset
    };
}

/**
 * @param {SerializedRange} serialized
 * @param {Node} root
 * @returns {Range | null}
 */
export function deserializeToRange(serialized, root) {
    if (!serialized || !root) return null;

    const startNode = resolveNodePath(root, serialized.startPath);
    const endNode = resolveNodePath(root, serialized.endPath);

    if (!startNode || !endNode) return null;

    try {
        const range = document.createRange();
        range.setStart(startNode, serialized.startOffset);
        range.setEnd(endNode, serialized.endOffset);
        return range;
    } catch {
        return null;
    }
}
