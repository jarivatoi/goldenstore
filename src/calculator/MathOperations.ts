/**
 * MATH OPERATIONS MODULE
 * ======================
 * 
 * Contains all mathematical functions and calculation logic
 * Provides pure functions for arithmetic operations and expression evaluation
 */

import { CalculationStep } from '../types';

export interface CalculationResult {
  result: number;
  isValid: boolean;
  error?: string;
}

export interface ExpressionContext {
  expression: string;
  variables?: Record<string, number>;
  precision?: number;
}

export class MathOperations {
  private static readonly MAX_PRECISION = 10;
  private static readonly MAX_SAFE_VALUE = 999999999999;
  private static readonly MIN_SAFE_VALUE = -999999999999;

  /**
   * Basic arithmetic operations
   */
  public static add(a: number, b: number): CalculationResult {
    try {
      const result = a + b ;
      return this.validateResult(result);
    } catch (error) {
      return { result: 0, isValid: false, error: 'Addition failed' };
    }
  }

  public static subtract(a: number, b: number): CalculationResult {
    try {
      const result = a - b;
      return this.validateResult(result);
    } catch (error) {
      return { result: 0, isValid: false, error: 'Subtraction failed' };
    }
  }

  public static multiply(a: number, b: number): CalculationResult {
    try {
      const result = a * b;
      return this.validateResult(result);
    } catch (error) {
      return { result: 0, isValid: false, error: 'Multiplication failed' };
    }
  }

  public static divide(a: number, b: number): CalculationResult {
    try {
      if (b === 0) {
        return { result: 0, isValid: false, error: 'Division by zero' };
      }
      const result = a / b;
      return this.validateResult(result);
    } catch (error) {
      return { result: 0, isValid: false, error: 'Division failed' };
    }
  }

  /**
   * Advanced mathematical functions
   */
  public static percentage(value: number, base?: number): CalculationResult {
    try {
      if (base !== undefined) {
        // Calculate percentage of base value
        const result = (base * value) / 100;
        return this.validateResult(result);
      } else {
        // Convert to percentage
        const result = value / 100;
        return this.validateResult(result);
      }
    } catch (error) {
      return { result: 0, isValid: false, error: 'Percentage calculation failed' };
    }
  }

  public static squareRoot(value: number): CalculationResult {
    try {
      if (value < 0) {
        return { result: 0, isValid: false, error: 'Cannot calculate square root of negative number' };
      }
      const result = Math.sqrt(value);
      return this.validateResult(result);
    } catch (error) {
      return { result: 0, isValid: false, error: 'Square root calculation failed' };
    }
  }

  public static power(base: number, exponent: number): CalculationResult {
    try {
      const result = Math.pow(base, exponent);
      return this.validateResult(result);
    } catch (error) {
      return { result: 0, isValid: false, error: 'Power calculation failed' };
    }
  }

  /**
   * Expression evaluation with safety checks
   */
  public static evaluateExpression(context: ExpressionContext): CalculationResult {
    try {
      let { expression } = context;
      const precision = context.precision || this.MAX_PRECISION;

      // Sanitize expression
      expression = this.sanitizeExpression(expression);
      
      if (!expression || expression === '') {
        return { result: 0, isValid: true };
      }

      // Replace display symbols with JavaScript operators
      expression = expression
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/x/g, '*');

      // Remove trailing operators
      expression = expression.replace(/[+\-*/÷×]+$/, '');

      if (!expression) {
        return { result: 0, isValid: true };
      }

      // Evaluate using Function constructor (safer than eval)
      const result = Function('"use strict"; return (' + expression + ')')();

      if (isNaN(result) || !isFinite(result)) {
        return { result: 0, isValid: false, error: 'Invalid calculation result' };
      }

      // Round to specified precision
      const roundedResult = Math.round(result * Math.pow(10, precision)) / Math.pow(10, precision);
      
      return this.validateResult(roundedResult);
    } catch (error) {
      return { result: 0, isValid: false, error: 'Expression evaluation failed' };
    }
  }

  /**
   * Memory operations
   */
  public static memoryAdd(currentMemory: number, value: number): CalculationResult {
    return this.add(currentMemory, value);
  }

  public static memorySubtract(currentMemory: number, value: number): CalculationResult {
    return this.subtract(currentMemory, value);
  }

  public static memoryClear(): number {
    return 0;
  }

  /**
   * Calculation step processing
   */
  public static processCalculationSteps(
    steps: CalculationStep[],
    isCompound: boolean = false
  ): CalculationResult {
    try {
      if (steps.length === 0) {
        return { result: 0, isValid: true };
      }

      const expression = isCompound 
        ? this.buildCompoundExpression(steps)
        : this.buildSimpleExpression(steps);

      return this.evaluateExpression({ expression });
    } catch (error) {
      return { result: 0, isValid: false, error: 'Step processing failed' };
    }
  }

  /**
   * Build expression from simple calculation steps
   */
  private static buildSimpleExpression(steps: CalculationStep[]): string {
    let expression = '';
    
    for (const step of steps) {
      if (step.operationType === 'number') {
        expression += step.result;
      } else if (step.operationType === 'operation') {
        expression += step.expression;
      }
    }
    
    return expression;
  }

  /**
   * Build expression from compound calculation steps
   */
  private static buildCompoundExpression(steps: CalculationStep[]): string {
    let expression = '';
    
    for (const step of steps) {
      if (step.operationType === 'number') {
        expression += step.result;
      } else if (step.operationType === 'operation') {
        expression += (step.operator || '') + step.result;
      }
    }
    
    return expression;
  }

  /**
   * Validate calculation result
   */
  private static validateResult(result: number): CalculationResult {
    if (isNaN(result) || !isFinite(result)) {
      return { result: 0, isValid: false, error: 'Invalid number' };
    }

    if (result > this.MAX_SAFE_VALUE || result < this.MIN_SAFE_VALUE) {
      return { result: 0, isValid: false, error: 'Number too large' };
    }

    return { result, isValid: true };
  }

  /**
   * Sanitize mathematical expression
   */
  private static sanitizeExpression(expression: string): string {
    // Remove any potentially dangerous characters
    return expression.replace(/[^0-9+\-*/.()×÷\s]/g, '');
  }

  /**
   * Round number to specified decimal places
   */
  public static roundToPrecision(value: number, decimals: number = 2): number {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  /**
   * Format number for display
   */
  public static formatForDisplay(
    value: number,
    options: {
      decimals?: number;
      useThousandsSeparator?: boolean;
      currency?: string;
    } = {}
  ): string {
    const {
      decimals = 2,
      useThousandsSeparator = false,
      currency
    } = options;

    let formatted = value.toFixed(decimals);

    if (useThousandsSeparator) {
      formatted = value.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
    }

    if (currency) {
      formatted = `${currency} ${formatted}`;
    }

    return formatted;
  }

  /**
   * Check if calculation involves compound operations
   */
  public static isCompoundCalculation(steps: CalculationStep[]): boolean {
    // Check if any step contains addition or subtraction
    const hasAddSubtract = steps.some(step => 
      step.expression.includes('+') || 
      step.expression.includes('-') ||
      step.operator === '+' ||
      step.operator === '-'
    );
    
    // Check if any step contains multiplication or division
    const hasMultiplyDivide = steps.some(step => 
      step.expression.includes('*') || 
      step.expression.includes('/') || 
      step.expression.includes('×') || 
      step.expression.includes('÷') ||
      step.operator === '*' ||
      step.operator === '/' ||
      step.operator === '×' ||
      step.operator === '÷'
    );
    
    // Compound if:
    // 1. Any previous step had × or ÷
    // 2. No + or - operators exist in the calculation
    const hasNoAddSubtract = !hasAddSubtract;
    
    return hasMultiplyDivide || hasNoAddSubtract;
  }

  /**
   * Statistical functions for transaction history
   */
  public static calculateStatistics(values: number[]): {
    sum: number;
    average: number;
    min: number;
    max: number;
    count: number;
  } {
    if (values.length === 0) {
      return { sum: 0, average: 0, min: 0, max: 0, count: 0 };
    }

    const sum = values.reduce((acc, val) => acc + val, 0);
    const average = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return {
      sum: this.roundToPrecision(sum),
      average: this.roundToPrecision(average),
      min: this.roundToPrecision(min),
      max: this.roundToPrecision(max),
      count: values.length
    };
  }
}