const normalizeCategoryId = (categoryId = '') => {
  const normalized = String(categoryId).trim();
  if (!normalized) return 'default';
  return normalized;
};

const buildContent = (t, categoryId) => {
  const key = normalizeCategoryId(categoryId);

  const dictionary = {
    taskResponse: {
      name: t('tooltips.categories.taskResponse.name', { defaultValue: 'Task Response' }),
      rule: t('tooltips.categories.taskResponse.rule', {
        defaultValue: 'Address all parts of the task with clear ideas and relevant details.'
      }),
      examples: [
        t('tooltips.categories.taskResponse.examples.0', { defaultValue: 'Answer all bullet points.' }),
        t('tooltips.categories.taskResponse.examples.1', { defaultValue: 'Explain your main point with a specific example.' })
      ],
      tips: [
        t('tooltips.categories.taskResponse.tips.0', { defaultValue: 'Plan your response before writing.' }),
        t('tooltips.categories.taskResponse.tips.1', { defaultValue: 'Avoid going off-topic.' })
      ],
      coherenceNote: t('tooltips.categories.taskResponse.coherenceNote', {
        defaultValue: 'Use a clear structure so each paragraph supports the task.'
      })
    },
    coherenceCohesion: {
      name: t('tooltips.categories.coherenceCohesion.name', { defaultValue: 'Coherence & Cohesion' }),
      rule: t('tooltips.categories.coherenceCohesion.rule', {
        defaultValue: 'Organize ideas logically and connect sentences with appropriate linking words.'
      }),
      examples: [
        t('tooltips.categories.coherenceCohesion.examples.0', { defaultValue: 'Firstly... Secondly... Finally...' }),
        t('tooltips.categories.coherenceCohesion.examples.1', { defaultValue: 'However, in contrast, therefore...' })
      ],
      tips: [
        t('tooltips.categories.coherenceCohesion.tips.0', { defaultValue: 'Use topic sentences to guide the reader.' }),
        t('tooltips.categories.coherenceCohesion.tips.1', { defaultValue: 'Avoid overusing the same connector.' })
      ],
      coherenceNote: t('tooltips.categories.coherenceCohesion.coherenceNote', {
        defaultValue: 'Link ideas smoothly across sentences and paragraphs.'
      })
    },
    lexicalResource: {
      name: t('tooltips.categories.lexicalResource.name', { defaultValue: 'Lexical Resource' }),
      rule: t('tooltips.categories.lexicalResource.rule', {
        defaultValue: 'Use varied and precise vocabulary appropriate to the task.'
      }),
      examples: [
        t('tooltips.categories.lexicalResource.examples.0', { defaultValue: 'beneficial → advantageous' }),
        t('tooltips.categories.lexicalResource.examples.1', { defaultValue: 'important → significant / essential' })
      ],
      tips: [
        t('tooltips.categories.lexicalResource.tips.0', { defaultValue: 'Prefer specific words over general ones.' }),
        t('tooltips.categories.lexicalResource.tips.1', { defaultValue: 'Check collocations (e.g., make a decision).' })
      ],
      coherenceNote: t('tooltips.categories.lexicalResource.coherenceNote', {
        defaultValue: 'Use consistent terminology to avoid confusion.'
      })
    },
    grammaticalRange: {
      name: t('tooltips.categories.grammaticalRange.name', { defaultValue: 'Grammar & Accuracy' }),
      rule: t('tooltips.categories.grammaticalRange.rule', {
        defaultValue: 'Use a range of sentence structures with accurate grammar and punctuation.'
      }),
      examples: [
        t('tooltips.categories.grammaticalRange.examples.0', {
          defaultValue: 'Although it was late, we continued working.'
        }),
        t('tooltips.categories.grammaticalRange.examples.1', {
          defaultValue: 'If governments invested more, results would improve.'
        })
      ],
      tips: [
        t('tooltips.categories.grammaticalRange.tips.0', { defaultValue: 'Mix simple and complex sentences.' }),
        t('tooltips.categories.grammaticalRange.tips.1', { defaultValue: 'Proofread for tense and agreement errors.' })
      ],
      coherenceNote: t('tooltips.categories.grammaticalRange.coherenceNote', {
        defaultValue: 'Accurate grammar makes your ideas easier to follow.'
      })
    }
  };

  if (dictionary[key]) {
    return dictionary[key];
  }

  const fallbackName = t('tooltips.categories.default.name', { defaultValue: 'Writing Tip' });

  return {
    name: fallbackName,
    rule: t('tooltips.categories.default.rule', {
      defaultValue: 'Improve clarity, accuracy, and relevance to the task.'
    }),
    examples: [
      t('tooltips.categories.default.examples.0', { defaultValue: 'Use clear topic sentences.' }),
      t('tooltips.categories.default.examples.1', { defaultValue: 'Support ideas with brief examples.' })
    ],
    tips: [
      t('tooltips.categories.default.tips.0', { defaultValue: 'Keep your paragraphs focused.' }),
      t('tooltips.categories.default.tips.1', { defaultValue: 'Revise for clarity and correctness.' })
    ],
    coherenceNote: t('tooltips.categories.default.coherenceNote', {
      defaultValue: 'Structure helps the reader follow your argument.'
    })
  };
};

export const getLocalizedTooltipContent = (categoryId, t) => {
  if (typeof t !== 'function') return null;
  const content = buildContent(t, categoryId);

  return {
    categoryName: content.name,
    rule: content.rule,
    examples: Array.isArray(content.examples) ? content.examples : [],
    tips: Array.isArray(content.tips) ? content.tips : [],
    coherenceNote: content.coherenceNote
  };
};
