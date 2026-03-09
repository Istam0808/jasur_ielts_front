"use client"
import { useState, useEffect, Suspense } from 'react'
import { usePathname } from 'next/navigation'
import { LoadingBar, Footer } from '@/components/common'
import EnglishPagesBackground from '@/components/common/EnglishPagesBackground'
import { LoadingProvider } from './LoadingContext'
import { NavigationEvents } from './NavigationEvents'
import { RouterEvents } from './RouterEvents'
import { UserProvider } from '@/contexts/UserContext'
import '@/i18n/config'
import { useTranslation } from 'react-i18next'
import { useScrollRestoration } from '@/hooks/useScrollRestoration'
import { registerServiceWorker, handleServiceWorkerUpdate } from '@/utils/serviceWorkerRegistration'


export function ClientLayout({ children }) {
  const pathname = usePathname()
  const [isReady, setIsReady] = useState(false)
  const [showSplash, setShowSplash] = useState(true)
  const [splashCompleted, setSplashCompleted] = useState(false)
  const [language, setLanguage] = useState(null) // Start with null to avoid hydration mismatch
  const { i18n } = useTranslation('common')
  
  // Ensure proper scroll behavior across the application
  useScrollRestoration()

  useEffect(() => {
    const setLanguageFromI18n = () => {
      const currentLang = i18n.language?.split('-')[0] || 'en'
      setLanguage(currentLang)
    }

    const handleLanguageChanged = () => {
      setLanguageFromI18n()
    }

    const handleReady = () => {
      setLanguageFromI18n()
      i18n.off('initialized', handleReady)
    }

    // Check if i18n is already initialized
    if (i18n.isInitialized) {
      setLanguageFromI18n()
    } else {
      // Wait for initialization
      i18n.on('initialized', handleReady)
    }

    // Listen for language changes
    i18n.on('languageChanged', handleLanguageChanged)

    return () => {
      i18n.off('languageChanged', handleLanguageChanged)
      i18n.off('initialized', handleReady)
    }
  }, [i18n])

  useEffect(() => {
    // Only set ready when language is determined
    if (language !== null) {
      setIsReady(true)
    }
  }, [language])

  // Separate effect for service worker registration - runs independently
  useEffect(() => {
    // Don't run on server or in development
    if (typeof window === 'undefined') return;
    
    const shouldDisableServiceWorker = process.env.NEXT_PUBLIC_DISABLE_SERVICE_WORKER === 'true';
    
    if ('serviceWorker' in navigator && !shouldDisableServiceWorker) {
      // Detect if this is a first visit (no service worker registered)
      navigator.serviceWorker.getRegistration().then((registration) => {
        const isFirstVisit = !registration;
        
        if (isFirstVisit) {
          // On first visit, delay SW registration until after splash screen
          // This prevents blocking initial page load
          const registerAfterSplash = () => {
            if (splashCompleted) {
              registerServiceWorker();
              handleServiceWorkerUpdate();
            }
          };
          
          // Wait for splash screen to complete before registering
          if (splashCompleted) {
            registerAfterSplash();
          }
        } else {
          // On subsequent visits, register immediately but still deferred
          registerServiceWorker();
          handleServiceWorkerUpdate();
        }
      });
    } else if (shouldDisableServiceWorker) {
      // Unregister any existing service workers when disabled
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => {
            registration.unregister();
            console.log('Service Worker unregistered (disabled via environment variable)');
          });
        });
      }
    }
  }, [splashCompleted])

  const handleSplashComplete = () => {
    setSplashCompleted(true);
    setShowSplash(false);
  };

  // Show splash screen until animation completes (don't depend on language)
  const shouldShowSplash = false;

  return (
    <div className={`fouc-fix ${isReady ? 'ready' : ''}`}>
      {!shouldShowSplash && (
        <UserProvider>
          <LoadingProvider>
            <Suspense fallback={null}>
              <NavigationEvents />
            </Suspense>
            <RouterEvents />
            <EnglishPagesBackground />
            {!pathname?.includes('/grammar-learn/') && (
              <Suspense fallback={null}>
                <LoadingBar />
              </Suspense>
            )}
            <div className="main-content-wrapper">
              {children}
            </div>
            {!pathname?.includes('/grammar-learn/') && !pathname?.includes('/languages/english/take/') && !pathname?.includes('/writing/') && <Footer />}
          </LoadingProvider>
        </UserProvider>
      )}
    </div>
  )
} 