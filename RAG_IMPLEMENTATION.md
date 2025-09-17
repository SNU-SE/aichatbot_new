# RAG Integration Plan for Activity-Coupled PDF Uploads

## Intent
We want administrators to attach one or more PDF files *directly* within the "수업 활동 관리" workflow. The PDFs must be ingested immediately into the enhanced RAG pipeline so that, whenever RAG is enabled for a class, the student chat experience pulls contextual answers from those activity-specific documents first. URLs are no longer used; every upload must go through our storage + embedding stack using OpenAI's `text-embedding-3-small` (API key already stored as a Supabase function secret).

## Required Behaviours & Technical Guarantees

1. **Admin UX**
   - Activity creation/edit modal supports multiple PDF uploads (drag-drop or file picker).
   - Each file shows progress, status, and a way to remove/replace during the edit session.
   - Existing attachments render with metadata and delete controls.

2. **Storage & Processing**
   - Files are stored in a dedicated Supabase storage bucket (e.g., `activity-files`).
   - Upon successful upload, we immediately kick off the document processing pipeline:
     - Create an entry in `documents` with metadata tied to the activity.
     - Trigger embedding generation using `text-embedding-3-small` via our Edge Function.
     - Persist generated embeddings in `document_chunks`.
   - Maintain an `activity_documents` join table linking `activities` to newly created `documents` (one activity → N documents).
   - Reflect deletes/updates by cleaning up storage, `documents`, `document_chunks`, `activity_documents`, and permissions.

3. **Permissions**
   - Automatically add class/user permissions for uploaded documents so only students in the selected classes (or all, when "전체") can access the RAG context.
   - On activity edit where class assignments change, propagate updates to `document_permissions`.

4. **Student Chat**
   - When `rag_enabled` is true for a class, `ai-chat` function must constrain the RAG query to documents linked via `activity_documents` for the current `activityId`.
   - Fallback: if no activity-specific documents exist or the search returns no hits, we can optionally fall back to general doc search (future enhancement; out of scope unless explicitly needed).

5. **Telemetry & Retry**
   - Expose processing status to the admin interface for transparency (queued, processing, completed, failed).
   - Provide a manual reprocess action if embedding fails.

## Code Adjustments (Skeleton)

Below is *pseudo-diff* guidance. Real code will be produced task-by-task.

1. **Database & Storage**
   ```sql
   -- New join table
   CREATE TABLE activity_documents (
     activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
     document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
     PRIMARY KEY (activity_id, document_id)
   );

   -- Optional: status flag for processing completion per attachment
   ALTER TABLE activity_documents ADD COLUMN processing_status TEXT DEFAULT 'pending';
   ```

2. **Edge Functions**
   - Extend existing `process-pdf` (or create new `process-activity-pdf`) to accept `activityId` and automatically create the `activity_documents` row + permissions.
   - Ensure the function reads the OpenAI key from secrets and uses `text-embedding-3-small`.

3. **Admin Frontend**
   - Replace `file_url` field with an uploader component integrated with Supabase Storage + reuses `documentProcessingService`.
   - After each successful upload, call a new backend API (Edge Function) that:
     1. Stores file metadata (`documents` row with `activityId`).
     2. Triggers processing (embedding).
   - Display processing status / errors via Realtime or polling (`document_processing_service` can expose hooks).

4. **Permissions Sync**
   - Hook into activity save to call a service (e.g., `syncActivityDocumentPermissions(activityId, classIds)`) that sets `document_permissions` accordingly.

5. **RAG Search**
   - Update `rag-search` Edge Function to accept `activityId` and filter `accessibleDocs` by an inner join with `activity_documents` when the parameter is provided.
   - Ensure the `ai-chat` function passes `activityId` in the request body.

6. **Cleanup**
   - When removing a PDF in the admin UI or deleting an activity, ensure the pipeline removes:
     - storage object (`activity-files/<activity>/<uuid>.pdf`),
     - `documents` row,
     - `document_chunks` entries,
     - `activity_documents` row,
     - `document_permissions` row(s).

## Implementation Tasks

1. **Schema & Secrets**
   - [x] SQL migration for `activity_documents` table and related indexes.
   - [x] Ensure storage bucket policies allow admin uploads & student read (already configured, but double-check).

2. **Edge Function Enhancements**
   - [x] Extend or create function `process-activity-document`:
     - Inputs: `activityId`, `filePath`, `fileName`, `classAssignments`.
     - Side effects: create `documents` row, trigger embeddings, update `activity_documents`, maintain permissions.
   - [x] Adjust `rag-search` to filter by `activityId`.
   - [x] Confirm `ai-chat` passes `activityId` and merges retrieved chunks into prompt.

3. **Frontend Integration**
   - [x] Update `ActivityForm` component to:
     - Render multi-file uploader.
     - Show upload progress + processed status (pull from backend via polling/Realtime).
     - Manage removal / reorder.
   - [x] Call new API endpoint for each upload (preferably using React Query for loading states & caching).
   - [x] Replace existing `file_url` usage throughout (types, list view, etc.).

4. **Permissions Sync Utility**
   - [x] Implement service (frontend or server) to synchronize `document_permissions` whenever class assignments change.
   - [x] Ensure migrations or triggers convert old activities to new linking table (if needed).

5. **Student Experience Validation**
   - [x] Verify `ai-chat` path uses the new document context when RAG enabled and produces references.
   - [x] Keep fallback behaviour when RAG disabled.

6. **Testing & Documentation**
   - [ ] Write integration tests (Edge Functions) ensuring the pipeline stores docs, creates embeddings, and `rag-search` respects new filters.
   - [ ] Update user/admin docs to describe the new workflow.

## Notes & Assumptions

- OpenAI API key for embeddings remains COM stored under `OPENAI_API_KEY` in function secrets.
- Embedding model `text-embedding-3-small` is chosen for cost/performance; keep vector dimension `1536` in DB schema.
- Existing document management UI remains intact; activity uploads will simply create additional documents that appear there (optional toggle/filter to show "Activity-linked" documents may be a future enhancement).
- We will prune `activities.file_url` column once migration + data backfill are complete.
- Processing may take a few seconds; the admin UI should show status so users don’t close the modal prematurely.
- Future idea: allow fallback search across all class documents if no activity-specific results exist.

---

This document serves as the blueprint. Each task above will produce concrete diffs and testing artefacts to make the RAG-enabled activity flow a first-class experience.
