"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
    FiCheckCircle,
    FiAlertTriangle,
    FiRefreshCw,
    FiWifiOff,
    FiX,
} from "react-icons/fi";
import { showToast } from "@/lib/toastNotify";
import { useTranslation } from "react-i18next";
import "./SyncStatusIndicator.scss";

const TOAST_COOLDOWN = 5000; // 5 seconds cooldown

/** Singleton for network status */
class NetworkStatusManager {
    static instance;

    constructor() {
        if (NetworkStatusManager.instance) {
            return NetworkStatusManager.instance;
        }

        this.listeners = new Set();
        this.isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
        this.lastToastTime = 0;
        this.isInitialized = false;
        this.translateFunction = null;

        this.handleOnline = this.handleOnline.bind(this);
        this.handleOffline = this.handleOffline.bind(this);

        NetworkStatusManager.instance = this;
    }

    init() {
        if (this.isInitialized || typeof window === "undefined") return;
        window.addEventListener("online", this.handleOnline);
        window.addEventListener("offline", this.handleOffline);
        this.isInitialized = true;
    }

    handleOnline() {
        this.updateStatus(true, () => {
            this.maybeShowToast(() =>
                showToast.success(this.translateFunction ? this.translateFunction('toast.backOnline') : "You are back online! Your data will sync automatically.", {
                    position: "top-right",
                    duration: 4000,
                })
            );
        });
    }

    handleOffline() {
        this.updateStatus(false, () => {
            this.maybeShowToast(() =>
                showToast.warning(this.translateFunction ? this.translateFunction('toast.offline') : "You are offline. Data will be saved locally and synced later.", {
                    position: "top-right",
                    duration: 5000,
                })
            );
        });
    }

    updateStatus(newStatus, toastCallback) {
        if (this.isOnline !== newStatus) {
            toastCallback?.();
            this.isOnline = newStatus;
            this.notifyListeners();
        }
    }

    maybeShowToast(callback) {
        const now = Date.now();
        if (now - this.lastToastTime >= TOAST_COOLDOWN) {
            callback();
            this.lastToastTime = now;
        }
    }

    subscribe(listener) {
        this.listeners.add(listener);
        listener(this.isOnline);
        return () => this.listeners.delete(listener);
    }

    notifyListeners() {
        this.listeners.forEach((listener) => listener(this.isOnline));
    }

    getStatus() {
        return this.isOnline;
    }

    setTranslateFunction(translateFn) {
        this.translateFunction = translateFn;
    }
}

const getNetworkManager = () => new NetworkStatusManager();

const SyncStatusIndicator = ({
    showDetails = true,
    autoRefresh = true,
    position = "inline",
    demoMode = false,
}) => {
    const { t } = useTranslation('syncStatus');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState("bottom");
    const [isMobile, setIsMobile] = useState(false);
    const [isOnline, setIsOnline] = useState(
        typeof navigator !== "undefined" ? navigator.onLine : true
    );
    const [queueStats, setQueueStats] = useState({
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
    });

    const indicatorRef = useRef(null);
    const dropdownRef = useRef(null);
    const demoIntervalRef = useRef(null);

    /** Subscribe to network manager */
    useEffect(() => {
        const manager = getNetworkManager();
        manager.init();
        // Set the translation function for the manager
        manager.setTranslateFunction(t);
        const unsubscribe = manager.subscribe(setIsOnline);
        return unsubscribe;
    }, [t]);

    /** Demo mode simulation */
    useEffect(() => {
        if (!demoMode) return;
        const demoStates = ["synced", "syncing", "error", "offline"];

        demoIntervalRef.current = setInterval(() => {
            const randomState = demoStates[Math.floor(Math.random() * demoStates.length)];

            if (randomState === "syncing") {
                setQueueStats({
                    pending: Math.floor(Math.random() * 5),
                    processing: Math.floor(Math.random() * 3),
                    completed: Math.floor(Math.random() * 20),
                    failed: 0,
                });
            } else if (randomState === "error") {
                setQueueStats({
                    pending: 0,
                    processing: 0,
                    completed: Math.floor(Math.random() * 20),
                    failed: Math.floor(Math.random() * 3) + 1,
                });
            } else if (randomState === "offline") {
                setQueueStats({ pending: 0, processing: 0, completed: 0, failed: 0 });
                setIsOnline(false);
            } else {
                setQueueStats({
                    pending: 0,
                    processing: 0,
                    completed: Math.floor(Math.random() * 20),
                    failed: 0,
                });
                setIsOnline(true);
            }
        }, 3000);

        return () => clearInterval(demoIntervalRef.current);
    }, [demoMode]);

    /** Detect mobile */
    useEffect(() => {
        if (typeof window === "undefined") return;
        const updateDevice = () => setIsMobile(window.innerWidth <= 1024);
        updateDevice();
        window.addEventListener("resize", updateDevice);
        return () => window.removeEventListener("resize", updateDevice);
    }, []);

    /** Dropdown positioning */
    const calculateDropdownPosition = useCallback(() => {
        if (!indicatorRef.current || !dropdownRef.current || typeof window === "undefined" || isMobile)
            return;

        const indicatorRect = indicatorRef.current.getBoundingClientRect();
        const dropdownRect = dropdownRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        let newPos = "bottom";
        if (indicatorRect.bottom + dropdownRect.height > viewportHeight - 20) {
            newPos = "top";
        }
        if (indicatorRect.left + dropdownRect.width > viewportWidth - 20) {
            newPos = newPos === "top" ? "top-left" : "bottom-left";
        }
        setDropdownPosition(newPos);

        const dropdown = dropdownRef.current;
        if (!dropdown) return;

        let top, left;
        if (newPos.startsWith("top")) {
            top = indicatorRect.top - dropdownRect.height - 8;
        } else {
            top = indicatorRect.bottom + 8;
        }
        if (newPos.endsWith("left")) {
            left = indicatorRect.right - dropdownRect.width;
        } else {
            left = indicatorRect.left;
        }

        // Ensure dropdown within viewport
        top = Math.max(20, Math.min(top, viewportHeight - dropdownRect.height - 20));
        left = Math.max(20, Math.min(left, viewportWidth - dropdownRect.width - 20));

        dropdown.style.top = `${top}px`;
        dropdown.style.left = `${left}px`;
    }, [isMobile]);

    /** Recalculate when dropdown opens */
    useEffect(() => {
        if (dropdownRef.current && isDropdownOpen && !isMobile) {
            calculateDropdownPosition();
        }
    }, [isDropdownOpen, isMobile, calculateDropdownPosition]);

    useEffect(() => {
        if (!isDropdownOpen || typeof window === "undefined" || isMobile) return;

        const timer = setTimeout(calculateDropdownPosition, 10);
        const handleResizeScroll = () => calculateDropdownPosition();

        window.addEventListener("resize", handleResizeScroll);
        window.addEventListener("scroll", handleResizeScroll);

        return () => {
            clearTimeout(timer);
            window.removeEventListener("resize", handleResizeScroll);
            window.removeEventListener("scroll", handleResizeScroll);
        };
    }, [isDropdownOpen, isMobile, calculateDropdownPosition]);

    /** Compute overall sync status */
    const overallStatus = useMemo(() => {
        if (!isOnline) {
            return {
                icon: FiWifiOff,
                color: "var(--sync-status-offline)",
                status: "offline",
                message: t('status.offline.message'),
                details: t('status.offline.details'),
                bgColor: "var(--sync-status-offline-bg)",
            };
        }
        if (queueStats.failed > 0) {
            return {
                icon: FiAlertTriangle,
                color: "var(--sync-status-error)",
                status: "error",
                message: t('status.error.message', { count: queueStats.failed, plural: queueStats.failed > 1 ? 's' : '' }),
                details: t('status.error.details'),
                bgColor: "var(--sync-status-error-bg)",
            };
        }
        if (queueStats.pending > 0 || queueStats.processing > 0) {
            return {
                icon: FiRefreshCw,
                color: "var(--sync-status-syncing)",
                status: "syncing",
                message: t('status.syncing.message'),
                details: t('status.syncing.details', { count: queueStats.pending + queueStats.processing, plural: (queueStats.pending + queueStats.processing) > 1 ? 's' : '' }),
                bgColor: "var(--sync-status-syncing-bg)",
            };
        }
        return {
            icon: FiCheckCircle,
            color: "var(--sync-status-synced)",
            status: "synced",
            message: t('status.synced.message'),
            details: t('status.synced.details'),
            bgColor: "var(--sync-status-synced-bg)",
        };
    }, [isOnline, queueStats, t]);

    /** Manual sync */
    const handleForceSync = useCallback(() => {
        showToast.info(t('toast.manualSyncStart'), { duration: 2000 });
        setTimeout(() => {
            showToast.success(t('toast.manualSyncSuccess'), { duration: 3000 });
        }, 2000);
    }, [t]);

    /** Hide if nothing to show */
    if (!showDetails && overallStatus.status === "synced" && !queueStats.pending && !queueStats.processing) {
        return null;
    }

    /** Dropdown UI */
    const renderDropdownContent = () => (
        <div
            ref={dropdownRef}
            className={`sync-status-indicator__details sync-status-indicator__details--${dropdownPosition} ${
                isMobile ? "sync-status-indicator__details--mobile" : ""
            }`}
        >
            <div className="sync-status-indicator__header">
                <h4>{t('ui.syncStatus')}</h4>
                <button
                    className="sync-status-indicator__close"
                    onClick={() => setIsDropdownOpen(false)}
                    aria-label={t('ui.close')}
                >
                    <FiX />
                </button>
            </div>

            <div className="sync-status-indicator__section">
                <h5>{t('ui.currentStatus')}</h5>
                <p>{overallStatus.message}</p>
                <small>{overallStatus.details}</small>
            </div>

            <div className="sync-status-indicator__section">
                <h5>{t('ui.network')}</h5>
                <p>{isOnline ? t('ui.online') : t('ui.offline')}</p>
            </div>

            {(queueStats.pending > 0 || queueStats.processing > 0 || queueStats.failed > 0) && (
                <div className="sync-status-indicator__section">
                    <h5>{t('ui.syncQueue')}</h5>
                    {queueStats.pending > 0 && <p>{t('ui.waiting', { count: queueStats.pending })}</p>}
                    {queueStats.processing > 0 && <p>{t('ui.syncing', { count: queueStats.processing })}</p>}
                    {queueStats.failed > 0 && <p className="error">{t('ui.failed', { count: queueStats.failed })}</p>}
                </div>
            )}

            <div className="sync-status-indicator__section">
                <h5>{t('ui.actions')}</h5>
                <button onClick={handleForceSync} disabled={!isOnline}>
                    <FiRefreshCw /> {t('ui.syncNow')}
                </button>
                {queueStats.failed > 0 && (
                    <button onClick={handleForceSync} disabled={!isOnline}>
                        <FiAlertTriangle /> {t('ui.retryFailed')}
                    </button>
                )}
            </div>
        </div>
    );

    const { icon: Icon, color, bgColor } = overallStatus;

    return (
        <div className={`sync-status-indicator sync-status-indicator--${position}`}>
            <div
                ref={indicatorRef}
                className="sync-status-indicator__compact"
                onClick={() => setIsDropdownOpen((v) => !v)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setIsDropdownOpen((v) => !v)}
                aria-label={overallStatus.message}
                title={overallStatus.message}
            >
                <div 
                    className="sync-status-indicator__icon-wrapper"
                    style={{ backgroundColor: bgColor }}
                >
                    <Icon 
                        style={{ color }} 
                        className={`sync-status-indicator__icon sync-status-indicator__icon--${overallStatus.status}`} 
                    />
                    {overallStatus.status === "syncing" && (
                        <div className="sync-status-indicator__pulse"></div>
                    )}
                </div>
            </div>

            {position === "inline" && <span className="sync-status-indicator__text">{overallStatus.message}</span>}

            {isDropdownOpen &&
                typeof document !== "undefined" &&
                createPortal(
                    <div
                        className={`sync-status-indicator__portal-overlay ${
                            isMobile ? "sync-status-indicator__portal-overlay--mobile" : ""
                        }`}
                        onClick={() => setIsDropdownOpen(false)}
                    >
                        {renderDropdownContent()}
                    </div>,
                    document.body
                )}
        </div>
    );
};

export default SyncStatusIndicator;
