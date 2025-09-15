/**
 * Multi-Language Support Tests
 * Tests for language detection, multi-language search, and cross-language functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  LanguageDetectionService, 
  LANGUAGE_NAMES 
} from '../services/languageDetectionService';
import { MultiLanguageSearchService } from '../services/multiLanguageSearchService';
import { 
  SupportedLanguage, 
  LanguageDetectionMethod,
  LanguageDetectionResult,
  SearchResult,
  MultiLanguageSearchOptions 
} from '../types/enhanced-rag';

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ 
        data: { user: { id: 'test-user-id' } } 
      }))
    }
  }
}));

describe('LanguageDetectionService', () => {
  describe('detectLanguageFromText', () => {
    it('should detect Korean text correctly', async () => {
      const koreanText = '안녕하세요. 이것은 한국어 텍스트입니다. 언어 감지 테스트를 위한 샘플 문서입니다.';
      
      const result = await LanguageDetectionService.detectLanguageFromText(koreanText);
      
      expect(result.detectedLanguage).toBe(SupportedLanguage.KOREAN);
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.method).toBe(LanguageDetectionMethod.AUTOMATIC);
    });

    it('should detect Japanese text correctly', async () => {
      const japaneseText = 'こんにちは。これは日本語のテキストです。言語検出テストのためのサンプル文書です。';
      
      const result = await LanguageDetectionService.detectLanguageFromText(japaneseText);
      
      expect(result.detectedLanguage).toBe(SupportedLanguage.JAPANESE);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should detect Chinese text correctly', async () => {
      const chineseText = '你好。这是中文文本。这是用于语言检测测试的示例文档。';
      
      const result = await LanguageDetectionService.detectLanguageFromText(chineseText);
      
      expect(result.detectedLanguage).toBe(SupportedLanguage.CHINESE);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should detect French text correctly', async () => {
      const frenchText = 'Bonjour. Ceci est un texte français. Voici un document d\'exemple pour tester la détection de langue.';
      
      const result = await LanguageDetectionService.detectLanguageFromText(frenchText);
      
      expect(result.detectedLanguage).toBe(SupportedLanguage.FRENCH);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should fallback to English for unrecognized text', async () => {
      const englishText = 'Hello. This is English text without special characters for language detection testing.';
      
      const result = await LanguageDetectionService.detectLanguageFromText(englishText);
      
      expect(result.detectedLanguage).toBe(SupportedLanguage.ENGLISH);
      expect(result.method).toBe(LanguageDetectionMethod.FALLBACK);
    });

    it('should handle mixed language text', async () => {
      const mixedText = 'Hello 안녕하세요 こんにちは 你好 Bonjour';
      
      const result = await LanguageDetectionService.detectLanguageFromText(mixedText);
      
      expect(result.detectedLanguage).toBeOneOf([
        SupportedLanguage.KOREAN,
        SupportedLanguage.JAPANESE,
        SupportedLanguage.CHINESE,
        SupportedLanguage.FRENCH
      ]);
      expect(result.alternatives).toBeDefined();
      expect(result.alternatives!.length).toBeGreaterThan(0);
    });

    it('should handle empty or very short text', async () => {
      const shortText = 'Hi';
      
      const result = await LanguageDetectionService.detectLanguageFromText(shortText);
      
      expect(result.detectedLanguage).toBe(SupportedLanguage.ENGLISH);
      expect(result.method).toBe(LanguageDetectionMethod.FALLBACK);
    });
  });

  describe('language validation and utilities', () => {
    it('should validate language codes correctly', () => {
      expect(LanguageDetectionService.isValidLanguageCode('en')).toBe(true);
      expect(LanguageDetectionService.isValidLanguageCode('ko')).toBe(true);
      expect(LanguageDetectionService.isValidLanguageCode('invalid')).toBe(false);
      expect(LanguageDetectionService.isValidLanguageCode('')).toBe(false);
    });

    it('should return correct language names', () => {
      expect(LanguageDetectionService.getLanguageName('en')).toBe('English');
      expect(LanguageDetectionService.getLanguageName('ko')).toBe('한국어');
      expect(LanguageDetectionService.getLanguageName('ja')).toBe('日本語');
      expect(LanguageDetectionService.getLanguageName('unknown')).toBe('UNKNOWN');
    });

    it('should return all supported languages', () => {
      const languages = LanguageDetectionService.getSupportedLanguages();
      
      expect(languages).toBeInstanceOf(Array);
      expect(languages.length).toBeGreaterThan(0);
      expect(languages[0]).toHaveProperty('code');
      expect(languages[0]).toHaveProperty('name');
    });
  });
});

describe('MultiLanguageSearchService', () => {
  const mockSearchResults: SearchResult[] = [
    {
      chunkId: 'chunk-1',
      documentId: 'doc-1',
      documentTitle: 'Korean Document',
      content: '한국어 문서 내용입니다.',
      similarity: 0.9,
      sourceLanguage: 'ko',
      isTranslated: false,
      metadata: {}
    },
    {
      chunkId: 'chunk-2',
      documentId: 'doc-2',
      documentTitle: 'English Document',
      content: 'This is English document content.',
      similarity: 0.85,
      sourceLanguage: 'en',
      isTranslated: false,
      metadata: {}
    },
    {
      chunkId: 'chunk-3',
      documentId: 'doc-3',
      documentTitle: 'Japanese Document',
      content: '日本語の文書内容です。',
      similarity: 0.8,
      sourceLanguage: 'ja',
      isTranslated: true,
      metadata: {}
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchWithLanguageSupport', () => {
    it('should perform multi-language search successfully', async () => {
      const mockSupabase = await import('../lib/supabase');
      vi.mocked(mockSupabase.supabase.rpc).mockResolvedValueOnce({
        data: [
          {
            chunk_id: 'chunk-1',
            document_id: 'doc-1',
            document_title: 'Korean Document',
            content: '한국어 문서 내용입니다.',
            similarity: 0.9,
            source_language: 'ko',
            is_translated: false
          }
        ],
        error: null
      });

      const result = await MultiLanguageSearchService.searchWithLanguageSupport(
        '한국어 검색',
        { targetLanguage: 'ko', maxResults: 10 }
      );

      expect(result.results).toHaveLength(1);
      expect(result.results[0].sourceLanguage).toBe('ko');
      expect(result.languageStats).toBeDefined();
      expect(result.totalResults).toBe(1);
    });

    it('should handle search errors gracefully', async () => {
      const mockSupabase = await import('../lib/supabase');
      vi.mocked(mockSupabase.supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: 'Search failed' }
      });

      await expect(
        MultiLanguageSearchService.searchWithLanguageSupport('test query')
      ).rejects.toThrow('Search failed');
    });
  });

  describe('searchByLanguage', () => {
    it('should search within specific language documents', async () => {
      const mockSupabase = await import('../lib/supabase');
      vi.mocked(mockSupabase.supabase.rpc).mockResolvedValueOnce({
        data: [
          {
            chunk_id: 'chunk-1',
            document_id: 'doc-1',
            document_title: 'Korean Document',
            content: '한국어 문서 내용입니다.',
            similarity: 0.9,
            source_language: 'ko',
            is_translated: false
          }
        ],
        error: null
      });

      const results = await MultiLanguageSearchService.searchByLanguage(
        '한국어 검색',
        'ko'
      );

      expect(results).toHaveLength(1);
      expect(results[0].sourceLanguage).toBe('ko');
    });
  });

  describe('crossLanguageSearch', () => {
    it('should perform cross-language search across multiple languages', async () => {
      const mockSupabase = await import('../lib/supabase');
      
      // Mock multiple search calls for different languages
      vi.mocked(mockSupabase.supabase.rpc)
        .mockResolvedValueOnce({
          data: [
            {
              chunk_id: 'chunk-1',
              document_id: 'doc-1',
              document_title: 'Korean Document',
              content: '한국어 문서 내용입니다.',
              similarity: 0.9,
              source_language: 'ko',
              is_translated: false
            }
          ],
          error: null
        })
        .mockResolvedValueOnce({
          data: [
            {
              chunk_id: 'chunk-2',
              document_id: 'doc-2',
              document_title: 'Japanese Document',
              content: '日本語の文書内容です。',
              similarity: 0.8,
              source_language: 'ja',
              is_translated: true
            }
          ],
          error: null
        });

      const result = await MultiLanguageSearchService.crossLanguageSearch(
        'search query',
        'en',
        ['ko', 'ja']
      );

      expect(result.results.length).toBeGreaterThan(0);
      expect(result.translationInfo).toHaveLength(2);
      expect(result.translationInfo[0]).toHaveProperty('language');
      expect(result.translationInfo[0]).toHaveProperty('resultCount');
      expect(result.translationInfo[0]).toHaveProperty('avgConfidence');
    });
  });

  describe('suggestSearchLanguages', () => {
    it('should suggest appropriate search languages based on query', async () => {
      const koreanQuery = '한국어 검색어';
      const suggestions = await MultiLanguageSearchService.suggestSearchLanguages(koreanQuery);

      expect(suggestions).toContain('ko');
      expect(suggestions).toContain('en'); // Common cross-language pair
    });

    it('should handle English queries', async () => {
      const englishQuery = 'English search query';
      const suggestions = await MultiLanguageSearchService.suggestSearchLanguages(englishQuery);

      expect(suggestions).toContain('en');
      expect(suggestions.length).toBeGreaterThan(1);
    });
  });

  describe('getLanguageDistribution', () => {
    it('should return language statistics for user documents', async () => {
      vi.spyOn(LanguageDetectionService, 'getUserLanguageStatistics').mockResolvedValue([
        {
          language_code: 'en',
          document_count: '5',
          total_chunks: '50'
        },
        {
          language_code: 'ko',
          document_count: '3',
          total_chunks: '30'
        }
      ]);

      const stats = await MultiLanguageSearchService.getLanguageDistribution('test-user-id');

      expect(stats).toHaveLength(2);
      expect(stats[0]).toHaveProperty('languageCode');
      expect(stats[0]).toHaveProperty('languageName');
      expect(stats[0]).toHaveProperty('documentCount');
      expect(stats[0]).toHaveProperty('percentage');
      
      // Check percentage calculation
      expect(stats[0].percentage + stats[1].percentage).toBeCloseTo(100, 1);
    });
  });
});

describe('Language Detection Utilities', () => {
  const { languageDetectionUtils } = require('../services/languageDetectionService');

  describe('extractSampleText', () => {
    it('should extract representative sample text from document', () => {
      const longText = 'Line 1\n'.repeat(100) + 'Middle content\n' + 'Line 2\n'.repeat(100);
      
      const sample = languageDetectionUtils.extractSampleText(longText, 500);
      
      expect(sample.length).toBeLessThanOrEqual(500);
      expect(sample).toContain('Line 1');
      expect(sample).toContain('Middle content');
    });

    it('should handle short text', () => {
      const shortText = 'Short document content';
      
      const sample = languageDetectionUtils.extractSampleText(shortText, 1000);
      
      expect(sample).toBe(shortText.trim());
    });
  });

  describe('isConfidenceAcceptable', () => {
    it('should validate confidence levels correctly', () => {
      expect(languageDetectionUtils.isConfidenceAcceptable(0.8, 0.7)).toBe(true);
      expect(languageDetectionUtils.isConfidenceAcceptable(0.6, 0.7)).toBe(false);
      expect(languageDetectionUtils.isConfidenceAcceptable(0.9)).toBe(true); // Default threshold 0.7
    });
  });

  describe('formatDetectionResult', () => {
    it('should format detection results for display', () => {
      const result: LanguageDetectionResult = {
        detectedLanguage: 'ko',
        confidence: 0.85,
        method: LanguageDetectionMethod.AUTOMATIC
      };
      
      const formatted = languageDetectionUtils.formatDetectionResult(result);
      
      expect(formatted).toContain('한국어');
      expect(formatted).toContain('85%');
    });
  });
});

describe('Multi-Language Search Utilities', () => {
  const { multiLanguageSearchUtils } = require('../services/multiLanguageSearchService');

  describe('shouldEnableCrossLanguage', () => {
    it('should recommend cross-language search when appropriate', () => {
      expect(multiLanguageSearchUtils.shouldEnableCrossLanguage('en', ['ko', 'ja'])).toBe(true);
      expect(multiLanguageSearchUtils.shouldEnableCrossLanguage('ko', ['ko', 'en'])).toBe(false);
      expect(multiLanguageSearchUtils.shouldEnableCrossLanguage('fr', [])).toBe(false);
    });
  });

  describe('getOptimalSearchLanguages', () => {
    it('should return optimal language combinations', () => {
      const languages = multiLanguageSearchUtils.getOptimalSearchLanguages(
        'en',
        ['ko', 'ja', 'zh', 'fr'],
        3
      );
      
      expect(languages).toContain('en');
      expect(languages.length).toBeLessThanOrEqual(3);
      expect(languages).toContain('ko'); // Priority language for English
    });
  });

  describe('formatLanguageStats', () => {
    it('should format language statistics for display', () => {
      const stats = [
        { languageCode: 'en', languageName: 'English', documentCount: 5, totalChunks: 50, percentage: 60 },
        { languageCode: 'ko', languageName: '한국어', documentCount: 3, totalChunks: 30, percentage: 40 }
      ];
      
      const formatted = multiLanguageSearchUtils.formatLanguageStats(stats);
      
      expect(formatted).toContain('English');
      expect(formatted).toContain('60.0%');
      expect(formatted).toContain('한국어');
    });

    it('should handle empty statistics', () => {
      const formatted = multiLanguageSearchUtils.formatLanguageStats([]);
      
      expect(formatted).toBe('No language data available');
    });
  });
});

// Integration tests
describe('Multi-Language Integration', () => {
  it('should handle end-to-end language detection and search workflow', async () => {
    // 1. Detect language from sample text
    const koreanText = '인공지능과 머신러닝에 대한 문서입니다.';
    const detection = await LanguageDetectionService.detectLanguageFromText(koreanText);
    
    expect(detection.detectedLanguage).toBe('ko');
    
    // 2. Mock search with detected language
    const mockSupabase = await import('../lib/supabase');
    vi.mocked(mockSupabase.supabase.rpc).mockResolvedValueOnce({
      data: [
        {
          chunk_id: 'chunk-1',
          document_id: 'doc-1',
          document_title: 'AI Document',
          content: koreanText,
          similarity: 0.9,
          source_language: 'ko',
          is_translated: false
        }
      ],
      error: null
    });

    // 3. Perform language-specific search
    const searchResults = await MultiLanguageSearchService.searchByLanguage(
      '인공지능',
      detection.detectedLanguage
    );
    
    expect(searchResults).toHaveLength(1);
    expect(searchResults[0].sourceLanguage).toBe('ko');
  });

  it('should handle cross-language search scenarios', async () => {
    const englishQuery = 'artificial intelligence';
    
    // 1. Detect query language
    const detection = await LanguageDetectionService.detectLanguageFromText(englishQuery);
    expect(detection.detectedLanguage).toBe('en');
    
    // 2. Get suggested languages
    const suggestions = await MultiLanguageSearchService.suggestSearchLanguages(englishQuery);
    expect(suggestions).toContain('en');
    
    // 3. Mock cross-language search
    const mockSupabase = await import('../lib/supabase');
    vi.mocked(mockSupabase.supabase.rpc)
      .mockResolvedValueOnce({
        data: [
          {
            chunk_id: 'chunk-1',
            document_id: 'doc-1',
            document_title: 'English AI Document',
            content: 'Artificial intelligence content',
            similarity: 0.9,
            source_language: 'en',
            is_translated: false
          }
        ],
        error: null
      })
      .mockResolvedValueOnce({
        data: [
          {
            chunk_id: 'chunk-2',
            document_id: 'doc-2',
            document_title: 'Korean AI Document',
            content: '인공지능 관련 내용',
            similarity: 0.8,
            source_language: 'ko',
            is_translated: true
          }
        ],
        error: null
      });

    const crossLangResults = await MultiLanguageSearchService.crossLanguageSearch(
      englishQuery,
      'en',
      ['ko']
    );
    
    expect(crossLangResults.results.length).toBeGreaterThan(0);
    expect(crossLangResults.translationInfo).toHaveLength(1);
  });
});