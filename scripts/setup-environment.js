#!/usr/bin/env node

/**
 * Environment Setup Script
 * Helps set up environment variables for different deployment environments
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Environment templates
const environments = {
  development: '.env.development',
  staging: '.env.staging',
  production: '.env.production'
};

// Required environment variables
const requiredVars = {
  frontend: [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
  ],
  backend: [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_API_KEY'
  ],
  netlify: [
    'NETLIFY_SITE_ID',
    'NETLIFY_AUTH_TOKEN'
  ]
};

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function log(message, color = 'reset') {
  console.log(colorize(message, color));
}

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(colorize(prompt, 'cyan'), resolve);
  });
}

async function checkExistingEnvFile() {
  const envLocalPath = '.env.local';
  
  if (fs.existsSync(envLocalPath)) {
    log('\n✓ Found existing .env.local file', 'green');
    
    const overwrite = await question('Do you want to update it? (y/N): ');
    return overwrite.toLowerCase() === 'y';
  }
  
  return true;
}

async function selectEnvironment() {
  log('\nSelect target environment:', 'bright');
  log('1. Development (local development)');
  log('2. Staging (preview deployments)');
  log('3. Production (live deployment)');
  
  const choice = await question('\nEnter your choice (1-3): ');
  
  switch (choice) {
    case '1':
      return 'development';
    case '2':
      return 'staging';
    case '3':
      return 'production';
    default:
      log('Invalid choice. Defaulting to development.', 'yellow');
      return 'development';
  }
}

async function collectEnvironmentVariables(environment) {
  log(`\n${colorize('Setting up environment variables for:', 'bright')} ${colorize(environment, 'magenta')}`, 'bright');
  
  const envVars = {};
  
  // Supabase Configuration
  log('\n--- Supabase Configuration ---', 'blue');
  envVars.VITE_SUPABASE_URL = await question('Supabase URL: ');
  envVars.VITE_SUPABASE_ANON_KEY = await question('Supabase Anon Key: ');
  
  // AI Configuration
  log('\n--- AI Configuration ---', 'blue');
  envVars.VITE_OPENAI_API_KEY = await question('OpenAI API Key (optional, press Enter to skip): ');
  envVars.VITE_CLAUDE_API_KEY = await question('Claude API Key (optional, press Enter to skip): ');
  
  // Application Configuration
  log('\n--- Application Configuration ---', 'blue');
  envVars.VITE_APP_NAME = await question('App Name (default: Enhanced RAG Education Platform): ') || 'Enhanced RAG Education Platform';
  envVars.VITE_APP_VERSION = await question('App Version (default: 1.0.0): ') || '1.0.0';
  
  return envVars;
}

function generateEnvFile(envVars, environment) {
  const template = fs.readFileSync('.env.example', 'utf8');
  let envContent = template;
  
  // Replace template values with actual values
  Object.entries(envVars).forEach(([key, value]) => {
    if (value) {
      const regex = new RegExp(`${key}=.*`, 'g');
      envContent = envContent.replace(regex, `${key}=${value}`);
    }
  });
  
  // Add environment-specific overrides
  if (fs.existsSync(environments[environment])) {
    const overrides = fs.readFileSync(environments[environment], 'utf8');
    envContent += '\n\n# Environment-specific overrides\n' + overrides;
  }
  
  return envContent;
}

function validateEnvironmentVariables(envVars) {
  const missing = [];
  
  requiredVars.frontend.forEach(varName => {
    if (!envVars[varName] || envVars[varName].includes('your_') || envVars[varName].includes('_here')) {
      missing.push(varName);
    }
  });
  
  if (missing.length > 0) {
    log('\n⚠️  Warning: Missing or incomplete required variables:', 'yellow');
    missing.forEach(varName => log(`   - ${varName}`, 'yellow'));
    log('\nPlease update these values in your .env.local file before running the application.', 'yellow');
    return false;
  }
  
  return true;
}

function generateNetlifyInstructions(environment) {
  log('\n--- Netlify Environment Variables Setup ---', 'blue');
  log('Set the following environment variables in your Netlify dashboard:');
  log('(Site Settings > Environment Variables)', 'cyan');
  
  const netlifyVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_APP_ENVIRONMENT=' + environment,
    'NODE_VERSION=18',
    'NPM_FLAGS=--production=false'
  ];
  
  netlifyVars.forEach(varName => {
    log(`   ${varName}`, 'green');
  });
}

function generateSupabaseInstructions() {
  log('\n--- Supabase Edge Functions Environment Variables ---', 'blue');
  log('Set the following environment variables in your Supabase dashboard:');
  log('(Project Settings > Edge Functions > Environment Variables)', 'cyan');
  
  const supabaseVars = [
    'OPENAI_API_KEY',
    'CLAUDE_API_KEY (optional)',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  supabaseVars.forEach(varName => {
    log(`   ${varName}`, 'green');
  });
}

function generateDocumentation() {
  const docContent = `# Environment Variables Documentation

## Overview
This document describes the environment variables used in the Enhanced RAG Education Platform.

## Frontend Variables (VITE_ prefix)
These variables are accessible in the client-side code and are bundled with the application.

### Required Variables
- \`VITE_SUPABASE_URL\`: Your Supabase project URL
- \`VITE_SUPABASE_ANON_KEY\`: Your Supabase anonymous key

### Optional Variables
- \`VITE_OPENAI_API_KEY\`: OpenAI API key (for client-side features)
- \`VITE_CLAUDE_API_KEY\`: Claude API key (alternative AI provider)

## Backend Variables (No VITE_ prefix)
These variables are only accessible in Edge Functions and server-side code.

### Required Variables
- \`OPENAI_API_KEY\`: OpenAI API key for embeddings and chat
- \`SUPABASE_URL\`: Supabase project URL
- \`SUPABASE_SERVICE_ROLE_KEY\`: Supabase service role key

### Optional Variables
- \`CLAUDE_API_KEY\`: Claude API key for alternative AI provider
- \`REDIS_URL\`: Redis connection string for caching
- \`SENTRY_DSN\`: Sentry DSN for error monitoring

## Environment-Specific Configuration

### Development
- Debug mode enabled
- Verbose logging
- Less restrictive rate limits
- Analytics disabled

### Production
- Debug mode disabled
- Error-level logging only
- Strict rate limits
- Analytics enabled with privacy mode

## Security Best Practices

1. Never commit actual API keys to version control
2. Use different keys for different environments
3. Rotate keys regularly
4. Use environment-specific configurations
5. Frontend variables are exposed to clients - never put secrets there
6. Set backend variables in Supabase Dashboard
7. Set build variables in Netlify Dashboard

## Setup Instructions

1. Copy \`.env.example\` to \`.env.local\`
2. Fill in your actual values
3. Run \`npm run setup:env\` for guided setup
4. Set backend variables in Supabase Dashboard
5. Set build variables in Netlify Dashboard

## Troubleshooting

### Common Issues
- **Build fails**: Check that all required VITE_ variables are set
- **API calls fail**: Check that backend variables are set in Supabase
- **Deployment fails**: Check that Netlify variables are configured

### Validation
Run \`npm run validate:env\` to check your environment configuration.
`;

  fs.writeFileSync('docs/ENVIRONMENT_VARIABLES.md', docContent);
  log('\n✓ Generated environment variables documentation', 'green');
}

export async function main() {
  try {
    log(colorize('🚀 Enhanced RAG System Environment Setup', 'bright'));
    log('This script will help you configure environment variables for your deployment.\n');
    
    // Check if we should proceed
    const shouldProceed = await checkExistingEnvFile();
    if (!shouldProceed) {
      log('Setup cancelled.', 'yellow');
      rl.close();
      return;
    }
    
    // Select environment
    const environment = await selectEnvironment();
    
    // Collect environment variables
    const envVars = await collectEnvironmentVariables(environment);
    
    // Generate .env.local file
    const envContent = generateEnvFile(envVars, environment);
    fs.writeFileSync('.env.local', envContent);
    
    log('\n✓ Generated .env.local file', 'green');
    
    // Validate configuration
    const isValid = validateEnvironmentVariables(envVars);
    
    if (isValid) {
      log('✓ Environment configuration is valid', 'green');
    }
    
    // Generate deployment instructions
    generateNetlifyInstructions(environment);
    generateSupabaseInstructions();
    
    // Generate documentation
    if (!fs.existsSync('docs')) {
      fs.mkdirSync('docs');
    }
    generateDocumentation();
    
    log('\n🎉 Environment setup complete!', 'green');
    log('\nNext steps:', 'bright');
    log('1. Review and update .env.local with your actual values');
    log('2. Set backend variables in Supabase Dashboard');
    log('3. Set build variables in Netlify Dashboard');
    log('4. Run npm run dev to start development');
    
  } catch (error) {
    log(`\n❌ Setup failed: ${error.message}`, 'red');
  } finally {
    rl.close();
  }
}

// Run the setup if called directly
if (process.argv[1] && process.argv[1].includes('setup-environment.js')) {
  main();
}

export {
  validateEnvironmentVariables,
  generateEnvFile
};