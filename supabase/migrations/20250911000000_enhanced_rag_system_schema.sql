-- Enhanced RAG System Database Schema
-- This migration creates the enhanced database schema for the RAG system
-- including documents, chunks, folders, permissions, and enhanced chat logs

-- Enable the vector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create enums for the enhanced RAG system
CREATE TYPE processing_status_enum AS ENUM (
  'uploading',
  'extracting', 
  'chunking',
  'embedding',
  'completed',
  'failed'
);

CREATE TYPE access_level_enum AS ENUM (
  'read',
  'write',
  'admin'
);

CREATE TYPE message_role_enum AS ENUM (
  'user',
  'assistant',
  'system'
);

-- Create document_folders table for organizing documents
DROP TABLE IF EXISTS document_chunks CASCADE;

CREATE TABLE document_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES document_folders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name, parent_id)
);

-- Create documents table for enhanced document management
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  language TEXT DEFAULT 'auto',
  processing_status processing_status_enum DEFAULT 'uploading',
  folder_id UUID REFERENCES document_folders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Constraints
  CONSTRAINT valid_file_size CHECK (file_size > 0 AND file_size <= 52428800), -- 50MB max
  CONSTRAINT valid_mime_type CHECK (mime_type IN ('application/pdf'))
);

-- Create enhanced document_chunks table with vector embeddings
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  page_number INTEGER,
  position_start INTEGER,
  position_end INTEGER,
  embedding vector(1536), -- OpenAI embedding dimension
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_chunk_index CHECK (chunk_index >= 0),
  CONSTRAINT valid_page_number CHECK (page_number IS NULL OR page_number > 0),
  CONSTRAINT valid_positions CHECK (
    (position_start IS NULL AND position_end IS NULL) OR 
    (position_start IS NOT NULL AND position_end IS NOT NULL AND position_start <= position_end)
  )
);

-- Create document_permissions table for access control
CREATE TABLE document_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  class_id UUID, -- References classes table (assuming it exists)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_level access_level_enum DEFAULT 'read',
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure either class_id or user_id is specified, but not both
  CONSTRAINT permission_target_check CHECK (
    (class_id IS NOT NULL AND user_id IS NULL) OR 
    (class_id IS NULL AND user_id IS NOT NULL)
  ),
  
  -- Unique constraint to prevent duplicate permissions
  UNIQUE(document_id, class_id, user_id)
);

-- Create enhanced_chat_logs table for improved chat functionality
CREATE TABLE enhanced_chat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  message TEXT NOT NULL,
  role message_role_enum NOT NULL,
  document_references JSONB DEFAULT '[]'::jsonb,
  confidence_score DECIMAL(3,2),
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_confidence_score CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),
  CONSTRAINT valid_processing_time CHECK (processing_time_ms IS NULL OR processing_time_ms >= 0)
);

-- Create indexes for optimal performance

-- Documents table indexes
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_status ON documents(processing_status);
CREATE INDEX idx_documents_folder ON documents(folder_id);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX idx_documents_title_search ON documents USING gin(to_tsvector('english', title));

-- Document chunks indexes
CREATE INDEX idx_chunks_document ON document_chunks(document_id);
CREATE INDEX idx_chunks_page ON document_chunks(document_id, page_number);
CREATE INDEX idx_chunks_content_search ON document_chunks USING gin(to_tsvector('english', content));

-- Vector similarity search index (using ivfflat for cosine similarity)
CREATE INDEX idx_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Document folders indexes
CREATE INDEX idx_folders_user_id ON document_folders(user_id);
CREATE INDEX idx_folders_parent ON document_folders(parent_id);

-- Document permissions indexes
CREATE INDEX idx_permissions_document ON document_permissions(document_id);
CREATE INDEX idx_permissions_class ON document_permissions(class_id);
CREATE INDEX idx_permissions_user ON document_permissions(user_id);

-- Enhanced chat logs indexes
CREATE INDEX idx_chat_logs_user_session ON enhanced_chat_logs(user_id, session_id);
CREATE INDEX idx_chat_logs_created ON enhanced_chat_logs(created_at DESC);
CREATE INDEX idx_chat_logs_role ON enhanced_chat_logs(role);

-- Create Row Level Security (RLS) policies

-- Enable RLS on all tables
ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE enhanced_chat_logs ENABLE ROW LEVEL SECURITY;

-- Document folders RLS policies
CREATE POLICY "Users can view their own folders" ON document_folders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own folders" ON document_folders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders" ON document_folders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders" ON document_folders
  FOR DELETE USING (auth.uid() = user_id);

-- Documents RLS policies
CREATE POLICY "Users can view their own documents" ON documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view documents they have permission to access" ON documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM document_permissions dp
      WHERE dp.document_id = documents.id
      AND dp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own documents" ON documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" ON documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents" ON documents
  FOR DELETE USING (auth.uid() = user_id);

-- Document chunks RLS policies
CREATE POLICY "Users can view chunks of accessible documents" ON document_chunks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_chunks.document_id
      AND (
        d.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM document_permissions dp
          WHERE dp.document_id = d.id
          AND dp.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can create chunks for their own documents" ON document_chunks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_chunks.document_id
      AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update chunks of their own documents" ON document_chunks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_chunks.document_id
      AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete chunks of their own documents" ON document_chunks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_chunks.document_id
      AND d.user_id = auth.uid()
    )
  );

-- Document permissions RLS policies
CREATE POLICY "Users can view permissions for their own documents" ON document_permissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_permissions.document_id
      AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create permissions for their own documents" ON document_permissions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_permissions.document_id
      AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update permissions for their own documents" ON document_permissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_permissions.document_id
      AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete permissions for their own documents" ON document_permissions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_permissions.document_id
      AND d.user_id = auth.uid()
    )
  );

-- Enhanced chat logs RLS policies
CREATE POLICY "Users can view their own chat logs" ON enhanced_chat_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chat logs" ON enhanced_chat_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat logs" ON enhanced_chat_logs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat logs" ON enhanced_chat_logs
  FOR DELETE USING (auth.uid() = user_id);

-- Create helpful functions for the enhanced RAG system

-- Function to search documents with vector similarity
CREATE OR REPLACE FUNCTION search_documents_with_vector(
  query_embedding vector(1536),
  user_accessible_docs UUID[] DEFAULT NULL,
  similarity_threshold FLOAT DEFAULT 0.7,
  max_results INTEGER DEFAULT 10
)
RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  document_title TEXT,
  content TEXT,
  page_number INTEGER,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.id,
    dc.document_id,
    d.title,
    dc.content,
    dc.page_number,
    1 - (dc.embedding <=> query_embedding) as similarity
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  WHERE 
    d.processing_status = 'completed'
    AND (user_accessible_docs IS NULL OR d.id = ANY(user_accessible_docs))
    AND 1 - (dc.embedding <=> query_embedding) > similarity_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user accessible documents
CREATE OR REPLACE FUNCTION get_user_accessible_documents(target_user_id UUID)
RETURNS UUID[] AS $$
DECLARE
  accessible_docs UUID[];
BEGIN
  SELECT ARRAY_AGG(DISTINCT d.id)
  INTO accessible_docs
  FROM documents d
  LEFT JOIN document_permissions dp ON d.id = dp.document_id
  WHERE 
    d.user_id = target_user_id OR
    dp.user_id = target_user_id OR
    (dp.class_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM students s 
      WHERE s.user_id = target_user_id 
      AND s.class_name = (
        SELECT class_name FROM students 
        WHERE user_id = target_user_id 
        LIMIT 1
      )
    ));
  
  RETURN COALESCE(accessible_docs, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update document processing status
CREATE OR REPLACE FUNCTION update_document_processing_status(
  doc_id UUID,
  new_status processing_status_enum,
  processing_metadata JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE documents 
  SET 
    processing_status = new_status,
    updated_at = NOW(),
    processed_at = CASE WHEN new_status = 'completed' THEN NOW() ELSE processed_at END,
    metadata = CASE WHEN processing_metadata IS NOT NULL THEN metadata || processing_metadata ELSE metadata END
  WHERE id = doc_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers to relevant tables
CREATE TRIGGER update_document_folders_updated_at
  BEFORE UPDATE ON document_folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_permissions_updated_at
  BEFORE UPDATE ON document_permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE documents IS 'Enhanced documents table for RAG system with processing status and metadata';
COMMENT ON TABLE document_chunks IS 'Document chunks with vector embeddings for semantic search';
COMMENT ON TABLE document_folders IS 'Hierarchical folder structure for document organization';
COMMENT ON TABLE document_permissions IS 'Access control for documents at user and class level';
COMMENT ON TABLE enhanced_chat_logs IS 'Enhanced chat logs with document references and confidence scores';

COMMENT ON FUNCTION search_documents_with_vector IS 'Performs vector similarity search across document chunks';
COMMENT ON FUNCTION get_user_accessible_documents IS 'Returns array of document IDs accessible to a user';
COMMENT ON FUNCTION update_document_processing_status IS 'Updates document processing status with metadata';
