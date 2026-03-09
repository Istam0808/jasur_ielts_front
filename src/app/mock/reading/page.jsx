import ReadingPage from '../_components/ReadingPage';
import NotFoundMessage from '../_components/NotFoundMessage';
import { getMockById, isBackendUnavailableError } from '@/lib/mockApi';
import { adaptReading } from '@/lib/mockAdapters';

const DEFAULT_READING_ID = 1;

async function resolveMockId(searchParams) {
    const resolvedSearchParams = await searchParams;
    const value = resolvedSearchParams?.mockId;
    if (Array.isArray(value)) return Number(value[0]) || DEFAULT_READING_ID;
    return Number(value) || DEFAULT_READING_ID;
}

function shouldUseFallbackMessage(error) {
    return isBackendUnavailableError(error) || error?.status === 404;
}

export default async function MockReadingPage({ searchParams }) {
    const mockId = await resolveMockId(searchParams);
    let readingExercise = null;
    try {
        const mockDetail = await getMockById(mockId);
        readingExercise = adaptReading(mockDetail);
    } catch (error) {
        if (shouldUseFallbackMessage(error)) {
            const reason = error?.status === 404 ? 'mock or API not found (404)' : `temporarily unavailable (${error?.status || error?.code || 'unknown'})`;
            console.warn(`Reading mock backend ${reason}.`);
        } else {
            console.error('Failed to load backend reading mock:', error);
        }
    }

    if (!readingExercise) {
        return <NotFoundMessage title={'reading'} />;
    }

    return (
        <ReadingPage
            readingExercise={readingExercise}
            difficulty="ielts"
            id={String(mockId)}
            nextHref="/mock/writing"
            uiVariant="mock-fullscreen-like"
        />
    );
}
