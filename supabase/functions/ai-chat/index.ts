
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, studentId, activityId } = await req.json();

    // Supabase 클라이언트 초기화
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // AI 설정 가져오기
    const { data: settings, error: settingsError } = await supabase
      .from('admin_settings')
      .select('*')
      .limit(1)
      .single();

    if (settingsError || !settings) {
      throw new Error('AI 설정을 불러올 수 없습니다.');
    }

    // 활동 정보 가져오기
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('*')
      .eq('id', activityId)
      .single();

    if (activityError || !activity) {
      throw new Error('활동 정보를 불러올 수 없습니다.');
    }

    // 이전 대화 기록 가져오기
    const { data: chatHistory, error: historyError } = await supabase
      .from('chat_logs')
      .select('*')
      .eq('student_id', studentId)
      .eq('activity_id', activityId)
      .order('timestamp', { ascending: true })
      .limit(10);

    if (historyError) {
      console.error('대화 기록 조회 오류:', historyError);
    }

    // 대화 기록을 메시지 형태로 변환
    const messages = [
      {
        role: 'system',
        content: `${settings.system_prompt}\n\n현재 활동: ${activity.title}\n활동 내용: ${JSON.stringify(activity.content)}`
      }
    ];

    // 이전 대화 추가
    if (chatHistory) {
      chatHistory.forEach(log => {
        messages.push({
          role: log.sender === 'student' ? 'user' : 'assistant',
          content: log.message
        });
      });
    }

    // 현재 메시지 추가
    messages.push({
      role: 'user',
      content: message
    });

    // API 키 확인
    const apiKey = settings.selected_provider === 'openai' 
      ? settings.openai_api_key 
      : settings.anthropic_api_key;

    if (!apiKey) {
      throw new Error('API 키가 설정되지 않았습니다.');
    }

    let aiResponse = '';

    if (settings.selected_provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: settings.selected_model || 'gpt-4o',
          messages: messages,
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(`OpenAI API 오류: ${data.error?.message || 'Unknown error'}`);
      }
      aiResponse = data.choices[0].message.content;
    } else if (settings.selected_provider === 'anthropic') {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: settings.selected_model || 'claude-3-5-sonnet-20241022',
          max_tokens: 1000,
          messages: messages.filter(m => m.role !== 'system'),
          system: messages.find(m => m.role === 'system')?.content,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(`Anthropic API 오류: ${data.error?.message || 'Unknown error'}`);
      }
      aiResponse = data.content[0].text;
    }

    // 학생 메시지 저장
    await supabase.from('chat_logs').insert({
      student_id: studentId,
      activity_id: activityId,
      sender: 'student',
      message: message,
    });

    // AI 응답 저장
    await supabase.from('chat_logs').insert({
      student_id: studentId,
      activity_id: activityId,
      sender: 'ai',
      message: aiResponse,
    });

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('AI 채팅 오류:', error);
    return new Response(JSON.stringify({ 
      error: error.message || '서버 오류가 발생했습니다.' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
