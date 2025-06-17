
import { supabase } from '@/integrations/supabase/client';

export const processPDFFile = async (file: File, activityId: string): Promise<boolean> => {
  try {
    // PDF 파일을 임시로 읽어서 텍스트 URL로 변환 (실제로는 파일 업로드 서비스 사용)
    const fileUrl = URL.createObjectURL(file);
    
    // PDF 처리 함수 호출
    const { data, error } = await supabase.functions.invoke('process-pdf', {
      body: {
        pdfUrl: fileUrl,
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
