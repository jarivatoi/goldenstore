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
    setTimeout(showNextStep, 1000);
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
    // Simple expression building - just concatenate the parts we have
    let parts: string[] = [];
    
    // Add the first number if we have steps
    if (newCalculationSteps.length > 0) {
      parts.push(newCalculationSteps[0].result.toString());
    }
    
    // Add pending operation and current value if we have them
    if (newLastOperation && newValue !== '0' && !newIsNewNumber) {
      const jsOperator = newLastOperation === '*' ? '*' : newLastOperation === '/' ? '/' : newLastOperation;
      parts.push(jsOperator);
      parts.push(newValue);
    }
    
    const expression = parts.join('');
    console.log('🔧 Built expression:', expression, 'from parts:', parts);
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
      // Start auto-replay from step 1
      localStorage.setItem('currentCheckIndex', '0');
      newValue = newCalculationSteps[0].displayValue;
      newIsNewNumber = true;
      
      // Start the auto-replay sequence with 0.5s delay
      setTimeout(() => {
        startAutoReplaySequence(newCalculationSteps);
      }, 500);
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
      
      // Get current step index from stored state
      const storedIndex = localStorage.getItem('currentCheckIndex');
      let currentStepIndex;
      
      if (storedIndex === null || storedIndex === '-1') {
        // Very first CHECK→ after calculation - start at index 0 (step 1/4)
        currentStepIndex = 0;
      } else {
        // Subsequent CHECK→ presses - increment from current position
        const currentIndex = parseInt(storedIndex);
        currentStepIndex = (currentIndex + 1) % newCalculationSteps.length;
      }
      
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
      
      // Update article count based on current step
      // Don't increment for result steps (those with '=')
      if (currentStep.operationType === 'result') {
        // For result steps, keep the count from the previous operation step
        newArticleCount = Math.max(1, currentStepIndex);
      } else {
        // For number and operation steps, use step index + 1
        newArticleCount = currentStepIndex + 1;
      }
      
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
      
      // Update article count based on current step
      // Don't increment for result steps (those with '=')
      if (currentStep.operationType === 'result') {
        // For result steps, keep the count from the previous operation step
        newArticleCount = Math.max(1, currentStepIndex);
      } else {
        // For number and operation steps, use step index + 1
        newArticleCount = currentStepIndex + 1;
      }
      
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
    console.log('🔢 PERCENTAGE DEBUG:', {
      currentValue: newValue,
      lastOperation: newLastOperation,
      calculationSteps: newCalculationSteps,
      stepsLength: newCalculationSteps.length,
      allStepsDetailed: newCalculationSteps.map((step, index) => ({
        index,
        expression: step.expression,
        result: step.result,
        operationType: step.operationType,
        displayValue: step.displayValue,
        stepNumber: step.stepNumber
      }))
    });
    
    const currentNum = getCurrentNumber();
    
    // Check if we have a pending multiplication operation
    if (newLastOperation === '*') {
      // Find the base number for percentage calculation
      // We need to find the number that comes BEFORE the current multiplication
      let firstOperand = 0;
      
      // Look for the most recent number that's not part of the current operation
      // The sequence should be: [number] × [current_number] %
      // We want the first [number], not the [current_number]
      
      console.log('🔍 Searching for base operand in steps:');
      for (let i = 0; i < newCalculationSteps.length; i++) {
        const step = newCalculationSteps[i];
        console.log(`Step ${i}:`, {
          expression: step.expression,
          result: step.result,
          operationType: step.operationType,
          displayValue: step.displayValue
        });
        
        // Look for a step that contains just a number (like "1000")
        // This should be our base value
        if (step.operationType === 'number' && !step.expression.includes('×') && !step.expression.includes('+') && !step.expression.includes('-') && !step.expression.includes('÷')) {
          firstOperand = step.result;
          console.log('🎯 Found base operand:', firstOperand, 'from step:', step);
          break;
        }
      }
      
      // If we didn't find a pure number step, try parsing the expression
      if (firstOperand === 0 && newCalculationSteps.length > 0) {
        const firstStep = newCalculationSteps[0];
        console.log('🔍 Trying to parse first step expression:', firstStep.expression);
        const parsed = parseFloat(firstStep.expression);
        if (!isNaN(parsed)) {
          firstOperand = parsed;
          console.log('🎯 Parsed first operand from expression:', firstOperand);
        }
      }
      
      console.log('🔢 PERCENTAGE CALCULATION:', {
        firstOperand,
        currentNum,
        willCalculate: `${firstOperand} × ${currentNum}% = ${(firstOperand * currentNum) / 100}`
      });
      
      if (firstOperand !== 0) {
        // Calculate percentage: 1000 × 10% = 1000 × (10/100) = 100
        const percentValue = (firstOperand * currentNum) / 100;
        console.log('🔢 PERCENTAGE RESULT:', {
          firstOperand,
          currentNum,
          percentValue,
          formula: `${firstOperand} × ${currentNum}% = ${percentValue}`
        });
        newValue = percentValue.toString();
        newIsNewNumber = true;
        
        // Clear the pending operation since % completes it
        newLastOperation = null;
        
        // IMPORTANT: Clear calculation steps and add only the clean result
        // This prevents % from appearing in any expressions
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
        console.log('🔢 NO VALID OPERAND FOUND for percentage calculation');
        // Simple percentage
        const percentResult = currentNum / 100;
        newValue = percentResult.toString();
        newIsNewNumber = true;
        
        // Clear calculation steps and add clean result
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
      console.log('🔢 SIMPLE PERCENTAGE (no pending multiplication)');
      // Simple percentage
      const percentResult = currentNum / 100;
      newValue = percentResult.toString();
      newIsNewNumber = true;
      
      // Clear calculation steps and add clean result
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
    // Handle numeric input (0-9, 00, 000)
    console.log('🔢 NUMERIC INPUT:', {
      input,
      currentValue,
      isNewNumber: newIsNewNumber,
      calculationSteps: newCalculationSteps.length
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
      
      // Update the current step if we're building a multi-digit number
      if (newCalculationSteps.length > 0) {
        const lastStep = newCalculationSteps[newCalculationSteps.length - 1];
        if (lastStep.operationType === 'number') {
          lastStep.displayValue = newValue;
          lastStep.expression = newValue;
          lastStep.result = parseFloat(newValue);
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
    const displayOperator = operator === '*' ? '×' : operator === '/' ? '÷' : operator;
    
    console.log('🔢 OPERATOR INPUT:', {
      input,
      operator,
      displayOperator,
      currentValue: newValue,
      lastOperation: newLastOperation,
      isNewNumber: newIsNewNumber,
      calculationSteps: newCalculationSteps.length
    });
    
    // If we have no steps yet, create the first step with current value
    if (newCalculationSteps.length === 0) {
      newCalculationSteps.push({
        expression: newValue,
        result: parseFloat(newValue),
        timestamp: Date.now(),
        stepNumber: 1,
        operationType: 'number',
        displayValue: newValue
      });
      newArticleCount = 1;
    }
    
    // Store the operation for later
    newLastOperation = operator;
    newIsNewNumber = true;
    isActive = true;
    
    console.log('🔢 OPERATOR SET:', {
      newLastOperation,
      newIsNewNumber,
      calculationSteps: newCalculationSteps.length
    });
         previousNumber,
         currentNum,
   } else if (input === '=' || input === 'ENTER') {
     try {
      // Build the complete expression step by step
      let fullExpression = '';
      
      if (newCalculationSteps.length > 0) {
        // Start with the first number
        fullExpression = newCalculationSteps[0].result.toString();
        
        // Add any pending operations
        if (newLastOperation && newValue !== '0') {
          const jsOperator = newLastOperation === '*' ? '*' : newLastOperation === '/' ? '/' : newLastOperation;
          fullExpression += jsOperator + newValue;
        }
      } else {
        fullExpression = newValue;
      }
      
      console.log('🔢 EQUALS - Building expression:', fullExpression);
      
      // For expressions like "25+5*3", we need to create proper steps
      if (fullExpression.includes('+') && fullExpression.includes('*')) {
        // Parse the expression to extract parts
        const parts = fullExpression.match(/(\d+)\+(\d+)\*(\d+)/);
        if (parts) {
          const [, first, second, third] = parts;
          
          // Create step for the multiplication part: (5×3)=15
          const multiplicationResult = parseInt(second) * parseInt(third);
          newCalculationSteps.push({
            expression: `(${second}×${third})=${multiplicationResult}`,
            result: multiplicationResult,
            timestamp: Date.now(),
            stepNumber: 2,
            operationType: 'operation',
            displayValue: `(${second}×${third})=${multiplicationResult}`
          });
          
          // Create step for the final addition: 25+15=40
          const finalResult = parseInt(first) + multiplicationResult;
          newCalculationSteps.push({
            expression: `${first}+${multiplicationResult}=${finalResult}`,
            result: finalResult,
            timestamp: Date.now(),
            stepNumber: 3,
            operationType: 'operation',
            displayValue: `${first}+${multiplicationResult}=${finalResult}`
          });
          
          // Final result step
          newCalculationSteps.push({
            expression: `=${finalResult}`,
            result: finalResult,
            timestamp: Date.now(),
            stepNumber: 4,
            operationType: 'result',
            displayValue: `=${finalResult}`
          });
          
          newValue = finalResult.toString();
        } else {
          // Fallback to simple evaluation
          const result = evaluateExpression(fullExpression);
          newValue = result.toString();
        }
      } else {
        // Simple expression
        const result = evaluateExpression(fullExpression);
        newCalculationSteps.push({
          expression: `=${result}`,
          result: result,
          timestamp: Date.now(),
          stepNumber: newCalculationSteps.length + 1,
          operationType: 'result',
          displayValue: `=${result}`
        });
        newValue = result.toString();
      }
      
      // Update state
      const finalResult = parseFloat(newValue);
      newGrandTotal += finalResult;
      newLastOperation = null;
      newLastOperand = null;
      newIsNewNumber = true;
      
      // Add to transaction history
      newTransactionHistory.push(finalResult);
      
      // Clear check navigation index
      localStorage.setItem('currentCheckIndex', '-1');
        }
      } else if (newCalculationSteps.length > 1 && newLastOperation && newValue !== '0') {
        // Complex case: multiple operations
        const displayOperator = newLastOperation === '*' ? '×' : 
                               newLastOperation === '/' ? '÷' : 
                               newLastOperation;
        
        newCalculationSteps.push({
          expression: `${displayOperator}${newValue}`,
          result: parseFloat(newValue),
          timestamp: Date.now(),
          stepNumber: newCalculationSteps.length + 1,
          operationType: 'operation',
          displayValue: `${displayOperator}${newValue}`
        });
        
        // Build full expression for evaluation
        expression = buildExpression();
      } else if (newCalculationSteps.length > 0) {
        // Just evaluate what we have
        expression = buildExpression();
      } else {
        // No steps, just use current value
        expression = newValue;
      }
      
      console.log('🔢 EQUALS - Final expression to evaluate:', expression);
      
      // Evaluate the expression
      const result = evaluateExpression(expression);
      console.log('🔢 EQUALS - Evaluation result:', result);
      
      // Add result step
      newCalculationSteps.push({
        expression: `=${result}`,
        result: result,
        timestamp: Date.now(),
        stepNumber: newCalculationSteps.length + 1,
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
      
      // Clear check navigation index when new calculation is complete
      localStorage.setItem('currentCheckIndex', '-1');
      
    } catch (error) {
      console.error('🔢 EQUALS - Calculation error:', error);
      newValue = 'Error';
      newIsNewNumber = true;
    }
  } else if (['+', '-', '*', '/', '×', '÷'].includes(input)) {
    // Handle operators
    const operator = input === '×' ? '*' : input === '÷' ? '/' : input;
    const displayOperator = operator === '*' ? '×' : operator === '/' ? '÷' : operator;
    
    console.log('🔢 OPERATOR INPUT:', {
      input,
      operator,
      displayOperator,
      currentValue: newValue,
      lastOperation: newLastOperation,
      isNewNumber: newIsNewNumber,
      calculationSteps: newCalculationSteps
    });
    
    // If we have no steps yet, create the first step with current value
    if (newCalculationSteps.length === 0) {
      newCalculationSteps.push({
        expression: newValue,
        result: parseFloat(newValue),
        timestamp: Date.now(),
        stepNumber: 1,
        operationType: 'number',
        displayValue: newValue
      });
      newArticleCount = 1;
      } else {
    // Handle any other input types that might exist
    console.warn('Unhandled calculator input:', input);
  }
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
          displayValue: step.displayValue, // Show the proper display value
          stepIndex: currentStepIndex,
          totalSteps: steps.length,
          currentStep: currentStepIndex + 1, // 1-based step number for display
          articleCount: step.operationType === 'result' ? currentStepIndex : currentStepIndex + 1 // Don't increment for result step
        }
      }));
      
      // Store current index for CHECK navigation
      localStorage.setItem('currentCheckIndex', currentStepIndex.toString());
      
      currentStepIndex++;
      
      // Schedule next step after 0.5 seconds
      if (currentStepIndex < steps.length) {
        setTimeout(showNextStep, 1000); // 1 second delay
      } else {
        // Replay complete - stop here
        console.log('🎬 AUTO replay completed');
        // Clear auto replay state when complete
        window.dispatchEvent(new CustomEvent('autoReplayComplete'));
      }
    }
  };
  
  // Start the sequence
  showNextStep();
};