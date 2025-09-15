// Test database connection and schema
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rbaqyzdixamkrssfpxdv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiYXF5emRpeGFta3Jzc2ZweGR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxMzEzODksImV4cCI6MjA2NTcwNzM4OX0.js2PgzN7oinksJE8t2xH6-AuBnwBWcP8aWs4VFHMr0k';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabaseConnection() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test basic connection
    const { data, error } = await supabase.from('documents').select('count').limit(1);
    
    if (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Database connection successful');
    
    // Test if enhanced RAG tables exist
    const tables = [
      'documents',
      'document_chunks', 
      'document_folders',
      'document_permissions',
      'enhanced_chat_logs'
    ];
    
    for (const table of tables) {
      try {
        const { error: tableError } = await supabase.from(table).select('*').limit(1);
        if (tableError) {
          console.error(`❌ Table '${table}' not accessible:`, tableError.message);
        } else {
          console.log(`✅ Table '${table}' exists and accessible`);
        }
      } catch (err) {
        console.error(`❌ Error checking table '${table}':`, err.message);
      }
    }
    
    // Test vector extension
    try {
      const { data: vectorData, error: vectorError } = await supabase.rpc('search_documents_with_vector', {
        query_embedding: new Array(1536).fill(0),
        max_results: 1
      });
      
      if (vectorError) {
        console.error('❌ Vector search function not available:', vectorError.message);
      } else {
        console.log('✅ Vector search function available');
      }
    } catch (err) {
      console.error('❌ Vector extension test failed:', err.message);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    return false;
  }
}

testDatabaseConnection().then(success => {
  if (success) {
    console.log('🎉 Database setup verification completed successfully!');
  } else {
    console.log('⚠️  Database setup verification completed with issues');
  }
  process.exit(success ? 0 : 1);
});