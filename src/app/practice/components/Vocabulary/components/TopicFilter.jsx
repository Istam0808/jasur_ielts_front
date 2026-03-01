"use client";

import { useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import CustomSelect from '@/components/common/CustomSelect';
import './styles/TopicFilter.scss';

const TopicFilter = memo(({ topics, selectedTopic, onTopicChange }) => {
    const { t } = useTranslation(['vocabulary']);

    // Memoize options to prevent recreation on every render
    const options = useMemo(() => [
        { value: 'all', label: t('allTopics') },
        ...topics.map((topic) => ({
            value: topic.id,
            label: topic.topic,
        })),
    ], [topics, t]);

    return (
        <div className="topic-filter">
            <CustomSelect
                options={options}
                selectedValue={selectedTopic}
                onChange={onTopicChange}
                placeholder={t('allTopics')}
                fullWidth={true}
            />
        </div>
    );
});

TopicFilter.displayName = 'TopicFilter';

export default TopicFilter;