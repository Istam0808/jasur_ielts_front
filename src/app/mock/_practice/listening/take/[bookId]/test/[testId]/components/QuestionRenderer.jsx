"use client"

import React from 'react';
import Question from './Question';

// Helper function to clean instruction text for flowchart-type questions
const cleanFlowchartInstruction = (instruction) => {
    if (!instruction || typeof instruction !== 'string') return instruction;
    
    // Check if this is a flowchart instruction (contains "flowchart" and has <br/> tags)
    const isFlowchartInstruction = instruction.includes('flowchart') && instruction.includes('<br/>');
    
    if (isFlowchartInstruction) {
        // Extract only the main instruction part (before the flowchart content)
        // Look for the pattern: main instruction + <br/> + <strong>...flowchart</strong> + <br/> + flowchart content
        const flowchartTitleMatch = instruction.match(/<br\/>\s*<strong>.*?flowchart.*?<\/strong>\s*<br\/>/i);
        
        if (flowchartTitleMatch) {
            // Return everything before the flowchart title
            return instruction.substring(0, flowchartTitleMatch.index).trim();
        }
        
        // Fallback: if no strong tag found, look for first <br/> after "Questions"
        const questionsMatch = instruction.match(/(.*Questions\s+\d+-\d+\.)\s*<br\/>/);
        if (questionsMatch) {
            return questionsMatch[1].trim();
        }
    }
    
    return instruction;
};

const QuestionRenderer = ({ item, userAnswers, onAnswerChange, optionsBox }) => {
    // Case 1: Item is a container with sub-sections. Render section-level info and recurse.
    if (item.sections && Array.isArray(item.sections)) {
        return item.sections.map((section, index) => (
            <div key={`${section.questionRange || section.questions}-${index}`} className="question-section">
                {/* Render context, instruction, image, and options box at the section level */}
                {section.context && <h4 className="selectable-content">{section.context}</h4>}
                {section.instruction && (
                    <p className="instruction-text selectable-content" 
                       dangerouslySetInnerHTML={{ __html: cleanFlowchartInstruction(section.instruction) }} />
                )}
                {section.imageLocalUrl && (
                    <div className="question-image-container">
                        <img
                            src={section.imageLocalUrl}
                            alt={section.context || 'Question image'}
                            className="question-image"
                        />
                    </div>
                )}
                {/* Recurse to render the content of the section */}
                <QuestionRenderer 
                    item={section} 
                    userAnswers={userAnswers} 
                    onAnswerChange={onAnswerChange}
                    optionsBox={section.options_box || section.options || optionsBox}
                />
            </div>
        ));
    }

    // Case 2: Item has a list of individual questions (like a matching group). Render them.
    if (item.questions && Array.isArray(item.questions)) {
        // This is now inside a section that has already rendered the instruction/options.
        // We just need to render the questions themselves.
        return (
            <div className="question-group">
                {item.questions.map(q => {
                    if (!q.type) return null;
                    // For matching questions, we need to pass the individual question text.
                    const questionData = {
                        ...q,
                        text: q.type === 'matching' ? q.text : (item.text || q.text)
                    };
                    return (
                        <Question
                            key={q.number}
                            question={questionData}
                            userAnswer={userAnswers[q.number]}
                            onAnswerChange={onAnswerChange}
                            optionsBox={item.options_box || item.options || optionsBox}
                        />
                    );
                })}
            </div>
        );
    }

    // Case 3: Item describes a question block with a range (e.g., "21-22" multiple_choice_two).
    const rangeStr = item.questionRange || (typeof item.questions === 'string' && item.questions.includes('-') ? item.questions : null);
    if (rangeStr) {
        if (!item.type) return null;

        // This is also inside a section, so just render the Question component.
        const [start, end] = rangeStr.split('-').map(Number);
        const questionBlock = {
            number: rangeStr,
            type: item.type,
            text: item.instruction, // The instruction becomes the "question text" for the block
            options: item.options,
            individualQuestions: item.questions 
        };
        
        const blockAnswers = {};
        for(let i = start; i <= end; i++) {
            blockAnswers[i] = userAnswers[i];
        }

        return (
            <div className="question-group">
                <Question
                    key={rangeStr}
                    question={questionBlock}
                    userAnswer={blockAnswers}
                    onAnswerChange={onAnswerChange}
                    optionsBox={item.options_box || item.options || optionsBox}
                />
            </div>
        );
    }
    
    // Case 4: Item itself is a single question object (fallback).
    if (item.type && item.number) {
        return (
            <Question
                key={item.number}
                question={item}
                userAnswer={userAnswers[item.number]}
                onAnswerChange={onAnswerChange}
                optionsBox={item.options_box || item.options || optionsBox}
            />
        );
    }

    return null;
};

export default QuestionRenderer; 