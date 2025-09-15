/**
 * Security Components Index
 * Exports all security-related components and utilities
 */

// Main components
export { default as SecurityDashboard } from './SecurityDashboard';
export { default as SecurityMiddleware, withSecurity } from './SecurityMiddleware';
export { default as InputValidator } from './InputValidator';
export { default as SecurityDemo } from './SecurityDemo';

// Hooks
export { 
  useSecurityContext, 
  useSecureInput, 
  useRateLimit, 
  useSecurityAudit 
} from './SecurityMiddleware';

// Types and enums
export { SecurityLevel } from './SecurityMiddleware';

// Component prop types
export type { default as SecurityDashboardProps } from './SecurityDashboard';
export type { default as InputValidatorProps } from './InputValidator';