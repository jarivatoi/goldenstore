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
    console.log('🧮 evaluateExpression input:', expression);
    
    // Replace display symbols with JavaScript operators for evaluation
    let cleanExpression = expression
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/x/g, '*');
    
    console.log('🧮 cleanExpression after symbol replacement:', cleanExpression);
    
    // Remove trailing operators before evaluation
    cleanExpression = cleanExpression.replace(/[+\-*/÷×]+$/, '');
    
    console.log('🧮 cleanExpression after removing trailing operators:', cleanExpression);
    
    // If expression is empty after cleaning, use 0
    if (!cleanExpression || cleanExpression === '') {
      console.log('🧮 Expression is empty, returning 0');
      return 0;
    }
    
    const result = Function('"use strict"; return (' + cleanExpression + ')')();
    
    console.log('🧮 Raw calculation result:', result);
    
    if (isNaN(result) || !isFinite(result)) {
      console.log('🧮 Result is NaN or infinite, returning 0');
      return 0;
    }
    
    console.log('🧮 Final result:', result);
    return result;
  } catch {
    console.log('🧮 Evaluation failed, returning 0');
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
  console.log('🔍 processSimpleCalculation called:', {
    input,
    currentValue,
    articleCount,
    calculationStepsLength: calculationSteps.length,
    lastOperation,
    isNewNumber
  });

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
        console.log('📊 First number - setting articleCount to 1');
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
        // Only increment counter for + and - operators (not × or ÷)
        if (newLastOperation === '+' || newLastOperation === '-') {
          newArticleCount++;
        }
        console.log('📊 After operator - setting articleCount to:', newArticleCount);
        
        // Handle the case where input might be a decimal like "0.4"
        const displayInput = input.startsWith('0.') ? input : input;
        const numericValue = parseFloat(input);
        
        newCalculationSteps.push({
          expression: `${newLastOperation}${displayInput}`,
          result: numericValue,
          timestamp: Date.now(),
  stepNumber: newArticleCount,
          operationType: 'operation',
          displayValue: `${newLastOperation}${displayInput}`,
          isComplete: false,
          operator: newLastOperation
        });
      }
      newValue = input;
      newIsNewNumber = false;
    } else {
      // Building existing number: 1 + 0 = 10, 2 + 0 = 20
      newValue = currentValue + input;
      console.log('📊 Building number - keeping articleCount at:', newArticleCount);
      
      // Update the last step
      if (newCalculationSteps.length > 0) {
        const lastStep = newCalculationSteps[newCalculationSteps.length - 1];
        if (lastStep.operationType === 'number') {
          lastStep.displayValue = newValue;
          lastStep.expression = newValue;
          lastStep.result = parseFloat(newValue);
          lastStep.isComplete = false;
          // Don't change article count when building numbers
        } else if (lastStep.operationType === 'operation') {
          const operator = lastStep.operator === '*' ? '×' : 
                          lastStep.operator === '/' ? '÷' : 
                          lastStep.operator || lastStep.expression.charAt(0);
          lastStep.displayValue = `${operator}${newValue}`;
          lastStep.expression = `${operator}${newValue}`;
          lastStep.result = parseFloat(newValue);
          lastStep.isComplete = false;
        }
      } else {
        // If no calculation steps exist but we're building a number, create the first step
        console.log('📊 Creating first step while building number:', newValue);
        newCalculationSteps.push({
          expression: newValue,
          result: parseFloat(newValue) || 0,
          timestamp: Date.now(),
          stepNumber: 1,
          operationType: 'number',
          displayValue: newValue,
          isComplete: false
        });
        newArticleCount = 1;
      }
    }
  } else if (input === '.') {
    // Handle decimal point - add to current number
    if (!currentValue.includes('.')) {
      // If current value is '0' or we're starting a new number, show '0.'
      if (currentValue === '0' || newIsNewNumber) {
        newValue = '0.';
        newIsNewNumber = false;
        
        // Create first calculation step for decimal number if none exists
        if (newCalculationSteps.length === 0) {
          console.log('📊 Creating first decimal step for 0.');
          newCalculationSteps.push({
            expression: '0.',
            result: 0.0,
            timestamp: Date.now(),
            stepNumber: 1,
            operationType: 'number',
            displayValue: '0.',
            isComplete: false
          });
          newArticleCount = 1;
        }
        
        // Update the calculation steps to reflect the leading zero
        if (newCalculationSteps.length > 0) {
          const lastStep = newCalculationSteps[newCalculationSteps.length - 1];
          if (lastStep.operationType === 'operation' && newIsNewNumber) {
            // We're starting a new number after an operator, update the step
            const operator = lastStep.operator === '*' ? '×' : 
                            lastStep.operator === '/' ? '÷' : 
                            lastStep.operator;
            lastStep.displayValue = `${operator}0.`;
            lastStep.expression = `${lastStep.operator}0.`;
            lastStep.result = 0.0;
            lastStep.isComplete = false;
          }
        }
      } else {
        newValue = currentValue + '.';
        
        // Update the last step with the decimal
        if (newCalculationSteps.length > 0) {
          const lastStep = newCalculationSteps[newCalculationSteps.length - 1];
          if (lastStep.operationType === 'number') {
            lastStep.displayValue = newValue;
            lastStep.expression = newValue;
            lastStep.result = parseFloat(newValue);
            lastStep.isComplete = false;
          } else if (lastStep.operationType === 'operation') {
            const operator = lastStep.operator === '*' ? '×' : 
                            lastStep.operator === '/' ? '÷' : 
                            lastStep.operator;
            lastStep.displayValue = `${operator}${newValue}`;
            lastStep.expression = `${lastStep.operator || operator}${newValue}`;
            lastStep.result = parseFloat(newValue);
            lastStep.isComplete = false;
          }
        }
      }
    }
  } else if (input === '+' || input === '-') {
    // Handle + and - operators
    console.log('📊 Operator pressed - preserving articleCount:', newArticleCount);
    
    // Calculate intermediate result if we have calculation steps
    if (newCalculationSteps.length > 0) {
      // Mark all previous steps as complete for intermediate calculation
      const stepsForCalculation = newCalculationSteps.map(step => ({ ...step, isComplete: true }));
      
      // Determine if it's compound or simple calculation
      const isCompound = isCompoundCalculation(stepsForCalculation, newLastOperation);
      
      let intermediateResult: number;
      if (isCompound) {
        const expression = buildCompoundExpression(stepsForCalculation);
        intermediateResult = evaluateExpression(expression);
      } else {
        const expression = buildSimpleExpression(stepsForCalculation);
        intermediateResult = evaluateExpression(expression);
      }
      
      // Update display to show intermediate result
      newValue = intermediateResult.toString();
      console.log('📊 Intermediate result calculated:', intermediateResult);
    }
    
    // Store the operator and ensure article count is preserved
    newLastOperation = input;
    newIsNewNumber = true;
    // CRITICAL: Don't modify newArticleCount here - preserve existing count
  } else if (input === '=' || input === 'ENTER') {
    // Handle equals - check if we already have a completed calculation
    if (newCalculationSteps.length > 0 && newCalculationSteps.some(step => step.isComplete)) {
      // Already have a completed calculation (like percentage), just keep the current value
      // Don't recalculate or change anything
      newValue = currentValue;
      newIsNewNumber = true;
    } else if (newCalculationSteps.length > 0) {
      // Calculate result for incomplete operations
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
    } else {
      // No calculation steps, just keep current value
      newValue = currentValue;
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
  console.log('🔍 processCompoundCalculation:', { currentValue, input, calculationSteps, lastOperation, isNewNumber });
  
  let newValue = currentValue;
  let newCalculationSteps = [...calculationSteps];
  let newLastOperation = lastOperation;
  let newIsNewNumber = isNewNumber;
  let newArticleCount = articleCount;
  let newGrandTotal = grandTotal;
  let newTransactionHistory = [...transactionHistory];
  let result: number | undefined;

  // If we have no calculation steps but a current value and we're getting an operator,
  // we need to create the first step with the current value
  if (newCalculationSteps.length === 0 && (input === '*' || input === '/' || input === '+' || input === '-')) {
    const currentNum = parseFloat(currentValue);
    if (!isNaN(currentNum)) {
      console.log('📊 Creating first step from current value:', currentValue, currentNum);
      newCalculationSteps.push({
        expression: currentValue,
        result: currentNum,
        timestamp: Date.now(),
        stepNumber: 1,
        operationType: 'number',
        displayValue: currentValue,
        isComplete: false
      });
      newArticleCount = 1;
    }
  }

  if (/^\d+$/.test(input) || input === '00' || input === '000') {
    // Handle numeric input
    if (newIsNewNumber || currentValue === '0') {
      if (newCalculationSteps.length === 0) {
        // First number
        // Handle the case where input might be a decimal like "0.4"
        const numericValue = parseFloat(input);
        console.log('📊 First number in compound:', { input, numericValue });
        
        newCalculationSteps.push({
          expression: input,
          result: numericValue,
          timestamp: Date.now(),
          stepNumber: 1,
          operationType: 'number',
          displayValue: input,
          isComplete: false
        });
        newArticleCount = 1;
      } else if (newLastOperation && newIsNewNumber) {
        // After any operator, create new step
        // Only increment counter for + and - operators (not × or ÷)
        if (newLastOperation === '+' || newLastOperation === '-') {
          newArticleCount++;
        }
        const numericValue = parseFloat(input) || 0;
        console.log('📊 After operator in compound:', { input, numericValue, lastOperation: newLastOperation });
        
        const displayOperator = newLastOperation === '*' ? '×' : 
                               newLastOperation === '/' ? '÷' : 
                               newLastOperation;
        newCalculationSteps.push({
          expression: `${newLastOperation}${input}`,
          result: numericValue,
          timestamp: Date.now(),
          stepNumber: newCalculationSteps.length + 1,
          operationType: 'operation',
          displayValue: `${displayOperator}${input}`,
          isComplete: false,
          operator: newLastOperation
        });
      }
      newValue = input;
      newIsNewNumber = false;
    } else {
      // Building existing number
      newValue = currentValue + input;
      console.log('📊 Building number in compound:', { currentValue, input, newValue });
      
      // Update the last step
      if (newCalculationSteps.length > 0) {
        const lastStep = newCalculationSteps[newCalculationSteps.length - 1];
        if (lastStep.operationType === 'number') {
        console.log('📊 Updating last step:', { newValue, numericValue, lastStep });
          lastStep.displayValue = newValue;
          lastStep.expression = newValue;
          lastStep.result = parseFloat(newValue) || 0;
          lastStep.isComplete = false;
          // Keep the article count when building numbers
          newArticleCount = 1;
        } else if (lastStep.operationType === 'operation') {
          const operator = lastStep.operator === '*' ? '×' : 
                          lastStep.operator === '/' ? '÷' : 
                          lastStep.operator || lastStep.expression.charAt(0);
          lastStep.displayValue = `${operator}${newValue}`;
          lastStep.expression = `${lastStep.operator || operator}${newValue}`;
          lastStep.result = parseFloat(newValue) || 0;
          lastStep.isComplete = false;
        }
      }
    }
  } else if (input === '.') {
    // Handle decimal point
    console.log('📊 Decimal point in compound:', { currentValue, isNewNumber: newIsNewNumber });
    if (!currentValue.includes('.')) {
      // If current value is '0' or we're starting a new number, show '0.'
      if (currentValue === '0' || newIsNewNumber) {
        newValue = '0.';
        newIsNewNumber = false;
        console.log('📊 Setting decimal to 0.:', { newValue });
      } else {
        newValue = currentValue + '.';
      }
    }
  } else if (input === '*' || input === '/' || input === '×' || input === '÷') {
    // Handle multiplication and division operators
    console.log('📊 * or / operator pressed in compound calculation');
    
    // Calculate intermediate result before allowing next operation
    if (newCalculationSteps.length > 0) {
      // Build and evaluate the expression with proper precedence
      const expression = buildCompoundExpression(newCalculationSteps);
      const intermediateResult = evaluateExpression(expression);
      
      // Update display to show intermediate result
      newValue = intermediateResult.toString();
      console.log('📊 Intermediate result calculated:', intermediateResult);
      
      // Replace all steps with the intermediate result as a new base value
      newCalculationSteps = [{
        expression: intermediateResult.toString(),
        result: intermediateResult,
        timestamp: Date.now(),
        stepNumber: 1,
        operationType: 'number',
        displayValue: intermediateResult.toString(),
        isComplete: false
      }];
    }
    
    // Now add the new operation step
    newCalculationSteps.push({
      expression: `${input}`,
      result: 0,
      timestamp: Date.now(),
      stepNumber: newCalculationSteps.length + 1,
      operationType: 'operation',
      displayValue: `${input}`,
      isComplete: false,
      operator: input
    });
    
    newLastOperation = input;
    newIsNewNumber = true;
    console.log('📊 Updated calculation steps after * or / operation:', newCalculationSteps);
  } else if (input === '+' || input === '-') {
    // Handle + and - operators in compound calculations
    console.log('📊 + or - operator pressed in compound calculation');
    
    // Calculate intermediate result before allowing next operation
    if (newCalculationSteps.length > 0) {
      // Build and evaluate the expression with proper precedence
      const expression = buildCompoundExpression(newCalculationSteps);
      const intermediateResult = evaluateExpression(expression);
      
      // Update display to show intermediate result
      newValue = intermediateResult.toString();
      console.log('📊 Intermediate result calculated:', intermediateResult);
      
      // Replace all steps with the intermediate result as a new base value
      newCalculationSteps = [{
        expression: intermediateResult.toString(),
        result: intermediateResult,
        timestamp: Date.now(),
        stepNumber: 1,
        operationType: 'number',
        displayValue: intermediateResult.toString(),
        isComplete: false
      }];
      
      // Now add the new operation step
      newCalculationSteps.push({
        expression: `${input}`,
        result: 0,
        timestamp: Date.now(),
        stepNumber: 2,
        operationType: 'operation',
        displayValue: `${input}`,
        isComplete: false,
        operator: input
      });
      
      console.log('📊 Updated calculation steps after + operation:', newCalculationSteps);
    }
    
    newLastOperation = input;
    newIsNewNumber = true;
  } else if (input === '=' || input === 'ENTER') {
    // Handle equals for compound operations
    if (newCalculationSteps.length > 0 && newCalculationSteps.some(step => step.isComplete)) {
      // Already have a completed calculation (like percentage), just keep the current value
      newValue = currentValue;
      newIsNewNumber = true;
    } else if (newCalculationSteps.length > 0) {
      // Calculate result for incomplete compound operations
      // Mark all previous steps as complete
      newCalculationSteps.forEach(step => {
        step.isComplete = true;
      });
      
      const expression = buildCompoundExpression(newCalculationSteps);
      result = evaluateExpression(expression);
      
      // Format the result properly for display
      if (result % 1 === 0) {
        // Whole number - display without decimals
        newValue = result.toString();
      } else {
        // Decimal number - round to reasonable precision and remove trailing zeros
        newValue = parseFloat(result.toFixed(10)).toString();
      }
      
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
 * Build expression from compound calculation steps with proper operator precedence
 */
const buildCompoundExpression = (steps: CalculationStep[]): string => {
  let expression = '';
  console.log('🔧 buildCompoundExpression input steps:', steps.map(s => ({ 
    displayValue: s.displayValue, 
    result: s.result, 
    expression: s.expression, 
    operator: s.operator 
  })));
  
  // First pass: handle multiplication and division with proper precedence
  let processedSteps = [...steps];
  let i = 0;
  
  while (i < processedSteps.length) {
    const step = processedSteps[i];
    
    if (step.operationType === 'operation' && 
        (step.operator === '*' || step.operator === '/' || step.operator === '×' || step.operator === '÷')) {
      
      // We found a multiplication/division operation
      if (i > 0 && processedSteps[i - 1].operationType === 'number') {
        const leftOperand = processedSteps[i - 1].result;
        const rightOperand = step.result;
        const operator = step.operator;
        
        // Calculate the multiplication/division
        let subResult: number;
        if (operator === '*' || operator === '×') {
          subResult = leftOperand * rightOperand;
        } else if (operator === '/' || operator === '÷') {
          subResult = rightOperand !== 0 ? leftOperand / rightOperand : 0;
        } else {
          subResult = rightOperand;
        }
        
        // Replace the three elements (left operand, operation, right operand) with the result
        const beforeSteps = processedSteps.slice(0, i - 1);
        const afterSteps = processedSteps.slice(i + 1);
        
        const evaluatedStep: CalculationStep = {
          expression: `(${leftOperand}${operator === '*' ? '×' : '÷'}${rightOperand})`,
          result: subResult,
          timestamp: Date.now(),
          stepNumber: i,
          operationType: 'number',
          displayValue: subResult.toString(),
          isComplete: true
        };
        
        processedSteps = [...beforeSteps, evaluatedStep, ...afterSteps];
        i = i - 1; // Move back to check if there are more operations
      }
    }
    i++;
  }
  
  // Second pass: build the final expression with addition/subtraction
  for (let i = 0; i < processedSteps.length; i++) {
    const step = processedSteps[i];
    
    if (step.operationType === 'number') {
      if (i > 0 && processedSteps[i - 1].operationType === 'operation') {
        expression += step.result;
      } else {
        expression += step.result;
      }
    } else if (step.operationType === 'operation') {
      // Use the stored operator for building expression
      expression += (step.operator || '');
    }
  }
  
  console.log('🔧 Final compound expression after precedence handling:', expression);
  return expression;
};

/**
 * Determine if calculation is compound
 * Simple: Only + and - operators
 * Compound: Any × or ÷ operators
 */
const isCompoundCalculation = (calculationSteps: CalculationStep[], lastOperation: string | null): boolean => {
  // Check if any step contains multiplication or division
  for (const step of calculationSteps) {
    // Check expression
    if (step.expression.includes('*') || 
        step.expression.includes('/') || 
        step.expression.includes('×') || 
        step.expression.includes('÷')) {
      return true;
    }
    
    // Check operator property
    if (step.operator === '*' || step.operator === '/' || step.operator === '×' || step.operator === '÷') {
      return true;
    }
    
    // Check display value (for completed calculations)
    if (step.displayValue && (step.displayValue.includes('×') || step.displayValue.includes('÷'))) {
      return true;
    }
    
    // For completed calculations, check if the step represents a multiplication/division operation
    if (step.isComplete && step.operationType === 'operation') {
      if (step.displayValue && (step.displayValue.includes('×') || step.displayValue.includes('÷'))) {
        return true;
      }
    }
  }
  
  // Check if current operation is × or ÷
  return lastOperation === '*' || lastOperation === '/' || lastOperation === '×' || lastOperation === '÷';
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
        startAutoReplaySequence(newCalculationSteps, newLastOperation, newIsNewNumber);
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
      
      // Check if we have a completed calculation (result available)
      const hasResult = newCalculationSteps.some(step => step.isComplete);
      const totalPositions = hasResult ? newCalculationSteps.length + 1 : newCalculationSteps.length;
      
      if (currentStepIndex >= totalPositions) {
        currentStepIndex = 0; // Wrap to beginning
      }
      
      // Save new index
      localStorage.setItem('currentCheckIndex', currentStepIndex.toString());
      
      // Check if we're showing the result
      if (hasResult && currentStepIndex === newCalculationSteps.length) {
        // Show the result
        // For percentage calculations, use the last step's result
        const lastStep = newCalculationSteps[newCalculationSteps.length - 1];
        if (lastStep && lastStep.isComplete && lastStep.displayValue.includes('%')) {
          // Use the percentage result directly
          newValue = `=${lastStep.result}`;
        } else {
          // For other calculations, build expression
          const expression = buildSimpleExpression(newCalculationSteps);
          const resultValue = evaluateExpression(expression);
          newValue = `=${resultValue}`;
        }
        newArticleCount = newCalculationSteps.length;
      } else {
        // Get the step and update display
        const currentStep = newCalculationSteps[currentStepIndex];
        newValue = currentStep.displayValue;
        newArticleCount = currentStepIndex + 1;
      }
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
      
      // Check if we have a completed calculation (result available)
      const hasResult = newCalculationSteps.some(step => step.isComplete);
      const totalPositions = hasResult ? newCalculationSteps.length + 1 : newCalculationSteps.length;
      
      // Move to previous step
      currentStepIndex--;
      if (currentStepIndex < 0) {
        currentStepIndex = totalPositions - 1; // Wrap to end (including result if available)
      }
      
      // Save new index
      localStorage.setItem('currentCheckIndex', currentStepIndex.toString());
      
      // Check if we're showing the result
      if (hasResult && currentStepIndex === newCalculationSteps.length) {
        // Show the result
        const expression = buildSimpleExpression(newCalculationSteps);
        const resultValue = evaluateExpression(expression);
        newValue = `=${resultValue}`;
        newArticleCount = newCalculationSteps.length;
      } else {
        // Get the step and update display
        const currentStep = newCalculationSteps[currentStepIndex];
        newValue = currentStep.displayValue;
        newArticleCount = currentStepIndex + 1;
      }
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
    if (newLastOperation === '*' || newLastOperation === '×') {
      // For 100×10%, we have:
      // Step 1: "100" (base value)
      // Step 2: "×10" (percentage value)
      
      if (newCalculationSteps.length >= 2) {
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
          isComplete: true // Mark as complete since percentage calculation is finished
        };
        
        // Show the percentage result (10) in display
        newValue = percentResult.toString();
        newLastOperation = null; // Keep operation cleared
        newIsNewNumber = true;
        newArticleCount = 1; // Keep article count at 1 for percentage calculations
        
        // Store the percentage result as the current base value for next operations
        // Replace the calculation steps with a single step containing the percentage result
        newCalculationSteps = [{
          expression: percentResult.toString(),
          result: percentResult,
          timestamp: Date.now(),
          stepNumber: 1,
          operationType: 'number',
          displayValue: percentResult.toString(),
          isComplete: false // Mark as incomplete so it can be used in further calculations
        }];
      } else {
        // Simple percentage calculation if we don't have enough steps
        const percentResult = Math.round((currentNum / 100) * 100) / 100;
        newValue = percentResult.toString();
        newIsNewNumber = true;
        
        // Replace all steps with the percentage result as a new base value
        newCalculationSteps = [{
          expression: percentResult.toString(),
          result: percentResult,
          timestamp: Date.now(),
          stepNumber: 1,
          operationType: 'number',
          displayValue: percentResult.toString(),
          isComplete: false
        }];
        newArticleCount = 1;
      }
    } else {
      // Simple percentage calculation for other operations
      const percentResult = Math.round((currentNum / 100) * 100) / 100;
      newValue = percentResult.toString();
      newIsNewNumber = true;
      
      // Replace all steps with the percentage result as a new base value
      newCalculationSteps = [{
        expression: percentResult.toString(),
        result: percentResult,
        timestamp: Date.now(),
        stepNumber: 1,
        operationType: 'number',
        displayValue: percentResult.toString(),
        isComplete: false
      }];
      newArticleCount = 1;
    }
  } else if (input === '√') {
    // Square root
    const currentNum = getCurrentNumber();
    if (currentNum < 0) {
      newValue = 'Error';
    } else {
      const sqrtResult = Math.sqrt(currentNum);
      newValue = sqrtResult.toString();
      
      // Replace calculation steps with the square root result as a new base value
      newCalculationSteps = [{
        expression: sqrtResult.toString(),
        result: sqrtResult,
        timestamp: Date.now(),
        stepNumber: 1,
        operationType: 'number',
        displayValue: sqrtResult.toString(),
        isComplete: false // Mark as incomplete so it can be used in further calculations
      }];
      newArticleCount = 1;
      
      // Clear any pending operation since square root completes the current number
      newLastOperation = null;
    }
    newIsNewNumber = true;
  } else if (input === 'LINK') {
    // Link function - could be used for linking to client or other functionality
    // For now, just keep current value
    newValue = currentValue;
    newIsNewNumber = false;
  } else if (input === '.') {
    // Handle decimal point - route to appropriate pathway
    // Pre-process decimal input to add leading zero if needed
    let processedInput = input;
    if (currentValue === '0' || isNewNumber) {
      // If starting new number or current value is 0, we'll handle this in the flows
      processedInput = '.';
    }
    
    const willBeCompound = isCompound;
    if (willBeCompound) {
      // Use compound calculation flow for decimal
      const compoundResult = processCompoundCalculation(
        currentValue, processedInput, newCalculationSteps, newLastOperation,
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
        currentValue, processedInput, newCalculationSteps, newLastOperation,
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
    let willBeCompound = input === '*' || input === '/' || input === '×' || input === '÷' || 
                        isCompoundCalculation(newCalculationSteps, newLastOperation);
    
    // Special handling for = key - treat it like the previous operator
    if (input === '=' || input === 'ENTER') {
      // If we have existing steps, use the same type as the existing calculation
      if (newCalculationSteps.length > 0) {
        willBeCompound = isCompoundCalculation(newCalculationSteps, newLastOperation);
      }
    }
    
    if (willBeCompound) {
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
          console.log('📊 Created first decimal step');

  // Format display value - preserve decimal formatting
  if (newValue !== 'Error' && newValue !== '0.' && !isNaN(parseFloat(newValue))) {
    const num = parseFloat(newValue);
    if (num > 999999999999 || (num < 0.000001 && num !== 0)) {
      newValue = num.toExponential(6);
    } else if (input === '=' || input === 'ENTER') {
      // Smart decimal formatting for final results
      if (newValue.includes('.')) {
        const decimalPart = newValue.split('.')[1];
        if (decimalPart && decimalPart.length === 1) {
          // Only format 1 decimal place to 2 decimal places (1.2 -> 1.20)
          newValue = num.toFixed(2);
        } else {
          // Keep longer decimals as-is (1.235 stays 1.235, 1.52648 stays 1.52648)
          newValue = num.toString();
          console.log('📊 Created decimal step after operator');
        }
      } else {
        // Whole numbers stay as whole numbers (10 stays 10, not 10.00)
        newValue = num.toString();
      }
    } else {
      // During typing, preserve exact user input including decimals
      // Don't format decimals until final result
      newValue = newValue; // Keep as-is during input
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
const startAutoReplaySequence = (steps: CalculationStep[], lastOperation: string | null, isNewNumber: boolean) => {
  let currentStepIndex = 0;
  
  // Check if we have a completed calculation or need to calculate result
  const hasCompletedCalculation = steps.some(step => step.isComplete);
  let calculationResult: number | null = null;
  
  // If calculation is not complete, calculate the result
  if (!hasCompletedCalculation && steps.length > 0) {
    // Determine if it's compound or simple calculation
    const isCompound = isCompoundCalculation(steps, lastOperation);
    
    if (isCompound) {
      const expression = buildCompoundExpression(steps);
      calculationResult = evaluateExpression(expression);
    } else {
      const expression = buildSimpleExpression(steps);
      calculationResult = evaluateExpression(expression);
    }
  }
  
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
      
      // Continue to next step or show result
      if (currentStepIndex < steps.length) {
        setTimeout(showNextStep, 1000);
      } else if (calculationResult !== null) {
        // Show calculated result
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('autoReplayStep', {
            detail: {
              displayValue: `=${calculationResult}`,
              stepIndex: currentStepIndex,
              totalSteps: steps.length + 1, // Include result in total
              currentStep: currentStepIndex + 1,
              articleCount: steps.length
            }
          }));
          
          localStorage.setItem('currentCheckIndex', currentStepIndex.toString());
          
          // Complete the auto replay
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('autoReplayComplete'));
          }, 1000);
        }, 1000);
      } else if (hasCompletedCalculation) {
        // For completed calculations, show the final result from the last step
        setTimeout(() => {
          const lastStep = steps[steps.length - 1];
          let finalResult;
          
          if (lastStep.displayValue.includes('%')) {
            // For percentage calculations, use the percentage result
            finalResult = lastStep.result;
          } else {
            // For other completed calculations, evaluate the full expression
            const isCompound = isCompoundCalculation(steps, null);
            const expression = isCompound ? buildCompoundExpression(steps) : buildSimpleExpression(steps);
            finalResult = evaluateExpression(expression);
          }
          
          window.dispatchEvent(new CustomEvent('autoReplayStep', {
            detail: {
              displayValue: `=${finalResult}`,
              stepIndex: currentStepIndex,
              totalSteps: steps.length + 1,
              currentStep: currentStepIndex + 1,
              articleCount: steps.length
            }
          }));
          
          localStorage.setItem('currentCheckIndex', currentStepIndex.toString());
          
          // Complete the auto replay
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('autoReplayComplete'));
          }, 1000);
        }, 1000);
      } else {
        // No result to show, complete immediately
        window.dispatchEvent(new CustomEvent('autoReplayComplete'));
      }
    }
  };
  
  showNextStep();
};