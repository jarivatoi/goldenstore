/**
 * CALCULATOR ENGINE
 * =================
 * 
 * Main calculator class that orchestrates keypad input and mathematical operations
 * Maintains the original public API while using the new modular architecture
 */

import { KeypadHandler, KeypadState, CalculationStep } from './KeypadHandler';
import { MathOperations, CalculationResult } from './MathOperations';

export interface CalculatorConfig {
  precision?: number;
  maxMemorySlots?: number;
  enableAdvancedFunctions?: boolean;
}

export class CalculatorEngine {
  private state: KeypadState;
  private config: CalculatorConfig;
  private isActive: boolean = true;

  constructor(config: CalculatorConfig = {}) {
    this.config = {
      precision: 2,
      maxMemorySlots: 1,
      enableAdvancedFunctions: true,
      ...config
    };
    
    this.state = KeypadHandler.initializeState();
  }

  /**
   * Process calculator input (main public interface)
   * Maintains backward compatibility with existing code
   */
  public processInput(input: string): {
    value: string;
    memory: number;
    grandTotal: number;
    lastOperation: string | null;
    lastOperand: number | null;
    isNewNumber: boolean;
    isActive: boolean;
    transactionHistory: number[];
    calculationSteps: CalculationStep[];
    autoReplayActive: boolean;
    articleCount: number;
    isMarkupMode: boolean;
  } {
    // Use KeypadHandler to process input
    const result = KeypadHandler.processInput(this.state, input);
    
    this.state = result.state;
    this.isActive = result.isActive;

    // Return the expected interface format
    return {
      value: this.state.display,
      memory: this.state.memory,
      grandTotal: this.state.grandTotal,
      lastOperation: this.state.lastOperation,
      lastOperand: this.state.lastOperand,
      isNewNumber: this.state.isNewNumber,
      isActive: this.isActive,
      transactionHistory: this.state.transactionHistory,
      calculationSteps: this.state.calculationSteps,
      autoReplayActive: this.state.autoReplayActive,
      articleCount: this.state.articleCount,
      isMarkupMode: this.state.isMarkupMode || false
    };
  }

  /**
   * Get current calculator state
   */
  public getState(): KeypadState {
    return { ...this.state };
  }

  /**
   * Set calculator state (for external state management)
   */
  public setState(newState: Partial<KeypadState>): void {
    this.state = { ...this.state, ...newState };
  }

  /**
   * Reset calculator to initial state
   */
  public reset(): void {
    this.state = KeypadHandler.initializeState();
    this.isActive = false;
  }

  /**
   * Get memory value
   */
  public getMemory(): number {
    return this.state.memory;
  }

  /**
   * Set memory value
   */
  public setMemory(value: number): void {
    this.state.memory = value;
  }

  /**
   * Get grand total
   */
  public getGrandTotal(): number {
    return this.state.grandTotal;
  }

  /**
   * Clear grand total
   */
  public clearGrandTotal(): void {
    this.state.grandTotal = 0;
    this.state.transactionHistory = [];
  }

  /**
   * Get transaction history
   */
  public getTransactionHistory(): number[] {
    return [...this.state.transactionHistory];
  }

  /**
   * Get calculation statistics
   */
  public getStatistics(): {
    sum: number;
    average: number;
    min: number;
    max: number;
    count: number;
  } {
    return MathOperations.calculateStatistics(this.state.transactionHistory);
  }

  /**
   * Evaluate mathematical expression
   */
  public evaluateExpression(expression: string): CalculationResult {
    return MathOperations.evaluateExpression({
      expression,
      precision: this.config.precision
    });
  }

  /**
   * Format number for display
   */
  public formatNumber(
    value: number,
    options: {
      decimals?: number;
      useThousandsSeparator?: boolean;
      currency?: string;
    } = {}
  ): string {
    return MathOperations.formatForDisplay(value, {
      decimals: options.decimals || this.config.precision,
      useThousandsSeparator: options.useThousandsSeparator,
      currency: options.currency
    });
  }

  /**
   * Check if calculator is in error state
   */
  public isInErrorState(): boolean {
    return this.state.isError;
  }

  /**
   * Check if calculator is active
   */
  public isCalculatorActive(): boolean {
    return this.isActive;
  }

  /**
   * Get current display value
   */
  public getDisplayValue(): string {
    return this.state.display;
  }

  /**
   * Get markup mode status
   */
  public isMarkupMode(): boolean {
    return this.state.isMarkupMode || false;
  }

  /**
   * Get calculation context
   */
  public getCalculationContext(): {
    hasActiveCalculation: boolean;
    isCompoundCalculation: boolean;
    canPerformEquals: boolean;
  } {
    return KeypadHandler.getCalculationContext(this.state);
  }

  /**
   * Advanced calculation methods
   */
  public calculatePercentageOf(value: number, percentage: number): CalculationResult {
    return MathOperations.percentage(percentage, value);
  }

  public calculateSquareRoot(value: number): CalculationResult {
    return MathOperations.squareRoot(value);
  }

  public calculatePower(base: number, exponent: number): CalculationResult {
    return MathOperations.power(base, exponent);
  }

  /**
   * Memory management methods
   */
  public addToMemory(value: number): CalculationResult {
    const result = MathOperations.memoryAdd(this.state.memory, value);
    if (result.isValid) {
      this.state.memory = result.result;
    }
    return result;
  }

  public subtractFromMemory(value: number): CalculationResult {
    const result = MathOperations.memorySubtract(this.state.memory, value);
    if (result.isValid) {
      this.state.memory = result.result;
    }
    return result;
  }

  public clearMemory(): void {
    this.state.memory = MathOperations.memoryClear();
  }

  public recallMemory(): number {
    return this.state.memory;
  }

  /**
   * Batch operations for multiple calculations
   */
  public processBatchInputs(inputs: string[]): {
    results: Array<{ input: string; result: any; success: boolean }>;
    finalState: KeypadState;
  } {
    const results: Array<{ input: string; result: any; success: boolean }> = [];
    
    for (const input of inputs) {
      try {
        const result = this.processInput(input);
        results.push({ input, result, success: true });
      } catch (error) {
        results.push({ 
          input, 
          result: { error: error instanceof Error ? error.message : 'Unknown error' }, 
          success: false 
        });
      }
    }

    return {
      results,
      finalState: this.getState()
    };
  }

  /**
   * Export calculator state for persistence
   */
  public exportState(): string {
    return JSON.stringify({
      state: this.state,
      config: this.config,
      timestamp: Date.now()
    });
  }

  /**
   * Import calculator state from persistence
   */
  public importState(serializedState: string): boolean {
    try {
      const data = JSON.parse(serializedState);
      
      if (data.state && typeof data.state === 'object') {
        this.state = { ...KeypadHandler.initializeState(), ...data.state };
        
        if (data.config && typeof data.config === 'object') {
          this.config = { ...this.config, ...data.config };
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to import calculator state:', error);
      return false;
    }
  }

  /**
   * Validate current state integrity
   */
  public validateState(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (typeof this.state.display !== 'string') {
      errors.push('Invalid display value');
    }

    if (typeof this.state.memory !== 'number' || !isFinite(this.state.memory)) {
      errors.push('Invalid memory value');
    }

    if (typeof this.state.grandTotal !== 'number' || !isFinite(this.state.grandTotal)) {
      errors.push('Invalid grand total');
    }

    if (!Array.isArray(this.state.transactionHistory)) {
      errors.push('Invalid transaction history');
    }

    if (!Array.isArray(this.state.calculationSteps)) {
      errors.push('Invalid calculation steps');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}