/**
 * Stub for nextjs-toast-notify. No visual toasts; optionally log to console in dev.
 * Replace with real nextjs-toast-notify when the package is installed.
 */
const noop = () => {};
const show = (msg, opts) => {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.info('[toast]', msg, opts ?? '');
  }
};

export const showToast = {
  success: (msg, opts) => show(msg, opts),
  warning: (msg, opts) => show(msg, opts),
  error: (msg, opts) => show(msg, opts),
  info: (msg, opts) => show(msg, opts),
};

export default showToast;
