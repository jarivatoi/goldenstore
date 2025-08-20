/**
 * CREDIT CALCULATOR UTILITIES
 * ===========================
 * 
 * Utility functions for calculator operations and expression evaluation
 */

/**
 * Safely evaluates a calculator expression
 */
export const evaluateExpression = (expression: string): number => {
  try {
    // Replace display symbols with JavaScript operators for evaluation
    let cleanExpression = expression.replace(/×/g, '*').replace(/÷/g, '/');
    
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
 * Processes calculator input and returns new calculator state
 */
export const processCalculatorInput = (
  currentValue: string,
  input: string,
  memory: number
): { value: string; memory: number; isActive: boolean } => {
  let newValue = currentValue;
  let newMemory = memory;
  let isActive = true;

  if (input === 'C') {
    newValue = '0';
    isActive = false;
  } else if (input === '=') {
    try {
      // Replace display symbols with JavaScript operators for evaluation
      const expression = currentValue.replace(/×/g, '*').replace(/÷/g, '/');
      
      // Remove trailing operators before evaluation
      const cleanExpression = expression.replace(/[+\-*/÷×]+$/, '');
      
      // If expression is empty after cleaning, keep current value
      if (!cleanExpression || cleanExpression === '') {
        return { value: currentValue, memory, isActive };
      }
      
      const result = eval(cleanExpression);
      
      // Check for invalid results
      if (!isFinite(result)) {
        newValue = 'Error';
      } else {
        newValue = result.toString();
      }
    } catch {
      newValue = 'Error';
    }
  } else if (input === 'CE') {
    // Clear Entry - removes the last operand only
    const operators = ['+', '-', '*', '/'];
    let lastOperatorIndex = -1;
    
    // Find the last operator from the end
    for (let i = currentValue.length - 1; i >= 0; i--) {
      if (operators.includes(currentValue[i])) {
        lastOperatorIndex = i;
        break;
      }
    }
    
    if (lastOperatorIndex >= 0) {
      // Keep everything up to but NOT including the last operator
      newValue = currentValue.substring(0, lastOperatorIndex);
    } else {
      // No operator found, clear everything to 0
      newValue = '0';
      isActive = false;
    }
  } else if (input === '⌫') {
    if (currentValue.length > 1) {
      newValue = currentValue.slice(0, -1);
    } else {
      newValue = '0';
    }
  } else if (input === 'M+') {
    try {
      const currentAmount = evaluateExpression(currentValue);
      if (isFinite(currentAmount)) {
        newMemory = memory + currentAmount;
      }
    } catch {
      // Do nothing if calculation error
    }
  } else if (input === 'MR') {
    newValue = memory.toString();
    isActive = true;
  } else if (input === 'MC') {
    newMemory = 0;
  } else if (input === '*') {
    // Display multiplication as ×
    if (currentValue === '0' || currentValue === 'Error' || currentValue === 'Infinity') {
      newValue = '0×';
    } else if (currentValue.match(/[+\-×÷]$/)) {
      // Replace last operator with ×
      newValue = currentValue.slice(0, -1) + '×';
    } else {
      newValue = currentValue + '×';
    }
    isActive = true;
  } else if (input === '/') {
    // Display division as ÷
    if (currentValue === '0' || currentValue === 'Error' || currentValue === 'Infinity') {
      newValue = '0÷';
    } else if (currentValue.match(/[+\-×÷]$/)) {
      // Replace last operator with ÷
      newValue = currentValue.slice(0, -1) + '÷';
    } else {
      newValue = currentValue + '÷';
    }
    isActive = true;
  } else if (input === '+') {
    if (currentValue === '0' || currentValue === 'Error' || currentValue === 'Infinity') {
      newValue = '0+';
    } else if (currentValue.match(/[+\-×÷]$/)) {
      // Replace last operator with +
      newValue = currentValue.slice(0, -1) + '+';
    } else {
      newValue = currentValue + '+';
    }
    isActive = true;
  } else if (input === '-') {
    if (currentValue === '0' || currentValue === 'Error' || currentValue === 'Infinity') {
      newValue = '0-';
    } else if (currentValue.match(/[+\-×÷]$/)) {
      // Replace last operator with -
      newValue = currentValue.slice(0, -1) + '-';
    } else {
      newValue = currentValue + '-';
    }
    isActive = true;
  } else {
    // Handle numbers and decimal point
    if ((currentValue === '0' || currentValue === 'Error' || currentValue === 'Infinity') && !isNaN(Number(input))) {
      // Clear error/infinity state when typing new number
      newValue = input;
    } else {
      newValue = currentValue + input;
    }
    isActive = true;
  }

  return { value: newValue, memory: newMemory, isActive };
};