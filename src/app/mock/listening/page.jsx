import TestListeningPage from '../_components/TestListeningPage';
import { BookNotFound, TestNotFound } from '../_components/ListeningErrorComponents';
import { getMockById } from '@/lib/mockApi';
import { adaptListening } from '@/lib/mockAdapters';

export const dynamic = 'force-dynamic';

const DEFAULT_BOOK_ID = 'backend-mock';
const DEFAULT_TEST_ID = 1;
const DEFAULT_MOCK_ID = 1;

async function resolveMockId(searchParams) {
    const resolvedSearchParams = await searchParams;
    const value = resolvedSearchParams?.mockId;
    if (Array.isArray(value)) return Number(value[0]) || DEFAULT_MOCK_ID;
    return Number(value) || DEFAULT_MOCK_ID;
}

export default async function MockListeningPage({ searchParams }) {
    const mockId = await resolveMockId(searchParams);
    let adaptedTest = null;

    try {
        const mockDetail = await getMockById(mockId);
        adaptedTest = adaptListening(mockDetail);
    } catch (error) {
        console.error('Failed to load backend listening mock:', error);
    }

    if (!adaptedTest) {
        return <BookNotFound />;
    }

    const bookData = {
        id: DEFAULT_BOOK_ID,
        tests: [adaptedTest],
    };
    const test = bookData.tests[0];

    if (!test) {
        return <TestNotFound />;
    }

    return (
        <TestListeningPage
            bookData={bookData}
            answersData={null}
            bookId={DEFAULT_BOOK_ID}
            testId={DEFAULT_TEST_ID}
            testTitle={test.name || test.title || `Test ${DEFAULT_TEST_ID}`}
            nextHref="/mock/reading"
            isMockExam={true}
            mockId={mockId}
        />
    );
}
