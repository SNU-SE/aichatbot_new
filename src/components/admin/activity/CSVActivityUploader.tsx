
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
      '파일URL': 'https://example.com/water-experiment.pdf',
      '모듈정의': '준비 단계:실험 도구 준비하기;안전 수칙 확인하기|실험 진행:물 가열하기;온도 변화 관찰하기;결과 기록하기|결론 도출:데이터 분석하기;결론 작성하기',
      '체크리스트': ''
    },
    {
      '제목': '지구 온난화 토론',
      '유형': 'discussion',
      '파일URL': '',
      '모듈정의': '',
      '체크리스트': '자료 조사하기;의견 정리하기;토론 참여하기'
    },
    {
      '제목': '환경 보호 주장',
      '유형': 'argumentation',
      '파일URL': 'https://example.com/environment.pdf',
      '모듈정의': '',
      '체크리스트': '근거 수집하기;논리 구성하기;반박 예상하기;최종 주장 작성하기'
    }
  ];

  const csvExpectedHeaders = ['제목', '유형', '파일URL', '모듈정의', '체크리스트'];

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
            <li>• <strong>모듈정의</strong>: (실험 활동만) 모듈명:단계1;단계2|모듈명2:단계1;단계2 형식</li>
            <li>• <strong>체크리스트</strong>: (논증/토의 활동) 세미콜론(;)으로 구분된 체크리스트 항목들</li>
          </ul>
          <div className="mt-3 p-3 bg-blue-50 rounded">
            <h5 className="font-medium text-blue-800 mb-1">모듈정의 예시:</h5>
            <p className="text-xs text-blue-700">
              준비단계:도구준비;안전확인|실험진행:가열하기;관찰하기|결론:분석하기;작성하기
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CSVActivityUploader;
