# AVAILABLE ADVANCED READING QUESTION TYPES:
1. "multiple_choice",
2. "multiple_choice_multiple",
3. "true_false_not_given",
4. "yes_no_not_given",
5. "matching_headings",
6. "matching_information",
7. "matching_features",
8. "sentence_completion",
9. "summary_completion",
10. "table_completion",
11. "flow_chart_completion",
12. "short_answer",
13. "note_completion",
14. "diagram_labelling"


## 1. multiple_choice question structure
```json
{
    "id": [number],
    "passage_id": [number],
    "type": "multiple_choice",
    "question": "[question]",
    "options": [
        // ONLY ONE CORRECT OPTION
        "[option 1]",
        "[option 2]",
        "[option 3]",
        // ... could be more or less options depending on the question
    ]
}
```

## 2. multiple_choice_multiple question structure
```json
{
    "id": [number],
    "passage_id": [number],
    "type": "multiple_choice_multiple",
    "question": "[question]",
    "instruction": "[instruction]",
    "options": [
        // MULTIPLE CORRECT OPTIONS 
        "[option 1]",
        "[option 2]",
        "[option 3]",
        // ... could be more or less options depending on the question
    ]
}
```

## 3. true_false_not_given question structure
```json
{
    "id": [number],
    "passage_id": [number],
    "type": "true_false_not_given",
    "statement": "[statement]",
    "options": [ "TRUE", "FALSE", "NOT GIVEN" ] // ONLY ONE CORRECT OPTION
}
```

## 4. yes_no_not_given question structure
```json
{
    "id": [number],
    "passage_id": [number],
    "type": "yes_no_not_given",
    "statement": "[statement]",
    "options": [ "YES", "NO", "NOT GIVEN" ] // ONLY ONE CORRECT OPTION
}
```

## 5. matching_headings question structure
```json
{
    "id": [number],
    "passage_id": [number],
    "type": "matching_headings",
    "instruction": "[instruction]",
    "headings": [
        "i. first heading",
        "ii. second heading",
        "iii. third heading",
        "iv. fourth heading",
        "v. fifth heading",
        // ... could be more or less headings depending on the question
    ],
    "sections": [
        // EACH OF THESE HAS ALL OPTIONS as available options AND ONE OF THE OPTIONS IS CORRECT
        "Paragraph A",
        "Paragraph B",
        "Paragraph C",
        "Paragraph D",
        "Paragraph E",
        // ... could be more or less sections depending on the headings
    ],
    "options": [
        "i",
        "ii",
        "iii",
        "iv",
        "v",
        // ... depends how many headings we have
    ]
},
```


## 6. matching_information question structure
```json
{
    "id": [number],
    "passage_id": [number],
    "type": "matching_information",
    "instruction": "[instruction]  ex: Match each piece of information with the correct paragraph A-H.",
    "information": [
        // EACH OF THESE HAS ALL OPTIONS as available options AND ONE OF THE OPTIONS IS CORRECT
        "first information",
        "second information",
        "third information",
        "fourth information"
    ],
    "options": [
        "Paragraph A",
        "Paragraph B",
        "Paragraph C",
        // ... could be more or less options 
    ]
}
```

## 7. matching_features question structure
```json
{
    "id": [number],
    "passage_id": [number],
    "type": "matching_features",
    "instruction": "[instruction]",
    "features": [
        "A. first feature",
        "B. second feature",
        "C. third feature",
        "D. fourth feature",
        "E. fifth feature",
        "F. sixth feature"
        // ... could be more or less 
    ],
    "items": [
        // EACH OF THESE ITEMS HAS ALL FEATURES as available options AND ONE OF THE FEATURES IS CORRECT
        "first item",
        "second item",
        "third item",
        // ... could be more or less items
    ],
}
```


## 8. sentence_completion question structure
```json
{
    "id": [number],
    "passage_id": [number],
    "type": "sentence_completion",
    "instruction": "[instruction]",
    "sentences": [
        // EACH OF THESE SENTENCES HAS ALL ENDINGS as available options AND ONE OF THE ENDINGS IS CORRECT
        "first sentence",
        "second sentence",
        // ... could be more or less sentences depending on the question
    ],
    "endings": [
        "A. first ending",
        "B. second ending",
        "C. third ending",
        "D. fourth ending",
        "E. fifth ending",
        "F. sixth ending"
        // ... could be more or less options depending on the sentences
    ]
},
```

## 9. summary_completion question structure
```json
{
    "id": [number],
    "passage_id": [number],
    "type": "summary_completion",
    "instruction": "[instruction]  ex: Complete the summary using words from the passage. Use NO MORE THAN TWO WORDS for each answer.",
    "summary": "[summary]  ex: Neuroplasticity is controlled by activity-dependent changes in ___1___ that alter protein synthesis. The process begins when ___2___ are activated, which serve as molecular switches. Calcium ions enter neurons and trigger the activation of ___3___, a master regulator that promotes the production of ___4___, which acts like molecular fertilizer for the brain. The structural basis involves changes in ___5___ on neurons, controlled by proteins including actin and myosin."

    // each blank is an input field that the user needs to fill in
},
```

## 10. table_completion question structure
```json
{
    "id": [number],
    "passage_id": [number],
    "type": "table_completion",
    "instruction": "[instruction]  ex: Complete the table below. Use NO MORE THAN THREE WORDS for each answer.",
    "table": {
        "title": "[title]",
        "headers": [
            "header_of_first_column",
            "header_of_second_column",
            "header_of_third_column",
            "header_of_fourth_column"
        ],
        "rows": [
            {
                "header_of_first_column": "column_1_content",
                "header_of_second_column": "column_2_content",
                "header_of_third_column": "___1___",
                "header_of_fourth_column": "column_4_content"
            },
            {
                "header_of_first_column": "column_1_content",
                "header_of_second_column": "___2___",
                "header_of_third_column": "column_3_content",
                "header_of_fourth_column": "column_4_content"
            },
            {
                "header_of_first_column": "column_1_content",
                "header_of_second_column": "___3___",
                "header_of_third_column": "column_3_content",
                "header_of_fourth_column": "___4___"
            },
        ]
    }
}
```


## 11. flow_chart_completion question structure

### New Vertical Format (Recommended)
```json
{
    "id": [number],
    "passage_id": [number],
    "type": "flow_chart_completion",
    "instruction": "[instruction]  ex: Complete the flow chart showing the mirror neuron activation process. Use NO MORE THAN TWO WORDS from the passage for each answer.",
    "flow_chart": {
        "type": "vertical",
        "steps": [
            {
                "text": "Observation of Action/Emotion",
                "blank": 1
            },
            {
                "text": "Mirror Neuron Firing",
                "blank": 2
            },
            {
                "text": "Empathetic Response",
                "blank": 3
            }
        ]
    }
}
```

### Legacy String Format (Backward Compatible)
```json
{
    "id": [number],
    "passage_id": [number],
    "type": "flow_chart_completion",
    "instruction": "[instruction]  ex: Complete the flow chart showing the mirror neuron activation process. Use NO MORE THAN TWO WORDS from the passage for each answer.",
    "flow_chart": "Observation of Action/Emotion ___1___ Mirror Neuron Firing ___2___ Empathetic Response ___3___"
}
```

### Advanced Vertical Format with Multiple Blanks per Step
```json
{
    "id": [number],
    "passage_id": [number],
    "type": "flow_chart_completion",
    "instruction": "[instruction]  ex: Complete the flow chart showing the synthetic gene process. Use NO MORE THAN TWO WORDS from the passage for each answer.",
    "flow_chart": {
        "type": "vertical",
        "steps": [
            {
                "text": "Synthetic gene grown in",
                "blank": 6,
                "text2": "or",
                "blank2": 7
            },
            {
                "text": "globules of",
                "blank": 8
            },
            {
                "text": "dissolved in",
                "blank": 9
            },
            {
                "text": "passed through",
                "blank": 10
            },
            {
                "text": "to produce a solid fibre"
            }
        ]
    }
}
```

**Note**: The new vertical format provides better visual hierarchy, accessibility, and supports multiple blanks per step. The system automatically detects the format and renders appropriately. Legacy string format questions continue to work unchanged.


## 12. short_answer question structure
```json
{
    "id": [number],
    "passage_id": [number],
    "type": "short_answer",
    "instruction": "[instruction]  ex: Answer the questions below. Use NO MORE THAN THREE WORDS from the passage for each answer.",
    "questions": [
        // EACH QUESTION HAS AN INPUT AFTER IT
        "question 1",
        "question 2",
        "question 3",
        // ... could be more or less questions
    ]
}
```


## 13. note_completion question structure
```json
{
    "id": [number],
    "passage_id": [number],
    "type": "note_completion",
    "instruction": "Complete the notes below. Use NO MORE THAN THREE WORDS for each answer.",
    "title_of_notes": "[title_of_notes] EX: Voltaic pile",
    "notes": [
        "consisted of pile of discs made of two types of 36..........",
        "discs separated by pieces of 37.......... soaked in salt water",
        "linking top and bottom of pile with a 38.......... created a 39..........",
        "was soon used to separate 40.......... into constituent elements"
    ]
    // each blank is an input field that the user needs to fill in
},
```



# Actual structure of the READING_TASK_OBJECT
```json
{
    "id": 1,
    "module": "academic",
    "title": "[TITLE]",
    "topic": "[TOPIC]",
    "total_questions": 40, // always the same
    "total_passages": 3, // always the same
    "passages": [
        {
            "passage_id": 1,
            "title": "[TITLE]",
            "topic": "[TOPIC]",
            "text": "For over a century, ... \n\n ... \n\n was essentially immutable—a fixed network of neural.",
            "question_range": "[QUESTION_RANGE]", // can be different range: 1-13 ... 1-10 ...
            "questions": [
                // [question_range] count of DIFFERENT QUESTION TYPE OBJECTS
            ]
        },
        {
            "passage_id": 2,
            "title": "[TITLE]",
            "topic": "[TOPIC]",
            "text": "For over a century, ... \n\n ... \n\n was essentially immutable—a fixed network of neural.",
            "question_range": "[QUESTION_RANGE]", // can be different range: 13-25 ... 13-30 ...
            "questions": [
                // [question_range] count of DIFFERENT QUESTION TYPE OBJECTS
            ]
        },
        {
            "passage_id": 3,
            "title": "[TITLE]",
            "topic": "[TOPIC]",
            "text": "The translation of fundamental neuroplasticity \n\n research into clinical practice represents ",
            "question_range": "[QUESTION_RANGE]", // can be different range: 25-40 ... 30-40 ...
            "questions": [
                // [question_range] count of DIFFERENT QUESTION TYPE OBJECTS
            ]
        }
    ],
    "metadata": {
        "timeLimit": 60,
        "skills": [ "skill 1", "skill 2", "... could be more or less skills depending on the passage" ]
    }
}
```


### NOTE:
```txt
ALL CORRECT ANSWERS ARE IN ANOTHER FILE CALLED 'advanced_reading_answers.json'
RELATIVE PATH: 'src\store\data\practice\language\english\reading\advanced_reading_answers.json'
```