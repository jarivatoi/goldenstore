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
    let cleanExpression = expression
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/x/g, '*'); // Also handle lowercase x
    
    // Remove trailing operators before evaluation
    cleanExpression = cleanExpression.replace(/[+\-*/÷×]+$/, '');
    
    // If expression is empty after cleaning, use 0
    if (!cleanExpression || cleanExpression === '') {
      return 0;
    }
    
    console.log('🧮 Evaluating expression:', cleanExpression);
    const result = Function('"use strict"; return (' + cleanExpression + ')')();
    console.log('🧮 Expression result:', result);
    
    if (isNaN(result) || !isFinite(result)) {
      return 0;
    }
    
    return result;
  } catch {
    console.error('🧮 Expression evaluation failed for:', expression);
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
  
  // Build expression string for proper order of operations
  const buildExpression = (): string => {
    let expression = '';
    
    // Start with the first number
    if (newCalculationSteps.length > 0) {
      expression = newCalculationSteps[0].expression;
    } else {
      expression = newValue;
    }
    
    // Add subsequent operations
    for (let i = 1; i < newCalculationSteps.length; i++) {
      const step = newCalculationSteps[i];
      const stepExpr = step.expression;
      
      // Convert display operators to JavaScript operators
      const convertedExpr = stepExpr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/x/g, '*');
      
      expression += convertedExpr;
    }
    
    // DON'T add current value if we already have it in steps
    // Only add if we have a pending operation but no step for current number yet
    const hasCurrentNumberInSteps = newCalculationSteps.length > 0 && 
      newCalculationSteps[newCalculationSteps.length - 1].operationType === 'operation';
    
    if (newLastOperation && !newIsNewNumber && newValue !== '0' && !hasCurrentNumberInSteps) {
      const jsOperator = newLastOperation === '*' ? '*' :
                        newLastOperation === 'x' ? '*' :
                        newLastOperation === '÷' ? '/' : 
                        newLastOperation;
      expression += jsOperator + newValue;
    }
    
    console.log('🔧 Built expression:', expression);
    return expression;
  };

  // Helper function to get the current expression for display
  const getCurrentExpression = (): string => {
    let expression = '';
    
    // Build from steps
    if (newCalculationSteps.length > 0) {
      expression = newCalculationSteps[0].expression;
      
      for (let i = 1; i < newCalculationSteps.length; i++) {
        expression += newCalculationSteps[i].expression;
      }
    }
    
    // Add current operation if we have one
    if (newLastOperation && !newIsNewNumber && newValue !== '0') {
      const displayOperator = newLastOperation === '*' ? '×' :
                             newLastOperation === '/' ? '÷' : 
                             newLastOperation;
      expression += displayOperator + newValue;
    }
    
    console.log('📺 Display expression:', expression);
    return expression;
  };
  let pendingOperandExpression = ''; // Track compound expressions like "3×5"

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
      newValue = newCalculationSteps[0].expression; // Show the actual expression
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
      console.log('🔍 CHECK→ BEFORE:', {
        currentStoredIndex: localStorage.getItem('currentCheckIndex'),
        stepsLength: newCalculationSteps.length,
        allSteps: newCalculationSteps.map((step, idx) => ({
          index: idx,
          expression: step.expression,
          displayValue: step.displayValue,
          operationType: step.operationType,
          stepNumber: step.stepNumber
        })),
        detailedSteps: newCalculationSteps.map((step, idx) => `Step ${idx}: "${step.displayValue}" (${step.operationType})`)
      });
      
      // Get current step index from stored state or start from 0
      let currentStepIndex = parseInt(localStorage.getItem('currentCheckIndex') || '0');
      
      // For CHECK→: increment forward with wraparound
      currentStepIndex = (currentStepIndex + 1) % newCalculationSteps.length;
      
      // Store current index
      localStorage.setItem('currentCheckIndex', currentStepIndex.toString());
      
      const currentStep = newCalculationSteps[currentStepIndex];
      console.log('🔍 CHECK→ DETAILED:', {
        currentStepIndex,
        totalSteps: newCalculationSteps.length,
        currentStep: {
          expression: currentStep.expression,
          displayValue: currentStep.displayValue,
          operationType: currentStep.operationType,
          stepNumber: currentStep.stepNumber
        },
        willDisplay: currentStep.displayValue,
        actualStepContent: JSON.stringify(currentStep)
      });
      // For CHECK navigation, preserve the exact displayValue without formatting
      newValue = currentStep.displayValue; // Show the proper display value with operator
      console.log('🔍 CHECK→ SETTING newValue to:', newValue);
      
      // Skip all number formatting for CHECK navigation
      return { 
        value: newValue, // Use exact displayValue without any formatting
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
      console.log('🔍 CHECK← BEFORE:', {
        currentStoredIndex: localStorage.getItem('currentCheckIndex'),
        stepsLength: newCalculationSteps.length,
        allSteps: newCalculationSteps.map((step, idx) => ({
          index: idx,
          expression: step.expression,
          displayValue: step.displayValue,
          operationType: step.operationType
        }))
      });
      
      // Get current step index from stored state or start from 0
      let currentStepIndex = parseInt(localStorage.getItem('currentCheckIndex') || '0');
      
      // If no stored index (first CHECK← after calculation), start from the last step
      const storedIndex = localStorage.getItem('currentCheckIndex');
      if (storedIndex === null || storedIndex === '-1') {
        currentStepIndex = newCalculationSteps.length - 1;
      } else {
        // Move to previous step (with wraparound)
        currentStepIndex = currentStepIndex === 0 ? newCalculationSteps.length - 1 : currentStepIndex - 1;
      }
      
      // Store current index
      localStorage.setItem('currentCheckIndex', currentStepIndex.toString());
      
      const currentStep = newCalculationSteps[currentStepIndex];
      console.log('🔍 CHECK← DETAILED DEBUG:', {
        currentStepIndex,
        totalSteps: newCalculationSteps.length,
        currentStep: {
          expression: currentStep.expression,
          displayValue: currentStep.displayValue,
          operationType: currentStep.operationType,
          stepNumber: currentStep.stepNumber
        },
        allSteps: newCalculationSteps.map((step, idx) => ({
          index: idx,
          expression: step.expression,
          displayValue: step.displayValue,
          operationType: step.operationType
        })),
        willDisplay: currentStep.displayValue
      });
      newValue = currentStep.displayValue; // Show the proper display value with operator
      console.log('🔍 CHECK← SETTING newValue to:', newValue);
      
      // Skip all number formatting for CHECK navigation
      return { 
        value: newValue, // Use exact displayValue without any formatting
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
      // Build the complete expression from steps
      const expression = buildExpression();
      
      console.log('🧮 Evaluating final expression:', expression);
      
      // Evaluate the complete expression with proper order of operations
      const result = evaluateExpression(expression);
      
      console.log('🧮 Final result:', result);
      
      if (isNaN(result) || !isFinite(result)) {
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
      
      // Add final result step
      newCalculationSteps.push({
        expression: `= ${result}`,
        result: result,
        timestamp: Date.now(),
        stepNumber: newCalculationSteps.length + 1,
        operationType: 'result',
        displayValue: `= ${result}`
      });
      
      // Add to grand total and transaction history
      newGrandTotal += result;
      newTransactionHistory.push(result);
      
      newValue = result.toString();
      newLastOperation = null;
      newLastOperand = null;
      newIsNewNumber = true;
    } catch {
      newValue = 'Error';
      newLastOperation = null;
      newLastOperand = null;
      newIsNewNumber = true;
    }
  } else if (['+', '-', '*', '×', '/', '÷'].includes(input)) {
    // Arithmetic operations
    console.log('🔧 OPERATOR INPUT DEBUG:', {
      input,
      currentValue: newValue,
      stepsLength: newCalculationSteps.length,
      currentSteps: newCalculationSteps.map(s => ({ expression: s.expression, type: s.operationType }))
    });
    
    // When we get an operator, we need to:
    // 1. If this is the first operator, store the current value as the first operand
    // 2. Store the operator for the next number
    
    if (newCalculationSteps.length === 0) {
      // First number in calculation
      console.log('🔧 Creating FIRST number step for operator:', newValue);
      newCalculationSteps.push({
        expression: newValue,
        result: parseFloat(newValue),
        timestamp: Date.now(),
        stepNumber: 1,
        operationType: 'number',
        displayValue: newValue
      });
    }
    
    // Store the operator (convert display symbols to JS operators)
    newLastOperation = input === '×' ? '*' : input === '÷' ? '/' : input;
    console.log('🔧 SET lastOperation:', {
      input,
      newLastOperation,
      willWaitForNextNumber: true
    });
    
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
    console.log('🔢 NUMBER INPUT DEBUG:', {
      input,
      currentValue: newValue,
      isNewNumber: newIsNewNumber,
      lastOperation: newLastOperation,
      stepsLength: newCalculationSteps.length,
      currentSteps: newCalculationSteps.map(s => ({ expression: s.expression, type: s.operationType }))
    });
    
    if (newIsNewNumber || currentValue === '0') {
      // Starting a new number
      if (newCalculationSteps.length === 0) {
        // Very first number in calculation
        console.log('🔢 Creating FIRST step:', input);
        newArticleCount = 1;
        newCalculationSteps.push({
          expression: input,
          result: parseFloat(input),
          timestamp: Date.now(),
          stepNumber: 1,
          operationType: 'number',
          displayValue: input
        });
      } else if (newLastOperation && newIsNewNumber) {
        // New number after an operation - increment article count
        console.log('🔢 Creating OPERATOR step:', {
          lastOperation: newLastOperation,
          input,
          willCreate: `${newLastOperation === '*' ? '×' : newLastOperation === '/' ? '÷' : newLastOperation}${input}`
        });
        newArticleCount++;
        // Create step for this number with the pending operation (display format)
        const displayOperator = newLastOperation === '*' ? '×' : 
                               newLastOperation === '/' ? '÷' : 
                               newLastOperation;
        
        // Create step with operator and number
        const stepExpression = `${displayOperator}${input}`;
        newCalculationSteps.push({
          expression: stepExpression,
          result: parseFloat(input),
          timestamp: Date.now(),
          stepNumber: newCalculationSteps.length + 1,
          operationType: 'operation',
          displayValue: stepExpression // This should be "+5", "×3", etc.
        });
        
        console.log('🔢 CREATED operator step:', {
          stepExpression,
          stepNumber: newCalculationSteps.length,
          operationType: 'operation',
          displayValue: stepExpression,
          allSteps: newCalculationSteps.map(s => s.expression)
        });
      }
      newValue = input;
      newIsNewNumber = false;
    } else {
      // Continuing to build the same number
      console.log('🔢 CONTINUING number build:', {
        currentValue,
        input,
        willBecome: currentValue + input
      });
      newValue = currentValue + input;
      
      // Update the last step's display value if we're building a multi-digit number
      if (newCalculationSteps.length > 0 && !newIsNewNumber) {
        const lastStep = newCalculationSteps[newCalculationSteps.length - 1];
        console.log('🔢 UPDATING last step:', {
          before: lastStep.displayValue,
          operationType: lastStep.operationType,
          newValue
        });
        // Only update if this step has an operator (not the first step)
        if (lastStep.operationType === 'operation' && lastStep.displayValue.match(/^[+\-×÷]/)) {
          const operatorSymbol = lastStep.displayValue.charAt(0);
          lastStep.displayValue = `${operatorSymbol}${newValue}`;
          lastStep.expression = `${operatorSymbol}${newValue}`;
          console.log('🔢 UPDATED multi-digit operator step:', {
            operatorSymbol,
            newDisplayValue: lastStep.displayValue,
            newExpression: lastStep.expression
          });
        } else {
          // First step - just update the number
          lastStep.displayValue = newValue;
          lastStep.expression = newValue;
          console.log('🔢 UPDATED first step:', {
            newDisplayValue: lastStep.displayValue,
            newExpression: lastStep.expression
          });
        }
      }
    }
    isActive = true;
  } else {
    // Handle any other input types that might exist
    console.warn('Unhandled calculator input:', input);
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
          displayValue: step.expression, // Show the actual expression
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