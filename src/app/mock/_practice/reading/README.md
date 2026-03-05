# Reading Page Full-Screen Mode

## Overview

The reading page now includes a distraction-free full-screen mode that allows users to focus entirely on the reading passage and questions without any UI distractions.

## Features

### Full-Screen Mode
- **Distraction-free reading**: Hides all UI elements except essential controls
- **Complete functionality**: Includes both reading passage and questions
- **Clean typography**: Optimized font sizes and spacing for better readability
- **Keyboard shortcuts**: Quick access and exit using keyboard
- **Progress tracking**: Minimal progress indicator in full-screen mode
- **Timer support**: Centered timer in header for better visibility
- **Text highlighting**: Preserves text selection and highlighting features
- **Submit functionality**: Full test submission capability in full-screen mode

### Controls

#### Enter Full-Screen Mode
- Click the "Full-screen" button in the header
- Press `F11` key
- Press `Ctrl + F` (Windows/Linux) or `Cmd + F` (Mac)

#### Exit Full-Screen Mode
- Click the "Exit full-screen" button
- Press `Esc` key
- Press `F11` key again

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `F11` | Toggle full-screen mode |
| `Ctrl + F` | Toggle full-screen mode |
| `Esc` | Exit full-screen mode |

### UI Elements in Full-Screen Mode

#### Visible Elements
- **Minimal header**: Title, word count, exit button, and centered timer
- **Reading passage**: Left panel with optimized typography
- **Questions section**: Right panel with all questions and answer options
- **Submit button**: Bottom section with test submission controls
- **Progress indicator**: Bottom-left corner
- **Keyboard shortcuts hint**: Bottom-right corner

#### Hidden Elements
- Navigation header
- Progress bar
- Resizable columns divider
- All other UI controls

### Layout Structure

#### Desktop Layout
- **Header**: Three-column layout with exit button, centered title, and centered timer
- **Content**: Two-column layout with passage on left and questions on right
- **Footer**: Submit button section at bottom

#### Mobile Layout
- **Header**: Stacked layout with exit button, title, and timer
- **Content**: Single-column layout with passage above questions
- **Footer**: Submit button section at bottom

### Responsive Design

The full-screen mode is fully responsive and optimized for:
- **Desktop**: Large screens with side-by-side passage and questions
- **Tablet**: Medium screens with adjusted spacing
- **Mobile**: Small screens with stacked layout and touch-friendly controls

### Accessibility

- **Screen reader support**: Proper ARIA labels and roles
- **Keyboard navigation**: Full keyboard accessibility
- **Focus management**: Clear focus indicators
- **High contrast**: Maintains readability in all conditions

### Technical Implementation

#### State Management
- Uses React state to track full-screen mode
- Preserves all existing functionality
- Maintains text highlighting and selection
- Preserves question answering functionality

#### CSS Features
- Fixed positioning for full-screen overlay
- Flexbox layout for responsive design
- Backdrop blur effects for modern UI
- Smooth transitions and animations
- iOS-specific optimizations

#### Performance
- Optimized rendering for large text passages
- Efficient event handling
- Minimal re-renders
- Separate scrolling for passage and questions

## Usage Guidelines

1. **For complete reading exercises**: Use full-screen mode to read and answer questions without distractions
2. **For timed exercises**: Timer is prominently displayed in the center of the header
3. **For text analysis**: Text highlighting works in full-screen mode
4. **For accessibility**: All accessibility features are preserved
5. **For mobile users**: Optimized touch interface with stacked layout

## Browser Support

- **Chrome**: Full support
- **Firefox**: Full support
- **Safari**: Full support with iOS optimizations
- **Edge**: Full support

## Future Enhancements

- Auto-hide controls after inactivity
- Customizable font size in full-screen mode
- Reading mode with different color themes
- Integration with system full-screen API
- Split-screen mode for very large displays
- Question navigation shortcuts 