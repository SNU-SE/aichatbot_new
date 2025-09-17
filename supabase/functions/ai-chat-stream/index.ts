/**
 * AI Chat Stream Edge Function
 * Streaming AI chat with document context support
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StreamChatRequest {
  message: string;
  sessionId: string;
  conversationHistory?: Array<{role: string; content: string}>;
  documentContext?: boolean;
  activityId?: string;
  stream?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      message, 
      sessionId, 
      conversationHistory = [], 
      documentContext = false,
      activityId,
      stream = true 
    } = await req.json() as StreamChatRequest;

    console.log('AI Chat Stream Request:', { 
      message: message?.substring(0, 100) + '...', 
      sessionId, 
      documentContext,
      stream
    });

    if (!message || !sessionId) {
      throw new Error('Message and sessionId are required');
    }

    // Get session info to determine user
    const { data: session, error: sessionError } = await supabase
      .from('enhanced_chat_sessions')
      .select('user_id, document_context')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      throw new Error('Session not found');
    }

    // Get AI settings (use global settings for now)
    const { data: settingsData } = await supabase
      .from('admin_settings')
      .select('*')
      .single();

    const systemPrompt = settingsData?.system_prompt || 
      'You are a helpful AI assistant. Provide accurate, helpful responses based on the context provided.';
    const selectedModel = settingsData?.selected_model || 'gpt-4o';
    const selectedProvider = settingsData?.selected_provider || 'openai';

    let enhancedMessage = message;

    // Add document context if enabled and available
    let ragReferences: any[] = [];

    if (documentContext && (session.document_context?.length > 0 || activityId)) {
      try {
        // Search for relevant document chunks
        const { data: ragData, error: ragError } = await supabase.functions.invoke('rag-search', {
          body: { 
            query: message,
            activityId,
            options: {
              documentIds: session.document_context,
              maxResults: 5,
              minSimilarity: 0.7
            }
          }
        });
        
        if (!ragError && ragData?.results && ragData.results.length > 0) {
          ragReferences = ragData.results;

          const contextInfo = ragData.results
            .map((result: any, index: number) => {
              const docTitle = result.documentTitle || `Document ${index + 1}`;
              const pageInfo = result.pageNumber ? ` (p. ${result.pageNumber})` : '';
              const similarity = typeof result.similarity === 'number'
                ? ` [similarity: ${result.similarity.toFixed(2)}]`
                : '';
              return `Document: ${docTitle}${pageInfo}${similarity}\n${result.content}`;
            })
            .join('\n---\n');
          
          enhancedMessage = `Context from documents:
${contextInfo}

User question: ${message}

Please provide a helpful response based on the context above. If the context doesn't contain relevant information, please indicate that and provide a general response.`;
        }
      } catch (ragError) {
        console.error('RAG search error:', ragError);
        // Continue without context if RAG fails
      }
    }

    // Prepare messages for AI
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: enhancedMessage }
    ];

    // Create streaming response
    if (stream && selectedProvider === 'openai') {
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
          messages,
          temperature: 0.7,
          max_tokens: 1000,
          stream: true,
        }),
      });

      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
      }

      // Create streaming response
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          const reader = openaiResponse.body?.getReader();
          if (!reader) {
            controller.close();
            return;
          }

          try {
            let fullContent = '';
            
            while (true) {
              const { done, value } = await reader.read();
              
              if (done) {
                // Send final chunk
                const finalChunk = {
                  content: fullContent,
                  isComplete: true,
                  timestamp: new Date().toISOString(),
                  sources: ragReferences
                };
                
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalChunk)}\n\n`));
                controller.close();
                break;
              }

              // Parse SSE data
              const chunk = new TextDecoder().decode(value);
              const lines = chunk.split('\n').filter(line => line.trim());
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  
                  if (data === '[DONE]') {
                    continue;
                  }
                  
                  try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices?.[0]?.delta?.content;
                    
                    if (content) {
                      fullContent += content;
                      
                      const streamChunk = {
                        content,
                        isComplete: false,
                        timestamp: new Date().toISOString(),
                      };
                      
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify(streamChunk)}\n\n`));
                    }
                  } catch (parseError) {
                    console.error('Error parsing streaming chunk:', parseError);
                  }
                }
              }
            }
          } catch (error) {
            console.error('Streaming error:', error);
            const errorChunk = {
              content: '',
              isComplete: true,
              error: error.message,
              timestamp: new Date().toISOString(),
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`));
            controller.close();
          } finally {
            reader.releaseLock();
          }
        },
      });

      return new Response(readable, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Non-streaming response (fallback)
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
          messages,
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
          messages: messages.slice(1), // Remove system message for Anthropic
          system: systemPrompt,
        }),
      });

      if (!anthropicResponse.ok) {
        const errorData = await anthropicResponse.json();
        throw new Error(`Anthropic API error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const anthropicData = await anthropicResponse.json();
      aiResponse = anthropicData.content[0]?.text || 'Sorry, I could not generate a response.';
    }

    return new Response(JSON.stringify({ 
      content: aiResponse,
      isComplete: true,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('AI Chat Stream Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An error occurred while processing your request.',
      isComplete: true,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
