"use client";

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaArrowLeft, FaClock, FaPlay, FaChevronRight } from 'react-icons/fa';
import { scrollToTop } from '@/utils/common';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import '../styles/TopicSelection.scss';

const TopicSelection = ({ difficulty = 'B1', onTopicSelect, onBack }) => {
  const { t } = useTranslation('speaking');
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTopics();
  }, [difficulty]);

  const loadTopics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Ensure difficulty is valid
      const validDifficulty = difficulty?.toLowerCase() || 'b1';
      console.log('Loading topics for difficulty:', validDifficulty);
      
      // Use fetch instead of dynamic import for better reliability
      const response = await fetch(`/api/speaking-topics/${validDifficulty}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setTopics(data.topics || []);
    } catch (err) {
      console.error('Error loading topics:', err);
      
      // Fallback: try to load B1 data directly
      try {
        const fallbackResponse = await fetch('/api/speaking-topics/b1');
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          setTopics(fallbackData.topics || []);
          return;
        }
      } catch (fallbackErr) {
        console.error('Fallback also failed:', fallbackErr);
      }
      
      setError('Failed to load topics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (level) => {
    const colors = {
      'A1': '#10B981', // Green
      'A2': '#3B82F6', // Blue
      'B1': '#F59E0B', // Orange
      'B2': '#EF4444', // Red
      'C1': '#8B5CF6', // Purple
      'C2': '#EC4899'  // Pink
    };
    return colors[level] || '#6B7280';
  };

  const getDifficultyLabel = (level) => {
    const labels = {
      'A1': t('difficulty.beginner', 'Beginner'),
      'A2': t('difficulty.elementary', 'Elementary'),
      'B1': t('difficulty.intermediate', 'Intermediate'),
      'B2': t('difficulty.upperIntermediate', 'Upper Intermediate'),
      'C1': t('difficulty.advanced', 'Advanced'),
      'C2': t('difficulty.proficient', 'Proficient')
    };
    return labels[level] || level;
  };

  const handleTopicClick = (topic) => {
    scrollToTop();
    onTopicSelect(topic);
  };

  if (loading) {
    return (
      <div className="topic-selection-container">
        <div className="topic-selection-loading">
          <LoadingSpinner variant="large" message={t('loading.topics', 'Loading topics...')} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="topic-selection-container">
        <div className="topic-selection-error">
          <h3>{t('error.title', 'Error Loading Topics')}</h3>
          <p>{error}</p>
          <button onClick={loadTopics} className="topic-selection-retry-button">
            {t('error.retry', 'Try Again')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="topic-selection-container">
      {/* Professional Header */}
      <header className="topic-selection-header">
        <button onClick={onBack} className="topic-selection-back-button">
          <FaArrowLeft />
          <span>{t('navigation.back', 'Back')}</span>
        </button>
        
        <div className="topic-selection-header-content">
          <h1 className="topic-selection-title">
            {t('topicSelection.title', 'Speaking Practice')}
          </h1>
          <p className="topic-selection-subtitle">
            {t('topicSelection.subtitle', 'Select a topic to begin your IELTS speaking practice')}
          </p>
        </div>
      </header>

      {/* IELTS Exam Structure Introduction */}
      <div className="topic-selection-exam-intro">
        <h2 className="exam-intro-title">
          {t('examStructure.title', 'IELTS Speaking Test Structure')}
        </h2>
        <p className="exam-intro-description">
          {t('examStructure.description', 'Each speaking practice follows the official IELTS format with three parts:')}
        </p>
        
        <div className="exam-structure-overview">
          <div className="exam-part-item">
            <span className="part-number">1</span>
            <div className="part-details">
              <h4 className="part-title">{t('examStructure.part1.title', 'Introduction and Interview')}</h4>
              <p className="part-description">{t('examStructure.part1.description', 'General questions about yourself and familiar topics')}</p>
              <span className="part-duration">{t('examStructure.part1.duration', '4-5 minutes')}</span>
            </div>
          </div>
          
          <div className="exam-part-item">
            <span className="part-number">2</span>
            <div className="part-details">
              <h4 className="part-title">{t('examStructure.part2.title', 'Individual Long Turn')}</h4>
              <p className="part-description">{t('examStructure.part2.description', 'Speak about a topic for 2 minutes after 1 minute preparation')}</p>
              <span className="part-duration">{t('examStructure.part2.duration', '3-4 minutes total')}</span>
            </div>
          </div>
          
          <div className="exam-part-item">
            <span className="part-number">3</span>
            <div className="part-details">
              <h4 className="part-title">{t('examStructure.part3.title', 'Two-way Discussion')}</h4>
              <p className="part-description">{t('examStructure.part3.description', 'Abstract discussion related to Part 2 topic')}</p>
              <span className="part-duration">{t('examStructure.part3.duration', '4-5 minutes')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Topics Grid */}
      <div className="topic-selection-topics-grid">
        {topics.map((topic) => (
          <div
            key={topic.id}
            className="topic-selection-topic-card"
            onClick={() => handleTopicClick(topic)}
          >
            <div className="topic-selection-card-header">
              <div className="topic-selection-topic-info">
                <h3 className="topic-selection-topic-title">{topic.title}</h3>
                <div className="topic-selection-topic-level">
                  {topic.level}
                </div>
              </div>
              <div className="topic-selection-time-badge">
                <FaClock />
                <span>{topic.estimatedTime}</span>
              </div>
            </div>

            <div className="topic-selection-card-content">
              <div className="topic-selection-topic-description">
                <p><strong>{t('topicDescription.part1', 'Part 1:')}</strong> {topic.part1.topic}</p>
                <p><strong>{t('topicDescription.part2', 'Part 2:')}</strong> {topic.part2.topic}</p>
                <p><strong>{t('topicDescription.part3', 'Part 3:')}</strong> {topic.part3.topic}</p>
              </div>
            </div>

            <div className="topic-selection-card-footer">
              <button className="topic-selection-start-button">
                <span>{t('topicSelection.startExam', 'Start Practice')}</span>
                <FaChevronRight />
              </button>
            </div>
          </div>
        ))}
      </div>

      {topics.length === 0 && (
        <div className="topic-selection-empty-state">
          <h3>{t('emptyState.title', 'No Topics Available')}</h3>
          <p>{t('emptyState.message', 'No topics found for the selected difficulty level.')}</p>
        </div>
      )}
    </div>
  );
};

export default TopicSelection;
