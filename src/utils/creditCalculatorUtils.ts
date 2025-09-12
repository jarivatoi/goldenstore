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
  } else if (input === '*' || input === '/' || input === '+' || input === '-') {
    // Handle operators - properly handle order of operations
    console.log('🔧 Operator input:', input, 'Current steps:', newCalculationSteps.length);
    
    // For compound calculations with mixed operators (e.g., 20+5×3+10)
    if (newCalculationSteps.length > 0 && (input === '+' || input === '-')) {
      // Check if we have a multiplication/division sub-expression to evaluate
      const hasMultiplyDivide = newCalculationSteps.some(step => 
        step.operator === '*' || step.operator === '/'
      );
      
      if (hasMultiplyDivide) {
        console.log('🔧 Found multiply/divide, evaluating intermediate result');
        // Evaluate the entire expression with proper order of operations
        const expression = buildCompoundExpression(newCalculationSteps);
        console.log('🔧 Full expression before adding operator:', expression);
        const intermediateResult = evaluateExpression(expression);
        console.log('🔧 Intermediate result:', intermediateResult);
        
        // Replace all steps with a single result step
        newCalculationSteps = [{
          expression: intermediateResult.toString(),
          result: intermediateResult,
          timestamp: Date.now(),
          stepNumber: 1,
          operationType: 'number',
          displayValue: intermediateResult.toString(),
          isComplete: false
        }];
        
        newValue = intermediateResult.toString();
      }
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
      // For compound calculations with multiplication/division, consolidate steps
      const hasMultiplyDivide = newCalculationSteps.some(step => 
        step.operator === '*' || step.operator === '/'
      );
      
      if (hasMultiplyDivide) {
        console.log('🔧 Consolidating compound calculation steps for replay');
        // Rebuild steps with proper grouping for compound calculations
        const consolidatedSteps = consolidateCompoundSteps(newCalculationSteps);
        newCalculationSteps = consolidatedSteps;
      }
      
      // Mark all steps as complete
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
 * Consolidate compound calculation steps for proper replay
 * For example: 20+5×3 should show as:
 * Step 1: "20"
 * Step 2: "+(5×3)=15" 
 * Final: "=35"
 */
const consolidateCompoundSteps = (steps: CalculationStep[]): CalculationStep[] => {
  console.log('🔧 consolidateCompoundSteps input:', steps.map(s => ({ displayValue: s.displayValue, operator: s.operator, result: s.result })));
  
  const consolidatedSteps: CalculationStep[] = [];
  let i = 0;
  
  while (i < steps.length) {
    const currentStep = steps[i];
    
    // If this is a number step (first step or after +/-)
    if (currentStep.operationType === 'number') {
      consolidatedSteps.push({
        ...currentStep,
        stepNumber: consolidatedSteps.length + 1
      });
      i++;
    }
    // If this is an operation step
    else if (currentStep.operationType === 'operation') {
      // Check if this is a multiplication or division operation
      if (currentStep.operator === '*' || currentStep.operator === '/') {
        // Find the previous number step (left operand)
        let leftOperand = 0;
        let prevStepIndex = -1;
        
        // Look backwards for the number this multiplication operates on
        // For multiplication, the left operand is the operand of the immediately preceding operation
        if (i >= 1) {
          const prevStep = steps[i - 1];
          if (prevStep.operationType === 'operation') {
            // The left operand is the result stored in the previous operation step
            leftOperand = prevStep.result;
            // Find the step index to replace - should be the previous operation step
            prevStepIndex = i - 1;
            // Need to adjust based on consolidatedSteps length
            for (let k = consolidatedSteps.length - 1; k >= 0; k--) {
              if (consolidatedSteps[k].operationType === 'operation') {
                prevStepIndex = k;
                break;
              }
            }
          } else if (prevStep.operationType === 'number') {
            leftOperand = prevStep.result;
            prevStepIndex = consolidatedSteps.length - 1; // Replace the last added step
          }
        }
        
        if (prevStepIndex >= 0) {
          const rightOperand = currentStep.result;
          const operator = currentStep.operator;
          
          let subResult: number;
          if (operator === '*') {
            subResult = leftOperand * rightOperand;
          } else if (operator === '/') {
            subResult = rightOperand !== 0 ? leftOperand / rightOperand : 0;
          } else {
            subResult = rightOperand;
          }
          
          const operatorSymbol = operator === '*' ? '×' : '÷';
          
          // Replace the multiplication sequence with a consolidated step
          // Remove steps from prevStepIndex onwards that are part of this multiplication
          while (consolidatedSteps.length > prevStepIndex) {
            consolidatedSteps.pop();
          }
          
          // Add the consolidated multiplication step
          consolidatedSteps.push({
            expression: `+(${leftOperand}${operatorSymbol}${rightOperand})`,
            result: subResult,
            timestamp: Date.now(),
            stepNumber: consolidatedSteps.length + 1,
            operationType: 'operation',
            displayValue: `+(${leftOperand}${operatorSymbol}${rightOperand})=${subResult}`,
            isComplete: false,
            operator: '+'
          });
        }
      } else {
        // Regular addition/subtraction operation
        consolidatedSteps.push({
          ...currentStep,
          stepNumber: consolidatedSteps.length + 1
        });
      }
      i++;
    } else {
      consolidatedSteps.push({
        ...currentStep,
        stepNumber: consolidatedSteps.length + 1
      });
      i++;
    }
  }
  
  console.log('🔧 consolidateCompoundSteps output:', consolidatedSteps.map(s => ({ displayValue: s.displayValue, operator: s.operator, result: s.result })));
  return consolidatedSteps;
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
 * Compound: Any × or ÷ operators
 */
const isCompoundCalculation = (calculationSteps: CalculationStep[], lastOperation: string | null): boolean => {
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
  
  // Compound if current operation is × or ÷ OR if any previous step had × or ÷
  return hasMultiplyDivide || (lastOperation === '*' || lastOperation === '/' || lastOperation === '×' || lastOperation === '÷');
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
    // Percentage calculation - show result immediately, store context for + operation
    const currentNum = getCurrentNumber();
    
    if (newLastOperation && newLastOperand !== null) {
      // Store the original base number and operation for potential + operation
      const originalBase = newLastOperand;
      const originalOperation = newLastOperation;
      
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
      const operatorSymbol = input === '*' ? '×' : input === '/' ? '÷' : input;
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
    
    // Route to appropriate calculation flow
    const willBeCompound = input === '*' || input === '/' || input === '×' || input === '÷' || 
                          isCompoundCalculation(newCalculationSteps, newLastOperation);
    
    // Store the current operand when an operation is entered
    if (input === '+' || input === '-' || input === '*' || input === '/' || input === '×' || input === '÷') {
      const currentNum = getCurrentNumber();
      if (!isNaN(currentNum)) {
        newLastOperand = currentNum;
        
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