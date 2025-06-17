
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
    const { query, activityId } = await req.json()
    
    console.log('RAG search request:', { query, activityId })

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    if (!openaiApiKey) {
      throw new Error('OpenAI API 키가 설정되지 않았습니다.')
    }

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query, openaiApiKey)

    // Check if there are any document chunks for this activity
    const { data: chunkCheck, error: checkError } = await supabase
      .from('document_chunks')
      .select('id')
      .eq('activity_id', activityId)
      .limit(1)

    if (checkError) {
      throw new Error('문서 청크 확인 중 오류가 발생했습니다.')
    }

    if (!chunkCheck || chunkCheck.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'RAG 문서가 없습니다.',
          relevantChunks: []
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }

    // Perform vector similarity search using SQL function
    const { data: chunks, error } = await supabase.rpc('search_similar_chunks', {
      query_embedding: JSON.stringify(queryEmbedding),
      activity_id_param: activityId,
      similarity_threshold: 0.7,
      match_count: 3
    })

    if (error) {
      console.error('Vector search error:', error)
      // Fallback to keyword-based search if vector search fails
      return await fallbackKeywordSearch(supabase, query, activityId)
    }

    if (!chunks || chunks.length === 0) {
      // Try with lower threshold if no results found
      const { data: fallbackChunks, error: fallbackError } = await supabase.rpc('search_similar_chunks', {
        query_embedding: JSON.stringify(queryEmbedding),
        activity_id_param: activityId,
        similarity_threshold: 0.5,
        match_count: 3
      })

      if (fallbackError || !fallbackChunks || fallbackChunks.length === 0) {
        return await fallbackKeywordSearch(supabase, query, activityId)
      }

      const relevantChunks = fallbackChunks.map((chunk: any) => ({
        text: chunk.chunk_text,
        similarity: chunk.similarity
      }))

      return new Response(
        JSON.stringify({ 
          success: true,
          relevantChunks: relevantChunks,
          searchType: 'vector_similarity_low_threshold'
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }

    const relevantChunks = chunks.map((chunk: any) => ({
      text: chunk.chunk_text,
      similarity: chunk.similarity
    }))

    return new Response(
      JSON.stringify({ 
        success: true,
        relevantChunks: relevantChunks,
        searchType: 'vector_similarity'
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error in rag-search function:', error)
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

// Fallback keyword-based search
async function fallbackKeywordSearch(supabase: any, query: string, activityId: string) {
  console.log('Using fallback keyword search')
  
  const { data: chunks, error } = await supabase
    .from('document_chunks')
    .select('*')
    .eq('activity_id', activityId)
    .order('chunk_index', { ascending: true })

  if (error) {
    throw new Error('문서 청크를 가져올 수 없습니다.')
  }

  if (!chunks || chunks.length === 0) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'RAG 문서가 없습니다.',
        relevantChunks: []
      }),
      { 
        headers: { 
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
          'Content-Type': 'application/json' 
        } 
      }
    )
  }

  // Simple keyword-based search
  const keywords = query.toLowerCase().split(/\s+/)
  const scoredChunks = chunks.map((chunk: any) => {
    const chunkText = chunk.chunk_text.toLowerCase()
    let score = 0
    
    keywords.forEach((keyword: string) => {
      const matches = (chunkText.match(new RegExp(keyword, 'g')) || []).length
      score += matches
    })
    
    return {
      ...chunk,
      relevanceScore: score
    }
  })

  // Get top 3 most relevant chunks
  const relevantChunks = scoredChunks
    .filter((chunk: any) => chunk.relevanceScore > 0)
    .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore)
    .slice(0, 3)
    .map((chunk: any) => ({
      text: chunk.chunk_text,
      score: chunk.relevanceScore
    }))

  return new Response(
    JSON.stringify({ 
      success: true,
      relevantChunks: relevantChunks,
      searchType: 'keyword_fallback'
    }),
    { 
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Content-Type': 'application/json' 
      } 
    }
  )
}
