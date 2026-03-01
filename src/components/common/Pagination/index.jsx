"use client";

import { useTranslation } from 'react-i18next';
import { useState, useMemo } from 'react';
import { BiChevronLeft, BiChevronRight } from 'react-icons/bi';
import './style.scss';

/**
 * Parses a CSS color string to its RGB components.
 * Supports hex (#RGB, #RRGGBB) and rgb (rgb(r, g, b)) formats.
 * @param {string} colorStr - The color string to parse.
 * @returns {string|null} A string like "r, g, b" or null if parsing fails.
 */
const parseColorToRgb = (colorStr) => {
    if (!colorStr) return null;

    // Use the browser's engine to reliably parse the color
    const el = document.createElement('div');
    el.style.color = colorStr;

    // Append to body to force computation, then immediately remove
    document.body.appendChild(el);
    const computedColor = window.getComputedStyle(el).color;
    document.body.removeChild(el);
    
    const match = computedColor.match(/rgb\((\d+), (\d+), (\d+)\)/);
    if (match) {
        return `${match[1]}, ${match[2]}, ${match[3]}`;
    }

    return null;
};

/**
 * Helper to darken a hex color by a percentage
 * @param {string} hex - Hex color string (e.g. #564FFD)
 * @param {number} percent - Negative to darken, positive to lighten
 * @returns {string} - Darkened hex color
 */
function darkenColor(hex, percent) {
    if (!hex || !hex.startsWith('#')) return hex;
    let num = parseInt(hex.slice(1), 16);
    let amt = Math.round(2.55 * percent);
    let R = (num >> 16) + amt;
    let G = (num >> 8 & 0x00FF) + amt;
    let B = (num & 0x0000FF) + amt;
    return (
        '#' +
        (
            0x1000000 +
            (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
            (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
            (B < 255 ? (B < 1 ? 0 : B) : 255)
        )
            .toString(16)
            .slice(1)
    );
}

/**
 * Reusable Pagination Component
 * 
 * @param {Object} props - The component props
 * @param {number} props.currentPage - Current active page number
 * @param {number} props.totalPages - Total number of pages
 * @param {Function} props.onPageChange - Callback function when page changes
 * @param {number} props.totalItems - Total number of items
 * @param {number} props.itemsPerPage - Number of items per page
 * @param {number} props.startItem - Starting item number on current page
 * @param {number} props.endItem - Ending item number on current page
 * @param {string} props.namespace - Translation namespace (defaults to 'common')
 * @param {string} props.accentColor - Optional: Custom color for the active page
 * @param {boolean} props.showFirstLastButtons - Whether to show first and last page buttons
 * @param {boolean} props.showPageJumper - Whether to show the page jumper
 * @param {boolean|string} props.scrollTopOnClick - Whether to scroll to top on page change. Can be `true` or a CSS selector string.
 * @param {boolean} props.showInfo - Whether to show the item count information.
 * @param {string} props.infoText - Custom text to display in the info section.
 */
const Pagination = ({
    currentPage,
    totalPages,
    onPageChange,
    totalItems,
    itemsPerPage,
    startItem,
    endItem,
    namespace = 'common',
    accentColor,
    showFirstLastButtons = true,
    showPageJumper = true,
    scrollTopOnClick = false,
    showInfo = false,
    infoText = ''
}) => {
    const { t } = useTranslation(namespace);
    const [pageInput, setPageInput] = useState('');
    const [jumpToPage, setJumpToPage] = useState('');

    const containerStyle = useMemo(() => {
        if (!accentColor) return {};

        const rgb = parseColorToRgb(accentColor);
        // Compute a slightly darker color for gradients
        const accentColorDark = darkenColor(accentColor, -7); // -7% darker
        return {
            '--pagination-accent-color': accentColor,
            '--pagination-accent-color-dark': accentColorDark,
            '--pagination-accent-color-rgb': rgb,
        };
    }, [accentColor]);

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) {
            onPageChange(page);
            if (scrollTopOnClick) {
                if (typeof scrollTopOnClick === 'string') {
                    const element = document.querySelector(scrollTopOnClick);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                } else {
                    window.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });
                }
            }
        }
    };

    const handleGoToPage = () => {
        const pageNumber = parseInt(pageInput);
        if (pageNumber >= 1 && pageNumber <= totalPages) {
            handlePageChange(pageNumber);
            setPageInput('');
        }
    };

    const handlePageInputKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleGoToPage();
        }
    };

    const handlePageInputChange = (e) => {
        const value = e.target.value;
        // Only allow numeric input
        if (value === '' || /^\d+$/.test(value)) {
            setPageInput(value);
        }
    };

    const handleJumpSubmit = (e) => {
        e.preventDefault();
        const page = parseInt(jumpToPage, 10);
        if (!isNaN(page)) {
            handlePageChange(page);
            setJumpToPage(''); // Clear input after jumping
        }
    };

    const getPageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 5;

        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 4; i++) {
                    pages.push(i);
                }
                pages.push('...');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 3; i <= totalPages; i++) {
                    pages.push(i);
                }
            } else {
                pages.push(1);
                pages.push('...');
                for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                    pages.push(i);
                }
                pages.push('...');
                pages.push(totalPages);
            }
        }

        return pages;
    };

    if (totalPages <= 1) return null;

    return (
        <div className="pagination-container" style={containerStyle}>
            {showInfo && (
                <div className="pagination-info">
                    <span className="pagination-text">
                        {infoText || t('pagination.showing', {
                            start: startItem,
                            end: endItem,
                            total: totalItems,
                        })}
                    </span>
                </div>
            )}

            <nav className="pagination-nav" aria-label={t('pagination.navigation')}>
                <div className="pagination-controls">
                    {showFirstLastButtons && (
                            <button
                                className={`pagination-btn pagination-prev ${currentPage === 1 ? 'disabled' : ''}`}
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                aria-label={t('pagination.previous')}
                            >
                                <BiChevronLeft />
                                <span>{t('pagination.previous', 'Previous Page')}</span>
                            </button>
                    )}

                    <div className="pagination-numbers">
                        {getPageNumbers().map((page, index) => (
                            <button
                                key={index}
                                className={`pagination-number ${page === currentPage ? 'active' : ''
                                    } ${page === '...' ? 'ellipsis' : ''}`}
                                onClick={() => typeof page === 'number' && handlePageChange(page)}
                                disabled={page === '...'}
                                aria-label={typeof page === 'number' ? t('pagination.page', { page }) : undefined}
                                aria-current={page === currentPage ? 'page' : undefined}
                            >
                                {page}
                            </button>
                        ))}
                    </div>

                    {showFirstLastButtons && (
                        <button
                            className={`pagination-btn pagination-next ${currentPage === totalPages ? 'disabled' : ''}`}
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            aria-label={t('pagination.next')}
                        >
                            <span>{t('pagination.next', 'Next Page')}</span>
                            <BiChevronRight />
                        </button>
                    )}
                </div>

                {showPageJumper && totalPages >= 5 && (
                    <div className="pagination-goto">
                        <label htmlFor="page-input" className="pagination-goto-label">
                            {t('pagination.goToPage', 'Go to page')}:
                        </label>
                        <input
                            id="page-input"
                            type="text"
                            className="pagination-goto-input"
                            value={pageInput}
                            onChange={handlePageInputChange}
                            onKeyDown={handlePageInputKeyPress}
                            placeholder="1"
                            min="1"
                            max={totalPages}
                            aria-label={t('pagination.enterPageNumber', 'Enter page number')}
                        />
                        <button
                            className="pagination-goto-btn"
                            onClick={handleGoToPage}
                            disabled={!pageInput || parseInt(pageInput) < 1 || parseInt(pageInput) > totalPages}
                            aria-label={t('pagination.goToPageButton', 'Go to page')}
                        >
                            {t('pagination.go', 'Go')}
                        </button>
                    </div>
                )}
            </nav>
        </div>
    );
};

Pagination.defaultProps = {
    showFirstLastButtons: true,
    showPageJumper: true,
    scrollTopOnClick: false
};

export default Pagination; 