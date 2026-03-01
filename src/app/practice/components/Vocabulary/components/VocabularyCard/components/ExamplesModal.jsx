import { memo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { FaImage } from 'react-icons/fa';
import { MdClose, MdTranslate, MdVolumeUp } from 'react-icons/md';
import { BiSolidQuoteLeft } from 'react-icons/bi';
import InfoTooltip from '@/components/common/InfoTooltip';
import useScrollLock from '@/hooks/useScrollLock';
import { ANIMATION_VARIANTS } from '../constants/animations';

const MotionDiv = motion.div;
const MotionButton = motion.button;

const ExamplesModal = memo(({
    word,
    langKey,
    images,
    imagesLoading,
    imagesError,
    onClose,
    t
}) => {
    // Lock scroll when modal is open
    useScrollLock(true);

    const handleSpeak = (text, lang) => {
        try {
            const synth = window.speechSynthesis;
            if (!synth) return;
            synth.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            
            // Set slower speech rate for better pronunciation clarity
            utterance.rate = 0.8; // 0.8 = 80% of normal speed (slower)
            
            // Prefer a voice matching lang; fallback to first available
            const voices = synth.getVoices();
            const preferred = voices.find((v) => v.lang?.toLowerCase().startsWith((lang || 'en').toLowerCase()));
            if (preferred) utterance.voice = preferred;
            utterance.lang = preferred?.lang || lang || 'en';
            synth.speak(utterance);
        } catch {}
    };

    // Safety check for SSR
    if (typeof document === 'undefined') {
        return null;
    }

    return createPortal(
        <MotionDiv
            className="examples-modal-overlay"
            {...ANIMATION_VARIANTS.modalOverlay}
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
        <MotionDiv
            className="examples-modal"
            {...ANIMATION_VARIANTS.modal}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="modal-header">
                <h2 id="modal-title" className="modal-title">
                    {t('examplesFor', { ns: 'vocabulary' })} "{word.word}"
                </h2>
                <MotionButton
                    className="close-btn"
                    onClick={onClose}
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    title={t('close', { ns: 'vocabulary' })}
                    type="button"
                    aria-label={t('close', { ns: 'vocabulary' })}
                >
                    <MdClose />
                </MotionButton>
            </div>

            <div className="modal-body" style={{ paddingBottom: 0 }}>
                <div className="word-summary">
                    <h4 className="word">{word.word}</h4>
                    <p className="translation">
                        {word.translation?.[langKey] || word.translation?.en || t('noTranslation', { ns: 'vocabulary' })}
                    </p>
                </div>

                {/* Examples Section - Now First */}
                <div className="examples-list">
                    <div className="section-header">
                        <BiSolidQuoteLeft className="section-icon" />
                        <h3 className="section-title">{t('examples', { ns: 'vocabulary' })}</h3>
                    </div>
                    
                    {word.example?.map((example, idx) => {
                        const translateUrl = `https://translate.google.com/?sl=auto&tl=${langKey}&text=${encodeURIComponent(example)}&op=translate`;
                        return (
                            <MotionDiv
                                key={`example-${idx}`}
                                className="example-item"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 + idx * 0.08, ease: 'easeOut' }}
                            >
                                <div className="example-number">{idx + 1}</div>
                                <div className="example-content">
                                    <p className="example-text">{example}</p>
                                    <div className="example-actions">
                                        <InfoTooltip content={t('pronounceSentence', { ns: 'vocabulary' })}>
                                            <button
                                                type="button"
                                                className="vocab-pronounce-btn"
                                                onClick={() => handleSpeak(example, 'en')}
                                                aria-label={t('pronounceSentence', { ns: 'vocabulary' })}
                                            >
                                                <MdVolumeUp />
                                            </button>
                                        </InfoTooltip>
                                        <InfoTooltip content={t('translateSentence', { ns: 'vocabulary' })}>
                                            <a
                                                className="vocab-translate-btn"
                                                href={translateUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                aria-label={t('translateSentence', { ns: 'vocabulary' })}
                                                onKeyDown={(e) => (e.key === 'Enter' ? null : undefined)}
                                            >
                                                <MdTranslate />
                                            </a>
                                        </InfoTooltip>
                                    </div>
                                </div>
                            </MotionDiv>
                        );
                    }) || (
                        <p className="no-examples">{t('noExamples', { ns: 'vocabulary' })}</p>
                    )}
                </div>

                {/* Images Section - Now Second */}
                <div className="images-section">
                    <div className="section-header">
                        <FaImage className="section-icon" />
                        <h3 className="section-title">{t('relatedImages', { ns: 'vocabulary' })}</h3>
                    </div>
                    
                    <div className="images-container">
                        {imagesLoading && (
                            <div className="images-loading">
                                <div className="loading-spinner"></div>
                                <span>{t('loadingImages', { ns: 'vocabulary' })}</span>
                            </div>
                        )}

                        {imagesError && (
                            <div className="images-error">
                                <span>{t('noImagesAvailable', { ns: 'vocabulary' })}</span>
                            </div>
                        )}

                        {!imagesLoading && !imagesError && images.length > 0 && (
                            <div className="images-grid">
                                {images.map((image, idx) => (
                                    <MotionDiv
                                        key={image.id}
                                        className="image-item"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.3 + idx * 0.1, ease: 'easeOut' }}
                                    >
                                        <div className="image-wrapper">
                                            <img
                                                src={image.url}
                                                alt={image.altDescription}
                                                className="vocabulary-image"
                                                loading="lazy"
                                                onClick={() => {
                                                    if (image.url && document.fullscreenEnabled) {
                                                        const img = new Image();
                                                        img.src = image.url;
                                                        img.style.width = '100vw';
                                                        img.style.height = '100vh';
                                                        img.style.objectFit = 'contain';
                                                        img.style.backgroundColor = '#000';
                                                        img.style.cursor = 'pointer';
                                                        img.onclick = () => document.exitFullscreen();
                                                        img.alt = image.altDescription;
                                                        
                                                        document.body.appendChild(img);
                                                        img.requestFullscreen().catch(err => {
                                                            if (document.body.contains(img)) {
                                                                document.body.removeChild(img);
                                                            }
                                                        });
                                                        
                                                        document.addEventListener('fullscreenchange', function onFullscreenChange() {
                                                            if (!document.fullscreenElement) {
                                                                if (document.body.contains(img)) {
                                                                    document.body.removeChild(img);
                                                                }
                                                                document.removeEventListener('fullscreenchange', onFullscreenChange);
                                                            }
                                                        });
                                                    }
                                                }}
                                                style={{ cursor: 'pointer' }}
                                                title={t('clickToFullscreen', { ns: 'vocabulary' })}
                                            />
                                            <div className="image-attribution">
                                                <span className="attribution-text">
                                                    {t('photoBy', { ns: 'vocabulary' })}{' '}
                                                    <a
                                                        href={`${image.photographerUrl}?utm_source=vocabulary_learning&utm_medium=referral`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="photographer-link"
                                                    >
                                                        {image.photographer}
                                                    </a>{' '}
                                                    {t('onUnsplash', { ns: 'vocabulary' })}{' '}
                                                    <a
                                                        href="https://unsplash.com?utm_source=vocabulary_learning&utm_medium=referral"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="unsplash-link"
                                                    >
                                                        Unsplash
                                                    </a>
                                                </span>
                                            </div>
                                        </div>
                                    </MotionDiv>
                                ))}
                            </div>
                        )}

                        {!imagesLoading && !imagesError && images.length === 0 && (
                            <div className="no-images">
                                <span>{t('noImagesFound', { ns: 'vocabulary' })}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </MotionDiv>
    </MotionDiv>,
    document.body
    );
});

ExamplesModal.displayName = 'ExamplesModal';

export default ExamplesModal; 