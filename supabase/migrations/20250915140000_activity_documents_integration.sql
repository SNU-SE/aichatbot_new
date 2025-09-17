-- Activity-specific document linkage for enhanced RAG
-- Creates join table between activities and documents with processing status tracking

-- Create activity_documents join table
CREATE TABLE IF NOT EXISTS public.activity_documents (
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  processing_status processing_status_enum DEFAULT 'uploading',
  processing_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (activity_id, document_id)
);

-- Helpful indexes for lookups
CREATE INDEX IF NOT EXISTS idx_activity_documents_activity
  ON public.activity_documents(activity_id);

CREATE INDEX IF NOT EXISTS idx_activity_documents_document
  ON public.activity_documents(document_id);

-- Ensure updated_at stays fresh
CREATE TRIGGER update_activity_documents_updated_at
  BEFORE UPDATE ON public.activity_documents
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.activity_documents ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users (admins) to manage mappings
CREATE POLICY "Admins manage activity documents"
ON public.activity_documents
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow authenticated readers to view completed links (students learn about processed docs)
CREATE POLICY "View completed activity documents"
ON public.activity_documents
FOR SELECT
TO authenticated
USING (
  processing_status = 'completed' OR public.has_role(auth.uid(), 'admin')
);

-- Optional convenience view for activity document listings
CREATE OR REPLACE VIEW public.activity_document_details AS
SELECT 
  ad.activity_id,
  ad.document_id,
  ad.processing_status,
  ad.processing_error,
  ad.created_at,
  ad.updated_at,
  d.title,
  d.filename,
  d.file_path,
  d.file_size,
  d.mime_type,
  d.processing_status AS document_processing_status,
  d.metadata
FROM public.activity_documents ad
JOIN public.documents d ON d.id = ad.document_id;

GRANT SELECT ON public.activity_document_details TO anon, authenticated;
