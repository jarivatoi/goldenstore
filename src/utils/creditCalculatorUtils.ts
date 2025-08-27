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
 * Article count state interface
 */
interface ArticleCountState {
  count: number;
  hasCurrentArticle: boolean;
}

/**
 * Initialize calculator state
 */
export const initCalculatorState = (): CalculatorState & { articleCount: number } => ({
  display: '0',
  memory: 0,
  grandTotal: 0,
  lastOperation: null,
  lastOperand: null,
  isNewNumber: true,
  isError: false,
  articleCount: 0
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
      autoReplayActive: false,
      articleCount: newArticleCount
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
    newArticleCount = 0;
    isActive = false;
    // Clear check navigation index
    localStorage.removeItem('currentCheckIndex');
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
    newArticleCount = 0;
    isActive = false;
    // Clear check navigation index
    localStorage.removeItem('currentCheckIndex');
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
      // Reset check index and start auto-replay sequence
      localStorage.setItem('currentCheckIndex', '0');
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
      // Get current step index from stored state or start from beginning
      let currentStepIndex = parseInt(localStorage.getItem('currentCheckIndex') || '-1');
      
      // Move to next step
      currentStepIndex = Math.min(currentStepIndex + 1, newCalculationSteps.length - 1);
      
      // Store current index
      localStorage.setItem('currentCheckIndex', currentStepIndex.toString());
      
      const currentStep = newCalculationSteps[currentStepIndex];
      newValue = currentStep.displayValue;
      newIsNewNumber = true;
      autoReplayActive = true;
    }
  } else if (input === 'CHECK←') {
    // Check backward - move to previous transaction in history
    if (newCalculationSteps.length > 0) {
      // Get current step index from stored state or start from end
      let currentStepIndex = parseInt(localStorage.getItem('currentCheckIndex') || newCalculationSteps.length.toString());
      
      // Move to previous step (don't go below 0)
      currentStepIndex = Math.max(currentStepIndex - 1, 0);
      
      // Store current index
      localStorage.setItem('currentCheckIndex', currentStepIndex.toString());
      
      const currentStep = newCalculationSteps[currentStepIndex];
      newValue = currentStep.displayValue;
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
                transactionHistory: newTransactionHistory,
                calculationSteps: newCalculationSteps,
                autoReplayActive: false,
                articleCount: newArticleCount
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
        
        // Increment article count when = is pressed
        newArticleCount++;
        
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
        
        // Increment article count when = is pressed
        newArticleCount++;
        
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
              autoReplayActive: false,
              articleCount: newArticleCount
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
        operationType: 'operation',
        displayValue: result.toString()
      });
      
      newValue = result.toString();
      newLastOperand = result;
    } else {
      // Save the current number as a step when starting a new operation
      if (!newIsNewNumber) {
        // Increment article count when starting a new operation (+ pressed)
        newArticleCount++;
        
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
      // Starting a new number entry - increment article count if this is the first digit
      if (newIsNewNumber && newArticleCount === 0) {
        newArticleCount = 1; // First article
      }
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
      
      // Update calculator display
      window.dispatchEvent(new CustomEvent('autoReplayStep', {
        detail: {
          displayValue: step.displayValue,
          stepIndex: currentStepIndex,
          totalSteps: steps.length
        }
      }));
      
      // Store current index for CHECK navigation
      localStorage.setItem('currentCheckIndex', currentStepIndex.toString());
      
      currentStepIndex++;
      
      // Schedule next step after 1 second
      setTimeout(showNextStep, 1000);
    } else {
      // Restart from beginning
      currentStepIndex = 0;
      setTimeout(showNextStep, 1000);
    }
  };
  
  // Start the sequence
  showNextStep();
};