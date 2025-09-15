# Comprehensive Test Suite Documentation

This document describes the comprehensive test suite for the Enhanced RAG System, covering all aspects of testing from unit tests to end-to-end workflows.

## 📋 Test Suite Overview

The test suite is organized into six main categories:

### 1. Unit Tests (`src/test/**/*.test.{ts,tsx}`)
- **Purpose**: Test individual components, functions, and services in isolation
- **Coverage**: All React components, utility functions, services, and hooks
- **Tools**: Vitest, React Testing Library, Jest DOM
- **Run Command**: `npm run test:unit`

### 2. Integration Tests (`src/test/integration/`)
- **Purpose**: Test API endpoints and service integrations
- **Coverage**: Supabase client interactions, Edge Functions, database operations
- **Tools**: Vitest with mocked Supabase client
- **Run Command**: `npm run test:integration`

### 3. End-to-End Tests (`src/test/e2e/`)
- **Purpose**: Test complete user workflows and scenarios
- **Coverage**: Document upload, search, chat, management, permissions
- **Tools**: Vitest, React Testing Library, User Event
- **Run Command**: `npm run test:e2e`

### 4. Performance Tests (`src/test/performance/`)
- **Purpose**: Validate performance benchmarks and optimization
- **Coverage**: Document processing, search performance, UI rendering, memory usage
- **Tools**: Custom performance measurement utilities
- **Run Command**: `npm run test:performance`

### 5. Accessibility Tests (`src/test/accessibility/`)
- **Purpose**: Ensure WCAG compliance and accessibility standards
- **Coverage**: All UI components, keyboard navigation, screen reader support
- **Tools**: Jest-axe, React Testing Library
- **Run Command**: `npm run test:accessibility`

### 6. CI Health Checks (`src/test/ci/`)
- **Purpose**: Validate deployment environment and system health
- **Coverage**: Environment variables, database connectivity, security checks
- **Tools**: Custom validation scripts
- **Run Command**: `npm run test:ci`

## 🚀 Running Tests

### Quick Start
```bash
# Run all tests
npm test

# Run comprehensive test suite
npm run test:comprehensive

# Run specific test category
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:performance
npm run test:accessibility
npm run test:ci
```

### Development Workflow
```bash
# Watch mode for development
npm run test:watch

# Watch mode with coverage
npm run test:watch:coverage

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

### Advanced Usage
```bash
# Run specific test suite
npm run test:comprehensive -- --suite unit

# Run tests with custom timeout
npm run test:performance -- --testTimeout=300000

# Run tests in parallel
npm run test:unit -- --threads

# Run tests with verbose output
npm run test:integration -- --reporter=verbose
```

## 📊 Coverage Requirements

The test suite maintains the following coverage thresholds:

- **Lines**: 80% minimum
- **Functions**: 80% minimum  
- **Branches**: 75% minimum
- **Statements**: 80% minimum

Coverage is automatically generated for unit and integration tests and reported in CI/CD pipelines.

## 🔧 Test Configuration

### Vitest Configuration (`vitest.config.ts`)
- Environment: jsdom for React component testing
- Setup files: Global test setup and mocks
- Coverage provider: v8 for accurate coverage reporting
- Aliases: Path resolution for imports

### Test Setup (`src/test/setup.ts`)
- Jest DOM matchers for enhanced assertions
- Global mocks for browser APIs (IntersectionObserver, ResizeObserver, etc.)
- Window object mocking for testing environment

## 🧪 Test Patterns and Best Practices

### Component Testing
```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentName } from '@/components/ComponentName';

describe('ComponentName', () => {
  it('should render correctly', () => {
    render(<ComponentName />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should handle user interactions', async () => {
    const user = userEvent.setup();
    render(<ComponentName />);
    
    await user.click(screen.getByRole('button'));
    expect(screen.getByText('Expected Result')).toBeInTheDocument();
  });
});
```

### Service Testing
```typescript
import { vi } from 'vitest';
import { serviceName } from '@/services/serviceName';

vi.mock('@/integrations/supabase/client');

describe('serviceName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should perform expected operation', async () => {
    const mockData = { id: '1', name: 'test' };
    // Mock implementation
    const result = await serviceName.operation(mockData);
    expect(result).toEqual(expectedResult);
  });
});
```

### Integration Testing
```typescript
describe('API Integration', () => {
  it('should handle API responses correctly', async () => {
    const mockResponse = { data: [], error: null };
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockResolvedValue(mockResponse),
    });

    const result = await apiCall();
    expect(result).toEqual(mockResponse);
  });
});
```

## 🔍 Debugging Tests

### Common Issues and Solutions

1. **Component Not Rendering**
   - Check if all required props are provided
   - Verify mock implementations are correct
   - Ensure providers (QueryClient, Router) are wrapped

2. **Async Operations Failing**
   - Use `waitFor` for async state changes
   - Mock async dependencies properly
   - Check timeout configurations

3. **Mock Issues**
   - Clear mocks between tests with `vi.clearAllMocks()`
   - Verify mock implementations match expected interface
   - Use `vi.restoreAllMocks()` in cleanup

### Debug Commands
```bash
# Run single test file
npm test -- ComponentName.test.tsx

# Run tests with debug output
npm test -- --reporter=verbose

# Run tests in watch mode for debugging
npm run test:watch -- ComponentName.test.tsx
```

## 📈 Performance Benchmarks

### Expected Performance Thresholds

| Operation | Threshold | Measurement |
|-----------|-----------|-------------|
| Document Processing | 15ms per document | Processing time |
| File Upload | 200ms per MB | Upload duration |
| Vector Search | 500ms | Search completion |
| UI Rendering (1000 items) | 2000ms | Render time |
| Memory Usage | 1GB max | Peak memory |

### Performance Test Structure
```typescript
const measurePerformance = async (fn: () => Promise<any>, label: string) => {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  
  console.log(`${label}: ${duration.toFixed(2)}ms`);
  return { result, duration };
};
```

## ♿ Accessibility Testing

### WCAG Compliance Levels
- **Level A**: Basic accessibility (required)
- **Level AA**: Standard accessibility (target)
- **Level AAA**: Enhanced accessibility (aspirational)

### Accessibility Test Categories
1. **Keyboard Navigation**: Tab order, focus management
2. **Screen Reader Support**: ARIA labels, semantic HTML
3. **Color Contrast**: Minimum 4.5:1 ratio for normal text
4. **Focus Indicators**: Visible focus states
5. **Alternative Text**: Images and interactive elements

### Accessibility Test Example
```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

it('should have no accessibility violations', async () => {
  const { container } = render(<Component />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

## 🔒 Security Testing

### Security Test Categories
1. **Input Validation**: XSS prevention, SQL injection
2. **Authentication**: Token validation, session management
3. **Authorization**: Permission checks, access control
4. **Data Sanitization**: Output encoding, content filtering
5. **Environment Security**: Secret management, CORS configuration

### Security Test Patterns
```typescript
describe('Security', () => {
  it('should sanitize user input', () => {
    const maliciousInput = '<script>alert("xss")</script>';
    const sanitized = sanitizeInput(maliciousInput);
    expect(sanitized).not.toContain('<script>');
  });

  it('should validate permissions', async () => {
    const unauthorizedUser = { role: 'user' };
    await expect(adminOnlyFunction(unauthorizedUser))
      .rejects.toThrow('Insufficient permissions');
  });
});
```

## 🚀 Continuous Integration

### GitHub Actions Workflow
The CI pipeline runs all test suites automatically on:
- Push to main/develop branches
- Pull request creation/updates
- Daily scheduled runs (2 AM UTC)

### CI Test Stages
1. **Setup**: Environment validation, dependency installation
2. **Quality**: Type checking, linting, formatting
3. **Unit Tests**: Component and service testing with coverage
4. **Integration Tests**: API and database testing
5. **E2E Tests**: Complete workflow testing (multiple browsers)
6. **Performance Tests**: Benchmark validation
7. **Accessibility Tests**: WCAG compliance checking
8. **Security Tests**: Vulnerability scanning and health checks

### Environment Variables Required for CI
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 📝 Test Maintenance

### Regular Maintenance Tasks
1. **Update Test Dependencies**: Keep testing libraries current
2. **Review Coverage Reports**: Identify untested code paths
3. **Performance Baseline Updates**: Adjust thresholds as needed
4. **Accessibility Standards**: Stay current with WCAG updates
5. **Security Vulnerability Scans**: Regular dependency audits

### Adding New Tests
1. Create test file in appropriate category directory
2. Follow established naming conventions (`*.test.{ts,tsx}`)
3. Include comprehensive test cases (happy path, edge cases, errors)
4. Update this documentation if adding new test patterns
5. Ensure tests pass in CI environment

### Test File Organization
```
src/test/
├── setup.ts                          # Global test setup
├── test-runner.ts                     # Comprehensive test runner
├── README.md                          # This documentation
├── **/*.test.{ts,tsx}                # Unit tests (co-located)
├── integration/                       # Integration tests
│   └── api-endpoints.test.ts
├── e2e/                              # End-to-end tests
│   └── user-workflows.test.tsx
├── performance/                       # Performance benchmarks
│   └── performance-benchmarks.test.ts
├── accessibility/                     # Accessibility tests
│   └── wcag-compliance.test.tsx
└── ci/                               # CI health checks
    └── continuous-integration.test.ts
```

## 🎯 Test Quality Metrics

### Key Performance Indicators (KPIs)
- **Test Coverage**: >80% across all categories
- **Test Execution Time**: <5 minutes for full suite
- **Test Reliability**: <1% flaky test rate
- **Bug Detection Rate**: >90% of bugs caught by tests
- **Performance Regression Detection**: 100% of performance issues caught

### Monitoring and Reporting
- Coverage reports generated automatically
- Performance benchmarks tracked over time
- Accessibility compliance monitored continuously
- Security vulnerability alerts configured
- Test execution metrics collected in CI/CD

This comprehensive test suite ensures the Enhanced RAG System maintains high quality, performance, and reliability standards throughout development and deployment.