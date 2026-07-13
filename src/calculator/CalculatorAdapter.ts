/**
 * CALCULATOR ADAPTER
 * ==================
 * 
 * Adapter layer that maintains backward compatibility with the original Calculator interface
 * Maps the old processCalculatorInput function to the new modular architecture
 */

import { CalculatorEngine } from './CalculatorEngine';
import { CalculationStep } from './KeypadHandler';

// Global calculator instance for backward compatibility
let globalCalculatorInstance: CalculatorEngine | null = null;

/**
 * Get or create global calculator instance
 */
function getCalculatorInstance(): CalculatorEngine {
  if (!globalCalculatorInstance) {
    globalCalculatorInstance = new CalculatorEngine();
  }
  return globalCalculatorInstance;
}

/**
 * Original processCalculatorInput function interface (maintained for backward compatibility)
 * This function now delegates to the new modular architecture
 */
export const processCalculatorInput = (
  currentValue: string,
  input: string,
  memory: number,
  grandTotal: number = 0,
  lastOperation: string | null = null,
  lastOperand: number | null = null,
  isNewNumber: boolean = false,
  transactionHistory: number[] = [],
  calculationSteps: CalculationStep[] = [],
  articleCount: number = 0
): { 
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
} => {
  const calculator = getCalculatorInstance();
  
  // Set current state in calculator
  calculator.setState({
    display: currentValue,
    memory,
    grandTotal,
    lastOperation,
    lastOperand,
    isNewNumber,
    transactionHistory,
    calculationSteps,
    articleCount,
    isError: currentValue === 'Error',
    autoReplayActive: false
  });

  // Process the input
  const result = calculator.processInput(input);
  
  return result;
};

/**
 * Create a new calculator instance (for multiple calculators)
 */
export function createCalculator(config?: any): CalculatorEngine {
  return new CalculatorEngine(config);
}

/**
 * Reset global calculator instance
 */
export function resetGlobalCalculator(): void {
  globalCalculatorInstance = null;
}

/**
 * Get calculator statistics
 */
export function getCalculatorStatistics(): {
  sum: number;
  average: number;
  min: number;
  max: number;
  count: number;
} {
  const calculator = getCalculatorInstance();
  return calculator.getStatistics();
}

/**
 * Export calculator state
 */
export function exportCalculatorState(): string {
  const calculator = getCalculatorInstance();
  return calculator.exportState();
}

/**
 * Import calculator state
 */
export function importCalculatorState(serializedState: string): boolean {
  const calculator = getCalculatorInstance();
  return calculator.importState(serializedState);
}

// Re-export types for backward compatibility
export type { CalculationStep } from './KeypadHandler';
export type { CalculationResult } from './MathOperations';

/**
 * Re-export evaluateExpression for backward compatibility
 */
export { evaluateExpression } from '../utils/creditCalculatorUtils';