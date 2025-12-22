import React, { useEffect } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';

const I18nUpdater = ({ children }) => {
  const { i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.lang = i18n.language;
    document.documentElement.dir = i18n.dir(i18n.language);
    document.body.className = i18n.language === 'ar' ? 'font-cairo' : 'font-sans';
  }, [i18n, i18n.language]);

  return children;
};

const I18nProvider = ({ children }) => {
  return (
    <I18nextProvider i18n={i18n}>
      <I18nUpdater>{children}</I18nUpdater>
    </I18nextProvider>
  );
};

export default I18nProvider;