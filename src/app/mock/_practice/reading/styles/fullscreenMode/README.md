# Fullscreen Mode Styles - Modular Structure

This directory contains the modularized fullscreen mode styles for the reading practice interface. The styles have been organized into logical modules for better maintainability and development experience.

## File Structure

```
fullscreenMode/
├── _index.scss          # Main entry point - imports all modules
├── _core.scss           # Core container and layout styles
├── _header.scss         # Header components (controls, title, timer, filter)
├── _content.scss        # Content sections (passage and questions)
├── _navigation.scss     # Navigation components (submit button, progress bar)
├── _utilities.scss      # Utilities and animations
└── README.md           # This documentation
```

## Module Descriptions

### `_index.scss`
Main entry point that imports all modular styles. Contains the shared imports for mixins, settings, and color utilities.

### `_core.scss`
- Fullscreen container layout and positioning
- Fullscreen toggle button styles
- Basic container properties and z-index management

### `_header.scss`
- Professional header with integrated filter
- Exit button, title, timer, and filter components
- Responsive design for mobile, tablet, and desktop
- Dropdown styling and interactions

### `_content.scss`
- Resizable content layout
- Passage content styling with custom scrollbars
- Questions section with compact card design
- Review mode styling for answered questions
- Responsive typography and spacing

### `_navigation.scss`
- Submit button with multiple states (ready, incomplete, disabled)
- Progress bar with question dots
- Arrow navigation for question dots
- Professional button styling with gradients

### `_utilities.scss`
- Keyboard shortcuts hint
- High DPI display optimizations
- Question highlight animation
- Mobile-specific utilities

## Usage

To use these styles, import the main index file:

```scss
@use "fullscreenMode";
```

Or import individual modules if needed:

```scss
@use "fullscreenMode/core";
@use "fullscreenMode/header";
@use "fullscreenMode/content";
@use "fullscreenMode/navigation";
@use "fullscreenMode/utilities";
```

## Key Features

- **Mobile-first responsive design** with breakpoints at 784px and 1024px
- **Professional UI/UX** with modern gradients and shadows
- **Accessibility focused** with proper focus states and ARIA support
- **Performance optimized** with efficient CSS selectors
- **Modular architecture** for easy maintenance and updates

## Responsive Breakpoints

- **Mobile**: < 784px
- **Tablet**: 784px - 1023px  
- **Desktop**: ≥ 1024px

## Color System

Uses the project's color variables from `_settings.scss`:
- `$primary-color` for main actions
- `$success-color` for completed states
- `$warning-color` for review mode
- `$danger-color` for incorrect answers
- `$neutral-*` for backgrounds and borders

## Animation System

- `$transition-fast` for quick interactions
- `$transition-normal` for standard transitions

## Browser Support

- Modern browsers with CSS Grid and Flexbox support
- Custom scrollbar styling for WebKit browsers
- High DPI display optimizations
- iOS compatibility with safe area considerations 