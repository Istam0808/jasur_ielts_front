/**
 * Subject/course data for navbar search and dropdowns.
 * Returns: [ languagesSubject, computerScienceCourses ]
 * - languagesSubject: { id: 'languages', languages: [{ id, title, levels? }], icon? }
 * - computerScienceCourses: object of courseKey -> { id, title } (for search results)
 */

export function getSubjects() {
  return [
    {
      id: 'languages',
      languages: [
        { id: 'english', title: 'English', levels: ['ielts'] },
      ],
      icon: null,
    },
    // Computer science: object of course key -> { id, title }; empty = no courses in search
    {},
  ];
}
