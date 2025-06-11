"use client";

import React, { useState } from 'react'; // Import useState
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import i18n from '@/i18n';
// usePathname is removed as we are no longer changing paths for locales
// import { usePathname } from 'next/navigation';
// Link is removed as we are no longer navigating for locale changes here
// import Link from 'next/link';

// Locales supported by the application
const locales = ['en', 'ru'] as const;
type Locale = typeof locales[number];

const localeLabels: Record<Locale, string> = {
  en: "English",
  ru: "Русский (Russian)",
};

// Simple SVG Flag Components
const USFlag = () => (
  <svg width="20" height="15" viewBox="0 0 20 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-5 rounded-sm">
    <rect width="20" height="15" fill="#B22234" /> {/* Red background */}
    <rect y="1.5" width="20" height="1.5" fill="white" />
    <rect y="4.5" width="20" height="1.5" fill="white" />
    <rect y="7.5" width="20" height="1.5" fill="white" />
    <rect y="10.5" width="20" height="1.5" fill="white" />
    <rect y="13.5" width="20" height="1.5" fill="white" />
    <rect x="0" y="0" width="9" height="7.5" fill="#002868" /> {/* Blue canton */}
    {/* Simplified stars: a few white dots */}
    <circle cx="1.5" cy="1.5" r="0.5" fill="white" /> <circle cx="3.5" cy="1.5" r="0.5" fill="white" /> <circle cx="5.5" cy="1.5" r="0.5" fill="white" /> <circle cx="7.5" cy="1.5" r="0.5" fill="white" />
    <circle cx="2.5" cy="3" r="0.5" fill="white" /> <circle cx="4.5" cy="3" r="0.5" fill="white" /> <circle cx="6.5" cy="3" r="0.5" fill="white" />
    <circle cx="1.5" cy="4.5" r="0.5" fill="white" /> <circle cx="3.5" cy="4.5" r="0.5" fill="white" /> <circle cx="5.5" cy="4.5" r="0.5" fill="white" /> <circle cx="7.5" cy="4.5" r="0.5" fill="white" />
    <circle cx="2.5" cy="6" r="0.5" fill="white" /> <circle cx="4.5" cy="6" r="0.5" fill="white" /> <circle cx="6.5" cy="6" r="0.5" fill="white" />
  </svg>
);

const RussianFlag = () => (
  <svg width="20" height="15" viewBox="0 0 20 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-5 rounded-sm">
    <rect width="20" height="5" fill="white" />
    <rect y="5" width="20" height="5" fill="#0039A6" /> {/* Blue */}
    <rect y="10" width="20" height="5" fill="#D52B1E" /> {/* Red */}
  </svg>
);

const localeFlags: Record<Locale, React.FC> = {
  en: USFlag,
  ru: RussianFlag,
};

export function LanguageSwitcher() {
  // State to manage the currently selected language for display purposes in the switcher
  const [currentSelectedLocale, setCurrentSelectedLocale] = useState<Locale>('en');

  const CurrentFlag = localeFlags[currentSelectedLocale];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-1.5">
          <CurrentFlag />
          <span className="hidden sm:inline uppercase">{currentSelectedLocale}</span>
          <span className="sm:hidden uppercase">{currentSelectedLocale}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((locale) => {
          const isActive = locale === currentSelectedLocale;
          const FlagComponent = localeFlags[locale];
          return (
            <DropdownMenuItem
              key={locale}
              disabled={isActive}
              onSelect={() => { // Use onSelect for DropdownMenuItem to handle action
                setCurrentSelectedLocale(locale);
                i18n.changeLanguage(locale); // This will trigger re-translation of content on the page.
              }}
              className={isActive ? "font-semibold text-accent flex items-center cursor-default" : "flex items-center cursor-pointer"}
            >
              {/* The DropdownMenuItem itself is the clickable element */}
              <FlagComponent />
              {localeLabels[locale]}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
