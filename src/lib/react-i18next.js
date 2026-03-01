"use client";

import React from "react";

const createI18nStub = () => ({
  language: "en",
  hasResourceBundle: () => true,
  loadNamespaces: async () => {},
  addResourceBundle: () => {},
  changeLanguage: async () => {},
  on: () => {},
  off: () => {},
});

export const useTranslation = () => {
  const i18n = createI18nStub();
  const t = (key, options = {}) => {
    if (typeof options.defaultValue === "string") {
      return options.defaultValue;
    }
    if (typeof options === "string") {
      return options;
    }
    return key;
  };

  return { t, i18n, ready: true };
};

export const Trans = ({ children }) => <>{children}</>;

export const I18nextProvider = ({ children }) => <>{children}</>;
