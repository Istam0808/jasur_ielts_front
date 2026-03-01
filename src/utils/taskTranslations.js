import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const pickFirstString = (value) => {
  if (!value || typeof value !== 'object') return '';
  const candidates = Object.values(value).filter((entry) => typeof entry === 'string');
  return candidates[0] || '';
};

export const useTaskTranslation = () => {
  const { i18n } = useTranslation();

  const langKey = useMemo(() => {
    return i18n.language?.split('-')[0] || 'en';
  }, [i18n.language]);

  const getTranslated = useCallback(
    (value, fallback = '') => {
      if (!value) return fallback;
      if (typeof value === 'string') return value;
      if (value[langKey]) return value[langKey];
      if (value.en) return value.en;
      if (value.ru) return value.ru;
      if (value.uz) return value.uz;
      return pickFirstString(value) || fallback;
    },
    [langKey]
  );

  return { langKey, getTranslated };
};
