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
      } else if (newLastOperation && ['+', '-'].includes(newLastOperation)) {
        // After an operator, create new operation step only if we don't already have one for this operation
        const lastStep = newCalculationSteps[newCalculationSteps.length - 1];
        const operatorSymbol = newLastOperation;
        
        if (lastStep.operationType === 'operation' && lastStep.expression.startsWith(operatorSymbol)) {
          // Update existing operation step instead of creating new one
          lastStep.expression = `${operatorSymbol}${input}`;
          lastStep.result = parseFloat(input);
          lastStep.displayValue = `${operatorSymbol}${input}`;
        } else {
          // Create new operation step
          newCalculationSteps.push({
            expression: `${operatorSymbol}${input}`,
            result: parseFloat(input),
            timestamp: Date.now(),
            stepNumber: newCalculationSteps.length + 1,
            operationType: 'operation',
            displayValue: `${operatorSymbol}${input}`
          });
        }
        newArticleCount = newCalculationSteps.filter(step => step.operationType !== 'result').length;
      } else if (newCalculationSteps.length === 1 && newLastOperation === '+') {
        // After 25+, when entering 5, create the addition step
        newCalculationSteps.push({
          expression: `+${input}`,
          result: parseFloat(input), // Store the actual operand (5)
          timestamp: Date.now(),
          stepNumber: 2,
          operationType: 'operation',
          displayValue: `+${input}`
        });
        newArticleCount = 2;
      } else if (newCalculationSteps.length === 1 && newLastOperation === '-') {
        // After 25-, when entering number, create the subtraction step
        newCalculationSteps.push({
          expression: `-${input}`,
          result: parseFloat(input), // Store the actual operand
          timestamp: Date.now(),
          stepNumber: 2,
          operationType: 'operation',
          displayValue: `-${input}`
        });
        newArticleCount = 2;
      }
      newValue = input;
      newIsNewNumber = false;
    } else {
      newValue = currentValue + input;
      
      if (newCalculationSteps.length > 0) {
        const lastStep = newCalculationSteps[newCalculationSteps.length - 1];
        if (lastStep.operationType === 'number' || lastStep.operationType === 'operation') {
          if (lastStep.operationType === 'operation') {
            // Keep the operator prefix and update the number part
            const operatorChar = lastStep.expression.charAt(0);
            lastStep.displayValue = `${operatorChar}${newValue}`;
            lastStep.expression = `${operatorChar}${newValue}`;
            lastStep.result = parseFloat(newValue);
          } else {
            lastStep.displayValue = newValue;
            lastStep.expression = newValue;
            lastStep.result = parseFloat(newValue);
          }
        }
      }
    }
    isActive = true;
  } else if (input === '.') {
    // Handle decimal point
    if (!currentValue.includes('.')) {
      if (newIsNewNumber) {
        newValue = '0.';
        newIsNewNumber = false;
      } else {
        newValue = currentValue + '.';
      }
    }
  } else if (['+', '-', '*', '/', '×', '÷'].includes(input)) {
    // Handle operators
    const operator = input === '×' ? '*' : input === '÷' ? '/' : input;
    
    if (newCalculationSteps.length === 0) {
      // First number entry
      newCalculationSteps.push({
        expression: newValue,
        result: parseFloat(newValue),
        timestamp: Date.now(),
        stepNumber: 1,
        operationType: 'number',
        displayValue: newValue
      });
      newArticleCount = 1;
    } else if (newCalculationSteps.length === 1 && (operator === '*' || operator === '/')) {
      // Direct multiplication/division after first number
      const firstNumber = newCalculationSteps[0].result;
      const currentNumber = parseFloat(newValue);
      const displayOperator = operator === '*' ? '×' : '÷';
      const result = operator === '*' ? firstNumber * currentNumber : firstNumber / currentNumber;
      
      newCalculationSteps.push({
        expression: `(${firstNumber}${displayOperator}${currentNumber})=${result}`,
        result: result,
        timestamp: Date.now(),
        stepNumber: 2,
        operationType: 'operation',
        displayValue: `(${firstNumber}${displayOperator}${currentNumber})=${result}`
      });
      
      newArticleCount = 2;
    }
    
    newLastOperation = operator;
    newIsNewNumber = true;
    isActive = true;
  } else if (input === '=' || input === 'ENTER') {
    try {
      let expression = '';
      let result = 0;
      
      if (newCalculationSteps.length === 1 && newLastOperation && newValue !== '0') {
        // Simple case: first_number operator current_number
        const firstNumber = newCalculationSteps[0].result;
        const operator = newLastOperation;
        const currentNumber = parseFloat(newValue);
        
        if (operator === '+' || operator === '-') {
          // For + and - operations, create a transaction step
          expression = `${firstNumber}${operator}${currentNumber}`;
          result = evaluateExpression(expression);
          
          newCalculationSteps.push({
            expression: `${operator === '+' ? '+' : '-'}${currentNumber}`,
            result: currentNumber,
            timestamp: Date.now(),
            stepNumber: 2,
            operationType: 'operation',
            displayValue: `${operator === '+' ? '+' : '-'}${currentNumber}`
          });
        }
      } else if (newCalculationSteps.length >= 2 && newLastOperation && newValue !== '0') {
        // Handle multiple operations
        const currentNumber = parseFloat(newValue);
        const firstStep = newCalculationSteps[0];
        const secondStep = newCalculationSteps[1];
        
        if (newLastOperation === '*' || newLastOperation === '/') {
          // This is a compound operation like 25 + 5 × 3
          // Extract the operand from the addition step expression
          let multiplicationOperand = 0;
          
          // The operand for multiplication should be the number from the addition step
          // For "25 + 5 × 3", we want the 5 from the "+5" expression
          if (secondStep && secondStep.result) {
            multiplicationOperand = secondStep.result;
          }
          
          // Validate we have a valid operand
          if (isNaN(multiplicationOperand) || multiplicationOperand === 0) {
            throw new Error('Invalid multiplication operand');
          }
          
          const displayOperator = newLastOperation === '*' ? '×' : '÷';
          const multiplicationResult = newLastOperation === '*' 
            ? multiplicationOperand * currentNumber 
            : multiplicationOperand / currentNumber;
          
          // Validate multiplication result
          if (isNaN(multiplicationResult) || !isFinite(multiplicationResult)) {
            throw new Error('Invalid multiplication result');
          }
          
          // Replace the second step with the compound operation
          newCalculationSteps[1] = {
            expression: `(${multiplicationOperand}${displayOperator}${currentNumber})=${multiplicationResult}`,
            result: multiplicationResult,
            timestamp: Date.now(),
            stepNumber: 2,
            operationType: 'operation',
            displayValue: `(${multiplicationOperand}${displayOperator}${currentNumber})=${multiplicationResult}`
          };
          
          // Calculate final result: first number + multiplication result
          const firstNumber = firstStep?.result || 0;
          
          // Validate final result
          if (isNaN(firstNumber)) {
            throw new Error('Invalid first number');
          }
          
          result = firstNumber + multiplicationResult;
          
          // Validate final result
          if (isNaN(result) || !isFinite(result)) {
            throw new Error('Invalid final result');
          }
          
          newArticleCount = 2; // Keep only 2 steps
        } else {
          // Sequential addition/subtraction like 10+20+30
          const currentNumber = parseFloat(newValue);
          
          // Add the new operation step
          newCalculationSteps.push({
            expression: `${newLastOperation === '+' ? '+' : newLastOperation === '-' ? '-' : newLastOperation}${currentNumber}`,
            result: currentNumber,
            timestamp: Date.now(),
            stepNumber: newCalculationSteps.length + 1,
            operationType: 'operation',
            displayValue: `${newLastOperation === '+' ? '+' : newLastOperation === '-' ? '-' : newLastOperation}${currentNumber}`
          });
          
          // Calculate result by summing all steps
          result = firstStep.result; // Start with first number (10)
          
          // Add all operation steps
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
          
          newArticleCount = newCalculationSteps.filter(step => 
            step.operationType === 'operation' && (step.expression.startsWith('+') || step.expression.startsWith('-'))
          ).length + 1;
        }
      } else if (newCalculationSteps.length > 0) {
        // Just evaluate what we have
        expression = buildExpressionFromSteps(newCalculationSteps);
        result = evaluateExpression(expression);
      } else {
        // No steps, just use current value
        result = parseFloat(newValue);
      }
      
      // Add result step
      newCalculationSteps.push({
        expression: `=${result}`,
        result: result,
        timestamp: Date.now(),
        stepNumber: -1, // Use -1 to indicate this is a result step
        operationType: 'result',
        displayValue: `=${result}`
      });
      
      // Update state
      newValue = result.toString();
      newGrandTotal += result;
      newLastOperation = null;
      newLastOperand = null;
      newIsNewNumber = true;
      
      // Add to transaction history
      newTransactionHistory.push(result);
      
      // Clear check navigation index
      localStorage.setItem('currentCheckIndex', '-1');
      
    } catch (error) {
      console.error('Calculator error:', error);
      newValue = 'Error';
      newIsNewNumber = true;
    }
  }

  // Format display value
  if (newValue !== 'Error' && !isNaN(parseFloat(newValue))) {
    const num = parseFloat(newValue);
    if (num.toString().length > 12) {
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
 * Build expression from calculation steps
 */
const buildExpressionFromSteps = (steps: CalculationStep[]): string => {
  let expression = '';
  
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    
    if (step.operationType === 'number') {
      expression += step.result;
    } else if (step.operationType === 'operation') {
      if (step.expression.startsWith('(') && step.expression.includes(')=')) {
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