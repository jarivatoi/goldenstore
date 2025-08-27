/**
 * CREDIT CALCULATOR UTILITIES
 * ===========================
 * 
 * Utility functions for calculator operations and expression evaluation
 */

/**
 * Calculator state interface
 */
interface CalculatorState {
  display: string;
  memory: number;
  grandTotal: number;
  lastOperation: string | null;
  lastOperand: number | null;
  isNewNumber: boolean;
  isError: boolean;
}

/**
 * Calculation step interface for tracking intermediate steps
 */
interface CalculationStep {
  expression: string;
  result: number;
  timestamp: number;
  stepNumber: number;
  operationType: 'number' | 'operation' | 'result';
  displayValue: string; // What should be shown in display during CHECK
}

/**
 * Initialize calculator state
 */
export const initCalculatorState = (): CalculatorState => ({
  display: '0',
  memory: 0,
  grandTotal: 0,
  lastOperation: null,
  lastOperand: null,
  isNewNumber: true,
  isError: false
});

/**
 * Safely evaluates a calculator expression
 */
export const evaluateExpression = (expression: string): number => {
  try {
    // Replace display symbols with JavaScript operators for evaluation
    let cleanExpression = expression.replace(/×/g, '*').replace(/÷/g, '/');
    
    // Remove trailing operators before evaluation
    cleanExpression = cleanExpression.replace(/[+\-*/÷×]+$/, '');
    
    // If expression is empty after cleaning, use 0
    if (!cleanExpression || cleanExpression === '') {
      return 0;
    }
    
    const result = Function('"use strict"; return (' + cleanExpression + ')')();
    
    if (isNaN(result) || !isFinite(result)) {
      return 0;
    }
    
    return result;
  } catch {
    return 0;
  }
};

/**
 * Enhanced calculator input processor with all JOINIUS functions
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
  calculationSteps: CalculationStep[] = []
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
} => {
  let newValue = currentValue;
  let newMemory = memory;
  let newGrandTotal = grandTotal;
  let newLastOperation = lastOperation;
  let newLastOperand = lastOperand;
  let newIsNewNumber = isNewNumber;
  let isActive = true;
  let newTransactionHistory = [...transactionHistory];
  let newCalculationSteps = [...calculationSteps];
  let autoReplayActive = false;

  // Handle error state
  if (currentValue === 'Error' && !['ON/C', 'AC', 'C'].includes(input)) {
    return {
      value: 'Error',
      memory: newMemory,
      grandTotal: newGrandTotal,
      lastOperation: newLastOperation,
      lastOperand: newLastOperand,
      isNewNumber: newIsNewNumber,
      isActive: true,
      transactionHistory: newTransactionHistory,
      calculationSteps: newCalculationSteps,
      autoReplayActive: false
    };
  }

  // Get current numeric value
  const getCurrentNumber = (): number => {
    const num = parseFloat(currentValue);
    return isNaN(num) ? 0 : num;
  };

  // Handle different input types
  if (input === 'ON/C' || input === 'C') {
    // Clear everything
    newValue = '0';
    newMemory = 0;
    newGrandTotal = 0;
    newLastOperation = null;
    newLastOperand = null;
    newIsNewNumber = true;
    newTransactionHistory = [];
    newCalculationSteps = [];
    isActive = false;
  } else if (input === 'AC') {
    // All Clear - same as ON/C
    newValue = '0';
    newMemory = 0;
    newGrandTotal = 0;
    newLastOperation = null;
    newLastOperand = null;
    newIsNewNumber = true;
    newTransactionHistory = [];
    newCalculationSteps = [];
    isActive = false;
  } else if (input === 'CE') {
    // Clear Entry - only clear display
    newValue = '0';
    newIsNewNumber = true;
  } else if (input === '→') {
    // Backspace
    if (currentValue.length > 1 && currentValue !== '0') {
      newValue = currentValue.slice(0, -1);
    } else {
      newValue = '0';
      newIsNewNumber = true;
    }
  } else if (input === 'MU') {
    // Mark Up - add current number to memory
    const currentNum = getCurrentNumber();
    newMemory += currentNum;
  } else if (input === 'MRC') {
    // Memory Recall/Clear - first press recalls, second press clears
    if (memory === 0) {
      // Nothing in memory, do nothing
    } else if (currentValue === memory.toString()) {
      // If displaying memory value, clear memory
      newMemory = 0;
    } else {
      // Recall memory value
      newValue = memory.toString();
      newIsNewNumber = true;
    }
  } else if (input === 'M-') {
    // Memory Minus
    const currentNum = getCurrentNumber();
    newMemory -= currentNum;
  } else if (input === 'M+') {
    // Memory Plus
    const currentNum = getCurrentNumber();
    newMemory += currentNum;
  } else if (input === 'GT') {
    // Grand Total - show accumulated grand total
    newValue = newGrandTotal.toString();
    newIsNewNumber = true;
  } else if (input === 'AUTO') {
    // AUTO REPLAY - replay transaction history one by one
    if (newCalculationSteps.length > 0) {
      autoReplayActive = true;
      // Start auto-replay sequence
      newValue = newCalculationSteps[0].displayValue;
      newIsNewNumber = true;
      
      // Start the auto-replay sequence with timing
      setTimeout(() => {
        startAutoReplaySequence(newCalculationSteps);
      }, 100);
    } else {
      // No history to replay
      newValue = currentValue;
    }
  } else if (input === 'CHECK→') {
    // Check forward - move to next transaction in history
    if (newCalculationSteps.length > 0) {
      // Find current step by display value
      let currentIndex = newCalculationSteps.findIndex(step => 
        step.displayValue === currentValue || step.result.toString() === currentValue
      );
      
      // If not found, start from beginning
      if (currentIndex === -1) currentIndex = -1;
      
      const nextIndex = (currentIndex + 1) % newCalculationSteps.length;
      const nextStep = newCalculationSteps[nextIndex];
      
      // Show the individual operand or operation
      newValue = nextStep.displayValue;
      newIsNewNumber = true;
      autoReplayActive = true;
    }
  } else if (input === 'CHECK←') {
    // Check backward - move to previous transaction in history
    if (newCalculationSteps.length > 0) {
      // Find current step by display value
      let currentIndex = newCalculationSteps.findIndex(step => 
        step.displayValue === currentValue || step.result.toString() === currentValue
      );
      
      // If not found, start from end
      if (currentIndex === -1) currentIndex = newCalculationSteps.length;
      
      const prevIndex = currentIndex <= 0 ? newCalculationSteps.length - 1 : currentIndex - 1;
      const prevStep = newCalculationSteps[prevIndex];
      
      // Show the individual operand or operation
      newValue = prevStep.displayValue;
      newIsNewNumber = true;
      autoReplayActive = true;
    }
  } else if (input === '%') {
    // Percentage calculation
    const currentNum = getCurrentNumber();
    if (newLastOperation && newLastOperand !== null) {
      // Calculate percentage of last operand
      const percentValue = (newLastOperand * currentNum) / 100;
      newValue = percentValue.toString();
    } else {
      // Simple percentage
      newValue = (currentNum / 100).toString();
    }
    newIsNewNumber = true;
  } else if (input === '√') {
    // Square root
    const currentNum = getCurrentNumber();
    if (currentNum < 0) {
      newValue = 'Error';
    } else {
      newValue = Math.sqrt(currentNum).toString();
    }
    newIsNewNumber = true;
  } else if (input === '=' || input === 'ENTER') {
    try {
      if (newLastOperation && newLastOperand !== null) {
        const currentNum = getCurrentNumber();
        let result = 0;
        
        switch (newLastOperation) {
          case '+':
            result = newLastOperand + currentNum;
            newCalculationSteps.push({
              expression: `${newLastOperand} + ${currentNum}`,
              result: result,
              timestamp: Date.now(),
              stepNumber: newCalculationSteps.length + 1,
              operationType: 'operation',
              displayValue: `+${currentNum}`
            });
            break;
          case '-':
            result = newLastOperand - currentNum;
            newCalculationSteps.push({
              expression: `${newLastOperand} - ${currentNum}`,
              result: result,
              timestamp: Date.now(),
              stepNumber: newCalculationSteps.length + 1,
              operationType: 'operation',
              displayValue: `-${currentNum}`
            });
            break;
          case '*':
          case '×':
            result = newLastOperand * currentNum;
            newCalculationSteps.push({
              expression: `${newLastOperand} × ${currentNum}`,
              result: result,
              timestamp: Date.now(),
              stepNumber: newCalculationSteps.length + 1,
              operationType: 'operation',
              displayValue: `×${currentNum}`
            });
            break;
          case '/':
          case '÷':
            if (currentNum === 0) {
              newValue = 'Error';
              return {
                value: newValue,
                memory: newMemory,
                grandTotal: newGrandTotal,
                lastOperation: null,
                lastOperand: null,
                isNewNumber: true,
                isActive: true,
                calculationSteps: newCalculationSteps,
                transactionHistory: newTransactionHistory,
                calculationSteps: newCalculationSteps,
                autoReplayActive: false
              };
            }
            result = newLastOperand / currentNum;
            newCalculationSteps.push({
              expression: `${newLastOperand} ÷ ${currentNum}`,
              result: result,
              timestamp: Date.now(),
              stepNumber: newCalculationSteps.length + 1,
              operationType: 'operation',
              displayValue: `÷${currentNum}`
            });
            break;
          default:
            result = currentNum;
            newCalculationSteps.push({
              expression: currentNum.toString(),
              result: result,
              timestamp: Date.now(),
              stepNumber: newCalculationSteps.length + 1,
              operationType: 'number',
              displayValue: currentNum.toString()
            });
        }
        
        // Add to grand total
        newGrandTotal += result;
        
        // Add to transaction history
        newTransactionHistory.push(result);
        
        newValue = result.toString();
        newLastOperation = null;
        newLastOperand = null;
        newIsNewNumber = true;
      } else {
        // No pending operation, add current number to grand total
        const currentNum = getCurrentNumber();
        newCalculationSteps.push({
          expression: currentNum.toString(),
          result: currentNum,
          timestamp: Date.now(),
          stepNumber: newCalculationSteps.length + 1,
          operationType: 'number',
          displayValue: currentNum.toString()
        });
        newGrandTotal += currentNum;
        
        // Add to transaction history
        newTransactionHistory.push(currentNum);
      }
    } catch {
      newValue = 'Error';
      newLastOperation = null;
      newLastOperand = null;
      newIsNewNumber = true;
    }
  } else if (['+', '-', '*', '×', '/', '÷'].includes(input)) {
    // Arithmetic operations
    const currentNum = getCurrentNumber();
    
    // If there's a pending operation, execute it first
    if (newLastOperation && newLastOperand !== null && !newIsNewNumber) {
      let result = 0;
      let operationExpression = '';
      
      switch (newLastOperation) {
        case '+':
          result = newLastOperand + currentNum;
          operationExpression = `${newLastOperand} + ${currentNum}`;
          break;
        case '-':
          result = newLastOperand - currentNum;
          operationExpression = `${newLastOperand} - ${currentNum}`;
          break;
        case '*':
        case '×':
          result = newLastOperand * currentNum;
          operationExpression = `${newLastOperand} × ${currentNum}`;
          break;
        case '/':
        case '÷':
          if (currentNum === 0) {
            newValue = 'Error';
            return {
              value: newValue,
              memory: newMemory,
              grandTotal: newGrandTotal,
              lastOperation: null,
              lastOperand: null,
              isNewNumber: true,
              isActive: true,
              transactionHistory: newTransactionHistory,
              calculationSteps: newCalculationSteps,
              autoReplayActive: false
            };
          }
          result = newLastOperand / currentNum;
          operationExpression = `${newLastOperand} ÷ ${currentNum}`;
          break;
        default:
          result = currentNum;
          operationExpression = currentNum.toString();
      }
      
      // Add the intermediate calculation step
      newCalculationSteps.push({
        expression: operationExpression,
        result: result,
        timestamp: Date.now(),
        stepNumber: newCalculationSteps.length + 1,
        operationType: 'operation'
      });
      
      newValue = result.toString();
      newLastOperand = result;
    } else {
      // Save the current number as a step when starting a new operation
      if (!newIsNewNumber) {
        newCalculationSteps.push({
          expression: currentNum.toString(),
          result: currentNum,
          timestamp: Date.now(),
          stepNumber: newCalculationSteps.length + 1,
          operationType: 'number',
          displayValue: currentNum.toString()
        });
      }
      newLastOperand = currentNum;
    }
    
    // Set new operation
    newLastOperation = input === '×' ? '*' : input === '÷' ? '/' : input;
    newIsNewNumber = true;
    isActive = true;
  } else if (input === '.') {
    // Decimal point
    if (newIsNewNumber) {
      newValue = '0.';
      newIsNewNumber = false;
    } else if (!currentValue.includes('.')) {
      newValue = currentValue + '.';
    }
    isActive = true;
  } else if (['0', '00', '000', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(input)) {
    // Number input
    if (newIsNewNumber || currentValue === '0') {
      newValue = input;
      newIsNewNumber = false;
    } else {
      newValue = currentValue + input;
    }
    isActive = true;
  }

  // Format display value
  if (newValue !== 'Error' && !isNaN(parseFloat(newValue))) {
    const num = parseFloat(newValue);
    if (num.toString().length > 12) {
      // Scientific notation for very large numbers
      newValue = num.toExponential(6);
    } else {
      newValue = num.toString();
    }
  }

  return { 
    value: newValue, 
    memory: newMemory, 
    grandTotal: newGrandTotal,
    lastOperation: newLastOperation,
    lastOperand: newLastOperand,
    isNewNumber: newIsNewNumber,
    isActive,
    transactionHistory: newTransactionHistory,
    calculationSteps: newCalculationSteps,
            isActive: true,
  };
};

/**
 * Auto-replay sequence function
 */
const startAutoReplaySequence = (steps: CalculationStep[]): void => {
  let currentStepIndex = 0;
  
  const showNextStep = () => {
    if (currentStepIndex >= steps.length) {
      // Restart from beginning
      currentStepIndex = 0;
    }
    
    const step = steps[currentStepIndex];
    
    // Update calculator display (this would need to be handled by the component)
    // For now, we'll dispatch a custom event that the component can listen to
    window.dispatchEvent(new CustomEvent('autoReplayStep', {
      detail: {
        step: step,
        stepIndex: currentStepIndex,
        totalSteps: steps.length
      }
    }));
    
    currentStepIndex++;
    
    // Schedule next step after 1 second
    setTimeout(showNextStep, 1000);
  };
  
  // Start the sequence
  showNextStep();
};