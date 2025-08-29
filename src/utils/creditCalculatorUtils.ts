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
    if (input === '*' || input === '/') {
      // For multiplication/division, create an incomplete step with just the first number
      if (newCalculationSteps.length === 0) {
        // First create a step for the current number
        newCalculationSteps.push({
          expression: currentValue,
          result: parseFloat(currentValue),
          timestamp: Date.now(),
          stepNumber: 1,
          operationType: 'number',
          displayValue: currentValue,
          isComplete: true // Mark as complete since it's just a number
        });
        newArticleCount = 1;
      }
      
      // Create incomplete multiplication/division step
      newCalculationSteps.push({
        expression: `${currentValue}${input}`,
        result: parseFloat(currentValue), // Store first operand
        timestamp: Date.now(),
        stepNumber: newCalculationSteps.length + 1,
        operationType: 'operation',
        displayValue: `${currentValue}${input === '*' ? '×' : '÷'}`,
        isComplete: false,
        operator: input
      });
      newArticleCount = newCalculationSteps.length;
    }
    
    newLastOperation = input;
    newIsNewNumber = true;
    // Keep current value displayed until next number is entered
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
        // First number
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
        // Check if this is part of a multiplication/division group
        if ((newLastOperation === '*' || newLastOperation === '/') && newCalculationSteps.length > 0) {
          // This is the second part of a multiplication/division (e.g., the "3" in "5*3")
          // Update the previous step to include this number
          const lastStep = newCalculationSteps[newCalculationSteps.length - 1];
          if (lastStep && lastStep.operator === newLastOperation) {
            // Complete the multiplication/division step
            const firstNum = lastStep.result;
            const secondNum = parseFloat(input);
            const stepResult = newLastOperation === '*' ? firstNum * secondNum : firstNum / secondNum;
            
            const displayOperator = newLastOperation === '*' ? '×' : '÷';
            lastStep.expression = `${firstNum}${newLastOperation}${secondNum}`;
            lastStep.result = stepResult;
            lastStep.displayValue = `${firstNum}${displayOperator}${secondNum}=${stepResult}`;
            lastStep.isComplete = true; // Mark as complete since we have both operands
            
            newValue = stepResult.toString();
            newLastOperation = null; // Clear operation since this step is complete
            newIsNewNumber = true;
            // Don't increment article count - this completes the existing step
          }
        } else {
          // Regular addition/subtraction - create new step
          const displayOperator = newLastOperation === '*' ? '×' : 
                                 newLastOperation === '/' ? '÷' : 
                                 newLastOperation;
          newCalculationSteps.push({
            expression: `${newLastOperation}${input}`,
            result: parseFloat(input),
            timestamp: Date.now(),
            stepNumber: newCalculationSteps.length + 1,
            operationType: 'operation',
            displayValue: `${displayOperator}${input}`,
            isComplete: false,
            operator: newLastOperation
          });
          newArticleCount = newCalculationSteps.length;
        }
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
          const operator = lastStep.operator === '*' ? '×' : 
                          lastStep.operator === '/' ? '÷' : 
                          lastStep.operator || lastStep.expression.charAt(0);
          lastStep.displayValue = `${operator}${newValue}`;
          lastStep.expression = `${lastStep.operator}${newValue}`;
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
  } else if (input === '*' || input === '/' || input === '+' || input === '-') {
    // Handle operators - create new step for multiplication/division
    // Don't create steps immediately for operators
  }
 */
}
const buildSimpleExpression = (calculationSteps: CalculationStep[]): string => {
  let expression = '';
  
  for (let i = 0; i < calculationSteps.length; i++) {
    const step = calculationSteps[i];
    
    if (i === 0) {
      // First step is always just the number
      expression = step.result.toString();
    } else {
      // Subsequent steps include the operator
      if (step.operator) {
        expression += step.operator + step.result;
      } else {
        expression += '+' + step.result; // Add the multiplication result
      }
    }
  }
  
  return expression;
};

/**
 * Build compound expression from calculation steps
 */
const buildCompoundExpression = (calculationSteps: CalculationStep[]): string => {
  let expression = '';
  
  for (let i = 0; i < calculationSteps.length; i++) {
    const step = calculationSteps[i];
    
    if (i === 0) {
      // First step is always just the number
      expression = step.result.toString();
    } else {
      // Subsequent steps include the operator
      if (step.operator) {
        expression += step.operator + step.result;
      } else {
        expression += '+' + step.result; // Add the multiplication result
      }
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
 * Get current number from display
 */
const getCurrentNumber = (): number => {
  const currentValue = document.querySelector('.display')?.textContent || '0';
  return parseFloat(currentValue) || 0;
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

  if (/^\d+$/.test(input) || input === '00' || input === '000') {
    // Handle numeric input
    if (newIsNewNumber || currentValue === '0') {
      if (newLastOperation === '*' || newLastOperation === '/') {
        // This is the second number in a multiplication/division
        // Find the incomplete multiplication/division step and complete it
        const incompleteStep = newCalculationSteps.find(step => 
          !step.isComplete && (step.operator === '*' || step.operator === '/')
        );
        
        if (incompleteStep) {
          // Complete the multiplication/division step
          const firstNum = incompleteStep.result;
          const secondNum = parseFloat(input);
          const stepResult = newLastOperation === '*' ? firstNum * secondNum : firstNum / secondNum;
          
          const displayOperator = newLastOperation === '*' ? '×' : '÷';
          incompleteStep.expression = `${firstNum}${newLastOperation}${secondNum}`;
          incompleteStep.result = stepResult;
          incompleteStep.displayValue = `(${firstNum}${displayOperator}${secondNum})=${stepResult}`;
          incompleteStep.isComplete = true;
          
          newValue = stepResult.toString();
          newLastOperation = null;
          newIsNewNumber = true;
          // Don't increment article count - we completed an existing step
        } else {
          // No incomplete step found, create new one
          newValue = input;
          newIsNewNumber = false;
        }
      } else if (newLastOperation === '*' || newLastOperation === '/') {
        // This is the second number in multiplication/division
        // Find the incomplete step and complete it
        const incompleteStep = newCalculationSteps.find(step => 
          !step.isComplete && (step.operator === '*' || step.operator === '/')
        );
        
        if (incompleteStep) {
          // Complete the multiplication/division
          const firstNum = incompleteStep.result;
          const secondNum = parseFloat(input);
          const stepResult = incompleteStep.operator === '*' ? firstNum * secondNum : firstNum / secondNum;
          
          const displayOperator = incompleteStep.operator === '*' ? '×' : '÷';
          incompleteStep.expression = `${firstNum}${incompleteStep.operator}${secondNum}`;
          incompleteStep.result = stepResult;
          incompleteStep.displayValue = `(${firstNum}${displayOperator}${secondNum})=${stepResult}`;
          incompleteStep.isComplete = true;
          
          newValue = stepResult.toString();
          newLastOperation = null;
          newIsNewNumber = true;
          // Don't increment article count - we completed an existing step
        }
      } else {
        // Regular number entry
        if (newCalculationSteps.length === 0) {
          // First number
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
        } else if (newLastOperation && (newLastOperation === '+' || newLastOperation === '-')) {
          // Addition/subtraction - create new step
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
      }
      if (newCalculationSteps.length === 0) {
        // First number
        newCalculationSteps.push({
          expression: input,
          result: parseFloat(input),
          timestamp: Date.now(),
          stepNumber: 1,
          operationType: 'number',
          displayValue: input,
          isComplete: false
        });
        newArticleCount = 1;
      }
      newValue = input;
      newIsNewNumber = false;
    } else {
      // Building existing number
      newValue = currentValue + input;
      
      // Update the last step
      if (newCalculationSteps.length > 0) {
        // Find the last incomplete step and update it
        const lastIncompleteStep = [...newCalculationSteps].reverse().find(step => !step.isComplete);
      }
    }
    // Don't create steps immediately for operators
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
        isComplete: true // Mark as complete since percentage calculation is finished
      };
      
      // Show the percentage result (10) in display
      newValue = percentResult.toString();
      newLastOperation = null; // Clear operation since calculation is complete
      newIsNewNumber = true;
      newArticleCount = 2;
    } else {
      // Simple percentage calculation
      const percentResult = Math.round((currentNum / 100) * 100) / 100;
      newValue = percentResult.toString();
      newIsNewNumber = true;
      
      if (newCalculationSteps.length > 0) {
        const lastStep = newCalculationSteps[newCalculationSteps.length - 1];
        if (!lastStep.isComplete) {
          lastStep.expression = `${percentResult}%`;
          lastStep.displayValue = `${percentResult}%`;
          lastStep.result = percentResult;
          lastStep.timestamp = Date.now();
          lastStep.stepNumber = newCalculationSteps.length;
          lastStep.isComplete = true; // Mark as complete since percentage calculation is finished
        }
      } else {
        // First number - this is step 1
        newCalculationSteps = [{
          expression: `${percentResult}%`,
          result: percentResult,
          timestamp: Date.now(),
          stepNumber: 1,
          operationType: 'number',
          displayValue: `${percentResult}%`,
          isComplete: true // Mark as complete since percentage calculation is finished
        }];
        newArticleCount = 1;
      }
      newArticleCount = newCalculationSteps.length;
    }
  } else if (input === '√') {
    // Square root
    const currentNum = getCurrentNumber();
    newValue = Math.sqrt(currentNum).toString();
    newIsNewNumber = true;
  } else if (input === '.') {
    // Handle decimal point - route to appropriate pathway
    const willBeCompound = isCompound;
    if (willBeCompound) {
      // Use compound calculation flow for decimal
      if (!currentValue.includes('.')) {
        newValue = currentValue + '.';
      }
    } else {
      // Use simple calculation flow for decimal
      if (!currentValue.includes('.')) {
        newValue = currentValue + '.';
      }
    }
  } else if (input === '*' || input === '/' || input === '×' || input === '÷') {
    // Handle multiplication/division operators
    // Create incomplete step that will be completed when second number is entered
    newCalculationSteps.push({
      expression: currentValue,
      result: parseFloat(currentValue),
      timestamp: Date.now(),
      stepNumber: newCalculationSteps.length + 1,
      operationType: 'operation',
      displayValue: currentValue,
      isComplete: false,
      operator: input === '×' ? '*' : input === '÷' ? '/' : input
    });
    newArticleCount = newCalculationSteps.length;
    newLastOperation = input === '×' ? '*' : input === '÷' ? '/' : input;
    newIsNewNumber = true;
  } else if (input === '+' || input === '-') {
    // Handle addition/subtraction operators
    const willBeCompound = isCompound;
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
  } else if (input === '=' || input === 'ENTER') {
    // Handle equals
    const willBeCompound = isCompound;
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
      
      // Dispatch event to update display
      window.dispatchEvent(new CustomEvent('autoReplayStep', { 
        detail: { 
          step, 
          index: currentStepIndex,
          displayValue: step.displayValue
        } 
      }));
      
      localStorage.setItem('currentCheckIndex', currentStepIndex.toString());
      currentStepIndex++;
      
      if (currentStepIndex < steps.length) {
        setTimeout(showNextStep, 1000);
      }
      setTimeout(showNextStep, 1000);
    } else {
      // After showing all steps, show the final result
      const hasCompletedSteps = steps.some(step => step.isComplete);
      
      if (hasCompletedSteps) {
        // Show the final result
        const expression = steps.some(step => step.expression.includes('*') || step.expression.includes('/') || step.expression.includes('×') || step.expression.includes('÷'))
          ? buildCompoundExpression(steps)
          : buildSimpleExpression(steps);
        const finalResult = evaluateExpression(expression);
        
        window.dispatchEvent(new CustomEvent('autoReplayStep', {
          detail: {
            displayValue: `=${finalResult}`,
            stepIndex: steps.length,
            totalSteps: steps.length + 1, // Include result in total
            currentStep: steps.length + 1,
            articleCount: steps.length
          }
        }));
        
        localStorage.setItem('currentCheckIndex', steps.length.toString());
        
        // Complete the auto replay after showing result
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('autoReplayComplete'));
        }, 1000);
      } else {
        window.dispatchEvent(new CustomEvent('autoReplayComplete'));
      }
    }
  };
  
  showNextStep();
};