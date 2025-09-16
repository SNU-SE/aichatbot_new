/**
 * Language Detection Service
 * Handles automatic language detection for documents and text content
 */

import { supabase } from '@/integrations/supabase/client';
import { 
  LanguageDetectionResult, 
  LanguageDetectionMethod, 
  SupportedLanguage,
  EnhancedErrorResponse,
  DocumentErrorCode 
} from '../types/enhanced-rag';

/**
 * Language detection patterns for common languages
 */
const LANGUAGE_PATTERNS = {
  [SupportedLanguage.KOREAN]: /[가-힣]/,
  [SupportedLanguage.JAPANESE]: /[ひらがなカタカナ一-龯]/,
  [SupportedLanguage.CHINESE]: /[一-龯]/,
  [SupportedLanguage.FRENCH]: /[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]/,
  [SupportedLanguage.GERMAN]: /[äöüß]/,
  [SupportedLanguage.SPANISH]: /[áéíóúüñ¿¡]/,
  [SupportedLanguage.ITALIAN]: /[àèéìíîòóù]/,
  [SupportedLanguage.PORTUGUESE]: /[àáâãçéêíóôõú]/,
  [SupportedLanguage.RUSSIAN]: /[а-яё]/i,
  [SupportedLanguage.ARABIC]: /[\u0600-\u06FF]/,
  [SupportedLanguage.HINDI]: /[\u0900-\u097F]/
};

/**
 * Language names mapping
 */
export const LANGUAGE_NAMES: Record<string, string> = {
  [SupportedLanguage.ENGLISH]: 'English',
  [SupportedLanguage.KOREAN]: '한국어',
  [SupportedLanguage.JAPANESE]: '日本語',
  [SupportedLanguage.CHINESE]: '中文',
  [SupportedLanguage.FRENCH]: 'Français',
  [SupportedLanguage.GERMAN]: 'Deutsch',
  [SupportedLanguage.SPANISH]: 'Español',
  [SupportedLanguage.ITALIAN]: 'Italiano',
  [SupportedLanguage.PORTUGUESE]: 'Português',
  [SupportedLanguage.RUSSIAN]: 'Русский',
  [SupportedLanguage.ARABIC]: 'العربية',
  [SupportedLanguage.HINDI]: 'हिन्दी'
};

/**
 * Language detection service class
 */
export class LanguageDetectionService {
  /**
   * Detect language from text content using pattern matching
   */
  static async detectLanguageFromText(
    text: string,
    method: LanguageDetectionMethod = LanguageDetectionMethod.AUTOMATIC
  ): Promise<LanguageDetectionResult> {
    try {
      // Clean and prepare text sample
      const sampleText = this.prepareSampleText(text);
      
      // Try pattern-based detection first
      const patternResult = this.detectLanguageByPatterns(sampleText);
      
      if (patternResult.confidence > 0.8) {
        return {
          detectedLanguage: patternResult.language,
          confidence: patternResult.confidence,
          method,
          alternatives: patternResult.alternatives
        };
      }
      
      // Fallback to statistical analysis
      const statisticalResult = this.detectLanguageByStatistics(sampleText);
      
      return {
        detectedLanguage: statisticalResult.language,
        confidence: statisticalResult.confidence,
        method: method === LanguageDetectionMethod.AUTOMATIC ? 
          LanguageDetectionMethod.FALLBACK : method,
        alternatives: statisticalResult.alternatives
      };
      
    } catch (error) {
      console.error('Language detection failed:', error);
      
      // Return English as fallback
      return {
        detectedLanguage: SupportedLanguage.ENGLISH,
        confidence: 0.5,
        method: LanguageDetectionMethod.FALLBACK
      };
    }
  }

  /**
   * Detect language for a document using database function
   */
  static async detectDocumentLanguage(
    documentId: string,
    sampleContent: string,
    method: LanguageDetectionMethod = LanguageDetectionMethod.AUTOMATIC
  ): Promise<LanguageDetectionResult> {
    try {
      const { data, error } = await supabase.rpc('detect_document_language', {
        doc_id: documentId,
        sample_content: sampleContent,
        detection_method: method
      });

      if (error) {
        throw new Error(`Database language detection failed: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error('No language detection result returned');
      }

      const result = data[0];
      return {
        detectedLanguage: result.detected_language,
        confidence: parseFloat(result.confidence),
        method
      };

    } catch (error) {
      console.error('Document language detection failed:', error);
      
      // Fallback to client-side detection
      return this.detectLanguageFromText(sampleContent, LanguageDetectionMethod.FALLBACK);
    }
  }

  /**
   * Get language statistics for user's documents
   */
  static async getUserLanguageStatistics(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase.rpc('get_user_document_languages', {
        target_user_id: userId
      });

      if (error) {
        throw new Error(`Failed to get language statistics: ${error.message}`);
      }

      return data || [];

    } catch (error) {
      console.error('Failed to get language statistics:', error);
      return [];
    }
  }

  /**
   * Validate language code
   */
  static isValidLanguageCode(languageCode: string): boolean {
    return Object.values(SupportedLanguage).includes(languageCode as SupportedLanguage);
  }

  /**
   * Get language name from code
   */
  static getLanguageName(languageCode: string): string {
    return LANGUAGE_NAMES[languageCode] || languageCode.toUpperCase();
  }

  /**
   * Get all supported languages
   */
  static getSupportedLanguages(): Array<{ code: string; name: string }> {
    return Object.entries(LANGUAGE_NAMES).map(([code, name]) => ({
      code,
      name
    }));
  }

  /**
   * Prepare text sample for language detection
   */
  private static prepareSampleText(text: string): string {
    // Take first 1000 characters, remove excessive whitespace
    return text
      .substring(0, 1000)
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Detect language using character patterns
   */
  private static detectLanguageByPatterns(text: string): {
    language: string;
    confidence: number;
    alternatives: Array<{ language: string; confidence: number }>;
  } {
    const scores: Record<string, number> = {};
    const textLength = text.length;

    // Test each language pattern
    for (const [language, pattern] of Object.entries(LANGUAGE_PATTERNS)) {
      const matches = text.match(new RegExp(pattern.source, 'g'));
      const matchCount = matches ? matches.length : 0;
      scores[language] = matchCount / textLength;
    }

    // Sort by score
    const sortedScores = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .filter(([, score]) => score > 0);

    if (sortedScores.length === 0) {
      // No patterns matched, assume English
      return {
        language: SupportedLanguage.ENGLISH,
        confidence: 0.7,
        alternatives: []
      };
    }

    const [topLanguage, topScore] = sortedScores[0];
    const alternatives = sortedScores.slice(1, 3).map(([lang, score]) => ({
      language: lang,
      confidence: Math.min(score * 10, 1) // Scale confidence
    }));

    return {
      language: topLanguage,
      confidence: Math.min(topScore * 10, 1), // Scale confidence
      alternatives
    };
  }

  /**
   * Detect language using statistical analysis
   */
  private static detectLanguageByStatistics(text: string): {
    language: string;
    confidence: number;
    alternatives: Array<{ language: string; confidence: number }>;
  } {
    // Simple statistical analysis based on character frequency
    const charFreq: Record<string, number> = {};
    
    for (const char of text.toLowerCase()) {
      if (/[a-z]/.test(char)) {
        charFreq[char] = (charFreq[char] || 0) + 1;
      }
    }

    // English has high frequency of 'e', 't', 'a', 'o', 'i', 'n'
    const englishChars = ['e', 't', 'a', 'o', 'i', 'n'];
    const englishScore = englishChars.reduce((sum, char) => 
      sum + (charFreq[char] || 0), 0) / text.length;

    // If high English character frequency, assume English
    if (englishScore > 0.4) {
      return {
        language: SupportedLanguage.ENGLISH,
        confidence: Math.min(englishScore * 2, 0.9),
        alternatives: []
      };
    }

    // Default fallback
    return {
      language: SupportedLanguage.ENGLISH,
      confidence: 0.6,
      alternatives: []
    };
  }
}

/**
 * Language detection utilities
 */
export const languageDetectionUtils = {
  /**
   * Extract sample text from document content
   */
  extractSampleText: (content: string, maxLength: number = 1000): string => {
    // Extract text from different parts of the document
    const lines = content.split('\n').filter(line => line.trim().length > 10);
    
    let sampleText = '';
    let currentLength = 0;
    
    // Take text from beginning, middle, and end
    const sections = [
      lines.slice(0, Math.ceil(lines.length * 0.3)),
      lines.slice(Math.floor(lines.length * 0.4), Math.ceil(lines.length * 0.6)),
      lines.slice(Math.floor(lines.length * 0.8))
    ];
    
    for (const section of sections) {
      for (const line of section) {
        if (currentLength + line.length > maxLength) break;
        sampleText += line + ' ';
        currentLength += line.length + 1;
      }
      if (currentLength >= maxLength) break;
    }
    
    return sampleText.trim();
  },

  /**
   * Validate language detection confidence
   */
  isConfidenceAcceptable: (confidence: number, threshold: number = 0.7): boolean => {
    return confidence >= threshold;
  },

  /**
   * Format language detection result for display
   */
  formatDetectionResult: (result: LanguageDetectionResult): string => {
    const languageName = LanguageDetectionService.getLanguageName(result.detectedLanguage);
    const confidence = Math.round(result.confidence * 100);
    return `${languageName} (${confidence}% confidence)`;
  }
};
