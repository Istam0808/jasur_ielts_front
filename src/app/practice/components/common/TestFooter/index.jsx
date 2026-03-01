"use client"

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import styles from './style.module.scss';

/**
 * TestFooter - Minimal footer for testing environments
 */
export default function TestFooter() {
  const { t } = useTranslation('common');

  return (
    <footer className={styles.testFooter} role="contentinfo">
      <div className={styles.container}>
        <div className={styles.copyright}>
          IELTS JASUR
        </div>
        
        <div className={styles.links}>
          <Link 
            href="/privacy" 
            className={styles.link}
            aria-label={t('footer.privacy', 'Privacy Policy')}
          >
            {t('footer.privacy', 'Privacy')}
          </Link>
          <span className={styles.separator} aria-hidden="true">·</span>
          <Link 
            href="/privacy/terms" 
            className={styles.link}
            aria-label={t('footer.terms', 'Terms of Service')}
          >
            {t('footer.terms', 'Terms')}
          </Link>
        </div>
      </div>
    </footer>
  );
}

