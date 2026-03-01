"use client";

import { useTranslation } from 'react-i18next';

export const LearnModeHeader = ({ topic, slides, index, goTo, isPracticeSlide }) => {
    const { t } = useTranslation(['grammar']);

    return (
        <header className="lm-header">
            <div className="lm-topic">
                <img
                    className="lm-brand"
                    src="/android-chrome-512x512.webp"
                    alt=""
                    aria-hidden="true"
                    decoding="async"
                    loading="eager"
                />
                <h2>{topic.topic}</h2>
            </div>
            <div className="lm-steps" aria-label={t('steps', { ns: 'grammar', defaultValue: 'Steps' })}>
                {slides.map((s, i) => (
                    <button
                        key={s.key}
                        className={`lm-step ${i === index ? 'active' : ''}`}
                        onClick={() => goTo(i)}
                        aria-current={i === index}
                    >
                        <span className="lm-step-index">{i + 1}</span>
                        <span className="lm-step-title">{s.title}</span>
                    </button>
                ))}
            </div>
        </header>
    );
};


