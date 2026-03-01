import { FaRegNewspaper, FaInfoCircle, FaSignInAlt, FaQuestionCircle, FaAddressBook, FaBook } from 'react-icons/fa';

// Import from the NEW modular prompts system
import { 
  getWritingAssessmentPrompt, 
  generateWritingValidationPrompt, 
  VALIDATION_CODES 
} from './prompts/index.js';

// Export wrapper for backward compatibility
const getWritingValidationPrompt = generateWritingValidationPrompt;

const nonRegisteredLinks = [
    { title: "About", path: "/about", id: "about", icon: FaInfoCircle },
    { title: "FAQ", path: "/faq", id: "faq", icon: FaQuestionCircle },
    { title: "Contacts", path: "/contacts", id: "contacts", icon: FaAddressBook },
    { title: "News", path: "/news", id: "news", icon: FaRegNewspaper },
    { title: "Books", path: "/books", id: "books", icon: FaBook },
]
const registeredLinks = [
    { title: "About", path: "/about", id: "about", icon: FaInfoCircle },
    { title: "FAQ", path: "/faq", id: "faq", icon: FaQuestionCircle },
    { title: "Contacts", path: "/contacts", id: "contacts", icon: FaAddressBook },
    { title: "News", path: "/news", id: "news", icon: FaRegNewspaper },
    { title: "Books", path: "/books", id: "books", icon: FaBook },
]

const SUBJECT_TEST_TIMERS_IN_MINUTES = {
    "language": {
        "a1": 18,
        "a2": 20,
        "b1": 24,
        "b2": 30,
        "c1": 35,
        "c2": 40,
    },
    "computerScience": {
        "standard": 30, // 30 minutes for computer science tests
    }
}
const SUBJECT_TEST_ITEM_COUNTS = {
    "language": {
        "a1": 25,
        "a2": 30,
        "b1": 35,
        "b2": 40,
        "c1": 45,
        "c2": 50,
    },
    "computerScience": {
        "standard": 25, // 25 questions for computer science tests
    }
}
const WRITING_TASK_1 = {
    minWords: 150,
    maxWords: 250,
    timeMinutes: 20,
    instructionPrefix: 'You should spend about 20 minutes on this task. Write at least 150 words.'
}
const WRITING_TASK_2_REQUIREMENTS = {
    "a1": {
        "minWords": 35,
        "minTime": 20,
        "required": ["Simple present tense", "Basic vocabulary"]
    },
    "a2": {
        "minWords": 50,
        "minTime": 25,
        "required": ["Past/future tenses", "Personal topics"]
    },
    "b1": {
        "minWords": 150,
        "minTime": 30,
        "required": ["Basic conjunctions (and, but, because ...)", "Simple opinions"]
    },
    "b2": {
        "minWords": 200,
        "minTime": 40,
        "required": ["Advanced conjunctions (however, although, therefore ...)", "Clear arguments"]
    },
    "c1": {
        "minWords": 250,
        "minTime": 40,
        "required": ["Complex conjunctions", "Complex sentences", "Sophisticated vocabulary"]
    },
    "c2": {
        "minWords": 250,
        "minTime": 40,
        "required": ["Natural linking devices", "Complex sentences", "Advanced vocabulary", "Nuanced expressions"]
    }
}

/**
 * Wrapper function for backward compatibility
 * Routes to the professional prompt generator in writingPrompt.js
 */
function getWritingAnswerPrompt(difficulty, locale, topic, answer) {
    return getWritingAssessmentPrompt(difficulty, locale, topic, answer);
}


export {
    nonRegisteredLinks,
    registeredLinks,
    SUBJECT_TEST_TIMERS_IN_MINUTES,
    SUBJECT_TEST_ITEM_COUNTS,
    WRITING_TASK_1,
    WRITING_TASK_2_REQUIREMENTS,
    getWritingAnswerPrompt,
    getWritingValidationPrompt,
    VALIDATION_CODES
}


