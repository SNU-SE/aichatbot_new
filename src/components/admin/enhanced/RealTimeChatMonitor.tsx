
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, User, Bot, Search, Filter } from 'lucide-react';

interface ChatLog {
  id: string;
  student_id: string;
  activity_id: string | null;
  message: string;
  sender: string;
  timestamp: string;
}

interface Activity {
  id: string;
  title: string;
  type: string;
}

interface RealTimeChatMonitorProps {
  recentChats: ChatLog[];
  activities: Activity[];
}

const RealTimeChatMonitor = ({ recentChats, activities }: RealTimeChatMonitorProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSender, setSelectedSender] = useState('all');
  const [filteredChats, setFilteredChats] = useState(recentChats);

  useEffect(() => {
    let filtered = recentChats;
    
    if (searchTerm) {
      filtered = filtered.filter(chat => 
        chat.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chat.student_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedSender !== 'all') {
      filtered = filtered.filter(chat => chat.sender === selectedSender);
    }
    
    setFilteredChats(filtered);
  }, [recentChats, searchTerm, selectedSender]);

  const getActivityInfo = (activityId: string | null) => {
    if (!activityId) return { title: '일반 채팅', type: 'general' };
    const activity = activities.find(a => a.id === activityId);
    return activity ? { title: activity.title, type: activity.type } : { title: '알 수 없는 활동', type: 'unknown' };
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5" />
            <span>실시간 채팅 모니터링</span>
            <Badge variant="secondary">{filteredChats.length}</Badge>
          </CardTitle>
          <div className="flex space-x-2">
            <Button
              variant={selectedSender === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedSender('all')}
            >
              전체
            </Button>
            <Button
              variant={selectedSender === 'student' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedSender('student')}
            >
              학생
            </Button>
            <Button
              variant={selectedSender === 'bot' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedSender('bot')}
            >
              AI
            </Button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="메시지 내용이나 학번으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="space-y-3">
            {filteredChats.map((chat) => {
              const activityInfo = getActivityInfo(chat.activity_id);
              return (
                <div key={chat.id} className="flex space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className={`p-2 rounded-full flex-shrink-0 ${
                    chat.sender === 'student' 
                      ? 'bg-[rgb(15,15,112)] text-white' 
                      : 'bg-gray-200 text-gray-700'
                  }`}>
                    {chat.sender === 'student' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-sm">{chat.student_id}</span>
                      <Badge variant={chat.sender === 'student' ? 'default' : 'secondary'} className="text-xs">
                        {chat.sender === 'student' ? '학생' : 'AI'}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {activityInfo.title}
                      </Badge>
                      <span className="text-xs text-gray-500 ml-auto">
                        {formatTime(chat.timestamp)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-700 break-words">{chat.message}</p>
                  </div>
                </div>
              );
            })}
            
            {filteredChats.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>표시할 채팅이 없습니다.</p>
                <p className="text-sm mt-1">
                  {searchTerm || selectedSender !== 'all' 
                    ? '검색 조건을 확인해주세요.' 
                    : '학생들의 채팅이 여기에 실시간으로 표시됩니다.'
                  }
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default RealTimeChatMonitor;
