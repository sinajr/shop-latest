
"use client";

import React, { ReactNode, Suspense } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n'; // Your i18n configuration

interface I18nProviderWrapperProps {
  children: ReactNode;
}

// This component ensures i18next is initialized on the client-side.
// The Suspense fallback is important because i18next might load translations asynchronously.
export function I18nProviderWrapper({ children }: I18nProviderWrapperProps) {
  return (
    <I18nextProvider i18n={i18n}>
      <Suspense fallback={<div>Loading translations...</div>}>
        {children}
      </Suspense>
    </I18nextProvider>
  );
}
