/**
 * Input Validator Component
 * Provides real-time input validation and sanitization
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { securityService, ValidationResult } from '../../services/securityService';
import { cn } from '../../lib/utils';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface InputValidatorProps {
  value: string;
  onChange: (value: string, isValid: boolean) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'textarea';
  validationType?: 'user_input' | 'document_title' | 'document_content' | 'custom';
  customValidator?: (value: string) => ValidationResult;
  showValidationStatus?: boolean;
  showSecurityLevel?: boolean;
  disabled?: boolean;
  className?: string;
  rows?: number;
  maxLength?: number;
  required?: boolean;
  label?: string;
  description?: string;
}

interface SecurityIndicatorProps {
  level: SecurityLevel;
  className?: string;
}

enum SecurityLevel {
  SAFE = 'safe',
  WARNING = 'warning',
  DANGER = 'danger',
  BLOCKED = 'blocked'
}

// ============================================================================
// SECURITY INDICATOR COMPONENT
// ============================================================================

const SecurityIndicator: React.FC<SecurityIndicatorProps> = ({ level, className }) => {
  const getIndicatorConfig = (level: SecurityLevel) => {
    switch (level) {
      case SecurityLevel.SAFE:
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          label: 'Safe'
        };
      case SecurityLevel.WARNING:
        return {
          icon: <AlertTriangle className="h-4 w-4" />,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          label: 'Warning'
        };
      case SecurityLevel.DANGER:
        return {
          icon: <XCircle className="h-4 w-4" />,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          label: 'Danger'
        };
      case SecurityLevel.BLOCKED:
        return {
          icon: <Shield className="h-4 w-4" />,
          color: 'text-red-700',
          bgColor: 'bg-red-100',
          borderColor: 'border-red-300',
          label: 'Blocked'
        };
    }
  };

  const config = getIndicatorConfig(level);

  return (
    <Badge 
      variant="outline" 
      className={cn(
        'flex items-center gap-1',
        config.color,
        config.bgColor,
        config.borderColor,
        className
      )}
    >
      {config.icon}
      {config.label}
    </Badge>
  );
};

// ============================================================================
// INPUT VALIDATOR COMPONENT
// ============================================================================

export const InputValidator: React.FC<InputValidatorProps> = ({
  value,
  onChange,
  placeholder,
  type = 'text',
  validationType = 'user_input',
  customValidator,
  showValidationStatus = true,
  showSecurityLevel = true,
  disabled = false,
  className,
  rows = 3,
  maxLength,
  required = false,
  label,
  description
}) => {
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    isValid: true,
    errors: []
  });
  const [securityLevel, setSecurityLevel] = useState<SecurityLevel>(SecurityLevel.SAFE);
  const [showPassword, setShowPassword] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // Debounced validation
  const validateInput = useCallback(
    debounce((inputValue: string) => {
      setIsValidating(true);
      
      let result: ValidationResult;
      
      if (customValidator) {
        result = customValidator(inputValue);
      } else {
        switch (validationType) {
          case 'document_title':
            result = securityService.validateDocumentTitle(inputValue);
            break;
          case 'document_content':
            result = securityService.validateDocumentContent(inputValue);
            break;
          case 'user_input':
          default:
            result = securityService.validateUserInput(inputValue);
            break;
        }
      }

      setValidationResult(result);
      
      // Determine security level
      if (!result.isValid) {
        const hasSecurityErrors = result.errors.some(error => 
          ['SUSPICIOUS_PATTERN', 'XSS_ATTEMPT', 'SQL_INJECTION'].includes(error.code)
        );
        
        if (hasSecurityErrors) {
          setSecurityLevel(SecurityLevel.BLOCKED);
        } else {
          setSecurityLevel(SecurityLevel.DANGER);
        }
      } else if (inputValue.length > 0) {
        // Check for potential security concerns
        const hasSuspiciousContent = 
          securityService.detectXss(inputValue) || 
          securityService.detectSqlInjection(inputValue);
        
        if (hasSuspiciousContent) {
          setSecurityLevel(SecurityLevel.WARNING);
        } else {
          setSecurityLevel(SecurityLevel.SAFE);
        }
      } else {
        setSecurityLevel(SecurityLevel.SAFE);
      }
      
      setIsValidating(false);
      onChange(result.sanitizedValue || inputValue, result.isValid);
    }, 300),
    [validationType, customValidator, onChange]
  );

  useEffect(() => {
    validateInput(value);
  }, [value, validateInput]);

  const handleInputChange = (newValue: string) => {
    // Apply max length if specified
    if (maxLength && newValue.length > maxLength) {
      newValue = newValue.substring(0, maxLength);
    }
    
    onChange(newValue, validationResult.isValid);
    validateInput(newValue);
  };

  const getInputClassName = () => {
    let baseClassName = className || '';
    
    if (!validationResult.isValid) {
      baseClassName += ' border-red-500 focus:border-red-500';
    } else if (securityLevel === SecurityLevel.WARNING) {
      baseClassName += ' border-yellow-500 focus:border-yellow-500';
    } else if (value && securityLevel === SecurityLevel.SAFE) {
      baseClassName += ' border-green-500 focus:border-green-500';
    }
    
    return baseClassName;
  };

  const renderInput = () => {
    const commonProps = {
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => 
        handleInputChange(e.target.value),
      placeholder,
      disabled: disabled || securityLevel === SecurityLevel.BLOCKED,
      className: getInputClassName(),
      maxLength
    };

    if (type === 'textarea') {
      return <Textarea {...commonProps} rows={rows} />;
    }

    if (type === 'password') {
      return (
        <div className="relative">
          <Input 
            {...commonProps} 
            type={showPassword ? 'text' : 'password'}
            className={cn(commonProps.className, 'pr-10')}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      );
    }

    return <Input {...commonProps} type={type} />;
  };

  const renderValidationErrors = () => {
    if (validationResult.isValid || validationResult.errors.length === 0) {
      return null;
    }

    return (
      <div className="space-y-1">
        {validationResult.errors.map((error, index) => (
          <Alert key={index} variant="destructive" className="py-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {error.message}
            </AlertDescription>
          </Alert>
        ))}
      </div>
    );
  };

  const renderCharacterCount = () => {
    if (!maxLength) return null;

    const remaining = maxLength - value.length;
    const isNearLimit = remaining <= maxLength * 0.1;

    return (
      <div className={cn(
        'text-xs text-right',
        isNearLimit ? 'text-red-500' : 'text-muted-foreground'
      )}>
        {value.length} / {maxLength}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {/* Label */}
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {showSecurityLevel && value && (
            <SecurityIndicator level={securityLevel} />
          )}
        </div>
      )}

      {/* Description */}
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}

      {/* Input */}
      {renderInput()}

      {/* Character count */}
      {renderCharacterCount()}

      {/* Validation status */}
      {showValidationStatus && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isValidating && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <div className="animate-spin h-3 w-3 border border-gray-300 border-t-gray-600 rounded-full" />
                Validating...
              </div>
            )}
            {!isValidating && value && validationResult.isValid && (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle className="h-3 w-3" />
                Valid input
              </div>
            )}
          </div>
        </div>
      )}

      {/* Validation errors */}
      {renderValidationErrors()}

      {/* Security warning for blocked input */}
      {securityLevel === SecurityLevel.BLOCKED && (
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            This input has been blocked due to security concerns. Please modify your input and try again.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default InputValidator;