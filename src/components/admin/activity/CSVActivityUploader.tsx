
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X } from 'lucide-react';
import CSVUploader from '@/components/admin/enhanced/CSVUploader';

interface CSVActivityUploaderProps {
  onClose: () => void;
  onDataParsed: (csvData: any[]) => Promise<void>;
}

const CSVActivityUploader = ({ onClose, onDataParsed }: CSVActivityUploaderProps) => {
  const csvTemplateData = [
    {
      '제목': '물의 상태 변화 실험',
      '유형': 'experiment',
      '파일URL': 'https://example.com/file.pdf',
      '체크리스트': '실험 준비하기;온도 측정하기;결과 기록하기'
    }
  ];

  const csvExpectedHeaders = ['제목', '유형', '파일URL', '체크리스트'];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          활동 CSV 일괄 등록
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <CSVUploader
          onDataParsed={onDataParsed}
          expectedHeaders={csvExpectedHeaders}
          templateData={csvTemplateData}
          title="활동"
        />
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">CSV 파일 형식 안내:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• <strong>제목</strong>: 활동 제목</li>
            <li>• <strong>유형</strong>: experiment, argumentation, discussion 중 하나</li>
            <li>• <strong>파일URL</strong>: 관련 파일 URL (선택사항)</li>
            <li>• <strong>체크리스트</strong>: 세미콜론(;)으로 구분된 체크리스트 항목들</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default CSVActivityUploader;
