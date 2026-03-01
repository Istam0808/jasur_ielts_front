'use client';

import React, { memo, useMemo, useRef, useEffect, useState } from 'react';
import './CompanyMarquee.scss';

// Company names as text (no image assets)
const COMPANIES = [
  { name: 'W3Schools', category: 'Web Development', isUnitSchool: false },
  { name: 'Cambridge', category: 'English & IELTS', isUnitSchool: false },
  { name: 'Harvard', category: 'Education', isUnitSchool: false },
  { name: 'Unit School', category: 'Education', isUnitSchool: true },
  { name: 'Cambridge Unit School', category: 'Education', isUnitSchool: false },
  { name: 'Oxford', category: 'English & IELTS', isUnitSchool: false },
  { name: 'Khan Academy', category: 'Mathematics', isUnitSchool: false },
  { name: 'Wolfram', category: 'Mathematics', isUnitSchool: false },
];

// Text-based company item (no logo assets)
const LogoItem = memo(({ company, keyPrefix }) => {
  const { name, category, isUnitSchool } = company;
  const className = `company-marquee__logo company-marquee__logo--text ${isUnitSchool ? 'company-marquee__logo--unit-school' : ''}`;

  return (
    <div
      key={keyPrefix}
      className="company-marquee__item"
      aria-label={`${name} - ${category}`}
    >
      <span className={className} aria-label={`${name} logo`}>
        {name}
      </span>
    </div>
  );
});

LogoItem.displayName = 'LogoItem';

const CompanyMarquee = memo(() => {
  const [isVisible, setIsVisible] = useState(false);
  const marqueeRef = useRef(null);
  const contentRef = useRef(null);
  const observerRef = useRef(null);
  const animationStartedRef = useRef(false);

  // Tab visibility detection - pause animation when tab is not active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (contentRef.current) {
        if (document.hidden) {
          contentRef.current.style.animationPlayState = 'paused';
        } else if (isVisible) {
          contentRef.current.style.animationPlayState = 'running';
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isVisible]);

  // Optimized Intersection Observer with disconnect after first visibility
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animationStartedRef.current) {
          // Add delay before starting animation to reduce initial load impact
          setTimeout(() => {
            setIsVisible(true);
            animationStartedRef.current = true;
            // Disconnect observer after first visibility to reduce ongoing cost
            if (observerRef.current) {
              observerRef.current.disconnect();
            }
          }, 300);
        }
      },
      {
        threshold: 0.3, // Start animation later for better performance
        rootMargin: '0px' // Remove preloading margin
      }
    );

    if (marqueeRef.current) {
      observerRef.current.observe(marqueeRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Memoize the rendered logo items to prevent recreation
  // Reduced from 3 sets to 2 sets (33% DOM reduction = 16 vs 24 elements)
  const logoItems = useMemo(() => {
    const items = [];
    
    // Generate two sets efficiently (reduced from 3)
    for (let set = 0; set < 2; set++) {
      COMPANIES.forEach((company, index) => {
        items.push(
          <LogoItem 
            key={`${set}-${index}`}
            company={company}
            keyPrefix={`${set}-${index}`}
          />
        );
      });
    }
    
    return items;
  }, []);

  return (
    <section 
      ref={marqueeRef}
      className="company-marquee" 
      aria-label="Trusted educational partners"
    >
      <div className="company-marquee__container">
        <div className="company-marquee__track">
          <div 
            ref={contentRef}
            className={`company-marquee__content ${isVisible ? 'company-marquee__content--animate' : ''}`}
          >
            {logoItems}
          </div>
        </div>
      </div>
    </section>
  );
});

CompanyMarquee.displayName = 'CompanyMarquee';

export default CompanyMarquee; 