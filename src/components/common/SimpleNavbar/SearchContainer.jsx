import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { getSubjects } from '@/utils/subjectsUtils';
import { FaLaptopCode, FaTimes } from 'react-icons/fa';
import { getVideoLessonCount, getAvailableLocales, subjectTitleToKey } from '@/app/subjects/computerScience/editor/lessonData';
import './SearchContainer.scss';

function SearchContainer() {
    const { t } = useTranslation(['common', 'subjects']);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const searchRef = useRef(null);
    const resultsContainerRef = useRef(null);
    const router = useRouter();

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setIsSearchFocused(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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

    useEffect(() => {
        if (resultsContainerRef.current && highlightedIndex > -1) {
            const element = resultsContainerRef.current.children[highlightedIndex];
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }, [highlightedIndex]);

    return (
        <div className="search-container" ref={searchRef}>
            <div className="search-input-wrapper">
                <svg
                    className="search-icon"
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M9.16667 15.8333C12.8486 15.8333 15.8333 12.8486 15.8333 9.16667C15.8333 5.48477 12.8486 2.5 9.16667 2.5C5.48477 2.5 2.5 5.48477 2.5 9.16667C2.5 12.8486 5.48477 15.8333 9.16667 15.8333Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M17.5 17.5L13.875 13.875"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
                <input
                    type="text"
                    placeholder={t('common:nav.search')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onKeyDown={handleKeyDown}
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

export default SearchContainer;