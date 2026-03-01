import TestListeningPage from '../_components/TestListeningPage';
import { getBookDataById, getAnswersByBookId } from '@/store/data/practice/language/english/listening/listeningData';
import { BookNotFound, TestNotFound } from '../_components/ListeningErrorComponents';

export const dynamic = 'force-dynamic';

const DEFAULT_BOOK_ID = 'cambridge-19';
const DEFAULT_TEST_ID = 1;

export default async function MockListeningPage() {
    const bookData = await getBookDataById(DEFAULT_BOOK_ID);
    const answersData = await getAnswersByBookId(DEFAULT_BOOK_ID);

    if (!bookData) {
        return <BookNotFound />;
    }

    let test = null;
    if (Array.isArray(bookData)) {
        test = bookData.find((item) => item.id === DEFAULT_TEST_ID);
    } else {
        test = bookData.tests?.find((item) => item.id === DEFAULT_TEST_ID);
    }

    if (!test) {
        return <TestNotFound />;
    }

    return (
        <TestListeningPage
            bookData={bookData}
            answersData={answersData}
            bookId={DEFAULT_BOOK_ID}
            testId={DEFAULT_TEST_ID}
            testTitle={test.name || test.title || `Test ${DEFAULT_TEST_ID}`}
            nextHref="/mock/reading"
            isMockExam={true}
        />
    );
}
