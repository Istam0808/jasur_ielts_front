"use client";

import { useTranslation } from 'react-i18next';

export const BookNotFound = () => {
    const { t } = useTranslation('practice');
    
    return (
        <div className="error-container" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '300px',
            textAlign: 'center',
            padding: '2rem'
        }}>
            <h1>{t('error.bookNotFound')}</h1>
            <p>{t('error.bookNotFoundDescription')}</p>
        </div>
    );
};

export const TestNotFound = () => {
    const { t } = useTranslation('practice');
    
    return (
        <div className="error-container" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '300px',
            textAlign: 'center',
            padding: '2rem'
        }}>
            <h1>{t('error.testNotFound')}</h1>
            <p>{t('error.testNotFoundDescription')}</p>
        </div>
    );
}; 