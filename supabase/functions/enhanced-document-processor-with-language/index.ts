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
  language?: string;
  chunkingConfig?: ChunkingConfig;
  enableLanguageDetection?: boolean;
}

interface ChunkingConfig {
  maxChunkSize?: number;
  minChunkSize?: number;
  chunkOverlap?: number;
  preserveParagraphs?: boolean;
}

interface LanguageDetectionResult {
  detectedLanguage: string;
  confidence: number;
  method: 'automatic' | 'manual' | 'fallback';
  alternatives?: Array<{
    language: string;
    confidence: number;
  }>;
}

interface ProcessingResult {
  success: boolean;
  documentId: string;
  chunksCreated: number;
  processingTimeMs: number;
  languageDetection?: LanguageDetectionResult;
  error?: string;
}

const DEFAULT_CHUNKING_CONFIG: ChunkingConfig = {
  maxChunkSize: 1000,
  minChunkSize: 100,
  chunkOverlap: 200,
  preserveParagraphs: true,
};

// Language detection patterns
const LANGUAGE_PATTERNS = {
  'ko': /[가-힣]/g,
  'ja': /[ひらがなカタカナ一-龯]/g,
  'zh': /[一-龯]/g,
  'fr': /[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]/g,
  'de': /[äöüß]/g,
  'es': /[áéíóúüñ¿¡]/g,
  'it': /[àèéìíîòóù]/g,
  'pt': /[àáâãçéêíóôõú]/g,
  'ru': /[а-яё]/gi,
  'ar': /[\u0600-\u06FF]/g,
  'hi': /[\u0900-\u097F]/g
};

/**
 * Detect language from text content using pattern matching
 */
function detectLanguageFromText(text: string): LanguageDetectionResult {
  const sampleText = text.substring(0, 2000).toLowerCase();
  const scores: Record<string, number> = {};
  const textLength = sampleText.length;

  // Test each language pattern
  for (const [language, pattern] of Object.entries(LANGUAGE_PATTERNS)) {
    const matches = sampleText.match(pattern);
    const matchCount = matches ? matches.length : 0;
    scores[language] = matchCount / textLength;
  }

  // Sort by score
  const sortedScores = Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .filter(([, score]) => score > 0);

  if (sortedScores.length === 0) {
    // No patterns matched, assume English
    return {
      detectedLanguage: 'en',
      confidence: 0.7,
      method: 'fallback'
    };
  }

  const [topLanguage, topScore] = sortedScores[0];
  const alternatives = sortedScores.slice(1, 3).map(([lang, score]) => ({
    language: lang,
    confidence: Math.min(score * 10, 1)
  }));

  return {
    detectedLanguage: topLanguage,
    confidence: Math.min(topScore * 10, 1),
    method: 'automatic',
    alternatives
  };
}

/**
 * Extract text from PDF (simplified version)
 */
async function extractTextFromPDF(fileUrl: string): Promise<string> {
  try {
    // In a real implementation, this would use a PDF parsing library
    // For now, we'll simulate text extraction
    console.log('Extracting text from PDF:', fileUrl);
    
    // Simulate PDF text extraction
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return mock extracted text
    return `This is extracted text from the PDF document. 
    The document contains various content that would be processed for language detection and chunking.
    This is a placeholder implementation that would be replaced with actual PDF parsing logic.`;
    
  } catch (error) {
    console.error('PDF text extraction failed:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

/**
 * Create text chunks with language-aware splitting
 */
function createLanguageAwareChunks(
  text: string, 
  config: ChunkingConfig,
  detectedLanguage: string
): Array<{
  content: string;
  chunkIndex: number;
  language: string;
  wordCount: number;
}> {
  const chunks: Array<{
    content: string;
    chunkIndex: number;
    language: string;
    wordCount: number;
  }> = [];

  // Language-specific sentence splitting
  let sentences: string[];
  
  if (['ja', 'zh'].includes(detectedLanguage)) {
    // For CJK languages, split on different punctuation
    sentences = text.split(/[。！？\n]+/).filter(s => s.trim().length > 0);
  } else if (['ko'].includes(detectedLanguage)) {
    // Korean sentence splitting
    sentences = text.split(/[다요니까\.\!\?\n]+/).filter(s => s.trim().length > 0);
  } else {
    // Default sentence splitting for Latin-based languages
    sentences = text.split(/[.!?\n]+/).filter(s => s.trim().length > 0);
  }

  let currentChunk = '';
  let chunkIndex = 0;

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) continue;

    const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + trimmedSentence;
    
    if (potentialChunk.length <= config.maxChunkSize!) {
      currentChunk = potentialChunk;
    } else {
      // Save current chunk if it meets minimum size
      if (currentChunk.length >= config.minChunkSize!) {
        chunks.push({
          content: currentChunk,
          chunkIndex: chunkIndex++,
          language: detectedLanguage,
          wordCount: currentChunk.split(/\s+/).length
        });
      }
      
      // Start new chunk
      currentChunk = trimmedSentence;
    }
  }

  // Add final chunk
  if (currentChunk.length >= config.minChunkSize!) {
    chunks.push({
      content: currentChunk,
      chunkIndex: chunkIndex++,
      language: detectedLanguage,
      wordCount: currentChunk.split(/\s+/).length
    });
  }

  return chunks;
}

/**
 * Generate embeddings (mock implementation)
 */
async function generateEmbeddings(text: string): Promise<number[]> {
  // In a real implementation, this would call OpenAI's embedding API
  // For now, return a mock embedding
  return new Array(1536).fill(0).map(() => Math.random() - 0.5);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const { 
      documentId, 
      fileUrl, 
      userId, 
      language,
      chunkingConfig = DEFAULT_CHUNKING_CONFIG,
      enableLanguageDetection = true
    } = await req.json() as ProcessingRequest;
    
    console.log('Processing document with language support:', { 
      documentId, 
      fileUrl, 
      userId, 
      language,
      enableLanguageDetection 
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update document status to extracting
    await supabase.rpc('update_document_processing_status', {
      doc_id: documentId,
      new_status: 'extracting'
    });

    // Extract text from PDF
    const extractedText = await extractTextFromPDF(fileUrl);
    
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text could be extracted from the document');
    }

    // Detect language if enabled and not manually specified
    let languageDetection: LanguageDetectionResult | undefined;
    let finalLanguage = language || 'en';

    if (enableLanguageDetection && !language) {
      languageDetection = detectLanguageFromText(extractedText);
      finalLanguage = languageDetection.detectedLanguage;
      
      console.log('Language detection result:', languageDetection);
      
      // Update document with detected language
      await supabase
        .from('documents')
        .update({
          detected_language: languageDetection.detectedLanguage,
          detection_confidence: languageDetection.confidence,
          detection_method: languageDetection.method
        })
        .eq('id', documentId);
    }

    // Update document status to chunking
    await supabase.rpc('update_document_processing_status', {
      doc_id: documentId,
      new_status: 'chunking'
    });

    // Create language-aware chunks
    const chunks = createLanguageAwareChunks(extractedText, chunkingConfig, finalLanguage);
    
    if (chunks.length === 0) {
      throw new Error('No valid chunks could be created from the document');
    }

    console.log(`Created ${chunks.length} chunks for language: ${finalLanguage}`);

    // Update document status to embedding
    await supabase.rpc('update_document_processing_status', {
      doc_id: documentId,
      new_status: 'embedding'
    });

    // Process chunks and generate embeddings
    const chunkInserts = [];
    
    for (const chunk of chunks) {
      try {
        // Generate embedding for the chunk
        const embedding = await generateEmbeddings(chunk.content);
        
        chunkInserts.push({
          document_id: documentId,
          chunk_index: chunk.chunkIndex,
          content: chunk.content,
          language: chunk.language,
          embedding: embedding,
          metadata: {
            wordCount: chunk.wordCount,
            language: chunk.language,
            processingMethod: 'language-aware'
          }
        });
        
      } catch (error) {
        console.error(`Failed to process chunk ${chunk.chunkIndex}:`, error);
        // Continue with other chunks
      }
    }

    // Insert all chunks
    if (chunkInserts.length > 0) {
      const { error: insertError } = await supabase
        .from('document_chunks')
        .insert(chunkInserts);

      if (insertError) {
        throw new Error(`Failed to insert chunks: ${insertError.message}`);
      }
    }

    // Update document status to completed
    await supabase.rpc('update_document_processing_status', {
      doc_id: documentId,
      new_status: 'completed',
      processing_metadata: {
        chunksCreated: chunkInserts.length,
        processingTimeMs: Date.now() - startTime,
        language: finalLanguage,
        languageDetection: languageDetection
      }
    });

    const result: ProcessingResult = {
      success: true,
      documentId,
      chunksCreated: chunkInserts.length,
      processingTimeMs: Date.now() - startTime,
      languageDetection
    };

    console.log('Document processing completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Document processing failed:', error);

    // Update document status to failed
    try {
      const { documentId } = await req.json() as ProcessingRequest;
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase.rpc('update_document_processing_status', {
        doc_id: documentId,
        new_status: 'failed',
        processing_metadata: {
          error: error.message,
          processingTimeMs: Date.now() - startTime
        }
      });
    } catch (updateError) {
      console.error('Failed to update document status:', updateError);
    }

    const result: ProcessingResult = {
      success: false,
      documentId: '',
      chunksCreated: 0,
      processingTimeMs: Date.now() - startTime,
      error: error.message
    };

    return new Response(JSON.stringify(result), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});