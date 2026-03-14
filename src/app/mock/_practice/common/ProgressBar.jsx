import { useTranslation } from 'react-i18next';
import {
    getQuestionAnswerCount,
    isSpecificSlotAnswered,
    isSpecificSlotCorrect
} from '../reading/helpers/questionUtils';
import './ProgressBar.scss';

const ProgressBar = ({ 
    answered, 
    total, 
    userAnswers = {}, 
    onQuestionClick, 
    questions = [], 
    currentPassageId = null, 
    passageData = null,
    passageNavigation = null,
    // review mode context
    isReviewMode = false,
    readingId = null,
    difficulty = null,
    reviewMap = null,
    isMockFullscreenLike = false
}) => {
    const { t } = useTranslation('reading');

    // Create individual answer slots for navigation
    const individualAnswerSlots = [];
    let sequentialIndex = 1;
    
    if (questions.length > 0) {
        questions.forEach(question => {
            const answerCount = getQuestionAnswerCount(question);
            for (let i = 0; i < answerCount; i++) {
                individualAnswerSlots.push({
                    sequentialNumber: sequentialIndex++,
                    questionId: question.id,
                    questionType: question.type,
                    answerIndex: i,
                    question: question
                });
            }
        });
        
        // Add placeholder slots if total indicates more answers should exist
        while (individualAnswerSlots.length < total) {
            individualAnswerSlots.push({
                sequentialNumber: individualAnswerSlots.length + 1,
                questionId: -1, // Placeholder for missing question
                questionType: 'placeholder',
                answerIndex: 0,
                question: null
            });
        }
    } else {
        // Fallback for when questions array is empty
        for (let i = 0; i < total; i++) {
            individualAnswerSlots.push({
                sequentialNumber: i + 1,
                questionId: i + 1,
                questionType: 'unknown',
                answerIndex: 0,
                question: null
            });
        }
    }

    // Handle question number click (using actual question ID and answer slot info)
    const handleQuestionClick = (answerSlot) => {
        if (!onQuestionClick || answerSlot.questionId === -1) return;
        onQuestionClick(answerSlot);
    };

    // Handle keyboard navigation
    const handleKeyDown = (event, answerSlot) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleQuestionClick(answerSlot);
        }
    };

    // Determine which passage a question belongs to (for multi-passage tests)
    const getQuestionPassageInfo = (actualQuestionId) => {
        if (!passageData || !currentPassageId) return { passageId: null, isCurrentPassage: true };
        
        for (const passage of passageData) {
            if (passage.questions?.some(q => q.id === actualQuestionId)) {
                return {
                    passageId: passage.passage_id,
                    isCurrentPassage: passage.passage_id === currentPassageId,
                    passageTitle: passage.title
                };
            }
        }
        return { passageId: null, isCurrentPassage: true };
    };

    // Calculate actual total excluding placeholders
    const actualTotal = individualAnswerSlots.filter(slot => slot.questionId !== -1).length;
    
    return (
        <div className={`progress-container ${isMockFullscreenLike ? 'mock-fullscreen-like' : ''}`}>
            {passageNavigation ? (
                <div className="progress-header">
                    {passageNavigation}
                </div>
            ) : (
                <div className="progress-header">
                    <span className="progress-text">{answered} / {actualTotal} {t('answers', 'answers')}</span>
                    {passageData && currentPassageId && (
                        <span className="current-passage-indicator">
                            {t('currentPassage', 'Current Passage')}: {currentPassageId}
                        </span>
                    )}
                </div>
            )}
            
            {/* Answer Numbers Only */}
            <div className="question-numbers-container">
                <div className={`question-numbers ${isMockFullscreenLike ? 'mock-fullscreen-like' : ''}`}>
                    {individualAnswerSlots.map((answerSlot) => {
                        const { sequentialNumber, questionId, question } = answerSlot;
                        
                        // Handle placeholder slots for missing questions
                        if (questionId === -1) {
                            return (
                                <button
                                    key={`placeholder-${sequentialNumber}`}
                                    className="question-number unanswered placeholder"
                                    disabled={true}
                                    title={`Answer ${sequentialNumber} - ${t('notAvailable', 'Not available')}`}
                                    type="button"
                                >
                                    {sequentialNumber}
                                </button>
                            );
                        }
                        
                        const userAnswer = userAnswers[questionId];
                        
                        // Check if this specific individual answer is provided
                        let isAnswered = false;
                        
                        if (question && userAnswer) {
                            isAnswered = isSpecificSlotAnswered(userAnswer, question, answerSlot);
                        }
                        
                        const passageInfo = getQuestionPassageInfo(questionId);

                        // Review-mode correctness
                        let reviewClass = '';
                        if (isReviewMode && question) {
                            const rid = ['b2','c1','c2'].includes((difficulty || '').toLowerCase()) ? readingId : null;
                            const isCorrect = isSpecificSlotCorrect(userAnswer, question, answerSlot, rid, reviewMap);
                            reviewClass = isAnswered ? (isCorrect ? 'correct' : 'incorrect') : '';
                        }
                        
                        return (
                            <button
                                key={`answer-${sequentialNumber}`}
                                className={`question-number ${isAnswered ? 'answered' : 'unanswered'} ${passageInfo.isCurrentPassage ? 'current-passage' : 'other-passage'} ${passageInfo.passageId ? `passage-${passageInfo.passageId}` : ''} ${reviewClass}`}
                                title={`Answer ${sequentialNumber} (Question ${questionId}) - ${isAnswered ? t('completed') : t('unanswered')}${passageInfo.passageId ? ` (Passage ${passageInfo.passageId})` : ''}`}
                                onClick={() => handleQuestionClick(answerSlot)}
                                onKeyDown={(e) => handleKeyDown(e, answerSlot)}
                                aria-label={t('answerNavigation', { 
                                    status: isAnswered ? t('completed') : t('unanswered'), 
                                    number: sequentialNumber,
                                    questionNumber: questionId
                                })}
                                type="button"
                            >
                                {sequentialNumber}
                                {isAnswered && (
                                    <span className="checkmark" aria-hidden="true">✓</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ProgressBar;