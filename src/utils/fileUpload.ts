
import { supabase } from '@/integrations/supabase/client';
import { securityService } from '@/services/securityService';

export const uploadFile = async (file: File, studentId: string): Promise<string> => {
  // Basic security validation
  const validation = securityService.validateFileUpload({
    name: file.name,
    size: file.size,
    type: file.type || 'application/octet-stream',
  } as any);
  if (!validation.isValid) {
    const reason = validation.errors?.map(e => e.message).join(', ') || 'Invalid file';
    throw new Error(`파일 유효성 검사 실패: ${reason}`);
  }

  const fileExt = file.name.split('.').pop();
  const uuid = (globalThis.crypto && 'randomUUID' in globalThis.crypto)
    ? (globalThis.crypto as any).randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const fileName = `${uuid}.${fileExt}`;
  const filePath = `${studentId}/${fileName}`;

  const { data, error } = await supabase.storage
    .from('chat-files')
    .upload(filePath, file, { contentType: file.type || 'application/octet-stream', upsert: true });

  if (error) {
    throw new Error('파일 업로드에 실패했습니다.');
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('chat-files')
    .getPublicUrl(filePath);

  if (!urlData?.publicUrl) {
    throw new Error('파일 공개 URL을 가져오지 못했습니다.');
  }

  return urlData.publicUrl;
};

export const isImageFile = (fileType: string): boolean => {
  return fileType.startsWith('image/');
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
