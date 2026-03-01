"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { generateBreadcrumbStructuredData } from '@/utils/metadata'
import './style.scss'

const Breadcrumb = ({ customBreadcrumbs = null }) => {
  const { t } = useTranslation('common')
  const pathname = usePathname()
  
  // Custom breadcrumbs override automatic generation
  if (customBreadcrumbs) {
    const structuredData = generateBreadcrumbStructuredData(customBreadcrumbs)
    
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <nav className="breadcrumb" aria-label="Breadcrumb navigation">
          <ol className="breadcrumb-list">
            {customBreadcrumbs.map((crumb, index) => (
              <li key={index} className="breadcrumb-item">
                {index < customBreadcrumbs.length - 1 ? (
                  <>
                    <Link href={crumb.url} className="breadcrumb-link">
                      {crumb.name}
                    </Link>
                    <span className="breadcrumb-separator" aria-hidden="true">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </span>
                  </>
                ) : (
                  <span className="breadcrumb-current" aria-current="page">
                    {crumb.name}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </>
    )
  }

  // Auto-generate breadcrumbs from pathname
  const pathSegments = pathname.split('/').filter(segment => segment !== '')
  
  if (pathSegments.length === 0) {
    return null // Don't show breadcrumb on homepage
  }

  const breadcrumbs = [
    { name: t('breadcrumb.home', 'Home'), url: '/' }
  ]

  let currentPath = ''
  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`
    
    // Generate human-readable names for common paths
    let name = segment
    switch (segment) {
      case 'subjects':
        name = t('breadcrumb.subjects', 'Subjects')
        break
      case 'computerScience':
        name = t('breadcrumb.computerScience', 'Computer Science')
        break
      case 'languages':
        name = t('breadcrumb.languages', 'Languages')
        break
      case 'english':
        name = t('breadcrumb.english', 'English')
        break
      case 'practice':
        name = t('breadcrumb.practice', 'Practice')
        break
      case 'news':
        name = t('breadcrumb.news', 'News')
        break
      case 'about':
        name = t('breadcrumb.about', 'About')
        break
      case 'contacts':
        name = t('breadcrumb.contacts', 'Contacts')
        break
      case 'faq':
        name = t('breadcrumb.faq', 'FAQ')
        break
      case 'a1':
        name = t('breadcrumb.a1', 'A1 Level')
        break
      case 'a2':
        name = t('breadcrumb.a2', 'A2 Level')
        break
      case 'b1':
        name = t('breadcrumb.b1', 'B1 Level')
        break
      case 'b2':
        name = t('breadcrumb.b2', 'B2 Level')
        break
      case 'c1':
        name = t('breadcrumb.c1', 'C1 Level')
        break
      case 'c2':
        name = t('breadcrumb.c2', 'C2 Level')
        break
      case 'reading':
        name = t('breadcrumb.reading', 'Reading')
        break
      case 'listening':
        name = t('breadcrumb.listening', 'Listening')
        break
      case 'writing':
        name = t('breadcrumb.writing', 'Writing')
        break
      case 'html':
        name = 'HTML'
        break
      case 'css':
        name = 'CSS'
        break
      case 'javascript':
        name = 'JavaScript'
        break
      case 'react':
        name = 'React'
        break
      case 'python':
        name = 'Python'
        break
      default:
        // Capitalize first letter and replace hyphens with spaces
        name = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
    }

    breadcrumbs.push({ name, url: currentPath })
  })

  const structuredData = generateBreadcrumbStructuredData(breadcrumbs)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <nav className="breadcrumb" aria-label="Breadcrumb navigation">
        <ol className="breadcrumb-list">
          {breadcrumbs.map((crumb, index) => (
            <li key={index} className="breadcrumb-item">
              {index < breadcrumbs.length - 1 ? (
                <>
                  <Link href={crumb.url} className="breadcrumb-link">
                    {crumb.name}
                  </Link>
                  <span className="breadcrumb-separator" aria-hidden="true">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </span>
                </>
              ) : (
                <span className="breadcrumb-current" aria-current="page">
                  {crumb.name}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  )
}

export default Breadcrumb 