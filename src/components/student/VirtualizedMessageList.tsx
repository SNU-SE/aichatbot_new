
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

const MessageItem = ({ index, style, data }: MessageItemProps) => {
  const msg = data[index];
  
  return (
    <div style={style}>
      <div
        className={`flex items-start space-x-3 p-4 ${
          msg.sender === 'student' ? 'flex-row-reverse space-x-reverse' : ''
        }`}
      >
        <div className={`p-2 rounded-full ${
          msg.sender === 'student' 
            ? 'bg-[rgb(15,15,112)] text-white' 
            : 'bg-gray-200 text-gray-700'
        }`}>
          {msg.sender === 'student' ? (
            <User className="h-4 w-4" />
          ) : (
            <Bot className="h-4 w-4" />
          )}
        </div>
        <div className={`flex-1 max-w-md ${
          msg.sender === 'student' ? 'text-right' : 'text-left'
        }`}>
          <div className={`p-3 rounded-lg ${
            msg.sender === 'student'
              ? 'bg-[rgb(15,15,112)] text-white ml-auto'
              : 'bg-gray-100 text-gray-900'
          }`}>
            <p className="whitespace-pre-wrap">{msg.message}</p>
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
      </div>
    </div>
  );
};

interface VirtualizedMessageListProps {
  messages: Message[];
  isLoading: boolean;
}

const VirtualizedMessageList = ({ messages, isLoading }: VirtualizedMessageListProps) => {
  const listRef = useRef<List>(null);
  
  const itemData = useMemo(() => messages, [messages]);
  
  // 동적 높이 계산 함수
  const getItemSize = (index: number) => {
    if (index === messages.length && isLoading) {
      return 80; // 로딩 인디케이터 높이
    }
    
    const msg = messages[index];
    if (!msg) return 120;
    
    // 기본 높이 (아바타 + 패딩)
    let height = 80;
    
    // 메시지 길이에 따른 높이 추가 (대략 20px per line)
    const lines = Math.ceil(msg.message.length / 50);
    height += lines * 20;
    
    // 파일이 있는 경우 추가 높이
    if (msg.file_url) {
      height += 60;
    }
    
    // 최소 높이 보장
    return Math.max(height, 100);
  };
  
  useEffect(() => {
    if (listRef.current && messages.length > 0) {
      listRef.current.scrollToItem(messages.length - 1, 'end');
    }
  }, [messages.length]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="text-center">
          <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">AI와 대화를 시작해보세요!</p>
          <p className="text-sm text-gray-500 mt-1">질문이나 의견을 자유롭게 말씀해주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-96 w-full">
      <List
        ref={listRef}
        height={384}
        width="100%"
        itemCount={messages.length + (isLoading ? 1 : 0)}
        itemSize={getItemSize}
        itemData={itemData}
        overscanCount={5}
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
