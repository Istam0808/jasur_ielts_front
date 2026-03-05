# Question Types Styles - Modular Structure

This directory contains the modularized styles for IELTS reading question types. The styles have been refactored from a single large file into smaller, focused modules for better maintainability.

## File Structure

### Main Files
- `question-types.scss` - Main entry point that imports all modular files
- `_base.scss` - Common styles and shared question card styles
- `_multiple-choice.scss` - Multiple choice questions styles
- `_true-false.scss` - True/False/Not Given questions styles
- `_matching.scss` - Matching questions styles (headings, information, features)
- `_completion.scss` - Completion questions styles (summary, table, flow chart)
- `_short-answer.scss` - Advanced short answer questions styles
- `_responsive.scss` - Responsive design for all question types

### Other Files
- `readingProcess.scss` - Main reading page styles
- `readingContent.scss` - Reading content styles
- `fullscreenMode.scss` - Fullscreen mode styles
- `textHighlight.scss` - Text highlighting styles

## Usage

To use the question types styles, import the main file:

```scss
@use "./question-types";
```

## Variables

All files use variables from the global settings:
- `@use "@/assets/styles/settings" as *;` - For color, spacing, and typography variables
- `@use "@/assets/styles/mixins" as *;` - For mixins and utilities
- `@use "sass:color";` - For color manipulation functions

## Question Types Supported

1. **Multiple Choice Multiple** - `.multiple-choice-multiple-container`
2. **True/False/Not Given** - `.true-false-not-given-container`
3. **Matching Headings** - `.matching-headings-container`
4. **Matching Information** - `.matching-question-container`
5. **Matching Features** - `.matching-question-container`
6. **Completion Questions** - `.completion-question-container`
   - Summary completion
   - Table completion
   - Flow chart completion
7. **Advanced Short Answer** - `.advanced-short-answer-container`

## Common Classes

- `.reading-question-card` - Base question card container
- `.question-instruction` - Instruction text container
- `.option-item` - Individual option items
- `.feedback-correct` - Correct answer styling
- `.feedback-incorrect` - Incorrect answer styling
- `.answered` - Answered question styling
- `.review-mode` - Review mode styling

## Responsive Design

All question types are responsive with mobile-first approach:
- Mobile: `max-width: 768px`
- Tablet: `max-width: 1024px`
- Desktop: `max-width: 1400px`

## Best Practices

1. Always use variables from settings instead of hardcoded values
2. Use `color.adjust()` for color variations instead of deprecated functions
3. Follow the modular structure when adding new question types
4. Maintain consistent spacing and typography across all question types
5. Test responsive behavior on all breakpoints 