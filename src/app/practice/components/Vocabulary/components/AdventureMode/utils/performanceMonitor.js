// Optimized performance monitoring utility for AdventureMode
class PerformanceMonitor {
    constructor(options = {}) {
        this.config = {
            maxMetricsHistory: options.maxMetricsHistory || 100,
            slowRenderThreshold: options.slowRenderThreshold || (this.isMobile() ? 33 : 16), // 30fps mobile, 60fps desktop
            criticalRenderThreshold: options.criticalRenderThreshold || 50,
            logThrottleMs: options.logThrottleMs || 5000,
            sampleRate: options.sampleRate || (this.isMobile() ? 0.1 : 0.5), // Sample less on mobile
            ...options
        };

        this.metrics = {
            renderCount: 0,
            sampledRenderCount: 0,
            lastRenderTime: 0,
            totalRenderTime: 0,
            slowRenders: 0,
            criticalRenders: 0,
            renderTimes: [], // Circular buffer for recent render times
            fps: 0,
            lastFpsUpdate: 0
        };

        this.lastLogTime = 0;
        this.isEnabled = process.env.NODE_ENV === 'development';
        this.rafId = null;
        
        // Mobile-specific optimizations
        this.isMobileDevice = this.isMobile();
        this.lowEndDevice = this.isLowEndDevice();
        
        // Throttle expensive operations on mobile
        if (this.isMobileDevice) {
            this.debouncedLogMetrics = this.debounce(this.logMetrics.bind(this), 1000);
        }

        // Start FPS monitoring
        if (this.isEnabled) {
            this.startFpsMonitoring();
        }
    }

    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768;
    }

    isLowEndDevice() {
        // Detect low-end devices based on various factors
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        const effectiveType = connection?.effectiveType;
        const deviceMemory = navigator.deviceMemory;
        const hardwareConcurrency = navigator.hardwareConcurrency;

        return (
            effectiveType === 'slow-2g' || 
            effectiveType === '2g' ||
            (deviceMemory && deviceMemory <= 2) ||
            (hardwareConcurrency && hardwareConcurrency <= 2)
        );
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    startFpsMonitoring() {
        if (!this.isEnabled) return;
        
        let lastTime = performance.now();
        let frameCount = 0;
        
        const measureFps = (currentTime) => {
            frameCount++;
            
            if (currentTime - lastTime >= 1000) {
                this.metrics.fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
                this.metrics.lastFpsUpdate = currentTime;
                frameCount = 0;
                lastTime = currentTime;
            }
            
            this.rafId = requestAnimationFrame(measureFps);
        };
        
        this.rafId = requestAnimationFrame(measureFps);
    }

    shouldSample() {
        return Math.random() < this.config.sampleRate;
    }

    startRender() {
        if (!this.isEnabled) return null;
        
        this.metrics.renderCount++;
        
        // Sample less frequently on mobile/low-end devices
        if (!this.shouldSample()) {
            return null;
        }
        
        this.metrics.sampledRenderCount++;
        const startTime = performance.now();
        this.metrics.lastRenderTime = startTime;
        
        return startTime;
    }

    endRender(startTime = null) {
        if (!this.isEnabled || startTime === null) return;
        
        const renderTime = performance.now() - (startTime || this.metrics.lastRenderTime);
        
        // Update total render time for average calculation
        this.metrics.totalRenderTime += renderTime;
        
        // Maintain circular buffer of recent render times
        this.metrics.renderTimes.push(renderTime);
        if (this.metrics.renderTimes.length > this.config.maxMetricsHistory) {
            this.metrics.renderTimes.shift();
        }
        
        // Track slow and critical renders
        if (renderTime > this.config.slowRenderThreshold) {
            this.metrics.slowRenders++;
        }
        
        if (renderTime > this.config.criticalRenderThreshold) {
            this.metrics.criticalRenders++;
            
            // Only log critical renders, and throttle the logging
            const now = performance.now();
            if (now - this.lastLogTime > this.config.logThrottleMs) {
                console.warn(
                    `AdventureMode: Critical render detected (${renderTime.toFixed(2)}ms) - ` +
                    `Target: ${this.config.slowRenderThreshold}ms | FPS: ${this.metrics.fps}`
                );
                this.lastLogTime = now;
            }
        }
    }

    getAverageRenderTime() {
        return this.metrics.sampledRenderCount > 0 
            ? this.metrics.totalRenderTime / this.metrics.sampledRenderCount 
            : 0;
    }

    getPercentile(percentile) {
        if (this.metrics.renderTimes.length === 0) return 0;
        
        const sorted = [...this.metrics.renderTimes].sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)];
    }

    getMemoryUsage() {
        // Safely check for memory API (Chrome only)
        try {
            if (performance.memory) {
                return {
                    used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024 * 100) / 100,
                    total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024 * 100) / 100,
                    limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024 * 100) / 100
                };
            }
        } catch (e) {
            // Memory API not available or blocked
        }
        return null;
    }

    getMetrics() {
        if (!this.isEnabled) return null;
        
        const avgRenderTime = this.getAverageRenderTime();
        const memory = this.getMemoryUsage();
        
        return {
            totalRenders: this.metrics.renderCount,
            sampledRenders: this.metrics.sampledRenderCount,
            averageRenderTime: Math.round(avgRenderTime * 100) / 100,
            p50RenderTime: Math.round(this.getPercentile(50) * 100) / 100,
            p95RenderTime: Math.round(this.getPercentile(95) * 100) / 100,
            p99RenderTime: Math.round(this.getPercentile(99) * 100) / 100,
            slowRenders: this.metrics.slowRenders,
            criticalRenders: this.metrics.criticalRenders,
            slowRenderPercentage: this.metrics.sampledRenderCount > 0 
                ? Math.round((this.metrics.slowRenders / this.metrics.sampledRenderCount * 100) * 100) / 100
                : 0,
            criticalRenderPercentage: this.metrics.sampledRenderCount > 0
                ? Math.round((this.metrics.criticalRenders / this.metrics.sampledRenderCount * 100) * 100) / 100
                : 0,
            currentFps: this.metrics.fps,
            targetFps: Math.round(1000 / this.config.slowRenderThreshold),
            deviceInfo: {
                isMobile: this.isMobileDevice,
                isLowEnd: this.lowEndDevice,
                sampleRate: this.config.sampleRate
            },
            memory
        };
    }

    logMetrics() {
        if (!this.isEnabled) return;
        
        const metrics = this.getMetrics();
        if (!metrics || metrics.sampledRenders === 0) return;
        
        // Group related metrics for better readability
        const performanceData = {
            'Render Performance': {
                'Total Renders': metrics.totalRenders,
                'Sampled Renders': metrics.sampledRenders,
                'Average Time': `${metrics.averageRenderTime}ms`,
                'P95 Time': `${metrics.p95RenderTime}ms`,
                'Current FPS': metrics.currentFps,
                'Target FPS': metrics.targetFps
            },
            'Performance Issues': {
                'Slow Renders': `${metrics.slowRenders} (${metrics.slowRenderPercentage}%)`,
                'Critical Renders': `${metrics.criticalRenders} (${metrics.criticalRenderPercentage}%)`
            },
            'Device Info': metrics.deviceInfo
        };
        
        if (metrics.memory) {
            performanceData['Memory Usage'] = {
                'Used': `${metrics.memory.used}MB`,
                'Total': `${metrics.memory.total}MB`,
                'Usage %': `${Math.round((metrics.memory.used / metrics.memory.total) * 100)}%`
            };
        }
        
        console.group('🚀 AdventureMode Performance Metrics');
        Object.entries(performanceData).forEach(([category, data]) => {
            console.group(category);
            console.table(data);
            console.groupEnd();
        });
        
        // Add performance recommendations
        this.logRecommendations(metrics);
        console.groupEnd();
    }

    logRecommendations(metrics) {
        const recommendations = [];
        
        if (metrics.criticalRenderPercentage > 5) {
            recommendations.push('🔴 High critical render rate - consider reducing DOM complexity or optimizing heavy computations');
        }
        
        if (metrics.slowRenderPercentage > 10) {
            recommendations.push('🟡 High slow render rate - check for unnecessary re-renders or expensive operations');
        }
        
        if (metrics.currentFps < metrics.targetFps * 0.8) {
            recommendations.push('🔴 Low FPS detected - consider implementing virtualization or reducing animation complexity');
        }
        
        if (metrics.memory && (metrics.memory.used / metrics.memory.total) > 0.8) {
            recommendations.push('🟡 High memory usage - check for memory leaks or consider implementing cleanup');
        }
        
        if (metrics.deviceInfo.isLowEnd && metrics.averageRenderTime > 20) {
            recommendations.push('📱 Low-end device detected - consider reducing visual effects or implementing performance mode');
        }
        
        if (recommendations.length > 0) {
            console.group('💡 Performance Recommendations');
            recommendations.forEach(rec => console.log(rec));
            console.groupEnd();
        }
    }

    reset() {
        this.metrics = {
            renderCount: 0,
            sampledRenderCount: 0,
            lastRenderTime: 0,
            totalRenderTime: 0,
            slowRenders: 0,
            criticalRenders: 0,
            renderTimes: [],
            fps: 0,
            lastFpsUpdate: 0
        };
    }

    destroy() {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Enhanced hook for monitoring component performance
export const usePerformanceMonitor = (componentName, options = {}) => {
    if (process.env.NODE_ENV === 'development') {
        const monitor = options.createSeparateInstance 
            ? new PerformanceMonitor({
                ...options,
                maxMetricsHistory: 50, // Smaller buffer for component-specific monitoring
                sampleRate: 0.2 // Lower sample rate for components
              })
            : performanceMonitor;

        return {
            startRender: () => monitor.startRender(),
            endRender: (startTime) => monitor.endRender(startTime),
            logMetrics: () => {
                if (componentName) {
                    console.group(`📊 ${componentName} Performance`);
                    monitor.logMetrics();
                    console.groupEnd();
                } else {
                    monitor.logMetrics();
                }
            },
            getMetrics: () => monitor.getMetrics(),
            reset: () => monitor.reset()
        };
    }
    
    // Return no-op functions for production
    return {
        startRender: () => null,
        endRender: () => {},
        logMetrics: () => {},
        getMetrics: () => null,
        reset: () => {}
    };
};

// React hook for automatic component performance monitoring
export const useComponentPerformanceMonitor = (componentName, deps = []) => {
    const { startRender, endRender } = usePerformanceMonitor(componentName);
    
    React.useLayoutEffect(() => {
        if (process.env.NODE_ENV !== 'development') {
            return;
        }
        
        const startTime = startRender();
        return () => {
            endRender(startTime);
        };
    }, [startRender, endRender, deps]);
};