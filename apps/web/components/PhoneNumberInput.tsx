"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Phone, AlertCircle, Search } from "lucide-react";

export interface CountryCode {
  code: string;
  dialCode: string;
  flag: string;
  name: string;
  format: string;
  placeholder: string;
  example: string;
  minLength: number;
  maxLength: number;
  pattern: RegExp;
  priority?: number; // For sorting popular countries first
}

export interface PhoneNumberInputProps {
  value?: string;
  onChange?: (value: string, countryCode: string, fullNumber: string) => void;
  onValidationChange?: (isValid: boolean, error?: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  showError?: boolean;
}

// Comprehensive 20 countries with formatting and validation
const DEFAULT_COUNTRIES: CountryCode[] = [
  { 
    code: "US", dialCode: "1", flag: "🇺🇸", name: "United States",
    format: "(###) ###-####", placeholder: "Phone number", example: "(555) 123-4567",
    minLength: 10, maxLength: 10, priority: 1,
    pattern: /^(\+?1)?[2-9]\d{2}[2-9]\d{2}\d{4}$/
  },
  { 
    code: "GB", dialCode: "44", flag: "🇬🇧", name: "United Kingdom",
    format: "#### ### ####", placeholder: "Mobile number", example: "7700 900123",
    minLength: 10, maxLength: 11, priority: 2,
    pattern: /^(\+?44|0)?[1-9]\d{8,9}$/
  },
  { 
    code: "CA", dialCode: "1", flag: "🇨🇦", name: "Canada",
    format: "(###) ###-####", placeholder: "Phone number", example: "(416) 123-4567",
    minLength: 10, maxLength: 10, priority: 3,
    pattern: /^(\+?1)?[2-9]\d{2}[2-9]\d{2}\d{4}$/
  },
  { 
    code: "AU", dialCode: "61", flag: "🇦🇺", name: "Australia",
    format: "#### ### ###", placeholder: "Mobile number", example: "0412 345 678",
    minLength: 9, maxLength: 9, priority: 4,
    pattern: /^(\+?61|0)?[2-57-9]\d{8}$/
  },
  { 
    code: "DE", dialCode: "49", flag: "🇩🇪", name: "Germany",
    format: "#### ########", placeholder: "Handynummer", example: "1512 3456789",
    minLength: 10, maxLength: 12, priority: 5,
    pattern: /^(\+?49|0)?[1-9]\d{8,11}$/
  },
  { 
    code: "FR", dialCode: "33", flag: "🇫🇷", name: "France",
    format: "## ## ## ## ##", placeholder: "Numéro de téléphone", example: "06 12 34 56 78",
    minLength: 10, maxLength: 10, priority: 6,
    pattern: /^(\+?33|0)?[1-9]\d{8}$/
  },
  { 
    code: "IT", dialCode: "39", flag: "🇮🇹", name: "Italy",
    format: "### ### ####", placeholder: "Numero di telefono", example: "320 123 4567",
    minLength: 9, maxLength: 11, priority: 7,
    pattern: /^(\+?39)?[0-9]\d{8,10}$/
  },
  { 
    code: "ES", dialCode: "34", flag: "🇪🇸", name: "Spain",
    format: "### ### ###", placeholder: "Número de teléfono", example: "612 345 678",
    minLength: 9, maxLength: 9, priority: 8,
    pattern: /^(\+?34)?[679]\d{8}$/
  },
  { 
    code: "NL", dialCode: "31", flag: "🇳🇱", name: "Netherlands",
    format: "## #### ####", placeholder: "Telefoonnummer", example: "06 1234 5678",
    minLength: 9, maxLength: 9, priority: 9,
    pattern: /^(\+?31|0)?[1-9]\d{8}$/
  },
  { 
    code: "JP", dialCode: "81", flag: "🇯🇵", name: "Japan",
    format: "###-####-####", placeholder: "電話番号", example: "090-1234-5678",
    minLength: 10, maxLength: 11, priority: 10,
    pattern: /^(\+?81|0)?[1-9]\d{8,9}$/
  },
  { 
    code: "BR", dialCode: "55", flag: "🇧🇷", name: "Brazil",
    format: "(##) #####-####", placeholder: "Número de telefone", example: "(11) 99999-1234",
    minLength: 10, maxLength: 11,
    pattern: /^(\+?55)?[1-9]\d{8,9}$/
  },
  { 
    code: "IN", dialCode: "91", flag: "🇮🇳", name: "India",
    format: "##### #####", placeholder: "Mobile number", example: "98765 43210",
    minLength: 10, maxLength: 10,
    pattern: /^(\+?91)?[6-9]\d{9}$/
  },
  { 
    code: "CN", dialCode: "86", flag: "🇨🇳", name: "China",
    format: "### #### ####", placeholder: "手机号码", example: "138 0013 8000",
    minLength: 11, maxLength: 11,
    pattern: /^(\+?86)?1[3-9]\d{9}$/
  },
  { 
    code: "RU", dialCode: "7", flag: "🇷🇺", name: "Russia",
    format: "(###) ###-##-##", placeholder: "Номер телефона", example: "(999) 123-45-67",
    minLength: 10, maxLength: 10,
    pattern: /^(\+?7)?[89]\d{9}$/
  },
  { 
    code: "MX", dialCode: "52", flag: "🇲🇽", name: "Mexico",
    format: "## #### ####", placeholder: "Número de teléfono", example: "55 1234 5678",
    minLength: 10, maxLength: 10,
    pattern: /^(\+?52)?[1-9]\d{9}$/
  },
  { 
    code: "ZA", dialCode: "27", flag: "🇿🇦", name: "South Africa",
    format: "## ### ####", placeholder: "Phone number", example: "72 123 4567",
    minLength: 9, maxLength: 9,
    pattern: /^(\+?27|0)?[1-9]\d{8}$/
  },
  { 
    code: "KR", dialCode: "82", flag: "🇰🇷", name: "South Korea",
    format: "###-####-####", placeholder: "전화번호", example: "010-1234-5678",
    minLength: 10, maxLength: 11,
    pattern: /^(\+?82|0)?1[0-9]\d{7,8}$/
  },
  { 
    code: "SG", dialCode: "65", flag: "🇸🇬", name: "Singapore",
    format: "#### ####", placeholder: "Phone number", example: "9123 4567",
    minLength: 8, maxLength: 8,
    pattern: /^(\+?65)?[689]\d{7}$/
  },
  { 
    code: "NO", dialCode: "47", flag: "🇳🇴", name: "Norway",
    format: "### ## ###", placeholder: "Telefonnummer", example: "412 34 567",
    minLength: 8, maxLength: 8,
    pattern: /^(\+?47)?[49]\d{7}$/
  },
  { 
    code: "SE", dialCode: "46", flag: "🇸🇪", name: "Sweden",
    format: "###-### ## ##", placeholder: "Telefonnummer", example: "070-123 45 67",
    minLength: 9, maxLength: 9,
    pattern: /^(\+?46|0)?7\d{8}$/
  },
].sort((a, b) => (a.priority || 999) - (b.priority || 999));

export function PhoneNumberInput({
  value = "",
  onChange,
  onValidationChange,
  placeholder = "Enter phone number",
  className = "",
  disabled = false,
  required = false,
  error: externalError,
  showError = false,
}: PhoneNumberInputProps) {
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(DEFAULT_COUNTRIES[0]);
  const [phoneNumber, setPhoneNumber] = useState(value);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [internalError, setInternalError] = useState<string>("");
  const [isValid, setIsValid] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isDropdownOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isDropdownOpen]);

  // Reset highlighted index when search changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery]);

  // Filter countries based on search query
  const filteredCountries = DEFAULT_COUNTRIES.filter(country =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    country.dialCode.includes(searchQuery) ||
    country.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Enhanced validation with country-specific rules
  useEffect(() => {
    const validatePhoneNumber = () => {
      if (!phoneNumber.trim()) {
        setInternalError(required ? "Phone number is required" : "");
        setIsValid(!required);
        return;
      }

      // Remove all non-digit characters for validation
      const digitsOnly = phoneNumber.replace(/\D/g, "");
      
      // Country-specific validation
      if (digitsOnly.length < selectedCountry.minLength) {
        setInternalError(`Phone number is too short (minimum ${selectedCountry.minLength} digits)`);
        setIsValid(false);
        return;
      }

      if (digitsOnly.length > selectedCountry.maxLength) {
        setInternalError(`Phone number is too long (maximum ${selectedCountry.maxLength} digits)`);
        setIsValid(false);
        return;
      }

      // Pattern validation (basic check without country code)
      const basicPattern = new RegExp(selectedCountry.pattern.source.replace(/\(\\\+\?\d+\|\d*\)\?/, ''));
      if (!basicPattern.test(digitsOnly)) {
        setInternalError(`Invalid ${selectedCountry.name} phone number format`);
        setIsValid(false);
        return;
      }

      setInternalError("");
      setIsValid(true);
    };

    validatePhoneNumber();
  }, [phoneNumber, selectedCountry, required]);

  // Notify parent of validation changes
  useEffect(() => {
    onValidationChange?.(isValid, internalError || externalError);
  }, [isValid, internalError, externalError, onValidationChange]);

  // Update internal state when external value changes
  useEffect(() => {
    setPhoneNumber(value);
  }, [value]);

  // Format phone number according to country pattern
  const formatPhoneNumber = (number: string, format: string) => {
    const digitsOnly = number.replace(/\D/g, '');
    let formatted = '';
    let digitIndex = 0;
    
    for (let i = 0; i < format.length && digitIndex < digitsOnly.length; i++) {
      if (format[i] === '#') {
        formatted += digitsOnly[digitIndex];
        digitIndex++;
      } else {
        formatted += format[i];
      }
    }
    
    // Add remaining digits if any (for partial input)
    if (digitIndex < digitsOnly.length) {
      formatted += digitsOnly.slice(digitIndex);
    }
    
    return formatted;
  };

  // Auto-detect country from phone number
  const detectCountryFromNumber = (number: string): CountryCode | null => {
    const digitsOnly = number.replace(/\D/g, '');
    
    // Sort countries by dial code length (longest first) for better matching
    const sortedCountries = [...DEFAULT_COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
    
    for (const country of sortedCountries) {
      if (digitsOnly.startsWith(country.dialCode)) {
        const remainingDigits = digitsOnly.slice(country.dialCode.length);
        if (remainingDigits.length >= country.minLength - 2 && 
            remainingDigits.length <= country.maxLength + 2) {
          return country;
        }
      }
    }
    
    return null;
  };

  // Parse pasted content for international phone numbers
  const parsePastedNumber = (pastedText: string) => {
    // Clean the pasted text
    const cleaned = pastedText.replace(/[^\d+\-\s()]/g, '');
    
    if (cleaned.includes('+')) {
      // International format detected
      const digitsOnly = cleaned.replace(/\D/g, '');
      
      if (digitsOnly.length > 7) {
        const detectedCountry = detectCountryFromNumber(digitsOnly);
        
        if (detectedCountry) {
          const phoneNumber = digitsOnly.slice(detectedCountry.dialCode.length);
          return {
            country: detectedCountry,
            number: phoneNumber
          };
        }
      }
    }
    
    // Try to detect from digits only
    const digitsOnly = cleaned.replace(/\D/g, '');
    if (digitsOnly.length >= 8) {
      const detectedCountry = detectCountryFromNumber(digitsOnly);
      if (detectedCountry) {
        const phoneNumber = digitsOnly.slice(detectedCountry.dialCode.length);
        return {
          country: detectedCountry,
          number: phoneNumber
        };
      }
    }
    
    return null;
  };



  const handleCountrySelect = (country: CountryCode) => {
    setSelectedCountry(country);
    setIsDropdownOpen(false);
    setSearchQuery(""); // Clear search when country is selected
    
    // Trigger onChange with new country code
    const fullNumber = `+${country.dialCode} ${phoneNumber}`;
    onChange?.(phoneNumber, country.dialCode, fullNumber);
    
    // Focus back to phone number input
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Allow only digits, spaces, hyphens, parentheses, and plus signs
    const cleanValue = inputValue.replace(/[^\d\s\-\(\)\+]/g, '');
    
    // Auto-format as user types
    const formattedValue = formatPhoneNumber(cleanValue, selectedCountry.format);
    
    setPhoneNumber(formattedValue);
    
    // Trigger onChange with formatted value
    const fullNumber = `+${selectedCountry.dialCode} ${formattedValue}`;
    onChange?.(formattedValue, selectedCountry.dialCode, fullNumber);
  };

  const handlePhoneNumberPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    
    const parsed = parsePastedNumber(pastedText);
    if (parsed) {
      // Auto-select detected country
      setSelectedCountry(parsed.country);
      
      // Format the number according to the detected country
      const formattedNumber = formatPhoneNumber(parsed.number, parsed.country.format);
      setPhoneNumber(formattedNumber);
      
      // Trigger onChange
      const fullNumber = `+${parsed.country.dialCode} ${formattedNumber}`;
      onChange?.(formattedNumber, parsed.country.dialCode, fullNumber);
    } else {
      // Fallback to normal paste behavior with formatting
      const cleanValue = pastedText.replace(/[^\d\s\-\(\)\+]/g, '');
      const formattedValue = formatPhoneNumber(cleanValue, selectedCountry.format);
      setPhoneNumber(formattedValue);
      
      const fullNumber = `+${selectedCountry.dialCode} ${formattedValue}`;
      onChange?.(formattedValue, selectedCountry.dialCode, fullNumber);
    }
  };

  const handlePhoneNumberKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow backspace, delete, tab, escape, enter, and arrow keys
    if ([8, 9, 27, 13, 46, 37, 38, 39, 40].includes(e.keyCode)) {
      return;
    }
    
    // Allow Ctrl/Cmd+A, Ctrl/Cmd+C, Ctrl/Cmd+V, Ctrl/Cmd+X
    if ((e.ctrlKey || e.metaKey) && [65, 67, 86, 88].includes(e.keyCode)) {
      return;
    }
    
    // Only allow digits, space, hyphen, parentheses
    if (!/[\d\s\-\(\)]/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isDropdownOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredCountries.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredCountries.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCountries[highlightedIndex]) {
          handleCountrySelect(filteredCountries[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsDropdownOpen(false);
        inputRef.current?.focus();
        break;
      case 'Tab':
        // Let tab work normally for navigation
        break;
      default:
        break;
    }
  };

  const getDisplayValue = () => {
    if (!phoneNumber) return "";
    return phoneNumber;
  };

  const currentError = externalError || internalError;
  const shouldShowError = showError && currentError;

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        {/* Country Code Selector */}
        <button
          type="button"
          onClick={() => {
            setIsDropdownOpen(!isDropdownOpen);
            if (!isDropdownOpen) {
              setSearchQuery(selectedCountry.dialCode); // Default to selected country code
            }
          }}
          disabled={disabled}
          className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center space-x-2 bg-transparent border-none p-0 cursor-pointer disabled:cursor-not-allowed z-10"
        >
          <span className="text-lg">{selectedCountry.flag}</span>
          <span className="text-sm font-medium text-gray-700">+{selectedCountry.dialCode}</span>
        </button>

        {/* Phone Input */}
        <div className="relative">
          <Phone className="absolute left-20 top-1/2 -translate-y-1/2 h-4 ml-1 w-4 text-gray-400" />
          <input
            ref={inputRef}
            type="tel"
            value={getDisplayValue()}
            onChange={handlePhoneNumberChange}
            onPaste={handlePhoneNumberPaste}
            onKeyDown={handlePhoneNumberKeyDown}
            placeholder={selectedCountry.placeholder}
            disabled={disabled}
            required={required}
            autoComplete="tel"
            aria-label={`Phone number for ${selectedCountry.name}`}
            aria-describedby={shouldShowError ? "phone-error" : undefined}
            className={`
              w-full pl-28 pr-4 py-3 border-2 rounded-lg text-sm transition-colors
              ${disabled 
                ? 'bg-gray-50 text-gray-500 cursor-not-allowed' 
                : 'bg-white text-gray-900'
              }
              ${shouldShowError 
                ? 'border-red-500 focus:border-red-500' 
                : 'border-gray-300 focus:border-indigo-500'
              }
              focus:outline-none focus:ring-2 focus:ring-opacity-20
              ${shouldShowError ? 'focus:ring-red-500' : 'focus:ring-indigo-500'}
            `}
          />
        </div>

        {/* Error Icon */}
        {shouldShowError && (
          <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />
        )}
      </div>

      {/* Country Dropdown */}
      {isDropdownOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 mt-1 w-80 sm:w-64 bg-white border-2 border-gray-200 rounded-lg shadow-lg z-50 max-h-80 sm:max-h-60"
        >
          {/* Search Filter */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search countries..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Countries List */}
          <div className="max-h-48 overflow-y-auto">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country, index) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleCountrySelect(country)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 sm:py-2 hover:bg-gray-50 transition-colors text-left touch-manipulation ${
                    index === highlightedIndex ? 'bg-indigo-50 border-l-2 border-indigo-500' : ''
                  }`}
                >
                  <span className="text-lg">{country.flag}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{country.name}</div>
                    <div className="text-sm text-gray-500">
                      +{country.dialCode} • {country.example}
                    </div>
                  </div>
                  {selectedCountry.code === country.code && (
                    <div className="w-2 h-2 bg-indigo-600 rounded-full flex-shrink-0" />
                  )}
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                No countries found
              </div>
            )}
          </div>
        </div>
      )}

      {/* Example Number */}
      {!shouldShowError && selectedCountry.example && (
        <p className="mt-2 text-xs text-gray-500 flex items-center space-x-1">
          <span>Example: {selectedCountry.example}</span>
        </p>
      )}

      {/* Error Message */}
      {shouldShowError && (
        <p id="phone-error" className="mt-2 text-sm text-red-600 flex items-center space-x-1">
          <AlertCircle className="h-4 w-4" />
          <span>{currentError}</span>
        </p>
      )}
    </div>
  );
}
