/**
 * CREDIT CALCULATOR UTILITIES
 * ===========================
 * 
 * Simple calculator logic with only addition and subtraction
 * Counter only starts after first operation is entered
 */

export interface CalculationStep {
  expression: string;
  result: number;
  timestamp: number;
  stepNumber: number;
  operationType: 'number' | 'operation' | 'result';
  displayValue: string;
}

/**
 * Evaluate a mathematical expression safely
 */
export const evaluateExpression = (expression: string): number => {
  try {
    // Replace display symbols with JavaScript operators for evaluation
    let cleanExpression = expression
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/x/g, '*');
    
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
 * Build expression from calculation steps
 */
const buildSimpleExpression = (steps: CalculationStep[]): string => {
  let expression = '';
  
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    
    if (step.operationType === 'number') {
      expression += step.result;
    } else if (step.operationType === 'operation') {
      expression += step.expression;
    }
  }
  
  return expression;
};

/**
 * SIMPLE CALCULATION FLOW ONLY
 * ============================
 * Handles: 10+5+3=18, 100-25-10=65
 * Only addition and subtraction operations
 * Counter increments on + operations, decrements on - operations
 * Only when operation has valid number (not 0)
 */
const processSimpleCalculation = (
  currentValue: string,
  input: string,
  calculationSteps: CalculationStep[],
  lastOperation: string | null,
  isNewNumber: boolean,
  articleCount: number,
  grandTotal: number = 0,
  transactionHistory: number[] = []
): {
  value: string;
  calculationSteps: CalculationStep[];
  lastOperation: string | null;
  isNewNumber: boolean;
  articleCount: number;
  grandTotal: number;
  transactionHistory: number[];
  result?: number;
} => {
  let newValue = currentValue;
  let newCalculationSteps = [...calculationSteps];
  let newLastOperation = lastOperation;
  let newIsNewNumber = isNewNumber;
  let newArticleCount = articleCount;
  let newGrandTotal = grandTotal;
  let newTransactionHistory = [...transactionHistory];
  let result: number | undefined;

  if (/^\d+$/.test(input) || input === '00' || input === '000') {
    // Handle numeric input
    if (newIsNewNumber || currentValue === '0') {
      if (newCalculationSteps.length === 0) {
        // First number: don't change counter, wait for operation
        newCalculationSteps.push({
          expression: input,
          result: parseFloat(input),
          timestamp: Date.now(),
          stepNumber: 1,
          operationType: 'number',
          displayValue: input
        });
        // DON'T change counter here - keep it at current value
      } else if (newLastOperation && newIsNewNumber) {
        // After any operator, create new step
        newCalculationSteps.push({
          expression: `${newLastOperation}${input}`,
          result: parseFloat(input),
          timestamp: Date.now(),
          stepNumber: newCalculationSteps.length + 1,
          operationType: 'operation',
          displayValue: `${newLastOperation}${input}`
        });
        // DON'T change counter here - it was already set when operator was pressed
      }
      newValue = input;
      newIsNewNumber = false;
    } else {
      // Building existing number: 1 + 0 = 10
      newValue = currentValue + input;
      
      // Update the last step
      if (newCalculationSteps.length > 0) {
        const lastStep = newCalculationSteps[newCalculationSteps.length - 1];
        if (lastStep.operationType === 'number') {
          lastStep.displayValue = newValue;
          lastStep.expression = newValue;
          lastStep.result = parseFloat(newValue);
        } else if (lastStep.operationType === 'operation') {
          const operator = lastStep.expression.charAt(0);
          lastStep.displayValue = `${operator}${newValue}`;
          lastStep.expression = `${operator}${newValue}`;
          lastStep.result = parseFloat(newValue);
        }
      }
      // DON'T change counter here - only change on operators
    }
  } else if (input === '.') {
    // Handle decimal point - add to current number
    if (!currentValue.includes('.')) {
      newValue = currentValue + '.';
    }
  } else if (input === '+' || input === '-') {
    // Handle + and - operators
    // Counter logic: only start counting after first operation
    if (newCalculationSteps.length === 1) {
      // First operation: 10+ -> counter becomes 1
      newArticleCount = 1;
    } else if (newCalculationSteps.length > 1) {
      // Subsequent operations: increment/decrement based on operator
      const currentNum = parseFloat(currentValue);
      if (!isNaN(currentNum) && currentNum > 0) {
        if (input === '+') {
          newArticleCount = newArticleCount + 1;
        } else if (input === '-') {
          newArticleCount = Math.max(0, newArticleCount - 1);
        }
      }
    }
    
    newLastOperation = input;
    newIsNewNumber = true;
    
    // Calculate running total if we have operations
    if (newCalculationSteps.length >= 2) {
      const expression = buildSimpleExpression(newCalculationSteps);
      const runningTotal = evaluateExpression(expression);
      newValue = runningTotal.toString();
    }
  } else if (input === '=' || input === 'ENTER') {
    // Calculate result for simple operations
    if (newCalculationSteps.length > 0) {
      const expression = buildSimpleExpression(newCalculationSteps);
      result = evaluateExpression(expression);
      
      // Add result step
      newCalculationSteps.push({
        expression: `=${result}`,
        result: result,
        timestamp: Date.now(),
        stepNumber: newCalculationSteps.length + 1,
        operationType: 'result',
        displayValue: `=${result}`
      });
      
      newValue = result.toString();
      newLastOperation = null;
      newIsNewNumber = true;
      
      // Add to grand total and transaction history
      newGrandTotal += result;
      newTransactionHistory.push(result);
    }
  }

  return {
    value: newValue,
    calculationSteps: newCalculationSteps,
    lastOperation: newLastOperation,
    isNewNumber: newIsNewNumber,
    articleCount: newArticleCount,
    grandTotal: newGrandTotal,
    transactionHistory: newTransactionHistory,
    result
  };
};

/**
 * Main calculator input processor - SIMPLE ONLY
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
  let newArticleCount = articleCount;

  // Get current numeric value
  const getCurrentNumber = () => {
    const num = parseFloat(currentValue);
    return isNaN(num) ? 0 : num;
  };

  // Handle special functions first
  if (input === 'ON/C' || input === 'C') {
    // Clear everything
    newValue = '0';
    newMemory = 0;
    newGrandTotal = 0;
    newLastOperation = null;
    newLastOperand = null;
    newIsNewNumber = true;
    newCalculationSteps = [];
    newArticleCount = 0;
    newTransactionHistory = [];
    autoReplayActive = false;
  } else if (input === 'AC') {
    // All Clear - same as ON/C
    newValue = '0';
    newMemory = 0;
    newGrandTotal = 0;
    newLastOperation = null;
    newLastOperand = null;
    newIsNewNumber = true;
    newCalculationSteps = [];
    newArticleCount = 0;
    newTransactionHistory = [];
    autoReplayActive = false;
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
    // Memory Recall/Clear
    if (newMemory === 0) {
      // Nothing in memory, do nothing
    } else if (currentValue === newMemory.toString()) {
      // If displaying memory value, clear memory
      newMemory = 0;
    } else {
      // Recall memory value
      newValue = newMemory.toString();
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
    // AUTO REPLAY - replay transaction history
    if (newCalculationSteps.length > 0) {
      autoReplayActive = true;
      localStorage.setItem('currentCheckIndex', '0');
      newValue = newCalculationSteps[0].displayValue;
      newIsNewNumber = true;
      
      setTimeout(() => {
        startAutoReplaySequence(newCalculationSteps);
      }, 500);
    } else {
      newValue = currentValue;
    }
  } else if (input === 'CHECK→') {
    // Check forward - move to next transaction in history
    if (newCalculationSteps.length > 0) {
      const storedIndex = localStorage.getItem('currentCheckIndex');
      let currentStepIndex;
      
      if (storedIndex === null || storedIndex === '-1') {
        currentStepIndex = 0;
      } else {
        const currentIndex = parseInt(storedIndex);
        currentStepIndex = (currentIndex + 1) % newCalculationSteps.length;
      }
      
      localStorage.setItem('currentCheckIndex', currentStepIndex.toString());
      
      const currentStep = newCalculationSteps[currentStepIndex];
      newValue = currentStep.displayValue;
      
      if (currentStep.operationType === 'result') {
        newArticleCount = Math.max(1, currentStepIndex);
      } else {
        newArticleCount = currentStepIndex + 1;
      }
      
      return { 
        value: newValue,
        memory: newMemory, 
        grandTotal: newGrandTotal,
        lastOperation: newLastOperation,
        lastOperand: newLastOperand,
        isNewNumber: true,
        isActive,
        transactionHistory: newTransactionHistory,
        calculationSteps: newCalculationSteps,
        autoReplayActive: true,
        articleCount: newArticleCount
      };
    }
  } else if (input === 'CHECK←') {
    // Check backward - move to previous transaction in history
    if (newCalculationSteps.length > 0) {
      let currentStepIndex = parseInt(localStorage.getItem('currentCheckIndex') || '0');
      
      const storedIndex = localStorage.getItem('currentCheckIndex');
      if (storedIndex === null || storedIndex === '-1') {
        currentStepIndex = newCalculationSteps.length - 1;
      } else {
        currentStepIndex = currentStepIndex === 0 ? newCalculationSteps.length - 1 : currentStepIndex - 1;
      }
      
      localStorage.setItem('currentCheckIndex', currentStepIndex.toString());
      
      const currentStep = newCalculationSteps[currentStepIndex];
      newValue = currentStep.displayValue;
      
      if (currentStep.operationType === 'result') {
        newArticleCount = Math.max(1, currentStepIndex);
      } else {
        newArticleCount = currentStepIndex + 1;
      }
      
      return { 
        value: newValue,
        memory: newMemory, 
        grandTotal: newGrandTotal,
        lastOperation: newLastOperation,
        lastOperand: newLastOperand,
        isNewNumber: true,
        isActive,
        transactionHistory: newTransactionHistory,
        calculationSteps: newCalculationSteps,
        autoReplayActive: true,
        articleCount: newArticleCount
      };
    }
  } else if (input === '%') {
    // Percentage calculation
    const currentNum = getCurrentNumber();
    const percentResult = currentNum / 100;
    newValue = percentResult.toString();
    newIsNewNumber = true;
    
    newCalculationSteps = [{
      expression: percentResult.toString(),
      result: percentResult,
      timestamp: Date.now(),
      stepNumber: 1,
      operationType: 'number',
      displayValue: percentResult.toString()
    }];
  } else if (input === '√') {
    // Square root
    const currentNum = getCurrentNumber();
    if (currentNum < 0) {
      newValue = 'Error';
    } else {
      newValue = Math.sqrt(currentNum).toString();
    }
    newIsNewNumber = true;
  } else {
    // Use simple calculation flow for all operations
    const simpleResult = processSimpleCalculation(
      currentValue, input, newCalculationSteps, newLastOperation, 
      newIsNewNumber, newArticleCount, newGrandTotal, newTransactionHistory
    );
    
    newValue = simpleResult.value;
    newCalculationSteps = simpleResult.calculationSteps;
    newLastOperation = simpleResult.lastOperation;
    newIsNewNumber = simpleResult.isNewNumber;
    newArticleCount = simpleResult.articleCount;
    newGrandTotal = simpleResult.grandTotal;
    newTransactionHistory = simpleResult.transactionHistory;
    
    if (simpleResult.result !== undefined) {
      localStorage.setItem('currentCheckIndex', '-1');
    }
  }

  // Format display value - preserve decimal formatting
  if (newValue !== 'Error' && newValue !== '0.' && !isNaN(parseFloat(newValue))) {
    const num = parseFloat(newValue);
    if (num.toString().length > 12) {
      newValue = num.toExponential(6);
    } else {
      // Preserve trailing decimal point for user feedback
      if (newValue.endsWith('.')) {
        newValue = num.toString() + '.';
      } else {
        newValue = num.toString();
      }
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
    autoReplayActive,
    articleCount: newArticleCount
  };
};

/**
 * Auto-replay sequence function
 */
const startAutoReplaySequence = (steps: CalculationStep[]) => {
  let currentStepIndex = 0;
  
  const showNextStep = () => {
    if (currentStepIndex < steps.length) {
      const step = steps[currentStepIndex];
      
      window.dispatchEvent(new CustomEvent('autoReplayStep', {
        detail: {
          displayValue: step.displayValue,
          stepIndex: currentStepIndex,
          totalSteps: steps.length,
          currentStep: currentStepIndex + 1,
          articleCount: step.operationType === 'result' ? currentStepIndex : currentStepIndex + 1
        }
      }));
      
      localStorage.setItem('currentCheckIndex', currentStepIndex.toString());
      currentStepIndex++;
      
      if (currentStepIndex < steps.length) {
        setTimeout(showNextStep, 1000);
      } else {
        window.dispatchEvent(new CustomEvent('autoReplayComplete'));
      }
    }
  };
  
  showNextStep();
};