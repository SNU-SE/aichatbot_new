
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  message: string;
  studentId: string;
  activityId: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  motherTongue?: string;
  isTranslationRequest?: boolean;
  translationModel?: string;
  conversationHistory?: Array<{role: string; content: string}>;
}

// UTF-8 안전한 해시 생성 함수
const generateSafeHash = (text: string): string => {
  const normalized = text.toLowerCase().replace(/[^\w\s가-힣]/g, '').replace(/\s+/g, ' ').trim();
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32bit integer로 변환
  }
  return Math.abs(hash).toString(16);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { message, studentId, activityId, fileUrl, fileName, fileType, motherTongue, isTranslationRequest, translationModel, conversationHistory } = await req.json() as ChatRequest;

    console.log('AI Chat Request:', { 
      message: message?.substring(0, 100) + '...', 
      studentId, 
      activityId, 
      motherTongue,
      isTranslationRequest
    });

    if (!message || !studentId) {
      throw new Error('Message and studentId are required');
    }

    let systemPrompt = '';
    let selectedModel = 'gpt-4o';
    let selectedProvider = 'openai';
    let ragEnabled = false;

    // Get student info for class name
    const { data: studentData } = await supabase
      .from('students')
      .select('class_name')
      .eq('student_id', studentId)
      .single();

    const className = studentData?.class_name;

    if (!isTranslationRequest) {
      // Get AI settings (class-specific first, then global)
      let settingsData = null;
      
      if (className) {
        const { data: classSettings } = await supabase
          .from('class_prompt_settings')
          .select('*')
          .eq('class_name', className)
          .single();
        
        if (classSettings) {
          settingsData = classSettings;
        }
      }
      
      if (!settingsData) {
        const { data: globalSettings } = await supabase
          .from('admin_settings')
          .select('*')
          .single();
        
        settingsData = globalSettings;
      }

      if (settingsData) {
        systemPrompt = settingsData.system_prompt || '학생의 질문에 직접적으로 답을 하지 말고, 그 답이 나오기까지 필요한 최소한의 정보를 제공해. 단계별로 학생들이 생각하고 질문할 수 있도록 유도해줘.';
        selectedModel = settingsData.selected_model || 'gpt-4o';
        selectedProvider = settingsData.selected_provider || 'openai';
        ragEnabled = settingsData.rag_enabled || false;
      }
    } else {
      // For translation requests, use simple translation prompt
      systemPrompt = 'You are a translation assistant. Translate the given text accurately.';
      selectedModel = translationModel || 'gpt-4o-mini-2024-07-18';
    }

    // Handle multilingual support
    const isMultilingual = motherTongue && motherTongue !== 'Korean';
    
    if (isMultilingual && !isTranslationRequest) {
      const languageMap: { [key: string]: string } = {
        'Chinese': '중국어',
        'English': '영어', 
        'Japanese': '일본어',
        'Russian': '러시아어'
      };
      
      const nativeLanguageName = languageMap[motherTongue] || motherTongue;
      
      systemPrompt += `\n\n중요: 이 학생의 모국어는 ${nativeLanguageName}입니다. 모든 답변은 다음 형식으로 제공해주세요:
1. 먼저 ${nativeLanguageName}로 답변
2. 그 다음 "/"를 구분자로 하여 한국어로 같은 내용을 답변

예시 형식:
[${nativeLanguageName} 답변] / [한국어 답변]`;
    }

    let enhancedMessage = message;
    
    // RAG search if enabled and not a translation request
    if (ragEnabled && activityId && !isTranslationRequest) {
      try {
        const { data: ragData, error: ragError } = await supabase.functions.invoke('rag-search', {
          body: { 
            query: message,
            activityId: activityId
          }
        });
        
        if (!ragError && ragData?.results && ragData.results.length > 0) {
          const contextInfo = ragData.results
            .map((result: any) => result.chunk_text)
            .join('\n\n');
          
          enhancedMessage = `Context from activity materials:
${contextInfo}

Student question: ${message}`;
        }
      } catch (ragError) {
        console.error('RAG search error:', ragError);
      }
    }

    // Call appropriate AI service
    let aiResponse = '';
    
    if (selectedProvider === 'openai') {
      const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
      if (!openaiApiKey) {
        throw new Error('OpenAI API key not configured');
      }

      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { role: 'system', content: systemPrompt },
            ...(conversationHistory || []),
            { role: 'user', content: enhancedMessage }
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const openaiData = await openaiResponse.json();
      aiResponse = openaiData.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
      
    } else if (selectedProvider === 'anthropic') {
      const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
      if (!anthropicApiKey) {
        throw new Error('Anthropic API key not configured');
      }

      const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${anthropicApiKey}`,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: selectedModel,
          max_tokens: 1000,
          messages: [
            { 
              role: 'user', 
              content: `${systemPrompt}\n\nConversation History:\n${conversationHistory?.map(msg => `${msg.role}: ${msg.content}`).join('\n') || 'No previous conversation'}\n\nUser: ${enhancedMessage}` 
            }
          ],
        }),
      });

      if (!anthropicResponse.ok) {
        const errorData = await anthropicResponse.json();
        throw new Error(`Anthropic API error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const anthropicData = await anthropicResponse.json();
      aiResponse = anthropicData.content[0]?.text || 'Sorry, I could not generate a response.';
    }

    // For translation requests, return only the response
    if (isTranslationRequest) {
      return new Response(JSON.stringify({ response: aiResponse }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 트랜잭션으로 안전하게 메시지 저장
    const studentMessageData = {
      student_id: studentId,
      activity_id: activityId,
      sender: 'student',
      message: message,
      file_url: fileUrl || null,
      file_name: fileName || null,
      file_type: fileType || null,
      timestamp: new Date().toISOString(),
    };

    const aiMessageData = {
      student_id: studentId,
      activity_id: activityId,
      sender: 'bot',
      message: aiResponse,
      timestamp: new Date().toISOString(),
    };

    // 중복 체크 후 안전하게 저장
    try {
      // 학생 메시지 저장
      await supabase.from('chat_logs').insert([studentMessageData]);
      
      // AI 응답 중복 체크 (메시지 내용과 최근 시간 기준)
      const { data: existingAiResponse } = await supabase
        .from('chat_logs')
        .select('id')
        .eq('student_id', studentId)
        .eq('activity_id', activityId)
        .eq('sender', 'bot')
        .eq('message', aiResponse)
        .gte('timestamp', new Date(Date.now() - 10000).toISOString()) // 10초 내 중복 확인
        .maybeSingle();

      if (!existingAiResponse) {
        await supabase.from('chat_logs').insert([aiMessageData]);
      }
    } catch (insertError) {
      console.error('Error saving messages:', insertError);
      // 중복 제약조건 위반 시 무시하고 계속 진행
    }

    // Track question frequency with safe hash generation
    const questionHash = generateSafeHash(message);
    
    const { data: existingQuestion } = await supabase
      .from('question_frequency')
      .select('*')
      .eq('question_hash', questionHash)
      .eq('student_id', studentId)
      .eq('activity_id', activityId)
      .single();

    if (existingQuestion) {
      await supabase
        .from('question_frequency')
        .update({
          count: existingQuestion.count + 1,
          last_asked: new Date().toISOString()
        })
        .eq('id', existingQuestion.id);
    } else {
      await supabase
        .from('question_frequency')
        .insert({
          student_id: studentId,
          activity_id: activityId,
          question_text: message,
          question_hash: questionHash,
          count: 1
        });
    }

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('AI Chat Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An error occurred while processing your request.' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
