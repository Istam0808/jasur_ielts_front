"use client";

import { useTranslation } from "react-i18next";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  BiErrorCircle,
  BiSearch,
  BiCategory,
  BiChevronDown,
  BiChevronUp,
  BiBookOpen,
  BiFilterAlt,
  BiX,
} from "react-icons/bi";
import {
  FaGraduationCap,
  FaEye,
  FaEyeSlash,
  FaTags,
  FaGamepad,
} from "react-icons/fa";
import { MdBookmark, MdBookmarkBorder } from "react-icons/md";
import LevelSelectorButton from "../common/LevelSelectorButton";
import { useLearningTimer } from "@/hooks/useLearningTimer";
import { useDistractionDetector } from "@/hooks/useDistractionDetector";
import { useAuth } from "@/hooks/useAuth";
import Pagination from "@/components/common/Pagination";
import Spinner from "@/components/common/spinner";
import VocabularyGrid from "./components/VocabularyGrid";
import StudyModeSelector from "./components/StudyModeSelector";
import TopicFilter from "./components/TopicFilter";
import { LocalStorageUtils } from "@/utils/localStorage";
import "../shared.scss";
import "./vocabulary.scss";
import headerBannerStyles from "../headerBanner.module.scss";

const Vocabulary = ({
  difficulty,
  language = "English",
  onChangeLevelClick,
}) => {
  const { t, i18n } = useTranslation(["vocabulary", "practice"]);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [vocabularyData, setVocabularyData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("all");
  const [studyMode, setStudyMode] = useState("cards"); // cards, flashcards, adventure, memory, speed, matching
  const [savedWords, setSavedWords] = useState(new Set());
  const [showTranslations, setShowTranslations] = useState(true);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);
  const detailsRef = useRef(null);
  const controlsDetailsRef = useRef(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [activeControlSection, setActiveControlSection] =
    useState("study-modes"); // 'study-modes' or 'filters'
  const [wasAutoClosed, setWasAutoClosed] = useState(false); // Track if accordion was auto-closed due to game mode
  const hasStartedLearningRef = useRef(false);

  // Memoized constants and derived values
  const ITEMS_PER_PAGE = 12;
  const langKey = useMemo(
    () => i18n.language?.split("-")[0] || "en",
    [i18n.language]
  );
  const SAVED_WORDS_KEY = useMemo(
    () => `vocabulary_saved_words_${difficulty.toLowerCase()}`,
    [difficulty]
  );

  // Learning timer: start when vocabulary page opens, stop on finish/close/unmount
  const { manualStart, manualStop } = useLearningTimer({
    activityTag: "vocabulary_practice",
    renderless: true,
  });

  // Distraction detection with silent pause/resume for vocabulary sessions
  useDistractionDetector({
    enabled: true,
    showModal: false,
    reason: "Vocabulary practice session",
    blurGraceMs: 0, // Stop immediately on blur
    inactivityMs: 5 * 60 * 1000, // 5 minutes inactivity
    onDistraction: () => {
      // Pause timer silently when user switches tabs/apps
      try {
        manualStop();
      } catch (_) {}
    },
    onReturn: () => {
      // Resume timer silently when user returns
      try {
        manualStart();
      } catch (_) {}
    },
  });

  // Helper function to create unique word key - stable reference to prevent infinite loops
  const getWordKey = useCallback((word) => {
    if (!word || !word.topicId || !word.id) return "";
    return `${word.topicId}-${word.id}`;
  }, []);

  // Handle back navigation
  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  // Check if current study mode is an interactive game mode
  const isInteractiveGameMode = useMemo(() => {
    const gameModes = ["adventure", "memory", "speed", "matching"];
    return gameModes.includes(studyMode);
  }, [studyMode]);

  // Memoized all words extraction
  const allWords = useMemo(() => {
    if (!vocabularyData?.vocabulary_topics) return [];

    const words = [];
    vocabularyData.vocabulary_topics.forEach((topic) => {
      topic.words.forEach((word) => {
        words.push({
          ...word,
          topicId: topic.id,
          topicName: topic.topic,
          topicImage: topic.image,
        });
      });
    });
    return words;
  }, [vocabularyData]);

  // Memoized total word count
  const totalWordCount = useMemo(() => {
    return (
      vocabularyData?.vocabulary_topics?.reduce(
        (total, topic) => total + topic.words.length,
        0
      ) || 0
    );
  }, [vocabularyData]);

  // 30-second delay before starting learning session
  useEffect(() => {
    const delayTimer = setTimeout(() => {
      if (!hasStartedLearningRef.current) {
        try {
          manualStart();
          hasStartedLearningRef.current = true;
        } catch (error) {
          console.error(
            "Vocabulary timer: Failed to start learning session:",
            error
          );
        }
      }
    }, 30000); // 30 seconds delay

    return () => {
      clearTimeout(delayTimer);
    };
  }, [manualStart]);

  // Start/stop learning timer when component mounts/unmounts
  useEffect(() => {
    return () => {
      try {
        manualStop();
      } catch (error) {
        console.error(
          "Vocabulary timer: Failed to stop learning session:",
          error
        );
      }
    };
  }, [manualStop]);

  // Load saved words from localStorage on component mount
  useEffect(() => {
    const savedWordsData = LocalStorageUtils.get(SAVED_WORDS_KEY);
    if (savedWordsData && Array.isArray(savedWordsData)) {
      setSavedWords(new Set(savedWordsData));
    }
    setHasLoadedFromStorage(true);
  }, [SAVED_WORDS_KEY]);

  // Save words to localStorage whenever savedWords changes (but not on initial mount)
  useEffect(() => {
    if (hasLoadedFromStorage) {
      LocalStorageUtils.set(SAVED_WORDS_KEY, Array.from(savedWords));
    }
  }, [savedWords, SAVED_WORDS_KEY, hasLoadedFromStorage]);

  // Optimized filter and search with better performance
  const filteredWords = useMemo(() => {
    if (!allWords.length) return [];

    let words = allWords;

    // Filter by topic first (most selective)
    if (selectedTopic !== "all") {
      words = words.filter((word) => word.topicId === selectedTopic);
    }

    // Filter by saved only
    if (showSavedOnly) {
      words = words.filter((word) => savedWords.has(getWordKey(word)));
    }

    // Filter by search term (most expensive, do last)
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      words = words.filter(
        (word) =>
          word.word.toLowerCase().includes(searchLower) ||
          word.translation[langKey]?.toLowerCase().includes(searchLower) ||
          word.topicName.toLowerCase().includes(searchLower)
      );
    }

    return words;
  }, [
    allWords,
    selectedTopic,
    searchTerm,
    langKey,
    showSavedOnly,
    savedWords,
    getWordKey,
  ]);

  // Calculate pagination data
  const paginationData = useMemo(() => {
    const totalItems = filteredWords.length;

    // For interactive game modes, use all filtered words with randomization
    if (isInteractiveGameMode) {
      // Shuffle the words for game modes to ensure different card orders each time
      const shuffledWords = [...filteredWords].sort(() => Math.random() - 0.5);
      return {
        totalItems,
        totalPages: 1,
        currentWords: shuffledWords,
        startItem: totalItems > 0 ? 1 : 0,
        endItem: totalItems,
        validCurrentPage: 1,
      };
    }

    // For regular modes, use pagination
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    // Ensure current page is within valid range
    const validCurrentPage = Math.min(
      Math.max(1, currentPage),
      totalPages || 1
    );

    const startIndex = (validCurrentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const currentWords = filteredWords.slice(startIndex, endIndex);
    const startItem = totalItems > 0 ? startIndex + 1 : 0;
    const endItem = Math.min(endIndex, totalItems);

    return {
      totalItems,
      totalPages,
      currentWords,
      startItem,
      endItem,
      validCurrentPage,
    };
  }, [filteredWords, currentPage, ITEMS_PER_PAGE, isInteractiveGameMode]);

  // Load vocabulary data
  useEffect(() => {
    const loadVocabularyData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const vocabularyModule = await import(
          `@/store/data/practice/language/english/vocabulary/${difficulty.toLowerCase()}.json`
        );
        const data = vocabularyModule.default;

        if (data && data.vocabulary_topics) {
          setVocabularyData(data);
        } else {
          throw new Error(t("error.dataNotFound", { ns: "vocabulary" }));
        }

        setCurrentPage(1);
      } catch (err) {
        console.error(t("error.consoleError", { ns: "vocabulary" }), err);
        setError(err.message || t("loadError", { ns: "vocabulary" }));
      } finally {
        setIsLoading(false);
      }
    };

    loadVocabularyData();
  }, [difficulty, t]);

  // Reset current page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedTopic, showSavedOnly]);

  // Ensure current page is valid when total pages change
  useEffect(() => {
    if (
      paginationData.totalPages > 0 &&
      currentPage > paginationData.totalPages
    ) {
      setCurrentPage(paginationData.totalPages);
    }
  }, [paginationData.totalPages, currentPage]);

  // Auto-close accordion when interactive game mode is selected
  useEffect(() => {
    if (isInteractiveGameMode && isDetailsOpen) {
      setIsDetailsOpen(false);
      setWasAutoClosed(true);
    }
  }, [studyMode]); // Trigger on any studyMode change, not just isInteractiveGameMode

  // Reset auto-closed flag when switching back to non-interactive modes
  useEffect(() => {
    if (!isInteractiveGameMode) {
      setWasAutoClosed(false);
    }
  }, [isInteractiveGameMode]);

  // Handle details toggle with animation
  const handleDetailsToggle = useCallback(() => {
    setIsDetailsOpen((prev) => !prev);
    setWasAutoClosed(false); // Reset auto-closed flag when manually toggling
  }, []);

  // Handle control section switching
  const handleControlSectionChange = useCallback(
    (section) => {
      if (activeControlSection === section && isDetailsOpen) {
        // If clicking the same section that's already active and open, close the accordion
        setIsDetailsOpen(false);
      } else {
        // Switch to the new section and open the accordion
        setActiveControlSection(section);
        if (!isDetailsOpen) {
          setIsDetailsOpen(true);
          setWasAutoClosed(false); // Reset auto-closed flag when manually opening
        }
      }
    },
    [activeControlSection, isDetailsOpen]
  );

  // Memoized event handlers
  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
    // Scroll to the top of the vocabulary section safely
    setTimeout(() => {
      detailsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }, []);

  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchTerm("");
  }, []);

  const toggleTranslations = useCallback(() => {
    setShowTranslations((prev) => !prev);
  }, []);

  const toggleSavedOnly = useCallback(() => {
    setShowSavedOnly((prev) => !prev);
  }, []);

  // Toggle word save status - using compound key
  const toggleSavedWord = useCallback(
    (word) => {
      const wordKey = getWordKey(word);
      setSavedWords((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(wordKey)) {
          newSet.delete(wordKey);
        } else {
          newSet.add(wordKey);
        }
        return newSet;
      });
    },
    [getWordKey]
  );

  // Memoized word saved checker
  const isWordSaved = useCallback(
    (word) => savedWords.has(getWordKey(word)),
    [savedWords, getWordKey]
  );

  // Early returns for loading and error states
  if (isLoading) {
    return (
      <div className="vocabulary-section loading">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="vocabulary-error">
        <BiErrorCircle className="error-icon" />
        <div className="error-text">
          {t("error.loadingError", { ns: "vocabulary" })} {error}
        </div>
      </div>
    );
  }

  if (!vocabularyData?.vocabulary_topics?.length) {
    return (
      <div className="vocabulary-empty">
        {t("noVocabularyAvailable", { level: difficulty, ns: "vocabulary" })}
      </div>
    );
  }

  return (
    <div className="vocabulary-practice">
      {/* Scroll target for pagination */}
      <div className="vocabulary-scroll-target" ref={detailsRef}></div>

      {/* Header Section */}

      <div
        className={`${headerBannerStyles.headerBanner} ${headerBannerStyles.vocabularyTheme}`}
      >
        {/* TOP ROW: Title on left, Level selector on right */}
        <div className="vocabulary-header-main-row">
          {/* LEFT: Title */}
          <div className="vocabulary-header-left">
            <div className="vocabulary-title-group">
              <FaGraduationCap className="vocabulary-title-icon" />
              <h2>{t("title", { ns: "vocabulary" })}</h2>
            </div>
          </div>

          {/* RIGHT: Level selector button */}
          {onChangeLevelClick && (
            <div className="vocabulary-header-right">
              <LevelSelectorButton
                difficulty={difficulty}
                onClick={onChangeLevelClick}
              />
            </div>
          )}
        </div>

        {/* DESCRIPTION */}
        <p className="vocabulary-header-description">
          {t("description", {
            ns: "practice",
            level: t(`difficulty.${difficulty.toLowerCase()}`, {
              ns: "practice",
            }),
            wordCount: totalWordCount,
          })}
        </p>

        {/* STATS */}
        <div className={headerBannerStyles.statsContainer}>
          <div className={headerBannerStyles.statItem}>
            <BiCategory className={headerBannerStyles.statIcon} />
            <span>
              {vocabularyData.vocabulary_topics.length}{" "}
              {t("topics", { ns: "vocabulary" })}
            </span>
          </div>
          <div className={headerBannerStyles.statItem}>
            <MdBookmark className={headerBannerStyles.statIcon} />
            <span>
              {savedWords.size} {t("saved", { ns: "vocabulary" })}
            </span>
          </div>
        </div>
      </div>

      {/* Custom Collapsible Controls Section */}
      <div className="vocabulary-controls-details" ref={controlsDetailsRef}>
        <div className="controls-summary">
          <button
            className={`control-btn ${activeControlSection === "study-modes" && isDetailsOpen ? "active" : ""}`}
            onClick={() => handleControlSectionChange("study-modes")}
            type="button"
          >
            <BiBookOpen className="summary-icon" />
            <span className="summary-text">
              {t("studyModes", { ns: "vocabulary" })}
            </span>
          </button>
          <button
            className={`control-btn ${activeControlSection === "filters" && isDetailsOpen ? "active" : ""}`}
            onClick={() => handleControlSectionChange("filters")}
            type="button"
          >
            <BiSearch className="summary-icon" />
            <span className="summary-text">
              {t("controls", { ns: "vocabulary" })}
            </span>
          </button>
          <button
            className="toggle-btn"
            onClick={handleDetailsToggle}
            type="button"
          >
            <BiChevronDown
              className={`summary-chevron ${isDetailsOpen ? "rotated" : ""}`}
            />
          </button>
        </div>
        <div
          className={`controls-section ${headerBannerStyles.headerBanner} ${headerBannerStyles.vocabularyTheme} ${isDetailsOpen ? "open" : ""}`}
        >
          <div className="filter-controls">
            {/* Study Modes Group */}
            {activeControlSection === "study-modes" && (
              <div className="control-group study-modes-group">
                <div className="group-header">
                  <div className="group-icon">
                    <BiBookOpen />
                  </div>
                  <div>
                    <h3 className="group-title">
                      {t("studyModes", { ns: "vocabulary" })}
                    </h3>
                    <p className="group-description">
                      {t("studyModesDescription", { ns: "vocabulary" })}
                    </p>
                  </div>
                </div>
                <div className="group-content">
                  <div className="study-mode-section">
                    <StudyModeSelector
                      studyMode={studyMode}
                      onModeChange={setStudyMode}
                      showOnlyBasic={true}
                    />
                  </div>
                  <div className="study-mode-section">
                    <StudyModeSelector
                      studyMode={studyMode}
                      onModeChange={setStudyMode}
                      showOnlyGame={true}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Filters & View Options Group */}
            {activeControlSection === "filters" && (
              <div className="control-group filters-view-group">
                <div className="group-header">
                  <div className="group-icon">
                    <BiFilterAlt />
                  </div>
                  <div>
                    <h3 className="group-title">
                      {t("filtersAndView", { ns: "vocabulary" })}
                    </h3>
                    <p className="group-description">
                      {t("filtersAndViewDescription", { ns: "vocabulary" })}
                    </p>
                  </div>
                </div>

                {/* Filters Note - Only show when in game modes */}
                {isInteractiveGameMode && (
                  <div className="filters-note">
                    <div className="note-icon">
                      <BiErrorCircle />
                    </div>
                    <div className="note-content">
                      <p>{t("filtersNote", { ns: "vocabulary" })}</p>
                    </div>
                  </div>
                )}

                <div className="group-content">
                  <div className="view-options-section">
                    <div className="view-options">
                      {studyMode === "cards" && (
                        <button
                          className={`option-btn ${showTranslations ? "active" : ""}`}
                          onClick={toggleTranslations}
                          title={
                            showTranslations
                              ? t("study.hideTranslations", {
                                  ns: "vocabulary",
                                })
                              : t("study.showTranslations", {
                                  ns: "vocabulary",
                                })
                          }
                        >
                          {showTranslations ? <FaEye /> : <FaEyeSlash />}
                          <span>{t("translations", { ns: "vocabulary" })}</span>
                        </button>
                      )}
                      <button
                        className={`option-btn ${showSavedOnly ? "active" : ""}`}
                        onClick={toggleSavedOnly}
                        title={
                          showSavedOnly
                            ? t("showAllWords", { ns: "vocabulary" })
                            : t("showSavedOnly", { ns: "vocabulary" })
                        }
                      >
                        {showSavedOnly ? <MdBookmark /> : <MdBookmarkBorder />}
                        <span>{t("savedOnly", { ns: "vocabulary" })}</span>
                      </button>
                    </div>
                  </div>
                  <div className="filters-section">
                    <TopicFilter
                      topics={vocabularyData.vocabulary_topics}
                      selectedTopic={selectedTopic}
                      onTopicChange={setSelectedTopic}
                    />
                  </div>
                  <div className="search-section">
                    <div className="search-box">
                      <BiSearch className="search-icon" />
                      <input
                        type="text"
                        placeholder={t("searchPlaceholder", {
                          ns: "vocabulary",
                        })}
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="search-input"
                      />
                      {searchTerm && (
                        <button
                          type="button"
                          className="search-clear-btn"
                          onClick={handleClearSearch}
                          title={t("clearSearch", { ns: "vocabulary" })}
                        >
                          <BiX />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="vocabulary-content">
        {paginationData.currentWords.length > 0 ? (
          <>
            <VocabularyGrid
              words={paginationData.currentWords}
              studyMode={studyMode}
              showTranslations={showTranslations}
              isSaved={isWordSaved}
              onToggleSave={toggleSavedWord}
              langKey={langKey}
              getWordKey={getWordKey}
              difficulty={difficulty}
              onBack={handleBack}
            />

            {!isInteractiveGameMode && paginationData.totalPages > 1 && (
              <div className="vocabulary-pagination">
                <Pagination
                  currentPage={paginationData.validCurrentPage}
                  totalPages={paginationData.totalPages}
                  onPageChange={handlePageChange}
                  showInfo={true}
                  accentColor={"#FF6636"}
                  totalItems={paginationData.totalItems}
                  itemsPerPage={ITEMS_PER_PAGE}
                  startItem={paginationData.startItem}
                  endItem={paginationData.endItem}
                  scrollTopOnClick={false}
                />
              </div>
            )}
          </>
        ) : (
          <div className="no-results">
            <BiSearch className="no-results-icon" />
            <h3>{t("noResults", { ns: "vocabulary" })}</h3>
            <p>
              {showSavedOnly
                ? t("noSavedWords", { ns: "vocabulary" })
                : t("tryDifferentSearch", { ns: "vocabulary" })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Vocabulary;
