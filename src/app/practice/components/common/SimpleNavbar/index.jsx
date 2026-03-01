"use client"

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { registeredLinks, nonRegisteredLinks } from '@/store';
import Logo from '@/assets/logos/logoD.png';
import LogoSingle from '@/assets/logos/logoX.png';
import LogoWithoutText from '@/assets/logos/logo.png';
import TestingLanguageSwitcher from '../TestingLanguageSwitcher';
import SearchContainer from './SearchContainer';
import MobileSearchIcon from './MobileSearchIcon';
import { getSubjects } from '@/utils/subjectsUtils';
import { useNavbarScroll } from '@/hooks/useNavbarScroll';
import { useUser } from '@/contexts/UserContext';
import { FaUser } from 'react-icons/fa';

import './style.scss';

function SimpleNavbar() {
  const { t } = useTranslation(['common', 'subjects']);
  const pathname = usePathname();
  const { isAuthenticated, user } = useUser();
  const availableLinks = isAuthenticated ? registeredLinks : nonRegisteredLinks;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileDropdownOpen, setIsMobileDropdownOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isMobileView, setIsMobileView] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [profileImageError, setProfileImageError] = useState(false);

  const mobileMenuRef = useRef(null);
  const firstFocusableRef = useRef(null);
  const lastFocusableRef = useRef(null);
  const dropdownRef = useRef(null);
  const mobileDropdownRef = useRef(null);
  const lastScrollYRef = useRef(0);

  // Use the enhanced hook for smooth navbar scroll management
  useNavbarScroll(10, 25); // Mobile: smooth fade 10vh-25vh, Desktop: quick transition at 10vh, hide/show at 25vh

  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth <= 576);
      if (window.innerWidth > 784) {
        setIsMenuOpen(false);
      }
    };

    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    return () => window.removeEventListener('resize', checkMobileView);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (mobileDropdownRef.current && !mobileDropdownRef.current.contains(e.target)) {
        setIsMobileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isMenuOpen && !e.target.closest('.mobile-menu') && !e.target.closest('.burger-menu')) {
        setIsMenuOpen(false);
      }
    };

    const handleEscKey = (e) => {
      if (e.key === 'Escape' && isMenuOpen) setIsMenuOpen(false);
    };

    const handleTabKey = (e) => {
      if (!isMenuOpen) return;
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstFocusableRef.current) {
          e.preventDefault();
          lastFocusableRef.current?.focus();
        } else if (!e.shiftKey && document.activeElement === lastFocusableRef.current) {
          e.preventDefault();
          firstFocusableRef.current?.focus();
        }
      }
    };

    if (isMenuOpen) {
      // Calculate scrollbar width before hiding it
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

      // Prevent scrolling
      document.body.style.overflow = 'hidden';
      // Compensate for scrollbar width to prevent layout shift
      document.body.style.paddingRight = `${scrollbarWidth}px`;

      setTimeout(() => firstFocusableRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscKey);
    document.addEventListener('keydown', handleTabKey);

    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscKey);
      document.removeEventListener('keydown', handleTabKey);
    };
  }, [isMenuOpen]);

  // Unified scroll handler for all scroll-related functionality
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Handle navbar visibility
      if (currentScrollY < 80) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollYRef.current) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      lastScrollYRef.current = currentScrollY;

      // Handle dropdown closing on scroll
      if (isDropdownOpen) setIsDropdownOpen(false);
      if (isMobileDropdownOpen) setIsMobileDropdownOpen(false);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isDropdownOpen, isMobileDropdownOpen]);

  const subjects = getSubjects();

  const translatedLinks = availableLinks.map(link => ({
    ...link,
    title: t('common:nav.' + link.id, link.title)
  }));

  const isActiveLink = (path) => path === '/' ? pathname === path : pathname.startsWith(path);

  // Determine which logo to use based on mobile view and search focus state
  const getLogoSource = () => {
    if (isSearchFocused) {
      return LogoWithoutText;
    }
    return isMobileView ? LogoSingle : Logo;
  };

  // Check if we're on the main page (root path)
  const isMainPage = pathname === '/';

  // Get user display name with fallback
  const getUserDisplayName = () => {
    if (!user) return '';
    return user.displayName || user.email?.split('@')[0] || 'User';
  };

  // Get user profile image or fallback to icon
  const getUserProfileImage = () => {
    if (!user || profileImageError) return null;
    return user.photoURL || null;
  };

  // Handle profile image error
  const handleProfileImageError = () => {
    setProfileImageError(true);
  };

  // Reset profile image error when user changes
  useEffect(() => {
    setProfileImageError(false);
  }, [user]);

  return (
    <div className="navbar-wrapper">
      <nav
        className={`simple-navbar ${isVisible ? 'visible' : 'hidden'}`}
      >
        <div className="navbar-top">
          <div className="desktop-menu">
            <div className="links">
              {translatedLinks.map((link) => (
                <Link
                  key={link.id + "-nav-link"}
                  href={link.path}
                  className={`nav-link ${isActiveLink(link.path) ? 'active' : ''}`}
                >
                  {link.title}
                </Link>
              ))}
            </div>
            <div className="right-controls">
              <TestingLanguageSwitcher />
            </div>
          </div>
        </div>
        <div
          className={`navbar-container ${isMainPage ? 'main-page' : ''}`}
        >
          <div className="navbar-container-left">
            <Link href="/" className="logo-link">
              <div className={`logo ${isSearchFocused ? 'search-focused' : ''}`}>
                <Image
                  src={getLogoSource()}
                  alt="Logo"
                  loading="eager"
                  fetchPriority="high"
                  priority
                />
              </div>
            </Link>

            <div className="desktop-only">
              <SearchContainer />
            </div>

          </div>
          <div className="navbar-container-right">
            <div className="desktop-only auth-container">
              {isAuthenticated ? (
                <Link href="/profile" className="auth-button profile-with-name" aria-label={t('common:nav.profile')}>
                  <div className="profile-info">
                    <span className="profile-name">{getUserDisplayName()}</span>
                  </div>
                  <div className="profile-avatar">
                    {getUserProfileImage() ? (
                      <Image
                        src={getUserProfileImage()}
                        alt={getUserDisplayName()}
                        width={36}
                        height={36}
                        className="profile-image"
                        onError={handleProfileImageError}
                      />
                    ) : (
                      <FaUser className="profile-icon" />
                    )}
                  </div>
                </Link>
              ) : (
                <>
                  <Link href="/auth/register" className="auth-button sign-up">
                    <span>{t('common:nav.createAccount')}</span>
                  </Link>
                  <Link href="/auth/login" className="auth-button sign-in">
                    <span>{t('common:nav.signIn')}</span>
                  </Link>
                </>
              )}
            </div>
            <MobileSearchIcon onSearchFocusChange={setIsSearchFocused} />
          </div>
          <button
            className={`burger-menu ${isMenuOpen ? 'hidden' : ''}`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-expanded={isMenuOpen}
            aria-label="Toggle navigation menu"
            disabled={isMenuOpen}
          >
            <div className={`burger-line ${isMenuOpen ? 'open' : ''}`}></div>
            <div className={`burger-line ${isMenuOpen ? 'open' : ''}`}></div>
            <div className={`burger-line ${isMenuOpen ? 'open' : ''}`}></div>
          </button>

          <div
            className={`mobile-menu-overlay ${isMenuOpen ? 'open' : ''}`}
            onClick={() => setIsMenuOpen(false)}
          />

          <div
            ref={mobileMenuRef}
            className={`mobile-menu ${isMenuOpen ? 'open' : ''}`}
            role="dialog"
            aria-label="Navigation menu"
            inert={!isMenuOpen}
          >
            <div className="mobile-menu-content">
              {/* Profile section at the top */}
              <div className="mobile-profile-section">
                {isAuthenticated ? (
                  <Link
                    href="/profile"
                    className="profile-link"
                    onClick={() => {
                      // Close menu after a short delay to allow navigation
                      setTimeout(() => setIsMenuOpen(false), 100);
                    }}
                    aria-label={t('common:nav.profile')}
                  >
                    <div className="profile-avatar">
                      {getUserProfileImage() ? (
                        <Image
                          src={getUserProfileImage()}
                          alt={getUserDisplayName()}
                          width={48}
                          height={48}
                          className="profile-image"
                          onError={handleProfileImageError}
                        />
                      ) : (
                        <FaUser className="profile-icon" />
                      )}
                    </div>
                    <div className="profile-info">
                      <span className="profile-name">{getUserDisplayName()}</span>
                    </div>
                  </Link>
                ) : (
                  <div className="mobile-auth-container">
                    <Link href="/auth/register" className="auth-button sign-up" onClick={() => setIsMenuOpen(false)}>
                      <span>{t('common:nav.createAccount')}</span>
                    </Link>
                    <Link href="/auth/login" className="auth-button sign-in" onClick={() => setIsMenuOpen(false)}>
                      <span>{t('common:nav.signIn')}</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* Navigation links */}
              <div className="mobile-nav-links">
                {translatedLinks.map((link, index) => (
                  <Link
                    key={link.id + "-mobile-nav-link"}
                    href={link.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={`mobile-nav-link ${isActiveLink(link.path) ? 'active' : ''}`}
                    style={{ '--i': index }}
                    ref={index === 0 ? firstFocusableRef : index === translatedLinks.length - 1 ? lastFocusableRef : null}
                  >
                    {link.icon ? <link.icon /> : null}
                    {link.title}
                  </Link>
                ))}
              </div>

              {/* Testing switcher */}
              <div className={`testing-switcher-container ${isMobileDropdownOpen ? 'dropdown-open' : ''}`} style={{ '--i': translatedLinks.length }}>
                <TestingLanguageSwitcher />
              </div>

            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}

export default SimpleNavbar;