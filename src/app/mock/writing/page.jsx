import WritingPage from '../_components/WritingPage';
import NotFoundMessage from '../_components/NotFoundMessage';

const DEFAULT_WRITING_ID = 1;

export default async function MockWritingPage() {
    try {
        const WritingsJSON = await import('@/store/data/practice/language/english/writing/c2.json');
        const writingExercise = WritingsJSON.default.find((exercise) => exercise.id === DEFAULT_WRITING_ID);

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
        console.error('Failed to load IELTS writing data:', error);
        return <NotFoundMessage title={'writing'} />;
    }
}
