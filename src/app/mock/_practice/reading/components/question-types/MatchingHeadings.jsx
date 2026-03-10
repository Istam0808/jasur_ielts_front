'use client';
import "../../styles/readingProcess.scss";

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import SelectOption from '@/components/common/input-types/SelectOption';
import CorrectAnswerInfo from '@/components/common/CorrectAnswerInfo';

const MatchingHeadings = ({ question, answer, onAnswerChange, isReviewMode, readingId, reviewMap }) => {
    const { t } = useTranslation('reading');
    
    const userAnswers = useMemo(() => {
        return answer || {};
    }, [answer]);

    // Безопасный список заголовков, устойчивый к разным форматам данных с бэкенда
    const headings = useMemo(() => {
        // Корректный массив строк в поле headings
        if (Array.isArray(question?.headings) && question.headings.length > 0) {
            return question.headings;
        }

        // Пытаемся собрать заголовки из options, если бэкенд кладёт их туда
        if (Array.isArray(question?.options) && question.options.length > 0) {
            return question.options
                .map((opt) => {
                    if (typeof opt === 'string') return opt;
                    return (
                        opt.heading || // { heading: "iv. Some text" }
                        opt.text ||    // { text: "iv. Some text" }
                        opt.label ||   // { label: "iv. Some text" }
                        opt.id ||      // { id: "iv. Some text" }
                        null
                    );
                })
                .filter(Boolean);
        }

        // Фолбэк — пустой массив, чтобы .map не падал
        return [];
    }, [question?.headings, question?.options]);

    // Get correct answers for review mode (external map for advanced; embedded for basic)
    const correctAnswers = useMemo(() => {
        if (!isReviewMode) return {};

        const sections = question.sections || [];

        // Try external review map if available
        if (readingId && reviewMap) {
            const map = {};
            for (let i = 0; i < sections.length; i++) {
                // Extract the section number from the section string (e.g., "27. Section A" -> "27")
                const sectionValue = typeof sections[i] === 'object' ? sections[i].section : sections[i];
                const sectionNumber = sectionValue.split('.')[0].trim();
                
                // Use the section number as the key to look up in reviewMap
                const correct = reviewMap[sectionNumber];
                if (correct) map[sectionValue] = correct;
            }
            // If found anything, return; otherwise fallback to embedded
            if (Object.keys(map).length > 0) return map;
        }

        // Fallback to embedded 'correct' on basic datasets
        const embedded = {};
        sections.forEach((s) => {
            if (typeof s === 'object' && s.section && s.correct) {
                embedded[s.section] = s.correct;
            }
        });
        return embedded;
    }, [isReviewMode, readingId, question.sections, reviewMap, question.id]);

    // Removed overall isCorrect summary calculation since per-question feedback is shown inline

    const handleHeadingChange = (section, headingId) => {
        if (isReviewMode) return;
        
        const newAnswers = { ...userAnswers, [section]: headingId };
        onAnswerChange(question.id, newAnswers);
    };

    const getSectionStatus = (section) => {
        const userHeading = userAnswers[section];
        
        if (!isReviewMode) {
            return { 
                isAnswered: !!userHeading,
                showFeedback: false,
                isCorrect: false
            };
        }
        
        // In review mode, check if the user's answer is correct
        const correctHeading = correctAnswers[section];
        const isCorrect = correctHeading ? (userHeading === correctHeading) : false;
        const showFeedback = Boolean(correctHeading);
        
        return {
            isAnswered: !!userHeading,
            showFeedback,
            isCorrect: isCorrect,
            correctHeading: correctHeading
        };
    };

    const getHeadingText = (headingId) => {
        if (!Array.isArray(headings) || headings.length === 0) {
            return headingId;
        }

        // Найти заголовок, начинающийся с идентификатора (A., iii. и т.п.)
        const heading = headings.find(
            (h) => typeof h === 'string' && h.startsWith(`${headingId}.`)
        );
        if (heading) {
            return heading;
        }
        return headingId;
    };

    return (
        <div className="matching-headings-container">
            <div className="question-instruction">
                <p className="instruction-text">{question.instruction}</p>
                <p className="note-text">{t('matchingHeadings.note')}</p>
            </div>

            <div className="headings-list">
                <h4 className="headings-title">{t('listOfHeadings')}:</h4>
                <div className="headings-grid">
                    {headings.length === 0 ? (
                        <p className="no-headings-warning">
                            {t('matchingHeadings.noHeadings', 'No headings data available for this question.')}
                        </p>
                    ) : (
                        headings.map((heading, idx) => (
                            <div key={idx} className="heading-item">
                                <span className="heading-id">
                                    {typeof heading === 'string'
                                        ? `${heading.split('.')[0]}.`
                                        : ''}
                                </span>
                                <span className="heading-text">
                                    {typeof heading === 'string'
                                        ? heading.split('.').slice(1).join('.').trim()
                                        : String(heading)}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="sections-container">
                {question.sections.map((section, idx) => {
                    // Handle both old structure (object with section property) and new structure (simple string)
                    const sectionValue = typeof section === 'object' ? section.section : section;
                    const sectionStatus = getSectionStatus(sectionValue);
                    const selectedHeading = userAnswers[sectionValue];
                    
                    return (
                        <div 
                            key={idx} 
                            className={`section-item ${sectionStatus.isAnswered ? 'answered' : 'unanswered'} ${
                                sectionStatus.showFeedback ? (sectionStatus.isCorrect ? 'correct' : 'incorrect') : ''
                            } ${isReviewMode ? 'review-mode' : ''}`}
                        >
                            <div className="section-header">
                                <span className="section-number">{sectionValue.slice(0, sectionValue.indexOf("."))}.</span>
                                <span className="section-label">{sectionValue.slice(sectionValue.indexOf(".") + 1)}</span>
                                {sectionStatus.showFeedback && (
                                    <span className={`feedback-icon ${sectionStatus.isCorrect ? 'correct' : 'incorrect'}`}>
                                        {sectionStatus.isCorrect ? '✓' : '✗'}
                                    </span>
                                )}
                            </div>
                            
                            <div className="heading-selector">
                                <SelectOption
                                  options={headings.map((h) => {
                                      const raw = typeof h === 'string' ? h : String(h);
                                      const id = raw.split('.')[0];
                                      return {
                                          value: id,
                                          label: raw,
                                          disabled: raw.startsWith('EXAMPLE')
                                      };
                                  })}
                                  value={selectedHeading || null}
                                  onChange={(val) => handleHeadingChange(sectionValue, val || '')}
                                  placeholder={t('selectHeading')}
                                  disabled={isReviewMode}
                                />
                            </div>

                            {sectionStatus.showFeedback && !sectionStatus.isCorrect && sectionStatus.correctHeading && (
                                <CorrectAnswerInfo
                                  label={t('correctAnswer') + ':'}
                                  value={getHeadingText(sectionStatus.correctHeading)}
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Removed per-question ReviewModeSummary to avoid duplicate summary */}
        </div>
    );
};

export default MatchingHeadings; 