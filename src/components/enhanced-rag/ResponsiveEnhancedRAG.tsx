/**
 * Responsive Enhanced RAG Component
 * Main component that switches between desktop and mobile layouts based on screen size
 */

import React, { useState, useEffect } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { MobileLayout, useMobileNavigation } from './MobileLayout';
import { MobileChatInterface } from './MobileChatInterface';
import { MobileDocumentUpload } from './MobileDocumentUpload';
import { MobileDocumentList } from './MobileDocumentList';
import { EnhancedChatInterface } from './EnhancedChatInterface';
import { DocumentUpload } from './DocumentUpload';
import { DocumentList } from './DocumentList';
import { DocumentManagement } from './DocumentManagement';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageSquare, 
  Upload, 
  FolderOpen, 
  Search,
  Settings,
  Plus
} from 'lucide-react';
import { Document, DocumentFolder, DocumentUploadRequest } from '@/types/enhanced-rag';
import { cn } from '@/lib/utils';

// ============================================================================
// INTERFACES
// ============================================================================

export interface ResponsiveEnhancedRAGProps {
  documents?: Document[];
  folders?: DocumentFolder[];
  onDocumentUpload?: (files: DocumentUploadRequest[]) => Promise<void>;
  onDocumentAction?: (action: string, documentId: string) => void;
  onBulkAction?: (action: string, documentIds: string[]) => void;
  className?: string;
}

// ============================================================================
// MOBILE VIEW TYPES
// ============================================================================

type MobileView = 'chat' | 'upload' | 'documents' | 'search' | 'settings';

// ============================================================================
// MOBILE NAVIGATION ITEMS
// ============================================================================

const getMobileNavigationItems = (documentsCount: number = 0) => [
  {
    id: 'chat',
    label: 'Chat',
    icon: <MessageSquare className="h-5 w-5" />,
  },
  {
    id: 'upload',
    label: 'Upload',
    icon: <Upload className="h-5 w-5" />,
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: <FolderOpen className="h-5 w-5" />,
    badge: documentsCount > 0 ? documentsCount : undefined,
  },
  {
    id: 'search',
    label: 'Search',
    icon: <Search className="h-5 w-5" />,
  },
];

// ============================================================================
// DESKTOP LAYOUT COMPONENT
// ============================================================================

interface DesktopLayoutProps {
  documents: Document[];
  folders: DocumentFolder[];
  onDocumentUpload: (files: DocumentUploadRequest[]) => Promise<void>;
  onDocumentAction: (action: string, documentId: string) => void;
  onBulkAction: (action: string, documentIds: string[]) => void;
}

const DesktopLayout: React.FC<DesktopLayoutProps> = ({
  documents,
  folders,
  onDocumentUpload,
  onDocumentAction,
  onBulkAction
}) => {
  const [activeTab, setActiveTab] = useState('chat');
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);

  const handleDocumentSelect = (documentId: string) => {
    setSelectedDocuments(prev => 
      prev.includes(documentId)
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  };

  const handleDocumentSelectAll = (selected: boolean) => {
    setSelectedDocuments(selected ? documents.map(doc => doc.id) : []);
  };

  return (
    <div className="h-screen bg-background">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <div className="border-b bg-card px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Enhanced RAG System</h1>
              <p className="text-muted-foreground">
                AI-powered document chat with advanced search capabilities
              </p>
            </div>
          </div>
          
          <TabsList className="grid w-full grid-cols-4 max-w-md">
            <TabsTrigger value="chat" className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4" />
              <span>Chat</span>
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center space-x-2">
              <Upload className="h-4 w-4" />
              <span>Upload</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center space-x-2">
              <FolderOpen className="h-4 w-4" />
              <span>Documents</span>
            </TabsTrigger>
            <TabsTrigger value="management" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Manage</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="chat" className="h-full m-0">
            <EnhancedChatInterface
              availableDocuments={documents}
              className="h-full"
            />
          </TabsContent>

          <TabsContent value="upload" className="h-full m-0 p-6">
            <div className="max-w-4xl mx-auto">
              <DocumentUpload
                onUpload={onDocumentUpload}
                maxFiles={10}
              />
            </div>
          </TabsContent>

          <TabsContent value="documents" className="h-full m-0 p-6">
            <div className="max-w-6xl mx-auto">
              <DocumentList
                documents={documents}
                folders={folders}
                selectedDocuments={selectedDocuments}
                onDocumentSelect={handleDocumentSelect}
                onDocumentSelectAll={handleDocumentSelectAll}
                onDocumentAction={onDocumentAction}
                onBulkAction={onBulkAction}
              />
            </div>
          </TabsContent>

          <TabsContent value="management" className="h-full m-0 p-6">
            <div className="max-w-6xl mx-auto">
              <DocumentManagement
                documents={documents}
                folders={folders}
                onDocumentAction={onDocumentAction}
                onBulkAction={onBulkAction}
              />
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

// ============================================================================
// MOBILE LAYOUT COMPONENT
// ============================================================================

interface MobileLayoutComponentProps {
  documents: Document[];
  folders: DocumentFolder[];
  onDocumentUpload: (files: DocumentUploadRequest[]) => Promise<void>;
  onDocumentAction: (action: string, documentId: string) => void;
  onBulkAction: (action: string, documentIds: string[]) => void;
}

const MobileLayoutComponent: React.FC<MobileLayoutComponentProps> = ({
  documents,
  folders,
  onDocumentUpload,
  onDocumentAction,
  onBulkAction
}) => {
  const { currentView, navigateTo, goBack, canGoBack } = useMobileNavigation();
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);

  const navigationItems = getMobileNavigationItems(documents.length);

  const handleDocumentSelect = (documentId: string) => {
    setSelectedDocuments(prev => 
      prev.includes(documentId)
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  };

  const handleDocumentSelectAll = (selected: boolean) => {
    setSelectedDocuments(selected ? documents.map(doc => doc.id) : []);
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'chat':
        return (
          <MobileChatInterface
            availableDocuments={documents}
            onBack={canGoBack ? goBack : undefined}
          />
        );
      
      case 'upload':
        return (
          <MobileDocumentUpload
            onUpload={onDocumentUpload}
            maxFiles={10}
            onBack={canGoBack ? goBack : undefined}
          />
        );
      
      case 'documents':
        return (
          <MobileDocumentList
            documents={documents}
            folders={folders}
            selectedDocuments={selectedDocuments}
            onDocumentSelect={handleDocumentSelect}
            onDocumentSelectAll={handleDocumentSelectAll}
            onDocumentAction={onDocumentAction}
            onBulkAction={onBulkAction}
            onBack={canGoBack ? goBack : undefined}
          />
        );
      
      case 'search':
        return (
          <MobileLayout
            title="Search"
            subtitle="Search across all documents"
            showBackButton={canGoBack}
            onBack={goBack}
          >
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <div className="text-lg font-medium text-muted-foreground mb-2">
                  Advanced Search
                </div>
                <div className="text-sm text-muted-foreground">
                  Coming soon...
                </div>
              </div>
            </div>
          </MobileLayout>
        );
      
      default:
        return (
          <MobileLayout
            title="Enhanced RAG"
            navigationItems={navigationItems}
            currentView={currentView}
            onViewChange={navigateTo}
          >
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <div className="text-lg font-medium text-muted-foreground mb-2">
                  Welcome to Enhanced RAG
                </div>
                <div className="text-sm text-muted-foreground mb-4">
                  AI-powered document chat system
                </div>
                <Button onClick={() => navigateTo('chat')}>
                  Start Chatting
                </Button>
              </div>
            </div>
          </MobileLayout>
        );
    }
  };

  return (
    <div className="h-screen bg-background">
      {currentView === 'chat' || currentView === 'upload' || currentView === 'documents' || currentView === 'search' ? (
        renderCurrentView()
      ) : (
        <MobileLayout
          title="Enhanced RAG"
          navigationItems={navigationItems}
          currentView={currentView}
          onViewChange={navigateTo}
        >
          {renderCurrentView()}
        </MobileLayout>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ResponsiveEnhancedRAG: React.FC<ResponsiveEnhancedRAGProps> = ({
  documents = [],
  folders = [],
  onDocumentUpload = async () => {},
  onDocumentAction = () => {},
  onBulkAction = () => {},
  className = ''
}) => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on the client side before rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Don't render until we're on the client to avoid hydration mismatch
  if (!isClient) {
    return (
      <div className={cn("h-screen bg-background flex items-center justify-center", className)}>
        <div className="text-center">
          <div className="text-lg font-medium text-muted-foreground">
            Loading Enhanced RAG System...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("h-screen bg-background", className)}>
      {isMobile ? (
        <MobileLayoutComponent
          documents={documents}
          folders={folders}
          onDocumentUpload={onDocumentUpload}
          onDocumentAction={onDocumentAction}
          onBulkAction={onBulkAction}
        />
      ) : (
        <DesktopLayout
          documents={documents}
          folders={folders}
          onDocumentUpload={onDocumentUpload}
          onDocumentAction={onDocumentAction}
          onBulkAction={onBulkAction}
        />
      )}
    </div>
  );
};

export default ResponsiveEnhancedRAG;