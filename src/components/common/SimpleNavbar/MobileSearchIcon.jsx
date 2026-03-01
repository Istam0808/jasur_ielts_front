import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { getSubjects } from '@/utils/subjectsUtils';
import { FaLaptopCode, FaTimes, FaSearch } from 'react-icons/fa';
import { getVideoLessonCount, getAvailableLocales, subjectTitleToKey } from '@/app/subjects/computerScience/editor/lessonData';
import './SearchContainer.scss';

function MobileSearchIcon({ onSearchFocusChange }) {
    const { t } = useTranslation(['common', 'subjects']);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const searchRef = useRef(null);
    const inputRef = useRef(null);
    const resultsContainerRef = useRef(null);
    const router = useRouter();

    // Notify parent component when search focus changes
    useEffect(() => {
        if (onSearchFocusChange) {
            onSearchFocusChange(isSearchFocused);
        }
    }, [isSearchFocused, onSearchFocusChange]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setIsSearchFocused(false);
                setIsExpanded(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isSearchFocused) {
            setIsExpanded(true);
            // Focus the input after expansion animation
            setTimeout(() => {
                inputRef.current?.focus();
            }, 200);
        } else {
            setIsExpanded(false);
        }
    }, [isSearchFocused]);

    const subjects = getSubjects();

    const createSlug = (title) => {
        if (!title || typeof title !== 'string') return '';

        return title
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '-');
    };

    // Icon for computer science subjects (no SVG assets)
    const getSubjectIcon = (title) => <FaLaptopCode size={20} />;

    const allCourses = useMemo(() => {
        const courses = [];
        if (subjects[0]?.id === 'languages') {
            const languageSubject = subjects[0];
            if (languageSubject.languages && Array.isArray(languageSubject.languages)) {
                languageSubject.languages.forEach(language => {
                    if (language && language.title) {
                        courses.push({
                            id: language.id?.toString() || '',
                            title: language.title,
                            slug: createSlug(language.title),
                            type: 'language',
                            parentId: 'languages',
                            icon: languageSubject.icon,
                            parentTitle: 'Languages',
                            levels: language.levels?.length || 0
                        });
                    }
                });
            }
        }

        if (subjects[1]) {
            const computerCourses = subjects[1];
            Object.values(computerCourses).forEach(course => {
                if (course && typeof course === 'object' && course.title) {
                    const lessonKey = subjectTitleToKey[course.title];
                    const videoCount = lessonKey ? getVideoLessonCount(lessonKey) : 0;
                    const locales = lessonKey ? getAvailableLocales(lessonKey) : [];
                    
                    courses.push({
                        id: course.id?.toString() || '',
                        title: course.title,
                        slug: createSlug(course.title),
                        type: 'computer',
                        parentId: 'computerScience',
                        icon: getSubjectIcon(course.title),
                        videoLessonsCount: videoCount,
                        availableLocales: locales,
                        parentTitle: 'Computer Science'
                    });
                }
            });
        }

        return courses;
    }, [subjects]);

    const filteredCourses = useMemo(() => {
        if (!searchQuery.trim()) return [];

        const query = searchQuery.toLowerCase().trim();

        const filtered = allCourses.filter(course =>
            course?.title?.toLowerCase().includes(query)
        );

        return filtered.slice(0, 5);
    }, [searchQuery, allCourses]);

    useEffect(() => {
        setHighlightedIndex(-1);
    }, [searchQuery]);

    const handleKeyDown = (e) => {
        if (!isSearchFocused || filteredCourses.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex(prevIndex => (prevIndex + 1) % filteredCourses.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex(prevIndex => (prevIndex - 1 + filteredCourses.length) % filteredCourses.length);
        } else if (e.key === 'Enter' && highlightedIndex > -1) {
            e.preventDefault();
            const course = filteredCourses[highlightedIndex];
            if (course) {
                router.push(`/subjects/${course.parentId}/${course.slug}`);
                setIsSearchFocused(false);
                setSearchQuery('');
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setIsSearchFocused(false);
            setSearchQuery('');
        }
    };

    const clearSearch = () => {
        setSearchQuery('');
        setIsSearchFocused(false);
        setHighlightedIndex(-1);
    };

    const handleIconClick = () => {
        setIsSearchFocused(true);
    };

    useEffect(() => {
        if (resultsContainerRef.current && highlightedIndex > -1) {
            const element = resultsContainerRef.current.children[highlightedIndex];
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }, [highlightedIndex]);

    return (
        <div className="mobile-search-icon-container" ref={searchRef}>
            {/* Search Icon Button */}
            <button
                className={`search-icon-button ${isExpanded ? 'expanded' : ''}`}
                onClick={handleIconClick}
                aria-label="Open search"
                type="button"
            >
                <FaSearch className="search-icon" />
            </button>

            {/* Expandable Search Input */}
            <div className={`search-input-expandable ${isExpanded ? 'expanded' : ''}`}>
                <div className="search-input-wrapper">
                    <FaSearch className="search-icon-input" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder={t('common:nav.search')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        onKeyDown={handleKeyDown}
                        className="search-input"
                    />
                    {searchQuery && (
                        <button
                            className="clear-search-btn"
                            onClick={clearSearch}
                            type="button"
                            aria-label="Clear search"
                        >
                            <FaTimes />
                        </button>
                    )}
                </div>
            </div>

            {/* Search Results */}
            {isSearchFocused && searchQuery.trim() && (
                <div className="search-results" ref={resultsContainerRef}>
                    {filteredCourses.length > 0 ? (
                        filteredCourses.map((course, index) => (
                            <Link
                                key={`${course.type}-${course.id}`}
                                href={`/subjects/${course.parentId}/${course.slug}`}
                                className={`search-result-item ${index === highlightedIndex ? 'highlighted' : ''}`}
                                onClick={() => {
                                    setIsSearchFocused(false);
                                    setSearchQuery('');
                                }}
                                onMouseEnter={() => setHighlightedIndex(index)}
                            >
                                <div className="course-info">
                                    <span className="course-title">{course.title}</span>
                                    <span className="course-category">
                                        {course.parentTitle}
                                    </span>
                                    {course.type === 'language' && course.levels > 0 && (
                                        <span className="course-details">
                                            {course.levels} levels
                                        </span>
                                    )}
                                    {course.type === 'computer' && course.videoLessonsCount > 0 && (
                                        <span className="course-details">
                                            {course.videoLessonsCount} video lessons
                                            {course.availableLocales && course.availableLocales.length > 0 && (
                                                <span className="locale-indicators">
                                                    {course.availableLocales.map(locale => (
                                                        <span 
                                                            key={locale} 
                                                            className="locale-dot"
                                                            title={locale.toUpperCase()}
                                                            data-locale={locale}
                                                        />
                                                    ))}
                                                </span>
                                            )}
                                        </span>
                                    )}
                                </div>
                                {course.icon && (
                                    <div className="course-icon">
                                        {course.icon}
                                    </div>
                                )}
                            </Link>
                        ))
                    ) : (
                        <div className="no-results">
                            <span className="no-results-text">{t('common:nav.noResults')}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default MobileSearchIcon; 