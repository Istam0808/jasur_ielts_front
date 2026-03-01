'use client';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { IoFilterOutline, IoCheckboxOutline, IoSquareOutline } from 'react-icons/io5';
import { MdExpandMore, MdExpandLess, MdFullscreenExit } from 'react-icons/md';
import {
    BsCircle,
    BsCheckCircle,
    BsCheckCircleFill,
    BsQuestionCircle,
    BsPencilSquare,
    BsFileText,
    BsTable,
    BsDiagram3,
    BsTags,
    BsArrowLeftRight,
    BsArrowsAngleExpand,
    BsListUl,
    BsCardText,
    BsFileEarmarkText
} from 'react-icons/bs';
import './../styles/QuestionTypeFilter.scss';

// Question type metadata with icons and display names
const QuestionTypeFilter = ({
    questions = [],
    selectedTypes = [],
    onFilterChange,
    onTimeAdjustment,
    originalTimeLimit,
    exitFullScreen,
    isFullScreen = false
}) => {
    const { t } = useTranslation('reading');
    const [isExpanded, setIsExpanded] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const filterRef = useRef(null);

    // Move QUESTION_TYPE_META inside the component to access t
    const QUESTION_TYPE_META = useMemo(() => ({
        multiple_choice: {
            icon: BsCircle,
            displayName: t('questionTypes.multipleChoiceSingle'),
            color: '#4F46E5',
            category: 'choice'
        },
        multiple_choice_multiple: {
            icon: BsCheckCircleFill,
            displayName: t('questionTypes.multipleChoiceMultiple'),
            color: '#7C3AED',
            category: 'choice'
        },
        true_false: {
            icon: BsCheckCircle,
            displayName: t('questionTypes.trueFalse'),
            color: '#059669',
            category: 'boolean'
        },
        true_false_not_given: {
            icon: BsQuestionCircle,
            displayName: t('questionTypes.trueFalseNotGiven'),
            color: '#0891B2',
            category: 'boolean'
        },
        yes_no_not_given: {
            icon: BsQuestionCircle,
            displayName: t('questionTypes.yesNoNotGiven'),
            color: '#0891B2',
            category: 'boolean'
        },
        short_answer: {
            icon: BsPencilSquare,
            displayName: t('questionTypes.shortAnswer'),
            color: '#DC2626',
            category: 'text'
        },
        sentence_completion: {
            icon: BsFileText,
            displayName: t('questionTypes.sentenceCompletion'),
            color: '#EA580C',
            category: 'completion'
        },
        summary_completion: {
            icon: BsCardText,
            displayName: t('questionTypes.summaryCompletion'),
            color: '#D97706',
            category: 'completion'
        },
        table_completion: {
            icon: BsTable,
            displayName: t('questionTypes.tableCompletion'),
            color: '#65A30D',
            category: 'completion'
        },
        flow_chart_completion: {
            icon: BsDiagram3,
            displayName: t('questionTypes.flowChartCompletion'),
            color: '#16A34A',
            category: 'completion'
        },
        diagram_labelling: {
            icon: BsTags,
            displayName: t('questionTypes.diagramLabelling'),
            color: '#0D9488',
            category: 'completion'
        },
        matching_headings: {
            icon: BsListUl,
            displayName: t('questionTypes.matchingHeadings'),
            color: '#0EA5E9',
            category: 'matching'
        },
        matching_information: {
            icon: BsArrowLeftRight,
            displayName: t('questionTypes.matchingInformation'),
            color: '#3B82F6',
            category: 'matching'
        },
        matching_features: {
            icon: BsArrowsAngleExpand,
            displayName: t('questionTypes.matchingFeatures'),
            color: '#6366F1',
            category: 'matching'
        }
    }), [t]);

    // Get available question types from the current test
    const availableTypes = useMemo(() => {
        const types = new Set();
        questions.forEach(question => {
            if (question.type && QUESTION_TYPE_META[question.type]) {
                types.add(question.type);
            }
        });
        return Array.from(types).sort();
    }, [questions]);

    // Group types by category
    const groupedTypes = useMemo(() => {
        const groups = {};
        availableTypes.forEach(type => {
            const meta = QUESTION_TYPE_META[type];
            if (!groups[meta.category]) {
                groups[meta.category] = [];
            }
            groups[meta.category].push(type);
        });
        return groups;
    }, [availableTypes]);

    // Calculate statistics
    const statistics = useMemo(() => {
        const totalQuestions = questions.length;
        const selectedQuestions = selectedTypes.length === 0
            ? totalQuestions
            : questions.filter(q => selectedTypes.includes(q.type)).length;

        const percentage = totalQuestions > 0 ? (selectedQuestions / totalQuestions) * 100 : 0;
        const timeReduction = originalTimeLimit && totalQuestions > 0
            ? Math.round((originalTimeLimit * selectedQuestions) / totalQuestions)
            : originalTimeLimit;

        return {
            totalQuestions,
            selectedQuestions,
            percentage: Math.round(percentage),
            timeReduction,
            timeSaved: originalTimeLimit ? originalTimeLimit - timeReduction : 0
        };
    }, [questions, selectedTypes, originalTimeLimit]);

    // Handle individual type toggle
    const handleTypeToggle = useCallback((type) => {
        const newSelectedTypes = selectedTypes.includes(type)
            ? selectedTypes.filter(t => t !== type)
            : [...selectedTypes, type];

        onFilterChange(newSelectedTypes);

        // Calculate and report time adjustment
        if (onTimeAdjustment && originalTimeLimit) {
            const filteredQuestions = newSelectedTypes.length === 0
                ? questions.length
                : questions.filter(q => newSelectedTypes.includes(q.type)).length;

            const adjustedTime = questions.length > 0
                ? Math.round((originalTimeLimit * filteredQuestions) / questions.length)
                : originalTimeLimit;

            onTimeAdjustment(adjustedTime);
        }
    }, [selectedTypes, onFilterChange, onTimeAdjustment, originalTimeLimit, questions]);

    // Handle category toggle (select/deselect all in category)
    const handleCategoryToggle = useCallback((category) => {
        const categoryTypes = groupedTypes[category] || [];
        const allSelected = categoryTypes.every(type => selectedTypes.includes(type));

        let newSelectedTypes;
        if (allSelected) {
            // Deselect all types in this category
            newSelectedTypes = selectedTypes.filter(type => !categoryTypes.includes(type));
        } else {
            // Select all types in this category
            newSelectedTypes = [...new Set([...selectedTypes, ...categoryTypes])];
        }

        onFilterChange(newSelectedTypes);

        // Calculate and report time adjustment
        if (onTimeAdjustment && originalTimeLimit) {
            const filteredQuestions = newSelectedTypes.length === 0
                ? questions.length
                : questions.filter(q => newSelectedTypes.includes(q.type)).length;

            const adjustedTime = questions.length > 0
                ? Math.round((originalTimeLimit * filteredQuestions) / questions.length)
                : originalTimeLimit;

            onTimeAdjustment(adjustedTime);
        }
    }, [groupedTypes, selectedTypes, onFilterChange, onTimeAdjustment, originalTimeLimit, questions]);

    // Handle reset to show all questions
    const handleReset = useCallback(() => {
        onFilterChange([]);
        if (onTimeAdjustment) {
            onTimeAdjustment(originalTimeLimit);
        }
    }, [onFilterChange, onTimeAdjustment, originalTimeLimit]);



    const categoryNames = {
        choice: t('filter.categories.choice', 'Multiple Choice'),
        boolean: t('filter.categories.boolean', 'True/False'),
        text: t('filter.categories.text', 'Text Entry'),
        completion: t('filter.categories.completion', 'Completion'),
        matching: t('filter.categories.matching', 'Matching')
    };

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setIsExpanded(false);
            }
        };

        if (isExpanded) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isExpanded]);

    return (
        <div className="question-type-filter" ref={filterRef}>
            {/* Filter Header */}
            <div className="filter-header" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="filter-title">
                    <IoFilterOutline className="filter-icon" />
                    <span className="filter-text">{t('filter.title', 'Question Type Filter')}</span>
                    <span className="filter-badge">
                        {selectedTypes.length === 0 ? t('filter.all', 'All') : `${statistics.selectedQuestions}/${statistics.totalQuestions}`}
                    </span>
                </div>
                <div className="filter-controls">
                    {isFullScreen && exitFullScreen && (
                        <button 
                            className="filter-exit-btn" 
                            onClick={(e) => {
                                e.stopPropagation();
                                exitFullScreen();
                            }}
                            title={`${t('exitFullScreen', 'Exit Full Screen')} (Esc)`}
                            aria-label={t('exitFullScreen', 'Exit Full Screen')}
                        >
                            <MdFullscreenExit size={18} />
                        </button>
                    )}
                    <div className="filter-toggle">
                        {isExpanded ? <MdExpandLess /> : <MdExpandMore />}
                    </div>
                </div>
            </div>

                        {/* Filter Content */}
            {isExpanded && (
                <div className="filter-content open">
                    {/* Statistics */}
                    <div className="filter-stats">
                        <div className="stat-item">
                            <span className="stat-label">{t('filter.selected', 'Selected')}:</span>
                            <span className="stat-value">{statistics.selectedQuestions}/{statistics.totalQuestions}</span>
                            <span className="stat-percentage">({statistics.percentage}%)</span>
                        </div>
                        {originalTimeLimit && (
                            <div className="stat-item">
                                <span className="stat-label">{t('filter.timeAdjusted', 'Time')}:</span>
                                <span className="stat-value">{statistics.timeReduction} min</span>
                                {statistics.timeSaved > 0 && (
                                    <span className="stat-saved">(-{statistics.timeSaved} min)</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Quick Actions */}
                    <div className="filter-actions">
                        <button
                            className="filter-btn secondary"
                            onClick={handleReset}
                        >
                            {t('filter.showAll', 'Show All')}
                        </button>
                        <button
                            className="filter-btn tertiary"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                        >
                            {showAdvanced ? t('filter.simple', 'Simple') : t('filter.advanced', 'Advanced')}
                        </button>
                    </div>

                    {/* Filter Options */}
                    <div className={`filter-options ${showAdvanced ? 'advanced' : 'simple'}`}>
                        {showAdvanced ? (
                            // Advanced view: grouped by category
                            Object.entries(groupedTypes).map(([category, types]) => (
                                <div key={category} className="filter-category">
                                    <div
                                        className="category-header"
                                        onClick={() => handleCategoryToggle(category)}
                                    >
                                        <div className="category-title">
                                            <span className="category-name">{categoryNames[category]}</span>
                                            <span className="category-count">({types.length})</span>
                                        </div>
                                        <div className="category-checkbox">
                                            {types.every(type => selectedTypes.includes(type)) ?
                                                <IoCheckboxOutline className="checked" /> :
                                                <IoSquareOutline />
                                            }
                                        </div>
                                    </div>
                                    <div className="category-types">
                                        {types.map(type => {
                                            const meta = QUESTION_TYPE_META[type];
                                            const questionCount = questions.filter(q => q.type === type).length;
                                            const isSelected = selectedTypes.includes(type);

                                            return (
                                                <div
                                                    key={type}
                                                    className={`type-option ${isSelected ? 'selected' : ''}`}
                                                    onClick={() => handleTypeToggle(type)}
                                                >
                                                    <div className="type-info">
                                                        <div
                                                            className="type-icon"
                                                            style={{ color: meta.color }}
                                                        >
                                                            <meta.icon size={20} />
                                                        </div>
                                                        <span className="type-name">{meta.displayName}</span>
                                                    </div>
                                                    <div className="type-meta">
                                                        <span className="type-count">{questionCount}</span>
                                                        <div className="type-checkbox">
                                                            {isSelected ?
                                                                <IoCheckboxOutline className="checked" /> :
                                                                <IoSquareOutline />
                                                            }
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        ) : (
                            // Simple view: flat list
                            <div className="filter-types-simple">
                                {availableTypes.map(type => {
                                    const meta = QUESTION_TYPE_META[type];
                                    const questionCount = questions.filter(q => q.type === type).length;
                                    const isSelected = selectedTypes.includes(type);

                                    return (
                                        <div
                                            key={type}
                                            className={`type-option-simple ${isSelected ? 'selected' : ''}`}
                                            onClick={() => handleTypeToggle(type)}
                                        >
                                            <div className="type-info">
                                                <div
                                                    className="type-icon"
                                                    style={{ color: meta.color }}
                                                >
                                                    <meta.icon size={20} />
                                                </div>
                                                <span className="type-name">{meta.displayName}</span>
                                                <span className="type-count">({questionCount})</span>
                                            </div>
                                            <div className="type-checkbox">
                                                {isSelected ?
                                                    <IoCheckboxOutline className="checked" /> :
                                                    <IoSquareOutline />
                                                }
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Filter Hint */}
                    <div className="filter-hint">
                        <span>💡 {t('filter.hint', 'Filter questions by type to focus on specific skills. Timer will adjust automatically.')}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuestionTypeFilter; 