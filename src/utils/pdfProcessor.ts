
import { supabase } from '@/integrations/supabase/client';

export const processPDFFile = async (file: File, activityId: string): Promise<boolean> => {
  try {
    // 1) 파일을 Supabase Storage에 업로드하고 공개 URL 획득
    const ext = file.name.split('.').pop() || 'pdf';
    const safeId = activityId || 'unknown';
    const fileName = (globalThis.crypto && 'randomUUID' in globalThis.crypto)
      ? (globalThis.crypto as any).randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const filePath = `pdf-processing/${safeId}/${fileName}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('chat-files')
      .upload(filePath, file, { contentType: file.type || 'application/pdf', upsert: true });

    if (uploadError) {
      console.error('PDF 업로드 오류:', uploadError);
      return false;
    }

    const { data: publicData } = supabase.storage
      .from('chat-files')
      .getPublicUrl(filePath);

    const publicUrl = publicData?.publicUrl;
    if (!publicUrl) {
      console.error('공개 URL을 가져오지 못했습니다.');
      return false;
    }

    // 2) Edge Function 호출 (공개 URL 전달)
    const { data, error } = await supabase.functions.invoke('process-pdf', {
      body: {
        pdfUrl: publicUrl,
        activityId: activityId
      }
    });

    if (error) {
      console.error('PDF 처리 오류:', error);
      return false;
    }

    if (data?.error) {
      console.error('PDF 처리 함수 오류:', data.error);
      return false;
    }

    console.log('PDF 처리 완료:', data);
    return true;
  } catch (error) {
    console.error('PDF 처리 중 오류:', error);
    return false;
  }
};

export const isPDFFile = (file: File): boolean => {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
};
