"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { FaCode, FaSpinner } from 'react-icons/fa'
import { getAvailableTopics, normalizeTopicName } from '@/utils/topicDiscovery'
import styles from './TopicSelector.module.scss'

/**
 * TopicSelector Component
 * Dropdown selector for switching topics in TasksPanel
 * Matches LanguageSwitcher styling and behavior
 */
const TopicSelector = ({ 
  language, 
  currentTopic, 
  onTopicChange, 
  alignment = 'right',
  currentTheme = 'vs-dark'
}) => {
  const { t } = useTranslation('coding')
  const [isOpen, setIsOpen] = useState(false)
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({})
  const dropdownRef = useRef(null)
  const buttonRef = useRef(null)

  // Sort topics numerically (same logic as TopicSelectionModal)
  const sortTopics = useCallback((topicsList) => {
    return [...topicsList].sort((a, b) => {
      const numA = parseInt(a.displayName.match(/^(\d+)/)?.[1] || '999999')
      const numB = parseInt(b.displayName.match(/^(\d+)/)?.[1] || '999999')
      if (numA !== numB) return numA - numB
      return a.displayName.localeCompare(b.displayName)
    })
  }, [])

  // Load topics when dropdown opens
  useEffect(() => {
    if (!isOpen || !language) return

    setLoading(true)
    getAvailableTopics(language)
      .then(availableTopics => {
        const sortedTopics = sortTopics(availableTopics)
        setTopics(sortedTopics)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load topics:', err)
        setTopics([])
        setLoading(false)
      })
  }, [isOpen, language, sortTopics])

  // Get current topic display name
  const currentTopicName = useMemo(() => {
    if (!currentTopic) return t('selectTopic', 'Select Topic')
    return normalizeTopicName(currentTopic)
  }, [currentTopic, t])

  const updateDropdownPosition = useCallback(() => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    // Estimate dropdown height based on number of topics (max 300px)
    const estimatedHeight = Math.min(topics.length * 50 + 20, 300)
    const dropdownHeight = loading ? 100 : estimatedHeight
    const dropdownWidth = 250
    const windowHeight = window.innerHeight
    const openUpward = rect.bottom + dropdownHeight > windowHeight - 20

    let positionStyle = {}

    if (alignment === 'center') {
      const buttonCenter = rect.left + rect.width / 2
      const left = buttonCenter - dropdownWidth / 2
      positionStyle = openUpward
        ? { bottom: windowHeight - rect.top + 8, left: `${left}px`, openUpward }
        : { top: rect.bottom + 8, left: `${left}px`, openUpward }
    } else if (alignment === 'left') {
      positionStyle = openUpward
        ? { bottom: windowHeight - rect.top + 8, left: `${rect.left}px`, openUpward }
        : { top: rect.bottom + 8, left: `${rect.left}px`, openUpward }
    } else {
      // Default: right alignment
      positionStyle = openUpward
        ? { bottom: windowHeight - rect.top + 8, right: window.innerWidth - rect.right, openUpward }
        : { top: rect.bottom + 8, right: window.innerWidth - rect.right, openUpward }
    }

    setDropdownPosition(positionStyle)
  }, [alignment, topics.length, loading])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Recalculate on scroll/resize
  useEffect(() => {
    if (!isOpen) return
    const handler = () => updateDropdownPosition()
    window.addEventListener('scroll', handler, true)
    window.addEventListener('resize', handler)
    return () => {
      window.removeEventListener('scroll', handler, true)
      window.removeEventListener('resize', handler)
    }
  }, [isOpen, updateDropdownPosition])

  const handleTopicSelect = useCallback((topicFilename) => {
    if (topicFilename !== currentTopic && onTopicChange) {
      onTopicChange(topicFilename)
    }
    setIsOpen(false)
  }, [currentTopic, onTopicChange])

  const handleToggle = useCallback(() => {
    if (!isOpen) {
      updateDropdownPosition()
    }
    setIsOpen(prev => !prev)
  }, [isOpen, updateDropdownPosition])

  return (
    <>
      <div className={styles.topicSelector}>
        <button
          ref={buttonRef}
          className={styles.topicSelectorButton}
          onClick={handleToggle}
          aria-expanded={isOpen}
          aria-haspopup="true"
          aria-label={t('switchTopic', 'Switch Topic')}
          title={t('switchTopic', 'Switch Topic')}
        >
          <span className={styles.topicIcon}>
            <FaCode />
          </span>
          <span className={styles.topicName}>{currentTopicName}</span>
          <span className={styles.dropdownArrow}>
            <svg width="8" height="5" viewBox="0 0 10 6" fill="none">
              <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
      </div>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            className={styles.topicDropdownPortal}
            style={{ 
              position: 'fixed', 
              zIndex: 999999,
              ...(dropdownPosition.left ? { left: dropdownPosition.left } : { right: `${dropdownPosition.right}px` }),
              ...(dropdownPosition.top !== undefined ? { top: `${dropdownPosition.top}px` } : {}),
              ...(dropdownPosition.bottom !== undefined ? { bottom: `${dropdownPosition.bottom}px` } : {})
            }}
          >
            <div className={`${styles.topicDropdown} ${dropdownPosition.openUpward ? styles.openUpward : ''} ${currentTheme === 'vs-light' ? styles.lightTheme : ''}`}>
              {loading ? (
                <div className={styles.topicLoading}>
                  <FaSpinner className={styles.spinner} />
                  <span>{t('loadingTopics', 'Loading topics...')}</span>
                </div>
              ) : topics.length === 0 ? (
                <div className={styles.topicEmpty}>
                  <span>{t('noTopicsAvailable', 'No topics available')}</span>
                </div>
              ) : (
                topics.map((topic) => (
                  <button
                    key={topic.filename}
                    className={`${styles.topicOption} ${currentTopic === topic.filename ? styles.active : ''}`}
                    onClick={() => handleTopicSelect(topic.filename)}
                    role="menuitem"
                    aria-current={currentTopic === topic.filename ? 'true' : 'false'}
                  >
                    <span className={styles.optionIcon}>
                      <FaCode />
                    </span>
                    <span className={styles.optionName}>{topic.displayName}</span>
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  )
}

export default TopicSelector

