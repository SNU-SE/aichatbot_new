-- Activity document pipeline helpers and permission synchronization

-- Augment document_permissions for activity-managed entries
ALTER TABLE public.document_permissions
  ADD COLUMN IF NOT EXISTS activity_ids UUID[] DEFAULT ARRAY[]::UUID[];

ALTER TABLE public.document_permissions
  ADD COLUMN IF NOT EXISTS managed_by_activity BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_document_permissions_managed
  ON public.document_permissions(managed_by_activity)
  WHERE managed_by_activity = true;

CREATE INDEX IF NOT EXISTS idx_document_permissions_activity_ids
  ON public.document_permissions USING gin(activity_ids);

-- Upsert helper for activity_documents
CREATE OR REPLACE FUNCTION public.upsert_activity_document_link(
  p_activity_id UUID,
  p_document_id UUID,
  p_processing_status processing_status_enum DEFAULT 'uploading',
  p_processing_error TEXT DEFAULT NULL
)
RETURNS public.activity_documents
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result public.activity_documents;
BEGIN
  INSERT INTO public.activity_documents (
    activity_id,
    document_id,
    processing_status,
    processing_error
  )
  VALUES (p_activity_id, p_document_id, p_processing_status, p_processing_error)
  ON CONFLICT (activity_id, document_id)
  DO UPDATE SET
    processing_status = EXCLUDED.processing_status,
    processing_error = EXCLUDED.processing_error,
    updated_at = NOW()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.upsert_activity_document_link(UUID, UUID, processing_status_enum, TEXT)
  IS 'Creates or updates the mapping between an activity and a document while tracking processing status.';

-- Rebuild permissions for a single document across all linked activities
CREATE OR REPLACE FUNCTION public.rebuild_document_permissions_for_document(
  p_document_id UUID,
  p_granted_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_users UUID[] := ARRAY[]::UUID[];
  v_upserts INTEGER := 0;
  v_deleted INTEGER := 0;
BEGIN
  WITH activity_user_map AS (
    SELECT DISTINCT ad.activity_id, s.user_id
    FROM public.activity_documents ad
    JOIN public.students s ON s.user_id IS NOT NULL
    WHERE ad.document_id = p_document_id
      AND (
        NOT EXISTS (
          SELECT 1 FROM public.activity_class_assignments aca
          WHERE aca.activity_id = ad.activity_id
        )
        OR EXISTS (
          SELECT 1
          FROM public.activity_class_assignments aca
          WHERE aca.activity_id = ad.activity_id
            AND aca.class_name = s.class_name
        )
      )
  ), user_activity AS (
    SELECT user_id, ARRAY_AGG(DISTINCT activity_id) AS activity_ids
    FROM activity_user_map
    GROUP BY user_id
  ), upserted AS (
    INSERT INTO public.document_permissions (
      document_id,
      class_id,
      user_id,
      permission_level,
      granted_by,
      activity_ids,
      managed_by_activity
    )
    SELECT
      p_document_id,
      NULL,
      ua.user_id,
      'read'::public.access_level_enum,
      p_granted_by,
      ua.activity_ids,
      true
    FROM user_activity ua
    ON CONFLICT (document_id, class_id, user_id)
    DO UPDATE SET
      activity_ids = EXCLUDED.activity_ids,
      managed_by_activity = true,
      granted_by = COALESCE(public.document_permissions.granted_by, p_granted_by)
    RETURNING user_id
  )
  SELECT ARRAY_AGG(DISTINCT user_id), COUNT(*)
  INTO v_target_users, v_upserts
  FROM upserted;

  IF v_target_users IS NULL THEN
    v_target_users := ARRAY[]::UUID[];
  END IF;

  DELETE FROM public.document_permissions dp
  WHERE dp.document_id = p_document_id
    AND dp.managed_by_activity = true
    AND (
      array_length(v_target_users, 1) = 0
      OR dp.user_id IS NULL
      OR dp.user_id <> ALL(v_target_users)
    );

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN jsonb_build_object(
    'documentId', p_document_id,
    'upserts', COALESCE(v_upserts, 0),
    'deleted', v_deleted,
    'targetUserCount', array_length(v_target_users, 1)
  );
END;
$$;

COMMENT ON FUNCTION public.rebuild_document_permissions_for_document(UUID, UUID)
  IS 'Rebuilds managed permissions for a document using all linked activities and returns affected counts.';

-- Synchronize permissions for all documents tied to an activity
CREATE OR REPLACE FUNCTION public.sync_activity_document_permissions(
  p_activity_id UUID,
  p_granted_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB := '[]'::JSONB;
  v_summary JSONB := jsonb_build_object(
    'documentsProcessed', 0,
    'upserts', 0,
    'deleted', 0
  );
  v_doc RECORD;
  v_doc_result JSONB;
BEGIN
  FOR v_doc IN
    SELECT DISTINCT document_id
    FROM public.activity_documents
    WHERE activity_id = p_activity_id
  LOOP
    v_doc_result := public.rebuild_document_permissions_for_document(v_doc.document_id, p_granted_by);

    v_result := v_result || jsonb_build_array(v_doc_result);

    v_summary := v_summary || jsonb_build_object(
      'documentsProcessed', (v_summary->>'documentsProcessed')::INT + 1,
      'upserts', (v_summary->>'upserts')::INT + COALESCE((v_doc_result->>'upserts')::INT, 0),
      'deleted', (v_summary->>'deleted')::INT + COALESCE((v_doc_result->>'deleted')::INT, 0)
    );
  END LOOP;

  RETURN jsonb_build_object(
    'documents', v_result,
    'summary', v_summary
  );
END;
$$;

COMMENT ON FUNCTION public.sync_activity_document_permissions(UUID, UUID)
  IS 'Ensures document permissions reflect the current activity-class assignments and returns per-document metrics.';

-- Updated delete_activity_with_related_data to handle documents and permissions
CREATE OR REPLACE FUNCTION public.delete_activity_with_related_data(activity_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    result JSONB := '{}';
    chat_logs_count INT := 0;
    checklist_progress_count INT := 0;
    checklist_history_count INT := 0;
    document_chunks_count INT := 0;
    document_permissions_count INT := 0;
    documents_count INT := 0;
    activity_documents_count INT := 0;
    argumentation_responses_count INT := 0;
    peer_evaluations_count INT := 0;
    evaluation_reflections_count INT := 0;
    question_frequency_count INT := 0;
    checklist_items_count INT := 0;
    activity_modules_count INT := 0;
    storage_paths JSONB := '[]';
    document_ids UUID[] := ARRAY[]::UUID[];
BEGIN
    WITH doc_info AS (
      SELECT ad.document_id, d.file_path
      FROM public.activity_documents ad
      JOIN public.documents d ON d.id = ad.document_id
      WHERE ad.activity_id = activity_id_param
    )
    SELECT 
      COUNT(*),
      COALESCE(SUM(chunk_count), 0),
      COALESCE(SUM(perm_count), 0),
      jsonb_agg(file_path),
      ARRAY_AGG(DISTINCT document_id)
    INTO activity_documents_count, document_chunks_count, document_permissions_count, storage_paths, document_ids
    FROM (
      SELECT 
        di.document_id,
        (SELECT COUNT(*) FROM public.document_chunks dc WHERE dc.document_id = di.document_id) AS chunk_count,
        (SELECT COUNT(*) FROM public.document_permissions dp WHERE dp.document_id = di.document_id AND dp.managed_by_activity = true) AS perm_count,
        di.file_path
      FROM doc_info di
    ) stats;

    documents_count := COALESCE(activity_documents_count, 0);
    IF document_ids IS NULL THEN
      document_ids := ARRAY[]::UUID[];
    END IF;

    SELECT COUNT(*) INTO chat_logs_count FROM public.chat_logs WHERE activity_id = activity_id_param;
    SELECT COUNT(*) INTO checklist_progress_count FROM public.student_checklist_progress scp 
        JOIN public.checklist_items ci ON scp.checklist_item_id = ci.id 
        WHERE ci.activity_id = activity_id_param;
    SELECT COUNT(*) INTO checklist_history_count FROM public.checklist_completion_history WHERE activity_id = activity_id_param;
    SELECT COUNT(*) INTO argumentation_responses_count FROM public.argumentation_responses WHERE activity_id = activity_id_param;
    SELECT COUNT(*) INTO peer_evaluations_count FROM public.peer_evaluations WHERE activity_id = activity_id_param;
    SELECT COUNT(*) INTO evaluation_reflections_count FROM public.evaluation_reflections WHERE activity_id = activity_id_param;
    SELECT COUNT(*) INTO question_frequency_count FROM public.question_frequency WHERE activity_id = activity_id_param;
    SELECT COUNT(*) INTO checklist_items_count FROM public.checklist_items WHERE activity_id = activity_id_param;
    SELECT COUNT(*) INTO activity_modules_count FROM public.activity_modules WHERE activity_id = activity_id_param;

    -- Remove managed permissions first
    UPDATE public.document_permissions dp
    SET activity_ids = array_remove(dp.activity_ids, activity_id_param)
    WHERE dp.managed_by_activity = true
      AND activity_id_param = ANY(dp.activity_ids)
      AND dp.document_id = ANY(document_ids);

    DELETE FROM public.document_permissions dp
    WHERE dp.managed_by_activity = true
      AND COALESCE(array_length(dp.activity_ids, 1), 0) = 0
      AND dp.document_id = ANY(document_ids);

    -- Delete activity-document links
    DELETE FROM public.activity_documents
    WHERE activity_id = activity_id_param;

    -- Delete documents no longer referenced by other activities
    DELETE FROM public.documents d
    WHERE d.id = ANY(document_ids)
    AND NOT EXISTS (
      SELECT 1 FROM public.activity_documents ad WHERE ad.document_id = d.id
    );

    -- Delete remaining related data
    DELETE FROM public.student_checklist_progress WHERE checklist_item_id IN (
        SELECT id FROM public.checklist_items WHERE activity_id = activity_id_param
    );
    DELETE FROM public.checklist_completion_history WHERE activity_id = activity_id_param;
    DELETE FROM public.chat_logs WHERE activity_id = activity_id_param;
    DELETE FROM public.peer_evaluations WHERE activity_id = activity_id_param;
    DELETE FROM public.argumentation_responses WHERE activity_id = activity_id_param;
    DELETE FROM public.evaluation_reflections WHERE activity_id = activity_id_param;
    DELETE FROM public.question_frequency WHERE activity_id = activity_id_param;
    DELETE FROM public.checklist_items WHERE activity_id = activity_id_param;
    DELETE FROM public.activity_modules WHERE activity_id = activity_id_param;
    DELETE FROM public.activities WHERE id = activity_id_param;

    result := jsonb_build_object(
        'chat_logs', chat_logs_count,
        'checklist_progress', checklist_progress_count,
        'checklist_history', checklist_history_count,
        'document_chunks', COALESCE(document_chunks_count, 0),
        'document_permissions', COALESCE(document_permissions_count, 0),
        'documents', COALESCE(documents_count, 0),
        'activity_documents', COALESCE(activity_documents_count, 0),
        'argumentation_responses', argumentation_responses_count,
        'peer_evaluations', peer_evaluations_count,
        'evaluation_reflections', evaluation_reflections_count,
        'question_frequency', question_frequency_count,
        'checklist_items', checklist_items_count,
        'activity_modules', activity_modules_count,
        'storage_paths', COALESCE(storage_paths, '[]'::JSONB)
    );

    RETURN result;
END;
$$;

-- Updated data count helper
CREATE OR REPLACE FUNCTION public.get_activity_related_data_count(activity_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    result JSONB := '{}';
    chat_logs_count INT := 0;
    checklist_progress_count INT := 0;
    checklist_history_count INT := 0;
    document_chunks_count INT := 0;
    document_permissions_count INT := 0;
    documents_count INT := 0;
    activity_documents_count INT := 0;
    argumentation_responses_count INT := 0;
    peer_evaluations_count INT := 0;
    evaluation_reflections_count INT := 0;
    question_frequency_count INT := 0;
    checklist_items_count INT := 0;
    activity_modules_count INT := 0;
    storage_paths JSONB := '[]';
BEGIN
    WITH doc_info AS (
      SELECT ad.document_id, d.file_path
      FROM public.activity_documents ad
      JOIN public.documents d ON d.id = ad.document_id
      WHERE ad.activity_id = activity_id_param
    )
    SELECT 
      COUNT(*),
      COALESCE(SUM(chunk_count), 0),
      COALESCE(SUM(perm_count), 0),
      jsonb_agg(file_path)
    INTO activity_documents_count, document_chunks_count, document_permissions_count, storage_paths
    FROM (
      SELECT 
        di.document_id,
        (SELECT COUNT(*) FROM public.document_chunks dc WHERE dc.document_id = di.document_id) AS chunk_count,
        (SELECT COUNT(*) FROM public.document_permissions dp WHERE dp.document_id = di.document_id AND dp.managed_by_activity = true) AS perm_count,
        di.file_path
      FROM doc_info di
    ) stats;

    documents_count := COALESCE(activity_documents_count, 0);

    SELECT COUNT(*) INTO chat_logs_count FROM public.chat_logs WHERE activity_id = activity_id_param;
    SELECT COUNT(*) INTO checklist_progress_count FROM public.student_checklist_progress scp 
        JOIN public.checklist_items ci ON scp.checklist_item_id = ci.id 
        WHERE ci.activity_id = activity_id_param;
    SELECT COUNT(*) INTO checklist_history_count FROM public.checklist_completion_history WHERE activity_id = activity_id_param;
    SELECT COUNT(*) INTO argumentation_responses_count FROM public.argumentation_responses WHERE activity_id = activity_id_param;
    SELECT COUNT(*) INTO peer_evaluations_count FROM public.peer_evaluations WHERE activity_id = activity_id_param;
    SELECT COUNT(*) INTO evaluation_reflections_count FROM public.evaluation_reflections WHERE activity_id = activity_id_param;
    SELECT COUNT(*) INTO question_frequency_count FROM public.question_frequency WHERE activity_id = activity_id_param;
    SELECT COUNT(*) INTO checklist_items_count FROM public.checklist_items WHERE activity_id = activity_id_param;
    SELECT COUNT(*) INTO activity_modules_count FROM public.activity_modules WHERE activity_id = activity_id_param;

    result := jsonb_build_object(
        'chat_logs', chat_logs_count,
        'checklist_progress', checklist_progress_count,
        'checklist_history', checklist_history_count,
        'document_chunks', COALESCE(document_chunks_count, 0),
        'document_permissions', COALESCE(document_permissions_count, 0),
        'documents', COALESCE(documents_count, 0),
        'activity_documents', COALESCE(activity_documents_count, 0),
        'argumentation_responses', argumentation_responses_count,
        'peer_evaluations', peer_evaluations_count,
        'evaluation_reflections', evaluation_reflections_count,
        'question_frequency', question_frequency_count,
        'checklist_items', checklist_items_count,
        'activity_modules', activity_modules_count,
        'storage_paths', COALESCE(storage_paths, '[]'::JSONB)
    );

    RETURN result;
END;
$$;

-- Remove a single document from an activity
CREATE OR REPLACE FUNCTION public.remove_activity_document(
  p_activity_id UUID,
  p_document_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  storage_path TEXT;
  processing_status TEXT;
  remaining_links INT := 0;
BEGIN
  SELECT file_path INTO storage_path FROM public.documents WHERE id = p_document_id;

  IF storage_path IS NULL THEN
    RETURN jsonb_build_object('removed', false, 'reason', 'Document not found');
  END IF;

  UPDATE public.document_permissions dp
  SET activity_ids = array_remove(dp.activity_ids, p_activity_id)
  WHERE dp.document_id = p_document_id
    AND dp.managed_by_activity = true
    AND p_activity_id = ANY(dp.activity_ids);

  DELETE FROM public.document_permissions dp
  WHERE dp.document_id = p_document_id
    AND dp.managed_by_activity = true
    AND COALESCE(array_length(dp.activity_ids, 1), 0) = 0;

  DELETE FROM public.activity_documents
  WHERE activity_id = p_activity_id
    AND document_id = p_document_id;

  SELECT COUNT(*) INTO remaining_links
  FROM public.activity_documents
  WHERE document_id = p_document_id;

  IF remaining_links = 0 THEN
    DELETE FROM public.documents WHERE id = p_document_id;
  END IF;

  RETURN jsonb_build_object(
    'removed', true,
    'remainingLinks', remaining_links,
    'storagePath', storage_path
  );
END;
$$;
