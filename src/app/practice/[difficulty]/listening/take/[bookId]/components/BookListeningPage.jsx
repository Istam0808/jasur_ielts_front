"use client";

import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { FiClock, FiList, FiAlertTriangle } from 'react-icons/fi';
import Spinner from '@/components/common/spinner';
import Link from 'next/link';
import { IoMdArrowBack } from 'react-icons/io';
import styles from './BookListeningPage.module.scss';
import Modal from '@/components/common/Modal';


const BookListeningPage = ({ bookData, bookId, bookTitle }) => {
    // Initialize i18next with explicit namespaces
    const { t, i18n } = useTranslation(['listening', 'common']);
    const router = useRouter();
    const { difficulty } = useParams();

    const [isLoading, setIsLoading] = useState(true);
    const [showReadyModal, setShowReadyModal] = useState(false);
    const [pendingTest, setPendingTest] = useState(null);

    // Make sure translations are loaded
    useEffect(() => {
        const loadNamespaces = async () => {
            if (!i18n.hasResourceBundle(i18n.language, 'listening') ||
                !i18n.hasResourceBundle(i18n.language, 'common')) {
                await i18n.loadNamespaces(['listening', 'common']);
            }
        };

        loadNamespaces();
    }, [i18n]);

    // Calculate test statistics and data structure
    const isDifficultyBook = Array.isArray(bookData);
    const testsData = isDifficultyBook ? bookData : (bookData.tests || []);

    useEffect(() => {
        setIsLoading(false);
    }, [bookData]);

    const askReady = (test) => {
        let partCount = 0;
        let totalQuestionCount = 0;

        if (isDifficultyBook) {
            // Difficulty books have multiple choice and true/false sections
            partCount = 2; // Multiple choice + True/False
            totalQuestionCount = (test.multiple_choice?.length || 0) + (test.trueFalse?.length || 0);
        } else {
            // Cambridge books have parts structure
            partCount = test.parts?.length || 0;
            totalQuestionCount = test.parts?.reduce((total, part) => {
                let partQuestionCount = 0;
                if (part.sections && part.sections.length > 0) {
                    partQuestionCount = part.sections.reduce((sectionTotal, section) => {
                        let count = 0;
                        if (Array.isArray(section.questions)) {
                            count = section.questions.length;
                        } else {
                            const rangeStr = section.questionRange || (typeof section.questions === 'string' && section.questions.includes('-') ? section.questions : null);
                            if (rangeStr) {
                                const rangeParts = rangeStr.split('-');
                                if (rangeParts.length === 2) {
                                    count = parseInt(rangeParts[1], 10) - parseInt(rangeParts[0], 10) + 1;
                                }
                            }
                        }
                        return sectionTotal + (isNaN(count) ? 0 : count);
                    }, 0);
                } else if (Array.isArray(part.questions)) {
                    partQuestionCount = part.questions.length;
                }
                return total + partQuestionCount;
            }, 0) || 0;
        }

        setPendingTest({ id: test.id, name: test.name || test.title, partCount, totalQuestionCount });
        setShowReadyModal(true);
    };

    const handleConfirmStart = () => {
        if (pendingTest) {
            const routePath = `/subjects/languages/english/practice/${difficulty}/listening/take/${bookId}/test/${pendingTest.id}`;
            setShowReadyModal(false);
            router.push(routePath);
        }
    };

    const handleCancelStart = () => {
        setShowReadyModal(false);
        setPendingTest(null);
    };

    if (isLoading) {
        return (
            <div className={`${styles.ieltsSection} ${styles.loading}`} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '300px',
                gap: '1rem'
            }}>
                <Spinner />
            </div>
        );
    }

    return (
        <div className={styles.ieltsSection}>
            <div className={styles.bookHeader}>
                <div className={styles.backButtonContainer}>
                    <Link
                        href={`/subjects/languages/english/practice/${difficulty}`}
                        className={styles.backLink}
                        aria-label={t('common:back', 'Go back')}
                    >
                        <IoMdArrowBack />
                    </Link>
                </div>
                <h1 className={styles.sectionTitle}>{bookTitle}</h1>
            </div>

            <div className={styles.ieltsInfo}>
                <h2>{t('bookOverview')}</h2>
                <p>
                    {t('bookDescription', {
                        book: bookTitle
                    })}
                </p>
                
                <div className={styles.integratedStats}>
                    <div className={styles.statItem}>
                        <div className={styles.statIconWrapper}>
                            <FiList className={styles.statIcon} />
                        </div>
                        <div className={styles.statContent}>
                            <span className={styles.statValue}>{testsData.length}</span>
                            <span className={styles.statLabel}>
                                {testsData.length === 1 ?
                                    t('test') :
                                    t('tests')}
                            </span>
                        </div>
                    </div>
                    
                    <div className={styles.statItem}>
                        <div className={styles.statIconWrapper}>
                            <FiClock className={styles.statIcon} />
                        </div>
                        <div className={styles.statContent}>
                            <span className={styles.statValue}>
                                ~{isDifficultyBook ? 
                                    testsData.length * 10 : // Difficulty books: ~10 min per test
                                    (testsData.reduce((total, test) => total + (test.parts?.length || 0), 0) * 10) // Cambridge: ~10 min per part
                                }
                            </span>
                            <span className={styles.statLabel}>
                                {t('minutes')}
                            </span>
                        </div>
                    </div>
                    
                    <div className={styles.statItem}>
                        <div className={styles.statIconWrapper}>
                            <svg className={styles.statIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                        </div>
                        <div className={styles.statContent}>
                            <span className={styles.statValue}>
                                {isDifficultyBook ? 
                                    testsData.reduce((total, test) => {
                                        return total + (test.multiple_choice?.length || 0) + (test.trueFalse?.length || 0);
                                    }, 0) :
                                    testsData.reduce((total, test) => {
                                        return total + (test.parts?.reduce((partTotal, part) => {
                                            if (part.sections && part.sections.length > 0) {
                                                return partTotal + part.sections.reduce((sectionTotal, section) => {
                                                    let count = 0;
                                                    if (Array.isArray(section.questions)) {
                                                        count = section.questions.length;
                                                    } else {
                                                        const rangeStr = section.questionRange || (typeof section.questions === 'string' && section.questions.includes('-') ? section.questions : null);
                                                        if (rangeStr) {
                                                            const rangeParts = rangeStr.split('-');
                                                            if (rangeParts.length === 2) {
                                                                count = parseInt(rangeParts[1], 10) - parseInt(rangeParts[0], 10) + 1;
                                                            }
                                                        }
                                                    }
                                                    return sectionTotal + (isNaN(count) ? 0 : count);
                                                }, 0);
                                            } else if (Array.isArray(part.questions)) {
                                                return partTotal + part.questions.length;
                                            }
                                            return partTotal;
                                        }, 0) || 0);
                                    }, 0)
                                }
                            </span>
                            <span className={styles.statLabel}>
                                {t('questions')}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.ieltsTopicsList}>
                <div className={styles.topicsHeader}>
                    <h2 className={styles.topicsTitle}>
                        {t('availableTests')}
                    </h2>
                    <div className={styles.topicsCount}>
                        {testsData.length} {t('testsAvailable')}
                    </div>
                </div>

                {/* List of tests */}
                {testsData.map((test, testIndex) => {
                    const testId = test.id;
                    let partCount = 0;
                    let totalQuestionCount = 0;

                    if (isDifficultyBook) {
                        // Difficulty books have multiple choice and true/false sections
                        partCount = 2; // Multiple choice + True/False
                        totalQuestionCount = (test.multiple_choice?.length || 0) + (test.trueFalse?.length || 0);
                    } else {
                        // Cambridge books have parts structure
                        partCount = test.parts?.length || 0;
                        totalQuestionCount = test.parts?.reduce((total, part) => {
                            let partQuestionCount = 0;
                            if (part.sections && part.sections.length > 0) {
                                partQuestionCount = part.sections.reduce((sectionTotal, section) => {
                                    let count = 0;
                                    if (Array.isArray(section.questions)) {
                                        count = section.questions.length;
                                    } else {
                                        const rangeStr = section.questionRange || (typeof section.questions === 'string' && section.questions.includes('-') ? section.questions : null);
                                        if (rangeStr) {
                                            const rangeParts = rangeStr.split('-');
                                            if (rangeParts.length === 2) {
                                                count = parseInt(rangeParts[1], 10) - parseInt(rangeParts[0], 10) + 1;
                                            }
                                        }
                                    }
                                    return sectionTotal + (isNaN(count) ? 0 : count);
                                }, 0);
                            } else if (Array.isArray(part.questions)) {
                                partQuestionCount = part.questions.length;
                            }
                            return total + partQuestionCount;
                        }, 0) || 0;
                    }

                    return (
                        <div
                            key={`test-${testId}`}
                            className={styles.ieltsTopicItem}
                            onClick={() => askReady(test)}
                        >
                            <div className={styles.topicCard}>
                                <div className={styles.topicBadgeContainer}>
                                    <span className={styles.topicBadge}>{testIndex + 1}</span>
                                </div>

                                <div className={styles.topicContent}>
                                    <h3 className={styles.topicTitle}>
                                        {test.name || test.title || t('defaultTestName', {
                                            number: testIndex + 1
                                        })}
                                    </h3>
                                    <p className={styles.topicDescription}>
                                        {t('testDescription', {
                                            partCount,
                                            questionCount: totalQuestionCount
                                        })}
                                    </p>
                                    <div className={styles.topicMeta}>
                                        <span className={styles.metaBadge}>
                                            <FiList /> {partCount} {t('parts')}
                                        </span>
                                        <span className={styles.metaBadge}>
                                            <FiList /> {totalQuestionCount} {t('questions')}
                                        </span>
                                        <span className={styles.metaBadge}>
                                            <FiClock /> ~{isDifficultyBook ? 10 : partCount * 10} {t('minutes')}
                                        </span>
                                    </div>
                                </div>

                                <div className={styles.topicArrowContainer}>
                                    <div className={styles.topicArrowCircle}>
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={styles.arrowSvg}>
                                            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6-6-6z"></path>
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            {showReadyModal && pendingTest && (
                <Modal
                    onClose={handleCancelStart}
                    padding={false}
                >
                    <div className={styles.modalHeader}>
                        <div className={styles.iconContainer}>
                            <FiAlertTriangle className={styles.modalIcon} />
                        </div>
                        <h2 className={styles.modalTitle}>
                            {t('modal.readyToStart')}
                        </h2>
                    </div>

                    <div className={styles.modalBody}>
                        <div className={styles.testDetails}>
                            <h3 className={styles.testName}>
                                {pendingTest.name || t('defaultTestName', { number: pendingTest.id })}
                            </h3>
                            
                            <div className={styles.statsContainer}>
                                <div className={styles.statItem}>
                                    <FiList className={styles.statIcon} />
                                    <span className={styles.statLabel}>{t('parts')}</span>
                                    <span className={styles.statValue}>{pendingTest.partCount}</span>
                                </div>
                                <div className={styles.statItem}>
                                    <FiList className={styles.statIcon} />
                                    <span className={styles.statLabel}>{t('questions')}</span>
                                    <span className={styles.statValue}>{pendingTest.totalQuestionCount}</span>
                                </div>
                                <div className={styles.statItem}>
                                    <FiClock className={styles.statIcon} />
                                    <span className={styles.statLabel}>{t('minutes')}</span>
                                    <span className={styles.statValue}>~{isDifficultyBook ? 10 : pendingTest.partCount * 10}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.modalActions}>
                        <button 
                            className="btn btn-outline btn-sm"
                            onClick={handleCancelStart}
                        >
                            {t('modal.cancel')}
                        </button>
                        <button 
                            className="btn btn-success btn-sm"
                            onClick={handleConfirmStart}
                        >
                            {t('modal.startTest')}
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default BookListeningPage; 