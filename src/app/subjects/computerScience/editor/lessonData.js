/**
 * Stub for computer science lesson data (video counts, locales, title-to-key map).
 * Used by SimpleNavbar search. Replace with real data when subjects/editor is implemented.
 */

/** @type {Record<string, string>} Map course title to lesson key */
export const subjectTitleToKey = {};

/**
 * @param {string} lessonKey
 * @returns {number}
 */
export function getVideoLessonCount(lessonKey) {
    return 0;
}

/**
 * @param {string} lessonKey
 * @returns {string[]}
 */
export function getAvailableLocales(lessonKey) {
    return [];
}
