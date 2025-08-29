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
        newArticleCount = 3; // Step 1: first number, Step 2: compound operation, Step 3: result
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
      if (newCalculationSteps.length === 0) {
        // First number entry
        newArticleCount = 1;
        newCalculationSteps.push({
          expression: input,
          result: parseFloat(input),
          timestamp: Date.now(),
          stepNumber: 1,
          operationType: 'number',
          displayValue: input
        });
      }
      newValue = input;
      newIsNewNumber = false;
    } else {
      // Continuing to type digits - update the current step
      if (newCalculationSteps.length === 0) {
        // First number being typed
        newCalculationSteps.push({
          expression: currentValue + input,
          result: parseFloat(currentValue + input),
          timestamp: Date.now(),
          stepNumber: 1,
          operationType: 'number',
          displayValue: currentValue + input
        });
        newArticleCount = 1;
      } else {
        const lastStep = newCalculationSteps[newCalculationSteps.length - 1];
        if (lastStep && lastStep.operationType === 'number') {
          // Update the first number step
          lastStep.expression = currentValue + input;
          lastStep.result = parseFloat(currentValue + input);
          lastStep.displayValue = currentValue + input;
        } else if (lastStep && lastStep.operationType === 'operation') {
          // Update operation step
          const operatorSymbol = lastStep.expression.charAt(0);
          lastStep.expression = operatorSymbol + (currentValue + input);
          lastStep.result = parseFloat(currentValue + input);
          lastStep.displayValue = operatorSymbol + (currentValue + input);
        }
      }
      newIsNewNumber = false;
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
    
    // Create operation step when operator is pressed
    if (newCalculationSteps.length > 0 && newValue !== '0') {
      const currentNumber = parseFloat(newValue);
      const operatorSymbol = operator === '+' ? '+' : operator === '-' ? '-' : operator === '*' ? '×' : '÷';
      
      newCalculationSteps.push({
        expression: `${operatorSymbol}${currentNumber}`,
        result: currentNumber,
        timestamp: Date.now(),
        stepNumber: newCalculationSteps.length + 1,
        operationType: 'operation',
        displayValue: `${operatorSymbol}${currentNumber}`
      });
      
      newArticleCount = newCalculationSteps.filter(step => step.operationType !== 'result').length;
    }
    
    newLastOperation = operator;
    newIsNewNumber = true;
  } else if (input === '=') {
    // Handle equals - determine if calculation is simple or compound
    try {
      // Add pending operation if exists
      if (newLastOperation && newValue !== '0' && !newCalculationSteps.some(step => 
          step.operationType === 'operation' && step.result === parseFloat(newValue)
        )) {
        const currentNumber = parseFloat(newValue);
        const operatorSymbol = newLastOperation === '+' ? '+' : newLastOperation === '-' ? '-' : newLastOperation === '*' ? '×' : '÷';
        
        newCalculationSteps.push({
          expression: `${operatorSymbol}${currentNumber}`,
          result: currentNumber,
          timestamp: Date.now(),
          stepNumber: newCalculationSteps.length + 1,
          operationType: 'operation',
          displayValue: `${operatorSymbol}${currentNumber}`
        });
      }
      
      // Determine if this is a compound calculation (has × or ÷)
      const hasMultiplicationOrDivision = newCalculationSteps.some(step => 
        step.operationType === 'operation' && 
        (step.expression.includes('×') || step.expression.includes('÷'))
      );
      
      let result = 0;
      
      if (hasMultiplicationOrDivision) {
        // COMPOUND CALCULATION FLOW
        // Handle operations like 25+5×3 where × or ÷ has higher precedence
        
        // Find the multiplication/division step
        const multiplyDivideStep = newCalculationSteps.find(step => 
          step.operationType === 'operation' && 
          (step.expression.includes('×') || step.expression.includes('÷'))
        );
        
        if (multiplyDivideStep) {
          // Find the addition/subtraction step before it
          const addSubtractStep = newCalculationSteps.find(step => 
            step.operationType === 'operation' && 
            (step.expression.startsWith('+') || step.expression.startsWith('-'))
          );
          
          if (addSubtractStep) {
            // Calculate compound operation - Use the correct operands for 5×3
            const firstOperand = addSubtractStep.result; // 5 from +5 step  
            const secondOperand = multiplyDivideStep.result; // 3 from ×3 step
            const isMultiply = multiplyDivideStep.expression.includes('×');
            const compoundResult = isMultiply ? firstOperand * secondOperand : firstOperand / secondOperand;
            const displayOperator = isMultiply ? '×' : '÷';
            
            // Replace the addition/subtraction step with the compound operation
            const addStepIndex = newCalculationSteps.findIndex(step => step === addSubtractStep);
            newCalculationSteps[addStepIndex] = {
              expression: `(${firstOperand}${displayOperator}${secondOperand})=${compoundResult}`,
              result: compoundResult,
              timestamp: Date.now(),
              stepNumber: 2,
              operationType: 'operation',
              displayValue: `(${firstOperand}${displayOperator}${secondOperand})=${compoundResult}`
            };
            
            // Remove the multiplication step since it's now part of compound
            newCalculationSteps = newCalculationSteps.filter(step => step !== multiplyDivideStep);
            
            // Calculate final result: first number + compound result
            result = newCalculationSteps[0].result + compoundResult;
            newArticleCount = 2; // FIXED: Will be 3 after adding result step below
          }
        }
      } else {
        // SIMPLE CALCULATION FLOW
        // Handle operations like 10+20+30 with normal left-to-right evaluation
        
        result = newCalculationSteps[0].result;
        for (let i = 1; i < newCalculationSteps.length; i++) {
          const step = newCalculationSteps[i];
          if (step.operationType === 'operation') {
            if (step.expression.startsWith('+')) {
              result += step.result;
            } else if (step.expression.startsWith('-')) {
              result -= step.result;
            } else if (step.expression.includes('×')) {
              result *= step.result;
            } else if (step.expression.includes('÷')) {
              result /= step.result;
            }
          }
        }
        
        // Count all non-result steps for article count
        newArticleCount = newCalculationSteps.filter(step => step.operationType !== 'result').length;
      }
      
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
      newGrandTotal += result;
      newLastOperation = null;
      newLastOperand = null;
      newIsNewNumber = true;
      
      // Add to transaction history
      newTransactionHistory.push(result);
      
      // Clear check navigation index
      localStorage.setItem('currentCheckIndex', '-1');
      
      // Update article count to include the result step
      if (hasMultiplicationOrDivision) {
        newArticleCount = 3; // Step 1: first number, Step 2: compound operation, Step 3: result
      } else {
        newArticleCount = newCalculationSteps.filter(step => step.operationType !== 'result').length;
      }
      
    } catch (error) {
      console.error('Calculator error:', error);
      newValue = 'Error';
      newIsNewNumber = true;
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