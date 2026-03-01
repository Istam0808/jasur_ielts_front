// Import book data
import cambridge19Data from './cambridge-19.json';
import cambridge19Answers from './cambridge-19-answers.json';
import c2Data from './c2.json';

import c2DataAnswers from './c2-answers.json';

/**
 * Get listening book data by book ID
 * @param {string} bookId - The ID of the book to retrieve
 * @returns {object|null} The book data object or null if not found
 */
export async function getBookDataById(bookId) {
    // Map bookIds to their data
    const booksMap = {
        'cambridge-19': cambridge19Data,
        'c2': c2Data,
    };
    
    return booksMap[bookId] || null;
}

/**
 * Get listening test answers by book ID
 * @param {string} bookId - The ID of the book to retrieve answers for
 * @returns {object|null} The book answers object or null if not found
 */
export async function getAnswersByBookId(bookId) {
    const answersMap = {
        'cambridge-19': cambridge19Answers,
        'c2': c2DataAnswers,
    };
    
    return answersMap[bookId] || null;
}

/**
 * Get a list of all available listening books
 * @returns {Array} List of available book objects with id, title, and brief info
 */
export async function getAvailableBooks() {
    return [
        {
            id: 'cambridge-19',
            title: 'Cambridge IELTS 19',
            testCount: cambridge19Data.tests?.length || 0,
            en: 'Official Cambridge IELTS 19 Academic and General Training listening test materials with authentic exam questions and comprehensive practice scenarios.',
            ru: 'Официальные материалы Cambridge IELTS 19 для академического и общего обучения с аутентичными экзаменационными вопросами и комплексными практическими сценариями.',
            uz: 'Rasmiy Cambridge IELTS 19 akademik va umumiy tayyorgarlik tinglab tushunish test materiallari haqiqiy imtihon savollari va keng qamrovli amaliyot stsenariylari bilan.'
        },
        {
            id: 'c2',
            title: 'IELTS Listening',
            testCount: c2Data?.length || 0,
            en: 'IELTS-focused listening comprehension materials and mock tests.',
            ru: 'Материалы по аудированию в формате IELTS и пробные тесты.',
            uz: 'IELTS formatidagi tinglab tushunish materiallari va mock testlar.'
        },
    ];
}

/**
 * Get a specific test from a book
 * @param {string} bookId - The ID of the book
 * @param {number} testId - The ID of the test
 * @returns {object|null} The test data or null if not found
 */
export async function getTestById(bookId, testId) {
    const bookData = await getBookDataById(bookId);
    if (!bookData) return null;
    
    // Handle different data structures
    if (Array.isArray(bookData)) {
        // IELTS-only c2 dataset is stored as an array
        return bookData.find(test => test.id === parseInt(testId, 10)) || null;
    } else {
        // Cambridge books have tests property
        return bookData.tests?.find(test => test.id === parseInt(testId, 10)) || null;
    }
} 