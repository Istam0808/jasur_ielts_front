# IELTS Reading Test Generation Prompt

Generate a professional IELTS-style reading comprehension test in JSON format with the following specifications:

## Test Parameters:
- **Topics**: [
    50. Cameras That See Through Walls
]
- **Difficulty Level**: [A2] (45% of questions should be short_answer, 40% should be multiple_choice, 15% should be true_false)
- **Number of Questions**: [12] // randomize
- **About passage badge**: [Future Technology] 

## Difficulty Level Guidelines:
- **A1 (Beginner)**: Simple present tense, basic vocabulary (150-250 words), short sentences, familiar topics
- **A2 (Elementary)**: Present/past tenses, everyday vocabulary (250-350 words), simple connectors
- **B1 (Intermediate)**: Various tenses, common phrasal verbs, moderate complexity (350-500 words)
- **B2 (Upper-Intermediate)**: Complex grammar, idiomatic expressions, abstract concepts (500-700 words)
- **C1 (Advanced)**: Sophisticated vocabulary, complex sentence structures, nuanced meaning (700-1000 words)
- **C2 (Proficiency)**: Near-native vocabulary, subtle distinctions, complex argumentation

## Required JSON Structure:
```json
{
    "id": 1,
    "level": "[DIFFICULTY_LEVEL]",
    "title": "[Descriptive Title Related to Topic]",
    "passage": "[Reading passage text - ?---? words depending on level]",
    "about_passage": "[Passage badge]",
    "questions": [
        {
            "id": 1,
            "type": "multiple_choice",
            "question": "Question text?",
            "options": [
                {"answer": "Option A", "correct": true}, // could be any option from A to D
                {"answer": "Option B", "correct": false},
                {"answer": "Option C", "correct": false},
                {"answer": "Option D", "correct": false}
            ]
        },
        {
            "id": 2,
            "type": "true_false",
            "statement": "Statement to evaluate",
            "options": [
                {"answer": "true", "correct": false},
                {"answer": "false", "correct": true}
            ]
        },
        {
            "id": 3,
            "type": "short_answer",
            "sentence": "Complete the sentence: The main point is ___.",
            "options": [
                {
                    "answer": "correct_answer", // all possible correct answers MUST be provided in one answer field like: "Ten/10"
                    "correct": true
                },
            ]
        }
    ],
    "metadata": {
        "timeLimit": "[Minutes based on difficulty: A1/A2=10-20, B1/B2=20-30, C1/C2=30-40]", // MUST BE A NUMBER of given range for difficulty level
        "skills": ["List of 3-5 difficulty-related and relevant reading skills being tested"]
    }
}
```

## Content Requirements:
1. **Passage**: Create an engaging, authentic text appropriate for the difficulty level
2. **Questions**: Mix question types evenly, ensure they test different comprehension skills
3. **Answer Options**: Make distractors plausible but clearly incorrect
4. **Skills Tested**: Include skills like: main idea identification, detail comprehension, inference, vocabulary in context, author's purpose, text organization

## Question Type Distribution:
- Use approximately equal numbers of each question type
- Ensure questions progress from easier to more challenging
- Test both explicit information and inferential understanding

## Quality Standards:
- All questions must be answerable from the passage
- Avoid cultural bias or overly specialized knowledge
- Use clear, unambiguous language in questions
- Provide realistic time limits based on difficulty level

Generate the complete JSON test now.