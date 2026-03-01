"use client"
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import './styles.scss'
import { 
  FaFacebookF, 
  FaInstagram, 
  FaLinkedinIn, 
  FaTwitter, 
  FaYoutube,
  FaApple,
  FaGooglePlay
} from 'react-icons/fa'
import { HiArrowRight } from 'react-icons/hi2'

const Footer = memo(function Footer() {
  const { t } = useTranslation('common')

  // Memoize static social links to prevent re-creation on each render
  const socialLinks = useMemo(() => [
    { href: "#", label: "Facebook", icon: FaFacebookF },
    { href: "#", label: "Instagram", icon: FaInstagram },
    { href: "#", label: "LinkedIn", icon: FaLinkedinIn },
    { href: "#", label: "Twitter", icon: FaTwitter },
    { href: "#", label: "YouTube", icon: FaYoutube }
  ], [])

  // Memoize navigation links to prevent re-creation
  const navigationLinks = useMemo(() => ({
    courses: [
      { href: "/subjects/languages", key: "footer.languages", fallback: "Languages" },
      { href: "/subjects/mathematics", key: "footer.mathematics", fallback: "Mathematics" },
      { href: "/subjects/computerScience", key: "footer.internetTechnology", fallback: "Internet Technology" }
    ],
    quickLinks: [
      { href: "/about", key: "nav.about", fallback: "About" },
      { href: "/contacts", key: "nav.contacts", fallback: "Contacts" },
      { href: "/news", key: "nav.news", fallback: "News" }
    ],
    support: [
      { href: "/faq", key: "footer.faq", fallback: "FAQs" },
      { href: "/privacy/terms", key: "footer.termsCondition", fallback: "Terms & Condition" },
      { href: "/privacy", key: "footer.privacyPolicy", fallback: "Privacy Policy" }
    ]
  }), [])

  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Main Footer Content */}
        <div className="footer-content">
          {/* Logo and Description */}
          <div className="footer-brand">
            <div className="footer-logo">
              <span className="logo-image logo-text">IELTS Practice</span>
            </div>
            <p className="footer-description">
              {t('footer.tagline', 'Empowering educators and students with advanced assessment tools.')}
            </p>
            
            {/* Social Links */}
            <div className="social-links">
              {socialLinks.map((social, index) => {
                const IconComponent = social.icon
                return (
                  <a 
                    key={index}
                    href={social.href} 
                    aria-label={social.label} 
                    className="social-link"
                  >
                    <IconComponent />
                  </a>
                )
              })}
            </div>
          </div>

          {/* Footer Links */}
          <div className="footer-links">
            {/* Courses Column */}
            <div className="footer-column">
              <h3 className="column-title">{t('footer.courses', 'COURSES')}</h3>
              <ul className="column-links">
                {navigationLinks.courses.map((link, index) => (
                  <li key={index}>
                    <Link href={link.href}>
                      {t(link.key, link.fallback)} <HiArrowRight className="link-arrow" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Quick Links Column */}
            <div className="footer-column">
              <h3 className="column-title">{t('footer.quickLinks', 'QUICK LINKS')}</h3>
              <ul className="column-links">
                {navigationLinks.quickLinks.map((link, index) => (
                  <li key={index}>
                    <Link href={link.href}>
                      {t(link.key, link.fallback)} <HiArrowRight className="link-arrow" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support Column */}
            <div className="footer-column">
              <h3 className="column-title">{t('footer.support', 'SUPPORT')}</h3>
              <ul className="column-links">
                {navigationLinks.support.map((link, index) => (
                  <li key={index}>
                    <Link href={link.href}>
                      {t(link.key, link.fallback)} <HiArrowRight className="link-arrow" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Download App Column */}
            <div className="footer-column">
              <h3 className="column-title">{t('footer.downloadApp', 'DOWNLOAD OUR APP')}</h3>
              <div className="app-download">
                <a href="#" className="app-store-btn" aria-label="Download on App Store">
                  <FaApple className="app-icon" />
                  <div className="app-text">
                    <span className="download-text">{t('footer.downloadNow', 'Download on the')}</span>
                    <span className="store-name">{t('footer.appStore', 'App Store')}</span>
                  </div>
                </a>
                <a href="#" className="play-store-btn" aria-label="Get it on Google Play">
                  <FaGooglePlay className="app-icon" />
                  <div className="app-text">
                    <span className="download-text">{t('footer.getItOn', 'GET IT ON')}</span>
                    <span className="store-name">{t('footer.playStore', 'Google Play')}</span>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="footer-bottom">
          <div className="footer-info">
            <p className="copyright">
              © 2025 - UnitSchool. Designed by <span className="highlight">Alisher Khujanov</span>. 
              <span className="all-rights">All rights reserved.</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
})

Footer.displayName = 'Footer'

export default Footer