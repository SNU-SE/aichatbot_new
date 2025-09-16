#!/usr/bin/env node

/**
 * Environment Validation Script
 * Validates environment variables for different deployment contexts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function log(message, color = 'reset') {
  console.log(colorize(message, color));
}

// Environment variable definitions
const envVarDefinitions = {
  // Required frontend variables
  required: {
    'VITE_SUPABASE_URL': {
      description: 'Supabase project URL',
      validation: (value) => {
        if (!value) return 'Required';
        if (!value.startsWith('https://')) return 'Must start with https://';
        if (!value.includes('.supabase.co')) return 'Must be a valid Supabase URL';
        return null;
      }
    },
    'VITE_SUPABASE_ANON_KEY': {
      description: 'Supabase anonymous key',
      validation: (value) => {
        if (!value) return 'Required';
        if (value.length < 100) return 'Appears to be too short for a valid key';
        if (value.includes('your_') || value.includes('_here')) return 'Contains placeholder text';
        return null;
      }
    }
  },
  
  // Optional frontend variables
  optional: {
    'VITE_OPENAI_API_KEY': {
      description: 'OpenAI API key for client-side features',
      validation: (value) => {
        if (value && !value.startsWith('sk-')) return 'OpenAI keys should start with sk-';
        return null;
      }
    },
    'VITE_CLAUDE_API_KEY': {
      description: 'Claude API key for alternative AI provider',
      validation: (value) => {
        if (value && value.length < 20) return 'Appears to be too short for a valid key';
        return null;
      }
    },
    'VITE_APP_NAME': {
      description: 'Application name',
      validation: (value) => {
        if (value && value.length > 100) return 'App name is too long';
        return null;
      }
    },
    'VITE_APP_VERSION': {
      description: 'Application version',
      validation: (value) => {
        if (value && !/^\d+\.\d+\.\d+/.test(value)) return 'Should follow semantic versioning (x.y.z)';
        return null;
      }
    },
    'VITE_APP_ENVIRONMENT': {
      description: 'Application environment',
      validation: (value) => {
        if (value && !['development', 'staging', 'production'].includes(value)) {
          return 'Must be one of: development, staging, production';
        }
        return null;
      }
    }
  },
  
  // Configuration variables
  config: {
    'VITE_MAX_FILE_SIZE': {
      description: 'Maximum file upload size in bytes',
      validation: (value) => {
        if (value && isNaN(Number(value))) return 'Must be a number';
        if (value && Number(value) < 1024) return 'Should be at least 1KB';
        return null;
      }
    },
    'VITE_MAX_SEARCH_RESULTS': {
      description: 'Maximum number of search results',
      validation: (value) => {
        if (value && isNaN(Number(value))) return 'Must be a number';
        if (value && Number(value) < 1) return 'Must be at least 1';
        return null;
      }
    },
    'VITE_DEFAULT_SIMILARITY_THRESHOLD': {
      description: 'Default similarity threshold for vector search',
      validation: (value) => {
        if (value && isNaN(Number(value))) return 'Must be a number';
        const num = Number(value);
        if (value && (num < 0 || num > 1)) return 'Must be between 0 and 1';
        return null;
      }
    }
  }
};

function loadEnvironmentFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  
  content.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      }
    }
  });
  
  return env;
}

// Merge env file with process.env for CI/Netlify usage
function loadEnvForValidation() {
  const fileEnv = loadEnvironmentFile('.env.local');
  const merged = { ...fileEnv };
  const allKeys = [
    ...Object.keys(envVarDefinitions.required),
    ...Object.keys(envVarDefinitions.optional),
    ...Object.keys(envVarDefinitions.config),
  ];
  for (const key of allKeys) {
    if (process.env[key]) {
      merged[key] = process.env[key];
    }
  }
  return merged;
}

function validateEnvironmentVariable(key, value, definition) {
  const result = {
    key,
    value: value || '',
    description: definition.description,
    status: 'valid',
    message: null
  };
  
  if (definition.validation) {
    const validationResult = definition.validation(value);
    if (validationResult) {
      result.status = 'invalid';
      result.message = validationResult;
    }
  }
  
  return result;
}

function validateEnvironment(env) {
  const results = {
    required: [],
    optional: [],
    config: [],
    summary: {
      total: 0,
      valid: 0,
      invalid: 0,
      missing: 0
    }
  };
  
  // Validate required variables
  Object.entries(envVarDefinitions.required).forEach(([key, definition]) => {
    const result = validateEnvironmentVariable(key, env[key], definition);
    if (!env[key]) {
      result.status = 'missing';
      results.summary.missing++;
    } else if (result.status === 'invalid') {
      results.summary.invalid++;
    } else {
      results.summary.valid++;
    }
    results.required.push(result);
    results.summary.total++;
  });
  
  // Validate optional variables
  Object.entries(envVarDefinitions.optional).forEach(([key, definition]) => {
    if (env[key]) {
      const result = validateEnvironmentVariable(key, env[key], definition);
      if (result.status === 'invalid') {
        results.summary.invalid++;
      } else {
        results.summary.valid++;
      }
      results.optional.push(result);
      results.summary.total++;
    }
  });
  
  // Validate configuration variables
  Object.entries(envVarDefinitions.config).forEach(([key, definition]) => {
    if (env[key]) {
      const result = validateEnvironmentVariable(key, env[key], definition);
      if (result.status === 'invalid') {
        results.summary.invalid++;
      } else {
        results.summary.valid++;
      }
      results.config.push(result);
      results.summary.total++;
    }
  });
  
  return results;
}

function printValidationResults(results) {
  log('\n' + colorize('🔍 Environment Validation Results', 'bright'));
  log('=' .repeat(50));
  
  // Print summary
  const { summary } = results;
  log(`\nSummary: ${summary.total} variables checked`);
  log(`✓ Valid: ${summary.valid}`, summary.valid > 0 ? 'green' : 'reset');
  log(`✗ Invalid: ${summary.invalid}`, summary.invalid > 0 ? 'red' : 'reset');
  log(`⚠ Missing: ${summary.missing}`, summary.missing > 0 ? 'yellow' : 'reset');
  
  // Print required variables
  if (results.required.length > 0) {
    log('\n' + colorize('Required Variables:', 'blue'));
    results.required.forEach(result => {
      const status = result.status === 'valid' ? '✓' : 
                    result.status === 'missing' ? '⚠' : '✗';
      const color = result.status === 'valid' ? 'green' : 
                   result.status === 'missing' ? 'yellow' : 'red';
      
      log(`  ${colorize(status, color)} ${result.key}`);
      if (result.message) {
        log(`    ${colorize(result.message, 'red')}`);
      }
    });
  }
  
  // Print optional variables
  if (results.optional.length > 0) {
    log('\n' + colorize('Optional Variables:', 'blue'));
    results.optional.forEach(result => {
      const status = result.status === 'valid' ? '✓' : '✗';
      const color = result.status === 'valid' ? 'green' : 'red';
      
      log(`  ${colorize(status, color)} ${result.key}`);
      if (result.message) {
        log(`    ${colorize(result.message, 'red')}`);
      }
    });
  }
  
  // Print configuration variables
  if (results.config.length > 0) {
    log('\n' + colorize('Configuration Variables:', 'blue'));
    results.config.forEach(result => {
      const status = result.status === 'valid' ? '✓' : '✗';
      const color = result.status === 'valid' ? 'green' : 'red';
      
      log(`  ${colorize(status, color)} ${result.key}`);
      if (result.message) {
        log(`    ${colorize(result.message, 'red')}`);
      }
    });
  }
}

function generateRecommendations(results) {
  log('\n' + colorize('📋 Recommendations:', 'bright'));
  
  const hasIssues = results.summary.invalid > 0 || results.summary.missing > 0;
  
  if (!hasIssues) {
    log('✓ Your environment configuration looks good!', 'green');
    return;
  }
  
  if (results.summary.missing > 0) {
    const missingKeys = results.required
      .filter(r => r.status === 'missing')
      .map(r => r.key);
    log('\n1. Missing required variables:', 'yellow');
    log(`   → ${missingKeys.join(', ')}`, 'yellow');
    if (process.env.NETLIFY === 'true') {
      log('   Netlify: Add them in Site settings → Environment variables.', 'yellow');
    } else {
      log('   Local: Add them to .env.local (see .env.example).', 'yellow');
    }
  }
  
  if (results.summary.invalid > 0) {
    log('\n2. Fix invalid variable values', 'yellow');
  }
  
  log('\n3. For backend variables (without VITE_ prefix):');
  log('   - Set them in Supabase Dashboard > Settings > Environment Variables');
  
  log('\n4. For Netlify deployment variables:');
  log('   - Set them in Netlify Dashboard > Site Settings > Environment Variables');
  
  log('\n5. Run this validation again after making changes:');
  log('   npm run validate:env', 'cyan');
}

function checkEnvironmentFiles() {
  const files = ['.env.local', '.env.example'];
  const existingFiles = files.filter(file => fs.existsSync(file));
  
  log(colorize('📁 Environment Files:', 'blue'));
  files.forEach(file => {
    const exists = fs.existsSync(file);
    const status = exists ? '✓' : '✗';
    const color = exists ? 'green' : 'red';
    log(`  ${colorize(status, color)} ${file}`);
  });
  
  if (!fs.existsSync('.env.local')) {
    if (process.env.NETLIFY === 'true') {
      log('\nℹ️  .env.local not found, NETLIFY environment detected. Using Netlify env vars.', 'yellow');
      return true;
    }
    log('\n⚠️  No .env.local file found. Run npm run setup:env to create one.', 'yellow');
    return false;
  }
  
  return true;
}

export function main() {
  try {
    log(colorize('🔧 Enhanced RAG System Environment Validator', 'bright'));
    
    // Check for environment files
    if (!checkEnvironmentFiles()) {
      process.exit(1);
    }
    
    // Load environment variables (file + process.env for Netlify)
    const env = loadEnvForValidation();
    
    // Validate environment
    const results = validateEnvironment(env);
    
    // Print results
    printValidationResults(results);
    
    // Generate recommendations
    generateRecommendations(results);
    
    // Exit with appropriate code
    const hasErrors = results.summary.invalid > 0 || results.summary.missing > 0;
    if (hasErrors) {
      log('\n❌ Environment validation failed', 'red');
      process.exit(1);
    } else {
      log('\n✅ Environment validation passed', 'green');
      process.exit(0);
    }
    
  } catch (error) {
    log(`\n❌ Validation failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run validation if called directly
if (process.argv[1] && process.argv[1].includes('validate-environment.js')) {
  main();
}

export {
  validateEnvironment,
  loadEnvironmentFile,
  envVarDefinitions
};
