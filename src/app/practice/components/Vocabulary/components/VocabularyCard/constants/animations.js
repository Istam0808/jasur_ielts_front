// Static animation variants - moved outside component to prevent recreation
export const ANIMATION_VARIANTS = {
    cardHover: { y: -4, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" },
    cardTransition: { duration: 0.2 },
    modalOverlay: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 }
    },
    modal: {
        initial: { opacity: 0, scale: 0.9, y: 20 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.9, y: 20 },
        transition: { ease: 'easeInOut', duration: 0.2 }
    },
    quizCard: {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3 }
    },
    quizOption: {
        initial: { opacity: 0, x: -20 },
        animate: { opacity: 1, x: 0 }
    },
    quizResult: {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { delay: 0.3 }
    }
};

// Static gradient constants
export const GRADIENTS = {
    base: 'linear-gradient(135deg, #8e44ad 0%, #6b21a8 100%)',
    back: 'linear-gradient(135deg, #6b21a8 0%, #4a1a73 100%)'
}; 