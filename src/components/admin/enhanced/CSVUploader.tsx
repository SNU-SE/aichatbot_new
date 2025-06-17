
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, FileText, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { parseCSV } from '@/utils/csvUtils';

interface CSVUploaderProps {
  onDataParsed: (data: any[]) => void;
  expectedHeaders: string[];
  templateData?: any[];
  title: string;
}

const CSVUploader = ({ onDataParsed, expectedHeaders, templateData, title }: CSVUploaderProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
    } else {
      toast({
        title: "오류",
        description: "CSV 파일만 업로드 가능합니다.",
        variant: "destructive"
      });
    }
  };

  const processFile = async () => {
    if (!file) return;

    setIsProcessing(true);
    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      
      if (parsed.length === 0) {
        throw new Error('빈 파일입니다.');
      }

      const headers = parsed[0];
      const data = parsed.slice(1);

      // 헤더 검증
      const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        throw new Error(`필수 컬럼이 누락되었습니다: ${missingHeaders.join(', ')}`);
      }

      // 데이터 변환
      const transformedData = data.map(row => {
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[header] = row[index] || '';
        });
        return obj;
      });

      onDataParsed(transformedData);
      toast({
        title: "성공",
        description: `${transformedData.length}개의 항목이 파싱되었습니다.`
      });
    } catch (error: any) {
      toast({
        title: "파싱 오류",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTemplate = () => {
    if (!templateData || templateData.length === 0) {
      // 빈 템플릿 생성
      const csvContent = expectedHeaders.join(',') + '\n';
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${title}_template.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Card className="border-dashed border-2 border-gray-300">
      <CardContent className="pt-4">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <Upload className="h-12 w-12 text-gray-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium">{title} CSV 업로드</h3>
            <p className="text-sm text-gray-500 mt-1">
              필수 컬럼: {expectedHeaders.join(', ')}
            </p>
          </div>
          
          {!file ? (
            <div className="space-y-2">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload">
                <Button variant="outline" className="cursor-pointer" asChild>
                  <span>
                    <FileText className="h-4 w-4 mr-2" />
                    CSV 파일 선택
                  </span>
                </Button>
              </label>
              <div>
                <Button variant="ghost" size="sm" onClick={downloadTemplate}>
                  템플릿 다운로드
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-center space-x-2">
                <FileText className="h-4 w-4 text-green-600" />
                <span className="text-sm">{file.name}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setFile(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Button
                onClick={processFile}
                disabled={isProcessing}
                className="bg-[rgb(15,15,112)] hover:bg-[rgb(15,15,112)]/90"
              >
                {isProcessing ? '처리 중...' : '파일 처리'}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CSVUploader;
