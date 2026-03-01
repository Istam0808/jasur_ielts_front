# Pagination Component

A reusable, fully-featured pagination component with comprehensive styling and accessibility support.

## Features

- **Responsive Design**: Adapts to different screen sizes with optimized layouts
- **Accessibility**: Full ARIA support with proper labels and navigation
- **Internationalization**: Supports multiple languages via i18next
- **Smart Page Numbers**: Intelligent ellipsis handling for large page counts
- **Go To Page**: Direct page navigation with input validation
- **Performance**: Optimized animations with `prefers-reduced-motion` support
- **Customizable**: Configurable translation namespace

## Usage

```jsx
import Pagination from '@/components/common/Pagination';

function MyComponent() {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalItems = 150;
  
  const paginationData = useMemo(() => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const startItem = totalItems > 0 ? startIndex + 1 : 0;
    const endItem = Math.min(endIndex, totalItems);

    return {
      totalPages,
      startItem,
      endItem
    };
  }, [totalItems, currentPage, itemsPerPage]);

  return (
    <div>
      {/* Your content here */}
      
      <Pagination
        currentPage={currentPage}
        totalPages={paginationData.totalPages}
        onPageChange={setCurrentPage}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        startItem={paginationData.startItem}
        endItem={paginationData.endItem}
        namespace="practice" // Optional: defaults to 'common'
      />
    </div>
  );
}
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `currentPage` | `number` | ✅ | - | Current active page number |
| `totalPages` | `number` | ✅ | - | Total number of pages |
| `onPageChange` | `function` | ✅ | - | Callback function when page changes |
| `totalItems` | `number` | ✅ | - | Total number of items |
| `itemsPerPage` | `number` | ✅ | - | Number of items per page |
| `startItem` | `number` | ✅ | - | Starting item number on current page |
| `endItem` | `number` | ✅ | - | Ending item number on current page |
| `namespace` | `string` | ❌ | `'common'` | Translation namespace for i18next |
| `accentColor` | `string` | ❌ | `null` | Optional: Custom CSS color (e.g., hex, rgb) for the active page |

## Translation Keys

The component uses the following translation keys (within the specified namespace):

```json
{
  "pagination": {
    "showing": "{{start}}-{{end}} of {{total}}",
    "previous": "Previous",
    "next": "Next",
    "page": "Page {{page}}",
    "navigation": "Pagination Navigation",
    "goToPage": "Go to page",
    "enterPageNumber": "Enter page number",
    "go": "Go"
  }
}
```

## Responsive Behavior

- **Desktop**: Full pagination with all controls visible
- **Tablet**: Optimized spacing and sizing
- **Mobile**: Compact layout with hidden text labels on small screens
- **Small Mobile**: Minimal spacing and smaller touch targets

## Accessibility Features

- **ARIA Labels**: Proper labeling for screen readers
- **Keyboard Navigation**: Full keyboard support
- **Focus Management**: Visible focus indicators
- **Page State**: Current page clearly indicated
- **Semantic HTML**: Uses proper `<nav>` and `<button>` elements

## Performance Optimizations

- **Reduced Motion**: Respects `prefers-reduced-motion` setting
- **GPU Acceleration**: Uses hardware acceleration for smooth animations
- **Optimized Renders**: Minimal re-renders with React.memo patterns

## Styling

The component uses SCSS with modern CSS features:
- CSS Grid and Flexbox for layout
- CSS Custom Properties for theming
- Backdrop filters for modern blur effects
- Smooth transitions and animations

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- IE11+ (with polyfills for CSS features)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Examples

### Basic Usage
```jsx
<Pagination
  currentPage={1}
  totalPages={10}
  onPageChange={(page) => console.log('Go to page:', page)}
  totalItems={100}
  itemsPerPage={10}
  startItem={1}
  endItem={10}
/>
```

### With Custom Translation Namespace
```jsx
<Pagination
  currentPage={currentPage}
  totalPages={totalPages}
  onPageChange={handlePageChange}
  totalItems={totalItems}
  itemsPerPage={ITEMS_PER_PAGE}
  startItem={startItem}
  endItem={endItem}
  namespace="practice"
/>
```

### With Custom Accent Color
```jsx
<Pagination
  currentPage={currentPage}
  totalPages={totalPages}
  onPageChange={handlePageChange}
  totalItems={totalItems}
  itemsPerPage={ITEMS_PER_PAGE}
  startItem={startItem}
  endItem={endItem}
  accentColor="#FF5733" // Use any valid CSS color
/>
```

## Migration from Inline Components

If you're migrating from an inline pagination component:

1. Remove the inline component code
2. Import the common Pagination component
3. Update the props to match the new interface
4. Ensure translation keys are available in your namespace
5. Update any custom styling if needed 