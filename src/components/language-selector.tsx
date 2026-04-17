'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

// Define the shape of a language object
interface Language {
  code: string; // e.g., 'en', 'pt-PT', 'zh-CN'
  name: string; // e.g., 'English', 'Português', '中文'
  flag: string; // e.g., '🇺🇸', '🇵🇹', '🇨🇳'
}

interface LanguageSelectorProps {
  languages: Language[];
  currentLanguageCode: string;
  onSelectLanguage: (code: string) => void;
}

export function LanguageSelector({
  languages,
  currentLanguageCode,
  onSelectLanguage,
}: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const currentLanguage =
    languages.find((lang) => lang.code === currentLanguageCode) || languages[0];

  const toggleDropdown = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleSelect = useCallback(
    (code: string) => {
      onSelectLanguage(code);
      closeDropdown();
    },
    [onSelectLanguage, closeDropdown]
  );

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        closeDropdown();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [closeDropdown]);

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeDropdown();
        triggerRef.current?.focus();
      } else if (event.key === 'ArrowDown' && isOpen) {
        event.preventDefault();
        const nextButton = document.activeElement?.nextElementSibling as HTMLButtonElement;
        if (nextButton) {
          nextButton.focus();
        } else {
          // Loop to first item
          dropdownRef.current?.querySelector('button')?.focus();
        }
      } else if (event.key === 'ArrowUp' && isOpen) {
        event.preventDefault();
        const prevButton = document.activeElement?.previousElementSibling as HTMLButtonElement;
        if (prevButton) {
          prevButton.focus();
        } else {
          // Loop to last item
          const buttons = dropdownRef.current?.querySelectorAll('button');
          buttons?.[buttons.length - 1]?.focus();
        }
      } else if (
        event.key === 'Enter' &&
        isOpen &&
        document.activeElement instanceof HTMLButtonElement
      ) {
        (document.activeElement as HTMLButtonElement).click();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.removeEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeDropdown]);

  return (
    <div className="relative inline-block text-left z-50">
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex justify-center items-center gap-2 shrink-0
                   rounded-lg border border-gray-300 dark:border-gray-700
                   bg-white dark:bg-gray-800
                   shadow-sm px-2 sm:px-4 py-2 text-sm font-medium min-h-[44px] min-w-[44px]
                   text-gray-700 dark:text-gray-200
                   hover:bg-gray-50 dark:hover:bg-gray-700
                   focus:outline-none focus:ring-2 focus:ring-organic-terracotta focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800
                   transition-all duration-200 ease-in-out"
        id="language-menu-button"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`Change language, current: ${currentLanguage.name}`}
        onClick={toggleDropdown}
      >
        <span className="text-xl">{currentLanguage.flag}</span>
        <span className="hidden sm:inline">{currentLanguage.name}</span>
        <svg
          className="hidden sm:block -mr-1 h-5 w-5 text-gray-400"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="origin-top-right absolute right-0 mt-2 w-56
                     rounded-lg shadow-lg
                     bg-white dark:bg-gray-800
                     ring-1 ring-black ring-opacity-5
                     focus:outline-none
                     transform opacity-100 scale-100
                     transition-all duration-200 ease-out
                     "
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="language-menu-button"
          tabIndex={-1}
        >
          <div className="py-1" role="none">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang.code)}
                className={`${
                  lang.code === currentLanguageCode
                    ? 'bg-organic-terracotta/10 dark:bg-organic-terracotta/20 text-organic-terracotta'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                } group flex items-center w-full px-4 py-2 text-sm
                   transition-colors duration-150 ease-in-out`}
                role="menuitem"
                tabIndex={0} // Make focusable
              >
                <span className="text-xl mr-3">{lang.flag}</span>
                {lang.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
