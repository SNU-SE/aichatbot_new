import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessingRequest {
  documentId: string;
  fileUrl: string;
  userId: string;
  activityId?: string;
  chunkingConfig?: ChunkingConfig;
}

interface ChunkingConfig {
  maxChunkSize?: number;
  minChunkSize?: number;
  chunkOverlap?: number;
  preserveParagraphs?: boolean;
}

interface ProcessingResult {
  success: boolean;
  documentId: string;
  chunksCreated: number;
  processingTimeMs: number;
  error?: string;
}

const DEFAULT_CHUNKING_CONFIG: ChunkingConfig = {
  maxChunkSize: 1000,
  minChunkSize: 100,
  chunkOverlap: 200,
  preserveParagraphs: true,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const { documentId, fileUrl, userId, activityId, chunkingConfig } = await req.json() as ProcessingRequest;
    
    console.log('Processing document:', { documentId, fileUrl, userId });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;
    
    if (!supabaseUrl || !supabaseKey || !openaiApiKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update status to extracting
    await updateProcessingStatus(supabase, documentId, 'extracting');
    if (activityId) {
      await updateActivityDocumentStatus(supabase, activityId, documentId, 'extracting');
    }

    // Extract text from PDF
    const extractedText = await extractTextFromPDF(fileUrl);
    
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text could be extracted from the PDF');
    }

    // Update status to chunking
    await updateProcessingStatus(supabase, documentId, 'chunking');
    if (activityId) {
      await updateActivityDocumentStatus(supabase, activityId, documentId, 'chunking');
    }

    // Split text into chunks
    const config = { ...DEFAULT_CHUNKING_CONFIG, ...chunkingConfig };
    const chunks = await createDocumentChunks(extractedText, config);

    if (chunks.length === 0) {
      throw new Error('No valid chunks could be created from the document');
    }

    // Update status to embedding
    await updateProcessingStatus(supabase, documentId, 'embedding');
    if (activityId) {
      await updateActivityDocumentStatus(supabase, activityId, documentId, 'embedding');
    }

    // Process chunks and generate embeddings
    let chunksCreated = 0;
    const batchSize = 5; // Process embeddings in batches to avoid rate limits

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      
      // Generate embeddings for the batch
      const embeddingPromises = batch.map(async (chunk, batchIndex) => {
        const globalIndex = i + batchIndex;
        
        try {
          const embedding = await generateEmbedding(chunk.content, openaiApiKey);
          
          const { error } = await supabase
            .from('document_chunks')
            .insert({
              document_id: documentId,
              chunk_index: globalIndex,
              content: chunk.content,
              page_number: chunk.pageNumber,
              position_start: chunk.positionStart,
              position_end: chunk.positionEnd,
              embedding: embedding,
              metadata: {
                wordCount: chunk.content.split(/\s+/).length,
                sentenceCount: chunk.content.split(/[.!?]+/).length - 1,
                extractionConfidence: 1.0,
              }
            });

          if (error) {
            console.error('Error saving chunk:', error);
            throw new Error(`Failed to save chunk ${globalIndex}: ${error.message}`);
          }

          return true;
        } catch (error) {
          console.error(`Error processing chunk ${globalIndex}:`, error);
          throw error;
        }
      });

      // Wait for batch to complete
      await Promise.all(embeddingPromises);
      chunksCreated += batch.length;

      // Add delay between batches to respect rate limits
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Update status to completed
    const processingTimeMs = Date.now() - startTime;
    await updateProcessingStatus(supabase, documentId, 'completed', {
      chunksCreated,
      processingTimeMs,
      wordCount: extractedText.split(/\s+/).length,
      extractionMethod: 'enhanced-processor-v1',
    });
    if (activityId) {
      await updateActivityDocumentStatus(supabase, activityId, documentId, 'completed');
    }

    const result: ProcessingResult = {
      success: true,
      documentId,
      chunksCreated,
      processingTimeMs,
    };

    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in enhanced-document-processor:', error);
    
    // Try to update status to failed if we have the documentId
    try {
      const body = await req.clone().json();
      if (body.documentId) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );
        await updateProcessingStatus(supabase, body.documentId, 'failed', {
          errorMessage: error.message,
          processingTimeMs: Date.now() - startTime,
        });
        if (body.activityId) {
          await updateActivityDocumentStatus(supabase, body.activityId, body.documentId, 'failed', error.message);
        }
      }
    } catch (statusError) {
      console.error('Failed to update error status:', statusError);
    }

    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        processingTimeMs: Date.now() - startTime,
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});

// Update document processing status
async function updateProcessingStatus(
  supabase: any, 
  documentId: string, 
  status: string, 
  metadata?: any
) {
  const { error } = await supabase.rpc('update_document_processing_status', {
    doc_id: documentId,
    new_status: status,
    processing_metadata: metadata ? JSON.stringify(metadata) : null,
  });

  if (error) {
    console.error('Error updating processing status:', error);
    throw new Error(`Failed to update status to ${status}: ${error.message}`);
  }
}

async function updateActivityDocumentStatus(
  supabase: any,
  activityId: string,
  documentId: string,
  status: string,
  errorMessage?: string
) {
  try {
    await supabase.rpc('upsert_activity_document_link', {
      p_activity_id: activityId,
      p_document_id: documentId,
      p_processing_status: status,
      p_processing_error: errorMessage ?? null
    });
  } catch (error) {
    console.error('Failed to update activity document status:', error);
  }
}

// Generate embedding using OpenAI's latest embedding model
async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text.substring(0, 8000), // Ensure we don't exceed token limits
          encoding_format: 'float'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error (${response.status}): ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      if (!data.data || !data.data[0] || !data.data[0].embedding) {
        throw new Error('Invalid embedding response from OpenAI');
      }

      return data.data[0].embedding;
    } catch (error) {
      lastError = error as Error;
      console.error(`Embedding attempt ${attempt} failed:`, error);
      
      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Failed to generate embedding after ${maxRetries} attempts: ${lastError?.message}`);
}

// Enhanced PDF text extraction
async function extractTextFromPDF(fileUrl: string): Promise<string> {
  try {
    // Fetch the PDF file
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
    }

    const pdfBuffer = await response.arrayBuffer();
    
    // For now, we'll use a simple text extraction method
    // In a production environment, you would use a proper PDF parsing library
    // like pdf-parse or PDF.js
    const text = await extractTextSimple(pdfBuffer);
    
    if (!text || text.trim().length === 0) {
      throw new Error('No text content found in PDF');
    }

    return text;
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error(`PDF text extraction failed: ${error.message}`);
  }
}

// Simple PDF text extraction (placeholder implementation)
// In production, replace this with a proper PDF parsing library
async function extractTextSimple(buffer: ArrayBuffer): Promise<string> {
  try {
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const text = decoder.decode(buffer);
    
    // Extract readable text from PDF structure
    // This is a very basic implementation - in production use pdf-parse or similar
    const lines = text.split('\n');
    const textLines: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip PDF structure elements
      if (trimmed.length === 0 || 
          trimmed.startsWith('%') || 
          trimmed.includes('obj') ||
          trimmed.includes('endobj') ||
          trimmed.includes('stream') ||
          trimmed.includes('endstream') ||
          /^\d+\s+\d+\s+R$/.test(trimmed)) {
        continue;
      }
      
      // Extract text that looks like readable content
      const cleanLine = trimmed.replace(/[^\w\s가-힣.,!?;:()\-'"]/g, ' ')
                              .replace(/\s+/g, ' ')
                              .trim();
      
      if (cleanLine.length > 3) {
        textLines.push(cleanLine);
      }
    }
    
    const extractedText = textLines.join(' ');
    
    // Ensure we have meaningful content
    if (extractedText.length < 100) {
      throw new Error('Insufficient text content extracted from PDF');
    }
    
    return extractedText;
  } catch (error) {
    throw new Error(`Text extraction failed: ${error.message}`);
  }
}

// Create document chunks with configurable parameters
async function createDocumentChunks(
  text: string, 
  config: ChunkingConfig
): Promise<Array<{
  content: string;
  pageNumber?: number;
  positionStart: number;
  positionEnd: number;
}>> {
  const chunks: Array<{
    content: string;
    pageNumber?: number;
    positionStart: number;
    positionEnd: number;
  }> = [];

  const maxSize = config.maxChunkSize || 1000;
  const minSize = config.minChunkSize || 100;
  const overlap = config.chunkOverlap || 200;
  const preserveParagraphs = config.preserveParagraphs !== false;

  // Split text into sentences for better chunking
  const sentences = text.split(/(?<=[.!?])\s+/);
  
  let currentChunk = '';
  let currentStart = 0;
  let currentEnd = 0;
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim();
    
    if (!sentence) continue;
    
    const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;
    
    // If adding this sentence would exceed max size and we have content
    if (potentialChunk.length > maxSize && currentChunk.length >= minSize) {
      // Save current chunk
      chunks.push({
        content: currentChunk.trim(),
        positionStart: currentStart,
        positionEnd: currentEnd,
      });
      
      // Start new chunk with overlap
      const overlapText = getOverlapText(currentChunk, overlap);
      currentChunk = overlapText + (overlapText ? ' ' : '') + sentence;
      currentStart = currentEnd - overlapText.length;
      currentEnd = currentStart + currentChunk.length;
    } else {
      // Add sentence to current chunk
      if (!currentChunk) {
        currentStart = text.indexOf(sentence);
      }
      currentChunk = potentialChunk;
      currentEnd = currentStart + currentChunk.length;
    }
  }
  
  // Add final chunk if it has content
  if (currentChunk.trim().length >= minSize) {
    chunks.push({
      content: currentChunk.trim(),
      positionStart: currentStart,
      positionEnd: currentEnd,
    });
  }
  
  return chunks;
}

// Get overlap text from the end of a chunk
function getOverlapText(text: string, overlapSize: number): string {
  if (text.length <= overlapSize) {
    return text;
  }
  
  const overlapText = text.slice(-overlapSize);
  
  // Try to break at sentence boundary
  const sentenceBreak = overlapText.lastIndexOf('. ');
  if (sentenceBreak > overlapSize / 2) {
    return overlapText.slice(sentenceBreak + 2);
  }
  
  // Try to break at word boundary
  const wordBreak = overlapText.lastIndexOf(' ');
  if (wordBreak > overlapSize / 2) {
    return overlapText.slice(wordBreak + 1);
  }
  
  return overlapText;
}
