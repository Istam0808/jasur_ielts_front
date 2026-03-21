"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';

import FillInBlank from './question-types/FillInBlank';
import MultipleChoice from './question-types/MultipleChoice';
import MultipleChoiceTwo from './question-types/MultipleChoiceTwo';
import MapLabeling from './question-types/MapLabeling';
import Matching from './question-types/Matching';
import DragAndDrop from './question-types/DragAndDrop';
import TrueFalse from './question-types/TrueFalse';

const questionComponents = {
    fill_in_blank: FillInBlank,
    multiple_choice: MultipleChoice,
    multiple_choice_two: MultipleChoiceTwo,
    map_labeling: MapLabeling,
    matching: Matching,
    drag_and_drop: DragAndDrop,
    true_false: TrueFalse,
    trueFalse: TrueFalse, // Support both naming conventions
};

const Question = ({ question, userAnswer, onAnswerChange, optionsBox }) => {
    const { t } = useTranslation('practice');

    const QuestionComponent = questionComponents[question.type];

    if (!QuestionComponent) {
        return <p>{t('error.unsupportedQuestionType', { ns: 'practice', type: question.type })}</p>;
    }

    const questionNum = typeof question.number === 'string' && question.number.includes('-')
        ? question.number.split('-').map(Number)[0]
        : question.number;

    return (
        <div className="question-container" data-question-number={questionNum}>
            <QuestionComponent 
                question={question} 
                userAnswer={userAnswer} 
                onAnswerChange={onAnswerChange} 
                optionsBox={optionsBox} 
            />
        </div>
    );
};

export default Question; 