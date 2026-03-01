"use client"

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaBook, FaCode, FaTimes, FaSpinner } from 'react-icons/fa';
import Modal from '../Modal';
import { getAvailableTopics } from '@/utils/topicDiscovery';
import styles from './style.module.scss';

/**
 * TopicSelectionModal Component
 * Displays available topics for a given language
 * User selects a topic before proceeding to tasks or tests
 */
export default function TopicSelectionModal({
  isOpen,
  onClose,
  onTopicSelect,
  language,
  mode = 'tasks' // 'tasks' or 'test'
}) {
  const { t } = useTranslation('coding');
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Sorts topics by extracting leading numbers from displayName
   * Topics with numbers are sorted numerically (1, 2, 10, 11...)
   * Topics without numbers fall back to alphabetical sorting
   */
  const sortTopics = (topics) => {
    return [...topics].sort((a, b) => {
      const numA = parseInt(a.displayName.match(/^(\d+)/)?.[1] || '999999');
      const numB = parseInt(b.displayName.match(/^(\d+)/)?.[1] || '999999');
      if (numA !== numB) return numA - numB;
      return a.displayName.localeCompare(b.displayName);
    });
  };

  // Load available topics when modal opens
  useEffect(() => {
    if (!isOpen || !language) return;

    setLoading(true);
    setError(null);

    getAvailableTopics(language)
      .then(availableTopics => {
        if (availableTopics.length === 0) {
          setError(t('noTopicsAvailable', 'No topics available'));
        } else {
          const sortedTopics = sortTopics(availableTopics);
          setTopics(sortedTopics);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load topics:', err);
        setError(t('topicLoadError', 'Failed to load topics'));
        setLoading(false);
      });
  }, [isOpen, language, t]);

  const handleTopicClick = (topic) => {
    onTopicSelect(topic.filename);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal
      onClose={onClose}
      closeOnClickOutside={true}
      closeOnEscape={true}
      padding={false}
    >
      <div className={styles.topicSelectionModal}>
        <div className={styles.topicModalHeader}>
          <div className={styles.topicModalTitleSection}>
            <div className={styles.topicModalIcon}>
              {mode === 'test' ? <FaBook /> : <FaCode />}
            </div>
            <div>
              <h2 className={styles.topicModalTitle}>
                {t('selectTopic', 'Select a Topic')}
              </h2>
              <p className={styles.topicModalSubtitle}>
                {mode === 'test' 
                  ? t('selectTopicForTest', 'Choose a topic to test your knowledge')
                  : t('selectTopicPrompt', 'Choose a topic to practice')
                }
              </p>
            </div>
          </div>
          <button 
            className={styles.topicModalClose}
            onClick={onClose}
            aria-label={t('close', 'Close')}
          >
            <FaTimes />
          </button>
        </div>

        <div className={styles.topicModalContent}>
          {loading && (
            <div className={styles.topicLoading}>
              <FaSpinner className={styles.topicSpinner} />
              <p>{t('loadingTopics', 'Loading topics...')}</p>
            </div>
          )}

          {error && (
            <div className={styles.topicError}>
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && topics.length > 0 && (
            <div className={styles.topicGrid}>
              {topics.map((topic) => (
                <button
                  key={topic.filename}
                  className={styles.topicCard}
                  onClick={() => handleTopicClick(topic)}
                >
                  <div className={styles.topicCardLeft}>
                    <div className={styles.topicCardIcon}>
                      <FaCode />
                    </div>
                  </div>
                  
                  <div className={styles.topicCardCenter}>
                    <h3 className={styles.topicCardTitle}>{topic.displayName}</h3>
                  </div>
                  
                  <div className={styles.topicCardRight}>
                    <div className={styles.topicCardArrow}>→</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

