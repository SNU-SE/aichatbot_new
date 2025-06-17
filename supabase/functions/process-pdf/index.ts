
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
    const { pdfUrl, activityId } = await req.json()
    
    console.log('Processing PDF:', { pdfUrl, activityId })

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    if (!openaiApiKey) {
      throw new Error('OpenAI API 키가 설정되지 않았습니다.')
    }

    // Fetch PDF content
    const pdfResponse = await fetch(pdfUrl)
    if (!pdfResponse.ok) {
      throw new Error('PDF를 가져올 수 없습니다.')
    }

    const pdfBuffer = await pdfResponse.arrayBuffer()
    const pdfText = await extractTextFromPDF(pdfBuffer)

    // Split text into chunks
    const chunks = splitTextIntoChunks(pdfText, 800) // 800자 단위로 분할 (임베딩에 최적화)

    // Clear existing chunks for this activity
    await supabase
      .from('document_chunks')
      .delete()
      .eq('activity_id', activityId)

    // Process chunks and generate embeddings
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i]
      
      // Generate embedding using OpenAI's latest embedding model
      const embedding = await generateEmbedding(chunkText, openaiApiKey)
      
      const { error } = await supabase
        .from('document_chunks')
        .insert({
          activity_id: activityId,
          chunk_text: chunkText,
          chunk_index: i,
          embedding: embedding
        })

      if (error) {
        console.error('Error saving chunk with embedding:', error)
        throw new Error('문서 청크 저장 실패')
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        chunksCount: chunks.length,
        message: 'PDF 처리 및 임베딩 생성이 완료되었습니다.'
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error in process-pdf function:', error)
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

// Generate embedding using OpenAI's latest embedding model
async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small', // 최신 임베딩 모델
      input: text,
      encoding_format: 'float'
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('OpenAI Embedding API error:', error)
    throw new Error(`임베딩 생성 실패: ${response.status}`)
  }

  const data = await response.json()
  return data.data[0].embedding
}

// Simple PDF text extraction (for demo purposes)
async function extractTextFromPDF(buffer: ArrayBuffer): Promise<string> {
  // 실제 구현에서는 PDF 파싱 라이브러리를 사용해야 합니다.
  // 여기서는 간단한 텍스트 추출을 시뮬레이션합니다.
  const decoder = new TextDecoder()
  const text = decoder.decode(buffer)
  
  // PDF에서 텍스트 부분만 추출하는 간단한 로직
  // 실제로는 PDF.js나 다른 라이브러리를 사용해야 합니다.
  const lines = text.split('\n')
  const textLines = lines.filter(line => 
    line.trim().length > 0 && 
    !line.startsWith('%') && 
    !line.includes('obj') &&
    !line.includes('endobj')
  )
  
  return textLines.join(' ').substring(0, 10000) // 임시로 10000자로 제한
}

function splitTextIntoChunks(text: string, chunkSize: number): string[] {
  const chunks = []
  const sentences = text.split(/[.!?]+/)
  
  let currentChunk = ''
  
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim())
      currentChunk = sentence
    } else {
      currentChunk += sentence + '. '
    }
  }
  
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim())
  }
  
  return chunks
}
