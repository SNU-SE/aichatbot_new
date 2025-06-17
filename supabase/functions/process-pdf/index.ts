
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
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch PDF content
    const pdfResponse = await fetch(pdfUrl)
    if (!pdfResponse.ok) {
      throw new Error('PDF를 가져올 수 없습니다.')
    }

    const pdfBuffer = await pdfResponse.arrayBuffer()
    const pdfText = await extractTextFromPDF(pdfBuffer)

    // Split text into chunks
    const chunks = splitTextIntoChunks(pdfText, 1000) // 1000자 단위로 분할

    // Clear existing chunks for this activity
    await supabase
      .from('document_chunks')
      .delete()
      .eq('activity_id', activityId)

    // Save chunks to database
    for (let i = 0; i < chunks.length; i++) {
      const { error } = await supabase
        .from('document_chunks')
        .insert({
          activity_id: activityId,
          chunk_text: chunks[i],
          chunk_index: i
        })

      if (error) {
        console.error('Error saving chunk:', error)
        throw new Error('문서 청크 저장 실패')
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        chunksCount: chunks.length,
        message: 'PDF 처리가 완료되었습니다.'
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
