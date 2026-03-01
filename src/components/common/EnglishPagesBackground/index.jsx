"use client";
import { useState, useEffect, memo, useRef } from 'react';
import Image from 'next/image';
import englishPagesBg from '@/assets/images/full-website-bg.webp';
import './style.scss';

const EnglishPagesBackground = memo(() => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const containerRef = useRef(null);

    // Intersection Observer for lazy loading
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsVisible(true);
                        observer.disconnect();
                    }
                });
            },
            {
                root: null,
                rootMargin: '50px',
                threshold: 0.01
            }
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => {
            if (containerRef.current) {
                observer.unobserve(containerRef.current);
            }
            observer.disconnect();
        };
    }, []);

    const handleImageLoad = () => {
        setIsLoaded(true);
    };

    return (
        <div 
            ref={containerRef}
            className="english-pages-background"
            aria-hidden="true"
        >
            {isVisible && (
                <div className={`background-image-container ${isLoaded ? 'loaded' : ''}`}>
                    <Image
                        src={englishPagesBg}
                        alt=""
                        fill
                        loading="lazy"
                        quality={85}
                        sizes="100vw"
                        onLoad={handleImageLoad}
                        style={{
                            objectFit: 'cover',
                            objectPosition: 'center'
                        }}
                    />
                </div>
            )}
            <div className="transparency-overlay" />
        </div>
    );
});

EnglishPagesBackground.displayName = 'EnglishPagesBackground';

export default EnglishPagesBackground;

