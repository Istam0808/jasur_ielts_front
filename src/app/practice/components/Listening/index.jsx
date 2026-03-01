"use client";

import { useTranslation } from "react-i18next";
import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import {
  FiBarChart,
  FiHeadphones,
  FiClock,
  FiBook,
  FiList,
} from "react-icons/fi";
import Spinner from "@/components/common/spinner";
import Pagination from "@/components/common/Pagination";
import { LISTENING_AUDIO_URLS } from "@/store/publicFileUrls";
import {
  getAvailableBooks,
  getBookDataById,
} from "@/store/data/practice/language/english/listening/listeningData";
import "../shared.scss";
import "../tabSections.scss";
import "../topicsList.scss";
import "../card.scss";
import LevelSelectorButton from "../common/LevelSelectorButton";
import headerBannerStyles from "../headerBanner.module.scss";

const ITEMS_PER_PAGE = 6;

const Listening = ({ difficulty = "ielts", onChangeLevelClick }) => {
  // Initialize i18next with explicit namespaces
  const { t, i18n } = useTranslation(["listening", "common"]);
  const router = useRouter();

  const [availableBooks, setAvailableBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Make sure translations are loaded
  useEffect(() => {
    const loadNamespaces = async () => {
      if (
        !i18n.hasResourceBundle(i18n.language, "listening") ||
        !i18n.hasResourceBundle(i18n.language, "common")
      ) {
        await i18n.loadNamespaces(["listening", "common"]);
      }
    };

    loadNamespaces();
  }, [i18n]);

  // Load available books data
  useEffect(() => {
    const loadAvailableBooks = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get book details from the new data file
        const allBookDetails = await getAvailableBooks();

        // IELTS-only mode: show fixed available books list
        const booksToLoadDetails = allBookDetails;

        // Process books sequentially for better error handling
        const processedBooks = [];
        for (let index = 0; index < booksToLoadDetails.length; index++) {
          const bookDetail = booksToLoadDetails[index];
          const { id: bookId, title } = bookDetail;

          try {
            const bookData = await getBookDataById(bookId);
            if (!bookData) {
              console.error(`Data not found for book: ${bookId}`);
              continue;
            }

            // Handle different data structures for difficulty books vs cambridge
            let testCount = 0;
            let partCount = 0;

            if (Array.isArray(bookData)) {
              // Difficulty books (a1-c2) are arrays of test objects
              testCount = bookData.length;
              partCount = 1; // Each test has multiple choice + true/false sections
            } else {
              // Cambridge book has tests structure
              testCount = bookData.tests?.length || 0;
              const firstTest = bookData.tests?.[0];
              partCount = firstTest?.parts?.length || 0;
            }

            // Check if audio is available for this book
            const hasAudio = Array.isArray(bookData)
              ? Array.isArray(LISTENING_AUDIO_URLS[bookId]) &&
              LISTENING_AUDIO_URLS[bookId].length > 0
              : !!LISTENING_AUDIO_URLS[bookId];

            processedBooks.push({
              id: bookId,
              title,
              description: bookDetail[i18n.language] || bookDetail.en,
              listNumber: index + 1,
              hasAudio,
              testCount,
              partCount,
              isDifficultyBook: Array.isArray(bookData),
            });
          } catch (err) {
            console.error(`Error loading book data for ${bookId}:`, err);
          }
        }

        setAvailableBooks(processedBooks);
        setIsLoading(false);
      } catch (err) {
        console.error("Error loading available books:", err);
        setError(err.message);
        setAvailableBooks([]);
        setIsLoading(false);
      }
    };

    loadAvailableBooks();
  }, [t, i18n.language, difficulty]);

  const paginationData = useMemo(() => {
    const totalItems = availableBooks.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;

    const currentBooks = availableBooks.slice(startIndex, endIndex);

    return {
      totalItems,
      totalPages,
      startItem: totalItems > 0 ? startIndex + 1 : 0,
      endItem: Math.min(endIndex, totalItems),
      currentBooks,
    };
  }, [availableBooks, currentPage]);

  const handleBookSelect = async (bookId) => {
    // IELTS-only mode uses dedicated mock route
    const routePath = `/mock/listening`;
    router.push(routePath);
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
    return (
      <div className="ielts-section error">
        <h1 className="section-title">
          {t("title", { defaultValue: "IELTS Listening" })}
        </h1>
        <div className="error-message">
          <h2>{t("error.title", { defaultValue: "Error" })}</h2>
          <p>{error}</p>
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
            <FiHeadphones
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
              {t("title", { defaultValue: "IELTS Listening" })}
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
            ns: "listening",
            defaultValue:
              "The IELTS Listening test consists of 40 questions, designed to test a wide range of listening skills. These include understanding main ideas and specific factual information, recognizing opinions, attitudes and purpose of a speaker, and following the development of an argument.",
          })}
        </p>

        {/* STATS */}
        {paginationData.totalItems > 0 && (
          <div className={headerBannerStyles.statsContainer}>
            <div className={headerBannerStyles.statItem}>
              <FiBook className={headerBannerStyles.statIcon} />
              <span className={headerBannerStyles.statValue}>
                {paginationData.totalItems}
              </span>
              <span className={headerBannerStyles.statLabel}>
                {paginationData.totalItems === 1 ? "Book" : "Books"}
              </span>
            </div>
            <div className={headerBannerStyles.statItem}>
              <FiList className={headerBannerStyles.statIcon} />
              <span className={headerBannerStyles.statValue}>
                {availableBooks.reduce(
                  (total, book) => total + book.testCount,
                  0
                )}
              </span>
              <span className={headerBannerStyles.statLabel}>Tests</span>
            </div>
          </div>
        )}
      </div>

      {paginationData.totalItems > 0 ? (
        <>
          <div className="ielts-topics-list">
            {paginationData.currentBooks.map((book) => (
              <div
                key={book.id + "-book-item"}
                className="ielts-topic-item"
                onClick={() => handleBookSelect(book.id)}
              >
                <div className="topic-card">
                  <div className="topic-header">
                    <div className="practice-explanation-number">
                      <span className="number-badge">{book.listNumber}</span>
                    </div>
                    <div className="topic-header-right">
                      {/* Future content can be added here */}
                    </div>
                  </div>
                  <div className="topic-content">
                    <h3 className="topic-title">{book.title}</h3>
                    <p className="topic-description">{book.description}</p>
                  </div>
                  <div className="topic-meta">
                    <div className="meta-badges">
                      <span className="meta-badge badge-info">
                        <FiBook /> {book.testCount}{" "}
                        {book.testCount === 1
                          ? t("completeTest", {
                            ns: "listening",
                            defaultValue: "Complete Test",
                          })
                          : t("completeTests", {
                            ns: "listening",
                            defaultValue: "Complete Tests",
                          })}
                      </span>
                      {book.hasAudio && (
                        <span className="meta-badge badge-success">
                          <FiHeadphones />{" "}
                          {t("audioAvailable", {
                            ns: "listening",
                            defaultValue: "Audio Available",
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="topic-footer">
                    <div className="stat-item">
                      <FiList className="stat-icon" />
                      <span className="stat-text">
                        {book.partCount}{" "}
                        {t("parts", { ns: "listening", defaultValue: "parts" })}
                      </span>
                    </div>
                    <div className="stat-item">
                      <FiClock className="stat-icon" />
                      <span className="stat-text">
                        ~{book.partCount * 10}{" "}
                        {t("minTotal", {
                          ns: "listening",
                          defaultValue: "min total",
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
          />
        </>
      ) : (
        !isLoading && (
          <div className="no-topics-message">
            <p>
              {t("noTopicsAvailable", {
                ns: "practice",
                defaultValue: "No books available",
              })}
            </p>
          </div>
        )
      )}
    </div>
  );
};

export default Listening;
