
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
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get document chunks for this activity
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
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }

    // Simple keyword-based search (실제로는 임베딩 기반 검색을 사용해야 함)
    const keywords = query.toLowerCase().split(/\s+/)
    const scoredChunks = chunks.map(chunk => {
      const chunkText = chunk.chunk_text.toLowerCase()
      let score = 0
      
      keywords.forEach(keyword => {
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
      .filter(chunk => chunk.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 3)

    return new Response(
      JSON.stringify({ 
        success: true,
        relevantChunks: relevantChunks.map(chunk => ({
          text: chunk.chunk_text,
          score: chunk.relevanceScore
        }))
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
