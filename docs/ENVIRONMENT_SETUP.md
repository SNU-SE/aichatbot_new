# Environment Variables Setup Guide

This guide explains how to configure environment variables for the Enhanced RAG Education Platform across different deployment environments.

## Overview

The application uses environment variables for configuration across three main contexts:

1. **Frontend (Client-side)** - Variables prefixed with `VITE_`
2. **Backend (Edge Functions)** - Variables without `VITE_` prefix
3. **Build/Deployment** - Variables for Netlify and CI/CD

## Quick Setup

### 1. Automated Setup (Recommended)

```bash
npm run setup:env
```

This interactive script will guide you through setting up environment variables for your target environment.

### 2. Manual Setup

1. Copy the example file:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` with your actual values

3. Validate your configuration:
   ```bash
   npm run validate:env
   ```

## Environment Variables Reference

### Required Frontend Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

### Optional Frontend Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_OPENAI_API_KEY` | OpenAI API key for client features | - |
| `VITE_CLAUDE_API_KEY` | Claude API key (alternative) | - |
| `VITE_APP_NAME` | Application display name | "Enhanced RAG Education Platform" |
| `VITE_APP_VERSION` | Application version | "1.0.0" |
| `VITE_APP_ENVIRONMENT` | Current environment | "development" |

### Configuration Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_MAX_FILE_SIZE` | Max upload size (bytes) | 52428800 (50MB) |
| `VITE_ALLOWED_FILE_TYPES` | Allowed MIME types | "application/pdf" |
| `VITE_MAX_FILES_PER_UPLOAD` | Max files per upload | 10 |
| `VITE_DEFAULT_SIMILARITY_THRESHOLD` | Vector search threshold | 0.7 |
| `VITE_MAX_SEARCH_RESULTS` | Max search results | 20 |
| `VITE_MAX_CHAT_HISTORY` | Max chat messages | 100 |
| `VITE_CHAT_TIMEOUT` | Chat timeout (ms) | 30000 |

### Backend Variables (Supabase Edge Functions)

These variables should be set in the Supabase Dashboard under **Settings > Environment Variables**:

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key for embeddings/chat | Yes |
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | Yes |
| `CLAUDE_API_KEY` | Claude API key (alternative) | No |
| `SUPABASE_JWT_SECRET` | JWT secret for token validation | No |

### Netlify Build Variables

Set these in Netlify Dashboard under **Site Settings > Environment Variables**:

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `VITE_APP_ENVIRONMENT` | Environment (production/staging) | Yes |
| `NODE_VERSION` | Node.js version | Yes (18) |
| `NPM_FLAGS` | NPM installation flags | No |

## Environment-Specific Configuration

### Development Environment

```bash
# .env.local for development
VITE_APP_ENVIRONMENT=development
VITE_DEBUG_MODE=true
VITE_LOG_LEVEL=debug
VITE_ANALYTICS_ENABLED=false
```

### Staging Environment

```bash
# Netlify environment variables for staging
VITE_APP_ENVIRONMENT=staging
VITE_DEBUG_MODE=false
VITE_LOG_LEVEL=info
VITE_ANALYTICS_ENABLED=true
```

### Production Environment

```bash
# Netlify environment variables for production
VITE_APP_ENVIRONMENT=production
VITE_DEBUG_MODE=false
VITE_LOG_LEVEL=warn
VITE_ANALYTICS_ENABLED=true
VITE_RATE_LIMIT_ENABLED=true
```

## Security Best Practices

### 1. Frontend vs Backend Variables

- **Frontend variables** (`VITE_` prefix) are bundled with the app and visible to users
- **Backend variables** (no prefix) are only accessible in Edge Functions
- **Never put secrets in frontend variables**

### 2. Key Management

- Use different API keys for different environments
- Rotate keys regularly (quarterly recommended)
- Use least-privilege access for service accounts
- Monitor API key usage and set up alerts

### 3. Environment Separation

- Development: Use test/sandbox API keys
- Staging: Use separate keys from production
- Production: Use production keys with strict access controls

### 4. Version Control

- Never commit actual API keys to Git
- Use `.env.example` for documentation
- Add `.env.local` to `.gitignore`
- Use placeholder values in examples

## Deployment Setup

### 1. Supabase Configuration

1. Go to your Supabase project dashboard
2. Navigate to **Settings > Environment Variables**
3. Add the following variables:
   ```
   OPENAI_API_KEY=your_openai_key_here
   SUPABASE_URL=your_supabase_url_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

### 2. Netlify Configuration

1. Go to your Netlify site dashboard
2. Navigate to **Site Settings > Environment Variables**
3. Add the following variables:
   ```
   VITE_SUPABASE_URL=your_supabase_url_here
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   VITE_APP_ENVIRONMENT=production
   NODE_VERSION=18
   ```

### 3. GitHub Actions (if using)

Add secrets to your GitHub repository:

1. Go to **Settings > Secrets and Variables > Actions**
2. Add repository secrets for deployment keys

## Validation and Testing

### Environment Validation

```bash
# Validate current environment
npm run validate:env

# Setup new environment
npm run setup:env
```

### Testing Different Environments

```bash
# Test with development config
VITE_APP_ENVIRONMENT=development npm run dev

# Test with production config
VITE_APP_ENVIRONMENT=production npm run build
```

## Troubleshooting

### Common Issues

1. **Build fails with "environment variable not found"**
   - Check that all required `VITE_` variables are set
   - Run `npm run validate:env` to identify missing variables

2. **API calls fail in production**
   - Verify backend variables are set in Supabase Dashboard
   - Check that service role key has correct permissions

3. **Features work locally but not in deployment**
   - Ensure Netlify environment variables match local `.env.local`
   - Check that environment-specific overrides are correct

4. **Edge Functions fail to deploy**
   - Verify all required backend variables are set in Supabase
   - Check Edge Function logs for specific error messages

### Debug Commands

```bash
# Check environment loading
npm run dev -- --debug

# Validate environment configuration
npm run validate:env

# Test build with environment validation
npm run build

# Check Netlify build logs
netlify logs
```

## Migration Guide

### From Previous Versions

If upgrading from a previous version:

1. Backup your current `.env.local`
2. Copy new variables from `.env.example`
3. Run `npm run validate:env` to check compatibility
4. Update Supabase and Netlify configurations as needed

### Environment Variable Changes

- `VITE_OPENAI_API_KEY` moved to backend-only `OPENAI_API_KEY`
- Added `VITE_APP_ENVIRONMENT` for environment detection
- Added performance and security configuration variables

## Support

For additional help:

1. Check the [troubleshooting section](#troubleshooting)
2. Run `npm run validate:env` for specific error messages
3. Review Supabase and Netlify dashboard configurations
4. Check deployment logs for detailed error information