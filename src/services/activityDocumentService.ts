import { supabase } from '@/integrations/supabase/client';
import { ProcessingResult, ChunkingConfig } from '@/services/documentProcessingService';

const ACTIVITY_FILES_BUCKET = import.meta.env.VITE_ACTIVITY_FILES_BUCKET ?? 'activity-files';

export interface UploadActivityDocumentOptions {
  assignedClasses?: string[];
  chunkingConfig?: ChunkingConfig;
}

export interface ActivityDocumentUploadResult {
  documentId: string;
  activityId: string;
  storagePath: string;
  bucket: string;
  processing: ProcessingResult;
}

export interface ActivityDocumentRecord {
  activityId: string;
  documentId: string;
  processingStatus: string;
  processingError?: string | null;
  createdAt: string;
  updatedAt: string;
  title: string;
  filename: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  metadata: Record<string, unknown> | null;
  documentProcessingStatus?: string;
}

class ActivityDocumentService {
  async listActivityDocuments(activityId: string): Promise<ActivityDocumentRecord[]> {
    const { data, error } = await supabase
      .from('activity_document_details')
      .select('*')
      .eq('activity_id', activityId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to load activity documents', error);
      throw new Error('활동에 연결된 문서를 불러오는데 실패했습니다.');
    }

    return (data || []).map((row: any) => ({
      activityId: row.activity_id,
      documentId: row.document_id,
      processingStatus: row.processing_status,
      processingError: row.processing_error,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      title: row.title,
      filename: row.filename,
      filePath: row.file_path,
      fileSize: row.file_size,
      mimeType: row.mime_type,
      metadata: row.metadata,
      documentProcessingStatus: row.document_processing_status,
    }));
  }

  async uploadAndProcess(
    file: File,
    activityId: string,
    options: UploadActivityDocumentOptions = {}
  ): Promise<ActivityDocumentUploadResult> {
    const extension = this.getFileExtension(file.name) ?? 'pdf';
    const generatedName = crypto.randomUUID();
    const storagePath = `${activityId}/${generatedName}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(ACTIVITY_FILES_BUCKET)
      .upload(storagePath, file, {
        contentType: file.type || 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      console.error('Activity document upload failed', uploadError);
      throw new Error('문서를 업로드하지 못했습니다.');
    }

    try {
      const { data, error } = await supabase.functions.invoke('process-activity-document', {
        body: {
          activityId,
          storagePath,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || 'application/pdf',
          assignedClasses: options.assignedClasses,
          chunkingConfig: options.chunkingConfig,
          bucket: ACTIVITY_FILES_BUCKET,
        }
      });

      if (error) {
        throw error;
      }

      if (!data?.documentId) {
        throw new Error('문서 처리 함수가 유효한 응답을 반환하지 않았습니다.');
      }

      const processingResult = data.processing as ProcessingResult | undefined;

      if (!processingResult) {
        throw new Error('문서 처리 결과를 확인할 수 없습니다.');
      }

      return {
        documentId: data.documentId,
        activityId,
        storagePath,
        bucket: ACTIVITY_FILES_BUCKET,
        processing: processingResult,
      };
    } catch (error) {
      console.error('Activity document processing failed', error);
      await supabase.storage.from(ACTIVITY_FILES_BUCKET).remove([storagePath]);
      throw new Error('문서를 처리하지 못했습니다. 다시 시도해주세요.');
    }
  }

  async removeActivityDocument(activityId: string, documentId: string): Promise<void> {
    const { data, error } = await supabase.rpc('remove_activity_document', {
      p_activity_id: activityId,
      p_document_id: documentId,
    });

    if (error) {
      console.error('Failed to remove activity document', error);
      throw new Error('문서를 삭제하지 못했습니다.');
    }

    const remainingLinks = data?.remainingLinks as number | undefined;
    const storagePath = data?.storagePath as string | undefined;

    if (storagePath && (!remainingLinks || remainingLinks === 0)) {
      const [bucket, ...pathParts] = storagePath.split('/');
      const objectPath = pathParts.join('/');

      if (bucket && objectPath) {
        await supabase.storage.from(bucket).remove([objectPath]);
      } else if (objectPath) {
        await supabase.storage.from(ACTIVITY_FILES_BUCKET).remove([objectPath]);
      }
    }
  }

  private getFileExtension(fileName: string): string | null {
    const parts = fileName.split('.');
    if (parts.length < 2) return null;
    return parts.pop()?.toLowerCase() ?? null;
  }
}

export const activityDocumentService = new ActivityDocumentService();
