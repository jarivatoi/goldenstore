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
 * Enhanced calculator input processor with proper order of operations
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
    
    if (newLastOperation === '*') {
      let firstOperand = 0;
      
      for (let i = 0; i < newCalculationSteps.length; i++) {
        const step = newCalculationSteps[i];
        if (step.operationType === 'number' && !step.expression.includes('×') && 
            !step.expression.includes('+') && !step.expression.includes('-') && 
            !step.expression.includes('÷')) {
          firstOperand = step.result;
          break;
        }
      }
      
      if (firstOperand === 0 && newCalculationSteps.length > 0) {
        const firstStep = newCalculationSteps[0];
        const parsed = parseFloat(firstStep.expression);
        if (!isNaN(parsed)) {
          firstOperand = parsed;
        }
      }
      
      if (firstOperand !== 0) {
        const percentValue = (firstOperand * currentNum) / 100;
        newValue = percentValue.toString();
        newIsNewNumber = true;
        newLastOperation = null;
        
        newCalculationSteps = [{
          expression: percentValue.toString(),
          result: percentValue,
          timestamp: Date.now(),
          stepNumber: 1,
          operationType: 'number',
          displayValue: percentValue.toString()
        }];
        
        newLastOperand = null;
      } else {
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
      }
    } else {
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
  } else if (/^\d+$/.test(input) || input === '00' || input === '000') {
    // Handle numeric input
    if (newIsNewNumber || currentValue === '0') {
      if (newCalculationSteps.length === 0 || (newCalculationSteps.length > 0 && !newLastOperation)) {
        // First number entry
        newArticleCount = 1;
        if (newCalculationSteps.length === 0) {
          newCalculationSteps.push({
            expression: input,
            result: parseFloat(input),
            timestamp: Date.now(),
            stepNumber: 1,
            operationType: 'number',
            displayValue: input
          });
        }
      } else if (newLastOperation && ['+', '-'].includes(newLastOperation)) {
      // After a low precedence operator (+/-), create new operation step
      if (newCalculationSteps.length > 0) {
        const operatorSymbol = newLastOperation === '+' ? '+' : '-';
        newCalculationSteps.push({
          expression: `${operatorSymbol}${input}`,
          result: parseFloat(input),
          timestamp: Date.now(),
          stepNumber: newCalculationSteps.length + 1,
          operationType: 'operation',
          displayValue: `${operatorSymbol}${input}`
        });
        newArticleCount = newCalculationSteps.filter(step => step.operationType !== 'result').length;
      }
    } else if (newLastOperation && ['*', '/'].includes(newLastOperation)) {
      // After a high precedence operator (×/÷), prepare for compound operation
      // Don't create step yet - wait for operator precedence resolution
      }
      newValue = input;
      newIsNewNumber = false;
    } else {
      // Continuing to type digits - update the current step
      const lastStep = newCalculationSteps[newCalculationSteps.length - 1];
      if (lastStep) {
        lastStep.displayValue = newValue;
        lastStep.expression = newValue;
      }
      if (newCalculationSteps.length >= 1) {
        // Update operation step - preserve operator prefix and handle compound operations
        // This is already a completed compound operation, don't update
        const operatorSymbol = newLastOperation === '+' ? '+' : newLastOperation === '-' ? '-' : '';
        if (newLastOperation && newValue !== '0') {
          // Check if this is a compound operation (low precedence followed by high precedence)
          if (newCalculationSteps.length === 2 && 
              newCalculationSteps[1].operationType === 'operation' && 
              (newCalculationSteps[1].expression.startsWith('+') || newCalculationSteps[1].expression.startsWith('-')) &&
              (newLastOperation === '*' || newLastOperation === '/')) {
            
            // This is a compound operation like 25+5×3
            const additionOperand = newCalculationSteps[1].result;
            const currentNumber = parseFloat(newValue);
            const multiplicationResult = newLastOperation === '*' ? additionOperand * currentNumber : additionOperand / currentNumber;
            const displayOperator = newLastOperation === '*' ? '×' : '÷';
            
            // Update the addition step to show compound operation
            newCalculationSteps[1] = {
              expression: `(${additionOperand}${displayOperator}${currentNumber})=${multiplicationResult}`,
              result: multiplicationResult,
              timestamp: Date.now(),
              stepNumber: 2,
              operationType: 'operation',
              displayValue: `(${additionOperand}${displayOperator}${currentNumber})=${multiplicationResult}`
            };
            
            // Calculate final result: first number + compound result
            const firstNumber = newCalculationSteps[0].result;
            const result = firstNumber + multiplicationResult;
            newArticleCount = 2;
          } else {
            // Regular operation - add current number as new step
            const currentNumber = parseFloat(newValue);
            if (!newCalculationSteps.some(step => 
              step.operationType === 'operation' && step.result === currentNumber
            )) {
              newCalculationSteps.push({
                expression: `${newLastOperation === '+' ? '+' : newLastOperation === '-' ? '-' : newLastOperation}${currentNumber}`,
                result: currentNumber,
                timestamp: Date.now(),
                stepNumber: newCalculationSteps.length + 1,
                operationType: 'operation',
                displayValue: `${newLastOperation === '+' ? '+' : newLastOperation === '-' ? '-' : newLastOperation}${currentNumber}`
              });
            }
            
            // Calculate result from all steps
            const firstNumber = newCalculationSteps[0].result;
            let result = firstNumber;
            for (let i = 1; i < newCalculationSteps.length; i++) {
              const step = newCalculationSteps[i];
              if (step.operationType === 'operation') {
                if (step.expression.startsWith('+')) {
                  result += step.result;
                } else if (step.expression.startsWith('-')) {
                  result -= step.result;
                }
              }
            }
            
            newArticleCount = newCalculationSteps.filter(step => step.operationType === 'operation').length + 1;
          }
        } else {
          // No pending operation, just use existing steps
          const firstNumber = newCalculationSteps[0].result;
          let result = firstNumber;
          for (let i = 1; i < newCalculationSteps.length; i++) {
            const step = newCalculationSteps[i];
            if (step.operationType === 'operation') {
              if (step.expression.includes('=')) {
                // This is a compound operation, use its result
                result = step.result;
              } else if (step.expression.startsWith('+')) {
                result += step.result;
              } else if (step.expression.startsWith('-')) {
                result -= step.result;
              }
            }
          }
        }
      }
      newIsNewNumber = false;
      newArticleCount = newCalculationSteps.filter(step => step.operationType !== 'result').length;
      newValue = currentValue + input;
    }
  } else if (input === '.') {
    // Decimal point
    if (!currentValue.includes('.')) {
      newValue = currentValue + '.';
    }
  } else if (['+', '-', '*', '/', '×', '÷'].includes(input)) {
    // Handle operators
    const operator = input === '×' ? '*' : input === '÷' ? '/' : input;
    newLastOperation = operator;
    newIsNewNumber = true;
  } else if (input === '=') {
    // Handle equals
    let result = 0;
    
    // Handle pending operation when equals is pressed
    if (newLastOperation && newValue !== '0') {
      const currentNumber = parseFloat(newValue);
      
      // Check if this should be a compound operation
      if (newCalculationSteps.length === 2 && 
          newCalculationSteps[1].operationType === 'operation' && 
          (newCalculationSteps[1].expression.startsWith('+') || newCalculationSteps[1].expression.startsWith('-')) &&
          (newLastOperation === '*' || newLastOperation === '/')) {
        
        // This is a compound operation like 25+5×3
        const additionOperand = newCalculationSteps[1].result;
        const multiplicationResult = newLastOperation === '*' ? additionOperand * currentNumber : additionOperand / currentNumber;
        const displayOperator = newLastOperation === '*' ? '×' : '÷';
        
        // Update the addition step to show compound operation
        newCalculationSteps[1] = {
          expression: `(${additionOperand}${displayOperator}${currentNumber})=${multiplicationResult}`,
          result: multiplicationResult,
          timestamp: Date.now(),
          stepNumber: 2,
          operationType: 'operation',
          displayValue: `(${additionOperand}${displayOperator}${currentNumber})=${multiplicationResult}`
        };
        
        // Calculate final result: first number + compound result
        result = newCalculationSteps[0].result + multiplicationResult;
        newArticleCount = 2;
      } else {
        // Regular operation - add current number as new step
        newCalculationSteps.push({
          expression: `${newLastOperation === '+' ? '+' : newLastOperation === '-' ? '-' : newLastOperation}${currentNumber}`,
          result: currentNumber,
          timestamp: Date.now(),
          stepNumber: newCalculationSteps.length + 1,
          operationType: 'operation',
          displayValue: `${newLastOperation === '+' ? '+' : newLastOperation === '-' ? '-' : newLastOperation}${currentNumber}`
        });
        
        // Calculate result from all steps
        result = newCalculationSteps[0].result;
        for (let i = 1; i < newCalculationSteps.length; i++) {
          const step = newCalculationSteps[i];
          if (step.operationType === 'operation') {
            if (step.expression.startsWith('+')) {
              result += step.result;
            } else if (step.expression.startsWith('-')) {
              result -= step.result;
            }
          }
        }
        
        newArticleCount = newCalculationSteps.filter(step => step.operationType === 'operation').length + 1;
      }
    } else {
      // No pending operation, calculate from existing steps
      result = newCalculationSteps[0].result;
      
      for (let i = 1; i < newCalculationSteps.length; i++) {
        const step = newCalculationSteps[i];
        if (step.operationType === 'operation') {
          if (step.expression.includes('=')) {
            // This is a compound operation, use its result
            result = step.result;
          } else if (step.expression.startsWith('+')) {
            result += step.result;
          } else if (step.expression.startsWith('-')) {
            result -= step.result;
          }
        }
      }
      
      newArticleCount = newCalculationSteps.filter(step => step.operationType !== 'result').length;
    }
    
    // Add result step
    newCalculationSteps.push({
      expression: `=${result}`,
      result: result,
      timestamp: Date.now(),
      stepNumber: -1,
      operationType: 'result',
      displayValue: `=${result}`
    });
    
    newValue = result.toString();
    newGrandTotal += result;
    newLastOperation = null;
    newLastOperand = null;
    newIsNewNumber = true;
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
 * Build expression string from calculation steps
 */
const buildExpressionFromSteps = (steps: CalculationStep[]): string => {
  let expression = '';
  
  for (const step of steps) {
    if (step.operationType === 'number') {
      expression += step.result;
    } else if (step.operationType === 'operation') {
      if (step.expression.includes('=')) {
        // This is a compound operation like (5×3)=15, use the result
        expression = step.result.toString();
      } else {
        // Regular operation like +5 or -3
        expression += step.expression;
      }
    }
  }
  
  return expression;
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