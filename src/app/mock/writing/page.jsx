import WritingPage from '../_components/WritingPage';
import NotFoundMessage from '../_components/NotFoundMessage';
import { getMockById, isBackendUnavailableError } from '@/lib/mockApi';
import { adaptWriting } from '@/lib/mockAdapters';

const DEFAULT_WRITING_ID = 1;
const DEFAULT_MOCK_ID = 1;

async function resolveMockId(searchParams) {
    const resolvedSearchParams = await searchParams;
    const value = resolvedSearchParams?.mockId;
    if (Array.isArray(value)) return Number(value[0]) || DEFAULT_MOCK_ID;
    return Number(value) || DEFAULT_MOCK_ID;
}

export default async function MockWritingPage({ searchParams }) {
    const mockId = await resolveMockId(searchParams);
    try {
        const mockDetail = await getMockById(mockId);
        const writingExercise = adaptWriting(mockDetail);

        if (!writingExercise) {
            return <NotFoundMessage title={'writing'} />;
        }

        return (
            <WritingPage
                writingExercise={writingExercise}
                difficulty="ielts"
                id={String(DEFAULT_WRITING_ID)}
                startScreenVariant="ieltsAcademic"
            />
        );
    } catch (error) {
        if (isBackendUnavailableError(error)) {
            console.warn(`Writing mock backend is temporarily unavailable (${error?.status || error?.code || 'unknown'})`);
        } else {
            console.error('Failed to load backend writing mock:', error);
        }
        return <NotFoundMessage title={'writing'} />;
    }
}
