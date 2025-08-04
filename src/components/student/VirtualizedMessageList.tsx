
import { useMemo, useRef, useEffect } from 'react';
import { VariableSizeList as List } from 'react-window';
import { Bot, User } from 'lucide-react';
import MessageFile from './MessageFile';

interface Message {
  id: string;
  sender: 'student' | 'bot';
  message: string;
  timestamp: string;
  file_url?: string | null;
  file_name?: string | null;
  file_type?: string | null;
}

interface MessageItemProps {
  index: number;
  style: any;
  data: Message[];
}

// 마크다운 제거 함수
const removeMarkdown = (text: string): string => {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')  // **굵은 글씨** 제거
    .replace(/\*(.*?)\*/g, '$1')      // *기울임* 제거
    .replace(/~~(.*?)~~/g, '$1')      // ~~취소선~~ 제거
    .replace(/`(.*?)`/g, '$1')        // `코드` 제거
    .replace(/#{1,6}\s+/g, '')        // # 제목 제거
    .replace(/^\s*[\*\-\+]\s+/gm, '') // 리스트 마커 제거
    .replace(/^\s*\d+\.\s+/gm, '')    // 번호 리스트 마커 제거
};

const MessageItem = ({ index, style, data }: MessageItemProps) => {
  const msg = data[index];
  
  return (
    <div style={style}>
      <div className="flex items-start p-4 gap-3">
        {msg.sender === 'student' ? (
          // 학생 메시지 (오른쪽 정렬)
          <>
            <div className="flex-1 min-w-0" />
            <div className="flex flex-col items-end w-full max-w-[70%]">
              <div className="p-3 rounded-lg bg-[rgb(15,15,112)] text-white w-full">
                <p className="whitespace-pre-wrap break-words leading-6 text-sm">{removeMarkdown(msg.message)}</p>
                <MessageFile 
                  fileUrl={msg.file_url || ''}
                  fileName={msg.file_name}
                  fileType={msg.file_type}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(msg.timestamp).toLocaleTimeString('ko-KR')}
              </p>
            </div>
            <div className="p-2 rounded-full bg-[rgb(15,15,112)] text-white flex-shrink-0">
              <User className="h-4 w-4" />
            </div>
          </>
        ) : (
          // AI 메시지 (왼쪽 정렬)
          <>
            <div className="p-2 rounded-full bg-gray-200 text-gray-700 flex-shrink-0">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex flex-col w-full max-w-[70%]">
              <div className="p-3 rounded-lg bg-gray-100 text-gray-900 w-full">
                <p className="whitespace-pre-wrap break-words leading-6 text-sm">{removeMarkdown(msg.message)}</p>
                <MessageFile 
                  fileUrl={msg.file_url || ''}
                  fileName={msg.file_name}
                  fileType={msg.file_type}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(msg.timestamp).toLocaleTimeString('ko-KR')}
              </p>
            </div>
            <div className="flex-1 min-w-0" />
          </>
        )}
      </div>
    </div>
  );
};

interface VirtualizedMessageListProps {
  messages: Message[];
  isLoading: boolean;
  height?: number;
}

const VirtualizedMessageList = ({ messages, isLoading, height = 400 }: VirtualizedMessageListProps) => {
  const listRef = useRef<List>(null);
  
  const itemData = useMemo(() => messages, [messages]);
  
  // 정밀한 높이 계산 함수
  const getItemSize = (index: number) => {
    if (index === messages.length && isLoading) {
      return 80; // 로딩 인디케이터 높이
    }
    
    const msg = messages[index];
    if (!msg) return 120;
    
    // 기본 높이 (아바타 + 패딩 + 타임스탬프)
    let height = 100;
    
    // 텍스트 영역의 실제 크기 계산
    const cleanText = removeMarkdown(msg.message);
    const avgCharWidth = 12; // 평균 문자 너비 (한글 포함)
    const maxCharsPerLine = Math.floor(350 / avgCharWidth); // 최대 350px 컨테이너 기준
    const actualLines = Math.ceil(cleanText.length / maxCharsPerLine);
    
    // 줄바꿈 문자를 고려한 추가 줄 계산
    const newlineCount = (cleanText.match(/\n/g) || []).length;
    const totalLines = Math.max(actualLines, newlineCount + 1);
    
    // 라인 높이: 24px (line-height 1.5 * 16px font-size)
    height += totalLines * 24;
    
    // 패딩 고려 (메시지 박스 내부 패딩)
    height += 24; // p-3 = 12px * 2
    
    // 파일이 있는 경우 추가 높이
    if (msg.file_url) {
      height += 80; // 파일 컴포넌트 높이
    }
    
    // 메시지 간 여백
    height += 16;
    
    // 최소 높이 보장 및 안전 마진
    return Math.max(height, 120) + 10;
  };
  
  useEffect(() => {
    if (listRef.current && messages.length > 0) {
      // 높이 재계산 강제 실행
      listRef.current.resetAfterIndex(0);
      
      // 약간의 지연 후 스크롤 (렌더링 완료 대기)
      setTimeout(() => {
        listRef.current?.scrollToItem(messages.length - 1, 'end');
      }, 50);
    }
  }, [messages.length]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ height: height }}>
        <div className="text-center">
          <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">AI와 대화를 시작해보세요!</p>
          <p className="text-sm text-gray-500 mt-1">질문이나 의견을 자유롭게 말씀해주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height: height }}>
      <List
        ref={listRef}
        height={height}
        width="100%"
        itemCount={messages.length + (isLoading ? 1 : 0)}
        itemSize={getItemSize}
        itemData={itemData}
        overscanCount={3}
      >
        {({ index, style }) => {
          if (index === messages.length && isLoading) {
            return (
              <div style={style}>
                <div className="flex items-start space-x-3 p-4">
                  <div className="p-2 rounded-full bg-gray-200 text-gray-700">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="flex-1 max-w-md">
                    <div className="p-3 rounded-lg bg-gray-100">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }
          return <MessageItem index={index} style={style} data={itemData} />;
        }}
      </List>
    </div>
  );
};

export default VirtualizedMessageList;
