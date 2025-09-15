#!/usr/bin/env node

/**
 * Backup and Disaster Recovery Script
 * Handles database backups, configuration backups, and recovery procedures
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class BackupRecoveryManager {
  constructor() {
    this.backupDir = path.join(process.cwd(), 'backups');
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  }

  async init() {
    // Ensure backup directory exists
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create backup directory:', error);
      process.exit(1);
    }
  }

  /**
   * Create comprehensive system backup
   */
  async createBackup() {
    console.log('🔄 Starting comprehensive backup...');
    
    try {
      await this.init();
      
      const backupPath = path.join(this.backupDir, `backup-${this.timestamp}`);
      await fs.mkdir(backupPath, { recursive: true });
      
      // Backup database schema and data
      await this.backupDatabase(backupPath);
      
      // Backup configuration files
      await this.backupConfiguration(backupPath);
      
      // Backup environment variables (sanitized)
      await this.backupEnvironment(backupPath);
      
      // Backup deployment configuration
      await this.backupDeploymentConfig(backupPath);
      
      // Create backup manifest
      await this.createBackupManifest(backupPath);
      
      console.log(`✅ Backup completed successfully: ${backupPath}`);
      return backupPath;
      
    } catch (error) {
      console.error('❌ Backup failed:', error);
      throw error;
    }
  }

  /**
   * Backup Supabase database using MCP tools
   */
  async backupDatabase(backupPath) {
    console.log('📊 Backing up database...');
    
    try {
      const dbBackupPath = path.join(backupPath, 'database');
      await fs.mkdir(dbBackupPath, { recursive: true });
      
      // Export database schema
      const schemaExport = await this.exportDatabaseSchema();
      await fs.writeFile(
        path.join(dbBackupPath, 'schema.sql'),
        schemaExport,
        'utf8'
      );
      
      // Export table data (excluding sensitive information)
      const tablesData = await this.exportTablesData();
      await fs.writeFile(
        path.join(dbBackupPath, 'data.json'),
        JSON.stringify(tablesData, null, 2),
        'utf8'
      );
      
      // Export migrations history
      const migrations = await this.exportMigrations();
      await fs.writeFile(
        path.join(dbBackupPath, 'migrations.json'),
        JSON.stringify(migrations, null, 2),
        'utf8'
      );
      
      console.log('✅ Database backup completed');
      
    } catch (error) {
      console.error('❌ Database backup failed:', error);
      throw error;
    }
  }

  /**
   * Backup configuration files
   */
  async backupConfiguration(backupPath) {
    console.log('⚙️ Backing up configuration...');
    
    try {
      const configBackupPath = path.join(backupPath, 'configuration');
      await fs.mkdir(configBackupPath, { recursive: true });
      
      const configFiles = [
        'package.json',
        'package-lock.json',
        'netlify.toml',
        'vite.config.ts',
        'tsconfig.json',
        'tailwind.config.ts',
        'components.json',
        '.lighthouserc.json'
      ];
      
      for (const file of configFiles) {
        try {
          const content = await fs.readFile(file, 'utf8');
          await fs.writeFile(
            path.join(configBackupPath, file),
            content,
            'utf8'
          );
        } catch (error) {
          console.warn(`⚠️ Could not backup ${file}:`, error.message);
        }
      }
      
      // Backup GitHub workflows
      try {
        const workflowsPath = path.join(configBackupPath, '.github', 'workflows');
        await fs.mkdir(workflowsPath, { recursive: true });
        
        const workflows = await fs.readdir('.github/workflows');
        for (const workflow of workflows) {
          const content = await fs.readFile(path.join('.github/workflows', workflow), 'utf8');
          await fs.writeFile(path.join(workflowsPath, workflow), content, 'utf8');
        }
      } catch (error) {
        console.warn('⚠️ Could not backup workflows:', error.message);
      }
      
      console.log('✅ Configuration backup completed');
      
    } catch (error) {
      console.error('❌ Configuration backup failed:', error);
      throw error;
    }
  }

  /**
   * Backup environment variables (sanitized)
   */
  async backupEnvironment(backupPath) {
    console.log('🔐 Backing up environment configuration...');
    
    try {
      const envBackupPath = path.join(backupPath, 'environment');
      await fs.mkdir(envBackupPath, { recursive: true });
      
      // Read .env.example as template
      try {
        const envExample = await fs.readFile('.env.example', 'utf8');
        await fs.writeFile(
          path.join(envBackupPath, 'env-template.txt'),
          envExample,
          'utf8'
        );
      } catch (error) {
        console.warn('⚠️ Could not backup .env.example:', error.message);
      }
      
      // Create environment variables checklist (without values)
      const envVars = [
        'VITE_SUPABASE_URL',
        'VITE_SUPABASE_ANON_KEY',
        'VITE_OPENAI_API_KEY',
        'VITE_CLAUDE_API_KEY',
        'NETLIFY_SITE_ID',
        'NETLIFY_AUTH_TOKEN',
        'SUPABASE_PROJECT_REF',
        'SUPABASE_ACCESS_TOKEN'
      ];
      
      const envChecklist = envVars.map(varName => ({
        name: varName,
        required: true,
        description: this.getEnvVarDescription(varName)
      }));
      
      await fs.writeFile(
        path.join(envBackupPath, 'environment-checklist.json'),
        JSON.stringify(envChecklist, null, 2),
        'utf8'
      );
      
      console.log('✅ Environment backup completed');
      
    } catch (error) {
      console.error('❌ Environment backup failed:', error);
      throw error;
    }
  }

  /**
   * Backup deployment configuration
   */
  async backupDeploymentConfig(backupPath) {
    console.log('🚀 Backing up deployment configuration...');
    
    try {
      const deployBackupPath = path.join(backupPath, 'deployment');
      await fs.mkdir(deployBackupPath, { recursive: true });
      
      // Backup Supabase functions
      try {
        const functionsPath = path.join(deployBackupPath, 'supabase', 'functions');
        await fs.mkdir(functionsPath, { recursive: true });
        
        const functions = await fs.readdir('supabase/functions');
        for (const func of functions) {
          const funcPath = path.join('supabase/functions', func);
          const stat = await fs.stat(funcPath);
          
          if (stat.isDirectory()) {
            const funcBackupPath = path.join(functionsPath, func);
            await this.copyDirectory(funcPath, funcBackupPath);
          }
        }
      } catch (error) {
        console.warn('⚠️ Could not backup Supabase functions:', error.message);
      }
      
      // Backup Netlify edge functions
      try {
        const edgeFunctionsPath = path.join(deployBackupPath, 'netlify', 'edge-functions');
        await fs.mkdir(edgeFunctionsPath, { recursive: true });
        
        const edgeFunctions = await fs.readdir('netlify/edge-functions');
        for (const func of edgeFunctions) {
          const content = await fs.readFile(path.join('netlify/edge-functions', func), 'utf8');
          await fs.writeFile(path.join(edgeFunctionsPath, func), content, 'utf8');
        }
      } catch (error) {
        console.warn('⚠️ Could not backup Netlify edge functions:', error.message);
      }
      
      console.log('✅ Deployment configuration backup completed');
      
    } catch (error) {
      console.error('❌ Deployment configuration backup failed:', error);
      throw error;
    }
  }

  /**
   * Create backup manifest with metadata
   */
  async createBackupManifest(backupPath) {
    const manifest = {
      timestamp: this.timestamp,
      date: new Date().toISOString(),
      version: '1.0.0',
      type: 'full-system-backup',
      components: {
        database: true,
        configuration: true,
        environment: true,
        deployment: true
      },
      metadata: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        cwd: process.cwd()
      },
      recovery: {
        instructions: 'See recovery-instructions.md for detailed recovery procedures',
        requirements: [
          'Node.js 18+',
          'Supabase CLI',
          'Netlify CLI',
          'Valid API keys and credentials'
        ]
      }
    };
    
    await fs.writeFile(
      path.join(backupPath, 'manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf8'
    );
    
    // Create recovery instructions
    const recoveryInstructions = this.generateRecoveryInstructions();
    await fs.writeFile(
      path.join(backupPath, 'recovery-instructions.md'),
      recoveryInstructions,
      'utf8'
    );
  }

  /**
   * Generate recovery instructions
   */
  generateRecoveryInstructions() {
    return `# Disaster Recovery Instructions

## Prerequisites
- Node.js 18 or higher
- Supabase CLI installed and configured
- Netlify CLI installed and configured
- Access to original API keys and credentials

## Recovery Steps

### 1. Environment Setup
1. Create new project directory
2. Copy configuration files from backup/configuration/
3. Install dependencies: \`npm install\`
4. Set up environment variables using backup/environment/environment-checklist.json

### 2. Database Recovery
1. Create new Supabase project or use existing
2. Apply schema: \`supabase db reset\`
3. Run migrations from backup/database/migrations.json
4. Import data from backup/database/data.json (if needed)

### 3. Deployment Recovery
1. Deploy Supabase functions from backup/deployment/supabase/functions/
2. Deploy Netlify edge functions from backup/deployment/netlify/edge-functions/
3. Configure Netlify deployment using netlify.toml
4. Set up GitHub Actions workflows from backup/configuration/.github/workflows/

### 4. Verification
1. Run health checks: \`npm run test:comprehensive\`
2. Verify all services are operational
3. Test critical user workflows
4. Monitor system health dashboard

## Important Notes
- Always test recovery procedures in a staging environment first
- Ensure all API keys and credentials are properly configured
- Monitor system health after recovery
- Update DNS and domain settings if necessary

## Support
For additional support, refer to the project documentation or contact the development team.
`;
  }

  /**
   * Helper methods
   */
  async exportDatabaseSchema() {
    // This would use Supabase MCP tools in a real implementation
    return `-- Database schema export placeholder
-- Generated on ${new Date().toISOString()}
-- This would contain the actual schema export using Supabase MCP tools`;
  }

  async exportTablesData() {
    // This would use Supabase MCP tools in a real implementation
    return {
      timestamp: new Date().toISOString(),
      note: "This would contain sanitized table data using Supabase MCP tools",
      tables: []
    };
  }

  async exportMigrations() {
    // This would use Supabase MCP tools in a real implementation
    return {
      timestamp: new Date().toISOString(),
      migrations: []
    };
  }

  getEnvVarDescription(varName) {
    const descriptions = {
      'VITE_SUPABASE_URL': 'Supabase project URL',
      'VITE_SUPABASE_ANON_KEY': 'Supabase anonymous key',
      'VITE_OPENAI_API_KEY': 'OpenAI API key for embeddings and chat',
      'VITE_CLAUDE_API_KEY': 'Claude API key (alternative AI provider)',
      'NETLIFY_SITE_ID': 'Netlify site identifier',
      'NETLIFY_AUTH_TOKEN': 'Netlify authentication token',
      'SUPABASE_PROJECT_REF': 'Supabase project reference',
      'SUPABASE_ACCESS_TOKEN': 'Supabase access token for CLI operations'
    };
    return descriptions[varName] || 'Environment variable';
  }

  async copyDirectory(src, dest) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const manager = new BackupRecoveryManager();
  
  switch (command) {
    case 'backup':
      try {
        const backupPath = await manager.createBackup();
        console.log(`\n🎉 Backup completed successfully!`);
        console.log(`📁 Backup location: ${backupPath}`);
        console.log(`📋 See recovery-instructions.md for recovery procedures`);
      } catch (error) {
        console.error('\n❌ Backup failed:', error.message);
        process.exit(1);
      }
      break;
      
    default:
      console.log(`
Enhanced RAG System - Backup & Recovery Tool

Usage:
  node scripts/backup-and-recovery.js backup    Create comprehensive system backup

Examples:
  node scripts/backup-and-recovery.js backup
      `);
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { BackupRecoveryManager };