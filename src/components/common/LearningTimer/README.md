# Learning Timer Component

A sophisticated learning time tracking component that automatically monitors user activity during practice sessions and integrates with the User Data Mirror (UDM) system.

## Features

- **Automatic Tracking**: Starts automatically on practice pages
- **Activity Detection**: Monitors mouse, keyboard, scroll, and touch activity
- **Smart Timeout**: Stops after 5 minutes of inactivity
- **Page Visibility**: Pauses when browser tab is hidden
- **UDM Integration**: Syncs with authenticated user data
- **Guest Support**: Uses localStorage for unauthenticated users
- **Offline Queue**: Queues updates for background sync

## Data Structure

The component tracks learning hours with the following structure:

```json
{
  "learning_hours": {
    "2025-01-15": {
      "totalMinutes": 145,
      "sessions": [
        {
          "totalSpentMinutes": 90,
          "activity": "learning_practice",
          "startTime": "2025-01-15T10:00:00.000Z",
          "endTime": "2025-01-15T11:30:00.000Z"
        }
      ]
    }
  }
}
```

## Usage

### Basic Implementation

```jsx
import LearningTimer from '@/components/common/LearningTimer';

// Simple usage - automatically tracks time on practice pages
<LearningTimer isVisible={true} />
```

### Advanced Configuration

```jsx
<LearningTimer
  isVisible={true}
  showSessionTime={true}    // Show current session duration
  showTotalTime={true}      // Show daily total time
  className="custom-timer"  // Custom CSS classes
/>
```

### Using the Hook

For more control, use the `useLearningTimer` hook:

```jsx
import { useLearningTimer } from '@/hooks/useLearningTimer';

function PracticePage() {
  const {
    isActive,
    sessionDuration,
    dailyTotal,
    formattedSessionTime,
    formattedDailyTotal,
    manualStart,
    manualStop,
  } = useLearningTimer();

  return (
    <div>
      <h1>Practice Page</h1>
      
      {/* Timer automatically starts when component mounts */}
      <div>Session: {formattedSessionTime}</div>
      <div>Daily Total: {formattedDailyTotal}</div>
      
      {/* Manual controls if needed */}
      <button onClick={manualStart} disabled={isActive}>
        Start Session
      </button>
      <button onClick={manualStop} disabled={!isActive}>
        Stop Session
      </button>
    </div>
  );
}
```

## Integration Examples

### Grammar Practice Cards

```jsx
import { useLearningTimer } from '@/hooks/useLearningTimer';

function GrammarCard({ topicId }) {
  // Timer automatically starts when component mounts
  const { isActive } = useLearningTimer();
  
  return (
    <div className="grammar-card">
      <h3>Grammar Topic {topicId}</h3>
      {isActive && <div className="learning-indicator">Learning...</div>}
      {/* Card content */}
    </div>
  );
}
```

### Reading Practice

```jsx
function ReadingExercise() {
  const { isActive, formattedSessionTime } = useLearningTimer();
  
  return (
    <div className="reading-exercise">
      <div className="exercise-header">
        <h2>Reading Comprehension</h2>
        {isActive && (
          <div className="session-timer">
            Session: {formattedSessionTime}
          </div>
        )}
      </div>
      {/* Exercise content */}
    </div>
  );
}
```

### Vocabulary Practice

```jsx
function VocabularySession() {
  const { isActive, dailyTotal } = useLearningTimer();
  
  return (
    <div className="vocabulary-session">
      <div className="session-info">
        <h2>Vocabulary Practice</h2>
        <div className="learning-stats">
          <span>Daily Learning: {dailyTotal} minutes</span>
          {isActive && <span className="active-indicator">●</span>}
        </div>
      </div>
      {/* Vocabulary content */}
    </div>
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isVisible` | boolean | `false` | Whether to show the timer UI |
| `showSessionTime` | boolean | `true` | Show current session duration |
| `showTotalTime` | boolean | `true` | Show daily total time |
| `className` | string | `''` | Additional CSS classes |

## Hook Return Values

| Property | Type | Description |
|----------|------|-------------|
| `isActive` | boolean | Whether timer is currently active |
| `sessionStartTime` | number | Timestamp when session started |
| `sessionDuration` | number | Current session duration in seconds |
| `dailyTotal` | number | Total learning time for today in minutes |
| `formattedSessionTime` | string | Formatted session time (MM:SS) |
| `formattedDailyTotal` | string | Formatted daily total (e.g., "2h 30m") |
| `startSession` | function | Manually start a session |
| `stopSession` | function | Manually stop current session |
| `manualStart` | function | Alias for startSession |
| `manualStop` | function | Alias for stopSession |
| `updateActivity` | function | Manually update activity timestamp |

## Automatic Behavior

1. **Auto-start**: Timer automatically starts when visiting practice pages (`/practice` routes)
2. **Activity Monitoring**: Tracks user interactions every second
3. **Timeout Handling**: Stops after 5 minutes of inactivity
4. **Page Visibility**: Pauses when browser tab becomes hidden
5. **Cleanup**: Automatically stops and saves data when leaving practice pages

## Storage Strategy

- **Authenticated Users**: Data stored in UDM (IndexedDB) and synced to Firestore
- **Guest Users**: Data stored in localStorage
- **Offline Support**: Changes queued for background sync when network available

## Styling

The component uses SCSS modules with design tokens from `_settings.scss`. Key classes:

- `.learning-timer` - Main container
- `.learning-timer__session` - Session time display
- `.learning-timer__daily` - Daily total display
- `.learning-timer__status` - Active status indicator
- `.learning-timer__indicator` - Visual status dot

## Browser Support

- Modern browsers with IndexedDB support
- Mobile browsers with touch event support
- Graceful fallback to localStorage for older browsers

## Performance Considerations

- Activity monitoring uses passive event listeners
- Timer updates limited to 1-second intervals
- Efficient diffing for UDM updates
- Minimal re-renders with React.memo optimization

## Testing

Use the included demo component to test functionality:

```jsx
import LearningTimerDemo from '@/components/common/LearningTimer/demo';

// Add to any page for testing
<LearningTimerDemo />
```

## Troubleshooting

### Timer Not Starting
- Ensure you're on a practice page (`/practice` route)
- Check browser console for errors
- Verify UDM hook is properly imported

### Data Not Syncing
- Check authentication status
- Verify offline queue is working
- Check Firestore security rules

### Performance Issues
- Reduce activity monitoring frequency if needed
- Use `isVisible={false}` to hide UI while keeping tracking active
- Consider debouncing activity updates for high-frequency events
