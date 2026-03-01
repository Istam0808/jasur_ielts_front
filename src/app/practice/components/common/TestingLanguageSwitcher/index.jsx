"use client"
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import AnimatedBarsIcon from './AnimatedBarsIcon'
import './style.scss'

// Available language tests - easily extensible for future languages
const AVAILABLE_TESTS = [
  { 
    id: 'english', 
    label: 'English', 
    path: '/subjects/languages/english/take/identify',
    flag: (
      <svg width="16" height="12" viewBox="0 0 640 480">
        <path fill="#012169" d="M0 0h640v480H0z" />
        <path fill="#FFF" d="M75 0l244 181L562 0h78v62L400 241l240 178v61h-80L320 301 81 480H0v-60l239-178L0 64V0h75z" />
        <path fill="#C8102E" d="M424 281l216 159v40L369 281h55zm-184 20l6 35L54 480H0l240-179zM640 0v3L391 191l2-44L590 0h50zM0 0l239 176h-60L0 42V0z" />
        <path fill="#FFF" d="M241 0v480h160V0H241zM0 160v160h640V160H0z" />
        <path fill="#C8102E" d="M0 193v96h640v-96H0zM273 0v480h96V0h-96z" />
      </svg>
    )
  },
  // Future: Add more languages here
  // { id: 'spanish', label: 'Spanish', path: '/subjects/languages/spanish/take/identify', flag: <SpanishFlag /> },
  // { id: 'french', label: 'French', path: '/subjects/languages/french/take/identify', flag: <FrenchFlag /> },
]

const TestingLanguageSwitcher = ({ alignment = 'right' }) => {
  const { t } = useTranslation('common')
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({})
  const dropdownRef = useRef(null)
  const buttonRef = useRef(null)

  const updateDropdownPosition = useCallback(() => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const dropdownHeight = 120
    const dropdownWidth = 180
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
  }, [alignment])

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

  const handleTestSelect = (test) => {
    router.push(test.path)
    setIsOpen(false)
  }

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (!isOpen) {
        updateDropdownPosition()
        setIsOpen(true)
      }
    }
  }

  return (
    <>
      <div className="testing-switcher">
        <button
          ref={buttonRef}
          className="testing-switcher-button"
          onClick={() => {
            if (!isOpen) updateDropdownPosition()
            setIsOpen((prev) => !prev)
          }}
          onKeyDown={handleKeyDown}
          aria-expanded={isOpen}
          aria-haspopup="true"
          aria-label={t('testingSwitcher.title', 'New Assessment')}
        >
          <AnimatedBarsIcon className="testing-icon" />
          <span className="testing-text">{t('testingSwitcher.title', 'New Assessment')}</span>
          <span className="dropdown-arrow">
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
            className="testing-dropdown-portal"
            style={{ 
              position: 'fixed', 
              zIndex: 999999,
              ...(dropdownPosition.left ? { left: dropdownPosition.left } : { right: `${dropdownPosition.right}px` }),
              ...(dropdownPosition.top !== undefined ? { top: `${dropdownPosition.top}px` } : {}),
              ...(dropdownPosition.bottom !== undefined ? { bottom: `${dropdownPosition.bottom}px` } : {})
            }}
          >
            <div className={`testing-dropdown ${dropdownPosition.openUpward ? 'open-upward' : ''}`}>
              {AVAILABLE_TESTS.map((test) => (
                <button
                  key={test.id}
                  className="testing-option"
                  onClick={() => handleTestSelect(test)}
                  aria-label={`${t('testingSwitcher.title', 'New Assessment')} - ${t(`testingSwitcher.${test.id}`, test.label)}`}
                >
                  <span className="flag-icon">{test.flag}</span>
                  <span>{t(`testingSwitcher.${test.id}`, test.label)}</span>
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
    </>
  )
}

export default TestingLanguageSwitcher
