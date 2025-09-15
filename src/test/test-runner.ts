import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import path from 'path';

interface TestSuite {
  name: string;
  pattern: string;
  timeout?: number;
  coverage?: boolean;
  parallel?: boolean;
}

interface TestResults {
  suite: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage?: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
}

class ComprehensiveTestRunner {
  private testSuites: TestSuite[] = [
    {
      name: 'Unit Tests',
      pattern: 'src/test/**/*.test.{ts,tsx}',
      timeout: 30000,
      coverage: true,
      parallel: true,
    },
    {
      name: 'Integration Tests',
      pattern: 'src/test/integration/**/*.test.{ts,tsx}',
      timeout: 60000,
      coverage: true,
      parallel: false,
    },
    {
      name: 'End-to-End Tests',
      pattern: 'src/test/e2e/**/*.test.{ts,tsx}',
      timeout: 120000,
      coverage: false,
      parallel: false,
    },
    {
      name: 'Performance Tests',
      pattern: 'src/test/performance/**/*.test.{ts,tsx}',
      timeout: 180000,
      coverage: false,
      parallel: false,
    },
    {
      name: 'Accessibility Tests',
      pattern: 'src/test/accessibility/**/*.test.{ts,tsx}',
      timeout: 60000,
      coverage: false,
      parallel: true,
    },
    {
      name: 'CI Health Checks',
      pattern: 'src/test/ci/**/*.test.{ts,tsx}',
      timeout: 30000,
      coverage: false,
      parallel: true,
    },
  ];

  private results: TestResults[] = [];

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Comprehensive Test Suite');
    console.log('=====================================\n');

    const startTime = Date.now();

    for (const suite of this.testSuites) {
      await this.runTestSuite(suite);
    }

    const totalTime = Date.now() - startTime;
    this.printSummary(totalTime);
  }

  private async runTestSuite(suite: TestSuite): Promise<void> {
    console.log(`📋 Running ${suite.name}...`);
    
    const startTime = Date.now();
    
    try {
      const command = this.buildTestCommand(suite);
      const output = execSync(command, { 
        encoding: 'utf8',
        timeout: suite.timeout,
        stdio: 'pipe',
      });

      const result = this.parseTestOutput(output, suite.name);
      result.duration = Date.now() - startTime;
      
      this.results.push(result);
      
      console.log(`✅ ${suite.name} completed: ${result.passed} passed, ${result.failed} failed`);
      
      if (suite.coverage && result.coverage) {
        console.log(`📊 Coverage: ${result.coverage.lines}% lines, ${result.coverage.functions}% functions`);
      }
      
    } catch (error: any) {
      console.error(`❌ ${suite.name} failed:`, error.message);
      
      this.results.push({
        suite: suite.name,
        passed: 0,
        failed: 1,
        skipped: 0,
        duration: Date.now() - startTime,
      });
    }
    
    console.log('');
  }

  private buildTestCommand(suite: TestSuite): string {
    let command = 'npx vitest run';
    
    // Add pattern
    command += ` "${suite.pattern}"`;
    
    // Add coverage if needed
    if (suite.coverage) {
      command += ' --coverage';
    }
    
    // Add parallel/sequential execution
    if (!suite.parallel) {
      command += ' --no-threads';
    }
    
    // Add timeout
    if (suite.timeout) {
      command += ` --testTimeout=${suite.timeout}`;
    }
    
    // Add reporter
    command += ' --reporter=verbose';
    
    return command;
  }

  private parseTestOutput(output: string, suiteName: string): TestResults {
    // Parse vitest output to extract test results
    const lines = output.split('\n');
    
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let coverage: TestResults['coverage'];

    // Parse test results
    for (const line of lines) {
      if (line.includes('✓') || line.includes('PASS')) {
        passed++;
      } else if (line.includes('✗') || line.includes('FAIL')) {
        failed++;
      } else if (line.includes('○') || line.includes('SKIP')) {
        skipped++;
      }
      
      // Parse coverage if present
      if (line.includes('Lines') && line.includes('%')) {
        const coverageMatch = line.match(/(\d+\.?\d*)%/g);
        if (coverageMatch && coverageMatch.length >= 4) {
          coverage = {
            lines: parseFloat(coverageMatch[0]),
            functions: parseFloat(coverageMatch[1]),
            branches: parseFloat(coverageMatch[2]),
            statements: parseFloat(coverageMatch[3]),
          };
        }
      }
    }

    return {
      suite: suiteName,
      passed,
      failed,
      skipped,
      duration: 0, // Will be set by caller
      coverage,
    };
  }

  private printSummary(totalTime: number): void {
    console.log('📊 Test Suite Summary');
    console.log('====================\n');

    const totalPassed = this.results.reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = this.results.reduce((sum, r) => sum + r.failed, 0);
    const totalSkipped = this.results.reduce((sum, r) => sum + r.skipped, 0);
    const totalTests = totalPassed + totalFailed + totalSkipped;

    // Print individual suite results
    this.results.forEach(result => {
      const status = result.failed === 0 ? '✅' : '❌';
      const duration = (result.duration / 1000).toFixed(2);
      
      console.log(`${status} ${result.suite}: ${result.passed}/${result.passed + result.failed} passed (${duration}s)`);
      
      if (result.coverage) {
        console.log(`   📊 Coverage: ${result.coverage.lines}% lines, ${result.coverage.functions}% functions`);
      }
    });

    console.log('');

    // Print overall summary
    console.log(`📈 Overall Results:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${totalPassed} (${((totalPassed / totalTests) * 100).toFixed(1)}%)`);
    console.log(`   Failed: ${totalFailed} (${((totalFailed / totalTests) * 100).toFixed(1)}%)`);
    console.log(`   Skipped: ${totalSkipped} (${((totalSkipped / totalTests) * 100).toFixed(1)}%)`);
    console.log(`   Total Time: ${(totalTime / 1000).toFixed(2)}s`);

    // Print coverage summary
    const coverageResults = this.results.filter(r => r.coverage);
    if (coverageResults.length > 0) {
      const avgCoverage = {
        lines: coverageResults.reduce((sum, r) => sum + (r.coverage?.lines || 0), 0) / coverageResults.length,
        functions: coverageResults.reduce((sum, r) => sum + (r.coverage?.functions || 0), 0) / coverageResults.length,
        branches: coverageResults.reduce((sum, r) => sum + (r.coverage?.branches || 0), 0) / coverageResults.length,
        statements: coverageResults.reduce((sum, r) => sum + (r.coverage?.statements || 0), 0) / coverageResults.length,
      };

      console.log(`\n📊 Average Coverage:`);
      console.log(`   Lines: ${avgCoverage.lines.toFixed(1)}%`);
      console.log(`   Functions: ${avgCoverage.functions.toFixed(1)}%`);
      console.log(`   Branches: ${avgCoverage.branches.toFixed(1)}%`);
      console.log(`   Statements: ${avgCoverage.statements.toFixed(1)}%`);
    }

    // Exit with appropriate code
    const hasFailures = totalFailed > 0;
    if (hasFailures) {
      console.log('\n❌ Test suite completed with failures');
      process.exit(1);
    } else {
      console.log('\n✅ All tests passed successfully!');
      process.exit(0);
    }
  }

  async runSpecificSuite(suiteName: string): Promise<void> {
    const suite = this.testSuites.find(s => s.name.toLowerCase().includes(suiteName.toLowerCase()));
    
    if (!suite) {
      console.error(`❌ Test suite "${suiteName}" not found`);
      console.log('Available suites:');
      this.testSuites.forEach(s => console.log(`  - ${s.name}`));
      process.exit(1);
    }

    console.log(`🚀 Running ${suite.name} only\n`);
    await this.runTestSuite(suite);
    
    const result = this.results[0];
    if (result.failed > 0) {
      process.exit(1);
    }
  }

  async validateTestEnvironment(): Promise<void> {
    console.log('🔍 Validating test environment...\n');

    // Check required files
    const requiredFiles = [
      'vitest.config.ts',
      'src/test/setup.ts',
      'package.json',
    ];

    for (const file of requiredFiles) {
      if (!existsSync(file)) {
        console.error(`❌ Required file missing: ${file}`);
        process.exit(1);
      }
    }

    // Check package.json for required dependencies
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    const requiredDeps = [
      'vitest',
      '@testing-library/react',
      '@testing-library/jest-dom',
      '@testing-library/user-event',
    ];

    for (const dep of requiredDeps) {
      if (!packageJson.devDependencies?.[dep] && !packageJson.dependencies?.[dep]) {
        console.error(`❌ Required dependency missing: ${dep}`);
        process.exit(1);
      }
    }

    // Check environment variables
    const requiredEnvVars = [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY',
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        console.warn(`⚠️  Environment variable not set: ${envVar}`);
      }
    }

    console.log('✅ Test environment validation passed\n');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const runner = new ComprehensiveTestRunner();

  try {
    await runner.validateTestEnvironment();

    if (args.length === 0) {
      await runner.runAllTests();
    } else if (args[0] === '--suite' && args[1]) {
      await runner.runSpecificSuite(args[1]);
    } else if (args[0] === '--help') {
      console.log('Comprehensive Test Runner');
      console.log('========================\n');
      console.log('Usage:');
      console.log('  npm run test:comprehensive              # Run all test suites');
      console.log('  npm run test:comprehensive --suite unit # Run specific suite');
      console.log('  npm run test:comprehensive --help       # Show this help');
      console.log('\nAvailable suites:');
      console.log('  - unit');
      console.log('  - integration');
      console.log('  - e2e');
      console.log('  - performance');
      console.log('  - accessibility');
      console.log('  - ci');
    } else {
      console.error('❌ Invalid arguments. Use --help for usage information.');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Test runner failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { ComprehensiveTestRunner };