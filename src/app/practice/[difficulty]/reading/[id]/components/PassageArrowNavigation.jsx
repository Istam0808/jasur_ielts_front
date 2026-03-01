'use client';
import { useTranslation } from 'react-i18next';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';
import '../styles/PassageArrowNavigation.scss';

const PassageArrowNavigation = ({
    passages,
    activePassageId,
    onPassageChange,
    userAnswers,
    isReviewMode
}) => {
    const { t } = useTranslation('reading');

    // Early return if no passages or single passage
    if (!passages || passages.length <= 1) {
        return null;
    }

    const currentIndex = passages.findIndex(p => p.passage_id === activePassageId);
    const isFirstPassage = currentIndex === 0;
    const isLastPassage = currentIndex === passages.length - 1;

    // Enhanced passage change handler with scroll-to-top functionality
    const handlePassageChange = (newPassageId) => {
        // Call the original passage change handler
        onPassageChange(newPassageId);
        
        // Scroll both passage and questions sections to top
        setTimeout(() => {
            // Check if we're on mobile
            const isMobile = window.innerWidth <= 784;
            
            // Scroll passage content to top
            const passageContent = document.querySelector('.passage-content');
            if (passageContent) {
                passageContent.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }

            // Scroll questions content to top
            const questionsContent = document.querySelector('.questions-content');
            if (questionsContent) {
                questionsContent.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }

            // Also scroll the questions section container if it exists
            const questionsSection = document.querySelector('.questions-section');
            if (questionsSection) {
                questionsSection.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }

            // For fullscreen mode, scroll the fullscreen questions section
            const fullscreenQuestions = document.querySelector('.fullscreen-questions');
            if (fullscreenQuestions) {
                fullscreenQuestions.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }

            // Scroll to the first question dot of the current passage in fullscreen mode
            const fullscreenProgressBar = document.querySelector('.fullscreen-progress-bar .question-dots');
            if (fullscreenProgressBar) {
                // Find the current passage's first question
                const currentPassage = passages.find(p => p.passage_id === newPassageId);
                if (currentPassage?.questions?.length > 0) {
                    const firstQuestionId = currentPassage.questions[0].id;
                    const questionDots = fullscreenProgressBar.querySelectorAll('.question-dot');
                    let targetDot = null;

                    for (const dot of questionDots) {
                        const questionId = parseInt(dot.getAttribute('data-question-id'));
                        if (questionId === firstQuestionId) {
                            targetDot = dot;
                            break;
                        }
                    }

                    if (targetDot) {
                        // Calculate the scroll position to center the target dot
                        const containerRect = fullscreenProgressBar.getBoundingClientRect();
                        const dotRect = targetDot.getBoundingClientRect();
                        const scrollLeft = targetDot.offsetLeft - (containerRect.width / 2) + (dotRect.width / 2);

                        // Scroll to the target dot with smooth behavior
                        fullscreenProgressBar.scrollTo({
                            left: Math.max(0, scrollLeft),
                            behavior: 'smooth'
                        });
                    }
                }
            }

            // For mobile devices, scroll to the very top of the reading task
            if (isMobile) {
                // Scroll to the top of the reading container
                const readingContainer = document.querySelector('.reading-container');
                if (readingContainer) {
                    readingContainer.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }

                // Also scroll the window to the top for mobile
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });

                // Scroll the main content area to top
                const mainContent = document.querySelector('.reading-content');
                if (mainContent) {
                    mainContent.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });
                }

                // Scroll the passage section to top
                const passageSection = document.querySelector('.passage-section');
                if (passageSection) {
                    passageSection.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });
                }
            }
        }, 100); // Small delay to ensure the passage change has been processed
    };

    const handlePreviousPassage = () => {
        if (!isFirstPassage) {
            handlePassageChange(passages[currentIndex - 1].passage_id);
        }
    };

    const handleNextPassage = () => {
        if (!isLastPassage) {
            handlePassageChange(passages[currentIndex + 1].passage_id);
        }
    };

    return (
        <div className="passage-arrow-navigation">
            <div className="passage-nav-right">
                <button
                    className={`nav-arrow nav-arrow-left ${isFirstPassage ? 'disabled' : ''}`}
                    onClick={handlePreviousPassage}
                    disabled={isFirstPassage}
                    aria-label={t('previousPassage')}
                    title={t('previousPassage')}
                >
                    <IoChevronBack size={24} />
                </button>
                <button
                    className={`nav-arrow nav-arrow-right ${isLastPassage ? 'disabled' : ''}`}
                    onClick={handleNextPassage}
                    disabled={isLastPassage}
                    aria-label={t('nextPassage')}
                    title={t('nextPassage')}
                >
                    <IoChevronForward size={24} />
                </button>
            </div>
        </div>
    );
};

export default PassageArrowNavigation; 