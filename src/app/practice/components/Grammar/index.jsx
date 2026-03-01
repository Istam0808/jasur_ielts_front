"use client";

import { useTranslation } from "react-i18next";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { BiErrorCircle } from "react-icons/bi";
import { IoChevronDown } from "react-icons/io5";
import {
  FaBookOpen,
  FaArrowRight,
  FaCheckCircle,
  FaHistory,
  FaClock,
} from "react-icons/fa";
import Pagination from "@/components/common/Pagination";
import Spinner from "@/components/common/spinner";
import GrammarHeader from "./components/GrammarHeader";
import Card from "@/components/common/Card";
import {
  shouldRefreshGrammarData,
  cacheGrammarData,
  getRefreshStatus,
  debugCacheStatus,
} from "@/utils/grammarDataRefresh";
import { useUser } from "@/contexts/UserContext";
import { useUserDataMirror } from "@/hooks/useUserDataMirror";
import { scrollToTop } from "@/utils/common";
import "../shared.scss";
import styles from "./grammar.module.scss";

const ITEMS_PER_PAGE = 9;
const IMMEDIATE_UPDATE_GUARD_MS = 5000;

const safeJSONParse = (v) => {
  try {
    return JSON.parse(v);
  } catch (_) {
    return null;
  }
};

const Grammar = ({ difficulty, language = "English", onChangeLevelClick }) => {
  const { t, i18n } = useTranslation(["practice", "grammar", "common"]);
  const router = useRouter();
  const { isAuthenticated } = useUser();
  const { loadMirror } = useUserDataMirror();

  const [grammarData, setGrammarData] = useState(null);
  const [grammarTopics, setGrammarTopics] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [completedMap, setCompletedMap] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState(null);

  const topicsListRef = useRef(null);
  const handlersRef = useRef({});
  const mirrorTimerRef = useRef(null);
  const fallbackTimeoutRef = useRef(null);
  const lastImmediateUpdateRef = useRef(0);

  const pagination = useMemo(() => {
    const totalItems = grammarTopics.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
    return {
      totalItems,
      totalPages,
      currentTopics: grammarTopics.slice(startIndex, endIndex),
      startItem: totalItems > 0 ? startIndex + 1 : 0,
      endItem: endIndex,
    };
  }, [grammarTopics, currentPage]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const mod = await import(
          `@/store/data/practice/language/english/grammar/${String(difficulty).toLowerCase()}.json`
        );
        const data = mod?.default || mod;
        if (data?.grammar_components?.core_grammar_topics?.length) {
          if (!mounted) return;
          setGrammarData(data);
          setGrammarTopics(data.grammar_components.core_grammar_topics);
          setCurrentPage(1);
        } else {
          throw new Error(
            t("error.invalidData", {
              ns: "grammar",
              defaultValue: "Grammar data not found or invalid format",
            })
          );
        }
      } catch (e) {
        console.error("Grammar: failed to load topics", e);
        if (mounted)
          setError(
            e?.message ||
              t("loadError", {
                ns: "grammar",
                defaultValue: "Failed to load grammar topics",
              })
          );
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [difficulty, t]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const status = await getRefreshStatus();
        if (mounted) setRefreshStatus(status);
        await debugCacheStatus();
      } catch (e) {
        console.warn("Grammar: failed to get refresh status", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const computeCompletionMapFromMirror = useCallback(
    (topics = [], mirror = {}, prev = {}) => {
      const out = {};
      try {
        const progress = mirror?.grammar?.progress || {};
        topics.forEach((topic) => {
          const entry = progress[topic.id] || {};
          const p = entry.progress || {};
          const stats = entry.stats || {};

          const isCompletedFromMirror =
            Boolean(stats.completed) || Number(p.completionPercent || 0) >= 100;
          const bestFromMirror = Number.isFinite(stats.bestCorrectPercent)
            ? stats.bestCorrectPercent
            : Number(p.correctPercent || 0);

          const current = prev[topic.id] || {};

          out[topic.id] = {
            isCompleted: Boolean(current.isCompleted) || isCompletedFromMirror,
            completionPercent: Math.max(
              Number.isFinite(current.completionPercent)
                ? current.completionPercent
                : 0,
              Number.isFinite(p.completionPercent)
                ? Math.max(0, Math.min(100, Math.round(p.completionPercent)))
                : 0
            ),
            correctPercent: Math.max(
              Number.isFinite(current.correctPercent)
                ? current.correctPercent
                : 0,
              Math.max(0, Math.min(100, Math.round(bestFromMirror || 0)))
            ),
            attemptsTotal: Math.max(
              Number.isFinite(current.attemptsTotal)
                ? current.attemptsTotal
                : 0,
              Number.isFinite(stats.attemptsTotal)
                ? Math.max(0, Math.round(stats.attemptsTotal))
                : 0
            ),
            bestAchievedAtAttempt: Math.max(
              Number.isFinite(current.bestAchievedAtAttempt)
                ? current.bestAchievedAtAttempt
                : 0,
              Number.isFinite(stats.bestAchievedAtAttempt)
                ? Math.max(0, Math.round(stats.bestAchievedAtAttempt))
                : 0
            ),
          };
        });
      } catch (e) {
        console.warn("Grammar: computeFromMirror error", e);
      }
      return out;
    },
    []
  );

  const computeCompletionMapFromLocal = useCallback((topics = []) => {
    const out = {};
    if (typeof window === "undefined") return out;
    try {
      topics.forEach((topic) => {
        const key = `grammar_progress_${topic.id}`;
        const raw =
          window.localStorage.getItem(key) ||
          window.localStorage.getItem(`grammar:progress:${topic.id}`) ||
          null;
        const v = safeJSONParse(raw) || {};
        out[topic.id] = {
          isCompleted: !!v.completed,
          completionPercent: Number.isFinite(v.completionPercent)
            ? Math.max(0, Math.min(100, Math.round(v.completionPercent)))
            : 0,
          correctPercent: Number.isFinite(v.bestCorrectPercent)
            ? Math.max(0, Math.min(100, Math.round(v.bestCorrectPercent)))
            : Number.isFinite(v.correctPercent)
              ? Math.max(0, Math.min(100, Math.round(v.correctPercent)))
              : 0,
          attemptsTotal: Number.isFinite(v.attemptsTotal)
            ? Math.max(0, Math.round(v.attemptsTotal))
            : 0,
          bestAchievedAtAttempt: Number.isFinite(v.bestAchievedAtAttempt)
            ? Math.max(0, Math.round(v.bestAchievedAtAttempt))
            : 0,
        };
      });
    } catch (e) {
      console.warn("Grammar: computeFromLocal error", e);
    }
    return out;
  }, []);

  const handleManualRefresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsRefreshing(true);
    try {
      const mirror = await loadMirror();
      if (!mirror) return;
      await cacheGrammarData(mirror);
      setCompletedMap((prev) =>
        computeCompletionMapFromMirror(grammarTopics, mirror, prev)
      );
      const status = await getRefreshStatus();
      setRefreshStatus(status);
    } catch (e) {
      console.error("Grammar: manual refresh failed", e);
    } finally {
      setIsRefreshing(false);
    }
  }, [
    isAuthenticated,
    loadMirror,
    grammarTopics,
    computeCompletionMapFromMirror,
  ]);

  const checkAndRefreshData = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const should = await shouldRefreshGrammarData();
      if (should) await handleManualRefresh();
    } catch (e) {
      console.warn("Grammar: checkAndRefreshData error", e);
    }
  }, [isAuthenticated, handleManualRefresh]);

  useEffect(() => {
    handlersRef.current.onStorage = (e) => {
      try {
        if (!e?.key?.startsWith("grammar_progress_")) return;
        if (!isAuthenticated)
          setCompletedMap((_) => computeCompletionMapFromLocal(grammarTopics));
      } catch (e) {
        // ignore
      }
    };

    handlersRef.current.onMirrorDebounced = () => {
      if (!isAuthenticated) return;
      try {
        if (mirrorTimerRef.current) clearTimeout(mirrorTimerRef.current);
      } catch (_) {}
      mirrorTimerRef.current = setTimeout(async () => {
        try {
          const m = await loadMirror();
          if (m)
            setCompletedMap((prev) =>
              computeCompletionMapFromMirror(grammarTopics, m, prev)
            );
        } catch (e) {
          console.warn("Grammar: mirror debounced update failed", e);
        }
      }, 3000);
    };

    handlersRef.current.onMirrorImmediate = async (eventDetail) => {
      if (!isAuthenticated || !grammarTopics.length) return;

      const now = Date.now();
      const recentImmediate =
        now - (lastImmediateUpdateRef.current || 0) <
          IMMEDIATE_UPDATE_GUARD_MS ||
        (refreshStatus?.lastUpdate &&
          now - refreshStatus.lastUpdate < IMMEDIATE_UPDATE_GUARD_MS);

      if (recentImmediate) return;

      try {
        const m = await loadMirror();
        if (m)
          setCompletedMap((prev) =>
            computeCompletionMapFromMirror(grammarTopics, m, prev)
          );
      } catch (e) {
        console.error("Grammar: onMirrorImmediate failed", e);
      }
    };

    handlersRef.current.onProgressUpdate = (detail) => {
      try {
        if (!grammarTopics.length || !detail) return;
        const { topicId, progress } = detail;
        if (!topicId || !progress) return;

        setCompletedMap((prev) => {
          const next = { ...prev };
          const topic = grammarTopics.find((t) => t.id === topicId);
          if (!topic) return prev;

          const isCompleted =
            !!progress.completed ||
            Number(progress.completionPercent || 0) >= 100;
          const best = Number.isFinite(progress.bestCorrectPercent)
            ? progress.bestCorrectPercent
            : Number(progress.correctPercent || 0);

          next[topicId] = {
            isCompleted,
            completionPercent: Number.isFinite(progress.completionPercent)
              ? Math.max(
                  0,
                  Math.min(100, Math.round(progress.completionPercent))
                )
              : 0,
            correctPercent: Math.max(0, Math.min(100, Math.round(best || 0))),
            attemptsTotal: Number.isFinite(progress.attemptsTotal)
              ? Math.max(0, Math.round(progress.attemptsTotal))
              : 0,
            bestAchievedAtAttempt: Number.isFinite(
              progress.bestAchievedAtAttempt
            )
              ? Math.max(0, Math.round(progress.bestAchievedAtAttempt))
              : 0,
          };
          return next;
        });
      } catch (e) {
        // ignore
      }
    };

    handlersRef.current.onUserDataCleared = () => {
      if (!grammarTopics.length) return;
      setCompletedMap(computeCompletionMapFromLocal(grammarTopics));
    };

    handlersRef.current.onForceRefresh = async () => {
      if (!isAuthenticated || !grammarTopics.length) return;
      await handleManualRefresh();
    };

    handlersRef.current.onImmediateRefresh = async (detail) => {
      if (!isAuthenticated || !grammarTopics.length || !detail) return;
      try {
        const { topicId, progress } = detail;
        if (!topicId || !progress) return;

        if (fallbackTimeoutRef.current) {
          clearTimeout(fallbackTimeoutRef.current);
          fallbackTimeoutRef.current = null;
        }

        setCompletedMap((prev) => {
          const next = { ...prev };
          const topic = grammarTopics.find((t) => t.id === topicId);
          if (!topic) return prev;

          const isCompleted =
            !!progress.completed ||
            Number(progress.completionPercent || 0) >= 100;
          const best = Number.isFinite(progress.bestCorrectPercent)
            ? progress.bestCorrectPercent
            : Number(progress.correctPercent || 0);

          next[topicId] = {
            isCompleted,
            completionPercent: Number.isFinite(progress.completionPercent)
              ? Math.max(
                  0,
                  Math.min(100, Math.round(progress.completionPercent))
                )
              : 0,
            correctPercent: Math.max(0, Math.min(100, Math.round(best || 0))),
            attemptsTotal: Number.isFinite(progress.attemptsTotal)
              ? Math.max(0, Math.round(progress.attemptsTotal))
              : 0,
            bestAchievedAtAttempt: Number.isFinite(
              progress.bestAchievedAtAttempt
            )
              ? Math.max(0, Math.round(progress.bestAchievedAtAttempt))
              : 0,
          };
          return next;
        });

        lastImmediateUpdateRef.current = Date.now();
        setRefreshStatus((s) => ({
          ...(s || {}),
          lastUpdate: lastImmediateUpdateRef.current,
        }));

        setTimeout(async () => {
          try {
            const m = await loadMirror();
            if (m) {
              await cacheGrammarData(m);
              const st = await getRefreshStatus();
              setRefreshStatus(st);
            }
          } catch (e) {
            console.warn("Grammar: background cache update failed", e);
          }
        }, 100);
      } catch (e) {
        console.error("Grammar: onImmediateRefresh handler failed", e);
      }
    };
  }, [
    computeCompletionMapFromLocal,
    computeCompletionMapFromMirror,
    grammarTopics,
    isAuthenticated,
    loadMirror,
    refreshStatus,
    handleManualRefresh,
  ]);

  useEffect(() => {
    const win = typeof window !== "undefined" ? window : null;
    if (!win) return;

    try {
      let updateCount = 0;
      const UPDATE_LIMIT = 8;
      let windowStart = Date.now();
      let lastEventTime = 0;
      const GRAMMAR_EVENT_DEBOUNCE = 2000;

      const createDebouncedHandler = (handlerFn, eventType) => (ev) => {
        const now = Date.now();

        if (now - windowStart > 60000) {
          windowStart = now;
          updateCount = 0;
        }

        updateCount++;
        if (updateCount > UPDATE_LIMIT) {
          console.warn(
            `Grammar: Update limit exceeded for ${eventType}, preventing potential loop`
          );
          return;
        }

        if (now - lastEventTime < GRAMMAR_EVENT_DEBOUNCE) {
          console.log(
            `Grammar: Debouncing ${eventType} event (${now - lastEventTime}ms since last)`
          );
          return;
        }
        lastEventTime = now;

        if (ev?.detail?.preventCascade) {
          console.log(
            `Grammar: Ignoring cascading ${eventType} event due to preventCascade flag`
          );
          return;
        }

        console.log(
          `Grammar: Processing ${eventType} event at ${new Date().toISOString()}`
        );

        try {
          handlerFn(ev);
        } catch (error) {
          console.error(`Grammar: ${eventType} handler failed:`, error);
        }
      };

      const debouncedStorage = createDebouncedHandler(
        (ev) => handlersRef.current.onStorage(ev),
        "storage"
      );
      const debouncedMirrorRefresh = createDebouncedHandler(
        () => handlersRef.current.onMirrorDebounced(),
        "grammar-progress-refreshed"
      );
      const debouncedProgressUpdate = createDebouncedHandler(
        (ev) => handlersRef.current.onProgressUpdate(ev.detail),
        "grammar-progress-updated"
      );
      const debouncedUserDataCleared = createDebouncedHandler(
        () => handlersRef.current.onUserDataCleared(),
        "user-data-cleared"
      );
      const debouncedForceRefresh = createDebouncedHandler(
        () => handlersRef.current.onForceRefresh(),
        "grammar-data-force-refresh"
      );
      const debouncedImmediateRefresh = createDebouncedHandler(
        (ev) => handlersRef.current.onImmediateRefresh(ev.detail),
        "grammar-immediate-refresh"
      );

      const debouncedUserDataHandler = createDebouncedHandler((ev) => {
        if (ev?.detail?.preventCascade) {
          console.log(
            "Grammar: Ignoring cascading user-data-refreshed event due to preventCascade flag"
          );
          return;
        }
        if (!ev?.detail?.isProfileTriggered) {
          handlersRef.current.onMirrorImmediate(ev.detail);
        }
      }, "user-data-refreshed");

      win.addEventListener("storage", debouncedStorage);
      win.addEventListener(
        "grammar-progress-refreshed",
        debouncedMirrorRefresh
      );
      win.addEventListener("user-data-refreshed", debouncedUserDataHandler);
      win.addEventListener("grammar-progress-updated", debouncedProgressUpdate);
      win.addEventListener("user-data-cleared", debouncedUserDataCleared);
      win.addEventListener("grammar-data-force-refresh", debouncedForceRefresh);
      win.addEventListener(
        "grammar-immediate-refresh",
        debouncedImmediateRefresh
      );

      win._grammarHandlers = {
        debouncedStorage,
        debouncedMirrorRefresh,
        debouncedUserDataHandler,
        debouncedProgressUpdate,
        debouncedUserDataCleared,
        debouncedForceRefresh,
        debouncedImmediateRefresh,
      };
    } catch (e) {
      console.warn("Grammar: event listener attach failed", e);
    }

    return () => {
      try {
        if (win._grammarHandlers) {
          win.removeEventListener(
            "storage",
            win._grammarHandlers.debouncedStorage
          );
          win.removeEventListener(
            "grammar-progress-refreshed",
            win._grammarHandlers.debouncedMirrorRefresh
          );
          win.removeEventListener(
            "user-data-refreshed",
            win._grammarHandlers.debouncedUserDataHandler
          );
          win.removeEventListener(
            "grammar-progress-updated",
            win._grammarHandlers.debouncedProgressUpdate
          );
          win.removeEventListener(
            "user-data-cleared",
            win._grammarHandlers.debouncedUserDataCleared
          );
          win.removeEventListener(
            "grammar-data-force-refresh",
            win._grammarHandlers.debouncedForceRefresh
          );
          win.removeEventListener(
            "grammar-immediate-refresh",
            win._grammarHandlers.debouncedImmediateRefresh
          );

          delete win._grammarHandlers;
        }
      } catch (e) {
        console.warn("Grammar: event listener cleanup failed", e);
      }
      try {
        if (mirrorTimerRef.current) clearTimeout(mirrorTimerRef.current);
        if (fallbackTimeoutRef.current)
          clearTimeout(fallbackTimeoutRef.current);
      } catch (_) {}
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const apply = async () => {
      if (!grammarTopics?.length || !mounted) return;

      if (isAuthenticated) {
        const now = Date.now();
        const recent =
          (lastImmediateUpdateRef.current &&
            now - lastImmediateUpdateRef.current < IMMEDIATE_UPDATE_GUARD_MS) ||
          (refreshStatus?.lastUpdate &&
            now - refreshStatus.lastUpdate < IMMEDIATE_UPDATE_GUARD_MS);

        if (recent) return;

        await checkAndRefreshData();
        try {
          const m = await loadMirror();
          if (m && mounted)
            setCompletedMap((prev) =>
              computeCompletionMapFromMirror(grammarTopics, m, prev)
            );
        } catch (e) {
          console.warn("Grammar: failed to load mirror during apply", e);
        }
      } else {
        setCompletedMap(computeCompletionMapFromLocal(grammarTopics));
      }
    };

    apply();
    return () => {
      mounted = false;
    };
  }, [
    grammarTopics,
    isAuthenticated,
    computeCompletionMapFromMirror,
    computeCompletionMapFromLocal,
    loadMirror,
    checkAndRefreshData,
    refreshStatus,
  ]);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
    try {
      if (topicsListRef.current) {
        const rect = topicsListRef.current.getBoundingClientRect();
        const absoluteY = rect.top + window.pageYOffset - 100;
        window.scrollTo({ top: absoluteY, behavior: "smooth" });
      }
    } catch (_) {}
  }, []);

  if (isLoading) {
    return (
      <div
        className="loading"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 300,
          gap: "1rem",
        }}
      >
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-message">
        <BiErrorCircle className={styles.errorIcon} />
        <div className={styles.errorText}>
          {t("error.loadingError")} {error}
        </div>
      </div>
    );
  }

  if (!grammarTopics.length) {
    return (
      <div className={styles.grammarEmpty}>
        {t("noTopicsAvailable", { level: difficulty })}
      </div>
    );
  }

  return (
    <div className={styles.grammarPractice}>
      <div className={styles.grammarHeaderWrapper}>
        <GrammarHeader
          grammarData={grammarData}
          difficulty={difficulty}
          onChangeLevelClick={onChangeLevelClick}
        />
      </div>

      <div className={styles.grammarContent}>
        <div className={styles.grammarTopicsList} ref={topicsListRef}>
          {pagination.currentTopics.map((topic, idx) => {
            const topicId = topic.id;
            const isCompleted = Boolean(completedMap[topicId]?.isCompleted);
            const pct = completedMap[topicId]?.correctPercent || 0;
            const attempts = completedMap[topicId]?.attemptsTotal || 0;
            const indexNumber = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;

            return (
              <Card
                key={`grammar-topic-${topicId}-${indexNumber}`}
                className={`${styles.grammarCardTitle} ${isCompleted ? styles.isComplete : ""}`}
                aria-label={`${t("learn", { ns: "grammar" })}: ${topic.topic}`}
                onClick={() => {
                  router.push(
                    `/subjects/languages/english/practice/grammar-learn/${difficulty.toLowerCase()}/${topic.id}`
                  );
                }}
                title={topic.topic}
                unstyled
              >
                <div className={styles.grammarTopicHeader}>
                  <h3 className={styles.grammarTopicName}>
                    <span className={styles.numberBadge}>{indexNumber}</span>
                    <span className={styles.grammarTopicNameText}>
                      {topic.topic}
                    </span>
                  </h3>
                </div>

                <div className={styles.grammarTopicInfo}>
                  <div
                    className={`${styles.learnCta} ${isCompleted ? styles.isComplete : ""}`}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      router.push(
                        `/subjects/languages/english/practice/grammar-learn/${difficulty.toLowerCase()}/${topic.id}`
                      );
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        router.push(
                          `/subjects/languages/english/practice/grammar-learn/${difficulty.toLowerCase()}/${topic.id}`
                        );
                      }
                    }}
                    aria-label={t("learn", { ns: "grammar" })}
                  >
                    <FaBookOpen className={styles.learnCtaIcon} />
                    <span className={styles.learnCtaLabel}>
                      {attempts > 0
                        ? t("learnMore", {
                            ns: "grammar",
                            defaultValue: "Learn more",
                          })
                        : t("learn", { ns: "grammar" })}
                    </span>
                    {!isCompleted && (
                      <FaArrowRight className={styles.learnCtaArrow} />
                    )}
                  </div>
                </div>

                <div className={styles.grammarMeta}>
                  <span className={styles.hoursBadge}>
                    <FaClock />
                    <span>{topic.estimated_hours}h</span>
                  </span>
                  {isCompleted && (
                    <span className={`${styles.statusBadge} ${styles.isLearned}`}>
                      <FaCheckCircle />
                      <span>{t("learned", { ns: "grammar" })}</span>
                      {pct > 0 && (
                        <span className={styles.progressPill} aria-label={`${pct}%`}>
                          {pct}%
                        </span>
                      )}
                    </span>
                  )}

                  {attempts > 0 && (
                    <span
                      className={styles.attemptsBadge}
                      aria-label={t("attempts", {
                        ns: "grammar",
                        count: attempts,
                      })}
                    >
                      <FaHistory aria-hidden="true" />
                      <span className={styles.attemptsText}>
                        {t("attempts", { ns: "grammar", count: attempts })}
                      </span>
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {pagination.totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
            totalItems={pagination.totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
            startItem={pagination.startItem}
            endItem={pagination.endItem}
            accentColor={"#FF6636"}
            namespace={"common"}
            showInfo={true}
          />
        )}
      </div>
    </div>
  );
};

export default Grammar;