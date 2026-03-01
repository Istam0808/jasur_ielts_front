"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Spinner from '@/components/common/spinner';
import { FaArrowLeft, FaCheck, FaCheckCircle, FaChevronLeft, FaChevronRight, FaMicrophone, FaSearch, FaVolumeUp } from 'react-icons/fa';
import styles from './styles/pronunciation.module.scss';

const MIN_WORDS = 5;
const MAX_WORDS = 10;
const ITEMS_PER_PAGE = 8;
const STORAGE_KEY = 'pronunciationPracticeCompletedWordsByTopic';
const DEFAULT_IMAGE = 'https://via.placeholder.com/600x360?text=Practice';

const normalizeText = (value = '') => value.trim().toLowerCase();
const getWordKey = (word) => normalizeText(word?.word);

/**
 * Маппинг названий тем на названия папок в A1WEBP
 * Используется только для случаев, когда название темы отличается от названия папки
 */
const TOPIC_TO_FOLDER_MAP = {
  'Clothing': 'Clothes', // В данных "Clothing", в папке "Clothes"
  'Days & Time': 'Days & Times', // В данных "Days & Time", в папке "Days & Times"
  'Food & Drink': 'Food_&_Drinks', // В данных "Food & Drink", в папке "Food_&_Drinks"
  'Food & Drinks': 'Food_&_Drinks', // В данных "Food & Drinks", в папке "Food_&_Drinks"
};

/**
 * Маппинг названий тем на имена файлов в папке A1_TOPICS
 */
const TOPIC_TO_TOPIC_IMAGE_MAP = {
  'Personal Information': 'PERSONAL_INFORMATION',
  'Family': 'FAMILY',
  'Colors': 'COLORS',
  'Numbers': 'NUMBERS',
  'Days & Time': 'DAYS_AND_TIMES',
  'Days & Times': 'DAYS_AND_TIMES',
  'Food & Drink': 'FOOD_AND_DRINK',
  'Food & Drinks': 'FOOD_AND_DRINK',
  'Body Parts': 'BODY_PARTS',
  'Clothing': 'CLOTHING',
  'House & Home': 'HOUSE_AND_HOME',
  'Weather': 'WEATHER',
  'Transportation': 'TRANSPORTATION',
  'Basic Verbs': 'BASIC_VERBS',
  'Greetings': 'Greetings', // Файл с маленькой буквы
  'School': 'SCHOOL',
  'Sports': 'SPORTS',
  'Vegetables & Fruits': 'FRUITS_AND_VEGETABLES',
  'Animals': 'ANIMALS',
  'Describing people': 'DESCRIBING_PEOPLE',
  'Cities & Countries': 'CITIES_AND_COUNTRIES',
  'Shopping (Basic)': 'SHOPPING',
  'Health (Basic)': 'HEALTH',
  'Simple Adjectives': 'SIMPLE_ADJECTIVES',
  'Directions (Basic)': 'DIRECTIONS',
};

/**
 * Маппинг слов на имена файлов (для специальных случаев)
 */
const WORD_TO_FILENAME_MAP = {
  'cheese': 'СHEESE', // Файл с кириллической С
  'fruit': 'FRUITS', // Файл во множественном числе
  'vegetable': 'VEGETABLES', // Файл во множественном числе
  'fruits': 'FRUITS',
  'vegetables': 'VEGETABLES',
};

/**
 * Получает путь к изображению из A1WEBP для слова
 * @param {string} word - Слово (например, "name", "phone number", "t-shirt")
 * @param {string} topicName - Название темы (например, "Personal Information")
 * @returns {string} - Путь к изображению или DEFAULT_IMAGE если не найдено
 */
const getImageFromA1WEBP = (word, topicName) => {
  if (!word || !topicName) return DEFAULT_IMAGE;

  // Получаем название папки из маппинга, если нет - используем название темы напрямую
  const folderName = TOPIC_TO_FOLDER_MAP[topicName] || topicName;

  // Нормализуем слово: приводим к нижнему регистру и убираем пробелы
  const wordLower = word.trim().toLowerCase();
  
  // Проверяем специальные случаи в маппинге
  let fileName = WORD_TO_FILENAME_MAP[wordLower];
  
  if (!fileName) {
    // Если нет специального маппинга, преобразуем слово стандартным способом
    // Пробелы заменяем на подчеркивания, затем в верхний регистр
    fileName = wordLower.replace(/\s+/g, '_').toUpperCase();
    
    // Пробуем варианты с множественным/единственным числом для некоторых слов
    // Если слово заканчивается на 's', пробуем без 's'
    if (fileName.endsWith('S') && fileName.length > 1) {
      // Уже во множественном числе, оставляем как есть
    } else {
      // Если слово в единственном числе, пробуем добавить 'S' для множественного
      // Но сначала проверим точное совпадение
      const singularForm = fileName;
      const pluralForm = fileName + 'S';
      
      // Для некоторых слов файлы могут быть во множественном числе
      // Пока используем единственное число, но можно добавить логику проверки
      fileName = singularForm;
    }
  }
  
  // Формируем путь к изображению
  const imagePath = `/A1WEBP/${folderName}/${fileName}.webp`;
  
  return imagePath;
};

/**
 * Получает путь к изображению темы из папки A1_TOPICS
 * @param {string} topicName - Название темы (например, "Personal Information")
 * @returns {string} - Путь к изображению темы или DEFAULT_IMAGE если не найдено
 */
const getTopicImageFromA1Topics = (topicName) => {
  if (!topicName) return DEFAULT_IMAGE;

  // Получаем имя файла из маппинга
  const fileName = TOPIC_TO_TOPIC_IMAGE_MAP[topicName];
  
  // Если маппинга нет, возвращаем DEFAULT_IMAGE
  // Это предотвращает 404 ошибки для B1/C1 тем, которые не имеют изображений в A1_TOPICS
  if (!fileName) {
    return DEFAULT_IMAGE;
  }

  // Формируем путь к изображению темы
  // Заменяем пробелы на подчеркивания для совместимости
  const safeFileName = fileName.replace(/\s+/g, '_');
  const imagePath = `/A1WEBP/A1_TOPICS/${safeFileName}.webp`;
  
  return imagePath;
};

const shuffleArray = (items = []) => [...items].sort(() => Math.random() - 0.5);

const useSpeechRecognition = () => {
  const recognitionRef = useRef(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.maxAlternatives = 1;
      setIsSupported(true);
    }
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch (_) {
        /* noop */
      }
    };
  }, []);

  return { recognitionRef, isSupported };
};

const PronunciationPractice = ({ difficulty = 'B1', onBack }) => {
  const { t, i18n } = useTranslation('speaking');
  const langKey = useMemo(() => i18n.language?.split('-')?.[0] || 'en', [i18n.language]);

  const [stage, setStage] = useState('topic'); // topic | review | text | speech | image | results
  const [topics, setTopics] = useState([]);
  const [words, setWords] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectionError, setSelectionError] = useState('');
  const [selectedWordKeys, setSelectedWordKeys] = useState([]);
  const [completedWordsByTopic, setCompletedWordsByTopic] = useState({});

  const [reviewIndex, setReviewIndex] = useState(0);
  const [textIndex, setTextIndex] = useState(0);
  const [speechIndex, setSpeechIndex] = useState(0);
  const [imageIndex, setImageIndex] = useState(0);

  const [textInput, setTextInput] = useState('');
  const [textResults, setTextResults] = useState([]);
  const [speechResults, setSpeechResults] = useState([]);
  const [imageResults, setImageResults] = useState([]);

  const [speechState, setSpeechState] = useState({
    status: 'idle', // idle | listening | error | done
    transcript: '',
    error: null,
  });

  const { recognitionRef, isSupported: isSpeechSupported } = useSpeechRecognition();
  const hasSavedResultsRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setCompletedWordsByTopic(JSON.parse(stored));
      }
    } catch (_) {
      setCompletedWordsByTopic({});
    }
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (isTopicModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isTopicModalOpen]);

  const resetProgress = useCallback(() => {
    setReviewIndex(0);
    setTextIndex(0);
    setSpeechIndex(0);
    setImageIndex(0);
    setTextInput('');
    setTextResults([]);
    setSpeechResults([]);
    setImageResults([]);
    setSpeechState({ status: 'idle', transcript: '', error: null });
  }, []);

  const loadTopics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const vocabularyModule = await import(`@/store/data/practice/language/english/vocabulary/${difficulty.toLowerCase()}.json`);
      const data = vocabularyModule?.default;
      if (!data?.vocabulary_topics?.length) {
        throw new Error(t('pronunciationFlow.noTopics', 'No topics available for this level.'));
      }
      setTopics(data.vocabulary_topics);
    } catch (err) {
      setError(err?.message || t('pronunciationFlow.loadError', 'Failed to load topics.'));
    } finally {
      setIsLoading(false);
    }
  }, [difficulty, t]);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  const filteredTopics = useMemo(() => {
    if (!searchTerm.trim()) return topics;
    const searchLower = searchTerm.toLowerCase();
    return topics.filter((topic) => topic.topic.toLowerCase().includes(searchLower));
  }, [topics, searchTerm]);

  // Пагинация
  const totalPages = Math.ceil(filteredTopics.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedTopics = filteredTopics.slice(startIndex, endIndex);

  // Сброс страницы при изменении поиска
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const getTopicKey = useCallback((topic) => String(topic?.id ?? topic?.topic ?? ''), []);

  const getCompletedKeysForTopic = useCallback(
    (topic) => completedWordsByTopic[getTopicKey(topic)] || [],
    [completedWordsByTopic, getTopicKey]
  );

  const availableWords = useMemo(() => {
    if (!selectedTopic?.words?.length) return [];
    const completedSet = new Set(getCompletedKeysForTopic(selectedTopic));
    return selectedTopic.words.filter((word) => !completedSet.has(getWordKey(word)));
  }, [getCompletedKeysForTopic, selectedTopic]);

  const handleSelectTopic = useCallback(
    (topic) => {
      if (!topic?.words?.length) {
        setError(t('pronunciationFlow.noWords', 'Not enough words in this topic.'));
        return;
      }
      setSelectedTopic(topic);
      setSelectedWordKeys([]);
      setSelectionError('');
      setError(null);
      hasSavedResultsRef.current = false;
      resetProgress();
      setIsTopicModalOpen(true);
    },
    [getCompletedKeysForTopic, resetProgress, t]
  );

  const handleStartTopic = useCallback(() => {
    if (!selectedTopic?.words?.length) return;
    const minRequired = Math.min(MIN_WORDS, availableWords.length);
    if (selectedWordKeys.length < minRequired) {
      setSelectionError(
        t('pronunciationFlow.chooseAtLeast', 'Select at least {{count}} words to start.', { count: minRequired })
      );
      return;
    }
    const selectedWords = selectedTopic.words
      .filter((word) => selectedWordKeys.includes(getWordKey(word)))
      .map((word) => ({
        ...word,
        topicId: selectedTopic.id,
        topicName: selectedTopic.topic,
        topicImage: selectedTopic.image,
      }));
    setWords(selectedWords);
    resetProgress();
    setSelectionError('');
    hasSavedResultsRef.current = false;
    if (selectedWords.length) {
      setStage('review');
      setIsTopicModalOpen(false);
    } else {
      setSelectionError(t('pronunciationFlow.noWordsSelected', 'Please select at least one word.'));
    }
  }, [availableWords.length, resetProgress, selectedTopic, selectedWordKeys, t]);

  const handleToggleWord = useCallback((wordKey) => {
    setSelectedWordKeys((prev) => {
      if (prev.includes(wordKey)) {
        return prev.filter((key) => key !== wordKey);
      }
      return [...prev, wordKey];
    });
    setSelectionError('');
  }, []);

  const handleSelectAllWords = useCallback(() => {
    const allKeys = availableWords.map(getWordKey);
    setSelectedWordKeys(allKeys);
    setSelectionError('');
  }, [availableWords]);

  const handleClearSelection = useCallback(() => {
    setSelectedWordKeys([]);
    setSelectionError('');
  }, []);

  const persistCompletedWords = useCallback((topic, practicedWords) => {
    if (!topic || !practicedWords.length) return;
    const topicKey = getTopicKey(topic);
    setCompletedWordsByTopic((prev) => {
      const existing = new Set(prev[topicKey] || []);
      practicedWords.forEach((word) => existing.add(getWordKey(word)));
      const next = { ...prev, [topicKey]: Array.from(existing) };
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
  }, [getTopicKey]);

  const handleNextReview = useCallback(() => {
    if (reviewIndex < words.length - 1) {
      setReviewIndex((prev) => prev + 1);
    } else {
      setStage('text');
    }
  }, [reviewIndex, words.length]);

  const handlePrevReview = useCallback(() => {
    if (reviewIndex > 0) {
      setReviewIndex((prev) => prev - 1);
    }
  }, [reviewIndex]);

  const handleTextSubmit = useCallback(() => {
    const currentWord = words[textIndex];
    if (!currentWord) return;
    const normalizedAnswer = normalizeText(textInput);
    const isCorrect = normalizedAnswer === normalizeText(currentWord.word);

    setTextResults((prev) => {
      const next = [...prev];
      next[textIndex] = {
        word: currentWord.word,
        userAnswer: textInput,
        correct: isCorrect,
      };
      return next;
    });

    setTextInput('');
    if (textIndex < words.length - 1) {
      setTextIndex((prev) => prev + 1);
    } else {
      setStage('speech');
    }
  }, [textInput, textIndex, words]);

  const startSpeechRecognition = useCallback(() => {
    if (!isSpeechSupported || !recognitionRef.current) {
      setSpeechState({
        status: 'error',
        transcript: '',
        error: t('pronunciationFlow.speechNotSupported', 'Speech recognition is not supported in this browser.'),
      });
      return;
    }

    const instance = recognitionRef.current;
    try {
      instance.onstart = () => {
        setSpeechState({ status: 'listening', transcript: '', error: null });
      };

      instance.onerror = (event) => {
        const isPermission = event.error === 'not-allowed' || event.error === 'service-not-allowed';
        setSpeechState({
          status: 'error',
          transcript: '',
          error: isPermission
            ? t('pronunciationFlow.speechPermissionError', 'Microphone permission denied. Please allow mic access.')
            : t('pronunciationFlow.speechError', 'Speech recognition error. Try again.'),
        });
      };

      instance.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        setSpeechState({ status: 'done', transcript, error: null });
        const currentWord = words[speechIndex];
        const isCorrect = normalizeText(transcript) === normalizeText(currentWord?.word);
        setSpeechResults((prev) => {
          const next = [...prev];
          next[speechIndex] = {
            word: currentWord?.word,
            transcript,
            correct: Boolean(isCorrect),
          };
          return next;
        });
      };

      instance.onend = () => {
        setSpeechState((prev) => ({
          ...prev,
          status: prev.status === 'listening' ? 'idle' : prev.status,
        }));
      };

      instance.start();
    } catch (err) {
      setSpeechState({
        status: 'error',
        transcript: '',
        error: t('pronunciationFlow.speechError', 'Speech recognition error. Try again.'),
      });
    }
  }, [isSpeechSupported, recognitionRef, speechIndex, t, words]);

  const handleNextSpeech = useCallback(() => {
    if (speechIndex < words.length - 1) {
      setSpeechIndex((prev) => prev + 1);
      setSpeechState({ status: 'idle', transcript: '', error: null });
    } else {
      setStage('image');
      setSpeechState({ status: 'idle', transcript: '', error: null });
    }
  }, [speechIndex, words.length]);

  const handleRetrySpeech = useCallback(() => {
    setSpeechState({ status: 'idle', transcript: '', error: null });
    setSpeechResults((prev) => {
      const next = [...prev];
      next[speechIndex] = undefined;
      return next;
    });
  }, [speechIndex]);

  const buildImageOptions = useCallback(
    (word) => {
      // correct option
      const correctImage = getImageFromA1WEBP(word?.word, word?.topicName || selectedTopic?.topic);
      const options = [{ image: correctImage, label: word?.word, isCorrect: true }];

      // Distractors from the same topic
      const sameTopicWords = (selectedTopic?.words || []).filter((w) => w.word !== word?.word);
      const distractors = shuffleArray(sameTopicWords)
        .slice(0, 3)
        .map((w) => ({
          image: getImageFromA1WEBP(w.word, selectedTopic?.topic),
          label: w.word,
          isCorrect: false,
        }));

      // Fallback when not enough words in topic
      while (distractors.length < 3) {
        distractors.push({
          image: `${DEFAULT_IMAGE}&option=${distractors.length + 1}`,
          label: t('pronunciationFlow.altOption', 'Option'),
          isCorrect: false,
        });
      }

      return shuffleArray([...options, ...distractors].slice(0, 4));
    },
    [selectedTopic, t]
  );

  const handleSelectImage = useCallback(
    (option, word) => {
      setImageResults((prev) => {
        const next = [...prev];
        next[imageIndex] = {
          word: word.word,
          image: option.image,
          correct: option.isCorrect,
        };
        return next;
      });

      if (imageIndex < words.length - 1) {
        setImageIndex((prev) => prev + 1);
      } else {
        setStage('results');
      }
    },
    [imageIndex, words.length]
  );

  const handleRestart = useCallback(() => {
    setStage('topic');
    resetProgress();
    setSelectedTopic(null);
    setWords([]);
    setIsTopicModalOpen(false);
    setSelectionError('');
    setSelectedWordKeys([]);
    hasSavedResultsRef.current = false;
  }, [resetProgress]);

  const totalCorrect = useMemo(() => {
    const textCorrect = textResults.filter((item) => item?.correct).length;
    const speechCorrect = speechResults.filter((item) => item?.correct).length;
    const imageCorrect = imageResults.filter((item) => item?.correct).length;
    return textCorrect + speechCorrect + imageCorrect;
  }, [imageResults, speechResults, textResults]);

  const totalQuestions = words.length * 3;
  const minRequired = Math.min(MIN_WORDS, availableWords.length);
  const isStartDisabled = availableWords.length === 0 || selectedWordKeys.length < minRequired;

  useEffect(() => {
    if (stage === 'results' && words.length && selectedTopic && !hasSavedResultsRef.current) {
      hasSavedResultsRef.current = true;
      persistCompletedWords(selectedTopic, words);
    }
  }, [persistCompletedWords, selectedTopic, stage, words]);

  const currentWord =
    stage === 'review'
      ? words[reviewIndex]
      : stage === 'text'
        ? words[textIndex]
        : stage === 'speech'
          ? words[speechIndex]
          : stage === 'image'
            ? words[imageIndex]
            : null;

  const renderHeader = () => (
    <div className={styles.header}>
      <button className={styles.backButton} onClick={onBack} aria-label={t('navigation.back', 'Back')}>
        <FaArrowLeft />
        <span>{t('navigation.back', 'Back')}</span>
      </button>
      <div className={styles.headerIntro}>
        <div className={styles.headerText}>
          <h2>
            <span className={styles.headerIcon}>
              <FaMicrophone />
            </span>
            {t('pronunciationFlow.title', 'Pronunciation Practice')}
          </h2>
          <p>{t('pronunciationFlow.subtitle', 'Review words, type them, pronounce them, and match images.')}</p>
        </div>
      </div>
      <div className={styles.progress}>
        <span>{t('pronunciationFlow.progress', 'Progress')}</span>
        <span>
          {stage === 'topic'
            ? '1/5'
            : stage === 'review'
              ? '2/5'
              : stage === 'text'
                ? '3/5'
                : stage === 'speech'
                  ? '4/5'
                  : stage === 'image'
                    ? '5/5'
                    : '✔'}
        </span>
      </div>
    </div>
  );

  const renderTopicSelection = () => (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3>{t('pronunciationFlow.selectTopicTitle', 'Choose a topic')}</h3>
        <p>{t('pronunciationFlow.selectTopicSubtitle', 'Pick a topic and choose how many words you want to practice (min 5).')}</p>
      </div>

      <div className={styles.controls}>
        <label className={styles.inputLabel}>
          <span>{t('pronunciationFlow.search', 'Search')}</span>
          <div className={styles.searchInput}>
            <FaSearch aria-hidden />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('pronunciationFlow.searchPlaceholder', 'Search topics')}
            />
          </div>
        </label>
      </div>

      <div className={styles.topicGrid}>
        {paginatedTopics.map((topic) => (
          <button
            key={topic.id}
            className={styles.topicCard}
            onClick={() => handleSelectTopic(topic)}
            aria-label={topic.topic}
          >
            <div className={styles.topicImageWrapper}>
              <img src={getTopicImageFromA1Topics(topic.topic)} alt={topic.topic} loading="lazy" />
            </div>
            <div className={styles.topicInfo}>
              <span className={styles.topicTitle}>{topic.topic}</span>
              <span className={styles.topicWords}>
                {t('pronunciationFlow.wordsCount', '{{count}} words', { count: topic.words.length })}
              </span>
            </div>
          </button>
        ))}
      </div>

      {!filteredTopics.length && (
        <div className={styles.emptyState}>
          {t('pronunciationFlow.noTopics', 'No topics available for this level.')}
        </div>
      )}

      {filteredTopics.length > 0 && totalPages > 1 && (
        <div className={styles.pagination}>
          <div className={styles.paginationInfo}>
            {t('pronunciationFlow.showing', 'Showing {{start}} - {{end}} of {{total}}', {
              start: startIndex + 1,
              end: Math.min(endIndex, filteredTopics.length),
              total: filteredTopics.length,
            })}
          </div>
          <div className={styles.paginationControls}>
            <button
              className={styles.paginationButton}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              aria-label={t('pronunciationFlow.previousPage', 'Previous Page')}
            >
              <FaChevronLeft />
              <span>{t('pronunciationFlow.previousPage', 'Previous Page')}</span>
            </button>
            <div className={styles.pageNumbers}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  className={`${styles.pageButton} ${currentPage === page ? styles.pageButtonActive : ''}`}
                  onClick={() => setCurrentPage(page)}
                  aria-label={t('pronunciationFlow.page', 'Page {{page}}', { page })}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              className={styles.paginationButton}
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              aria-label={t('pronunciationFlow.nextPage', 'Next Page')}
            >
              <span>{t('pronunciationFlow.nextPage', 'Next Page')}</span>
              <FaChevronRight />
            </button>
          </div>
        </div>
      )}

      {isTopicModalOpen && selectedTopic && (
        <div className={styles.topicSelectionModal} role="dialog" aria-modal="true">
          <div className={styles.topicSelectionDialog}>
            <div className={styles.topicSelectionHeader}>
              <div>
                <p className={styles.topicSelectionLabel}>{t('pronunciationFlow.selectedTopic', 'Selected topic')}</p>
                <h4 className={styles.topicSelectionTitle}>{selectedTopic.topic}</h4>
                <p className={styles.topicSelectionMeta}>
                  {t('pronunciationFlow.wordsCount', '{{count}} words', { count: selectedTopic.words.length })}
                </p>
              </div>
              <button
                className={styles.modalClose}
                onClick={() => {
                  setIsTopicModalOpen(false);
                  setSelectedTopic(null);
                  setSelectedWordKeys([]);
                  setSelectionError('');
                }}
                aria-label={t('pronunciationFlow.changeTopic', 'Change topic')}
              >
                ×
              </button>
            </div>

            <div className={styles.topicSelectionSummary}>
              <div className={styles.summaryItem}>
                <span>{t('pronunciationFlow.availableWords', 'Available')}</span>
                <strong>{availableWords.length}</strong>
              </div>
              <div className={styles.summaryItem}>
                <span>{t('pronunciationFlow.completedWords', 'Completed')}</span>
                <strong>{Math.max(0, selectedTopic.words.length - availableWords.length)}</strong>
              </div>
              <div className={styles.summaryItem}>
                <span>{t('pronunciationFlow.selectedWords', 'Selected')}</span>
                <strong>{selectedWordKeys.length}</strong>
              </div>
            </div>

            <div className={styles.wordSelection}>
              <div className={styles.wordSelectionHeader}>
                <div>
                  <p className={styles.topicSelectionLabel}>{t('pronunciationFlow.chooseWords', 'Choose words')}</p>
                  <p className={styles.topicSelectionMeta}>
                    {t(
                      'pronunciationFlow.chooseWordsHint',
                      'Select the words you want to practice in this session.'
                    )}
                  </p>
                  <p className={styles.topicSelectionMeta}>
                    {t('pronunciationFlow.minimumWords', 'Minimum {{count}} words', { count: minRequired })}
                  </p>
                </div>
                <div className={styles.wordSelectionActions}>
                  <button className={styles.ghostButton} onClick={handleSelectAllWords} disabled={!availableWords.length}>
                    {t('pronunciationFlow.selectAll', 'Select all')}
                  </button>
                  <button className={styles.ghostButton} onClick={handleClearSelection} disabled={!selectedWordKeys.length}>
                    {t('pronunciationFlow.clearSelection', 'Clear')}
                  </button>
                </div>
              </div>

              {availableWords.length > 0 ? (
                <div className={styles.wordList}>
                  {availableWords.map((word) => {
                    const wordKey = getWordKey(word);
                    const isChecked = selectedWordKeys.includes(wordKey);
                    return (
                      <label
                        key={`${wordKey}-${word.id || word.word}`}
                        className={`${styles.wordRow} ${isChecked ? styles.wordRowSelected : ''}`}
                      >
                        <input
                          className={styles.wordCheckbox}
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleWord(wordKey)}
                        />
                        <div className={styles.wordMedia}>
                          <img
                            src={getImageFromA1WEBP(word.word, selectedTopic?.topic)}
                            alt={word.word}
                            loading="lazy"
                          />
                        </div>
                        <div className={styles.wordInfo}>
                          <span className={styles.wordTitle}>{word.word}</span>
                          <span className={styles.wordMetaText}>
                            {word.translation?.[langKey] || word.translation?.en || '—'}
                          </span>
                        </div>
                        <span className={styles.wordCheckIcon} aria-hidden>
                          <FaCheckCircle />
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  {t('pronunciationFlow.allWordsCompleted', 'All words in this topic are already completed.')}
                </div>
              )}
            </div>

            {selectionError && <div className={styles.selectionError}>{selectionError}</div>}

            <div className={styles.topicSelectionActions}>
              <button
                className={styles.secondary}
                onClick={() => {
                  setIsTopicModalOpen(false);
                  setSelectedTopic(null);
                  setSelectedWordKeys([]);
                  setSelectionError('');
                }}
              >
                {t('pronunciationFlow.changeTopic', 'Change topic')}
              </button>
              <button className={styles.primary} onClick={handleStartTopic} disabled={isStartDisabled}>
                {t('pronunciationFlow.startSelection', 'Start practice')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderReview = () => (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3>{t('pronunciationFlow.reviewTitle', 'Review cards')}</h3>
        <p>
          {t('pronunciationFlow.reviewDescription', 'Look through each card before the tests.')}
        </p>
      </div>

      {currentWord && (
        <div className={styles.reviewCard}>
          <div className={styles.media}>
            <img
              src={getImageFromA1WEBP(currentWord.word, currentWord.topicName || selectedTopic?.topic)}
              alt={currentWord.word}
              loading="lazy"
            />
          </div>
          <div className={styles.reviewContent}>
            <div className={styles.wordHeader}>
              <div className={styles.wordLabel}>
                <FaVolumeUp aria-hidden />
                <span>{currentWord.word}</span>
              </div>
              <div className={styles.tag}>{selectedTopic?.topic}</div>
            </div>

            <div className={styles.wordMeta}>
              <div>
                <span className={styles.metaLabel}>
                  {t('pronunciationFlow.translationLabel', 'Translation')}
                </span>
                <p>{currentWord.translation?.[langKey] || currentWord.translation?.en || '—'}</p>
              </div>
              <div>
                <span className={styles.metaLabel}>
                  {t('pronunciationFlow.transcriptionLabel', 'Transcription')}
                </span>
                <p>{currentWord.transcription || t('pronunciationFlow.noTranscription', 'Not provided')}</p>
              </div>
            </div>

            {Array.isArray(currentWord.example) && currentWord.example.length > 0 && (
              <div className={styles.examples}>
                <span className={styles.metaLabel}>
                  {t('pronunciationFlow.exampleLabel', 'Usage examples')}
                </span>
                <ul>
                  {currentWord.example.map((sample) => (
                    <li key={sample}>{sample}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className={styles.actions}>
              <span className={styles.progressText}>
                {t('pronunciationFlow.cardProgress', '{{current}} / {{total}}', {
                  current: reviewIndex + 1,
                  total: words.length,
                })}
              </span>
              <div className={styles.actionsRight}>
                <button
                  className={styles.secondary}
                  onClick={handlePrevReview}
                  disabled={reviewIndex === 0}
                  aria-disabled={reviewIndex === 0}
                >
                  {t('navigation.back', 'Back')}
                </button>
                <button className={styles.primary} onClick={handleNextReview}>
                  {reviewIndex === words.length - 1
                    ? t('pronunciationFlow.startTextTest', 'Start text test')
                    : t('pronunciationFlow.next', 'Next')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderTextTest = () => (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3>{t('pronunciationFlow.textTestTitle', 'Type the word')}</h3>
        <p>{t('pronunciationFlow.textTestSubtitle', 'Look at the picture and translation, then type the English word.')}</p>
      </div>

      {currentWord && (
        <div className={styles.quizCard}>
          <div className={styles.media}>
            <img
              src={getImageFromA1WEBP(currentWord.word, currentWord.topicName || selectedTopic?.topic)}
              alt={currentWord.word}
              loading="lazy"
            />
          </div>

          <div className={styles.quizContent}>
            <div className={styles.wordMeta}>
              <div>
                <span className={styles.metaLabel}>{t('pronunciationFlow.translationLabel', 'Translation')}</span>
                <p>{currentWord.translation?.ru || currentWord.translation?.[langKey] || currentWord.translation?.en || '—'}</p>
              </div>
            </div>

            <label className={styles.inputLabel}>
              {t('pronunciationFlow.answerLabel', 'Your answer')}
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={t('pronunciationFlow.answerPlaceholder', 'Type the word in English')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleTextSubmit();
                  }
                }}
              />
            </label>

            <div className={styles.actions}>
              <span className={styles.progressText}>
                {t('pronunciationFlow.cardProgress', '{{current}} / {{total}}', {
                  current: textIndex + 1,
                  total: words.length,
                })}
              </span>
              <button className={styles.primary} onClick={handleTextSubmit} disabled={!textInput.trim()}>
                {textIndex === words.length - 1
                  ? t('pronunciationFlow.goSpeech', 'Go to speech test')
                  : t('pronunciationFlow.next', 'Next')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderSpeechTest = () => (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3>{t('pronunciationFlow.speechTestTitle', 'Say the word')}</h3>
        <p>{t('pronunciationFlow.speechTestSubtitle', 'Pronounce the word. We will check it with speech-to-text.')}</p>
      </div>

      {currentWord && (
        <div className={styles.quizCard}>
          <div className={styles.media}>
            <img
              src={getImageFromA1WEBP(currentWord.word, currentWord.topicName || selectedTopic?.topic)}
              alt={currentWord.word}
              loading="lazy"
            />
          </div>

          <div className={styles.quizContent}>
            <div className={styles.wordHeader}>
              <div className={styles.wordLabel}>
                <FaVolumeUp aria-hidden />
                <span>{currentWord.word}</span>
              </div>
              <span className={styles.tag}>{currentWord.translation?.ru || currentWord.translation?.en}</span>
            </div>

            <div className={styles.speechControls}>
              <div className={styles.statusRow}>
                {speechState.status === 'listening' && (
                  <span className={styles.statusListening}>
                    <FaMicrophone />
                    {t('pronunciationFlow.listening', 'Listening...')}
                  </span>
                )}
                {speechState.status === 'error' && (
                  <span className={styles.statusError}>{speechState.error}</span>
                )}
                {speechState.status === 'done' && (
                  <span className={styles.statusSuccess}>
                    <FaCheck />
                    {t('pronunciationFlow.recognized', 'Recognized')}: {speechState.transcript}
                  </span>
                )}
              </div>

              <div className={styles.speechButtons}>
                <button
                  className={styles.speechMicButton}
                  onClick={startSpeechRecognition}
                  disabled={speechState.status === 'listening'}
                  aria-label={t('pronunciationFlow.startSpeaking', 'Start speaking')}
                >
                  <FaMicrophone />
                </button>
              </div>
            </div>

            <div className={styles.actions}>
              <span className={styles.progressText}>
                {t('pronunciationFlow.cardProgress', '{{current}} / {{total}}', {
                  current: speechIndex + 1,
                  total: words.length,
                })}
              </span>
              <div className={styles.actionsRight}>
                {speechState.status === 'done' && speechResults[speechIndex]?.correct === false && (
                  <button className={styles.secondary} onClick={handleRetrySpeech}>
                    {t('pronunciationFlow.retry', 'Retry')}
                  </button>
                )}
                {speechResults[speechIndex]?.correct && (
                  <button
                    className={`${styles.primary} ${styles.primarySuccess}`}
                    onClick={handleNextSpeech}
                    disabled={speechState.status === 'listening'}
                  >
                    {speechIndex === words.length - 1
                      ? t('pronunciationFlow.goImage', 'Go to image test')
                      : t('pronunciationFlow.next', 'Next')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderImageTest = () => {
    const options = currentWord ? buildImageOptions(currentWord) : [];
    return (
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3>{t('pronunciationFlow.imageTestTitle', 'Choose the matching image')}</h3>
          <p>{t('pronunciationFlow.imageTestSubtitle', 'Pick the correct image for the English word.')}</p>
        </div>

        {currentWord && (
          <div className={styles.imageQuiz}>
            <div className={styles.wordHeader}>
              <div className={styles.wordLabel}>
                <FaVolumeUp aria-hidden />
                <span>{currentWord.word}</span>
              </div>
              <span className={styles.tag}>{currentWord.translation?.ru || currentWord.translation?.en}</span>
            </div>

            <div className={styles.imageGrid}>
              {options.map((option, idx) => (
                <button
                  key={`${option.image}-${idx}`}
                  className={styles.imageOption}
                  onClick={() => handleSelectImage(option, currentWord)}
                >
                  <img
                    src={option.image}
                    alt={t('pronunciationFlow.imageOptionAlt', 'Answer option')}
                    loading="lazy"
                  />
                </button>
              ))}
            </div>

            <div className={styles.actions}>
              <span className={styles.progressText}>
                {t('pronunciationFlow.cardProgress', '{{current}} / {{total}}', {
                  current: imageIndex + 1,
                  total: words.length,
                })}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderResults = () => {
    const textCorrect = textResults.filter((item) => item?.correct).length;
    const speechCorrect = speechResults.filter((item) => item?.correct).length;
    const imageCorrect = imageResults.filter((item) => item?.correct).length;

    return (
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3>{t('pronunciationFlow.resultsTitle', 'Results')}</h3>
          <p>{t('pronunciationFlow.resultsSubtitle', 'Here is how you did across all three checks.')}</p>
        </div>

        <div className={styles.resultsGrid}>
          <div className={styles.resultCard}>
            <span className={styles.metaLabel}>{t('pronunciationFlow.textScore', 'Text answers')}</span>
            <p className={styles.resultValue}>
              {textCorrect} / {words.length}
            </p>
          </div>
          <div className={styles.resultCard}>
            <span className={styles.metaLabel}>{t('pronunciationFlow.speechScore', 'Pronunciation')}</span>
            <p className={styles.resultValue}>
              {speechCorrect} / {words.length}
            </p>
          </div>
          <div className={styles.resultCard}>
            <span className={styles.metaLabel}>{t('pronunciationFlow.imageScore', 'Image selection')}</span>
            <p className={styles.resultValue}>
              {imageCorrect} / {words.length}
            </p>
          </div>
          <div className={styles.resultCardHighlight}>
            <span className={styles.metaLabel}>{t('pronunciationFlow.totalScore', 'Total')}</span>
            <p className={styles.resultValue}>
              {totalCorrect} / {totalQuestions}
            </p>
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.secondary} onClick={handleRestart}>
            {t('pronunciationFlow.restart', 'Choose another topic')}
          </button>
          <button className={styles.primary} onClick={onBack}>
            {t('pronunciationFlow.backToMenu', 'Back to menu')}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.pronunciationRoot}>
      <div className={styles.pronunciationContainer}>
        <div className={styles.pronunciation}>
          {renderHeader()}

          {isLoading && (
            <div className={styles.loader}>
              <Spinner />
              <span>{t('pronunciationFlow.loadingTopics', 'Loading topics...')}</span>
            </div>
          )}

          {error && !isLoading && (
            <div className={styles.errorState}>
              <p>{error}</p>
              <button className={styles.secondary} onClick={loadTopics}>
                {t('pronunciationFlow.retry', 'Retry')}
              </button>
            </div>
          )}

          {!isLoading && !error && (
            <>
              {stage === 'topic' && renderTopicSelection()}
              {stage === 'review' && renderReview()}
              {stage === 'text' && renderTextTest()}
              {stage === 'speech' && renderSpeechTest()}
              {stage === 'image' && renderImageTest()}
              {stage === 'results' && renderResults()}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PronunciationPractice;

