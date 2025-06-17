
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 질문 해시 생성 함수
function generateQuestionHash(question: string): string {
  const normalized = question
    .toLowerCase()
    .replace(/[^\w\s가-힣]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString(16);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, studentId, activityId, fileUrl, fileName, fileType } = await req.json()
    
    console.log('Received request:', { studentId, activityId, messageLength: message?.length })

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get OpenAI and Anthropic API keys from environment variables
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')

    if (!openaiApiKey && !anthropicApiKey) {
      throw new Error('API 키가 설정되지 않았습니다. 관리자에게 문의하세요.')
    }

    // Get student info to determine class
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('class_name')
      .eq('student_id', studentId)
      .single()

    if (studentError) {
      console.error('Student lookup error:', studentError)
      throw new Error('학생 정보를 찾을 수 없습니다.')
    }

    // Get class-specific settings
    const { data: classSettings, error: classError } = await supabase
      .from('class_prompt_settings')
      .select('*')
      .eq('class_name', student.class_name)
      .single()

    // Get global admin settings as fallback
    const { data: globalSettings, error: globalError } = await supabase
      .from('admin_settings')
      .select('*')
      .single()

    if (globalError) {
      console.error('Global settings error:', globalError)
      throw new Error('시스템 설정을 불러올 수 없습니다.')
    }

    // Determine which settings to use
    const useClassSettings = classSettings && (classSettings.selected_provider || classSettings.selected_model)
    const selectedProvider = useClassSettings ? 
      (classSettings.selected_provider || globalSettings.selected_provider || 'openai') : 
      (globalSettings.selected_provider || 'openai')
    
    const selectedModel = useClassSettings ? 
      (classSettings.selected_model || globalSettings.selected_model || 'gpt-4o') : 
      (globalSettings.selected_model || 'gpt-4o')

    const ragEnabled = useClassSettings ? 
      (classSettings.rag_enabled !== null ? classSettings.rag_enabled : globalSettings.rag_enabled) :
      (globalSettings.rag_enabled || false)

    // Track question frequency for RAG logic
    const questionHash = generateQuestionHash(message)
    
    // Check if this question has been asked before
    const { data: existingQuestion, error: questionError } = await supabase
      .from('question_frequency')
      .select('*')
      .eq('student_id', studentId)
      .eq('activity_id', activityId)
      .eq('question_hash', questionHash)
      .single()

    let questionCount = 1
    let useRAG = false
    let useCombined = false

    if (existingQuestion) {
      questionCount = existingQuestion.count + 1
      
      // Update count
      await supabase
        .from('question_frequency')
        .update({ 
          count: questionCount, 
          last_asked: new Date().toISOString(),
          question_text: message
        })
        .eq('id', existingQuestion.id)
    } else {
      // Insert new question
      await supabase
        .from('question_frequency')
        .insert({
          student_id: studentId,
          activity_id: activityId,
          question_hash: questionHash,
          question_text: message,
          count: 1
        })
    }

    // Determine response strategy based on question count and RAG settings
    if (ragEnabled && questionCount >= 2) {
      useRAG = true
      useCombined = questionCount >= 3
    }

    // Get activity context
    const { data: activity } = await supabase
      .from('activities')
      .select('*')
      .eq('id', activityId)
      .single()

    // Get recent chat history for context
    const { data: chatHistory } = await supabase
      .from('chat_logs')
      .select('*')
      .eq('student_id', studentId)
      .eq('activity_id', activityId)
      .order('timestamp', { ascending: true })
      .limit(10)

    // Get active prompt template for the class
    let systemPrompt = globalSettings.system_prompt || '학생의 질문에 직접적으로 답을 하지 말고, 그 답이 나오기까지 필요한 최소한의 정보를 제공해. 단계별로 학생들이 생각하고 질문할 수 있도록 유도해줘.'
    
    if (classSettings?.active_prompt_id) {
      const { data: activeTemplate } = await supabase
        .from('prompt_templates')
        .select('prompt')
        .eq('id', classSettings.active_prompt_id)
        .single()
      
      if (activeTemplate) {
        systemPrompt = activeTemplate.prompt
      }
    } else if (classSettings?.system_prompt) {
      systemPrompt = classSettings.system_prompt
    }

    // Prepare context for AI
    let contextMessage = `활동: ${activity?.title || '알 수 없음'}\n`
    if (activity?.content?.description) {
      contextMessage += `설명: ${activity.content.description}\n`
    }

    // RAG context if enabled and applicable
    let ragContext = ''
    if (useRAG) {
      try {
        const ragResponse = await fetch(`${supabaseUrl}/functions/v1/rag-search`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: message,
            activityId: activityId
          })
        })

        const ragData = await ragResponse.json()
        
        if (ragData.success && ragData.relevantChunks.length > 0) {
          ragContext = '\n관련 문서 내용:\n'
          ragData.relevantChunks.forEach((chunk: any, index: number) => {
            ragContext += `${index + 1}. ${chunk.text}\n`
          })
          
          if (useCombined) {
            ragContext += '\n위 문서 내용을 참고하되, 추가적인 생성형 정보도 함께 제공해주세요.\n'
          } else {
            ragContext += '\n위 문서 내용을 바탕으로 답변해주세요.\n'
          }
        }
      } catch (ragError) {
        console.error('RAG search error:', ragError)
        // RAG 실패 시 일반 응답으로 진행
      }
    }
    
    // Add file context if file was uploaded
    if (fileUrl && fileName) {
      if (fileType?.startsWith('image/')) {
        contextMessage += `\n학생이 이미지 파일을 업로드했습니다: ${fileName}\n`
        contextMessage += `이미지에 대해 질문하거나 설명을 요청할 수 있도록 도와주세요.\n`
      } else {
        contextMessage += `\n학생이 파일을 업로드했습니다: ${fileName} (${fileType})\n`
        contextMessage += `파일과 관련된 질문이나 도움을 요청할 수 있도록 안내해주세요.\n`
      }
    }

    contextMessage += `\n최근 대화 내용:\n`
    chatHistory?.forEach(chat => {
      contextMessage += `${chat.sender === 'student' ? '학생' : 'AI'}: ${chat.message}\n`
    })

    // Add RAG context
    contextMessage += ragContext

    // Add question frequency info for transparency
    if (questionCount > 1) {
      contextMessage += `\n참고: 이 질문은 ${questionCount}번째 질문입니다.`
      if (useRAG && !useCombined) {
        contextMessage += ' 문서 기반 답변을 제공합니다.'
      } else if (useCombined) {
        contextMessage += ' 문서 기반 답변과 추가 정보를 함께 제공합니다.'
      }
      contextMessage += '\n'
    }

    // Save student message to database first
    const studentMessageData: any = {
      student_id: studentId,
      activity_id: activityId,
      message: message,
      sender: 'student',
      timestamp: new Date().toISOString()
    }

    // Add file information if provided
    if (fileUrl) {
      studentMessageData.file_url = fileUrl
      studentMessageData.file_name = fileName
      studentMessageData.file_type = fileType
    }

    const { error: insertError } = await supabase
      .from('chat_logs')
      .insert(studentMessageData)

    if (insertError) {
      console.error('Error saving student message:', insertError)
      throw new Error('메시지 저장에 실패했습니다.')
    }

    let aiResponse: string

    if (selectedProvider === 'anthropic' && anthropicApiKey) {
      // Call Anthropic API
      const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicApiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: selectedModel,
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: `${systemPrompt}\n\n${contextMessage}\n\n현재 학생 메시지: ${message}`
            }
          ],
          temperature: 0.7,
        }),
      })

      if (!anthropicResponse.ok) {
        const error = await anthropicResponse.text()
        console.error('Anthropic API error:', error)
        throw new Error(`Anthropic API 오류: ${anthropicResponse.status}`)
      }

      const anthropicData = await anthropicResponse.json()
      aiResponse = anthropicData.content[0]?.text

      if (!aiResponse) {
        throw new Error('Anthropic AI 응답을 받을 수 없습니다.')
      }
    } else if (openaiApiKey) {
      // Call OpenAI API
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: `${contextMessage}\n\n현재 학생 메시지: ${message}`
            }
          ],
          max_tokens: 1000,
          temperature: 0.7,
        }),
      })

      if (!openaiResponse.ok) {
        const error = await openaiResponse.text()
        console.error('OpenAI API error:', error)
        throw new Error(`OpenAI API 오류: ${openaiResponse.status}`)
      }

      const openaiData = await openaiResponse.json()
      aiResponse = openaiData.choices[0]?.message?.content

      if (!aiResponse) {
        throw new Error('OpenAI AI 응답을 받을 수 없습니다.')
      }
    } else {
      throw new Error('사용 가능한 AI API 키가 없습니다.')
    }

    // Save AI response to database
    const { error: aiInsertError } = await supabase
      .from('chat_logs')
      .insert({
        student_id: studentId,
        activity_id: activityId,
        message: aiResponse,
        sender: 'bot',
        timestamp: new Date().toISOString()
      })

    if (aiInsertError) {
      console.error('Error saving AI response:', aiInsertError)
      // Don't throw error here, still return the response
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        response: aiResponse,
        provider: selectedProvider,
        model: selectedModel,
        questionCount: questionCount,
        ragUsed: useRAG,
        combinedResponse: useCombined
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error in ai-chat function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})
