import ReadingPage from '../_components/ReadingPage';
import NotFoundMessage from '../_components/NotFoundMessage';

const DEFAULT_READING_ID = 1;

export default async function MockReadingPage() {
    let readingData = null;
    try {
        const module = await import('@/store/data/practice/language/english/reading/new_reading.json');
        readingData = module.default || module;
    } catch (error) {
        console.error('Failed to load IELTS reading data:', error);
    }

    if (!readingData) {
        return <NotFoundMessage title={'reading'} />;
    }

    const readingExercise = Array.isArray(readingData)
        ? readingData.find((exercise) => exercise.id === DEFAULT_READING_ID)
        : readingData?.id === DEFAULT_READING_ID ? readingData : null;

    if (!readingExercise) {
        return <NotFoundMessage title={'reading'} />;
    }

    return (
        <ReadingPage
            readingExercise={readingExercise}
            difficulty="ielts"
            id={String(DEFAULT_READING_ID)}
            nextHref="/mock/writing"
            uiVariant="mock-fullscreen-like"
        />
    );
}
