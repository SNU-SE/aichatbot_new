
import { X, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isImageFile } from '@/utils/fileUpload';

interface FilePreviewProps {
  file: File;
  onRemove: () => void;
}

const FilePreview = ({ file, onRemove }: FilePreviewProps) => {
  const fileUrl = URL.createObjectURL(file);

  return (
    <div className="relative border rounded-lg p-2 bg-gray-50">
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="absolute -top-2 -right-2 h-6 w-6 p-0 bg-red-500 text-white rounded-full hover:bg-red-600"
      >
        <X className="h-3 w-3" />
      </Button>
      
      {isImageFile(file.type) ? (
        <img
          src={fileUrl}
          alt={file.name}
          className="w-20 h-20 object-cover rounded"
        />
      ) : (
        <div className="w-20 h-20 flex items-center justify-center bg-gray-200 rounded">
          <FileText className="h-8 w-8 text-gray-500" />
        </div>
      )}
      
      <p className="text-xs mt-1 truncate">{file.name}</p>
    </div>
  );
};

export default FilePreview;
