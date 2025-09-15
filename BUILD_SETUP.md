# Enhanced RAG System - Build Setup Documentation

## Overview

This document outlines the enhanced build tools and development setup for the Enhanced RAG Education Platform.

## Dependencies Added

### Testing Framework
- **Vitest**: Modern testing framework with native TypeScript support
- **@testing-library/react**: React component testing utilities
- **@testing-library/jest-dom**: Custom Jest matchers for DOM testing
- **@testing-library/user-event**: User interaction simulation
- **@vitest/coverage-v8**: Code coverage reporting
- **@vitest/ui**: Interactive test UI

### Code Quality Tools
- **Prettier**: Code formatting
- **Enhanced ESLint**: Stricter linting rules with TypeScript support

### Enhanced RAG Dependencies
- **react-dropzone**: File upload with drag-and-drop
- **pdf-parse**: PDF text extraction
- **openai**: OpenAI API integration
- **@types/pdf-parse**: TypeScript types for pdf-parse

## Scripts Available

```bash
# Development
npm run dev                 # Start development server
npm run build              # Production build
npm run build:dev          # Development build
npm run preview            # Preview production build

# Code Quality
npm run lint               # Run ESLint
npm run lint:fix           # Fix ESLint issues automatically
npm run format             # Format code with Prettier
npm run format:check       # Check code formatting
npm run type-check         # TypeScript type checking

# Testing
npm run test               # Run tests in watch mode
npm run test:ui            # Run tests with interactive UI
npm run test:run           # Run tests once
npm run test:coverage      # Run tests with coverage report
```

## Configuration Files

### Vitest Configuration (`vitest.config.ts`)
- Configured for React testing with jsdom environment
- Code coverage thresholds set to 80%
- Test setup file for global mocks and utilities

### ESLint Configuration (`eslint.config.js`)
- Enhanced TypeScript rules
- React hooks validation
- Stricter code quality rules
- Separate rules for test files

### Prettier Configuration (`.prettierrc`)
- Consistent code formatting
- Single quotes, semicolons, 2-space indentation
- Line width of 80 characters

### TypeScript Configuration
- Strict mode enabled for better type safety
- Enhanced compiler options for production code
- Path aliases configured for clean imports

### Netlify Configuration (`netlify.toml`)
- Production deployment settings
- Security headers configuration
- Asset caching optimization
- SPA routing support

## Testing Setup

### Test Structure
```
src/test/
├── setup.ts          # Global test setup and mocks
├── App.test.tsx      # Application component tests
└── utils.test.ts     # Utility function tests
```

### Test Utilities
- Global mocks for browser APIs (IntersectionObserver, ResizeObserver)
- Jest DOM matchers for enhanced assertions
- React Testing Library for component testing

### Coverage Requirements
- Minimum 80% coverage for branches, functions, lines, and statements
- Coverage reports generated in HTML and JSON formats

## Development Workflow

1. **Code Development**: Write code with TypeScript strict mode
2. **Linting**: ESLint catches code quality issues
3. **Formatting**: Prettier ensures consistent code style
4. **Testing**: Vitest runs tests with coverage reporting
5. **Type Checking**: TypeScript compiler validates types
6. **Building**: Vite optimizes for production deployment

## Deployment

### Netlify Deployment
- Automatic deployments from Git repository
- Environment-specific build commands
- Security headers and caching configuration
- SPA routing support with redirects

### Build Optimization
- Code splitting for vendor libraries and UI components
- Tree shaking for unused code elimination
- Asset optimization and compression
- Source maps for development builds

## Environment Variables

Required environment variables for the enhanced RAG system:
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Performance Monitoring

- Bundle analysis with Vite rollup options
- Code splitting for optimal loading
- Asset caching strategies
- Build time optimization

## Next Steps

1. Run `npm run test:coverage` to establish baseline coverage
2. Configure CI/CD pipeline with GitHub Actions
3. Set up environment variables in Netlify
4. Enable automatic deployments from main branch

## Troubleshooting

### Common Issues
- **Build Failures**: Check TypeScript errors with `npm run type-check`
- **Test Failures**: Run `npm run test:ui` for interactive debugging
- **Linting Issues**: Use `npm run lint:fix` for auto-fixes
- **Formatting Issues**: Run `npm run format` to fix formatting

### Performance Issues
- Use `npm run build` to check bundle sizes
- Analyze bundle with Vite's built-in analyzer
- Check for unused dependencies and imports