'use client';
import { useTranslation } from 'react-i18next';
import { BsCheckCircleFill, BsCircle, BsCheckLg } from 'react-icons/bs';
import { FaCheckCircle, FaRegCircle } from 'react-icons/fa';
import '../styles/PassageNavigation.scss';

// Utility function to check if an answer exists (consistent with Question component logic)
const hasValidAnswer = (answer, question) => {
    // Handle undefined, null, or empty string
    if (answer === undefined || answer === null || answer === '') {
        return false;
    }
    
    // If no question provided, fall back to basic check
    if (!question) {
        if (Array.isArray(answer)) {
            return answer.length > 0;
        }
        if (typeof answer === 'object' && answer !== null) {
            return Object.values(answer).some(val => val !== undefined && val !== null && val !== '');
        }
        return true;
    }
    
    // Use the same logic as Question component's hasAnswer calculation
    if (question.type === 'short_answer') {
        // Check if this is a multi-question short answer
        if (question.instruction && question.questions && Array.isArray(question.questions)) {
            // For multi-question short answers, check if ALL sub-questions have been answered
            if (typeof answer === 'object' && answer !== null) {
                const requiredQuestions = question.questions.length;
                const answeredQuestions = Object.values(answer).filter(val => val && val.trim() !== '').length;
                return answeredQuestions === requiredQuestions;
            }
            return false;
        } else {
            // Single question short answer
            return !!answer;
        }
    }
    
    const basicTypes = ['multiple_choice', 'true_false'];
    
    if (basicTypes.includes(question.type)) {
        return !!answer;
    } else if (question.type === 'multiple_choice_multiple') {
        // For multiple choice multiple, check if user selected the required number of answers
        if (Array.isArray(answer)) {
            // First try to get from correct properties in options
            const correctFromOptions = question.options?.filter(opt => opt.correct)?.length;
            if (correctFromOptions > 0) {
                return answer.length === correctFromOptions;
            }
            // If no correct properties, try to parse from instruction
            if (question.instruction) {
                const match = question.instruction.match(/(?:Choose\s+)?(\w+)\s+(?:letters?|answers?|options?)/i);
                if (match) {
                    const numberWord = match[1].toLowerCase();
                    const numberMap = {
                        'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 
                        'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
                    };
                    const parsedNumber = numberMap[numberWord] || parseInt(numberWord);
                    if (parsedNumber && !isNaN(parsedNumber)) {
                        return answer.length === parsedNumber;
                    }
                }
            }
            // Default fallback
            return answer.length >= 1;
        }
        return false;
    } else if (question.type === 'matching_headings') {
        // For matching headings, check if ALL sections have been answered
        if (typeof answer === 'object' && answer !== null && question.sections) {
            const requiredSections = question.sections.length;
            const answeredSections = Object.values(answer).filter(val => val && val !== '').length;
            return answeredSections === requiredSections;
        }
        return false;
    } else if (question.type === 'matching_information') {
        // For matching information, check if ALL information items have been answered
        if (typeof answer === 'object' && answer !== null && question.information) {
            const requiredItems = question.information.length;
            const answeredItems = Object.values(answer).filter(val => val && val !== '').length;
            return answeredItems === requiredItems;
        }
        return false;
    } else if (question.type === 'matching_people') {
        if (typeof answer === 'object' && answer !== null && question.statements) {
            const requiredItems = question.statements.length;
            const answeredItems = Object.values(answer).filter(val => val && val !== '').length;
            return answeredItems === requiredItems;
        }
        return false;
    } else if (question.type === 'matching_features') {
        // For matching features, check if ALL features have been answered
        if (typeof answer === 'object' && answer !== null && question.features) {
            const requiredFeatures = question.features.length;
            const answeredFeatures = Object.values(answer).filter(val => val && val !== '').length;
            return answeredFeatures === requiredFeatures;
        }
        return false;
    } else if (question.type === 'sentence_completion') {
        // For sentence completion, check if ALL sentences have been completed
        if (typeof answer === 'object' && answer !== null && question.sentences) {
            const requiredSentences = question.sentences.length;
            const answeredSentences = Object.values(answer).filter(val => val && val !== '').length;
            return answeredSentences === requiredSentences;
        }
        return false;
    } else if (question.type === 'diagram_labelling') {
        // For diagram labelling, check if ALL labels have been filled
        if (typeof answer === 'object' && answer !== null && question.labels) {
            const requiredLabels = question.labels.length;
            const providedAnswers = Object.values(answer).filter(val => val && val !== '').length;
            return providedAnswers === requiredLabels;
        }
        return false;
    } else if (question.type === 'table_completion') {
        // For table completion, count blanks from table rows
        if (typeof answer === 'object' && answer !== null && question.table && question.table.rows) {
            let totalBlanks = 0;
            question.table.rows.forEach(row => {
                Object.values(row).forEach(cell => {
                    if (cell && cell.includes('___')) {
                        totalBlanks++;
                    }
                });
            });
            const providedAnswers = Object.values(answer).filter(val => val && val.trim() !== '').length;
            return providedAnswers === totalBlanks;
        }
        return false;
    } else if (question.type === 'flow_chart_completion') {
        // For flow chart completion, count blanks from flow_chart content
        if (typeof answer === 'object' && answer !== null && question.flow_chart) {
            let totalBlanks = 0;
            if (question.flow_chart.type === 'vertical' && question.flow_chart.steps) {
                // New vertical format: count blanks from steps
                question.flow_chart.steps.forEach(step => {
                    if (step.blank) totalBlanks++;
                    if (step.blank2) totalBlanks++;
                });
            } else if (typeof question.flow_chart === 'string') {
                // Legacy string format: use regex matching
                const blankMatches = question.flow_chart.match(/___(\d+)___/g) || [];
                totalBlanks = blankMatches.length;
            }
            const providedAnswers = Object.values(answer).filter(val => val && val.trim() !== '').length;
            return providedAnswers === totalBlanks;
        }
        return false;
    } else if (question.type === 'summary_completion') {
        // For summary completion, check if ALL blanks have been filled
        if (typeof answer === 'object' && answer !== null && question.summary) {
            const blankMatches = question.summary.match(/___(\d+)___/g) || [];
            const requiredBlanks = blankMatches.length;
            const providedAnswers = Object.values(answer).filter(val => val && val.trim() !== '').length;
            return providedAnswers === requiredBlanks;
        }
        return false;
    } else if (question.type === 'note_completion') {
        // For note completion, check if ALL blanks have been filled
        if (typeof answer === 'object' && answer !== null && question.notes) {
            let requiredBlanks = 0;
            question.notes.forEach((note) => {
                // Handle both formats: ___NUMBER___ and NUMBER..........
                const blankMatches = note.match(/(?:___(\d+)___|(\d+)\.{2,})/g) || [];
                requiredBlanks += blankMatches.length;
            });
            const providedAnswers = Object.values(answer).filter(val => val && val.trim() !== '').length;
            return providedAnswers === requiredBlanks;
        }
        return false;
    } else if (question.type === 'true_false_not_given' || question.type === 'yes_no_not_given') {
        return !!answer;
    } else {
        // For other complex types, check if any answers exist (fallback)
        if (typeof answer === 'object' && answer !== null) {
            return Object.values(answer).some(val => val !== undefined && val !== null && val !== '');
        } else if (Array.isArray(answer)) {
            return answer.length > 0;
        }
        return !!answer;
    }
};

const PassageNavigation = ({
    passages,
    activePassageId,
    onPassageChange,
    userAnswers,
    isReviewMode
}) => {
    const { t } = useTranslation('reading');

    // Calculate completion status for each passage
    const getPassageCompletionStatus = (passage) => {
        if (!passage.questions) {
            return { answered: 0, total: 0, percentage: 0 };
        }

        const totalQuestions = passage.questions.length;
        const answeredQuestions = passage.questions.filter(q => {
            const answer = userAnswers[q.id];
            return hasValidAnswer(answer, q);
        }).length;

        const percentage = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

        return {
            answered: answeredQuestions,
            total: totalQuestions,
            percentage: percentage
        };
    };

    const getPassageQuestionRange = (passage) => {
        if (!passage.questions || passage.questions.length === 0) return '';
        const firstQ = Math.min(...passage.questions.map(q => q.id));
        const lastQ = Math.max(...passage.questions.map(q => q.id));
        return firstQ === lastQ ? `${firstQ}` : `${firstQ}-${lastQ}`;
    };

    // Early return if no passages
    if (!passages || passages.length === 0) {
        return null;
    }

    return (
        <div className="passage-navigation">
            <div className="passage-tabs">
                {passages.map((passage, index) => {
                    const completionStatus = getPassageCompletionStatus(passage);
                    const isActive = passage.passage_id === activePassageId;
                    const questionRange = getPassageQuestionRange(passage);

                    return (
                        <button
                            key={passage.passage_id}
                            className={`passage-tab ${isActive ? 'active' : ''} ${completionStatus.percentage === 100 ? 'completed' :
                                    completionStatus.percentage > 0 ? 'partial' : 'incomplete'
                                } ${isReviewMode ? 'review-mode' : ''}`}
                            onClick={() => onPassageChange(passage.passage_id)}
                            disabled={false}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="passage-tab-header">
                                <div className="passage-number">
                                    <span className="passage-num">{passage.passage_id}</span>
                                    <span className="passage-label">{t('passage')}</span>
                                </div>
                                <div className="completion-icon">
                                    {completionStatus.percentage === 100 ? (
                                        <FaCheckCircle className="check-icon completed" />
                                    ) : (
                                        <FaRegCircle className="check-icon incomplete" />
                                    )}
                                </div>
                            </div>

                            <div className="passage-info">
                                <h4 className="passage-title">{passage.title}</h4>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default PassageNavigation;