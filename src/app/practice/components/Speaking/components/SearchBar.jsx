// ============================================
"use client"

import { memo, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FaSearch } from 'react-icons/fa';
import styles from '../styles/SearchBar.module.scss';

/**
 * SearchBar Component
 * Provides search input functionality with i18n support
 * Memoized to prevent unnecessary re-renders
 * 
 * @param {Function} onSearch - Callback fired when search query changes
 */
const SearchBar = memo(({ onSearch }) => {
    // ============================================
    // HOOKS
    // ============================================
    
    // Translation hook - namespace 'shadowing' from i18n config
   const { t } = useTranslation('speaking');
    
    // Local state for controlled input
    const [searchQuery, setSearchQuery] = useState('');

    // ============================================
    // MEMOIZED VALUES
    // ============================================
    
    /**
     * Memoized placeholder text with translation
     * Only recalculates when translation function changes
     * Used in both placeholder and aria-label for consistency
     */
    const searchPlaceholder = useMemo(() => 
        t('menu.shadowing.library.search.placeholder'), // "Search videos..." in current language
        [t]
    );

  
     
    const handleInputChange = useCallback((e) => {
        const value = e.target.value;
        setSearchQuery(value); // Update local state for controlled input
        onSearch(value); // Immediately notify parent of change
    }, [onSearch]);

    // ============================================
    // RENDER
    // ============================================
    
    return (
        <div 
            className={styles['search-bar']}
            role="search" // Semantic HTML for accessibility
        >
            {/* Input wrapper for positioning search icon */}
            <div className={styles['search-bar__input-wrapper']}>
                {/* Search icon - purely decorative */}
                <FaSearch
                    className={styles['search-bar__icon']}
                    aria-hidden="true" // Hide from screen readers (decorative)
                />
                
                {/* Search input field */}
                <input
                    type="text"
                    className={styles['search-bar__input']}
                    placeholder={searchPlaceholder} // Translated placeholder
                    value={searchQuery} // Controlled component
                    onChange={handleInputChange}
                    aria-label={searchPlaceholder} // Accessibility label for screen readers
                    autoComplete="off" // Disable browser autocomplete
                    spellCheck="false" // Disable spell check for better UX with video titles
                />
            </div>
        </div>
    );
});

// Display name for React DevTools
SearchBar.displayName = 'SearchBar';

export default SearchBar;