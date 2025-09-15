/**
 * Multi-Language Demo Component
 * Demonstrates multi-language document support and cross-language search
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Globe, 
  Upload, 
  Search, 
  FileText, 
  BarChart3, 
  Languages,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

import { DocumentUploadWithLanguage } from './DocumentUploadWithLanguage';
import { 
  MultiLanguageSearchInterface, 
  MultiLanguageSearchResult 
} from './MultiLanguageSearchInterface';
import { LanguageSelector, LanguageDetectionIndicator } from './LanguageSelector';

import { 
  SearchResult, 
  LanguageStatistics, 
  DocumentUploadRequest,
  SupportedLanguage,
  LanguageDetectionResult 
} from '../../types/enhanced-rag';
import { LanguageDetectionService } from '../../services/languageDetectionService';
import { MultiLanguageSearchService } from '../../services/multiLanguageSearchService';

interface MultiLanguageDemoProps {
  userId?: string;
  className?: string;
}

export const MultiLanguageDemo: React.FC<MultiLanguageDemoProps> = ({
  userId = 'demo-user',
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState('upload');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [languageStats, setLanguageStats] = useState<LanguageStatistics[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [demoDocuments, setDemoDocuments] = useState<Array<{
    id: string;
    title: string;
    language: string;
    confidence: number;
    content: string;
  }>>([]);

  // Demo data
  const sampleTexts = {
    en: 'Artificial Intelligence and Machine Learning are transforming how we process and understand information. These technologies enable computers to learn from data and make intelligent decisions.',
    ko: '인공지능과 머신러닝은 우리가 정보를 처리하고 이해하는 방식을 변화시키고 있습니다. 이러한 기술들은 컴퓨터가 데이터로부터 학습하고 지능적인 결정을 내릴 수 있게 합니다.',
    ja: '人工知能と機械学習は、私たちが情報を処理し理解する方法を変革しています。これらの技術により、コンピュータはデータから学習し、知的な決定を下すことができます。',
    zh: '人工智能和机器学习正在改变我们处理和理解信息的方式。这些技术使计算机能够从数据中学习并做出智能决策。',
    fr: 'L\'Intelligence Artificielle et l\'Apprentissage Automatique transforment la façon dont nous traitons et comprenons l\'information. Ces technologies permettent aux ordinateurs d\'apprendre à partir de données et de prendre des décisions intelligentes.',
    es: 'La Inteligencia Artificial y el Aprendizaje Automático están transformando la forma en que procesamos y entendemos la información. Estas tecnologías permiten a las computadoras aprender de los datos y tomar decisiones inteligentes.'
  };

  useEffect(() => {
    initializeDemoData();
  }, []);

  const initializeDemoData = async () => {
    setIsLoading(true);
    
    try {
      // Create demo documents with language detection
      const documents = await Promise.all(
        Object.entries(sampleTexts).map(async ([lang, content], index) => {
          const detection = await LanguageDetectionService.detectLanguageFromText(content);
          
          return {
            id: `demo-doc-${index}`,
            title: `${LanguageDetectionService.getLanguageName(lang)} AI Document`,
            language: lang,
            confidence: detection.confidence,
            content
          };
        })
      );
      
      setDemoDocuments(documents);
      
      // Generate mock language statistics
      const stats: LanguageStatistics[] = documents.map(doc => ({
        languageCode: doc.language,
        languageName: LanguageDetectionService.getLanguageName(doc.language),
        documentCount: 1,
        totalChunks: Math.floor(doc.content.length / 100),
        percentage: 100 / documents.length
      }));
      
      setLanguageStats(stats);
      
    } catch (error) {
      console.error('Failed to initialize demo data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (files: DocumentUploadRequest[]) => {
    setIsLoading(true);
    
    try {
      // Simulate upload processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Add uploaded files to demo documents
      const newDocuments = files.map((file, index) => ({
        id: `uploaded-${Date.now()}-${index}`,
        title: file.title || file.file.name,
        language: file.language || 'auto',
        confidence: 0.8,
        content: `Uploaded content from ${file.file.name}`
      }));
      
      setDemoDocuments(prev => [...prev, ...newDocuments]);
      
      console.log('Demo upload completed:', files);
      
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchResults = (results: SearchResult[]) => {
    setSearchResults(results);
  };

  const handleLanguageStats = (stats: LanguageStatistics[]) => {
    setLanguageStats(stats);
  };

  const handleDocumentClick = (documentId: string) => {
    const doc = demoDocuments.find(d => d.id === documentId);
    if (doc) {
      alert(`Opening document: ${doc.title}\nLanguage: ${doc.language}\nContent: ${doc.content.substring(0, 100)}...`);
    }
  };

  const performDemoSearch = async (query: string, language?: string) => {
    setIsLoading(true);
    
    try {
      // Simulate search with demo data
      const filteredDocs = demoDocuments.filter(doc => 
        !language || doc.language === language
      );
      
      const mockResults: SearchResult[] = filteredDocs.map((doc, index) => ({
        chunkId: `chunk-${doc.id}`,
        documentId: doc.id,
        documentTitle: doc.title,
        content: doc.content.substring(0, 200) + '...',
        similarity: 0.9 - (index * 0.1),
        sourceLanguage: doc.language,
        isTranslated: language && doc.language !== language,
        metadata: {}
      }));
      
      setSearchResults(mockResults);
      
    } catch (error) {
      console.error('Demo search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderLanguageOverview = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <BarChart3 className="h-5 w-5 mr-2" />
          Language Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {languageStats.map(stat => (
            <div key={stat.languageCode} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <LanguageDetectionIndicator
                  detectedLanguage={stat.languageCode}
                />
                <span className="text-sm font-medium">{stat.languageName}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>{stat.documentCount} docs</span>
                <Badge variant="outline">
                  {stat.percentage.toFixed(1)}%
                </Badge>
              </div>
            </div>
          ))}
        </div>
        
        {languageStats.length === 0 && (
          <p className="text-gray-500 text-center py-4">
            No documents uploaded yet
          </p>
        )}
      </CardContent>
    </Card>
  );

  const renderDemoDocuments = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="h-5 w-5 mr-2" />
          Demo Documents ({demoDocuments.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {demoDocuments.map(doc => (
            <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <FileText className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">{doc.title}</p>
                  <p className="text-xs text-gray-500">
                    {doc.content.substring(0, 50)}...
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <LanguageDetectionIndicator
                  detectedLanguage={doc.language}
                  confidence={doc.confidence}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDocumentClick(doc.id)}
                >
                  View
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderQuickSearchButtons = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Search className="h-5 w-5 mr-2" />
          Quick Search Examples
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={() => performDemoSearch('artificial intelligence', 'en')}
            disabled={isLoading}
            className="justify-start"
          >
            🇺🇸 "artificial intelligence"
          </Button>
          
          <Button
            variant="outline"
            onClick={() => performDemoSearch('인공지능', 'ko')}
            disabled={isLoading}
            className="justify-start"
          >
            🇰🇷 "인공지능"
          </Button>
          
          <Button
            variant="outline"
            onClick={() => performDemoSearch('人工知能', 'ja')}
            disabled={isLoading}
            className="justify-start"
          >
            🇯🇵 "人工知能"
          </Button>
          
          <Button
            variant="outline"
            onClick={() => performDemoSearch('machine learning')}
            disabled={isLoading}
            className="justify-start"
          >
            🌐 Cross-language search
          </Button>
        </div>
        
        {isLoading && (
          <div className="flex items-center justify-center mt-4">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm text-gray-500">Searching...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className={`multi-language-demo ${className}`}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
          <Globe className="h-6 w-6 mr-2" />
          Multi-Language Document Support Demo
        </h1>
        <p className="text-gray-600">
          Experience automatic language detection, multi-language search, and cross-language capabilities
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upload" className="flex items-center">
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="search" className="flex items-center">
            <Search className="h-4 w-4 mr-2" />
            Search
          </TabsTrigger>
          <TabsTrigger value="overview" className="flex items-center">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center">
            <Languages className="h-4 w-4 mr-2" />
            Features
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Upload documents in any supported language. The system will automatically detect the language and optimize processing accordingly.
            </AlertDescription>
          </Alert>

          <DocumentUploadWithLanguage
            onUpload={handleUpload}
            enableLanguageDetection={true}
            userId={userId}
            maxFiles={5}
          />

          {demoDocuments.length > 0 && renderDemoDocuments()}
        </TabsContent>

        <TabsContent value="search" className="space-y-6">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Search across documents in multiple languages. Enable cross-language search to find relevant content regardless of the query language.
            </AlertDescription>
          </Alert>

          <MultiLanguageSearchInterface
            onSearchResults={handleSearchResults}
            onLanguageStats={handleLanguageStats}
            userId={userId}
          />

          {renderQuickSearchButtons()}

          {searchResults.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Search Results ({searchResults.length})</h3>
              {searchResults.map(result => (
                <MultiLanguageSearchResult
                  key={result.chunkId}
                  result={result}
                  onDocumentClick={handleDocumentClick}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderLanguageOverview()}
            {renderDemoDocuments()}
          </div>
        </TabsContent>

        <TabsContent value="features" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="h-5 w-5 mr-2" />
                  Language Detection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Automatic language detection
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Manual language specification
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Confidence scoring
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    12+ supported languages
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Search className="h-5 w-5 mr-2" />
                  Multi-Language Search
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Language-specific search
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Cross-language queries
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Translation indicators
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Language filtering
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Languages className="h-5 w-5 mr-2" />
                  Supported Languages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {LanguageDetectionService.getSupportedLanguages().slice(0, 8).map(lang => (
                    <div key={lang.code} className="flex items-center space-x-2">
                      <LanguageDetectionIndicator detectedLanguage={lang.code} />
                      <span>{lang.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Analytics & Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Language distribution stats
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Search pattern analysis
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Translation quality metrics
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Usage recommendations
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MultiLanguageDemo;