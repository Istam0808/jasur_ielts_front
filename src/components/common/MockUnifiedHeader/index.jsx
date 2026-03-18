"use client";

import { useEffect, useState } from "react";
import { FiSettings, FiWifi, FiWifiOff, FiX } from "react-icons/fi";
import { useMockUi } from "@/components/common/MockUiContext";
import styles from "./style.module.scss";

const TEXT_SIZE_OPTIONS = [
    { value: "regular", label: "Regular" },
    { value: "large", label: "Large" },
    { value: "extraLarge", label: "Extra Large" },
];

export default function MockUnifiedHeader({
    testTakerId = "",
    centerContent = null
}) {
    const { textSize, setTextSize } = useMockUi();
    const [isOnline, setIsOnline] = useState(true);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    useEffect(() => {
        const syncStatus = () => setIsOnline(window.navigator.onLine);
        syncStatus();

        window.addEventListener("online", syncStatus);
        window.addEventListener("offline", syncStatus);

        return () => {
            window.removeEventListener("online", syncStatus);
            window.removeEventListener("offline", syncStatus);
        };
    }, []);

    useEffect(() => {
        if (!isSettingsOpen) return undefined;

        const closeOnEscape = (event) => {
            if (event.key === "Escape") {
                setIsSettingsOpen(false);
            }
        };

        document.addEventListener("keydown", closeOnEscape);
        return () => document.removeEventListener("keydown", closeOnEscape);
    }, [isSettingsOpen]);

    return (
        <>
            <header className={styles.header} id="mockUnifiedHeader">
                <div className={styles.left}>
                    <span className={styles.modeTitle}>IELTS MODE</span>
                    {testTakerId ? (
                        <span className={styles.takerText}>Test taker: {testTakerId}</span>
                    ) : null}
                </div>

                <div className={styles.center}>
                    {centerContent ? (
                        typeof centerContent === "string"
                            ? <span className={styles.centerText}>{centerContent}</span>
                            : <div className={styles.centerNode}>{centerContent}</div>
                    ) : null}
                </div>

                <div className={styles.right}>
                    <span
                        className={`${styles.connection} ${isOnline ? styles.online : styles.offline}`}
                        title={isOnline ? "Connected to internet" : "No internet connection"}
                        role="status"
                        aria-live="polite"
                    >
                        <span className={styles.srOnly}>
                            {isOnline ? "Connected to internet" : "No internet connection"}
                        </span>
                        {isOnline ? <FiWifi aria-hidden="true" /> : <FiWifiOff aria-hidden="true" />}
                    </span>

                    <button
                        type="button"
                        className={styles.settingsButton}
                        aria-label="Open text size settings"
                        onClick={() => setIsSettingsOpen(true)}
                    >
                        <FiSettings aria-hidden="true" />
                    </button>
                </div>
            </header>

            {isSettingsOpen && (
                <div
                    className={styles.overlay}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="mockSettingsTitle"
                    onClick={() => setIsSettingsOpen(false)}
                >
                    <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2 id="mockSettingsTitle">Text Size</h2>
                            <button
                                type="button"
                                className={styles.closeButton}
                                aria-label="Close settings"
                                onClick={() => setIsSettingsOpen(false)}
                            >
                                <FiX aria-hidden="true" />
                            </button>
                        </div>

                        <div className={styles.options}>
                            {TEXT_SIZE_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    className={`${styles.optionButton} ${textSize === option.value ? styles.active : ""}`}
                                    onClick={() => {
                                        setTextSize(option.value);
                                        setIsSettingsOpen(false);
                                    }}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
