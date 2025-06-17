
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, studentId, activityId, fileUrl, fileName, fileType } = await req.json()

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get admin settings
    const { data: settings } = await supabase
      .from('admin_settings')
      .select('*')
      .single()

    if (!settings?.openai_api_key) {
      throw new Error('OpenAI API 키가 설정되지 않았습니다.')
    }

    // Save student message to database
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

    await supabase
      .from('chat_logs')
      .insert(studentMessageData)

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

    // Prepare context for AI
    let contextMessage = `활동: ${activity?.title || '알 수 없음'}\n`
    if (activity?.content?.description) {
      contextMessage += `설명: ${activity.content.description}\n`
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

    // Prepare messages for OpenAI
    const messages = [
      {
        role: 'system',
        content: settings.system_prompt || '학생의 질문에 도움이 되는 답변을 제공해주세요.'
      },
      {
        role: 'user',
        content: `${contextMessage}\n\n현재 학생 메시지: ${message}`
      }
    ]

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.openai_api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: settings.selected_model || 'gpt-4o',
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API 오류: ${error}`)
    }

    const data = await response.json()
    const aiResponse = data.choices[0]?.message?.content

    if (!aiResponse) {
      throw new Error('AI 응답을 받을 수 없습니다.')
    }

    // Save AI response to database
    await supabase
      .from('chat_logs')
      .insert({
        student_id: studentId,
        activity_id: activityId,
        message: aiResponse,
        sender: 'bot',
        timestamp: new Date().toISOString()
      })

    return new Response(
      JSON.stringify({ success: true, response: aiResponse }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error:', error)
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
