/**
 * Groups consecutive questions of the same type together
 * @param {Array} questions - Array of question objects
 * @returns {Array} Array of question groups, where each group contains questions of the same type
 */
export const groupQuestionsByType = (questions) => {
    if (!questions || questions.length === 0) {
        return [];
    }

    const groups = [];
    let currentGroup = [questions[0]];

    for (let i = 1; i < questions.length; i++) {
        const currentQuestion = questions[i];
        const previousQuestion = questions[i - 1];

        // If the current question is the same type as the previous one, add it to the current group
        if (currentQuestion.type === previousQuestion.type) {
            currentGroup.push(currentQuestion);
        } else {
            // If the type is different, finalize the current group and start a new one
            groups.push([...currentGroup]);
            currentGroup = [currentQuestion];
        }
    }

    // Don't forget to add the last group
    if (currentGroup.length > 0) {
        groups.push(currentGroup);
    }

    return groups;
}; 