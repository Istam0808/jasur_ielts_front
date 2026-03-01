import { motion } from 'framer-motion';
import PropTypes from 'prop-types';
import styles from './styles/ProgressBar.module.scss';

const ProgressBar = ({ progress, label, children }) => (
  <div className={styles.progressSection}>
    <div className={styles.progressInfo}>
      <div className={styles.progressBar}>
        <motion.div
          className={styles.progressFill}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
    {children}
  </div>
);

ProgressBar.propTypes = {
  progress: PropTypes.number.isRequired,
  label: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.node
  ]),
  children: PropTypes.node
};

export default ProgressBar; 