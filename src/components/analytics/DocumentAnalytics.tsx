import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { 
  FileText, 
  Eye, 
  MessageSquare, 
  Download, 
  Search,
  TrendingUp,
  Clock,
  Users
} from 'lucide-react';
import { format } from 'date-fns';

interface DocumentAnalyticsProps {
  data: any;
  dateRange: { from: Date; to: Date };
}

export const DocumentAnalytics: React.FC<DocumentAnalyticsProps> = ({ data, dateRange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'views' | 'references' | 'recent'>('views');

  if (!data) {
    return <div>Loading document analytics...</div>;
  }

  // Process document usage data
  const documentStats = data.documentUsage?.reduce((acc: any, usage: any) => {
    const docId = usage.document_id;
    if (!acc[docId]) {
      acc[docId] = {
        document_id: docId,
        title: usage.documents?.title || 'Unknown Document',
        filename: usage.documents?.filename || '',
        views: 0,
        chatReferences: 0,
        downloads: 0,
        lastAccessed: usage.timestamp,
        uniqueUsers: new Set()
      };
    }
    
    acc[docId].uniqueUsers.add(usage.user_id);
    
    switch (usage.action_type) {
      case 'view':
        acc[docId].views++;
        break;
      case 'chat_reference':
        acc[docId].chatReferences++;
        break;
      case 'download':
        acc[docId].downloads++;
        break;
    }
    
    if (new Date(usage.timestamp) > new Date(acc[docId].lastAccessed)) {
      acc[docId].lastAccessed = usage.timestamp;
    }
    
    return acc;
  }, {}) || {};

  // Convert to array and add calculated fields
  const documentList = Object.values(documentStats).map((doc: any) => ({
    ...doc,
    uniqueUsers: doc.uniqueUsers.size,
    totalInteractions: doc.views + doc.chatReferences + doc.downloads,
    engagementScore: (doc.views * 1) + (doc.chatReferences * 2) + (doc.downloads * 1.5)
  }));

  // Filter and sort documents
  const filteredDocs = documentList
    .filter((doc: any) => 
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.filename.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a: any, b: any) => {
      switch (sortBy) {
        case 'views':
          return b.totalInteractions - a.totalInteractions;
        case 'references':
          return b.chatReferences - a.chatReferences;
        case 'recent':
          return new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime();
        default:
          return 0;
      }
    });

  const maxEngagement = Math.max(...documentList.map((doc: any) => doc.engagementScore), 1);

  return (
    <div className="space-y-6">
      {/* Document Analytics Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Document Performance</h3>
          <p className="text-sm text-muted-foreground">
            Analyze how your documents are being used and engaged with
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
          
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="views">Sort by Total Interactions</option>
            <option value="references">Sort by Chat References</option>
            <option value="recent">Sort by Recent Activity</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documentList.length}</div>
            <p className="text-xs text-muted-foreground">
              Documents with activity
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {documentList.reduce((acc: number, doc: any) => acc + doc.views, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Document views
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chat References</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {documentList.reduce((acc: number, doc: any) => acc + doc.chatReferences, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Referenced in chats
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Engagement</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(documentList.reduce((acc: number, doc: any) => acc + doc.engagementScore, 0) / (documentList.length || 1))}
            </div>
            <p className="text-xs text-muted-foreground">
              Engagement score
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Document List */}
      <Card>
        <CardHeader>
          <CardTitle>Document Performance Details</CardTitle>
          <CardDescription>
            Detailed analytics for each document in your collection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredDocs.length > 0 ? (
              filteredDocs.map((doc: any) => (
                <div key={doc.document_id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{doc.title}</h4>
                      <p className="text-sm text-muted-foreground">{doc.filename}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">
                        Score: {Math.round(doc.engagementScore)}
                      </Badge>
                      <Badge variant="secondary">
                        {doc.totalInteractions} interactions
                      </Badge>
                    </div>
                  </div>

                  {/* Engagement Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Engagement Level</span>
                      <span>{Math.round((doc.engagementScore / maxEngagement) * 100)}%</span>
                    </div>
                    <Progress 
                      value={(doc.engagementScore / maxEngagement) * 100} 
                      className="h-2"
                    />
                  </div>

                  {/* Detailed Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <span>{doc.views} views</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <span>{doc.chatReferences} references</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Download className="h-4 w-4 text-muted-foreground" />
                      <span>{doc.downloads} downloads</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{doc.uniqueUsers} users</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{format(new Date(doc.lastAccessed), 'MMM dd')}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No documents found</h3>
                <p className="text-muted-foreground">
                  {searchTerm 
                    ? `No documents match "${searchTerm}"`
                    : "No document activity data available for this period"
                  }
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top Performers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Most Viewed Documents</CardTitle>
            <CardDescription>Documents with highest view counts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {documentList
                .sort((a: any, b: any) => b.views - a.views)
                .slice(0, 5)
                .map((doc: any, index: number) => (
                  <div key={doc.document_id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-semibold text-xs">
                        {index + 1}
                      </div>
                      <span className="font-medium text-sm truncate">{doc.title}</span>
                    </div>
                    <Badge variant="outline">{doc.views}</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most Referenced in Chat</CardTitle>
            <CardDescription>Documents frequently used in conversations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {documentList
                .sort((a: any, b: any) => b.chatReferences - a.chatReferences)
                .slice(0, 5)
                .map((doc: any, index: number) => (
                  <div key={doc.document_id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-semibold text-xs">
                        {index + 1}
                      </div>
                      <span className="font-medium text-sm truncate">{doc.title}</span>
                    </div>
                    <Badge variant="outline">{doc.chatReferences}</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};