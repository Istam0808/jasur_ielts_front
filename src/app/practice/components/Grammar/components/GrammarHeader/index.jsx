'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaLayerGroup } from 'react-icons/fa';
import { BiCategory } from 'react-icons/bi';
import { FaClock, FaCheckCircle } from 'react-icons/fa';

import styles from './style.module.scss';
import headerBannerStyles from '../../../headerBanner.module.scss';
import LevelSelectorButton from '../../../common/LevelSelectorButton';

const GrammarHeader = ({ grammarData, difficulty, onChangeLevelClick }) => {
    const { t } = useTranslation(['grammar', 'practice', 'common']);

    return (
        <div className={`${headerBannerStyles.headerBanner} ${headerBannerStyles.grammarTheme} ${styles.grammarHeaderCustom}`}>
            
            {/* TOP ROW: Title on left, Level selector on right */}
            <div className={styles.headerMainRow}>
                {/* LEFT: Just the title */}
                <div className={styles.headerLeft}>
                    <div className={styles.titleGroup}>
                        <FaLayerGroup className={styles.titleIcon} />
                        <h1>{t('categories.grammar', { ns: 'grammar' })}</h1>
                    </div>
                </div>

                {/* RIGHT: The level selector button */}
                <div className={styles.headerRight}>
                    <LevelSelectorButton 
                        difficulty={difficulty}
                        onClick={onChangeLevelClick}
                    />
                </div>
            </div>

            {/* DESCRIPTION */}
            <p className={styles.headerDesc}>
                {t('header.description', { 
                    ns: 'grammar', 
                    level: t(`difficulty.${difficulty?.toLowerCase() || 'b1'}`, { ns: 'practice' }) 
                })}
            </p>

            {/* STATS */}
            {grammarData && (
                <div className={headerBannerStyles.statsContainer}>
                    <div className={headerBannerStyles.statItem}>
                        <BiCategory className={headerBannerStyles.statIcon} />
                        <span className={headerBannerStyles.statValue}>{grammarData.total_topics}</span>
                        <span className={headerBannerStyles.statLabel}>{t('topics', { ns: 'common' })}</span>
                    </div>
                    <div className={headerBannerStyles.statItem}>
                        <FaClock className={headerBannerStyles.statIcon} />
                        <span className={headerBannerStyles.statValue}>{grammarData.estimated_hours}</span>
                        <span className={headerBannerStyles.statLabel}>{t('hours', { ns: 'common' })}</span>
                    </div>
                    <div className={headerBannerStyles.statItem}>
                        <FaCheckCircle className={headerBannerStyles.statIcon} />
                        <span className={headerBannerStyles.statValue}>{grammarData.level_name}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GrammarHeader;