'use client';

import { useTranslation } from 'react-i18next';
import styles from './NotFoundMessage.module.scss';

export default function NotFoundMessage({ title }) {
    const { t } = useTranslation('practice');
    const fallbackTitleMap = {
        reading: 'Reading test not found',
        writing: 'Writing task not found',
        listening: 'Listening test not found'
    };
    const normalizedTitle = String(title || '').toLowerCase();
    const fallbackTitle = fallbackTitleMap[normalizedTitle] || 'Content not found';
    const titleKey = `ielts.${title}.notFound`;
    const resolvedTitle = t(titleKey, { defaultValue: fallbackTitle });
    const safeTitle = resolvedTitle === titleKey ? fallbackTitle : resolvedTitle;
    const backKey = 'back';
    const englishKey = 'english';
    const resolvedBack = t(backKey, { ns: 'subjects', defaultValue: 'Back to' });
    const resolvedEnglish = t(englishKey, { ns: 'subjects', defaultValue: 'English' });
    const safeBack = resolvedBack === backKey ? 'Back to' : resolvedBack;
    const safeEnglish = resolvedEnglish === englishKey ? 'English' : resolvedEnglish;
    
    return (
        <div className={styles.notFoundContainer}>
            <div className={styles.notFoundContent}>
                <h2 className={styles.title}>{safeTitle}</h2>
                <p className={styles.message}>
                    {safeBack}{' '}
                    <a href="/mock/listening" className={styles.link}>
                        {safeEnglish}
                    </a>
                </p>
            </div>
        </div>
    );
} 