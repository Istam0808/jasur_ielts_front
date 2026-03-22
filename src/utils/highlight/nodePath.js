/**
 * Child-index path from root to node (works for Element and Text nodes).
 * @param {Node} node
 * @param {Node} root
 * @returns {number[] | null}
 */
export function getNodePath(node, root) {
    if (!node || !root || node === root) return [];
    if (!root.contains(node)) return null;

    const path = [];
    let current = node;

    while (current && current !== root) {
        const parent = current.parentNode;
        if (!parent) return null;
        const index = Array.prototype.indexOf.call(parent.childNodes, current);
        if (index < 0) return null;
        path.unshift(index);
        current = parent;
    }

    return current === root ? path : null;
}

/**
 * @param {Node} root
 * @param {number[]} path
 * @returns {Node | null}
 */
export function resolveNodePath(root, path) {
    if (!root || !Array.isArray(path)) return null;
    let node = root;
    for (let i = 0; i < path.length; i += 1) {
        const idx = path[i];
        if (!node.childNodes || idx >= node.childNodes.length) return null;
        node = node.childNodes[idx];
    }
    return node || null;
}
