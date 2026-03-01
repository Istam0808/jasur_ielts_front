# Report Issue Modal - Usage Guide

A professional, reusable modal component for reporting issues across the application.

## Features

- ✅ Multiple issue type categorization (Bug, Content, Typo, UI/UX, Performance, Other)
- ✅ Priority level selection (Low, Medium, High)
- ✅ Form validation with helpful error messages
- ✅ Optional email for follow-up
- ✅ Context-aware reporting (captures page, section, and relevant metadata)
- ✅ Professional design matching the grammar-learn page aesthetic
- ✅ Fully responsive (mobile, tablet, desktop)
- ✅ Accessibility features (ARIA labels, keyboard navigation)
- ✅ Success state with report ID
- ✅ Loading states during submission

## Installation

The component is already available in the common components directory:

```javascript
import ReportIssueModal from '@/components/common/ReportIssueModal';
```

## Basic Usage

```jsx
import React, { useState } from 'react';
import ReportIssueModal from '@/components/common/ReportIssueModal';
import * as Icons from 'react-icons/fi';

function MyComponent() {
  const [isReportIssueOpen, setIsReportIssueOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsReportIssueOpen(true)}>
        <Icons.FiFlag />
        Report Issue
      </button>

      <ReportIssueModal
        isOpen={isReportIssueOpen}
        onClose={() => setIsReportIssueOpen(false)}
      />
    </>
  );
}
```

## Advanced Usage with Context

Provide context information to help with issue tracking:

```jsx
<ReportIssueModal
  isOpen={isReportIssueOpen}
  onClose={() => setIsReportIssueOpen(false)}
  context={{
    page: 'Grammar Learn',
    topic: 'Present Perfect Tense',
    section: 'Practice Exercises',
    level: 'B1',
    topicId: 'grammar-present-perfect',
    userId: user?.id,
    // Add any other relevant context
  }}
/>
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `isOpen` | boolean | Yes | - | Controls the modal visibility |
| `onClose` | function | Yes | - | Callback when modal is closed |
| `context` | object | No | `{}` | Additional context information for the report |

### Context Object

The `context` object can include any relevant information that helps with issue resolution:

```javascript
{
  page: string,          // Current page/section name
  topic: string,         // Topic or module name
  section: string,       // Specific section within the page
  level: string,         // Difficulty level or user level
  topicId: string,       // Unique identifier for the topic
  userId: string,        // User ID (if available)
  // ... any other relevant data
}
```

## Form Fields

### Issue Type (Required)
6 predefined categories with visual icons:
- **Bug / Error** - Technical issues or errors
- **Content Issue** - Problems with educational content
- **Typo / Grammar** - Text errors
- **UI/UX Problem** - Interface or user experience issues
- **Performance** - Speed or loading issues
- **Other** - Anything not covered above

### Subject (Required)
- Brief summary of the issue
- Character limit: 100 characters
- Minimum length: 5 characters

### Description (Required)
- Detailed explanation of the issue
- Character limit: 1000 characters
- Minimum length: 20 characters

### Priority Level
- **Low** - Minor issues that don't affect functionality
- **Medium** - Issues that impact user experience (default)
- **High** - Critical issues requiring immediate attention

### Email (Optional)
- Receive updates about the reported issue
- Must be a valid email format

## Styling

The component uses SCSS modules with design tokens from the grammar-learn page:

```scss
@use '@/assets/styles/_settings' as *;
@use '@/assets/styles/_mixins' as *;
```

### Customization

If you need to override styles, you can target the component with CSS:

```scss
// Custom styles for specific pages
.myPage {
  :global(.reportContent) {
    // Your custom styles
  }
}
```

## Integration Examples

### Example 1: Header/Navigation Bar

```jsx
import ReportIssueModal from '@/components/common/ReportIssueModal';

function Header() {
  const [isReportOpen, setIsReportOpen] = useState(false);
  
  return (
    <header>
      <button onClick={() => setIsReportOpen(true)}>
        Report Issue
      </button>
      
      <ReportIssueModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        context={{ page: 'Header' }}
      />
    </header>
  );
}
```

### Example 2: Settings/Help Menu

```jsx
function SettingsMenu() {
  const [isReportOpen, setIsReportOpen] = useState(false);
  
  return (
    <div className={styles.settingsMenu}>
      <button onClick={() => setIsReportOpen(true)}>
        <Icons.FiFlag />
        <span>Report a Problem</span>
      </button>
      
      <ReportIssueModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        context={{
          page: 'Settings',
          userPreferences: getUserPreferences()
        }}
      />
    </div>
  );
}
```

### Example 3: Floating Action Button

```jsx
function FloatingReportButton() {
  const [isReportOpen, setIsReportOpen] = useState(false);
  const pathname = usePathname();
  
  return (
    <>
      <button 
        className={styles.fab}
        onClick={() => setIsReportOpen(true)}
        aria-label="Report an issue"
      >
        <Icons.FiFlag />
      </button>
      
      <ReportIssueModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        context={{
          page: pathname,
          timestamp: new Date().toISOString()
        }}
      />
    </>
  );
}
```

## Backend Integration

Currently, the component logs the report to the console. To integrate with a backend:

1. Update the `handleSubmit` function in `index.jsx`
2. Replace the simulated API call with your actual endpoint:

```javascript
// In ReportIssueModal/index.jsx
const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!validateForm()) return;
  
  setIsSubmitting(true);
  
  try {
    const reportData = {
      ...formData,
      context: {
        page: context.page || window.location.pathname,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        ...context
      }
    };
    
    // Replace with your API endpoint
    const response = await fetch('/api/report-issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportData)
    });
    
    if (!response.ok) throw new Error('Failed to submit');
    
    setSubmitSuccess(true);
    setTimeout(() => handleClose(), 2000);
    
  } catch (error) {
    console.error('Error submitting report:', error);
    setErrors({ submit: 'Failed to submit report. Please try again.' });
  } finally {
    setIsSubmitting(false);
  }
};
```

## Accessibility

The component includes:
- Proper ARIA labels for all interactive elements
- Keyboard navigation support (Tab, Enter, Escape)
- Focus management
- Screen reader friendly error messages
- High contrast design for visibility

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Responsive design for all screen sizes

## Future Enhancements

Potential improvements for future versions:
- Screenshot capture and attachment
- Multi-language support (i18n)
- File attachment support
- Issue tracking integration
- Email notifications
- Real-time status updates

## Support

For questions or issues with this component, please refer to the main project documentation or contact the development team.

---

**Version:** 1.0.0  
**Last Updated:** October 2025  
**Author:** UnitSchool Development Team

