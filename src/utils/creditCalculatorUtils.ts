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
        // First number: 25
        newArticleCount = 1;
        newCalculationSteps.push({
          expression: input,
          result: parseFloat(input),
          timestamp: Date.now(),
          stepNumber: 1,
          operationType: 'number',
          displayValue: input
        });
      } else if (newLastOperation === '+' || newLastOperation === '-') {
        // After operator, create new step: +5, +30, -10, etc.
        newCalculationSteps.push({
          expression: `${newLastOperation}${input}`,
          result: parseFloat(input),
          timestamp: Date.now(),
          stepNumber: newCalculationSteps.length + 1,
          operationType: 'operation',
          displayValue: `${newLastOperation}${input}`
        });
        newArticleCount = newCalculationSteps.length;
      }
      newValue = input;
      newIsNewNumber = false;
    } else {
      // Continuing to type digits - build the number properly (handles decimals)
      if (currentValue.includes('.')) {
        // Building decimal number: 10. + 1 = 10.1
        newValue = currentValue + input;
      } else {
        // Building whole number: 1 + 0 = 10
        newValue = currentValue + input;
      }
      
      // Update the last step if it's a number or operation
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
    }
  } else if (input === '.') {
    // Handle decimal point
    if (newIsNewNumber || currentValue === '0') {
      // Starting a new decimal number
      if (newCalculationSteps.length === 0) {
        // First number: 0.
        newValue = '0.';
        newArticleCount = 1;
        newCalculationSteps.push({
          expression: '0.',
          result: 0,
          timestamp: Date.now(),
          stepNumber: 1,
          operationType: 'number',
          displayValue: '0.'
        });
      } else if (newLastOperation === '+' || newLastOperation === '-') {
        // After operator, create new step: +0., -0., etc.
        newValue = '0.';
        newCalculationSteps.push({
          expression: `${newLastOperation}0.`,
          result: 0,
          timestamp: Date.now(),
          stepNumber: newCalculationSteps.length + 1,
          operationType: 'operation',
          displayValue: `${newLastOperation}0.`
        });
        newArticleCount = newCalculationSteps.length;
      } else {
        newValue = '0.';
      }
      newIsNewNumber = false;
    } else {
      // Adding decimal to existing number
      if (!currentValue.includes('.')) {
        newValue = currentValue + '.';
        
        // Update the last step
        if (newCalculationSteps.length > 0) {
          const lastStep = newCalculationSteps[newCalculationSteps.length - 1];
          if (lastStep.operationType === 'number') {
            lastStep.displayValue = newValue;
            lastStep.expression = newValue;
            lastStep.result = parseFloat(newValue) || 0;
          } else if (lastStep.operationType === 'operation') {
            const operator = lastStep.expression.charAt(0);
            lastStep.displayValue = `${operator}${newValue}`;
            lastStep.expression = `${operator}${newValue}`;
            lastStep.result = parseFloat(newValue) || 0;
          }
        }
      }
    }
  } else if (input === '+' || input === '-') {
    // Handle operators
    newLastOperation = input;
    newIsNewNumber = true;
    
    // Calculate running total for simple addition/subtraction
    if (newCalculationSteps.length === 2) {
      const firstStep = newCalculationSteps[0];
      const secondStep = newCalculationSteps[1];
      
      if (secondStep.expression.startsWith('+')) {
        const runningTotal = firstStep.result + secondStep.result;
        newValue = runningTotal.toString();
        console.log('🔢 Simple addition running total:', {
          first: firstStep.result,
          second: secondStep.result,
          total: runningTotal
        });
      } else if (secondStep.expression.startsWith('-')) {
        const runningTotal = firstStep.result - secondStep.result;
        newValue = runningTotal.toString();
        console.log('🔢 Simple subtraction running total:', {
          first: firstStep.result,
          second: secondStep.result,
          total: runningTotal
        });
      }
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
 * Handles: 25+5×3=40, 100-10÷2=95
 * Addition/subtraction with multiplication/division
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
        // First number: 25
        newArticleCount = 1;
        newCalculationSteps.push({
          expression: input,
          result: parseFloat(input),
          timestamp: Date.now(),
          stepNumber: 1,
          operationType: 'number',
          displayValue: input
        });
      } else if (newCalculationSteps.length === 1 && (newLastOperation === '+' || newLastOperation === '-')) {
        // After 25+, when entering 5, create addition step
        newCalculationSteps.push({
          expression: `${newLastOperation}${input}`,
          result: parseFloat(input),
          timestamp: Date.now(),
          stepNumber: 2,
          operationType: 'operation',
          displayValue: `${newLastOperation}${input}`
        });
        newArticleCount = 2;
      } else if (newCalculationSteps.length === 2 && (newLastOperation === '*' || newLastOperation === '/')) {
        // After 25+5×, when entering 3, create multiplication step
        const displayOperator = newLastOperation === '*' ? '×' : '÷';
        newCalculationSteps.push({
          expression: `${displayOperator}${input}`,
          result: parseFloat(input),
          timestamp: Date.now(),
          stepNumber: 3,
          operationType: 'operation',
          displayValue: `${displayOperator}${input}`
        });
        newArticleCount = 2; // Stay at 2 because we're still working on the second article (5×3)
      } else if (newCalculationSteps.length === 1 && (newLastOperation === '*' || newLastOperation === '/')) {
        // After 100×, when entering 10, create multiplication step
        const displayOperator = newLastOperation === '*' ? '×' : '÷';
        newCalculationSteps.push({
          expression: `${displayOperator}${input}`,
          result: parseFloat(input),
          timestamp: Date.now(),
          stepNumber: 2,
          operationType: 'operation',
          displayValue: `${displayOperator}${input}`
        });
        newArticleCount = 2; // Stay at 2 because we're still working on the second article
      }
      newValue = input;
      newIsNewNumber = false;
    } else {
      // Continuing to type digits - build the number properly (handles decimals)
      if (currentValue.includes('.')) {
        // Building decimal number: 10. + 1 = 10.1
        newValue = currentValue + input;
      } else {
        // Building whole number: 1 + 0 = 10
        newValue = currentValue + input;
      }
      
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
    }
  } else if (input === '.') {
    // Handle decimal point
    if (newIsNewNumber || currentValue === '0') {
      // Starting a new decimal number
      if (newCalculationSteps.length === 0) {
        // First number: 0.
        newValue = '0.';
        newArticleCount = 1;
        newCalculationSteps.push({
          expression: '0.',
          result: 0,
          timestamp: Date.now(),
          stepNumber: 1,
          operationType: 'number',
          displayValue: '0.'
        });
      } else if (newCalculationSteps.length === 1 && (newLastOperation === '+' || newLastOperation === '-')) {
        // After operator, create new step: +0., -0., etc.
        newValue = '0.';
        newCalculationSteps.push({
          expression: `${newLastOperation}0.`,
          result: 0,
          timestamp: Date.now(),
          stepNumber: 2,
          operationType: 'operation',
          displayValue: `${newLastOperation}0.`
        });
        newArticleCount = 2;
      } else if (newCalculationSteps.length === 2 && (newLastOperation === '*' || newLastOperation === '/')) {
        // After multiplication operator, create new step: ×0., ÷0., etc.
        const displayOperator = newLastOperation === '*' ? '×' : '÷';
        newValue = '0.';
        newCalculationSteps.push({
          expression: `${displayOperator}0.`,
          result: 0,
          timestamp: Date.now(),
          stepNumber: 3,
          operationType: 'operation',
          displayValue: `${displayOperator}0.`
        });
        newArticleCount = 3;
      } else if (newCalculationSteps.length === 1 && (newLastOperation === '*' || newLastOperation === '/')) {
        // After 100×, when entering decimal, create multiplication step
        const displayOperator = newLastOperation === '*' ? '×' : '÷';
        newValue = '0.';
        newCalculationSteps.push({
          expression: `${displayOperator}0.`,
          result: 0,
          timestamp: Date.now(),
          stepNumber: 2,
          operationType: 'operation',
          displayValue: `${displayOperator}0.`
        });
        newArticleCount = 2;
      } else {
        newValue = '0.';
      }
      newIsNewNumber = false;
    } else {
      // Adding decimal to existing number
      if (!currentValue.includes('.')) {
        newValue = currentValue + '.';
        
        // Update the last step
        if (newCalculationSteps.length > 0) {
          const lastStep = newCalculationSteps[newCalculationSteps.length - 1];
          if (lastStep.operationType === 'number') {
            lastStep.displayValue = newValue;
            lastStep.expression = newValue;
            lastStep.result = parseFloat(newValue) || 0;
          } else if (lastStep.operationType === 'operation') {
            const operator = lastStep.expression.charAt(0);
            lastStep.displayValue = `${operator}${newValue}`;
            lastStep.expression = `${operator}${newValue}`;
            lastStep.result = parseFloat(newValue) || 0;
          }
        }
      }
    }
  } else if (input === '+' || input === '-' || input === '*' || input === '/') {
    // Handle operators
    // Special handling for + after percentage calculation
    if (input === '+' && newCalculationSteps.length === 2 && 
        newCalculationSteps[1].expression.includes('%')) {
      // This is 100×10%+ case - add percentage result to base
      const baseValue = newCalculationSteps[0].result; // 100
      const percentResult = newCalculationSteps[1].result; // 10
      const finalResult = baseValue + percentResult; // 110
      
      // Update step 2 to show addition
      newCalculationSteps[1] = {
        expression: `+(${newCalculationSteps[1].expression})=${percentResult}`,
        result: percentResult,
        timestamp: Date.now(),
        stepNumber: 2,
        operationType: 'operation',
        displayValue: `+(${newCalculationSteps[1].expression})=${percentResult}`
      };
      
      // Add result step
      newCalculationSteps.push({
        expression: `=${finalResult}`,
        result: finalResult,
        timestamp: Date.now(),
        stepNumber: 3,
        operationType: 'result',
        displayValue: `=${finalResult}`
      });
      
      newValue = finalResult.toString();
      newLastOperation = null;
      newIsNewNumber = true;
      newArticleCount = 3;
      
      // Add to grand total and transaction history
      newGrandTotal += finalResult;
      newTransactionHistory.push(finalResult);
      localStorage.setItem('currentCheckIndex', '-1');
    } else if (input === '+' && newCalculationSteps.length > 0 && 
               newCalculationSteps[newCalculationSteps.length - 1].operationType === 'result') {
      // Handle + after a result (e.g., after 25+5×3=40, pressing + should start new calculation with 40)
      const lastResultStep = newCalculationSteps[newCalculationSteps.length - 1];
      const resultValue = lastResultStep.result; // 40
      
      // Start fresh calculation with the result as the first number
      newCalculationSteps = [{
        expression: resultValue.toString(),
        result: resultValue,
        timestamp: Date.now(),
        stepNumber: 1,
        operationType: 'number',
        displayValue: resultValue.toString()
      }];
      
      newValue = resultValue.toString(); // Display 40
      newLastOperation = input; // Set + as the operation
      newIsNewNumber = true;
      newArticleCount = 1;
      
      // Don't add to grand total yet - wait for the next number and equals
    } else if (input === '+' && newCalculationSteps.length >= 2) {
      // Handle + after compound calculation (e.g., 25+5×3+)
      if (newCalculationSteps.length === 3) {
        // We have: Step 1: "25", Step 2: "+5", Step 3: "×3"
        // Calculate compound: 25 + (5×3) = 25 + 15 = 40
        const firstStep = newCalculationSteps[0]; // "25"
        const secondStep = newCalculationSteps[1]; // "+5"
        const thirdStep = newCalculationSteps[2]; // "×3"
        
        const firstNumber = firstStep.result; // 25
        const additionOperand = secondStep.result; // 5
        const multiplicationOperand = thirdStep.result; // 3
        
        // Calculate compound operation: 5×3=15
        const compoundResult = thirdStep.expression.startsWith('×') 
          ? additionOperand * multiplicationOperand
          : additionOperand / multiplicationOperand;
        
        // Calculate final result: 25 + 15 = 40
        const finalResult = firstNumber + compoundResult;
        
        // Replace step 2 with the compound result
        const displayOperator = thirdStep.expression.charAt(0);
        newCalculationSteps[1] = {
          expression: `(${additionOperand}${displayOperator}${multiplicationOperand})=${compoundResult}`,
          result: compoundResult,
          timestamp: Date.now(),
          stepNumber: 2,
          operationType: 'operation',
          displayValue: `(${additionOperand}${displayOperator}${multiplicationOperand})=${compoundResult}`
        };
        
        // Remove step 3 and add result step
        newCalculationSteps = newCalculationSteps.slice(0, 2);
        newCalculationSteps.push({
          expression: `=${finalResult}`,
          result: finalResult,
          timestamp: Date.now(),
          stepNumber: 3,
          operationType: 'result',
          displayValue: `=${finalResult}`
        });
        
        newValue = finalResult.toString();
        newLastOperation = null;
        newIsNewNumber = true;
        newArticleCount = 3;
      } else if (newCalculationSteps.length === 2) {
        // Simple addition: 10+20+ should show 30
        const firstStep = newCalculationSteps[0];
        const secondStep = newCalculationSteps[1];
        
        if (secondStep.expression.startsWith('+')) {
          const result = firstStep.result + secondStep.result;
          newValue = result.toString();
          newIsNewNumber = true;
        }
      }
    } else if (input === '+' && newCalculationSteps.length === 1) {
      // Handle + after single number (e.g., 25+)
      // Display should stay as the current number (25)
      newValue = currentValue;
    } else {
      // Normal operator handling
    newLastOperation = input;
    newIsNewNumber = true;
    }
  } else if (input === '=' || input === 'ENTER') {
    // Handle equals - check if we already have a percentage calculation
    if (newCalculationSteps.length > 0) {
      console.log('🔢 Equals pressed - Debug info:', {
        currentValue,
        calculationSteps: newCalculationSteps,
        lastStep: newCalculationSteps[newCalculationSteps.length - 1]
      });
      
      const lastStep = newCalculationSteps[newCalculationSteps.length - 1];
      
      // If the last step is already a percentage calculation, just add result step
      if (lastStep.expression.includes('%')) {
        console.log('🔢 Found percentage step, using result:', lastStep.result);
        // Already calculated percentage (like "(100×10%)=10"), just add result step
        result = lastStep.result; // Use the percentage result (10)
        
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
        newArticleCount = newCalculationSteps.length;
        
        // Add to grand total and transaction history
        newGrandTotal += result;
        newTransactionHistory.push(result);
        localStorage.setItem('currentCheckIndex', '-1');
        
        console.log('🔢 Percentage equals result:', {
          result,
          newValue,
          steps: newCalculationSteps
        });
      } else {
        // Regular calculation
        if (newCalculationSteps.length === 3) {
          // Compound calculation: 25+5×3 = 25 + (5×3) = 25 + 15 = 40
          const firstStep = newCalculationSteps[0]; // "25"
          const secondStep = newCalculationSteps[1]; // "+5"
          const thirdStep = newCalculationSteps[2]; // "×3"
          
          // Extract operands correctly
          const firstNumber = firstStep.result; // 25
          const additionOperand = secondStep.result; // 5 (from "+5")
          const multiplicationOperand = thirdStep.result; // 3 (from "×3")
          
          // Calculate compound operation: 5×3=15 (NOT 25×5)
          const compoundResult = thirdStep.expression.startsWith('×') 
            ? additionOperand * multiplicationOperand
            : additionOperand / multiplicationOperand;
          
          // Replace step 2 with the compound result: (5×3)=15
          const displayOperator = thirdStep.expression.charAt(0);
          newCalculationSteps[1] = {
            expression: `(${additionOperand}${displayOperator}${multiplicationOperand})=${compoundResult}`,
            result: compoundResult,
            timestamp: Date.now(),
            stepNumber: 2,
            operationType: 'operation',
            displayValue: `(${additionOperand}${displayOperator}${multiplicationOperand})=${compoundResult}`
          };
          
          // Remove step 3 since it's now incorporated into step 2
          newCalculationSteps = newCalculationSteps.slice(0, 2);
          newArticleCount = 2;
          
          // Calculate final result: 25 + 15 = 40 (NOT 25 + 5)
          result = firstNumber + compoundResult;
        } else if (newCalculationSteps.length > 0) {
          // Simple calculation or other cases
          const expression = buildSimpleExpression(newCalculationSteps);
          result = evaluateExpression(expression);
        }
        
        if (result !== undefined) {
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
        }
      }
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
 * FIXED: Now properly detects when × or ÷ is involved
 */
const isCompoundCalculation = (calculationSteps: CalculationStep[], lastOperation: string | null): boolean => {
  // Check if we have multiplication or division operations in steps
  const hasMultiplyDivideInSteps = calculationSteps.some(step => 
    step.expression.includes('×') || step.expression.includes('÷') || 
    step.expression.includes('*') || step.expression.includes('/')
  );
  
  // Check if current operation is multiplication or division
  const hasMultiplyDivideInOperation = (lastOperation === '*' || lastOperation === '/' || lastOperation === '×' || lastOperation === '÷');
  
  // Return true if EITHER condition is met
  return hasMultiplyDivideInSteps || hasMultiplyDivideInOperation;
};

/**
 * Enhanced calculator input processor with separated flows
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
  
  // FIXED: Check if we need to switch to compound calculation
  // This happens when we encounter × or ÷ operators
  let tempLastOperationForCompoundCheck = newLastOperation;
  if (input === '*' || input === '/' || input === '×' || input === '÷') {
    tempLastOperationForCompoundCheck = input;
  }
  
  // Determine which flow to use - check FUTURE state, not just current
  const willBeCompound = isCompoundCalculation(newCalculationSteps, tempLastOperationForCompoundCheck);
  
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
        displayValue: `(${baseValue}×${percentageValue}%)=${percentResult}`
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
          displayValue: `${percentResult}%`
        };
      } else {
        newCalculationSteps = [{
          expression: `${percentResult}%`,
          result: percentResult,
          timestamp: Date.now(),
          stepNumber: 1,
          operationType: 'number',
          displayValue: `${percentResult}%`
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
    if (willBeCompound) {
      // Use compound calculation flow
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