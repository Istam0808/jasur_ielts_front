import { memo } from 'react';
import { motion } from 'framer-motion';
import { MdBookmark, MdBookmarkBorder } from 'react-icons/md';

const MotionButton = motion.button;

const SaveButton = memo(({ isSaved = false, onToggleSave, t }) => (
    <MotionButton
        className={`save-btn ${isSaved ? 'saved' : ''}`}
        onClick={onToggleSave}
        title={isSaved ? t('removeFromSaved', { ns: 'vocabulary' }) : t('saveWord', { ns: 'vocabulary' })}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        type="button"
        aria-label={isSaved ? t('removeFromSaved', { ns: 'vocabulary' }) : t('saveWord', { ns: 'vocabulary' })}
    >
        {isSaved ? <MdBookmark /> : <MdBookmarkBorder />}
    </MotionButton>
));

SaveButton.displayName = 'SaveButton';

export default SaveButton; 