"use client";

import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { BiErrorCircle } from 'react-icons/bi';
import './style.scss';

const RouteErrorHandler = ({ 
    errorType, 
    invalidValue, 
    validOptions = [], 
    onNavigateToLevel, 
    onNavigateToDefault,
    defaultLevel = 'b1',
    showBackButtons = true 
}) => {
    const { t } = useTranslation(['practice', 'test', 'common']);
    const router = useRouter();

    const getErrorContent = () => {
        switch (errorType) {
            case 'invalid_difficulty':
                return {
                    title: t('error.invalidDifficulty', { 
                        ns: 'practice', 
                        defaultValue: 'Invalid Difficulty Level' 
                    }),
                    message: t('error.invalidDifficultyMessage', { 
                        ns: 'practice', 
                        defaultValue: 'The difficulty level "{{difficulty}}" is not valid.',
                        difficulty: invalidValue 
                    }),
                    availableLabel: t('error.availableLevels', { 
                        ns: 'practice', 
                        defaultValue: 'Available levels:' 
                    }),
                    defaultButton: t('error.useDefault', { 
                        ns: 'practice', 
                        defaultValue: 'Use Default Level (B1)' 
                    })
                };
            case 'invalid_language':
                return {
                    title: t('error.invalidLanguage', { 
                        ns: 'common', 
                        defaultValue: 'Language Not Supported' 
                    }),
                    message: t('error.invalidLanguageMessage', { 
                        ns: 'common', 
                        defaultValue: 'The language "{{language}}" is not currently supported.',
                        language: invalidValue 
                    }),
                    availableLabel: t('error.availableLanguages', { 
                        ns: 'common', 
                        defaultValue: 'Available languages:' 
                    }),
                    defaultButton: t('error.useDefaultLanguage', { 
                        ns: 'common', 
                        defaultValue: 'Use English (Default)' 
                    })
                };
            default:
                return {
                    title: t('error.genericTitle', { 
                        ns: 'common', 
                        defaultValue: 'Invalid Route' 
                    }),
                    message: t('error.genericMessage', { 
                        ns: 'common', 
                        defaultValue: 'The requested page could not be found.' 
                    }),
                    availableLabel: t('error.availableOptions', { 
                        ns: 'common', 
                        defaultValue: 'Available options:' 
                    }),
                    defaultButton: t('error.useDefault', { 
                        ns: 'common', 
                        defaultValue: 'Use Default' 
                    })
                };
        }
    };

    const errorContent = getErrorContent();

    const handleBackToSubjects = () => {
        router.push('/subjects');
    };

    const handleBackToEnglish = () => {
        // Use hard refresh to clear module cache and ensure JSON files load
        window.location.href = '/subjects/languages/english';
    };

    return (
        <div className="route-error-handler">
            <div className="error-container">
                <div className="error-icon">
                    <BiErrorCircle />
                </div>
                
                <div className="error-content">
                    <h1>{errorContent.title}</h1>
                    <p>{errorContent.message}</p>
                    
                    {validOptions.length > 0 && (
                        <div className="valid-options">
                            <h3>{errorContent.availableLabel}</h3>
                            <div className="option-buttons">
                                {onNavigateToDefault && (
                                    <button 
                                        className="btn btn-primary"
                                        onClick={onNavigateToDefault}
                                    >
                                        {errorContent.defaultButton}
                                    </button>
                                )}
                                {validOptions.map(option => (
                                    <button 
                                        key={option} 
                                        className="btn btn-outline"
                                        onClick={() => onNavigateToLevel?.(option)}
                                    >
                                        {t(`difficulty.${option}`, { 
                                            ns: 'practice', 
                                            defaultValue: option.toUpperCase() 
                                        })}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {showBackButtons && (
                        <div className="navigation-options">
                            <button 
                                className="btn btn-secondary"
                                onClick={handleBackToEnglish}
                            >
                                {t('error.backToEnglish', { 
                                    ns: 'practice', 
                                    defaultValue: 'Back to English' 
                                })}
                            </button>
                            <button 
                                className="btn btn-secondary"
                                onClick={handleBackToSubjects}
                            >
                                {t('error.backToSubjects', { 
                                    ns: 'practice', 
                                    defaultValue: 'Back to Subjects' 
                                })}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RouteErrorHandler; 