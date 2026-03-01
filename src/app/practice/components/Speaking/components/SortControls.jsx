"use client"

import { memo, useCallback, useMemo, useTransition } from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../styles/SortControls.module.scss';

const SortControls = memo(({ onSortChange, sortBy = 'All' }) => {
    const { t } = useTranslation('speaking');
    
    // 🚀 KEY FIX: Use useTransition for non-blocking updates
    const [isPending, startTransition] = useTransition();

    // Cache sort options
    const sortOptions = useMemo(() => [
        { 
            value: 'All', 
            label: t('menu.shadowing.library.sort.all')
        },
        { 
            value: 'Beginner', 
            label: t('menu.shadowing.library.sort.beginner')
        },
        { 
            value: 'Intermediate', 
            label: t('menu.shadowing.library.sort.intermediate')
        },
        { 
            value: 'Advanced', 
            label: t('menu.shadowing.library.sort.advanced')
        }
    ], [t]);

    // 🚀 KEY FIX: Wrap sort change in transition
    const handleSortChange = useCallback((e) => {
        const value = e.target.value;
        startTransition(() => {
            onSortChange(value);
        });
    }, [onSortChange]);

    return (
        <div 
            className={styles['sort-controls']} 
            role="group"
            aria-label={t('menu.shadowing.library.sort.all')}
            style={{ opacity: isPending ? 0.7 : 1 }} // Visual feedback
        >
            <select
                id="sort-select"
                className={styles['sort-controls__select']}
                value={sortBy}
                onChange={handleSortChange}
                aria-label={t('menu.shadowing.library.sort.all')}
            >
                {sortOptions.map(({ value, label }) => (
                    <option key={value} value={value}>
                        {label}
                    </option>
                ))}
            </select>
        </div>
    );
});

SortControls.displayName = 'SortControls';

export default SortControls;