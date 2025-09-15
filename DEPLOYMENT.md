# Enhanced RAG System - Deployment Guide

This guide covers the complete deployment and monitoring infrastructure for the Enhanced RAG Education Platform.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Netlify Deployment](#netlify-deployment)
4. [Supabase Configuration](#supabase-configuration)
5. [Monitoring & Health Checks](#monitoring--health-checks)
6. [Backup & Recovery](#backup--recovery)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Tools
- Node.js 18 or higher
- npm or yarn package manager
- Git
- Netlify CLI (`npm install -g netlify-cli`)
- Supabase CLI (`npm install -g supabase`)

### Required Accounts & Services
- GitHub account (for repository and CI/CD)
- Netlify account (for hosting)
- Supabase account (for database and Edge Functions)
- OpenAI account (for AI embeddings and chat)
- Claude account (optional, alternative AI provider)

## Environment Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd enhanced-rag-system
npm install
```

### 2. Environment Variables

Create `.env.local` file based on `.env.example`:

```bash
cp .env.example .env.local
```

Configure the following variables:

#### Supabase Configuration
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### AI Provider Configuration
```env
VITE_OPENAI_API_KEY=your_openai_api_key
VITE_CLAUDE_API_KEY=your_claude_api_key  # Optional
```

#### Application Configuration
```env
VITE_APP_NAME="Enhanced RAG Education Platform"
VITE_APP_VERSION="1.0.0"
VITE_MAX_FILE_SIZE=52428800
VITE_ALLOWED_FILE_TYPES="application/pdf"
```

### 3. GitHub Secrets

Configure the following secrets in your GitHub repository:

#### Netlify Secrets
- `NETLIFY_SITE_ID`: Your Netlify site ID
- `NETLIFY_AUTH_TOKEN`: Your Netlify personal access token
- `NETLIFY_SITE_NAME`: Your Netlify site name (subdomain)

#### Supabase Secrets
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_PROJECT_REF`: Supabase project reference
- `SUPABASE_ACCESS_TOKEN`: Supabase access token
- `SUPABASE_DB_PASSWORD`: Supabase database password

#### AI Provider Secrets
- `VITE_OPENAI_API_KEY`: OpenAI API key
- `VITE_CLAUDE_API_KEY`: Claude API key (optional)

## Netlify Deployment

### 1. Manual Deployment

#### Build and Deploy
```bash
# Build for production
npm run build

# Deploy to preview
npm run deploy:preview

# Deploy to production
npm run deploy:production
```

### 2. Automatic Deployment

The repository includes GitHub Actions workflows for automatic deployment:

#### Workflow Triggers
- **Production**: Push to `main` branch
- **Preview**: Push to `develop` branch or pull requests
- **Manual**: Workflow dispatch with environment selection

#### Deployment Process
1. **Pre-deployment checks**: Environment validation
2. **Build and test**: Comprehensive testing suite
3. **Deploy**: Netlify deployment with environment-specific configuration
4. **Post-deployment**: Health checks and performance audits
5. **Edge Functions**: Supabase Edge Functions deployment
6. **Monitoring**: Setup monitoring and alerting

### 3. Netlify Configuration

The `netlify.toml` file includes:

- **Build settings**: Node.js 18, optimized build commands
- **Security headers**: CSP, HSTS, frame protection
- **Performance optimization**: Asset caching, compression
- **SPA routing**: Single-page application support
- **Edge Functions**: Health check endpoints

## Supabase Configuration

### 1. Database Setup

#### Using Supabase MCP Tools
```bash
# List current tables
supabase db list-tables

# Apply migrations
supabase db apply-migration --name="enhanced_rag_system_schema" --query="$(cat supabase/migrations/20250911000000_enhanced_rag_system_schema.sql)"

# Generate TypeScript types
supabase db generate-typescript-types
```

### 2. Edge Functions Deployment

#### Deploy All Functions
```bash
supabase functions deploy --project-ref your-project-ref
```

#### Deploy Individual Functions
```bash
supabase functions deploy enhanced-document-processor
supabase functions deploy rag-search
supabase functions deploy ai-chat-stream
```

### 3. Row Level Security (RLS)

Ensure RLS policies are properly configured:
- Document access based on user permissions
- Class-based access control
- Audit logging for all operations

## Monitoring & Health Checks

### 1. Health Check Endpoints

#### Netlify Edge Function
- **URL**: `/api/health`
- **Method**: GET
- **Response**: System health status and performance metrics

#### Manual Health Check
```bash
npm run health-check
```

### 2. Monitoring Dashboard

Access the monitoring dashboard at `/monitoring` to view:
- System health status
- Performance metrics
- Deployment information
- Service connectivity

### 3. Performance Monitoring

#### Lighthouse CI
Automated performance audits run on every deployment:
- Performance score > 80%
- Accessibility score > 90%
- Best practices score > 90%
- SEO score > 80%

#### Custom Metrics
- Page load time
- API response time
- Search response time
- Document processing time
- Memory usage

### 4. Alerting

Configure alerts for:
- System health degradation
- Performance threshold breaches
- Deployment failures
- Service outages

## Backup & Recovery

### 1. Automated Backups

#### Create Backup
```bash
npm run backup
```

This creates a comprehensive backup including:
- Database schema and data
- Configuration files
- Environment variable templates
- Deployment configurations

#### Backup Contents
```
backups/backup-YYYY-MM-DD-HH-mm-ss/
├── manifest.json
├── recovery-instructions.md
├── database/
│   ├── schema.sql
│   ├── data.json
│   └── migrations.json
├── configuration/
│   ├── package.json
│   ├── netlify.toml
│   └── .github/workflows/
├── environment/
│   ├── env-template.txt
│   └── environment-checklist.json
└── deployment/
    ├── supabase/functions/
    └── netlify/edge-functions/
```

### 2. Recovery Procedures

#### Full System Recovery
1. Set up new environment with prerequisites
2. Restore configuration files
3. Configure environment variables
4. Restore database schema and data
5. Deploy Edge Functions
6. Configure Netlify deployment
7. Verify system health

#### Partial Recovery
- **Database only**: Restore from database backup
- **Configuration only**: Restore configuration files
- **Deployment only**: Redeploy from source

### 3. Disaster Recovery Testing

Regularly test recovery procedures:
```bash
# Test backup creation
npm run backup

# Test deployment from scratch
npm run build
npm run deploy:preview

# Test health checks
npm run monitor
```

## Troubleshooting

### Common Issues

#### Build Failures
1. **Node version mismatch**: Ensure Node.js 18+
2. **Missing environment variables**: Check `.env.local` configuration
3. **Dependency conflicts**: Clear `node_modules` and reinstall

#### Deployment Issues
1. **Netlify authentication**: Verify `NETLIFY_AUTH_TOKEN`
2. **Site configuration**: Check `NETLIFY_SITE_ID`
3. **Build timeout**: Optimize build process or increase timeout

#### Database Connectivity
1. **Supabase URL**: Verify project URL format
2. **API keys**: Check anonymous key permissions
3. **RLS policies**: Ensure proper access policies

#### Performance Issues
1. **Slow API responses**: Check Supabase performance
2. **Large bundle size**: Analyze and optimize imports
3. **Memory leaks**: Monitor memory usage patterns

### Debug Commands

```bash
# Check system health
npm run health-check

# Run comprehensive tests
npm run test:comprehensive

# Check build output
npm run build

# Analyze bundle size
npm run build && npx vite-bundle-analyzer dist

# Check TypeScript errors
npm run type-check

# Lint code
npm run lint
```

### Monitoring Logs

#### Netlify Logs
```bash
netlify logs --site your-site-id
```

#### Supabase Logs
```bash
supabase logs --project-ref your-project-ref
```

#### GitHub Actions Logs
Check workflow runs in GitHub Actions tab

### Support Resources

- **Documentation**: See project README and inline code comments
- **Health Dashboard**: `/monitoring` endpoint
- **Backup System**: `npm run backup` for system snapshots
- **Test Suite**: `npm run test:comprehensive` for validation

## Security Considerations

### Environment Variables
- Never commit API keys to version control
- Use GitHub Secrets for CI/CD
- Rotate keys regularly
- Monitor for exposed credentials

### Network Security
- HTTPS enforced via Netlify
- CSP headers configured
- CORS properly configured
- Rate limiting implemented

### Data Protection
- RLS policies enforced
- Input validation and sanitization
- Audit logging enabled
- Regular security updates

## Performance Optimization

### Build Optimization
- Code splitting enabled
- Tree shaking configured
- Asset compression
- Bundle analysis

### Runtime Optimization
- Lazy loading implemented
- Virtual scrolling for large lists
- Caching strategies
- Performance monitoring

### Database Optimization
- Proper indexing
- Query optimization
- Connection pooling
- Performance monitoring

---

For additional support or questions, refer to the project documentation or contact the development team.