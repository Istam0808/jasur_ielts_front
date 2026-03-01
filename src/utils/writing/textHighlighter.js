const CATEGORY_STYLES = {
  taskResponse: { id: 'taskResponse', color: '#3b82f6' },
  coherenceCohesion: { id: 'coherenceCohesion', color: '#8b5cf6' },
  lexicalResource: { id: 'lexicalResource', color: '#f59e0b' },
  grammaticalRange: { id: 'grammaticalRange', color: '#10b981' }
};

const CATEGORY_ALIASES = {
  taskresponse: 'taskResponse',
  'task-response': 'taskResponse',
  task_response: 'taskResponse',
  coherencecohesion: 'coherenceCohesion',
  'coherence-cohesion': 'coherenceCohesion',
  coherence_cohesion: 'coherenceCohesion',
  lexicalresource: 'lexicalResource',
  'lexical-resource': 'lexicalResource',
  lexical_resource: 'lexicalResource',
  grammar: 'grammaticalRange',
  grammaticalrange: 'grammaticalRange',
  'grammatical-range': 'grammaticalRange',
  grammatical_range: 'grammaticalRange',
  accuracy: 'grammaticalRange'
};

const normalizeCategory = (rawId = '') => {
  const normalized = String(rawId).trim().toLowerCase();
  if (!normalized) return null;
  return CATEGORY_ALIASES[normalized] || rawId;
};

const getCategoryStyle = (categoryId) => {
  const key = normalizeCategory(categoryId);
  if (key && CATEGORY_STYLES[key]) return CATEGORY_STYLES[key];
  return { id: key || 'default', color: '#3b82f6' };
};

export const generateHighlightedText = (text = '') => {
  if (!text) return [];

  const segments = [];
  const pattern = /\[\[([^\]|]+)\|([^\]]+)\]\]/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const matchIndex = match.index;
    const matchText = match[1];
    const categoryId = match[2];

    if (matchIndex > lastIndex) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex, matchIndex)
      });
    }

    const category = getCategoryStyle(categoryId);
    const word = matchText.trim();

    segments.push({
      type: 'highlight',
      content: word,
      word,
      category,
      key: `${category.id}-${matchIndex}`
    });

    lastIndex = matchIndex + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(lastIndex)
    });
  }

  if (segments.length === 0) {
    return [{ type: 'text', content: text }];
  }

  return segments;
};
