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
  displayValue: string;
  isComplete: boolean; // Track if this step is complete
  operator?: string; // Store the operator used
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
 * SIMPLE CALCULATION FLOW
 * =======================
 * Handles: 10+20+30=60, 100-25-10=65
 * Only addition and subtraction operations
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
        // First number: 10
        newArticleCount = 1;
        newCalculationSteps.push({
          expression: input,
          result: parseFloat(input),
          timestamp: Date.now(),
          stepNumber: 1,
          operationType: 'number',
          displayValue: input,
          isComplete: false
        });
      } else if (newLastOperation && newIsNewNumber) {
        // After operator, create new step: +20, +30, -10, etc.
        newArticleCount = newCalculationSteps.length + 1;
        newCalculationSteps.push({
          expression: `${newLastOperation}${input}`,
          result: parseFloat(input),
          timestamp: Date.now(),
          stepNumber: newArticleCount,
          operationType: 'operation',
          displayValue: `${newLastOperation}${input}`,
          isComplete: false,
          operator: newLastOperation
        });
      }
      newValue = input;
      newIsNewNumber = false;
    } else {
      // Building existing number: 1 + 0 = 10, 2 + 0 = 20
      newValue = currentValue + input;
      
      // Update the last step
      if (newCalculationSteps.length > 0) {
        const lastStep = newCalculationSteps[newCalculationSteps.length - 1];
        if (lastStep.operationType === 'number') {
          lastStep.displayValue = newValue;
          lastStep.expression = newValue;
          lastStep.result = parseFloat(newValue);
          lastStep.isComplete = false;
        } else if (lastStep.operationType === 'operation') {
          const operator = lastStep.expression.charAt(0);
          lastStep.displayValue = `${operator}${newValue}`;
          lastStep.expression = `${operator}${newValue}`;
          lastStep.result = parseFloat(newValue);
          lastStep.isComplete = false;
        }
      }
    }
  } else if (input === '.') {
    // Handle decimal point - add to current number
    if (!currentValue.includes('.')) {
      newValue = currentValue + '.';
    }
  } else if (input === '+' || input === '-') {
    // Handle + and - operators
    // Don't update display value yet - just store the operator
    newLastOperation = input;
    newIsNewNumber = true;
    // Keep current value displayed until next number is entered
  } else if (input === '=' || input === 'ENTER') {
    // Calculate result for simple operations
    if (newCalculationSteps.length > 0) {
      // Mark all previous steps as complete
      newCalculationSteps.forEach(step => {
        step.isComplete = true;
      });
      
      const expression = buildSimpleExpression(newCalculationSteps);
      result = evaluateExpression(expression);
      
      newValue = result.toString();
      newLastOperation = null;
      newIsNewNumber = true;
      newArticleCount = newCalculationSteps.length; // Keep same article count, don't increment
      
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
 * COMPOUND CALCULATION FLOW
 * =========================
 * Handles: 5×3=15 (5 articles at 3.00 each), 10÷2=5 (10 articles at 0.50 each)
 * Multiplication and division operations represent article quantities
 */
const processCompoundCalculation = (
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
        // First number: quantity (e.g., 5 articles)
        newCalculationSteps.push({
          expression: input,
          result: parseFloat(input),
          timestamp: Date.now(),
          stepNumber: 1,
          operationType: 'number',
          displayValue: input,
          isComplete: false
        });
      } else if (newLastOperation && newIsNewNumber) {
        // After any operator, create new step
        const displayOperator = newLastOperation === '*' ? '×' : '÷';
        newCalculationSteps.push({
          expression: `${displayOperator}${input}`,
          result: parseFloat(input),
          timestamp: Date.now(),
          stepNumber: newCalculationSteps.length + 1,
          operationType: 'operation',
          displayValue: `${displayOperator}${input}`,
          isComplete: false,
          operator: newLastOperation
        });
        // Increment article count for new operand
        newArticleCount = newCalculationSteps.length;
      }
      newValue = input;
      newIsNewNumber = false;
    } else {
      // Building existing number
      newValue = currentValue + input;
      
      // Update the last step
      if (newCalculationSteps.length > 0) {
        const lastStep = newCalculationSteps[newCalculationSteps.length - 1];
        if (lastStep.operationType === 'number') {
          lastStep.displayValue = newValue;
          lastStep.expression = newValue;
          lastStep.result = parseFloat(newValue);
          lastStep.isComplete = false;
        } else if (lastStep.operationType === 'operation') {
          const operator = lastStep.expression.charAt(0);
          lastStep.displayValue = `${operator}${newValue}`;
          lastStep.expression = `${operator}${newValue}`;
          lastStep.result = parseFloat(newValue);
          lastStep.isComplete = false;
        }
      }
    }
  } else if (input === '.') {
    // Handle decimal point
    if (!currentValue.includes('.')) {
      newValue = currentValue + '.';
    }
  } else if (input === '*' || input === '/') {
    // Handle multiplication and division
    // For compound: 5×3 means 5 articles at 3.00 each
    const currentNum = parseFloat(currentValue);
    
    if (!isNaN(currentNum) && currentNum > 0) {
      if (input === '*') {
        // Set article count to the first number (quantity)
        newArticleCount = Math.floor(currentNum);
      } else if (input === '/') {
        // Division: quantity ÷ price per unit
        newArticleCount = Math.floor(currentNum);
      }
    }
    
    newLastOperation = input;
    newIsNewNumber = true;
  } else if (input === '=' || input === 'ENTER') {
    // Calculate result for compound operations
    if (newCalculationSteps.length > 0) {
      // Mark all previous steps as complete
      newCalculationSteps.forEach(step => {
        step.isComplete = true;
      });
      
      const expression = buildSimpleExpression(newCalculationSteps);
      result = evaluateExpression(expression);
      
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
 * Build expression from simple calculation steps
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
 * Determine if calculation is compound
 * Simple: Only + and - operators
 * Compound: Any × or ÷ operators
 */
const isCompoundCalculation = (calculationSteps: CalculationStep[], lastOperation: string | null): boolean => {
  // Compound if current operation is × or ÷
  return (lastOperation === '*' || lastOperation === '/' || lastOperation === '×' || lastOperation === '÷');
};

/**
 * Calculator input processor with simplified flows
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
  
  // Determine which flow to use based on current operation
  const isCompound = isCompoundCalculation(newCalculationSteps, newLastOperation) || 
                     (input === '*' || input === '/' || input === '×' || input === '÷');
  
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

  // Handle special functions first
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
    // Memory Recall/Clear
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
    // Check forward - cycle through all steps
    if (newCalculationSteps.length > 0) {
      // Enhanced check navigation - cycle through all steps
      let currentStepIndex = parseInt(localStorage.getItem('currentCheckIndex') || '-1');
      
      // Move to next step
      currentStepIndex++;
      if (currentStepIndex >= newCalculationSteps.length) {
        currentStepIndex = 0; // Wrap to beginning
      }
      
      // Save new index
      localStorage.setItem('currentCheckIndex', currentStepIndex.toString());
      
      // Get the step and update display
      const currentStep = newCalculationSteps[currentStepIndex];
      newValue = currentStep.displayValue;
      newArticleCount = currentStepIndex + 1;
      newIsNewNumber = true;
      
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
    // Check backward - cycle through all steps in reverse
    if (newCalculationSteps.length > 0) {
      // Enhanced check navigation - cycle through all steps backwards
      let currentStepIndex = parseInt(localStorage.getItem('currentCheckIndex') || '-1');
      
      // Move to previous step
      currentStepIndex--;
      if (currentStepIndex < 0) {
        currentStepIndex = newCalculationSteps.length - 1; // Wrap to end
      }
      
      // Save new index
      localStorage.setItem('currentCheckIndex', currentStepIndex.toString());
      
      // Get the step and update display
      const currentStep = newCalculationSteps[currentStepIndex];
      newValue = currentStep.displayValue;
      newArticleCount = currentStepIndex + 1;
      newIsNewNumber = true;
      
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
    // Handle percentage calculation for compound operations
    if (newLastOperation === '*' && newCalculationSteps.length >= 2) {
      // For 100×10%, we have:
      // Step 1: "100" (base value)
      // Step 2: "×10" (percentage value)
      
      const baseValue = newCalculationSteps[0].result; // 100
      const percentageValue = currentNum; // 10
      
      // Calculate percentage: 100 × (10/100) = 10
      const percentResult = Math.round((baseValue * (percentageValue / 100)) * 100) / 100;
      
      // Update step 2 to show the percentage calculation
      newCalculationSteps[1] = {
        expression: `(${baseValue}×${percentageValue}%)`,
        result: percentResult,
        timestamp: Date.now(),
        stepNumber: 2,
        operationType: 'operation',
        displayValue: `(${baseValue}×${percentageValue}%)=${percentResult}`,
        isComplete: false
      };
      
      // Show the percentage result (10) in display
      newValue = percentResult.toString();
      newLastOperation = null;
      newIsNewNumber = true;
      newArticleCount = 2;
    } else {
      // Simple percentage calculation
      const percentResult = Math.round((currentNum / 100) * 100) / 100;
      newValue = percentResult.toString();
      newIsNewNumber = true;
      
      if (newCalculationSteps.length > 0) {
        newCalculationSteps[newCalculationSteps.length - 1] = {
          expression: `${percentResult}%`,
          result: percentResult,
          timestamp: Date.now(),
          stepNumber: newCalculationSteps.length,
          operationType: 'operation',
          displayValue: `${percentResult}%`,
          isComplete: false
        };
      } else {
        newCalculationSteps = [{
          expression: `${percentResult}%`,
          result: percentResult,
          timestamp: Date.now(),
          stepNumber: 1,
          operationType: 'number',
          displayValue: `${percentResult}%`,
          isComplete: false
        }];
      }
      newArticleCount = newCalculationSteps.length;
    }
  } else if (input === '√') {
    // Square root
    const currentNum = getCurrentNumber();
    if (currentNum < 0) {
      newValue = 'Error';
    } else {
      newValue = Math.sqrt(currentNum).toString();
    }
    newIsNewNumber = true;
  } else if (input === '.') {
    // Handle decimal point - route to appropriate pathway
    const willBeCompound = isCompound;
    if (willBeCompound) {
      // Use compound calculation flow for decimal
      const compoundResult = processCompoundCalculation(
        currentValue, input, newCalculationSteps, newLastOperation,
        newIsNewNumber, newArticleCount, newGrandTotal, newTransactionHistory
      );
      
      newValue = compoundResult.value;
      newCalculationSteps = compoundResult.calculationSteps;
      newLastOperation = compoundResult.lastOperation;
      newIsNewNumber = compoundResult.isNewNumber;
      newArticleCount = compoundResult.articleCount;
      newGrandTotal = compoundResult.grandTotal;
      newTransactionHistory = compoundResult.transactionHistory;
    } else {
      // Use simple calculation flow for decimal
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
    }
  } else {
    // Route to appropriate calculation flow
    if (input === '*' || input === '/' || input === '×' || input === '÷') {
      const compoundResult = processCompoundCalculation(
        currentValue, input, newCalculationSteps, newLastOperation,
        newIsNewNumber, newArticleCount
      );
      
      newValue = compoundResult.value;
      newCalculationSteps = compoundResult.calculationSteps;
      newLastOperation = compoundResult.lastOperation;
      newIsNewNumber = compoundResult.isNewNumber;
      newArticleCount = compoundResult.articleCount;
      
      if (compoundResult.result !== undefined) {
        newGrandTotal += compoundResult.result;
        newTransactionHistory.push(compoundResult.result);
        localStorage.setItem('currentCheckIndex', '-1');
      }
    } else {
      // Use simple calculation flow
      const simpleResult = processSimpleCalculation(
        currentValue, input, newCalculationSteps, newLastOperation,
        newIsNewNumber, newArticleCount
      );
      
      newValue = simpleResult.value;
      newCalculationSteps = simpleResult.calculationSteps;
      newLastOperation = simpleResult.lastOperation;
      newIsNewNumber = simpleResult.isNewNumber;
      newArticleCount = simpleResult.articleCount;
      
      if (simpleResult.result !== undefined) {
        newGrandTotal += simpleResult.result;
        newTransactionHistory.push(simpleResult.result);
        localStorage.setItem('currentCheckIndex', '-1');
      }
    }
  }

  // Format display value - preserve decimal formatting
  if (newValue !== 'Error' && newValue !== '0.' && !isNaN(parseFloat(newValue))) {
    const num = parseFloat(newValue);
    if (num > 999999999999 || (num < 0.000001 && num !== 0)) {
      newValue = num.toExponential(6);
    } else {
      // Preserve trailing decimal point for user feedback
      if (newValue.endsWith('.')) {
        newValue = num.toString() + '.';
      } else {
        // Format to 2 decimal places if it has 1 decimal place, otherwise keep as is
        const numStr = num.toString();
        if (numStr.includes('.')) {
          const decimalPart = numStr.split('.')[1];
          if (decimalPart.length === 1) {
            // 1 decimal place -> format to 2 decimal places (1.2 -> 1.20)
            newValue = num.toFixed(2);
          } else {
            // Multiple decimal places or whole number -> keep as is
            newValue = numStr;
          }
        } else {
          // Whole number -> keep as is (100 stays 100, not 100.00)
          newValue = numStr;
        }
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