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
  isComplete: boolean;
  operator?: string;
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
    let cleanExpression = expression
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/x/g, '*');
    
    cleanExpression = cleanExpression.replace(/[+\-*/÷×]+$/, '');
    
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
    if (newIsNewNumber || currentValue === '0') {
      if (newCalculationSteps.length === 0) {
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
        if (newLastOperation === '+' || newLastOperation === '-') {
          newArticleCount++;
        }
        
        const numericValue = parseFloat(input);
        
        newCalculationSteps.push({
          expression: `${newLastOperation}${input}`,
          result: numericValue,
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
      newValue = currentValue + input;
      
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
          lastStep.expression = `${operator}${newValue}`;
          lastStep.result = parseFloat(newValue);
          lastStep.isComplete = false;
        }
      }
    }
  } else if (input === '.') {
    if (!currentValue.includes('.')) {
      if (currentValue === '0' || newIsNewNumber) {
        newValue = '0.';
        newIsNewNumber = false;
        
        if (newCalculationSteps.length === 0) {
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
      } else {
        newValue = currentValue + '.';
      }
    }
  } else if (input === '+' || input === '-') {
    if (newCalculationSteps.length > 0) {
      const stepsForCalculation = newCalculationSteps.map(step => ({ ...step, isComplete: true }));
      
      const isCompound = isCompoundCalculation(stepsForCalculation, newLastOperation);
      
      let intermediateResult: number;
      if (isCompound) {
        const expression = buildCompoundExpression(stepsForCalculation);
        intermediateResult = evaluateExpression(expression);
      } else {
        const expression = buildSimpleExpression(stepsForCalculation);
        intermediateResult = evaluateExpression(expression);
      }
      
      newValue = intermediateResult.toString();
    }
    
    newLastOperation = input;
    newIsNewNumber = true;
  } else if (input === '=' || input === 'ENTER') {
    if (newCalculationSteps.length > 0 && newCalculationSteps.some(step => step.isComplete)) {
      newValue = currentValue;
      newIsNewNumber = true;
    } else if (newCalculationSteps.length > 0) {
      newCalculationSteps.forEach(step => {
        step.isComplete = true;
      });
      
      const expression = buildSimpleExpression(newCalculationSteps);
      result = evaluateExpression(expression);
      
      newValue = result.toString();
      newLastOperation = null;
      newIsNewNumber = true;
      newArticleCount = newCalculationSteps.length;
      
      newGrandTotal += result;
      newTransactionHistory.push(result);
    } else {
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

  if (newCalculationSteps.length === 0 && (input === '*' || input === '/' || input === '+' || input === '-' || input === '×' || input === '÷')) {
    const currentNum = parseFloat(currentValue);
    if (!isNaN(currentNum)) {
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
    if (newIsNewNumber || currentValue === '0') {
      if (newCalculationSteps.length === 0) {
        const numericValue = parseFloat(input);
        
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
        if (newLastOperation === '+' || newLastOperation === '-') {
          newArticleCount++;
        }
        const numericValue = parseFloat(input) || 0;
        
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
      newValue = currentValue + input;
      
      if (newCalculationSteps.length > 0) {
        const lastStep = newCalculationSteps[newCalculationSteps.length - 1];
        if (lastStep.operationType === 'number') {
          lastStep.displayValue = newValue;
          lastStep.expression = newValue;
          lastStep.result = parseFloat(newValue) || 0;
          lastStep.isComplete = false;
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
    if (!currentValue.includes('.')) {
      if (currentValue === '0' || newIsNewNumber) {
        newValue = '0.';
        newIsNewNumber = false;
      } else {
        newValue = currentValue + '.';
      }
    }
  } else if (input === '*' || input === '×') {
    if (newCalculationSteps.length > 0) {
      const expression = buildCompoundExpression(newCalculationSteps);
      const intermediateResult = evaluateExpression(expression);
      
      newValue = intermediateResult.toString();
    }
    
    newCalculationSteps.push({
      expression: `*`,
      result: 0,
      timestamp: Date.now(),
      stepNumber: newCalculationSteps.length + 1,
      operationType: 'operation',
      displayValue: `×`,
      isComplete: false,
      operator: '*'
    });
    
    newLastOperation = '*';
    newIsNewNumber = true;
  } else if (input === '/' || input === '÷') {
    if (newCalculationSteps.length > 0) {
      const expression = buildCompoundExpression(newCalculationSteps);
      const intermediateResult = evaluateExpression(expression);
      
      newValue = intermediateResult.toString();
    }
    
    newCalculationSteps.push({
      expression: `/`,
      result: 0,
      timestamp: Date.now(),
      stepNumber: newCalculationSteps.length + 1,
      operationType: 'operation',
      displayValue: `÷`,
      isComplete: false,
      operator: '/'
    });
    
    newLastOperation = '/';
    newIsNewNumber = true;
  } else if (input === '+' || input === '-') {
    if (newCalculationSteps.length > 0) {
      const expression = buildCompoundExpression(newCalculationSteps);
      const intermediateResult = evaluateExpression(expression);
      
      newValue = intermediateResult.toString();
      
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
    }
    
    newLastOperation = input;
    newIsNewNumber = true;
  } else if (input === '=' || input === 'ENTER') {
    if (newCalculationSteps.length > 0 && newCalculationSteps.some(step => step.isComplete)) {
      newValue = currentValue;
      newIsNewNumber = true;
    } else if (newCalculationSteps.length > 0) {
      newCalculationSteps.forEach(step => {
        step.isComplete = true;
      });
      
      const expression = buildCompoundExpression(newCalculationSteps);
      result = evaluateExpression(expression);
      
      if (result % 1 === 0) {
        newValue = result.toString();
      } else {
        newValue = parseFloat(result.toFixed(10)).toString();
      }
      
      newLastOperation = null;
      newIsNewNumber = true;
      
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
 * Build expression from compound calculation steps
 */
const buildCompoundExpression = (steps: CalculationStep[]): string => {
  let expression = '';
  
  let processedSteps = [...steps];
  let i = 0;
  
  while (i < processedSteps.length) {
    const step = processedSteps[i];
    
    if (step.operationType === 'operation' && 
        (step.operator === '*' || step.operator === '/' || step.operator === '×' || step.operator === '÷')) {
      
      if (i > 0 && processedSteps[i - 1].operationType === 'number') {
        const leftOperand = processedSteps[i - 1].result;
        const rightOperand = step.result;
        const operator = step.operator;
        
        let subResult: number;
        if (operator === '*' || operator === '×') {
          subResult = leftOperand * rightOperand;
        } else if (operator === '/' || operator === '÷') {
          subResult = rightOperand !== 0 ? leftOperand / rightOperand : 0;
        } else {
          subResult = rightOperand;
        }
        
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
        i = i - 1;
      }
    }
    i++;
  }
  
  for (let i = 0; i < processedSteps.length; i++) {
    const step = processedSteps[i];
    
    if (step.operationType === 'number') {
      if (i > 0 && processedSteps[i - 1].operationType === 'operation') {
        expression += step.result;
      } else {
        expression += step.result;
      }
    } else if (step.operationType === 'operation') {
      expression += (step.operator || '');
    }
  }
  
  return expression;
};

/**
 * Determine if calculation is compound
 */
const isCompoundCalculation = (calculationSteps: CalculationStep[], lastOperation: string | null): boolean => {
  for (const step of calculationSteps) {
    if (step.expression.includes('*') || 
        step.expression.includes('/') || 
        step.expression.includes('×') || 
        step.expression.includes('÷')) {
      return true;
    }
    
    if (step.operator === '*' || step.operator === '/' || step.operator === '×' || step.operator === '÷') {
      return true;
    }
    
    if (step.displayValue && (step.displayValue.includes('×') || step.displayValue.includes('÷'))) {
      return true;
    }
    
    if (step.isComplete && step.operationType === 'operation') {
      if (step.displayValue && (step.displayValue.includes('×') || step.displayValue.includes('÷'))) {
        return true;
      }
    }
  }
  
  return lastOperation === '*' || lastOperation === '/' || lastOperation === '×' || lastOperation === '÷';
};

/**
 * Build summarized steps for auto replay display
 */
const buildSummarizedSteps = (steps: CalculationStep[]): CalculationStep[] => {
  const summarizedSteps: CalculationStep[] = [];
  let currentStep = 1;
  
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    
    if (step.operationType === 'number') {
      // Add number step as-is
      summarizedSteps.push({
        ...step,
        stepNumber: currentStep++,
        displayValue: step.displayValue
      });
    } else if (step.operationType === 'operation') {
      // For operation steps, check if it's part of a compound operation
      if (step.operator === '*' || step.operator === '/' || step.operator === '×' || step.operator === '÷') {
        // This is a multiplication/division operation
        if (i > 0 && summarizedSteps.length > 0) {
          const previousStep = summarizedSteps[summarizedSteps.length - 1];
          const nextNumberStep = i + 1 < steps.length ? steps[i + 1] : null;
          
          if (previousStep.operationType === 'number' && nextNumberStep && nextNumberStep.operationType === 'number') {
            // Create compound operation display: +(5×3)=15
            const leftOperand = previousStep.result;
            const rightOperand = nextNumberStep.result;
            const operator = step.operator === '*' ? '×' : '÷';
            
            let subResult: number;
            if (step.operator === '*' || step.operator === '×') {
              subResult = leftOperand * rightOperand;
            } else {
              subResult = rightOperand !== 0 ? leftOperand / rightOperand : 0;
            }
            
            // Update the previous step to show the compound operation
            summarizedSteps[summarizedSteps.length - 1] = {
              expression: `(${leftOperand}${operator}${rightOperand})`,
              result: subResult,
              timestamp: Date.now(),
              stepNumber: currentStep++,
              operationType: 'operation',
              displayValue: `+(${leftOperand}${operator}${rightOperand})=${subResult}`,
              isComplete: true,
              operator: '+'
            };
            
            // Skip the next number step since we've already processed it
            i++;
          }
        }
      } else {
        // For addition/subtraction, add as-is
        summarizedSteps.push({
          ...step,
          stepNumber: currentStep++,
          displayValue: step.displayValue
        });
      }
    }
  }
  
  return summarizedSteps;
};

/**
 * Calculator input processor
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
  
  const isCompound = isCompoundCalculation(newCalculationSteps, newLastOperation) || 
                     (input === '*' || input === '/' || input === '×' || input === '÷');

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

  const getCurrentNumber = (): number => {
    const num = parseFloat(currentValue);
    return isNaN(num) ? 0 : num;
  };

  // Handle special functions
  if (input === 'ON/C' || input === 'C') {
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
  } else if (input === 'AC') {
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
  } else if (input === 'CE') {
    newValue = '0';
    newIsNewNumber = true;
  } else if (input === '→') {
    if (currentValue.length > 1 && currentValue !== '0') {
      newValue = currentValue.slice(0, -1);
    } else {
      newValue = '0';
      newIsNewNumber = true;
    }
  } else if (input === 'MU') {
    const currentNum = getCurrentNumber();
    newMemory += currentNum;
  } else if (input === 'MRC') {
    if (memory === 0) {
    } else if (currentValue === memory.toString()) {
      newMemory = 0;
    } else {
      newValue = memory.toString();
      newIsNewNumber = true;
    }
  } else if (input === 'M-') {
    const currentNum = getCurrentNumber();
    newMemory -= currentNum;
  } else if (input === 'M+') {
    const currentNum = getCurrentNumber();
    newMemory += currentNum;
  } else if (input === 'GT') {
    newValue = newGrandTotal.toString();
    newIsNewNumber = true;
} else if (input === 'AUTO') {
  // AUTO REPLAY - replay transaction history
  if (newCalculationSteps.length > 0) {
    autoReplayActive = true;
    
    // Build summarized steps for display (group compound operations)
    const summarizedSteps = buildSummarizedSteps(newCalculationSteps);
    
    console.log('🔍 Summarized steps for auto replay:', summarizedSteps.map(s => s.displayValue));
    
    // Show first step immediately
    newValue = summarizedSteps[0].displayValue;
    newIsNewNumber = true;
    
    // Start auto replay sequence with summarized steps
    setTimeout(() => {
      startAutoReplaySequence(summarizedSteps);
    }, 500);
  } else {
    newValue = currentValue;
  }
}
  } else if (input === 'CHECK→') {
    if (newCalculationSteps.length > 0) {
      let currentStepIndex = parseInt(localStorage.getItem('currentCheckIndex') || '-1');
      
      currentStepIndex++;
      
      const hasResult = newCalculationSteps.some(step => step.isComplete);
      const totalPositions = hasResult ? newCalculationSteps.length + 1 : newCalculationSteps.length;
      
      if (currentStepIndex >= totalPositions) {
        currentStepIndex = 0;
      }
      
      localStorage.setItem('currentCheckIndex', currentStepIndex.toString());
      
      if (hasResult && currentStepIndex === newCalculationSteps.length) {
        const lastStep = newCalculationSteps[newCalculationSteps.length - 1];
        if (lastStep && lastStep.isComplete && lastStep.displayValue.includes('%')) {
          newValue = `=${lastStep.result}`;
        } else {
          const expression = buildSimpleExpression(newCalculationSteps);
          const resultValue = evaluateExpression(expression);
          newValue = `=${resultValue}`;
        }
        newArticleCount = newCalculationSteps.length;
      } else {
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
    if (newCalculationSteps.length > 0) {
      let currentStepIndex = parseInt(localStorage.getItem('currentCheckIndex') || '-1');
      
      const hasResult = newCalculationSteps.some(step => step.isComplete);
      const totalPositions = hasResult ? newCalculationSteps.length + 1 : newCalculationSteps.length;
      
      currentStepIndex--;
      if (currentStepIndex < 0) {
        currentStepIndex = totalPositions - 1;
      }
      
      localStorage.setItem('currentCheckIndex', currentStepIndex.toString());
      
      if (hasResult && currentStepIndex === newCalculationSteps.length) {
        const expression = buildSimpleExpression(newCalculationSteps);
        const resultValue = evaluateExpression(expression);
        newValue = `=${resultValue}`;
        newArticleCount = newCalculationSteps.length;
      } else {
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
    const currentNum = getCurrentNumber();
    
    if (newLastOperation === '*' || newLastOperation === '×') {
      if (newCalculationSteps.length >= 2) {
        const baseValue = newCalculationSteps[0].result;
        const percentageValue = currentNum;
        
        const percentResult = Math.round((baseValue * (percentageValue / 100)) * 100) / 100;
        
        newCalculationSteps[1] = {
          expression: `(${baseValue}×${percentageValue}%)`,
          result: percentResult,
          timestamp: Date.now(),
          stepNumber: 2,
          operationType: 'operation',
          displayValue: `(${baseValue}×${percentageValue}%)=${percentResult}`,
          isComplete: true
        };
        
        newValue = percentResult.toString();
        newLastOperation = null;
        newIsNewNumber = true;
        newArticleCount = 1;
        
        newCalculationSteps = [{
          expression: percentResult.toString(),
          result: percentResult,
          timestamp: Date.now(),
          stepNumber: 1,
          operationType: 'number',
          displayValue: percentResult.toString(),
          isComplete: false
        }];
      } else {
        const percentResult = Math.round((currentNum / 100) * 100) / 100;
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
    } else {
      const percentResult = Math.round((currentNum / 100) * 100) / 100;
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
    const currentNum = getCurrentNumber();
    if (currentNum < 0) {
      newValue = 'Error';
    } else {
      const sqrtResult = Math.sqrt(currentNum);
      newValue = sqrtResult.toString();
      
      newCalculationSteps = [{
        expression: sqrtResult.toString(),
        result: sqrtResult,
        timestamp: Date.now(),
        stepNumber: 1,
        operationType: 'number',
        displayValue: sqrtResult.toString(),
        isComplete: false
      }];
      newArticleCount = 1;
      
      newLastOperation = null;
    }
    newIsNewNumber = true;
  } else if (input === 'LINK') {
    newValue = currentValue;
    newIsNewNumber = false;
  } else if (input === '.') {
    let processedInput = input;
    if (currentValue === '0' || isNewNumber) {
      processedInput = '.';
    }
    
    const willBeCompound = isCompound;
    if (willBeCompound) {
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
    let willBeCompound = input === '*' || input === '/' || input === '×' || input === '÷' || 
                        isCompoundCalculation(newCalculationSteps, newLastOperation);
    
    if (input === '=' || input === 'ENTER') {
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
      }
    } else {
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
      }
    }
  }

  if (newValue !== 'Error' && newValue !== '0.' && !isNaN(parseFloat(newValue))) {
    const num = parseFloat(newValue);
    if (num > 999999999999 || (num < 0.000001 && num !== 0)) {
      newValue = num.toExponential(6);
    } else if (input === '=' || input === 'ENTER') {
      if (newValue.includes('.')) {
        const decimalPart = newValue.split('.')[1];
        if (decimalPart && decimalPart.length === 1) {
          newValue = num.toFixed(2);
        } else {
          newValue = num.toString();
        }
      } else {
        newValue = num.toString();
      }
    } else {
      newValue = newValue;
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
 * Auto-replay sequence function with summarized steps
 */
const startAutoReplaySequence = (summarizedSteps: CalculationStep[]) => {
  let currentStepIndex = 0;
  
  const showNextStep = () => {
    if (currentStepIndex < summarizedSteps.length) {
      const step = summarizedSteps[currentStepIndex];
      
      window.dispatchEvent(new CustomEvent('autoReplayStep', {
        detail: {
          displayValue: step.displayValue,
          stepIndex: currentStepIndex,
          totalSteps: summarizedSteps.length,
          currentStep: currentStepIndex + 1,
          articleCount: step.stepNumber,
          isCompound: true
        }
      }));
      
      currentStepIndex++;
      
      if (currentStepIndex < summarizedSteps.length) {
        setTimeout(showNextStep, 1000);
      } else {
        // Show final result
        const expression = buildCompoundExpression(summarizedSteps);
        const result = evaluateExpression(expression);
        
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('autoReplayStep', {
            detail: {
              displayValue: `=${result}`,
              stepIndex: currentStepIndex,
              totalSteps: summarizedSteps.length + 1,
              currentStep: currentStepIndex + 1,
              articleCount: summarizedSteps.length,
              isCompound: true
            }
          }));
          
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('autoReplayComplete'));
          }, 1000);
        }, 1000);
      }
    }
  };
  
  showNextStep();
};