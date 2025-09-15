/**
 * Language Selector Component
 * Allows users to select languages for document upload and search
 */

import React, { useState, useEffect } from 'react';
import { 
  SupportedLanguage, 
  LanguageDetectionMethod,
  LanguageStatistics 
} from '../../types/enhanced-rag';
import { LanguageDetectionService } from '../../services/languageDetectionService';
import { MultiLanguageSearchService } from '../../services/multiLanguageSearchService';

interface LanguageSelectorProps {
  selectedLanguage?: string;
  onLanguageChange: (language: string) => void;
  mode?: 'upload' | 'search' | 'filter';
  allowMultiple?: boolean;
  selectedLanguages?: string[];
  onMultipleLanguageChange?: (languages: string[]) => void;
  showStatistics?: boolean;
  userId?: string;
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguage,
  onLanguageChange,
  mode = 'upload',
  allowMultiple = false,
  selectedLanguages = [],
  onMultipleLanguageChange,
  showStatistics = false,
  userId,
  className = ''
}) => {
  const [supportedLanguages, setSupportedLanguages] = useState<Array<{ code: string; name: string }>>([]);
  const [languageStats, setLanguageStats] = useState<LanguageStatistics[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load supported languages
    const languages = LanguageDetectionService.getSupportedLanguages();
    setSupportedLanguages(languages);

    // Load language statistics if needed
    if (showStatistics && userId) {
      loadLanguageStatistics();
    }
  }, [showStatistics, userId]);

  const loadLanguageStatistics = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const stats = await MultiLanguageSearchService.getLanguageDistribution(userId);
      setLanguageStats(stats);
    } catch (error) {
      console.error('Failed to load language statistics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSingleLanguageChange = (language: string) => {
    onLanguageChange(language);
  };

  const handleMultipleLanguageChange = (language: string, checked: boolean) => {
    if (!onMultipleLanguageChange) return;

    let newLanguages: string[];
    if (checked) {
      newLanguages = [...selectedLanguages, language];
    } else {
      newLanguages = selectedLanguages.filter(lang => lang !== language);
    }
    
    onMultipleLanguageChange(newLanguages);
  };

  const getLanguageDisplayName = (code: string): string => {
    const stats = languageStats.find(stat => stat.languageCode === code);
    const baseName = LanguageDetectionService.getLanguageName(code);
    
    if (stats && showStatistics) {
      return `${baseName} (${stats.documentCount} docs)`;
    }
    
    return baseName;
  };

  const getLanguageStats = (code: string): LanguageStatistics | undefined => {
    return languageStats.find(stat => stat.languageCode === code);
  };

  const renderSingleSelect = () => (
    <div className={`language-selector ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {mode === 'upload' ? 'Document Language' : 'Search Language'}
      </label>
      
      <select
        value={selectedLanguage || ''}
        onChange={(e) => handleSingleLanguageChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">
          {mode === 'upload' ? 'Auto-detect language' : 'All languages'}
        </option>
        
        {supportedLanguages.map(({ code, name }) => {
          const stats = getLanguageStats(code);
          const hasDocuments = stats && stats.documentCount > 0;
          
          return (
            <option 
              key={code} 
              value={code}
              disabled={mode === 'search' && showStatistics && !hasDocuments}
            >
              {getLanguageDisplayName(code)}
            </option>
          );
        })}
      </select>
      
      {mode === 'upload' && (
        <p className="mt-1 text-xs text-gray-500">
          Leave empty to automatically detect the document language
        </p>
      )}
    </div>
  );

  const renderMultiSelect = () => (
    <div className={`language-selector ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Search Languages
      </label>
      
      <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
        {supportedLanguages.map(({ code, name }) => {
          const stats = getLanguageStats(code);
          const hasDocuments = stats && stats.documentCount > 0;
          const isSelected = selectedLanguages.includes(code);
          
          return (
            <label 
              key={code} 
              className={`flex items-center space-x-2 cursor-pointer ${
                !hasDocuments && showStatistics ? 'opacity-50' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => handleMultipleLanguageChange(code, e.target.checked)}
                disabled={showStatistics && !hasDocuments}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              
              <span className="text-sm">
                {getLanguageDisplayName(code)}
              </span>
              
              {stats && showStatistics && (
                <span className="text-xs text-gray-500 ml-auto">
                  {stats.percentage.toFixed(1)}%
                </span>
              )}
            </label>
          );
        })}
      </div>
      
      <div className="mt-2 flex justify-between text-xs text-gray-500">
        <span>{selectedLanguages.length} languages selected</span>
        
        {selectedLanguages.length > 0 && (
          <button
            onClick={() => onMultipleLanguageChange?.([])}
            className="text-blue-600 hover:text-blue-800"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );

  const renderLanguageStatistics = () => {
    if (!showStatistics || languageStats.length === 0) return null;

    return (
      <div className="mt-4 p-3 bg-gray-50 rounded-md">
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          Language Distribution
        </h4>
        
        <div className="space-y-1">
          {languageStats.slice(0, 5).map(stat => (
            <div key={stat.languageCode} className="flex justify-between text-xs">
              <span>{stat.languageName}</span>
              <span className="text-gray-500">
                {stat.documentCount} docs ({stat.percentage.toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
        
        {languageStats.length > 5 && (
          <p className="text-xs text-gray-500 mt-2">
            +{languageStats.length - 5} more languages
          </p>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={`language-selector ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {allowMultiple ? renderMultiSelect() : renderSingleSelect()}
      {renderLanguageStatistics()}
    </div>
  );
};

/**
 * Language Detection Indicator Component
 */
interface LanguageDetectionIndicatorProps {
  detectedLanguage?: string;
  confidence?: number;
  method?: LanguageDetectionMethod;
  className?: string;
}

export const LanguageDetectionIndicator: React.FC<LanguageDetectionIndicatorProps> = ({
  detectedLanguage,
  confidence,
  method,
  className = ''
}) => {
  if (!detectedLanguage) return null;

  const languageName = LanguageDetectionService.getLanguageName(detectedLanguage);
  const confidencePercent = confidence ? Math.round(confidence * 100) : 0;
  
  const getConfidenceColor = (conf: number): string => {
    if (conf >= 80) return 'text-green-600 bg-green-50';
    if (conf >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getMethodIcon = (detectionMethod?: LanguageDetectionMethod): string => {
    switch (detectionMethod) {
      case LanguageDetectionMethod.AUTOMATIC:
        return '🤖';
      case LanguageDetectionMethod.MANUAL:
        return '👤';
      case LanguageDetectionMethod.FALLBACK:
        return '🔄';
      default:
        return '📝';
    }
  };

  return (
    <div className={`language-detection-indicator ${className}`}>
      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
        getConfidenceColor(confidencePercent)
      }`}>
        <span className="mr-1">{getMethodIcon(method)}</span>
        <span>{languageName}</span>
        {confidence && (
          <span className="ml-1">({confidencePercent}%)</span>
        )}
      </div>
    </div>
  );
};

/**
 * Cross-Language Search Toggle Component
 */
interface CrossLanguageToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  availableLanguages: string[];
  className?: string;
}

export const CrossLanguageToggle: React.FC<CrossLanguageToggleProps> = ({
  enabled,
  onToggle,
  availableLanguages,
  className = ''
}) => {
  const languageCount = availableLanguages.length;
  
  return (
    <div className={`cross-language-toggle ${className}`}>
      <label className="flex items-center space-x-2 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        
        <div>
          <span className="text-sm font-medium text-gray-700">
            Cross-language search
          </span>
          <p className="text-xs text-gray-500">
            Search across {languageCount} languages with translation support
          </p>
        </div>
      </label>
    </div>
  );
};