import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { IoChevronDown, IoCheckmark } from 'react-icons/io5';
import './CustomSelect.scss';

const CustomSelect = ({ 
  value, 
  selectedValue, // Support both value and selectedValue for backward compatibility
  onChange, 
  options = [], 
  placeholder = '', 
  className = '', 
  disabled = false,
  size = 'medium',
  variant = 'default'
}) => {
  // Use selectedValue if provided, otherwise fall back to value
  const currentValue = selectedValue !== undefined ? selectedValue : value;
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0, maxHeight: 0 });
  const selectRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const dropdownRef = useRef(null);
  const rafIdRef = useRef(null);
  const lastPositionRef = useRef({ top: 0, left: 0, width: 0, maxHeight: 0 });
  const lastScrollYRef = useRef(0);
  const { t } = useTranslation();

  // Detect mobile devices
  const isMobileRef = useRef(false);
  useEffect(() => {
    const checkMobile = () => {
      isMobileRef.current = window.innerWidth <= 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile, { passive: true });
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Update position when dropdown opens or window resizes/scrolls with RAF throttling
  useEffect(() => {
    if (!isOpen || !triggerRef.current) {
      // Reset scroll tracking when dropdown closes
      lastScrollYRef.current = 0;
      return;
    }

    // Track initial scroll position when dropdown opens
    lastScrollYRef.current = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;

    // Calculate dropdown position based on trigger element
    const updateDropdownPosition = () => {
      if (!triggerRef.current) return;

      const rect = triggerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      // Use visualViewport API on mobile for accurate viewport height (accounts for keyboard, browser UI)
      const viewportHeight = isMobileRef.current && window.visualViewport 
        ? window.visualViewport.height 
        : window.innerHeight;
      const isMobile = isMobileRef.current;
      
      // Safe area insets are handled via CSS env() variables
      // Use conservative padding values that account for safe areas
      // iOS safe areas are typically 0-44px, so we use 8px padding which works well
      const safeAreaPadding = isMobile ? 8 : 4;
      const mobilePadding = safeAreaPadding;
      
      // Calculate available space above and below trigger
      const spaceBelow = viewportHeight - rect.bottom - mobilePadding;
      const spaceAbove = rect.top - mobilePadding;
      
      // Determine if dropdown should be positioned above or below trigger
      const positionAbove = spaceBelow < 200 && spaceAbove > spaceBelow;
      
      // Calculate maximum dropdown height based on available space
      // Reserve minimum space for padding and ensure dropdown never exceeds viewport
      const minReservedSpace = isMobile ? 16 : 8; // Minimum padding top and bottom
      let maxDropdownHeight;
      
      if (positionAbove) {
        // When positioned above, use space above minus padding
        maxDropdownHeight = Math.max(150, spaceAbove - minReservedSpace);
      } else {
        // When positioned below, use space below minus padding
        maxDropdownHeight = Math.max(150, spaceBelow - minReservedSpace);
      }
      
      // Cap maximum height to reasonable values
      const absoluteMaxHeight = isMobile ? 400 : 300;
      maxDropdownHeight = Math.min(maxDropdownHeight, absoluteMaxHeight);
      
      // Calculate initial position
      let top;
      if (positionAbove) {
        // Position above trigger
        top = rect.top - maxDropdownHeight - 4;
        // Ensure it doesn't go above viewport
        if (top < mobilePadding) {
          top = mobilePadding;
          // Recalculate max height if we hit the top
          maxDropdownHeight = rect.top - top - 4;
        }
      } else {
        // Position below trigger
        top = rect.bottom + 4;
        // Ensure dropdown doesn't go below viewport
        const maxTop = viewportHeight - maxDropdownHeight - mobilePadding;
        if (top > maxTop) {
          top = Math.max(mobilePadding, maxTop);
          // Recalculate max height if we hit the bottom
          maxDropdownHeight = viewportHeight - top - mobilePadding;
        }
      }
      
      let left = rect.left;
      let width = rect.width;
      
      // Ensure dropdown doesn't overflow right edge
      const maxLeft = viewportWidth - width - mobilePadding;
      if (left > maxLeft) {
        left = Math.max(mobilePadding, maxLeft);
      }
      
      // Ensure dropdown doesn't overflow left edge
      const minLeft = mobilePadding;
      if (left < minLeft) {
        left = minLeft;
        // Adjust width if needed to prevent overflow
        const maxWidth = viewportWidth - left - mobilePadding;
        if (width > maxWidth) {
          width = maxWidth;
        }
      }
      
      const newPosition = {
        top: Math.max(mobilePadding, top),
        left: Math.max(mobilePadding, left),
        width: Math.min(width, viewportWidth - (mobilePadding * 2)),
        maxHeight: Math.max(150, maxDropdownHeight) // Ensure minimum height for usability
      };

      // Only update state if position actually changed (prevents unnecessary re-renders)
      const lastPos = lastPositionRef.current;
      const hasChanged = 
        Math.abs(newPosition.top - lastPos.top) > 0.5 ||
        Math.abs(newPosition.left - lastPos.left) > 0.5 ||
        Math.abs(newPosition.width - lastPos.width) > 0.5 ||
        Math.abs(newPosition.maxHeight - lastPos.maxHeight) > 0.5;

      if (hasChanged) {
        lastPositionRef.current = newPosition;
        setDropdownPosition(newPosition);
      }
    };

    // RAF-throttled update function
    const requestTick = () => {
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(() => {
          updateDropdownPosition();
          rafIdRef.current = null;
        });
      }
    };

    // Initial position update
    updateDropdownPosition();

    // Throttled scroll handler
    const handleScroll = () => {
      requestTick();

      // On mobile, close dropdown on significant scroll (better UX)
      if (isMobileRef.current) {
        const currentScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
        const scrollDelta = Math.abs(currentScrollY - lastScrollYRef.current);
        
        // Close dropdown if user scrolled more than 50px
        if (scrollDelta > 50) {
          setIsOpen(false);
          setFocusedIndex(-1);
          return;
        }
      }
    };

    const handleResize = () => requestTick();
    
    // Handle visualViewport changes on mobile (keyboard show/hide, browser UI changes)
    const handleVisualViewportResize = () => {
      if (isMobileRef.current) {
        requestTick();
      }
    };

    // Add passive listeners for better mobile performance
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Listen to visualViewport changes on mobile for accurate height tracking
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportResize, { passive: true });
      window.visualViewport.addEventListener('scroll', handleVisualViewportResize, { passive: true });
    }

    return () => {
      // Cancel any pending RAF
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      
      // Remove visualViewport listeners
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewportResize);
        window.visualViewport.removeEventListener('scroll', handleVisualViewportResize);
      }
    };
  }, [isOpen]);

  // Close dropdown when clicking outside (supports both mouse and touch)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        selectRef.current && 
        !selectRef.current.contains(event.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      // Use setTimeout to avoid closing immediately on open click
      setTimeout(() => {
        // Support both mouse and touch events for better mobile compatibility
        document.addEventListener('mousedown', handleClickOutside, { passive: true });
        document.addEventListener('touchstart', handleClickOutside, { passive: true });
      }, 0);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (event) => {
    if (disabled) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (isOpen && focusedIndex >= 0) {
          handleOptionClick(options[focusedIndex]);
        } else {
          setIsOpen(!isOpen);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setFocusedIndex(prev => 
            prev < options.length - 1 ? prev + 1 : 0
          );
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setFocusedIndex(prev => 
            prev > 0 ? prev - 1 : options.length - 1
          );
        }
        break;
      case 'Tab':
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
    }
  };

  // Scroll focused option into view
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && listRef.current) {
      const focusedElement = listRef.current.children[focusedIndex];
      if (focusedElement) {
        focusedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [focusedIndex, isOpen]);

  const handleOptionClick = (option) => {
    onChange(option.value);
    setIsOpen(false);
    setFocusedIndex(-1);
  };

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      setFocusedIndex(-1);
    }
  };

  const selectedOption = options.find(option => option.value === currentValue);

  return (
    <div 
      ref={selectRef}
      className={`custom-select ${className} ${size} ${variant} ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
      role="combobox"
      aria-expanded={isOpen}
      aria-haspopup="listbox"
      aria-label={placeholder}
    >
      <div 
        ref={triggerRef}
        className="select-trigger"
        onClick={handleToggle}
        role="button"
        aria-label={`${placeholder}: ${selectedOption?.label || ''}`}
      >
        <span className="select-value">
          {selectedOption ? (
            <span className="selected-text">
              {selectedOption.icon && (
                <span className="option-icon">{selectedOption.icon}</span>
              )}
              {selectedOption.label}
            </span>
          ) : (
            <span className="placeholder">{placeholder}</span>
          )}
        </span>
        <IoChevronDown className={`chevron-icon ${isOpen ? 'rotated' : ''}`} />
      </div>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
          ref={dropdownRef}
          className="select-dropdown select-dropdown-portal" 
          role="listbox"
          style={{
            position: 'fixed',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            maxHeight: `${dropdownPosition.maxHeight}px`,
            zIndex: 10000
          }}
        >
          <div ref={listRef} className="select-options">
            {options.map((option, index) => (
              <div
                key={option.value}
                className={`select-option ${index === focusedIndex ? 'focused' : ''} ${option.value === currentValue ? 'selected' : ''}`}
                onClick={() => handleOptionClick(option)}
                role="option"
                aria-selected={option.value === currentValue}
                tabIndex={-1}
              >
                <span className="option-content">
                  {option.icon && (
                    <span className="option-icon">{option.icon}</span>
                  )}
                  <span className="option-label">{option.label}</span>
                </span>
                {option.value === currentValue && (
                  <IoCheckmark className="check-icon" />
                )}
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default CustomSelect;