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
 * Initialize calculator state
 */
export const initCalculatorState = (): CalculatorState & { articleCount: number } => ({
  display: '1',
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
  
  // Helper function to get current number

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
    
    // Check if we're pressing the same operator repeatedly
    // If so, don't perform any calculation, just update the operator
    if (newLastOperation === input && newIsNewNumber) {
      // Repeated operator press - just update the operator
      newLastOperation = input;
      return {
        value: newValue,
        calculationSteps: newCalculationSteps,
        lastOperation: newLastOperation,
        isNewNumber: newIsNewNumber,
        articleCount: newArticleCount,
        grandTotal: newGrandTotal,
        transactionHistory: newTransactionHistory
      };
    }
    
    // Check if we're switching between + and - operators
    // If so, don't perform any calculation, just update the operator
    if ((newLastOperation === '+' || newLastOperation === '-') && newIsNewNumber) {
      // Switching between + and - operators - just update the operator
      newLastOperation = input;
      newIsNewNumber = true;
      return {
        value: newValue,
        calculationSteps: newCalculationSteps,
        lastOperation: newLastOperation,
        isNewNumber: newIsNewNumber,
        articleCount: newArticleCount,
        grandTotal: newGrandTotal,
        transactionHistory: newTransactionHistory
      };
    }
    
    // Special case: If minus is pressed when starting fresh or just after operator,
    // treat it as sign change instead of subtraction
    if (input === '-' && (currentValue === '0' || newIsNewNumber) && 
        (newLastOperation === null || newLastOperation === '+' || newLastOperation === '-' ||
         newLastOperation === '*' || newLastOperation === '×' || newLastOperation === '/' || newLastOperation === '÷')) {
      // Sign change: toggle negative/positive
      if (currentValue.startsWith('-')) {
        newValue = currentValue.substring(1); // Remove negative sign
      } else if (currentValue !== '0') {
        newValue = '-' + currentValue; // Add negative sign
      } else {
        newValue = '-'; // Start building negative number
      }
      newIsNewNumber = false;
      return {
        value: newValue,
        calculationSteps: newCalculationSteps,
        lastOperation: newLastOperation,
        isNewNumber: newIsNewNumber,
        articleCount: newArticleCount,
        grandTotal: newGrandTotal,
        transactionHistory: newTransactionHistory
      };
    }
    
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
      // For continuous equals operations (like 2+==== or 2x====), we need to preserve the last operation
      // and update the last operand to the result so that subsequent equals presses continue the operation
      const shouldPreserveOperation = newLastOperation === '+' || newLastOperation === '-' || 
                                   newLastOperation === '*' || newLastOperation === '/';
      newLastOperation = shouldPreserveOperation ? newLastOperation : null;
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
  transactionHistory: number[] = [],
  lastOperand: number | null = null
): {
  value: string;
  calculationSteps: CalculationStep[];
  lastOperation: string | null;
  isNewNumber: boolean;
  articleCount: number;
  grandTotal: number;
  transactionHistory: number[];
  lastOperand: number | null;
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
  
  // Helper function to get current number
  const getCurrentNumber = (): number => {
    const num = parseFloat(currentValue);
    return isNaN(num) ? 0 : num;
  };
  
  // Variable to track last operand for compound operations
  let newLastOperand: number | null = lastOperand;
  
  console.log('🧮 processCompoundCalculation - input lastOperand:', lastOperand, 'newLastOperand:', newLastOperand);

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
        
        // IMPORTANT: Don't overwrite newLastOperand for multiplication/division
        // The left operand was stored when the operator was pressed
        // PRESERVE the stored left operand - don't change newLastOperand!
        console.log('📊 Preserving lastOperand for compound operation:', { operator: newLastOperation, preservedOperand: newLastOperand, currentInput: input });
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
        console.log('📊 Updating last step:', { newValue, lastStep });
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
  } else if (input === '+' || input === '-' || input === '*' || input === '/' || input === '×' || input === '÷') {
    // Handle operators - properly handle order of operations with step creation
    console.log('🔧 Operator input:', input, 'Current steps:', newCalculationSteps.length);
    
    // Check if we're pressing the same operator repeatedly
    // If so, don't perform any calculation, just update the operator
    if (newLastOperation === input && newIsNewNumber) {
      // Repeated operator press - just update the operator
      newLastOperation = input;
      return {
        value: newValue,
        calculationSteps: newCalculationSteps,
        lastOperation: newLastOperation,
        isNewNumber: newIsNewNumber,
        articleCount: newArticleCount,
        grandTotal: newGrandTotal,
        transactionHistory: newTransactionHistory,
        lastOperand: newLastOperand,
        result
      };
    }
    
    // Check if we're switching between operators of the same precedence
    // If so, don't perform any calculation, just update the operator
    const isCurrentAddSub = (input === '+' || input === '-');
    const isLastAddSub = (newLastOperation === '+' || newLastOperation === '-');
    const isCurrentMultDiv = (input === '*' || input === '/' || input === '×' || input === '÷');
    const isLastMultDiv = (newLastOperation === '*' || newLastOperation === '/' || newLastOperation === '×' || newLastOperation === '÷');
    
    if (((isCurrentAddSub && isLastAddSub) || (isCurrentMultDiv && isLastMultDiv)) && newIsNewNumber) {
      // Switching between operators of the same precedence - just update the operator
      newLastOperation = input;
      return {
        value: newValue,
        calculationSteps: newCalculationSteps,
        lastOperation: newLastOperation,
        isNewNumber: newIsNewNumber,
        articleCount: newArticleCount,
        grandTotal: newGrandTotal,
        transactionHistory: newTransactionHistory,
        lastOperand: newLastOperand,
        result
      };
    }
    
    const currentNum = getCurrentNumber();
    
    // Create steps for compound operations following PEMDAS rules
    if (input === '*' || input === '/') {
      // For multiplication/division, store the operator and the LEFT operand
      // The LEFT operand is the current number being displayed
      console.log('🧮 Multiplication/Division operator. Current display value:', newValue);
      console.log('🧮 Current calculation steps:', newCalculationSteps.length);
      
      // The left operand for multiplication is the current number on display
      const leftOperand = getCurrentNumber();
      
      // Add current number as part of the operation if not already added
      if (newCalculationSteps.length === 0) {
        // First number
        newCalculationSteps.push({
          expression: leftOperand.toString(),
          result: leftOperand,
          timestamp: Date.now(),
          stepNumber: 1,
          operationType: 'number',
          displayValue: leftOperand.toString(),
          isComplete: false
        });
        newArticleCount = 1;
      }
      
      newLastOperation = input;
      newLastOperand = leftOperand; // Store the current display value as LEFT operand
      newIsNewNumber = true;
      
      console.log('🧮 Stored for compound operation:', { operator: newLastOperation, leftOperand: newLastOperand });
      
    } else if (input === '+' || input === '-') {
      // For addition/subtraction, check if we need to complete a compound operation first
      console.log('🧮 Addition/Subtraction operator after mult/div. Last operation:', newLastOperation);
      console.log('🧮 Current operand stack:', { newLastOperand, currentNum });
      
      if (newLastOperation === '*' || newLastOperation === '/') {
        // We have a pending multiplication/division - create compound step
        // newLastOperand contains the LEFT operand from when * was pressed
        // currentNum contains the RIGHT operand (the number just entered)
        const leftOperand = newLastOperand!;
        const rightOperand = currentNum;
        const operator = newLastOperation;
        
        console.log('🧮 Creating compound step:', { leftOperand, operator, rightOperand });
        
        let compoundResult;
        if (operator === '*') {
          compoundResult = leftOperand * rightOperand;
        } else {
          compoundResult = rightOperand !== 0 ? leftOperand / rightOperand : 0;
        }
        
        const operatorSymbol = operator === '*' ? '×' : '÷';
        
        // Create compound step like "+(5×3)=15"
        // For the first compound operation, don't add the + prefix
        const operatorSign = newCalculationSteps.length === 1 ? '' : '+';
        newCalculationSteps.push({
          expression: `${operatorSign}(${leftOperand}${operatorSymbol}${rightOperand})`,
          result: compoundResult,
          timestamp: Date.now(),
          stepNumber: newCalculationSteps.length + 1,
          operationType: 'operation',
          displayValue: `${operatorSign}(${leftOperand}${operatorSymbol}${rightOperand})=${compoundResult}`,
          isComplete: false,
          operator: operator === '*' ? '*' : '/'  // Use the actual operator
        });
        
        newValue = compoundResult.toString();
        newLastOperand = compoundResult; // The result becomes the new operand
        newLastOperation = input; // Store the new operator (+/-)
      } else {
        // Simple addition/subtraction or no pending operation
        if (newCalculationSteps.length === 0) {
          // First number
          newCalculationSteps.push({
            expression: currentNum.toString(),
            result: currentNum,
            timestamp: Date.now(),
            stepNumber: 1,
            operationType: 'number',
            displayValue: currentNum.toString(),
            isComplete: false
          });
          newArticleCount = 1;
        }
        
        newLastOperand = currentNum;
      }
      
      newLastOperation = input;
      newIsNewNumber = true;
    }
  } else if (input === '=' || input === 'ENTER') {
    // Handle equals for compound operations
    if (newCalculationSteps.length > 0 && newCalculationSteps.some(step => step.isComplete)) {
      // Already have a completed calculation (like percentage), just keep the current value
      newValue = currentValue;
      newIsNewNumber = true;
    } else if (newCalculationSteps.length > 0) {
      const currentNum = getCurrentNumber();
      
      // Handle final compound operation if there's a pending multiplication/division
      if (newLastOperation === '*' || newLastOperation === '/') {
        const leftOperand = newLastOperand!;
        const rightOperand = currentNum;
        const operator = newLastOperation;
        
        let compoundResult;
        if (operator === '*') {
          compoundResult = leftOperand * rightOperand;
        } else {
          compoundResult = rightOperand !== 0 ? leftOperand / rightOperand : 0;
        }
        
        const operatorSymbol = operator === '*' ? '×' : '÷';
        
        // Create final compound step like "+(2×6)=12"
        const operatorSign = newCalculationSteps.length === 1 ? '' : '+';
        newCalculationSteps.push({
          expression: `${operatorSign}(${leftOperand}${operatorSymbol}${rightOperand})`,
          result: compoundResult,
          timestamp: Date.now(),
          stepNumber: newCalculationSteps.length + 1,
          operationType: 'operation',
          displayValue: `${operatorSign}(${leftOperand}${operatorSymbol}${rightOperand})=${compoundResult}`,
          isComplete: false,
          operator: operator === '*' ? '*' : '/'  // Use the actual operator
        });
      }
      
      // Mark all steps as complete
      newCalculationSteps.forEach(step => {
        step.isComplete = true;
      });
      
      // Calculate final result by summing all step results
      result = 0;
      newCalculationSteps.forEach(step => {
        if (step.operationType === 'number' || step.operationType === 'operation') {
          result! += step.result;
        }
      });
      
      // Format the result properly for display
      if (result % 1 === 0) {
        // Whole number - display without decimals
        newValue = result.toString();
      } else {
        // Decimal number - round to reasonable precision and remove trailing zeros
        newValue = parseFloat(result.toFixed(10)).toString();
      }
      
      // For continuous equals operations, update lastOperand to the result
      // This allows 2+==== to keep adding 2
      newLastOperand = result;
      newLastOperation = newLastOperation; // Keep the last operation for continuous equals
      newIsNewNumber = true;
      
      // Add to grand total and transaction history
      newGrandTotal += result;
      newTransactionHistory.push(result);
    }
  }

  console.log('🔧 Compound function returning:', {
    input,
    value: newValue,
    lastOperand: newLastOperand,
    lastOperation: newLastOperation
  });

  return {
    value: newValue,
    calculationSteps: newCalculationSteps,
    lastOperation: newLastOperation,
    isNewNumber: newIsNewNumber,
    articleCount: newArticleCount,
    grandTotal: newGrandTotal,
    transactionHistory: newTransactionHistory,
    lastOperand: newLastOperand,
    result
  };
};

/**
 * Consolidate calculation steps to show only essential steps for replay
 * For compound calculations like 10+5×3+2×3, show:
 * - Step 1: "10"
 * - Step 2: "+(5×3)=15"
 * - Step 3: "+(2×3)=6"
 * Remove intermediate steps like "+5", "+2", "×3"
 */
const consolidateCalculationSteps = (steps: CalculationStep[]): CalculationStep[] => {
  console.log('🔄 consolidateCalculationSteps input:', steps.map(s => s.displayValue));
  
  const consolidated: CalculationStep[] = [];
  
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    
    // Always keep the first number step
    if (step.operationType === 'number') {
      consolidated.push({ ...step, stepNumber: consolidated.length + 1 });
    }
    // Keep compound steps (those with parentheses and equals)
    else if (step.operationType === 'operation' && step.displayValue.includes('(') && step.displayValue.includes('=')) {
      consolidated.push({ ...step, stepNumber: consolidated.length + 1 });
    }
    // Skip intermediate steps: simple operations like "+5", "+2", "×3" without parentheses
    // These are just building blocks for the compound steps
  }
  
  console.log('🔄 consolidateCalculationSteps output:', consolidated.map(s => s.displayValue));
  console.log('🔄 consolidateCalculationSteps result count:', consolidated.length);
  return consolidated;
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
 * Build expression from compound calculation steps
 */
const buildCompoundExpression = (steps: CalculationStep[]): string => {
  let expression = '';
  console.log('🔧 buildCompoundExpression input steps:', steps.map(s => ({ displayValue: s.displayValue, result: s.result, expression: s.expression, operator: s.operator })));
  
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    
    if (step.operationType === 'number') {
      expression += step.result;
      console.log('🔧 Added number to expression:', step.result, 'expression now:', expression);
    } else if (step.operationType === 'operation') {
      // Use the stored operator for building expression
      expression += (step.operator || '') + step.result;
      console.log('🔧 Added operation to expression:', step.operator, step.result, 'expression now:', expression);
    }
  }
  
  console.log('🔧 Final compound expression:', expression);
  return expression;
};
/**
 * Determine if calculation is compound
 * Simple: Only + and - operators
 * Compound: Any × or ÷ operators OR no + or - operators
 */
const isCompoundCalculation = (calculationSteps: CalculationStep[], lastOperation: string | null): boolean => {
  // Check if any step contains addition or subtraction
  const hasAddSubtract = calculationSteps.some(step => 
    step.expression.includes('+') || 
    step.expression.includes('-') ||
    step.operator === '+' ||
    step.operator === '-'
  );
  
  // Check if any step contains multiplication or division
  const hasMultiplyDivide = calculationSteps.some(step => 
    step.expression.includes('*') || 
    step.expression.includes('/') || 
    step.expression.includes('×') || 
    step.expression.includes('÷') ||
    step.operator === '*' ||
    step.operator === '/' ||
    step.operator === '×' ||
    step.operator === '÷'
  );
  
  // Compound if:
  // 1. Current operation is × or ÷ OR if any previous step had × or ÷
  // 2. No + or - operators exist in the calculation
  const isCurrentOperationMultDiv = (lastOperation === '*' || lastOperation === '/' || lastOperation === '×' || lastOperation === '÷');
  const hasNoAddSubtract = !hasAddSubtract;
  
  return hasMultiplyDivide || isCurrentOperationMultDiv || hasNoAddSubtract;
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
                     (input === '*' || input === '/' || input === '×' || input === '÷') ||
                     // If there are no + or - operators, consider it compound
                     (!newCalculationSteps.some(step => 
                       step.expression.includes('+') || 
                       step.expression.includes('-') ||
                       step.operator === '+' ||
                       step.operator === '-'
                     ) && (input !== '+' && input !== '-'));
  
  console.log('🔍 Flow determination:', {
    input,
    isCompound,
    calculationStepsLength: newCalculationSteps.length,
    lastOperation: newLastOperation,
    currentValue
  });
  
  // Log initial steps
  logCalculationSteps(newCalculationSteps, `before processing ${input}`);
  
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
    // Mark Up - Business calculator markup functionality
    const currentNum = getCurrentNumber();
    
    if (memory !== 0) {
      // Calculate markup: cost + (cost * markup% / 100) = selling price
      const cost = memory;
      const markupPercent = currentNum;
      const markupAmount = (cost * markupPercent) / 100;
      const sellingPrice = cost + markupAmount;
      
      // Display the selling price
      newValue = sellingPrice.toString();
      newIsNewNumber = true;
      
      // Store the markup amount in memory for reference
      newMemory = markupAmount;
    } else {
      // Store current number as cost price in memory
      newMemory = currentNum;
      newIsNewNumber = true;
    }
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
    console.log('🎬 AUTO pressed - calculationSteps:', newCalculationSteps.length, newCalculationSteps);
    console.log('🎬 AUTO pressed - Step details:');
    newCalculationSteps.forEach((step, index) => {
      console.log(`🎬   Step ${index + 1}: "${step.displayValue}" (${step.operationType}, complete: ${step.isComplete})`);
    });
    if (newCalculationSteps.length > 0) {
      // Consolidate steps for cleaner replay
      const consolidatedSteps = consolidateCalculationSteps(newCalculationSteps);
      console.log('🎬 Using consolidated steps for replay:', consolidatedSteps.map(s => s.displayValue));
      console.log('🎬 CODE VERSION: Consolidation v2.0 - Should show 3 steps for 10+5×3+2×3');
      console.log('🎬 Original steps count:', newCalculationSteps.length, 'Consolidated count:', consolidatedSteps.length);
      
      autoReplayActive = true;
      localStorage.setItem('currentCheckIndex', '0');
      newValue = consolidatedSteps[0].displayValue;
      newIsNewNumber = true;
      
      setTimeout(() => {
        console.log('🎬 Starting auto replay sequence...');
        startAutoReplaySequence(consolidatedSteps, newLastOperation);
      }, 500);
    } else {
      console.log('🎬 No calculation steps to replay');
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
    // Percentage calculation - show result immediately, store context for + operation
    const currentNum = getCurrentNumber();
    
    if (newLastOperation && newLastOperand !== null) {
      // Store the original base number and operation for potential + operation
      const originalBase = newLastOperand;
      
      // Calculate percentage result based on last operation
      let percentResult: number;
      
      if (newLastOperation === '*' || newLastOperation === '×') {
        // For multiplication: 100 × 10% = 10
        percentResult = originalBase * (currentNum / 100);
        
        // Store context for potential addition/subtraction: base +/- percentage result
        // Don't store in memory to avoid showing M indicator
        // Use a special lastOperand to store the base for +/- operations
        newLastOperand = originalBase; // Store original base for +/- operations
        
        console.log('🔍 Percentage calculation:', {
          originalBase,
          currentNum,
          percentResult,
          storedAsLastOperand: newLastOperand
        });
        
        // Show the percentage result immediately
        newValue = percentResult.toString();
        newLastOperation = '%'; // Special marker for percentage context
        newIsNewNumber = true;
        
        // Update calculation steps to show percentage calculation
        if (newCalculationSteps.length >= 2) {
          newCalculationSteps[1] = {
            expression: `×${currentNum}%`,
            result: percentResult,
            timestamp: Date.now(),
            stepNumber: 2,
            operationType: 'operation',
            displayValue: `×${currentNum}%=${percentResult}`,
            isComplete: true
          };
          
          // Replace with percentage result
          newCalculationSteps = [{
            expression: percentResult.toString(),
            result: percentResult,
            timestamp: Date.now(),
            stepNumber: 1,
            operationType: 'number',
            displayValue: percentResult.toString(),
            isComplete: false
          }];
        }
      } else if (newLastOperation === '+' || newLastOperation === '-') {
        // For addition/subtraction: 100 + 15% = 115, 100 - 15% = 85
        if (newLastOperation === '+') {
          percentResult = originalBase + (originalBase * currentNum / 100);
        } else {
          percentResult = originalBase - (originalBase * currentNum / 100);
        }
        
        newValue = percentResult.toString();
        newLastOperation = null;
        newLastOperand = null;
        newIsNewNumber = true;
      } else if (newLastOperation === '/' || newLastOperation === '÷') {
        // For division: 100 ÷ 25% = 400
        percentResult = currentNum !== 0 ? originalBase / (currentNum / 100) : 0;
        newValue = percentResult.toString();
        newLastOperation = null;
        newLastOperand = null;
        newIsNewNumber = true;
      } else {
        // Fallback: just convert to percentage
        percentResult = currentNum / 100;
        newValue = percentResult.toString();
        newIsNewNumber = true;
      }
      
      newArticleCount = 1;
    } else {
      // Simple percentage: convert number to percentage (divide by 100)
      const percentResult = currentNum / 100;
      newValue = percentResult.toString();
      newIsNewNumber = true;
      
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
    // Special case: If we just calculated a percentage with × (like 700×10%=70)
    // and now any operator (+, -, ×, ÷) is pressed, calculate base operator percentage result
    if ((input === '+' || input === '-' || input === '*' || input === '/' || input === '×' || input === '÷') && newLastOperation === '%' && newLastOperand !== null) {
      console.log('🔍 Percentage operation detected:', { lastOperand: newLastOperand, currentValue, newLastOperation, operation: input });
      const baseValue = newLastOperand; // Original base (700)
      const percentageResult = parseFloat(currentValue); // Current percentage result (70)
      let finalResult: number;
      
      if (input === '+') {
        finalResult = baseValue + percentageResult; // 700 + 70 = 770
      } else if (input === '-') {
        finalResult = baseValue - percentageResult; // 700 - 70 = 630
      } else if (input === '*' || input === '×') {
        finalResult = baseValue * percentageResult; // 700 × 70 = 49000
      } else if (input === '/' || input === '÷') {
        finalResult = percentageResult !== 0 ? baseValue / percentageResult : 0; // 700 ÷ 70 = 10
      } else {
        finalResult = percentageResult; // fallback
      }
      
      console.log('🔍 Calculating:', `${baseValue} ${input} ${percentageResult} = ${finalResult}`);
      
      newValue = finalResult.toString();
      newLastOperation = input; // Store the current operation for continuation
      newLastOperand = finalResult; // Store the result as the operand for next calculation
      newIsNewNumber = true;
      
      // Update calculation steps to start a new calculation with the result
      newCalculationSteps = [{
        expression: finalResult.toString(),
        result: finalResult,
        timestamp: Date.now(),
        stepNumber: 1,
        operationType: 'number',
        displayValue: finalResult.toString(),
        isComplete: false // Keep as incomplete to allow continuation
      }];
      
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
    }
    
    // Check if we're pressing the same operator repeatedly
    // If so, don't perform any calculation, just update the operator
    if ((input === '+' || input === '-' || input === '*' || input === '/' || input === '×' || input === '÷') && 
        newLastOperation === input && newIsNewNumber) {
      // Repeated operator press - just update the operator
      newLastOperation = input;
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
    }
    
    // Check if we're switching between operators of the same precedence
    // If so, don't perform any calculation, just update the operator
    const isCurrentAddSub = (input === '+' || input === '-');
    const isLastAddSub = (newLastOperation === '+' || newLastOperation === '-');
    const isCurrentMultDiv = (input === '*' || input === '/' || input === '×' || input === '÷');
    const isLastMultDiv = (newLastOperation === '*' || newLastOperation === '/' || newLastOperation === '×' || newLastOperation === '÷');
    
    if ((isCurrentAddSub && isLastAddSub || isCurrentMultDiv && isLastMultDiv) && newIsNewNumber) {
      // Switching between operators of the same precedence - just update the operator
      newLastOperation = input;
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
    }
    
    // Route to appropriate calculation flow
    const willBeCompound = input === '*' || input === '/' || input === '×' || input === '÷' || 
                          isCompoundCalculation(newCalculationSteps, newLastOperation) ||
                          // If there are no + or - operators, consider it compound
                          (!newCalculationSteps.some(step => 
                            step.expression.includes('+') || 
                            step.expression.includes('-') ||
                            step.operator === '+' ||
                            step.operator === '-'
                          ) && (input !== '+' && input !== '-'));
    
    console.log('🔧 willBeCompound calculation:', {
      input,
      isMultDiv: input === '*' || input === '/' || input === '×' || input === '÷',
      isCompoundCalc: isCompoundCalculation(newCalculationSteps, newLastOperation),
      willBeCompound,
      lastOperation: newLastOperation,
      calculationStepsLength: newCalculationSteps.length
    });
    
    // Store the current operand when an operation is entered
    // For compound calculations, let the compound function manage lastOperand
    if (input === '+' || input === '-' || input === '*' || input === '/' || input === '×' || input === '÷') {
      const currentNum = getCurrentNumber();
      if (!isNaN(currentNum)) {
        // Only update lastOperand for simple calculations or when starting a new calculation
        // For compound calculations, preserve the existing lastOperand
        const isMultiplyDivide = (input === '*' || input === '/' || input === '×' || input === '÷');
        const isPlusMinusOperator = (input === '+' || input === '-');
        const isStartingCompound = !willBeCompound && isMultiplyDivide;
        const isSimpleOperation = !willBeCompound && isPlusMinusOperator;
        
        if (isStartingCompound || isSimpleOperation) {
          newLastOperand = currentNum;
          console.log('🔧 Main function updating lastOperand:', { input, currentNum, willBeCompound, reason: isStartingCompound ? 'starting compound' : 'simple operation' });
        } else {
          console.log('🔧 Main function preserving lastOperand for compound operation:', { input, currentNum, preservedOperand: newLastOperand, willBeCompound });
        }
        
        // If we have completed calculation steps (after =), start new calculation with current result as base
        if (newCalculationSteps.length > 0 && newCalculationSteps.some(step => step.isComplete)) {
          console.log('🔄 Starting new calculation with previous result as base:', currentNum);
          
          // Create new calculation steps starting with the current result
          newCalculationSteps = [{
            expression: currentNum.toString(),
            result: currentNum,
            timestamp: Date.now(),
            stepNumber: 1,
            operationType: 'number',
            displayValue: currentNum.toString(),
            isComplete: false
          }];
          
          // Reset article count for new calculation
          newArticleCount = 1;
        }
      }
    }
    
    if (willBeCompound) {
      const compoundResult = processCompoundCalculation(
        currentValue, input, newCalculationSteps, newLastOperation,
        newIsNewNumber, newArticleCount, newGrandTotal, newTransactionHistory, newLastOperand
      );
      
      newValue = compoundResult.value;
      newCalculationSteps = compoundResult.calculationSteps;
      newLastOperation = compoundResult.lastOperation;
      newIsNewNumber = compoundResult.isNewNumber;
      newArticleCount = compoundResult.articleCount;
      newLastOperand = compoundResult.lastOperand;
      
      console.log('🔧 Main function received from compound:', {
        input,
        returnedLastOperand: compoundResult.lastOperand,
        newLastOperand: newLastOperand
      });
      
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
  
  // Log final steps before return
  logCalculationSteps(newCalculationSteps, `after processing ${input}`);
  
  console.log('🏁 Final state:', {
    input,
    value: newValue,
    calculationStepsCount: newCalculationSteps.length,
    autoReplayActive,
    articleCount: newArticleCount,
    lastOperation: newLastOperation
  });

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

// DEBUG: Log calculation steps whenever they change
const logCalculationSteps = (steps: CalculationStep[], context: string) => {
  console.log(`📋 Calculation Steps (${context}):`, {
    count: steps.length,
    steps: steps.map(s => ({
      stepNumber: s.stepNumber,
      displayValue: s.displayValue,
      operationType: s.operationType,
      isComplete: s.isComplete,
      result: s.result
    }))
  });
  // Also log individual steps for debugging
  steps.forEach((step, index) => {
    console.log(`🔢 Step ${index + 1}:`, step.displayValue, `(${step.operationType}, result: ${step.result})`);
  });
};

// Force refresh for compilation

/**
 * Auto-replay sequence function
 */
const startAutoReplaySequence = (steps: CalculationStep[], lastOperation: string | null) => {
  console.log('🎬 startAutoReplaySequence called with steps:', steps.length, steps);
  let currentStepIndex = 0;
  let isInterrupted = false;
  
  // Check if we have a completed calculation or need to calculate result
  const hasCompletedCalculation = steps.some(step => step.isComplete);
  let calculationResult: number | null = null;
  
  console.log('🎬 hasCompletedCalculation:', hasCompletedCalculation);
  
  // If calculation is not complete, calculate the result
  if (!hasCompletedCalculation && steps.length > 0) {
    // Determine if it's compound or simple calculation
    const isCompound = isCompoundCalculation(steps, lastOperation);
    
    console.log('🎬 isCompound:', isCompound);
    
    if (isCompound) {
      // For consolidated compound steps, just sum all the results
      // since they're already properly calculated compound operations
      const isConsolidated = steps.some(step => 
        step.displayValue.includes('(') && step.displayValue.includes('=')
      );
      
      if (isConsolidated) {
        console.log('🎬 Using simple sum for consolidated steps');
        calculationResult = steps.reduce((sum, step) => sum + step.result, 0);
        console.log('🎬 Consolidated sum:', calculationResult);
      } else {
        const expression = buildCompoundExpression(steps);
        console.log('🎬 compound expression:', expression);
        calculationResult = evaluateExpression(expression);
      }
    } else {
      const expression = buildSimpleExpression(steps);
      console.log('🎬 simple expression:', expression);
      calculationResult = evaluateExpression(expression);
    }
    
    console.log('🎬 calculationResult:', calculationResult);
  }
  
  // Function to handle interruption
  const handleInterrupt = () => {
    isInterrupted = true;
    console.log('🎬 Auto replay interrupted');
    window.dispatchEvent(new CustomEvent('autoReplayComplete'));
  };
  
  // Add event listener for AC button press during replay
  const acInterruptHandler = () => {
    handleInterrupt();
  };
  
  window.addEventListener('interruptAutoReplay', acInterruptHandler);
  
  const showNextStep = () => {
    // Check if replay has been interrupted
    if (isInterrupted) {
      window.removeEventListener('interruptAutoReplay', acInterruptHandler);
      return;
    }
    
    console.log('🎬 showNextStep called - currentStepIndex:', currentStepIndex, 'steps.length:', steps.length);
    if (currentStepIndex < steps.length) {
      const step = steps[currentStepIndex];
      console.log('🎬 Showing step:', currentStepIndex, step);
      
      window.dispatchEvent(new CustomEvent('autoReplayStep', {
        detail: {
          displayValue: step.displayValue,
          stepIndex: currentStepIndex,
          totalSteps: steps.length, // Keep the actual step count for display
          currentStep: currentStepIndex + 1,
          articleCount: step.operationType === 'result' ? currentStepIndex : currentStepIndex + 1
        }
      }));
      
      console.log('🎬 Step counter debug:', {
        currentStep: currentStepIndex + 1,
        totalSteps: steps.length,
        stepDisplay: `${currentStepIndex + 1}/${steps.length}`
      });
      
      localStorage.setItem('currentCheckIndex', currentStepIndex.toString());
      currentStepIndex++;
      
      // Continue to next step or show result
      if (currentStepIndex < steps.length) {
        console.log('🎬 Scheduling next step in 1000ms');
        setTimeout(showNextStep, 1000);
      } else if (calculationResult !== null) {
        console.log('🎬 Showing calculated result:', calculationResult);
        // Show calculated result
        setTimeout(() => {
          // Check if replay has been interrupted before showing result
          if (isInterrupted) {
            window.removeEventListener('interruptAutoReplay', acInterruptHandler);
            return;
          }
          
          window.dispatchEvent(new CustomEvent('autoReplayStep', {
            detail: {
              displayValue: `=${calculationResult}`,
              stepIndex: currentStepIndex,
              totalSteps: steps.length, // Keep the same step count for result
              currentStep: steps.length, // Keep current step as the last step
              articleCount: steps.length
            }
          }));
          
          console.log('🎬 Final result step counter debug:', {
            currentStep: steps.length,
            totalSteps: steps.length,
            stepDisplay: `${steps.length}/${steps.length}`
          });
          
          localStorage.setItem('currentCheckIndex', currentStepIndex.toString());
          
          // Complete the auto replay
          setTimeout(() => {
            // Check if replay has been interrupted before completing
            if (isInterrupted) {
              window.removeEventListener('interruptAutoReplay', acInterruptHandler);
              return;
            }
            
            console.log('🎬 Auto replay complete');
            window.dispatchEvent(new CustomEvent('autoReplayComplete'));
            window.removeEventListener('interruptAutoReplay', acInterruptHandler);
          }, 1000);
        }, 1000);
      } else if (hasCompletedCalculation) {
        console.log('🎬 Showing final result for completed calculation');
        // For completed calculations, show the final result from the last step
        setTimeout(() => {
          // Check if replay has been interrupted before showing result
          if (isInterrupted) {
            window.removeEventListener('interruptAutoReplay', acInterruptHandler);
            return;
          }
          
          const lastStep = steps[steps.length - 1];
          let finalResult;
          
          if (lastStep.displayValue.includes('%')) {
            // For percentage calculations, use the percentage result
            finalResult = lastStep.result;
          } else {
            // For other completed calculations, evaluate the full expression
            const isCompound = isCompoundCalculation(steps, null);
            
            // Check if these are consolidated compound steps
            const isConsolidated = steps.some(step => 
              step.displayValue.includes('(') && step.displayValue.includes('=')
            );
            
            if (isCompound && isConsolidated) {
              console.log('🎬 Using simple sum for consolidated completed calculation');
              finalResult = steps.reduce((sum, step) => sum + step.result, 0);
            } else {
              const expression = isCompound ? buildCompoundExpression(steps) : buildSimpleExpression(steps);
              finalResult = evaluateExpression(expression);
            }
          }
          
          window.dispatchEvent(new CustomEvent('autoReplayStep', {
            detail: {
              displayValue: `=${finalResult}`,
              stepIndex: currentStepIndex,
              totalSteps: steps.length, // Keep the same step count, don't increment for result
              currentStep: steps.length, // Keep current step as the last step
              articleCount: steps.length
            }
          }));
          
          localStorage.setItem('currentCheckIndex', currentStepIndex.toString());
          
          // Complete the auto replay
          setTimeout(() => {
            // Check if replay has been interrupted before completing
            if (isInterrupted) {
              window.removeEventListener('interruptAutoReplay', acInterruptHandler);
              return;
            }
            
            console.log('🎬 Auto replay complete - completed calculation');
            window.dispatchEvent(new CustomEvent('autoReplayComplete'));
            window.removeEventListener('interruptAutoReplay', acInterruptHandler);
          }, 1000);
        }, 1000);
      } else {
        console.log('🎬 No result to show, completing immediately');
        // No result to show, complete immediately
        window.dispatchEvent(new CustomEvent('autoReplayComplete'));
        window.removeEventListener('interruptAutoReplay', acInterruptHandler);
      }
    } else {
      console.log('🎬 currentStepIndex >= steps.length, completing immediately');
      window.dispatchEvent(new CustomEvent('autoReplayComplete'));
      window.removeEventListener('interruptAutoReplay', acInterruptHandler);
    }
  };
  
  showNextStep();
};
