'use client';
import "../../styles/readingProcess.scss";

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { checkAnswerVariants } from '@/utils/answerChecker';
import CorrectAnswerInfo from '@/components/common/CorrectAnswerInfo';
import { MdAccountTree, MdTimeline } from 'react-icons/md';
import InlineGapFilling from '@/components/common/input-types/InlineGapFilling';
import KeyValueTable from '@/components/common/input-types/KeyValueTable';
import DiagramLabels from '@/components/common/input-types/DiagramLabels';
import React from 'react'; // Added missing import for React

const CompletionQuestion = ({ question, answer, onAnswerChange, isReviewMode, readingId, difficulty, reviewMap }) => {
    const { t } = useTranslation('reading');
    
    const userAnswers = useMemo(() => {
        return answer || {};
    }, [answer]);

    // Extract correct answers from external answer file for advanced levels
    const correctAnswers = useMemo(() => {
        // For advanced levels (B2, C1, C2), get answers from external file
        if (difficulty && ['B2', 'C1', 'C2'].includes(difficulty.toUpperCase()) && readingId && reviewMap && isReviewMode) {
            const answers = {};
            
            // For completion questions, we need to extract blank numbers from the content
            if (question.type === 'summary_completion' && question.summary) {
                const blankMatches = question.summary.match(/___(\d+)___/g) || [];
                blankMatches.forEach((match) => {
                    const blankId = match.match(/\d+/)[0];
                    const correctAnswer = reviewMap && reviewMap[String(blankId)];
                    if (correctAnswer) answers[blankId] = correctAnswer;
                });
            } else if (question.type === 'table_completion' && question.table) {
                // Extract blanks from table rows
                let blankIndex = 0;
                question.table.rows.forEach((row, rowIndex) => {
                    Object.keys(row).forEach(header => {
                        const cellValue = row[header];
                        const blankMatch = cellValue?.match(/___(\d+)___/);
                        if (blankMatch) {
                            const blankId = blankMatch[1];
                            const correctAnswer = reviewMap && reviewMap[String(blankId)];
                            if (correctAnswer) answers[blankId] = correctAnswer;
                        }
                    });
                });
            } else if (question.type === 'flow_chart_completion' && question.flow_chart) {
                if (question.flow_chart.type === 'vertical' && question.flow_chart.steps) {
                    // New vertical format: extract blanks from steps
                    question.flow_chart.steps.forEach(step => {
                        if (step.blank) {
                            const correctAnswer = reviewMap && reviewMap[String(step.blank)];
                            if (correctAnswer) answers[step.blank] = correctAnswer;
                        }
                        if (step.blank2) {
                            const correctAnswer = reviewMap && reviewMap[String(step.blank2)];
                            if (correctAnswer) answers[step.blank2] = correctAnswer;
                        }
                    });
                } else if (typeof question.flow_chart === 'string') {
                    // Legacy string format: use regex matching
                    const blankMatches = question.flow_chart.match(/___(\d+)___/g) || [];
                    blankMatches.forEach((match) => {
                        const blankId = match.match(/\d+/)[0];
                        const correctAnswer = reviewMap && reviewMap[String(blankId)];
                        if (correctAnswer) answers[blankId] = correctAnswer;
                    });
                }
                
            } else if (question.type === 'diagram_labelling' && question.labels) {
                question.labels.forEach((label, index) => {
                    // Answer keys are sequential: question ID + index
                    const answerKey = String(question.id + index);
                    const correctAnswer = reviewMap && reviewMap[answerKey];
                    if (correctAnswer) answers[label.position] = correctAnswer;
                });
            } else if (question.type === 'note_completion' && question.notes) {
                question.notes.forEach((note) => {
                    // Handle both formats: ___NUMBER___ and NUMBER..........
                    const blankMatches = note.match(/(?:___(\d+)___|(\d+)\.{2,})/g) || [];
                    blankMatches.forEach((match) => {
                        const blankId = match.match(/(\d+)/)[1];
                        const correctAnswer = reviewMap && reviewMap[String(blankId)];
                        if (correctAnswer) answers[blankId] = correctAnswer;
                    });
                });
            }
            
            return answers;
        }
        
        // For basic levels or fallback, try to extract from question object
        switch (question.type) {
            case 'summary_completion':
            case 'table_completion':
            case 'flow_chart_completion':
            case 'note_completion':
                if (question.answers && Array.isArray(question.answers)) {
                    const answers = {};
                    question.answers.forEach(answerItem => {
                        answers[answerItem.blank] = answerItem.answer;
                    });
                    return answers;
                }
                break;
            case 'diagram_labelling':
                if (question.labels && Array.isArray(question.labels)) {
                    const answers = {};
                    question.labels.forEach(label => {
                        answers[label.position] = label.answer;
                    });
                    return answers;
                }
                break;
        }
        return {};
    }, [question, readingId, difficulty, reviewMap, isReviewMode]);

    // For new structure, we don't have embedded correct answers
    // Correctness will be determined by the external answer checker

    // Removed overall isCorrect summary calculation since per-blank feedback is shown inline

    const handleBlankChange = (blankId, value) => {
        if (isReviewMode) return;
        
        const newAnswers = { ...userAnswers, [blankId]: value };
        onAnswerChange(question.id || 'unknown', newAnswers);
    };

    const getBlankStatus = (blankId) => {
        // Ensure consistent string comparison
        const blankKey = String(blankId);
        const userResponse = userAnswers[blankKey] || userAnswers[blankId];
        const correctResponse = correctAnswers[blankKey] || correctAnswers[blankId];
        const hasCorrect = Boolean(correctResponse);
        
        if (!isReviewMode) {
            return { 
                isAnswered: !!userResponse,
                showFeedback: false 
            };
        }
        
        // Handle cases where user didn't provide an answer
        if (!userResponse || userResponse.toString().trim() === '') {
            return {
                isAnswered: false,
                isCorrect: false,
                showFeedback: hasCorrect,
                correctResponse: correctResponse || ''
            };
        }
        
        // Check if answer is correct using the same logic as answerChecker.js
        let isBlankCorrect = false;
        if (correctResponse) {
            isBlankCorrect = checkAnswerVariants(userResponse, correctResponse, 1.0, 0.85, 0.7);
        }
        
        return {
            isAnswered: !!userResponse,
            isCorrect: isBlankCorrect,
            showFeedback: hasCorrect,
            correctResponse: correctResponse || ''
        };
    };

    // Helper function for similarity calculation (keeping for backward compatibility)
    const calculateSimilarity = (text1, text2) => {
        if (!text1 || !text2) return 0;
        
        const set1 = new Set(text1.toLowerCase().split(''));
        const set2 = new Set(text2.toLowerCase().split(''));
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        return intersection.size / union.size;
    };

    // Check if the overall answer is correct
    // Note: isCorrect is already defined above

    // Removed overall stats & result helpers as they were only used by the deleted summary

    const renderDiagramLabelling = () => {
        if (!question.labels || !Array.isArray(question.labels)) {
            return <div>No diagram labels available</div>;
        }
        
        // Use consistent professional diagram icon for all positions
        const getIconForPosition = (position, description) => {
            return <MdTimeline className="label-icon" />;
        };
        
        return (
            <DiagramLabels
              label={question.diagram_description}
              labels={question.labels}
              values={userAnswers}
              onChange={(pos, v) => handleBlankChange(pos, v)}
            />
        );
    };

    const renderSummaryCompletion = () => {
        if (!question.summary) {
            return <div>No summary content available</div>;
        }

        const summaryTitle = typeof question.title === 'string' ? question.title.trim() : '';
        
        // Split by blanks first, then handle line breaks within each part
        const summaryParts = question.summary.split(/___\d+___/);
        const blanks = question.summary.match(/___(\d+)___/g) || [];
        
        if (isReviewMode) {
            return (
                <div className="summary-completion review-mode">
                    {summaryTitle && (
                        <div className="summary-title">
                            <h4 className="title-text">{summaryTitle}</h4>
                        </div>
                    )}
                    <div className="summary-text">
                        {summaryParts.map((part, idx) => (
                            <React.Fragment key={idx}>
                                {part.split('\n').map((line, lineIdx) => (
                                    <React.Fragment key={lineIdx}>
                                        {lineIdx > 0 && <br />}
                                        {line}
                                        {idx < blanks.length && lineIdx === part.split('\n').length - 1 && (
                                            <span className="blank-container">
                                                {renderSummaryBlankReview(blanks[idx].match(/\d+/)[0])}
                                            </span>
                                        )}
                                    </React.Fragment>
                                ))}
                                {idx < blanks.length && part.split('\n').length === 1 && (
                                    <span className="blank-container">
                                        {renderSummaryBlankReview(blanks[idx].match(/\d+/)[0])}
                                    </span>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            );
        }
        
        // Determine if ALL blanks in the summary have been answered (non-empty)
        const isSummaryFullyAnswered =
            blanks.length > 0 &&
            blanks.every((b) => {
                const id = (b.match(/\d+/) || [])[0];
                const value = id ? (userAnswers[id] ?? '') : '';
                return value.toString().trim().length > 0;
            });

        // Create content parts that preserve line breaks and blanks in correct positions
        const contentParts = [];
        let blankIndex = 0;
        
        summaryParts.forEach((part, idx) => {
            const lines = part.split('\n');
            lines.forEach((line, lineIdx) => {
                if (lineIdx > 0) {
                    contentParts.push({ type: 'lineBreak' });
                }
                contentParts.push(line);
                
                // Only add blank if this part should have one (idx < blanks.length)
                // and this is the last line of this part
                if (idx < blanks.length && lineIdx === lines.length - 1) {
                    contentParts.push({ 
                        id: blanks[blankIndex].match(/\d+/)[0], 
                        placeholder: String(blanks[blankIndex].match(/\d+/)[0]) 
                    });
                    blankIndex++;
                }
            });
        });

        return (
            <div className={`summary-completion ${isSummaryFullyAnswered ? 'answered' : 'unanswered'}`}>
                {summaryTitle && (
                    <div className="summary-title">
                        <h4 className="title-text">{summaryTitle}</h4>
                    </div>
                )}
                <div className="summary-text">
                    <InlineGapFilling
                      contentParts={contentParts}
                      values={userAnswers}
                      onChange={handleBlankChange}
                      dataQuestionId={question.id}
                    />
                </div>
            </div>
        );
    };

    const renderTableCompletion = () => {
        if (!question.table) {
            return <div>No table content available</div>;
        }
        const table = question.table;
        
        const rows = [];
        table.rows.forEach((row) => {
          table.headers.forEach((header) => {
            const cellValue = row[header];
            const blankMatch = cellValue?.match(/___(\d+)___/);
            if (blankMatch) {
              rows.push({ keyId: `${header}`, keyLabel: cellValue.replace(/___\d+___/, header), valueId: blankMatch[1] });
            }
          });
        });
        return (
          <KeyValueTable
            label={table.title}
            headers={["Item", "Answer"]}
            rows={rows}
            values={userAnswers}
            onChange={handleBlankChange}
          />
        );
    };

    const renderFlowChartElements = (elements) => {
        if (!Array.isArray(elements) || elements.length === 0) {
            return <div>Invalid flow chart format</div>;
        }

        return (
            <div className="flow-chart-completion">
                <div className="flow-chart-header">
                    <h4 className="flow-chart-title">
                        <MdAccountTree className="title-icon" />
                        {t('questionTypes.flowChartCompletion')}
                    </h4>
                </div>

                <div className={`flow-chart-container ${isReviewMode ? 'review-mode' : ''}`}>
                    <div className="flow-diagram">
                        {elements.map((el, idx) => (
                            <div className="flow-item" key={`${el.type}-${el.id ?? idx}-${idx}`}>
                                <div className={`flow-box ${el.type === 'text' ? 'process-box' : 'input-box'}`}>
                                    <div className="box-content">
                                        {el.type === 'text' ? (
                                            <div className="process-text">{el.content}</div>
                                        ) : (
                                            <div className="input-area">
                                                {isReviewMode
                                                    ? renderFlowChartBlankReview(el.blankId)
                                                    : renderBlankInput(el.blankId)}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {el.hasArrow && (
                                    <div className="flow-arrow" aria-hidden="true">
                                        <MdTimeline />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const renderFlowChartCompletion = () => {
        if (!question.flow_chart) {
            return <div>No flow chart content available</div>;
        }
        
        // Check if it's the new vertical flow chart format
        if (question.flow_chart.type === "vertical") {
            const items = [];

            (question.flow_chart.steps || []).forEach((step, stepIndex, allSteps) => {
                const stepText = [step?.title, step?.text, step?.content]
                    .find((value) => typeof value === 'string' && value.trim());

                if (stepText) {
                    items.push({
                        type: 'text',
                        id: `step-text-${stepIndex}`,
                        content: stepText.trim(),
                        hasArrow: true
                    });
                }

                if (step?.blank) {
                    items.push({
                        type: 'blank',
                        id: `step-blank-${step.blank}`,
                        blankId: String(step.blank),
                        hasArrow: true
                    });
                }

                if (step?.blank2) {
                    items.push({
                        type: 'blank',
                        id: `step-blank2-${step.blank2}`,
                        blankId: String(step.blank2),
                        hasArrow: true
                    });
                }

                if (items.length > 0 && stepIndex === allSteps.length - 1) {
                    items[items.length - 1].hasArrow = false;
                }
            });

            return renderFlowChartElements(items);
        }
        
        // Legacy string format support (fallback)
        if (typeof question.flow_chart === 'string') {
            // Parse the flow chart to create a sequence of steps and blanks
            const flowChartParts = question.flow_chart.split(/___\d+___/);
            const blanks = question.flow_chart.match(/___(\d+)___/g) || [];
            
            const flowElements = [];
            let elementIndex = 0;
            
            flowChartParts.forEach((part, idx) => {
                // Add text step if part has content
                if (part.trim()) {
                    flowElements.push({
                        type: 'text',
                        content: part.trim(),
                        id: elementIndex++,
                        hasArrow: idx < blanks.length || idx < flowChartParts.length - 1
                    });
                }
                
                // Add blank step if there's a corresponding blank
                if (idx < blanks.length) {
                    const blankId = blanks[idx].match(/\d+/)[0];
                    flowElements.push({
                        type: 'blank',
                        blankId: blankId,
                        id: elementIndex++,
                        hasArrow: idx < blanks.length - 1 || idx < flowChartParts.length - 2
                    });
                }
            });
            
            return renderFlowChartElements(flowElements);
        }
        
        return <div>Invalid flow chart format</div>;
    };

    const renderFlowChartBlankReview = (blankId) => {
        const blankStatus = getBlankStatus(blankId);
        const userValue = userAnswers[blankId] || '';
        
        return (
            <div className={`flow-chart-blank-review ${
                blankStatus.isAnswered ? 
                    (blankStatus.isCorrect ? 'correct' : 'incorrect') : 'unanswered'
            }`}>
                <div className="blank-content">
                    <div className="user-answer-section">
                        <span className="answer-label">YOUR ANSWER:</span>
                        <span className="answer-text">{userValue || 'No answer'}</span>
                    </div>
                    {!blankStatus.isCorrect && blankStatus.correctResponse && (
                        <CorrectAnswerInfo label={t('correctAnswer') + ':'} value={blankStatus.correctResponse} />
                    )}
                </div>
                <div className="status-indicator">
                    <span className={`status-icon ${blankStatus.isAnswered ? (blankStatus.isCorrect ? 'correct' : 'incorrect') : 'unanswered'}`}>
                        {!blankStatus.isAnswered ? '—' : (blankStatus.isCorrect ? '✓' : '✗')}
                    </span>
                </div>
            </div>
        );
    };

        const renderNoteCompletion = () => {
        if (!question.notes || !Array.isArray(question.notes)) {
            return <div>No notes content available</div>;
        }

        return (
            <div className={`note-completion ${isReviewMode ? 'review-mode' : ''}`}>
                {question.title_of_notes && (
                    <div className="notes-title">
                        <h4 className="title-text">{question.title_of_notes}</h4>
                    </div>
                )}

                <div className="notes-container">
                    {question.notes.map((note, noteIndex) => {
                        // Handle both formats: ___NUMBER___ and NUMBER..........
                        const noteParts = note.split(/(?:___\d+___|\d+\.{2,})/);
                        const blanks = note.match(/(?:___(\d+)___|(\d+)\.{2,})/g) || [];

                        // Determine if ALL blanks in this note have been answered (non-empty)
                        const isNoteFullyAnswered =
                            blanks.length > 0 &&
                            blanks.every((b) => {
                                const id = (b.match(/\d+/) || [])[0];
                                const value = id ? (userAnswers[id] ?? '') : '';
                                return value.toString().trim().length > 0;
                            });

                        return (
                            <div key={noteIndex} className={`note-item ${isNoteFullyAnswered ? 'answered' : 'unanswered'}`}>
                                <div className="note-content">
                                    {noteParts.map((part, partIndex) => (
                                        <React.Fragment key={partIndex}>
                                            {part.split('\n').map((line, lineIdx) => (
                                                <React.Fragment key={lineIdx}>
                                                    {lineIdx > 0 && <br />}
                                                    {line}
                                                </React.Fragment>
                                            ))}
                                            {partIndex < blanks.length && (
                                                <span className="blank-container">
                                                    {isReviewMode ? 
                                                        renderNoteBlankReview(blanks[partIndex].match(/\d+/)[0]) :
                                                        renderBlankInput(blanks[partIndex].match(/\d+/)[0])
                                                    }
                                                </span>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderSummaryBlankReview = (blankId) => {
        const blankStatus = getBlankStatus(blankId);
        const userValue = userAnswers[blankId] || '';
        
        return (
            <div className={`summary-blank-review ${
                blankStatus.isAnswered ? 
                    (blankStatus.isCorrect ? 'correct' : 'incorrect') : 'unanswered'
            }`}>
                <div className="blank-content">
                    <div className="user-answer-inline">
                        <span className="answer-text">{userValue || 'No answer'}</span>
                    </div>
                    {!blankStatus.isCorrect && (
                        <div className="correct-answer-inline">
                            <span className="correct-text">{blankStatus.correctResponse}</span>
                        </div>
                    )}
                </div>
                <div className="status-indicator">
                    <span className={`status-icon ${blankStatus.isAnswered ? (blankStatus.isCorrect ? 'correct' : 'incorrect') : 'unanswered'}`}>
                        {!blankStatus.isAnswered ? '—' : (blankStatus.isCorrect ? '✓' : '✗')}
                    </span>
                </div>
            </div>
        );
    };

    const renderNoteBlankReview = (blankId) => {
        const blankStatus = getBlankStatus(blankId);
        const userValue = userAnswers[blankId] || '';
        
        return (
            <div className={`note-blank-review ${
                blankStatus.isAnswered ? 
                    (blankStatus.isCorrect ? 'correct' : 'incorrect') : 'unanswered'
            }`}>
                <div className="blank-content">
                    <div className="user-answer-inline">
                        <span className="answer-text">{userValue || 'No answer'}</span>
                    </div>
                    {!blankStatus.isCorrect && (
                        <div className="correct-answer-inline">
                            <span className="correct-text">{blankStatus.correctResponse}</span>
                        </div>
                    )}
                </div>
                <div className="status-indicator">
                    <span className={`status-icon ${blankStatus.isAnswered ? (blankStatus.isCorrect ? 'correct' : 'incorrect') : 'unanswered'}`}>
                        {!blankStatus.isAnswered ? '—' : (blankStatus.isCorrect ? '✓' : '✗')}
                    </span>
                </div>
            </div>
        );
    };

    const renderBlankInput = (blankId) => {
        const blankStatus = getBlankStatus(blankId);
        const userValue = userAnswers[blankId] || '';
        
        if (isReviewMode) {
            return (
                <div className={`blank-review-container ${
                    blankStatus.isAnswered ? 
                        (blankStatus.isCorrect ? 'correct' : 'incorrect') : 'unanswered'
                }`}>
                    <div className="answer-display">
                        <div className="user-answer">
                            <span className="answer-label">Your answer:</span>
                            <span className="answer-text">{userValue || 'No answer'}</span>
                        </div>
                        {!blankStatus.isCorrect && (
                            <div className="correct-answer">
                                <span className="answer-label">Correct answer:</span>
                                <span className="answer-text correct">{blankStatus.correctResponse}</span>
                            </div>
                        )}
                    </div>
                    <div className="status-indicator">
                        <span className={`status-icon ${blankStatus.isAnswered ? (blankStatus.isCorrect ? 'correct' : 'incorrect') : 'unanswered'}`}>
                            {!blankStatus.isAnswered ? '—' : (blankStatus.isCorrect ? '✓' : '✗')}
                        </span>
                    </div>
                </div>
            );
        }
        
        return (
            <div className={`blank-input-container ${blankStatus.isAnswered ? 'answered' : 'unanswered'} ${
                blankStatus.showFeedback ? 
                    (blankStatus.isCorrect ? 'correct' : 'incorrect') : ''
            }`}>
                <input
                    type="text"
                    value={userValue}
                    onChange={(e) => handleBlankChange(blankId, e.target.value)}
                    disabled={isReviewMode}
                    className="blank-input"
                    placeholder={`${blankId}`}
                    autoComplete="off"
                    data-blank-id={blankId}
                    data-question-id={question.id}
                    data-question-type={question.type}
                />
                
                {blankStatus.showFeedback && (
                    <div className="blank-feedback">
                        <span className={`feedback-icon ${blankStatus.isCorrect ? 'correct' : 'incorrect'}`}>
                            {blankStatus.isCorrect ? '✓' : '✗'}
                        </span>
                        {!blankStatus.isCorrect && (
                            <CorrectAnswerInfo label={t('correctAnswer') + ':'} value={blankStatus.correctResponse} />
                        )}
                    </div>
                )}
            </div>
        );
    };

    const renderContent = () => {
        switch (question.type) {
            case 'summary_completion':
                return renderSummaryCompletion();
            case 'table_completion':
                return renderTableCompletion();
            case 'flow_chart_completion':
                return renderFlowChartCompletion();
            case 'diagram_labelling':
                return renderDiagramLabelling();
            case 'note_completion':
                return renderNoteCompletion();
            default:
                return <div>Unsupported completion type</div>;
        }
    };

    return (
        <div className="completion-question-container">
            {renderContent()}
        </div>
    );
};

export default CompletionQuestion; 