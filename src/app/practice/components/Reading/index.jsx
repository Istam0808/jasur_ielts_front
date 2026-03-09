"use client";

import { useTranslation } from "react-i18next";
import { useState, useEffect, useMemo, useRef } from "react";
import { useUser } from "@/contexts/UserContext";
import { useUserDataMirror } from "@/hooks/useUserDataMirror";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import {
  FiBarChart,
  FiEdit,
  FiClock,
  FiBookOpen,
  FiTrendingUp,
  FiTarget,
  FiAward,
  FiZap,
  FiRepeat,
} from "react-icons/fi";
import { BiCategory } from "react-icons/bi";
import Spinner from "@/components/common/spinner";
import "../shared.scss";
import "../tabSections.scss";
import "../topicsList.scss";
import "../card.scss";
import Card from "@/components/common/Card";
import LevelSelectorButton from "../common/LevelSelectorButton";
import headerBannerStyles from "../headerBanner.module.scss";

// Valid difficulty levels
const VALID_DIFFICULTIES = ["ielts"];
const ITEMS_PER_PAGE = 9;

// Advanced level configurations
const ADVANCED_LEVELS = ["ielts"];
const PROFESSIONAL_LEVELS = ["ielts"];

// Utility function to count individual answers required for a question (same as ProgressBar)
const getQuestionAnswerCount = (question) => {
  if (!question) return 1;

  switch (question.type) {
    case "multiple_choice":
    case "true_false":
    case "true_false_not_given":
    case "yes_no_not_given":
      return 1;

    case "multiple_choice_multiple":
      // Count the number of correct answers expected
      return question.options?.filter((opt) => opt.correct)?.length || 1;

    case "matching_headings":
      return question.sections?.length || 1;

    case "matching_information":
      return question.information?.length || 1;

    case "matching_features":
      return question.items?.length || 1;

    case "sentence_completion":
      return question.sentences?.length || 1;

    case "summary_completion":
    case "table_completion":
    case "flow_chart_completion":
      return question.answers?.length || 1;

    case "diagram_labelling":
      return question.labels?.length || 1;

    case "short_answer":
      // Check if this is a multi-question short answer
      if (
        question.instruction &&
        question.questions &&
        Array.isArray(question.questions)
      ) {
        return question.questions.length;
      }
      return 1;

    default:
      return 1;
  }
};

const Reading = ({ onChangeLevelClick }) => {
  const { isAuthenticated } = useUser();
  const { loadMirror } = useUserDataMirror();
  const [completedMap, setCompletedMap] = useState({});
  const [bestResultsMap, setBestResultsMap] = useState({});
  const [readingTopics, setReadingTopics] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Refs to prevent duplicate processing
  const lastProcessedTopicsRef = useRef(null);
  const lastProcessedDifficultyRef = useRef(null);

  const computeCompletedFromMirror = (topics, mirror) => {
    const completedReadings = mirror?.reading?.completed_readings || {};
    const map = {};
    topics.forEach((t) => {
      const readingData = completedReadings[t.id];
      map[t.id] = readingData?.completed === true;
    });
    return map;
  };

  const computeBestResultsFromMirror = (topics, mirror) => {
    const completedReadings = mirror?.reading?.completed_readings || {};
    const map = {};
    topics.forEach((t) => {
      const readingData = completedReadings[t.id];
      if (
        readingData?.completed === true &&
        readingData.bestScore !== undefined
      ) {
        map[t.id] = {
          bestScore: readingData.bestScore,
          totalQuestions: readingData.totalQuestions,
          totalAttempts: readingData.totalAttempts,
        };
      }
    });
    return map;
  };

  const computeCompletedFromLocalStorage = (topics) => {
    try {
      const raw = localStorage.getItem("guest_reading") || "{}";
      const data = JSON.parse(raw);
      const completedReadings = data?.completed_readings || {};
      const map = {};
      topics.forEach((t) => {
        const readingData = completedReadings[t.id];
        map[t.id] = readingData?.completed === true;
      });
      return map;
    } catch {
      return {};
    }
  };

  const computeBestResultsFromLocalStorage = (topics) => {
    try {
      const raw = localStorage.getItem("guest_reading") || "{}";
      const data = JSON.parse(raw);
      const completedReadings = data?.completed_readings || {};
      const map = {};
      topics.forEach((t) => {
        const readingData = completedReadings[t.id];
        if (
          readingData?.completed === true &&
          readingData.bestScore !== undefined
        ) {
          map[t.id] = {
            bestScore: readingData.bestScore,
            totalQuestions: readingData.totalQuestions,
            totalAttempts: readingData.totalAttempts,
          };
        }
      });
      return map;
    } catch {
      return {};
    }
  };

  useEffect(() => {
    // Prevent duplicate processing for the same topics
    const topicsKey = readingTopics?.length
      ? `${readingTopics.length}-${readingTopics[0]?.id}`
      : "empty";
    if (lastProcessedTopicsRef.current === topicsKey) {
      return;
    }
    lastProcessedTopicsRef.current = topicsKey;

    const apply = async () => {
      if (!readingTopics?.length) return;
      if (isAuthenticated) {
        const mirror = await loadMirror();
        setCompletedMap(computeCompletedFromMirror(readingTopics, mirror));
        setBestResultsMap(computeBestResultsFromMirror(readingTopics, mirror));
      } else {
        setCompletedMap(computeCompletedFromLocalStorage(readingTopics));
        setBestResultsMap(computeBestResultsFromLocalStorage(readingTopics));
      }
    };
    apply();

    // Circuit breaker for Reading component updates
    let updateCount = 0;
    const UPDATE_LIMIT = 5; // Max 5 updates per minute
    let windowStart = Date.now();

    const onMirror = () => {
      // Circuit breaker: prevent runaway loops
      const now = Date.now();
      if (now - windowStart > 60000) {
        windowStart = now;
        updateCount = 0;
      }

      updateCount++;
      if (updateCount > UPDATE_LIMIT) {
        console.warn(
          "Reading: Update limit exceeded, preventing potential loop"
        );
        return;
      }

      if (!readingTopics?.length) return;

      if (isAuthenticated) {
        loadMirror()
          .then((m) => {
            // Only update if data actually changed
            const newCompletedMap = computeCompletedFromMirror(
              readingTopics,
              m
            );
            const newBestResultsMap = computeBestResultsFromMirror(
              readingTopics,
              m
            );

            setCompletedMap((prevMap) => {
              if (JSON.stringify(prevMap) === JSON.stringify(newCompletedMap)) {
                return prevMap; // No change, prevent unnecessary re-render
              }
              return newCompletedMap;
            });

            setBestResultsMap((prevMap) => {
              if (
                JSON.stringify(prevMap) === JSON.stringify(newBestResultsMap)
              ) {
                return prevMap; // No change, prevent unnecessary re-render
              }
              return newBestResultsMap;
            });
          })
          .catch((err) => {
            console.error("Reading: loadMirror failed:", err);
          });
      } else {
        setCompletedMap(computeCompletedFromLocalStorage(readingTopics));
        setBestResultsMap(computeBestResultsFromLocalStorage(readingTopics));
      }
    };

    // Universal debounced handler for ALL reading events
    let lastReadingEventTime = 0;
    const READING_EVENT_DEBOUNCE = 3000; // Increased to 3 seconds

    const debouncedHandler = (ev, eventType) => {
      const now = Date.now();
      if (now - lastReadingEventTime < READING_EVENT_DEBOUNCE) {
        console.log(
          `Reading: Debouncing ${eventType} event (${now - lastReadingEventTime}ms since last)`
        );
        return;
      }
      lastReadingEventTime = now;

      // Respect preventCascade flag to avoid infinite loops
      if (ev?.detail?.preventCascade) {
        console.log(
          "Reading: Ignoring cascading event due to preventCascade flag"
        );
        return;
      }

      // Add request tracking
      console.log(
        `Reading: Processing ${eventType} event at ${new Date().toISOString()}`
      );
      onMirror();
    };

    const userDataHandler = (ev) => debouncedHandler(ev, "user-data-refreshed");
    const completionHandler = (ev) =>
      debouncedHandler(ev, "reading-completion-changed");
    const storageHandler = (ev) => debouncedHandler(ev, "storage");

    try {
      window.addEventListener("user-data-refreshed", userDataHandler);
    } catch (_) { }
    try {
      window.addEventListener("reading-completion-changed", completionHandler);
    } catch (_) { }
    try {
      window.addEventListener("storage", storageHandler);
    } catch (_) { }

    return () => {
      try {
        window.removeEventListener("user-data-refreshed", userDataHandler);
      } catch (_) { }
      try {
        window.removeEventListener(
          "reading-completion-changed",
          completionHandler
        );
      } catch (_) { }
      try {
        window.removeEventListener("storage", storageHandler);
      } catch (_) { }
    };
  }, [readingTopics, isAuthenticated, loadMirror]);
  // Initialize i18next with explicit namespaces
  const { t, i18n } = useTranslation(["reading", "practice", "common"]);
  const router = useRouter();
  const params = useParams();
  const difficulty = params.difficulty || "ielts";

  // Check if current level is advanced
  const isAdvancedLevel = ADVANCED_LEVELS.includes(difficulty.toLowerCase());
  const isProfessionalLevel = PROFESSIONAL_LEVELS.includes(
    difficulty.toLowerCase()
  );

  // Make sure translations are loaded
  useEffect(() => {
    // Ensure all namespaces are loaded
    const loadNamespaces = async () => {
      if (
        !i18n.hasResourceBundle(i18n.language, "reading") ||
        !i18n.hasResourceBundle(i18n.language, "practice") ||
        !i18n.hasResourceBundle(i18n.language, "common")
      ) {
        await i18n.loadNamespaces(["reading", "practice", "common"]);
      }
    };

    loadNamespaces();
  }, [i18n]);

  // Enhanced topic transformation with advanced features
  const transformReadingData = (readingData, difficultyLevel) => {
    return readingData.map((item, index) => {
      let wordCount = 0;
      let questionCount = 0;
      const timeLimit = item.metadata?.timeLimit || null;

      // Calculate word count based on reading structure
      if (isAdvancedLevel && item.passages && Array.isArray(item.passages)) {
        // Multi-passage structure for B2/C1/C2 - sum all passages
        wordCount = item.passages.reduce((total, passage) => {
          if (passage.text) {
            return (
              total +
              passage.text.split(/\s+/).filter((word) => word.length > 0).length
            );
          } else if (passage.word_count) {
            return total + parseInt(passage.word_count, 10);
          }
          return total;
        }, 0);

        // Count individual answer slots from all passages (same logic as ProgressBar)
        questionCount = item.passages.reduce((total, passage) => {
          if (passage.questions && Array.isArray(passage.questions)) {
            return (
              total +
              passage.questions.reduce(
                (sum, question) => sum + getQuestionAnswerCount(question),
                0
              )
            );
          }
          return total;
        }, 0);
      } else {
        // Single passage structure for other levels
        wordCount = item.passage
          ? item.passage.split(/\s+/).filter((word) => word.length > 0).length
          : 0;

        // Count individual answer slots (same logic as ProgressBar)
        if (item.questions && Array.isArray(item.questions)) {
          questionCount = item.questions.reduce(
            (sum, question) => sum + getQuestionAnswerCount(question),
            0
          );
        }
      }

      // Calculate reading complexity metrics
      let avgWordsPerSentence = 0;
      if (isAdvancedLevel && item.passages && Array.isArray(item.passages)) {
        // For multi-passage structure, calculate from all passages
        const totalSentences = item.passages.reduce((total, passage) => {
          if (passage.text) {
            return (
              total +
              passage.text
                .split(/[.!?]+/)
                .filter((sentence) => sentence.trim().length > 0).length
            );
          }
          return total;
        }, 0);
        avgWordsPerSentence =
          totalSentences > 0 ? wordCount / totalSentences : 0;
      } else if (item.passage) {
        // For single passage structure
        const sentences = item.passage
          .split(/[.!?]+/)
          .filter((sentence) => sentence.trim().length > 0);
        avgWordsPerSentence =
          sentences.length > 0 ? wordCount / sentences.length : 0;
      }

      const complexityScore = Math.round(
        wordCount / 100 + avgWordsPerSentence * 2
      );

      // Determine reading type and category
      const readingType = item.module || "general";
      const isAcademic = readingType === "academic";
      const isProfessional = isProfessionalLevel && isAcademic;

      // Enhanced skills categorization
      const skills = item.metadata?.skills || [];
      const primarySkills = skills.slice(0, 3);
      const secondarySkills = skills.slice(3, 6);

      // Extract passage titles for multi-page readings
      const passageTitles = [];
      if (isAdvancedLevel && item.passages && Array.isArray(item.passages)) {
        item.passages.forEach((passage) => {
          if (passage.title) {
            passageTitles.push(passage.title);
          }
        });
      }

      // Calculate difficulty indicators
      const difficultyIndicators = [];
      if (complexityScore > 15) difficultyIndicators.push("high-complexity");
      if (wordCount > 800) difficultyIndicators.push("extensive-text");
      if (questionCount > 20)
        difficultyIndicators.push("comprehensive-testing");
      if (isAcademic) difficultyIndicators.push("academic-content");

      return {
        id: item.id,
        listNumber: index + 1,
        title: item.title,
        topic: item.topic,
        description: `${primarySkills.join(", ").toUpperCase()}`,
        secondaryDescription:
          secondarySkills.length > 0 ? `${secondarySkills.join(", ")}` : null,
        wordCount,
        questionCount,
        timeLimit,
        aboutPassage: item.about_passage || null,
        complexityScore,
        readingType,
        isAcademic,
        isProfessional,
        difficultyIndicators,
        primarySkills,
        secondarySkills,
        avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
        questionTypes: item.questions
          ? [...new Set(item.questions.map((q) => q.type))]
          : [],
        passageTitles: passageTitles.length > 0 ? passageTitles : null,
      };
    });
  };

  useEffect(() => {
    // Prevent duplicate processing for the same difficulty
    if (lastProcessedDifficultyRef.current === difficulty) {
      return;
    }
    lastProcessedDifficultyRef.current = difficulty;

    const loadReadingTopics = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Convert difficulty to lowercase and validate BEFORE attempting import
        const difficultyLower = difficulty.toLowerCase();

        // Check if difficulty is valid FIRST
        if (!VALID_DIFFICULTIES.includes(difficultyLower)) {
          setError(
            t("error.invalidLevel", {
              ns: "reading",
              defaultValue: "Invalid difficulty level",
            }) +
            `: "${difficulty}". ` +
            t("error.availableLevels", {
              ns: "reading",
              defaultValue: "Available levels",
            }) +
            ` ${VALID_DIFFICULTIES.join(", ").toUpperCase()}`
          );
          setReadingTopics([]);
          setIsLoading(false);
          return; // Exit early to prevent dynamic import attempt
        }

        // IELTS-only mode: load fixed local source
        const module = await import(
          "@/store/data/practice/language/english/reading/new_reading.json"
        );
        const rawData = module.default || module;
        const readingData = Array.isArray(rawData) ? rawData : [rawData];

        // Transform the reading data using enhanced transformation
        const topics = transformReadingData(readingData, difficultyLower);
        setReadingTopics(topics);
        setIsLoading(false);
      } catch (err) {
        console.error("Error loading reading topics:", err);
        setError(err.message);
        setReadingTopics([]);
        setIsLoading(false);
      }
    };

    // Only load if we have a difficulty parameter
    if (difficulty) {
      loadReadingTopics();
    }
  }, [difficulty, t, i18n]);

  const paginationData = useMemo(() => {
    const totalItems = readingTopics.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;

    const currentTopics = readingTopics.slice(startIndex, endIndex);

    return {
      totalItems,
      totalPages,
      startItem: totalItems > 0 ? startIndex + 1 : 0,
      endItem: Math.min(endIndex, totalItems),
      currentTopics,
    };
  }, [readingTopics, currentPage]);

  const handleTopicSelect = (topicId) => {
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (_) { }
    router.push("/mock/reading");
  };

  const handleBackToValidLevel = () => {
    // Redirect to a valid difficulty level
    const currentPath = window.location.pathname;
    const basePath = currentPath.split("/").slice(0, -1).join("/"); // Remove the difficulty part
    router.push(`/mock/reading`);
  };

  const handleNavigateToLevel = (level) => {
    router.push(`/mock/reading`);
  };

  if (isLoading) {
    return (
      <div
        className="ielts-section loading"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "300px",
          gap: "1rem",
        }}
      >
        <Spinner />
      </div>
    );
  }

  if (error) {
    const isInvalidDifficulty = error.includes("Invalid difficulty level");

    return (
      <div className="ielts-section error">
        <h1 className="section-title">
          {t("title", { ns: "reading", defaultValue: "Reading Practice" })}
          <span className="badge">
            {t(`difficulty.${difficulty.toLowerCase()}`, {
              ns: "practice",
              defaultValue: difficulty.toUpperCase(),
            })}
          </span>
        </h1>
        <div className="error-message">
          <h2>
            {isInvalidDifficulty
              ? t("error.invalidLevel", {
                ns: "reading",
                defaultValue: "Invalid Difficulty Level",
              })
              : t("error.title", { ns: "reading", defaultValue: "Error" })}
          </h2>
          <p>{error}</p>
          {isInvalidDifficulty && (
            <div className="valid-levels">
              <h3>
                {t("error.availableLevels", {
                  ns: "reading",
                  defaultValue: "Available levels:",
                })}
              </h3>
              <div className="level-buttons">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleBackToValidLevel}
                >
                  {t("useDefault", {
                    ns: "reading",
                    defaultValue: "Use Default Level (B1)",
                  })}
                </button>
                {VALID_DIFFICULTIES.map((level) => (
                  <button
                    key={level}
                    className="btn btn-outline btn-sm"
                    onClick={() => handleNavigateToLevel(level)}
                  >
                    {t(`difficulty.${level}`, {
                      ns: "practice",
                      defaultValue: level.toUpperCase(),
                    })}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="ielts-section">
      <div className={headerBannerStyles.headerBanner}>
        {/* TOP ROW: Title on left, Level selector on right */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            marginBottom: "1.5rem",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          {/* LEFT: Title */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1 }}>
            <FiBookOpen
              style={{
                fontSize: "1.8rem",
                color: "#ff8c42",
                filter: "drop-shadow(0 2px 4px rgba(255, 140, 66, 0.3))",
              }}
            />
            <h1
              style={{
                margin: 0,
                color: "white",
                fontSize: "2.2rem",
                fontWeight: 700,
                textShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
              }}
            >
              {t("title", { ns: "reading", defaultValue: "Reading Practice" })}
            </h1>
          </div>

          {/* RIGHT: Level selector button */}
          {onChangeLevelClick && (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <LevelSelectorButton
                difficulty={difficulty}
                onClick={onChangeLevelClick}
              />
            </div>
          )}
        </div>

        {/* DESCRIPTION */}
        <p
          style={{
            fontSize: "1rem",
            color: "#ccc",
            marginBottom: "1.5rem",
            lineHeight: 1.6,
            opacity: 0.9,
            position: "relative",
            zIndex: 2,
          }}
        >
          {t("description", {
            ns: "reading",
            defaultValue:
              "Develop your reading skills with a variety of exercises. Practice reading for gist, main ideas, detail, skimming, understanding logical argument and recognizing writers' opinions, attitudes and purpose.",
          })}
        </p>

        {/* STATS */}
        {paginationData.totalItems > 0 && (
          <div className={headerBannerStyles.statsContainer}>
            <div className={headerBannerStyles.statItem}>
              <BiCategory className={headerBannerStyles.statIcon} />
              <span className={headerBannerStyles.statValue}>
                {paginationData.totalItems}
              </span>
              <span className={headerBannerStyles.statLabel}>
                {t("topics", {
                  ns: "reading",
                  defaultValue: paginationData.totalItems === 1 ? "Topic" : "Topics",
                })}
              </span>
            </div>
          </div>
        )}
      </div>

      {paginationData.totalItems > 0 ? (
        <div
          className={`ielts-topics-list ${isAdvancedLevel ? "advanced-layout" : ""}`}
        >
          {paginationData.currentTopics.map((topic) => (
            <div
              key={topic.id + "-topic-item"}
              className={`ielts-topic-item`}
            >
              <Card
                className="topic-card"
                unstyled
                onClick={() => handleTopicSelect(topic.id)}
                aria-label={`${t("selectTopic", { ns: "reading", defaultValue: "Select Reading Topic" })}: ${topic.title}`}
                title={topic.title}
              >
                <div className="topic-header">
                  <div className="practice-explanation-number">
                    <span className="number-badge">{topic.listNumber}</span>
                  </div>
                  <div className="topic-header-right">
                    <div className="questions-count-badge">
                      <FiEdit className="stat-icon" />
                      <span className="stat-text">
                        {isAdvancedLevel
                          ? t("fullReading", {
                            ns: "reading",
                            defaultValue: "Full reading",
                          })
                          : `${topic.questionCount} ${t("questionCount", { ns: "reading", defaultValue: "questions" })}`}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="topic-content">
                  <h3 className="topic-title">{topic.title}</h3>
                  {topic.topic && (
                    <p className="topic-subtitle">{topic.topic}</p>
                  )}
                  {topic.passageTitles && topic.passageTitles.length > 0 && (
                    <div className="passage-titles">
                      <span className="passage-titles-label">
                        {t("passages", {
                          ns: "reading",
                          defaultValue: "Passages",
                        })}
                        :
                      </span>
                      <ul className="passage-titles-list">
                        {topic.passageTitles.map((title, index) => (
                          <li key={index} className="passage-title-item">
                            {title}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="topic-description-container">
                    <p className="topic-description">{topic.description}</p>
                    {topic.secondaryDescription && (
                      <p className="topic-secondary-description">
                        {topic.secondaryDescription}
                      </p>
                    )}
                  </div>
                </div>
                <div className="topic-meta">
                  <div className="meta-badges">
                    <span className="meta-badge badge-info">
                      <FiBarChart /> {topic.wordCount}{" "}
                      {t("words", { ns: "reading", defaultValue: "words" })}
                    </span>
                    {completedMap[topic.id] && (
                      <span
                        className="meta-badge badge-success"
                        aria-label={t("completed", {
                          ns: "common",
                          defaultValue: "Completed",
                        })}
                      >
                        <FiZap />{" "}
                        {t("completed", {
                          ns: "common",
                          defaultValue: "Completed",
                        })}
                      </span>
                    )}
                    {topic.timeLimit && (
                      <span className="meta-badge badge-time">
                        <FiClock /> {topic.timeLimit}{" "}
                        {t("minutes", { ns: "reading", defaultValue: "min" })}
                      </span>
                    )}
                    {topic.isAcademic && (
                      <span className="meta-badge badge-academic">
                        <FiTarget />{" "}
                        {t("academic", {
                          ns: "reading",
                          defaultValue: "Academic",
                        })}
                      </span>
                    )}
                  </div>
                </div>
                {topic.aboutPassage && (
                  <div
                    className="topic-footer"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <div className="about-passage">
                      <FiBookOpen className="stat-icon" />
                      <span className="stat-text">{topic.aboutPassage}</span>
                    </div>
                    {completedMap[topic.id] && bestResultsMap[topic.id] && (
                      <div
                        className="completion-status"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        {bestResultsMap[topic.id].bestScore > 0 && (
                          <div
                            className="completion-badge"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "4px 8px",
                              background:
                                "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                              color: "white",
                              borderRadius: "16px",
                              fontSize: "11px",
                              fontWeight: "600",
                              boxShadow:
                                "0 2px 8px rgba(102, 126, 234, 0.25)",
                              border: "1px solid rgba(255, 255, 255, 0.2)",
                            }}
                          >
                            <FiAward
                              style={{
                                fontSize: "15px",
                                filter:
                                  "drop-shadow(0 1px 1px rgba(0,0,0,0.2))",
                              }}
                            />
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "13px",
                                  fontWeight: "700",
                                  lineHeight: "1",
                                  textShadow: "0 1px 1px rgba(0,0,0,0.2)",
                                }}
                              >
                                {bestResultsMap[topic.id].bestScore.toFixed(
                                  2
                                )}
                                %
                              </span>
                              <span
                                style={{
                                  fontSize: "8px",
                                  opacity: "0.9",
                                  lineHeight: "1",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.3px",
                                }}
                              >
                                {t("bestScore", {
                                  ns: "reading",
                                  defaultValue: "Best",
                                })}
                              </span>
                            </div>
                          </div>
                        )}
                        {bestResultsMap[topic.id].totalAttempts > 1 && (
                          <div
                            className="attempts-badge"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "3px 8px",
                              background:
                                "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                              color: "white",
                              borderRadius: "14px",
                              fontSize: "10px",
                              fontWeight: "600",
                              boxShadow:
                                "0 2px 6px rgba(240, 147, 251, 0.25)",
                              border: "1px solid rgba(255, 255, 255, 0.2)",
                            }}
                          >
                            <FiRepeat
                              style={{
                                fontSize: "13px",
                                filter:
                                  "drop-shadow(0 1px 1px rgba(0,0,0,0.2))",
                              }}
                            />
                            <span
                              style={{
                                fontWeight: "700",
                                textShadow: "0 1px 1px rgba(0,0,0,0.2)",
                              }}
                            >
                              {bestResultsMap[topic.id].totalAttempts}×
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>
          ))}
        </div>
      ) : (
        !isLoading && (
          <div className="no-topics-message">
            <p>
              {t("noTopicsAvailable", {
                ns: "practice",
                defaultValue: "No topics available for {{level}} level",
                level: t(`difficulty.${difficulty.toLowerCase()}`, {
                  ns: "practice",
                  defaultValue: difficulty.toUpperCase(),
                }),
              })}
            </p>
          </div>
        )
      )}
    </div>
  );
};

export default Reading;
