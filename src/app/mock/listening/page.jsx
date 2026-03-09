import TestListeningPage from '../_components/TestListeningPage';
import { BookNotFound, TestNotFound } from '../_components/ListeningErrorComponents';
import { getMockById, isBackendUnavailableError } from '@/lib/mockApi';
import { adaptListening } from '@/lib/mockAdapters';
import { getBookDataById, getAnswersByBookId } from '@/store/data/practice/language/english/listening/listeningData';

export const dynamic = 'force-dynamic';

const DEFAULT_BOOK_ID = 'backend-mock';
const DEFAULT_TEST_ID = 1;
const DEFAULT_MOCK_ID = 1;
const FALLBACK_BOOK_ID = 'cambridge-19';
const FALLBACK_TEST_ID = 1;

async function resolveMockId(searchParams) {
    const resolvedSearchParams = await searchParams;
    const value = resolvedSearchParams?.mockId;
    if (Array.isArray(value)) return Number(value[0]) || DEFAULT_MOCK_ID;
    return Number(value) || DEFAULT_MOCK_ID;
}

function shouldUseFallbackData(error) {
    if (isBackendUnavailableError(error)) return true;
    if (error?.status === 404) return true;
    return false;
}

export default async function MockListeningPage({ searchParams }) {
    const mockId = await resolveMockId(searchParams);
    let adaptedTest = null;
    let fallbackBookData = null;
    let fallbackAnswersData = null;
    let shouldUseFallback = false;

    try {
        const mockDetail = await getMockById(mockId);
        adaptedTest = adaptListening(mockDetail);
    } catch (error) {
        if (shouldUseFallbackData(error)) {
            const reason = error?.status === 404
                ? 'mock or API not found (404)'
                : `temporarily unavailable (${error?.status || error?.code || 'unknown'})`;
            console.warn(`Listening mock backend ${reason}, using local fallback.`);
            shouldUseFallback = true;
        } else {
            console.error('Failed to load backend listening mock:', error);
        }
    }

    if (shouldUseFallback && !adaptedTest) {
        fallbackBookData = await getBookDataById(FALLBACK_BOOK_ID);
        fallbackAnswersData = await getAnswersByBookId(FALLBACK_BOOK_ID);
    }

    if (!adaptedTest && !fallbackBookData) {
        return <BookNotFound />;
    }

    const bookData = adaptedTest
        ? {
            id: DEFAULT_BOOK_ID,
            tests: [adaptedTest],
        }
        : fallbackBookData;

    const test = adaptedTest
        ? bookData.tests?.[0] || null
        : (
            Array.isArray(bookData)
                ? bookData.find((item) => item.id === FALLBACK_TEST_ID)
                : bookData?.tests?.find((item) => item.id === FALLBACK_TEST_ID)
        );

    if (!test) {
        return <TestNotFound />;
    }

    return (
        <TestListeningPage
            bookData={bookData}
            answersData={adaptedTest ? null : fallbackAnswersData}
            bookId={adaptedTest ? DEFAULT_BOOK_ID : FALLBACK_BOOK_ID}
            testId={adaptedTest ? DEFAULT_TEST_ID : FALLBACK_TEST_ID}
            testTitle={test.name || test.title || `Test ${adaptedTest ? DEFAULT_TEST_ID : FALLBACK_TEST_ID}`}
            nextHref="/mock/reading"
            isMockExam={true}
            mockId={adaptedTest ? mockId : null}
        />
    );
}
