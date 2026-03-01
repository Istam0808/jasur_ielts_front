"use client";

import { useTranslation } from "react-i18next";
import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { FiEdit3, FiClock, FiFileText } from "react-icons/fi";
import { BiCategory } from "react-icons/bi";
import Spinner from "@/components/common/spinner";
import Pagination from "@/components/common/Pagination";
import { WRITING_TASK_1 } from "@/store";
import "../tabSections.scss";
import "../shared.scss";
import "../topicsList.scss";
import "../card.scss";
import LevelSelectorButton from "../common/LevelSelectorButton";
import headerBannerStyles from "../headerBanner.module.scss";

// Valid difficulty levels
const VALID_DIFFICULTIES = ["ielts"];
const ITEMS_PER_PAGE = 9;

const Writing = ({ onChangeLevelClick }) => {
  // Initialize i18next with explicit namespaces
  const { t, i18n } = useTranslation(["writing", "practice", "common"]);
  const router = useRouter();
  const params = useParams();
  const difficulty = params.difficulty || "ielts";

  const [writingTopics, setWritingTopics] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Make sure translations are loaded
  useEffect(() => {
    // Ensure all required namespaces are loaded
    const loadNamespaces = async () => {
      if (
        !i18n.hasResourceBundle(i18n.language, "writing") ||
        !i18n.hasResourceBundle(i18n.language, "practice") ||
        !i18n.hasResourceBundle(i18n.language, "common")
      ) {
        await i18n.loadNamespaces(["writing", "practice", "common"]);
      }
    };

    loadNamespaces();
  }, [i18n]);

  useEffect(() => {
    const loadWritingTopics = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Convert difficulty to lowercase and validate BEFORE attempting import
        const difficultyLower = difficulty.toLowerCase();

        // Check if difficulty is valid FIRST
        if (!VALID_DIFFICULTIES.includes(difficultyLower)) {
          const availableLevels = VALID_DIFFICULTIES.join(", ").toUpperCase();
          const errorMessage = `${t("error.invalidLevel", { ns: "writing", defaultValue: "Invalid Difficulty Level" })}: "${difficulty}". ${t("error.availableLevels", { ns: "writing", defaultValue: "Available levels:" })} ${availableLevels}`;
          setError(errorMessage);
          setWritingTopics([]);
          setIsLoading(false);
          return; // Exit early to prevent dynamic import attempt
        }

        // IELTS-only mode: fixed local source
        const writingData = await import(
          "@/store/data/practice/language/english/writing/c2.json"
        )
          .then((module) => {
            // Check if the module has content
            const data = module.default || module;
            if (!data || !Array.isArray(data) || data.length === 0) {
              throw new Error(
                t("error.noData", {
                  ns: "writing",
                  defaultValue: "No writing data available for {{level}} level",
                  level: difficulty,
                })
              );
            }
            return data;
          })
          .catch((err) => {
            console.error(
              `Failed to load writing data for ${difficultyLower}:`,
              err
            );
            if (
              err.message.includes("Cannot resolve module") ||
              err.message.includes("Cannot find module")
            ) {
              throw new Error(
                t("error.notAvailable", {
                  ns: "writing",
                  defaultValue:
                    'Writing exercises for "{{level}}" level are not available yet. Please try a different level.',
                  level: difficulty.toUpperCase(),
                })
              );
            }
            throw new Error(
              t("error.noData", {
                ns: "writing",
                defaultValue: "No writing data available for {{level}} level",
                level: difficulty,
              })
            );
          });

        // Transform the writing data into topic format (IELTS Task 1: 20 min, 150 words)
        const topics = writingData.map((item, index) => ({
          id: item.id,
          listNumber: index + 1,
          title: item.topic,
          description: item.type || "Task 1",
          timeLimit: WRITING_TASK_1.timeMinutes,
          requiredWords: WRITING_TASK_1.minWords,
        }));

        setWritingTopics(topics);
        setIsLoading(false);
      } catch (err) {
        console.error("Error loading writing topics:", err);
        setError(err.message);
        setWritingTopics([]);
        setIsLoading(false);
      }
    };

    // Only load if we have a difficulty parameter
    if (difficulty) {
      loadWritingTopics();
    }
  }, [difficulty, t, i18n]);

  const paginationData = useMemo(() => {
    const totalItems = writingTopics.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;

    const currentTopics = writingTopics.slice(startIndex, endIndex);

    return {
      totalItems,
      totalPages,
      startItem: totalItems > 0 ? startIndex + 1 : 0,
      endItem: Math.min(endIndex, totalItems),
      currentTopics,
    };
  }, [writingTopics, currentPage]);

  const handleTopicSelect = (topicId) => {
    const routePath = `/mock/writing`;
    router.push(routePath);
  };

  const handleBackToValidLevel = () => {
    // Redirect to a valid difficulty level
    const currentPath = window.location.pathname;
    const basePath = currentPath.split("/").slice(0, -1).join("/"); // Remove the difficulty part
    router.push(`/mock/writing`);
  };

  const handleNavigateToLevel = (level) => {
    router.push(`/mock/writing`);
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
    const isInvalidDifficulty = error.includes(
      t("error.invalidLevel", {
        ns: "writing",
        defaultValue: "Invalid Difficulty Level",
      })
    );

    return (
      <div className="ielts-section error">
        <h1 className="section-title">
          {t("title", { ns: "writing", defaultValue: "Writing Practice" })}
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
                ns: "writing",
                defaultValue: "Invalid Difficulty Level",
              })
              : t("error.title", {
                ns: "writing",
                defaultValue: "An error occurred.",
              })}
          </h2>
          <p>{error}</p>
          {isInvalidDifficulty && (
            <div className="valid-levels">
              <h3>
                {t("error.availableLevels", {
                  ns: "writing",
                  defaultValue: "Available levels:",
                })}
              </h3>
              <div className="level-buttons">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleBackToValidLevel}
                >
                  {t("useDefault", {
                    ns: "writing",
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
            <FiEdit3
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
              {t("title", { ns: "writing", defaultValue: "Writing Practice" })}
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
            ns: "writing",
            defaultValue:
              "Develop your writing skills with tasks of varying difficulty. Practice writing texts, essays, letters, and other forms of written communication, improving structure, vocabulary, and grammar.",
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
        <>
          <div className="ielts-topics-list">
            {paginationData.currentTopics.map((topic) => (
              <div
                key={topic.id + "-topic-item"}
                className="ielts-topic-item"
                onClick={() => handleTopicSelect(topic.id)}
              >
                <div className="topic-card">
                  <div className="topic-header">
                    <div className="practice-explanation-number">
                      <span className="number-badge">{topic.listNumber}</span>
                    </div>
                    <div className="topic-header-right">
                      <div className="topic-type-badge">
                        <span className="badge badge-primary badge-sm">
                          {topic.description}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="topic-content">
                    <h3 className="topic-title">{topic.title}</h3>
                  </div>
                  <div className="topic-meta">
                    <div className="meta-badges">
                      <span className="meta-badge badge-info">
                        <FiEdit3 />{" "}
                        {t("writingTask", {
                          ns: "writing",
                          defaultValue: "Writing Task",
                        })}
                      </span>
                      <span className="meta-badge badge-time">
                        <FiClock /> {topic.timeLimit}{" "}
                        {t("minutes", { ns: "writing", defaultValue: "min" })}
                      </span>
                    </div>
                  </div>
                  <div className="topic-footer">
                    <div className="stat-item words-count">
                      <FiFileText className="stat-icon" />
                      <span className="stat-text">
                        {topic.requiredWords}{" "}
                        {t("wordsRequired", {
                          ns: "writing",
                          defaultValue: "words required",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
        <Pagination
            currentPage={currentPage}
            totalPages={paginationData.totalPages}
            onPageChange={setCurrentPage}
            totalItems={paginationData.totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
            startItem={paginationData.startItem}
            endItem={paginationData.endItem}
            namespace="common"
            accentColor={"#FF6636"}
            scrollTopOnClick=".headerBanner"
            showInfo={true}
          />
        </>
      ) : (
        !isLoading && (
          <div className="no-topics-message">
            <p>
              {t("noTopicsAvailable", {
                ns: "practice",
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

export default Writing;
