
import { FileText, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isImageFile } from '@/utils/fileUpload';

interface MessageFileProps {
  fileUrl: string;
  fileName: string | null;
  fileType: string | null;
}

const MessageFile = ({ fileUrl, fileName, fileType }: MessageFileProps) => {
  if (!fileUrl) return null;

  const handleDownload = () => {
    window.open(fileUrl, '_blank');
  };

  if (fileType && isImageFile(fileType)) {
    return (
      <div className="mt-2">
        <img
          src={fileUrl}
          alt={fileName || '업로드된 이미지'}
          className="max-w-xs rounded-lg cursor-pointer hover:opacity-90"
          onClick={handleDownload}
        />
        {fileName && (
          <p className="text-xs text-gray-500 mt-1">{fileName}</p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-2 p-3 border rounded-lg bg-gray-50 max-w-xs">
      <div className="flex items-center space-x-2">
        <FileText className="h-4 w-4 text-gray-500" />
        <span className="text-sm text-gray-700 truncate flex-1">
          {fileName || '파일'}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownload}
          className="h-6 w-6 p-0"
        >
          <ExternalLink className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

export default MessageFile;
