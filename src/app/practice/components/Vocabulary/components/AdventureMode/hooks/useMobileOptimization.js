import { useRef, useEffect, useCallback, useState } from 'react';

export const useMobileOptimization = () => {
    const [deviceSettings, setDeviceSettings] = useState({
        isMobile: false,
        isLowPerformance: false,
        fps: 60
    });

    const performanceMonitor = useRef({
        frameCount: 0,
        lastTime: (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : 0,
        fps: 60,
        rafId: null
    });

    const isInitialized = useRef(false);

    // Device & capability detection
    const detectDevice = useCallback(() => {
        if (typeof window === 'undefined' || typeof navigator === 'undefined') {
            return { isMobile: false, isLowPerformance: false };
        }

        const width = window.innerWidth || 0;
        const pixelRatio = window.devicePixelRatio || 1;

        const prefersReducedMotion = typeof window.matchMedia === 'function'
            ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
            : false;

        const isMobile = width > 0 && width <= 768;

        const memory = navigator.deviceMemory || 4;
        const cores = navigator.hardwareConcurrency || 4;
        const connection = navigator.connection || {};
        const effectiveType = connection.effectiveType || '';
        const isSlowNet = effectiveType === 'slow-2g' || effectiveType === '2g';

        const isLikelyHeavyRendering = pixelRatio > 2;

        const isLowEnd = memory < 4 || cores < 4 || isSlowNet || isLikelyHeavyRendering || prefersReducedMotion;
        const isLowPerformance = isLowEnd || isMobile;

        return { isMobile, isLowPerformance };
    }, []);

    // FPS / performance monitoring
    const monitorPerformance = useCallback(() => {
        if (
            typeof window === 'undefined' ||
            typeof requestAnimationFrame === 'undefined' ||
            typeof cancelAnimationFrame === 'undefined' ||
            typeof performance === 'undefined' ||
            typeof performance.now !== 'function'
        ) {
            return;
        }

        const loop = () => {
            if (!isInitialized.current) {
                if (performanceMonitor.current.rafId != null) {
                    cancelAnimationFrame(performanceMonitor.current.rafId);
                    performanceMonitor.current.rafId = null;
                }
                return;
            }

            if (typeof document !== 'undefined' && document.hidden) {
                performanceMonitor.current.frameCount = 0;
                performanceMonitor.current.lastTime = performance.now();
                performanceMonitor.current.rafId = requestAnimationFrame(loop);
                return;
            }

            performanceMonitor.current.frameCount += 1;
            const now = performance.now();
            const elapsed = now - performanceMonitor.current.lastTime;

            if (elapsed >= 1000) {
                const newFps = performanceMonitor.current.frameCount;
                performanceMonitor.current.fps = newFps;
                performanceMonitor.current.frameCount = 0;
                performanceMonitor.current.lastTime = now;

                setDeviceSettings(prev => {
                    const fpsChanged = Math.abs(prev.fps - newFps) > 5;
                    const computedLowPerf = newFps < 30 || prev.isLowPerformance;

                    if (!fpsChanged && computedLowPerf === prev.isLowPerformance) return prev;

                    return {
                        ...prev,
                        fps: fpsChanged ? newFps : prev.fps,
                        isLowPerformance: computedLowPerf
                    };
                });
            }

            performanceMonitor.current.rafId = requestAnimationFrame(loop);
        };

        performanceMonitor.current.lastTime = performance.now();
        performanceMonitor.current.frameCount = 0;
        performanceMonitor.current.rafId = requestAnimationFrame(loop);
    }, []);

    // Init / listeners / cleanup
    useEffect(() => {
        isInitialized.current = true;

        const localMonitor = performanceMonitor.current; // capture ref once

        const applyDeviceSettings = () => {
            const { isMobile, isLowPerformance } = detectDevice();
            setDeviceSettings(prev => {
                if (prev.isMobile === isMobile && prev.isLowPerformance === isLowPerformance) return prev;
                return { ...prev, isMobile, isLowPerformance };
            });
        };

        applyDeviceSettings();

        const monitoringTimer = setTimeout(() => {
            if (isInitialized.current) monitorPerformance();
        }, 120);

        let resizeTimeout;
        const handleResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(applyDeviceSettings, 150);
        };

        const handleVisibilityChange = () => {
            if (typeof document === 'undefined') return;
            if (document.hidden) {
                if (localMonitor.rafId != null) {
                    cancelAnimationFrame(localMonitor.rafId);
                    localMonitor.rafId = null;
                }
                localMonitor.frameCount = 0;
            } else if (isInitialized.current) {
                monitorPerformance();
            }
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('resize', handleResize, { passive: true });
        }
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', handleVisibilityChange);
        }

        return () => {
            isInitialized.current = false;
            clearTimeout(monitoringTimer);
            clearTimeout(resizeTimeout);

            if (localMonitor.rafId != null) {
                cancelAnimationFrame(localMonitor.rafId);
                localMonitor.rafId = null;
            }

            if (typeof window !== 'undefined') {
                window.removeEventListener('resize', handleResize);
            }
            if (typeof document !== 'undefined') {
                document.removeEventListener('visibilitychange', handleVisibilityChange);
            }
        };
    }, [detectDevice, monitorPerformance]);

    // Utilities
    const getOptimizedDuration = useCallback((baseDuration) => {
        if (typeof baseDuration !== 'number' || baseDuration <= 0) return 300;
        if (deviceSettings.isLowPerformance) {
            return Math.min(Math.max(180, baseDuration * 0.7), 1000);
        }
        return baseDuration;
    }, [deviceSettings.isLowPerformance]);

    const getOptimizedEasing = useCallback(() => {
        return deviceSettings.isLowPerformance ? 'easeOut' : 'easeInOut';
    }, [deviceSettings.isLowPerformance]);

    const shouldReduceEffects = useCallback(() => {
        return deviceSettings.isLowPerformance || deviceSettings.fps < 45;
    }, [deviceSettings.isLowPerformance, deviceSettings.fps]);

    const getTouchSettings = useCallback(() => {
        if (typeof window === 'undefined') return {};
        return {
            touchAction: 'manipulation',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none',
            WebkitTapHighlightColor: 'transparent'
        };
    }, []);

    const optimizeScroll = useCallback((element) => {
        if (!element || typeof window === 'undefined') return;
        element.style.WebkitOverflowScrolling = 'touch';
        element.style.scrollBehavior = deviceSettings.isLowPerformance ? 'auto' : 'smooth';
        element.style.overscrollBehavior = 'contain';
    }, [deviceSettings.isLowPerformance]);

    const getDeviceSettings = useCallback(() => {
        return {
            isMobile: deviceSettings.isMobile,
            isLowPerformance: deviceSettings.isLowPerformance,
            fps: deviceSettings.fps,
            shouldReduceEffects: shouldReduceEffects(),
            touchSettings: getTouchSettings()
        };
    }, [deviceSettings, shouldReduceEffects, getTouchSettings]);

    return {
        isMobile: deviceSettings.isMobile,
        isLowPerformance: deviceSettings.isLowPerformance,
        getOptimizedDuration,
        getOptimizedEasing,
        shouldReduceEffects,
        getTouchSettings,
        optimizeScroll,
        getDeviceSettings
    };
};
