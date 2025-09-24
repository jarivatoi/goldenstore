/**
 * KEYPAD HANDLER MODULE
 * ====================
 * 
 * Handles all keypad input processing, validation, and state management
 * Provides a clean interface between user input and mathematical operations
 */

export interface KeypadState {
  display: string;
  memory: number;
  grandTotal: number;
  lastOperation: string | null;
  lastOperand: number | null;
  isNewNumber: boolean;
  isError: boolean;
  articleCount: number;
  transactionHistory: number[];
  calculationSteps: CalculationStep[];
  autoReplayActive: boolean;
  nextOperatorContext?: string; // Track the operator context for compound operations
  isMarkupMode: boolean; // Track if MU is in active mode
}

export interface CalculationStep {
  expression: string;
  result: number;
  timestamp: number;
  stepNumber: number;
  operationType: 'number' | 'operation' | 'result';
  displayValue: string;
  isComplete: boolean;
  operator?: string;
}

export interface KeypadInputResult {
  state: KeypadState;
  isActive: boolean;
}

export class KeypadHandler {
  private static readonly SPECIAL_FUNCTIONS = [
    'ON/C', 'AC', 'C', 'CE', '→', 'MU', 'MRC', 'M-', 'M+', 'GT', 
    'AUTO', 'CHECK→', 'CHECK←', '%', '√', 'LINK', '+/-'
  ];

  private static readonly OPERATORS = ['+', '-', '*', '/', '×', '÷'];
  private static readonly NUMBERS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '000'];

  /**
   * Initialize default calculator state
   */
  public static initializeState(): KeypadState {
    return {
      display: '0', 
      memory: 0,
      grandTotal: 0,
      lastOperation: null,
      lastOperand: null,
      isNewNumber: true,
      isError: false,
      articleCount: 0,
      transactionHistory: [],
      calculationSteps: [],
      autoReplayActive: false,
      nextOperatorContext: '+',
      isMarkupMode: false
    };
  }

  /**
   * Validate input and determine input type
   */
  public static validateInput(input: string): {
    isValid: boolean;
    type: 'number' | 'operator' | 'decimal' | 'special' | 'equals';
    error?: string;
  } {
    if (!input || typeof input !== 'string') {
      return { isValid: false, type: 'special', error: 'Invalid input' };
    }

    if (this.NUMBERS.includes(input)) {
      return { isValid: true, type: 'number' };
    }

    if (this.OPERATORS.includes(input)) {
      return { isValid: true, type: 'operator' };
    }

    if (input === '.') {
      return { isValid: true, type: 'decimal' };
    }

    if (input === '=' || input === 'ENTER') {
      return { isValid: true, type: 'equals' };
    }

    if (this.SPECIAL_FUNCTIONS.includes(input)) {
      return { isValid: true, type: 'special' };
    }

    return { isValid: false, type: 'special', error: 'Unknown input' };
  }

  /**
   * Process keypad input and return new state
   */
  public static processInput(
    currentState: KeypadState,
    input: string
  ): KeypadInputResult {
    const validation = this.validateInput(input);
    
    if (!validation.isValid) {
      return {
        state: { ...currentState, isError: true, display: 'Error' },
        isActive: true
      };
    }

    // Handle error state recovery
    if (currentState.isError && !['ON/C', 'AC', 'C'].includes(input)) {
      return {
        state: currentState,
        isActive: true
      };
    }

    let newState = { ...currentState };
    let isActive = true;

    switch (validation.type) {
      case 'number':
        newState = this.handleNumberInput(newState, input);
        break;
      
      case 'decimal':
        newState = this.handleDecimalInput(newState);
        break;
      
      case 'operator':
        newState = this.handleOperatorInput(newState, input);
        break;
      
      case 'equals':
        newState = this.handleEqualsInput(newState);
        break;
      
      case 'special':
        const specialResult = this.handleSpecialFunction(newState, input);
        newState = specialResult.state;
        isActive = specialResult.isActive;
        break;
    }

    // Format display value
    newState.display = this.formatDisplayValue(newState.display, input);

    return { state: newState, isActive };
  }

  /**
   * Handle numeric input (0-9, 00, 000) with article counter logic
   */
  private static handleNumberInput(state: KeypadState, input: string): KeypadState {
    let newArticleCount = state.articleCount;
    let newCalculationSteps = [...state.calculationSteps];
    
    if (state.isNewNumber || state.display === '0') {
      // Handle first number or new number after operator
      if (newCalculationSteps.length === 0) {
        // First number: set article count to 1, but DON'T create step yet
        // Wait until we have the complete number (when operator is pressed)
        // Only increment counter if this is not zero AND it's not part of a compound operation
        // For compound operations, we don't increment the article count until the operation is complete
        const isPendingCompoundOperation = state.lastOperation === '*' || state.lastOperation === '/' || state.lastOperation === '%';
        if (input !== '0' && !isPendingCompoundOperation) {
          newArticleCount = 1;
        }
      } else if (state.lastOperation && state.isNewNumber) {
        // After operator, increment counter only for + and - (not × or ÷)
        // But only if the input is not zero
        if ((state.lastOperation === '+' || state.lastOperation === '-') && input !== '0') {
          newArticleCount++;
        }
      } else if (!state.lastOperation && state.isNewNumber && newCalculationSteps.length > 0) {
        // After completing a compound operation, increment counter when entering a new number
        // Check if the last step is an operation (meaning we just completed a compound operation)
        const lastStep = newCalculationSteps[newCalculationSteps.length - 1];
        if (lastStep.operationType === 'operation' && input !== '0') {
          newArticleCount++;
        }
    }
    
    return {
      ...state,
      display: input,
      isNewNumber: false,
      isError: false,
      articleCount: newArticleCount,
      calculationSteps: newCalculationSteps
    };
  }

  // Building multi-digit number - just append to display, don't create steps
  const newDisplay = state.display + input;
  
  return {
    ...state,
    display: newDisplay,
    isError: false
  };
  }

  /**
   * Handle decimal point input
   */
  private static handleDecimalInput(state: KeypadState): KeypadState {
    if (state.display.includes('.')) {
      return state; // Already has decimal point
    }

    if (state.isNewNumber || state.display === '0') {
      return {
        ...state,
        display: '0.',
        isNewNumber: false,
        isError: false
      };
    }

    return {
      ...state,
      display: state.display + '.',
      isError: false
    };
  }

  /**
   * Handle operator input with proper order of operations, step tracking, and article counter
   * Creates steps exactly as: Step1->10, Step2->+(5×3)=15, Step3->+5, Step4->-(5×3)=15
   */
  private static handleOperatorInput(state: KeypadState, input: string): KeypadState {
    const currentNumber = this.getCurrentNumber(state.display);
    
    // Normalize operator symbols
    const normalizedOperator = input === '×' ? '*' : input === '÷' ? '/' : input;
    
    let newCalculationSteps = [...state.calculationSteps];
    let newArticleCount = state.articleCount;
    
    console.log('🎬 handleOperatorInput:', { input, normalizedOperator, currentNumber, state });
    
    // Special case: Handle pending percentage operation (200×10%+)
    if (state.lastOperation === 'PERCENT' && state.lastOperand !== null) {
      // This is a chained percentage operation like 200×10%+
      // Create 2 steps: initial number and compound operation
      // Always create steps, even if the numbers are zero
      
      // Step 1: Initial number (200)
      const initialStep: CalculationStep = {
        expression: state.lastOperand.toString(),
        result: state.lastOperand,
        timestamp: Date.now(),
        stepNumber: 1,
        operationType: 'number',
        displayValue: state.lastOperand.toString(),
        isComplete: true
      };
      newCalculationSteps.push(initialStep);
      
      // Step 2: Percentage compound operation (+(200×10%)=20)
      const percentResult = currentNumber;
      const percentStep: CalculationStep = {
        expression: `+(${state.lastOperand}×%)`,
        result: percentResult,
        timestamp: Date.now(),
        stepNumber: newCalculationSteps.length + 1,
        operationType: 'operation',
        displayValue: `+(${state.lastOperand}×${percentResult/state.lastOperand*100}%)=${percentResult}`,
        isComplete: true,
        operator: '+'
      };
      newCalculationSteps.push(percentStep);
      newArticleCount = newCalculationSteps.length;
      
      return {
        ...state,
        lastOperation: normalizedOperator,
        lastOperand: null,
        isNewNumber: true,
        isError: false,
        calculationSteps: newCalculationSteps,
        nextOperatorContext: normalizedOperator,
        articleCount: newArticleCount
      };
    }
    
    // If this is the very first operation, add the current number as Step 1
    // But only if the current number is not zero AND it's not a compound operation
    // For compound operations, we wait until the operation is complete
    const isCompoundOperation = (normalizedOperator === '*' || normalizedOperator === '/' || normalizedOperator === '%');
    if (!isCompoundOperation && newCalculationSteps.length === 0) {
      // Always create a step for the first number, even if it's zero
      const firstStep = {
        expression: currentNumber.toString(),
        result: currentNumber,
        timestamp: Date.now(),
        stepNumber: 1,
        operationType: 'number' as const,
        displayValue: currentNumber.toString(), // This will be "10" not "1"
        isComplete: true
      };
      newCalculationSteps.push(firstStep);
      newArticleCount = 1;
    }
    
    // Handle multiplication/division as compound operations
    if (normalizedOperator === '*' || normalizedOperator === '/' || normalizedOperator === '%') {
      console.log('🎬 Handling compound operation:', { normalizedOperator, currentNumber, lastOperand: state.lastOperand });
      
      // Check if we're pressing the same operator repeatedly
      // If so, don't perform any calculation, just update the operator
      if (state.lastOperation === normalizedOperator && state.isNewNumber) {
        // Repeated operator press - just update the operator
        console.log('🎬 Repeated operator detected, updating operator only');
        return {
          ...state,
          lastOperation: normalizedOperator,
          lastOperand: currentNumber,
          isNewNumber: true,
          isError: false,
          calculationSteps: newCalculationSteps,
          articleCount: newArticleCount
        };
      }
      
      // Special handling for when we have a percentage and then press multiplication
      // For example: 10% × 100 should calculate 10% of 100
      if (state.lastOperation === '%' && state.lastOperand !== null) {
        // We had a percentage operation, now we're multiplying
        // The lastOperand contains the percentage value divided by 100
        // We need to multiply this by the current number
        const percentValue = state.lastOperand * 100; // Convert back to percentage
        const result = state.lastOperand * currentNumber; // Calculate percentage of current number
        
        // Create a calculation step to show what happened
        const percentStep: CalculationStep = {
          expression: `(${percentValue}%)`,
          result: result,
          timestamp: Date.now(),
          stepNumber: newCalculationSteps.length + 1,
          operationType: 'operation',
          displayValue: `(${percentValue}% of ${currentNumber})=${result}`,
          isComplete: true,
          operator: '*'
        };
        
        newCalculationSteps.push(percentStep);
        newArticleCount = newCalculationSteps.length;
        
        return {
          ...state,
          display: result.toString(),
          lastOperation: normalizedOperator,
          lastOperand: result,
          isNewNumber: true,
          isError: false,
          calculationSteps: newCalculationSteps,
          articleCount: newArticleCount
        };
      }
      
      // Handle transition from addition/subtraction to multiplication/division
      // If we have a pending addition/subtraction operation, we need to create the initial step
      // and store the context for the compound operation
      if (state.lastOperation && (state.lastOperation === '+' || state.lastOperation === '-')) {
        // Check if we have any calculation steps yet - if not, we're just changing operators
        if (newCalculationSteps.length === 0) {
          // We're just changing operators without completing an operation
          // Don't create a step yet, just update the operator
          return {
            ...state,
            lastOperation: normalizedOperator,
            lastOperand: currentNumber, // Store the current number as operand for next operation
            isNewNumber: true,
            isError: false,
            calculationSteps: newCalculationSteps,
            nextOperatorContext: state.lastOperation, // Store the previous operator as context
            articleCount: newArticleCount
          };
        } else {
          // Create the initial step for the first number if we haven't already
          if (newCalculationSteps.length === 0) {
            // Get the first number from the state
            const firstNumber = state.lastOperand !== null ? state.lastOperand : this.getCurrentNumber(state.display);
            // Always create a step for the first number, even if it's zero
            const firstStep: CalculationStep = {
              expression: firstNumber.toString(),
              result: firstNumber,
              timestamp: Date.now(),
              stepNumber: 1,
              operationType: 'number',
              displayValue: firstNumber.toString(),
              isComplete: true
            };
            newCalculationSteps.push(firstStep);
            newArticleCount = 1;
          }
          
          // Store the context and prepare for the compound operation
          return {
            ...state,
            lastOperation: normalizedOperator,
            lastOperand: currentNumber, // Store the current number as operand for next operation
            isNewNumber: true,
            isError: false,
            calculationSteps: newCalculationSteps,
            nextOperatorContext: state.lastOperation, // Store the previous operator as context
            articleCount: newArticleCount
          };
        }
      }
      
      // Handle transition from one compound operation to another (e.g., * to /)
      // If we have a pending compound operation, we're just changing operators
      if (state.lastOperation && (state.lastOperation === '*' || state.lastOperation === '/' || state.lastOperation === '%')) {
        // Check if we have any calculation steps yet - if not, we're just changing operators
        if (newCalculationSteps.length === 0) {
          // We're just changing operators without completing an operation
          // Don't create a step yet, just update the operator
          return {
            ...state,
            lastOperation: normalizedOperator,
            lastOperand: currentNumber,
            isNewNumber: true,
            isError: false,
            calculationSteps: newCalculationSteps,
            articleCount: newArticleCount
          };
        }
      }
      
      // We need to wait for the next number to complete the compound operation
      // For standalone compound operations, we don't create a step for the first number yet
      // We'll create both steps together when the user presses equals
      if (newCalculationSteps.length === 0) {
        // Don't create a step for the first number in standalone compound operations
        // We'll create both steps together in handleEqualsInput
        // Keep the article count from the previous state to maintain visibility during compound operations
        newArticleCount = state.articleCount; // Preserve article count instead of setting to 0
      }
      return {
        ...state,
        lastOperation: normalizedOperator,
        lastOperand: currentNumber,
        isNewNumber: true,
        isError: false,
        calculationSteps: newCalculationSteps,
        articleCount: newArticleCount
      };
    }
    
    // Handle addition/subtraction
    if (normalizedOperator === '+' || normalizedOperator === '-') {
      console.log('🎬 Handling addition/subtraction:', { normalizedOperator, currentNumber });
      
      // Check if we're pressing the same operator repeatedly
      // If so, don't perform any calculation, just update the operator
      if (state.lastOperation === normalizedOperator && state.isNewNumber) {
        // Repeated operator press - just update the operator
        console.log('🎬 Repeated operator detected, updating operator only');
        return {
          ...state,
          lastOperation: normalizedOperator,
          isNewNumber: true,
          isError: false,
          calculationSteps: newCalculationSteps,
          nextOperatorContext: state.nextOperatorContext || normalizedOperator,
          articleCount: newArticleCount
        };
      }
      
      // Check if we're switching between + and - operators
      // If so, don't perform any calculation, just update the operator
      if ((state.lastOperation === '+' || state.lastOperation === '-') && 
          (normalizedOperator === '+' || normalizedOperator === '-') && 
          state.isNewNumber) {
        // Switching between + and - operators - just update the operator
        console.log('🎬 Switching between + and - operators, updating operator only');
        return {
          ...state,
          lastOperation: normalizedOperator,
          isNewNumber: true,
          isError: false,
          calculationSteps: newCalculationSteps,
          nextOperatorContext: state.nextOperatorContext || normalizedOperator,
          articleCount: newArticleCount
        };
      }
      
      // Check if we have a pending addition/subtraction operation that needs to be completed
      if (state.lastOperation && (state.lastOperation === '+' || state.lastOperation === '-')) {
        // Check if we have any calculation steps yet - if not, we're just changing operators
        if (newCalculationSteps.length === 0) {
          // We're just changing operators without completing an operation
          // Don't create a step yet, just update the operator
          return {
            ...state,
            lastOperation: normalizedOperator,
            isNewNumber: true,
            isError: false,
            calculationSteps: newCalculationSteps,
            nextOperatorContext: state.nextOperatorContext || normalizedOperator,
            articleCount: newArticleCount
          };
        } else {
          // We have existing steps, so complete the previous addition/subtraction operation
          const prevResult = this.performBasicOperation(
            state.lastOperand!,
            currentNumber,
            state.lastOperation
          );
          
          // Add step for the previous operation
          // Always add a step, even if currentNumber is zero
          const addSubStep: CalculationStep = {
            expression: `${state.lastOperation}${currentNumber}`,
            result: currentNumber,
            timestamp: Date.now(),
            stepNumber: newCalculationSteps.length + 1,
            operationType: 'number',
            displayValue: `${state.lastOperation}${currentNumber}`,
            isComplete: true,
            operator: state.lastOperation
          };
          
          newCalculationSteps.push(addSubStep);
          
          return {
            ...state,
            display: prevResult.toString(), // Show the result of the previous operation
            lastOperation: normalizedOperator,
            lastOperand: prevResult, // Store the result as the operand for the next operation
            isNewNumber: true,
            isError: false,
            calculationSteps: newCalculationSteps,
            nextOperatorContext: state.nextOperatorContext || normalizedOperator, // Preserve existing context or use new operator
            articleCount: newCalculationSteps.length // Set article count to match number of steps
          };
        }
      }
      
      // Check if we have a pending multiplication/division operation
      if (state.lastOperation && (state.lastOperation === '*' || state.lastOperation === '/' || state.lastOperation === '%')) {
        // Check if we have any calculation steps yet - if not, we're just changing operators
        if (newCalculationSteps.length === 0) {
          // We're just changing operators without completing an operation
          // Don't create a step yet, just update the operator
          return {
            ...state,
            lastOperation: normalizedOperator,
            isNewNumber: true,
            isError: false,
            calculationSteps: newCalculationSteps,
            nextOperatorContext: state.nextOperatorContext || normalizedOperator,
            articleCount: newArticleCount
          };
        } else {
          console.log('🎬 Completing pending compound operation');
          
          // Complete the compound operation and add it as a step
          const compoundResult = this.performBasicOperation(
            state.lastOperand!,
            currentNumber,
            state.lastOperation
          );
          
          // Use the stored operator context for the compound step
          // For standalone operations (no previous context), don't add operator sign
          const operatorContext = (state.calculationSteps.length > 0) ? (state.nextOperatorContext || '+') : '';
          
          // Add compound step like "(5×3)=15" for standalone or "+(5×3)=15" when part of a sequence
          // Always add the step, even if the compound result is zero
          const compoundStep: CalculationStep = {
            expression: `${operatorContext}(${state.lastOperand}${this.getOperatorSymbol(state.lastOperation)}${currentNumber})`,
            result: compoundResult,
            timestamp: Date.now(),
            stepNumber: newCalculationSteps.length + 1,
            operationType: 'operation',
            displayValue: `${operatorContext}(${state.lastOperand}${this.getOperatorSymbol(state.lastOperation)}${currentNumber})=${compoundResult}`,
            isComplete: true,
            operator: state.lastOperation // Use the actual operator instead of hardcoding '+'
          };
          
          // For standalone operations, don't include the operator sign in the display
          if (!operatorContext) {
            compoundStep.displayValue = `(${state.lastOperand}${this.getOperatorSymbol(state.lastOperation)}${currentNumber})=${compoundResult}`;
          }
          
          console.log('🎬 Created compound step:', compoundStep);
          
          newCalculationSteps.push(compoundStep);
          newArticleCount = newCalculationSteps.length; // Set article count to number of steps
          
          // Evaluate the full expression to get the correct display value
          let displayValue = compoundResult.toString();
          if (state.calculationSteps.length > 0) {
            // We have previous steps, so evaluate the full expression
            const allSteps = [...state.calculationSteps, compoundStep];
            displayValue = this.evaluateAllSteps(allSteps).toString();
          }
          
          return {
            ...state,
            display: displayValue, // Show the result of the full expression evaluation
            lastOperation: state.nextOperatorContext || normalizedOperator, // Set to the operator that completed the compound operation
            lastOperand: this.evaluateAllSteps([...state.calculationSteps, compoundStep]), // Store the full evaluated result
            isNewNumber: true,
            isError: false,
            calculationSteps: newCalculationSteps,
            nextOperatorContext: state.nextOperatorContext || normalizedOperator, // Preserve existing context or use new operator
            articleCount: newArticleCount // Use the updated article count
          };
        }
      } else {
        // Handle the case where we have existing steps but no pending operation
        // This happens after completing a compound operation in a sequence
        // We can detect this by checking if we have steps and the last step is an operation
        if (!state.lastOperation && newCalculationSteps.length > 0 && 
            newCalculationSteps[newCalculationSteps.length - 1].operationType === 'operation') {
          // Create a step for the current operation
          const addSubStep: CalculationStep = {
            expression: `${normalizedOperator}${currentNumber}`,
            result: currentNumber,
            timestamp: Date.now(),
            stepNumber: newCalculationSteps.length + 1,
            operationType: 'number',
            displayValue: `${normalizedOperator}${currentNumber}`,
            isComplete: true,
            operator: normalizedOperator
          };
          
          newCalculationSteps.push(addSubStep);
          
          // Calculate and display the result of the full expression
          const result = this.evaluateAllSteps([...newCalculationSteps]);
          const displayValue = result.toString(); // Declare displayValue here
          
          return {
            ...state,
            display: displayValue, // Show the result of the full expression evaluation
            lastOperation: normalizedOperator,
            lastOperand: currentNumber, // Store the current number as operand for next operation
            isNewNumber: true,
            isError: false,
            calculationSteps: newCalculationSteps,
            nextOperatorContext: state.nextOperatorContext || normalizedOperator, // Preserve existing context or use new operator
            articleCount: newCalculationSteps.length // Set article count to match number of steps
          };
        }
        
        // Simple addition/subtraction - create steps for both the first number and the operation
        let displayValue = state.display; // Default to current display
        
        // Always create a step for the first number if we don't have any steps yet
        if (newCalculationSteps.length === 0) {
          // Get the first number from the state
          const firstNumber = state.lastOperand !== null ? state.lastOperand : this.getCurrentNumber(state.display);
          // Always create a step for the first number, even if it's zero
          const firstStep: CalculationStep = {
            expression: firstNumber.toString(),
            result: firstNumber,
            timestamp: Date.now(),
            stepNumber: 1,
            operationType: 'number',
            displayValue: firstNumber.toString(),
            isComplete: true
          };
          newCalculationSteps.push(firstStep);
          newArticleCount = 1;
        }
        
        // Create a step for the current operation if we have a previous operation
        if (state.lastOperation !== null) {
          // We have a previous operation, so create a step for it
          // Always create a step, even if currentNumber is zero
          const addSubStep: CalculationStep = {
            expression: `${state.lastOperation}${currentNumber}`,
            result: currentNumber,
            timestamp: Date.now(),
            stepNumber: newCalculationSteps.length + 1,
            operationType: 'number',
            displayValue: `${state.lastOperation}${currentNumber}`,
            isComplete: true,
            operator: state.lastOperation // This is critical: stores + or - to tell us how to apply this result
          };
          
          newCalculationSteps.push(addSubStep);
          
          // Calculate and display the result of the previous operation
          const result = this.performBasicOperation(
            state.lastOperand!,
            currentNumber,
            state.lastOperation
          );
          displayValue = result.toString();
        }
        
        return {
          ...state,
          display: displayValue, // Show the result of the operation
          lastOperation: normalizedOperator,
          lastOperand: currentNumber, // Store the current number as operand for next operation
          isNewNumber: true,
          isError: false,
          calculationSteps: newCalculationSteps,
          nextOperatorContext: state.nextOperatorContext || normalizedOperator, // Preserve existing context or use new operator
          articleCount: newArticleCount
        };
      }
    }
    
    // Default case
    return {
      ...state,
      lastOperation: normalizedOperator,
      lastOperand: currentNumber,
      isNewNumber: true,
      isError: false,
      calculationSteps: newCalculationSteps,
      articleCount: newArticleCount
    };
  }

  /**
   * Handle equals input - complete final operation, evaluate all steps, and update article count
   */
  private static handleEqualsInput(state: KeypadState): KeypadState {
    const currentNumber = this.getCurrentNumber(state.display);
    let newCalculationSteps = [...state.calculationSteps];
    let newArticleCount = state.articleCount;
    
    console.log('🎬 handleEqualsInput:', { currentNumber, state });
    
    // Special case: Handle pending percentage operation (200×10%=)
    if (state.lastOperation === 'PERCENT' && state.lastOperand !== null) {
      // This is a standalone percentage operation like 200×10%=
      // Create single step: (200×10%)=20
      // Only create step if the result is not zero
      const percentResult = currentNumber;
      if (percentResult !== 0) {
        const percentStep: CalculationStep = {
          expression: `(${state.lastOperand}×%)`,
          result: percentResult,
          timestamp: Date.now(),
          stepNumber: 1,
          operationType: 'operation',
          displayValue: `(${state.lastOperand}×${percentResult/state.lastOperand*100}%)=${percentResult}`,
          isComplete: true
        };
        
        newCalculationSteps = [percentStep];
        newArticleCount = 1;
      } else {
        newCalculationSteps = [];
        // Preserve article count to maintain visibility during percentage operations
        newArticleCount = state.articleCount; // Preserve article count instead of setting to 0
      }
      
      return {
        ...state,
        display: percentResult.toString(),
        grandTotal: state.grandTotal + percentResult,
        transactionHistory: [...state.transactionHistory, percentResult],
        calculationSteps: newCalculationSteps,
        lastOperation: null,
        lastOperand: null,
        isNewNumber: true,
        isError: false,
        articleCount: newArticleCount
      };
    }
    
    // Special case: Handle percentage calculation like "10%x100=" (which should be 10% of 100 = 10)
    if (state.lastOperation === '*' && state.lastOperand !== null) {
      // Check if we have a percentage in our calculation steps
      const hasPercentageStep = state.calculationSteps.some(step => 
        step.expression.includes('%')
      );
      
      if (hasPercentageStep) {
        // Find the percentage value from the steps
        const percentStep = state.calculationSteps.find(step => step.expression.includes('%'));
        if (percentStep) {
          // Extract the percentage value from the expression
          const percentMatch = percentStep.expression.match(/(\d+(?:\.\d+)?)%/);
          if (percentMatch) {
            const percentValue = parseFloat(percentMatch[1]);
            // Calculate: (percentValue/100) * currentNumber
            const percentResult = (percentValue / 100) * currentNumber;
            
            return {
              ...state,
              display: percentResult.toString(),
              grandTotal: state.grandTotal + percentResult,
              transactionHistory: [...state.transactionHistory, percentResult],
              calculationSteps: newCalculationSteps,
              lastOperation: null,
              lastOperand: null,
              isNewNumber: true,
              isError: false,
              articleCount: newArticleCount
            };
          }
        }
      }
    }
    
    // Regular equals handling
    if (!state.lastOperation || state.lastOperand === null) {
      console.log('🎬 No operation to complete');
      return state;
    }

    // Handle the final operation
    // First, ensure we have the initial number as a step if we don't have any steps yet
    // But only for addition/subtraction operations, not for standalone compound operations
    const isStandaloneCompoundOperation = (state.lastOperation === '*' || state.lastOperation === '/' || state.lastOperation === '%') && newCalculationSteps.length === 0;
    if (newCalculationSteps.length === 0 && !isStandaloneCompoundOperation) {
      // Get the first number from the state
      const firstNumber = state.lastOperand !== null ? state.lastOperand : this.getCurrentNumber(state.display);
      // Always create a step for the first number
      const firstStep: CalculationStep = {
        expression: firstNumber.toString(),
        result: firstNumber,
        timestamp: Date.now(),
        stepNumber: 1,
        operationType: 'number',
        displayValue: firstNumber.toString(),
        isComplete: true
      };
      newCalculationSteps.push(firstStep);
      newArticleCount = 1;
    }
    
    console.log('🎬 Processing final operation:', { lastOperation: state.lastOperation, lastOperand: state.lastOperand, currentNumber });
    
    if (state.lastOperation === '*' || state.lastOperation === '/' || state.lastOperation === '%') {
      // For multiplication/division operations, if isNewNumber is true, 
      // it means we haven't entered a second operand
      if (state.isNewNumber) {
        // If we have previous steps, disregard the pending operation entirely 
        // and just use the last operand as a standalone number
        // For example: "1+2/=" should be treated as "1+2=" giving 3
        //
        // If we don't have previous steps, use the default behavior for the operation
        // For example: "2x=" should be treated as "2×2=" giving 4
        if (newCalculationSteps.length > 0) {
          // Disregard the pending operation entirely and just use the last operand as a standalone number
          const finalStep: CalculationStep = {
            expression: state.lastOperand!.toString(),
            result: state.lastOperand!,
            timestamp: Date.now(),
            stepNumber: newCalculationSteps.length + 1,
            operationType: 'number',
            displayValue: state.lastOperand!.toString(),
            isComplete: true
          };
          
          newCalculationSteps.push(finalStep);
          // Set article count to match number of steps
          newArticleCount = newCalculationSteps.length;
        } else {
          // No previous steps, use default behavior for the operation
          // For multiplication, use 1 as second operand (identity)
          // For division, use the lastOperand as second operand
          const secondOperand = (state.lastOperation === '*') ? 1 : 
                              (state.lastOperation === '/' && state.lastOperand) ? state.lastOperand : 
                              currentNumber;
          
          // Standalone compound operation
          const compoundResult = this.performBasicOperation(
            state.lastOperand,
            secondOperand,
            state.lastOperation
          );
          
          console.log('🎬 Compound operation result:', { compoundResult });
          
          // Add final compound step like "(2×2)=4" for standalone
          const finalCompoundStep: CalculationStep = {
            expression: `(${state.lastOperand}${this.getOperatorSymbol(state.lastOperation)}${secondOperand})`,
            result: compoundResult,
            timestamp: Date.now(),
            stepNumber: newCalculationSteps.length + 1,
            operationType: 'operation',
            displayValue: `(${state.lastOperand}${this.getOperatorSymbol(state.lastOperation)}${secondOperand})=${compoundResult}`,
            isComplete: true,
            operator: state.lastOperation
          };
          
          console.log('🎬 Created final compound step:', finalCompoundStep);
          
          newCalculationSteps.push(finalCompoundStep);
        }
      } else {
        // We have a second operand, so perform the operation normally
        const secondOperand = currentNumber;
        
        // Final compound operation - check if we have a previous addition/subtraction step
        if (newCalculationSteps.length > 0 && 
            newCalculationSteps[newCalculationSteps.length - 1].operationType === 'number' &&
            newCalculationSteps[newCalculationSteps.length - 1].operator) {
          // We have a previous addition/subtraction step that should be replaced with a compound operation
          // For example, in "1+2×3", we have step "+2" which should become "+(2×3)=6"
          const previousStep = newCalculationSteps[newCalculationSteps.length - 1];
          const operatorSign = previousStep.operator === '*' ? '×' : 
                              previousStep.operator === '/' ? '÷' : 
                              previousStep.operator || '+';
          
          const compoundResult = this.performBasicOperation(
            state.lastOperand,
            secondOperand,
            state.lastOperation
          );
          
          console.log('🎬 Compound operation result:', { compoundResult, operatorSign });
          
          // Replace the previous step with the compound operation
          const finalCompoundStep: CalculationStep = {
            expression: `${operatorSign}(${state.lastOperand}${this.getOperatorSymbol(state.lastOperation)}${secondOperand})`,
            result: compoundResult,
            timestamp: Date.now(),
            stepNumber: newCalculationSteps.length,
            operationType: 'operation',
            displayValue: `${operatorSign}(${state.lastOperand}${this.getOperatorSymbol(state.lastOperation)}${secondOperand})=${compoundResult}`,
            isComplete: true,
            operator: state.lastOperation
          };
          
          console.log('🎬 Created final compound step:', finalCompoundStep);
          
          newCalculationSteps[newCalculationSteps.length - 1] = finalCompoundStep;
        } else if (newCalculationSteps.length > 0) {
          // We have previous steps but the last one is not an addition/subtraction
          // This is a standalone compound operation that should be added as a new step
          const operatorSign = state.nextOperatorContext || '+';
          
          const compoundResult = this.performBasicOperation(
            state.lastOperand,
            secondOperand,
            state.lastOperation
          );
          
          console.log('🎬 Compound operation result:', { compoundResult, operatorSign });
          
          // Add final compound step like "+(2×3)=6" when part of a sequence
          const finalCompoundStep: CalculationStep = {
            expression: `${operatorSign}(${state.lastOperand}${this.getOperatorSymbol(state.lastOperation)}${secondOperand})`,
            result: compoundResult,
            timestamp: Date.now(),
            stepNumber: newCalculationSteps.length + 1,
            operationType: 'operation',
            displayValue: `${operatorSign}(${state.lastOperand}${this.getOperatorSymbol(state.lastOperation)}${secondOperand})=${compoundResult}`,
            isComplete: true,
            operator: state.lastOperation
          };
          
          console.log('🎬 Created final compound step:', finalCompoundStep);
          
          newCalculationSteps.push(finalCompoundStep);
        } else {
          // Standalone compound operation
          const compoundResult = this.performBasicOperation(
            state.lastOperand,
            secondOperand,
            state.lastOperation
          );
          
          console.log('🎬 Compound operation result:', { compoundResult });
          
          // Add final compound step like "(2×3)=6" for standalone
          const finalCompoundStep: CalculationStep = {
            expression: `(${state.lastOperand}${this.getOperatorSymbol(state.lastOperation)}${secondOperand})`,
            result: compoundResult,
            timestamp: Date.now(),
            stepNumber: newCalculationSteps.length + 1,
            operationType: 'operation',
            displayValue: `(${state.lastOperand}${this.getOperatorSymbol(state.lastOperation)}${secondOperand})=${compoundResult}`,
            isComplete: true,
            operator: state.lastOperation
          };
          
          console.log('🎬 Created final compound step:', finalCompoundStep);
          
          newCalculationSteps.push(finalCompoundStep);
        }
      }
    } else {
      // Final addition/subtraction
      // Always create a step, even if the current number is zero
      const finalStep: CalculationStep = {
        expression: `${state.lastOperation}${currentNumber}`,
        result: currentNumber,
        timestamp: Date.now(),
        stepNumber: newCalculationSteps.length + 1,
        operationType: 'number',
        displayValue: `${state.lastOperation}${currentNumber}`,
        isComplete: true,
        operator: state.lastOperation // This is critical: stores + or - to tell us how to apply this result
      };
      
      newCalculationSteps.push(finalStep);
      // Set article count to match number of steps
      newArticleCount = newCalculationSteps.length;
    }

    // Calculate final result
    // For compound calculations, if we have a single compound step, use its result directly
    // Otherwise, evaluate all steps (for mixed operations like 10+5×3)
    let finalResult: number;

    // Check if we have a sequence that starts with a number followed by operations
    const hasInitialNumber = newCalculationSteps.length > 0 && 
      newCalculationSteps[0].operationType === 'number';

    // For continuous equals operations, we need special handling
    const isContinuousOperation = state.lastOperation && state.isNewNumber;

    if (isContinuousOperation && hasInitialNumber) {
      // This is a continuous operation, we need to use the correct operand
      // For operations like "2+3=", we want to use 3 (the second operand) for subsequent operations
      
      // Try to extract the second operand from the calculation steps
      let operandToUse = state.lastOperand !== null ? state.lastOperand : currentNumber;
      
      // For simple operations like "2+3=", we should have two steps:
      // Step 1: the first number (2)
      // Step 2: the operation with the second number (+3)
      if (newCalculationSteps.length >= 2) {
        const secondStep = newCalculationSteps[1];
        if (secondStep.operationType === 'number' && secondStep.operator) {
          // The result field in the second step contains the second operand
          operandToUse = secondStep.result;
        }
      }
      
      // For continuous operations, we want to apply the operation with the correct operand
      switch (state.lastOperation) {
        case '+':
          finalResult = currentNumber + operandToUse;
          break;
        case '-':
          finalResult = currentNumber - operandToUse;
          break;
        case '*':
        case '×':
          finalResult = currentNumber * operandToUse;
          break;
        case '/':
        case '÷':
          finalResult = operandToUse !== 0 ? currentNumber / operandToUse : 0;
          break;
        default:
          // Fallback to normal evaluation
          if (hasInitialNumber && newCalculationSteps.length > 1) {
            // Mixed operations like "10+5×3" - evaluate all steps
            finalResult = this.evaluateAllSteps(newCalculationSteps);
          } else if (newCalculationSteps.length === 1 && 
              newCalculationSteps[0].operationType === 'operation' && 
              newCalculationSteps[0].displayValue.includes('(') && 
              newCalculationSteps[0].displayValue.includes('=')) {
            // Direct single compound operation like "(2×3)=6"
            finalResult = newCalculationSteps[0].result;
          } else if (newCalculationSteps.length > 1) {
            // Other mixed operations - evaluate all steps
            finalResult = this.evaluateAllSteps(newCalculationSteps);
          } else if (newCalculationSteps.length === 1) {
            // Single step - use its result
            finalResult = newCalculationSteps[0].result;
          } else {
            // Fallback - use current number
            finalResult = currentNumber;
          }
      }
    } else {
      // Normal operation evaluation
      if (hasInitialNumber && newCalculationSteps.length > 1) {
        // Mixed operations like "10+5×3" - evaluate all steps
        finalResult = this.evaluateAllSteps(newCalculationSteps);
      } else if (newCalculationSteps.length === 1 && 
          newCalculationSteps[0].operationType === 'operation' && 
          newCalculationSteps[0].displayValue.includes('(') && 
          newCalculationSteps[0].displayValue.includes('=')) {
        // Direct single compound operation like "(2×3)=6"
        finalResult = newCalculationSteps[0].result;
      } else if (newCalculationSteps.length > 1) {
        // Other mixed operations - evaluate all steps
        finalResult = this.evaluateAllSteps(newCalculationSteps);
      } else if (newCalculationSteps.length === 1) {
        // Single step - use its result
        finalResult = newCalculationSteps[0].result;
      } else {
        // Fallback - use current number
        finalResult = currentNumber;
      }
    }

    console.log('🎬 Final result:', { finalResult, steps: newCalculationSteps });

    // For continuous equals operations (like 2+==== or 2x====), we need to preserve the last operation
    // and properly handle the operands for subsequent operations
    const shouldPreserveOperation = state.lastOperation === '+' || state.lastOperation === '-' || 
                       state.lastOperation === '*' || state.lastOperation === '/' ||
                       state.lastOperation === '×' || state.lastOperation === '÷';

    return {
      ...state,
      display: finalResult.toString(),
      grandTotal: state.grandTotal + finalResult,
      transactionHistory: [...state.transactionHistory, finalResult],
      calculationSteps: newCalculationSteps,
      lastOperation: shouldPreserveOperation ? state.lastOperation : null,
      lastOperand: shouldPreserveOperation ? state.lastOperand : null, // Preserve the original operand for continuous operations
      isNewNumber: true,
      isError: false,
      articleCount: newCalculationSteps.length // Set final article count to total steps
    };
  }

  /**
   * Handle special functions (memory, clear, etc.)
   */
  private static handleSpecialFunction(
    state: KeypadState,
    input: string
  ): { state: KeypadState; isActive: boolean } {
    const currentNumber = this.getCurrentNumber(state.display);

    switch (input) {
      case 'ON/C':
      case 'AC':
      case 'C':
        return {
          state: this.initializeState(),
          isActive: false
        };

      case 'CE':
        return {
          state: { ...state, display: '0', isNewNumber: true },
          isActive: true
        };

      case '+/-':
        // Change sign of current number
        const currentNum = this.getCurrentNumber(state.display);
        const newDisplay = currentNum === 0 ? '0' : (-currentNum).toString();
        return {
          state: { ...state, display: newDisplay, isNewNumber: false },
          isActive: true
        };

      case '→':
        return {
          state: {
            ...state,
            display: state.display.length > 1 ? state.display.slice(0, -1) : '0',
            isNewNumber: state.display.length <= 1
          },
          isActive: true
        };

      case 'MU':
        // Mark Up button functionality - store base value in memory and enter markup mode
        return {
          state: {
            ...state,
            memory: currentNumber,
            isMarkupMode: true, // Enter markup mode
            isNewNumber: true
          },
          isActive: true
        };

      case 'M+':
        return {
          state: { ...state, memory: state.memory + currentNumber },
          isActive: true
        };

      case 'M-':
        return {
          state: { ...state, memory: state.memory - currentNumber },
          isActive: true
        };

      case 'MRC':
        if (state.memory === 0) {
          return { state, isActive: true };
        }
        if (state.display === state.memory.toString()) {
          return {
            state: { ...state, memory: 0 },
            isActive: true
          };
        }
        return {
          state: { ...state, display: state.memory.toString(), isNewNumber: true },
          isActive: true
        };

      case 'GT':
        return {
          state: { ...state, display: state.grandTotal.toString(), isNewNumber: true },
          isActive: true
        };

      case '%':
        // Check if we're in markup mode - if so, calculate selling price
        if (state.isMarkupMode && state.memory !== 0) {
          // Get the percentage value from display (e.g., "60" for 60%)
          const percentValue = this.getCurrentNumber(state.display);
          
          // Calculate selling price based on cost and desired margin percentage
          // Selling Price = Cost / (1 - Margin)
          const cost = state.memory;
          const marginPercent = percentValue / 100; // Convert percentage to decimal
          
          // Ensure margin is less than 100% to avoid division by zero
          if (marginPercent >= 1) {
            return {
              state: {
                ...state,
                display: 'Error',
                isError: true,
                isMarkupMode: false,
                isNewNumber: true
              },
              isActive: true
            };
          }
          
          const sellingPrice = cost / (1 - marginPercent);
          
          return {
            state: {
              ...state,
              display: `=${Math.round(sellingPrice * 100) / 100}`, // Round to 2 decimal places and show result with = prefix
              memory: 0, // Clear memory after use
              isMarkupMode: false, // Exit markup mode
              isNewNumber: true
            },
            isActive: true
          };
        }
        
        // Enhanced percentage function - calculate and display result immediately
        if (state.lastOperation && state.lastOperand !== null) {
          let percentResult: number;
          let newCalculationSteps = [...state.calculationSteps];
          let newArticleCount = state.articleCount;
          
          // Get the percentage value from display (e.g., "10" for 10%)
          const percentValue = this.getCurrentNumber(state.display);
          
          if (state.lastOperation === '+' || state.lastOperation === '-') {
            // For addition/subtraction: X + Y% = X + (X * Y/100), X - Y% = X - (X * Y/100)

            const percentAmount = state.lastOperand * (percentValue / 100);
            if (state.lastOperation === '+') {
              percentResult = state.lastOperand + percentAmount;
            } else {
              percentResult = state.lastOperand - percentAmount;
            }
            
            // Create steps immediately for addition/subtraction percentages
            // Step 1: Initial number (if not already created)
            if (newCalculationSteps.length === 0) {
              const initialStep: CalculationStep = {
                expression: state.lastOperand.toString(),
                result: state.lastOperand,
                timestamp: Date.now(),
                stepNumber: 1,
                operationType: 'number',
                displayValue: state.lastOperand.toString(),
                isComplete: true
              };
              newCalculationSteps.push(initialStep);
              newArticleCount = 1;
            }
            
            // Step 2: Percentage operation
            const percentStep: CalculationStep = {
              expression: `${state.lastOperation}${percentValue}%`,
              result: percentAmount, // Store the percentage amount, not the final result
              timestamp: Date.now(),
              stepNumber: newCalculationSteps.length + 1,
              operationType: 'operation',
              displayValue: `${state.lastOperation}${percentValue}%=${percentResult}`,
              isComplete: true,
              operator: state.lastOperation
            };
            newCalculationSteps.push(percentStep);
            newArticleCount = newCalculationSteps.length;
            
            return {
              state: { 
                ...state,
                display: `=${percentResult}`, // Show result with = prefix
                lastOperation: null,
                lastOperand: null,
                isNewNumber: true,
                calculationSteps: newCalculationSteps,
                articleCount: newArticleCount,
                grandTotal: state.grandTotal + percentResult,
                transactionHistory: [...state.transactionHistory, percentResult]
              },
              isActive: true
            };
          } else if (state.lastOperation === '*') {
            // For multiplication: X × Y% = X * (Y/100)
            percentResult = state.lastOperand * (percentValue / 100);
          } else if (state.lastOperation === '/') {
            // For division: X ÷ Y% = X / (Y/100)
            percentResult = percentValue !== 0 ? state.lastOperand / (percentValue / 100) : 0;
          } else {
            // Fallback: just convert to percentage
            percentResult = percentValue / 100;
          }
          
          // For multiplication/division, still use the delayed approach
          return {
            state: { 
              ...state,
              display: percentResult.toString(), 
              lastOperation: 'PERCENT',
              lastOperand: state.lastOperand,
              isNewNumber: true,
              nextOperatorContext: state.nextOperatorContext
            },
            isActive: true
          };
        } else {
          // Simple percentage: convert number to percentage (divide by 100)
          const percentResult = currentNumber / 100;
          return {
            state: { ...state, display: percentResult.toString(), isNewNumber: true },
            isActive: true
          };
        }

      case '√':
        if (currentNumber < 0) {
          return {
            state: { ...state, display: 'Error', isError: true },
            isActive: true
          };
        }
        return {
          state: { ...state, display: Math.sqrt(currentNumber).toString(), isNewNumber: true },
          isActive: true
        };

      case 'AUTO':
        // AUTO REPLAY - replay calculation steps
        console.log('🎬 AUTO button pressed, steps count:', state.calculationSteps.length, state.calculationSteps);
        if (state.calculationSteps.length > 0) {
          const autoReplayResult = this.startAutoReplay(state);
          return {
            state: autoReplayResult,
            isActive: true
          };
        }
        return { state, isActive: true };

      case 'CHECK→':
        // Check forward - cycle through steps
        if (state.calculationSteps.length > 0) {
          const checkResult = this.handleCheckForward(state);
          return {
            state: checkResult,
            isActive: true
          };
        }
        return { state, isActive: true };

      case 'CHECK←':
        // Check backward - cycle through steps
        if (state.calculationSteps.length > 0) {
          const checkResult = this.handleCheckBackward(state);
          return {
            state: checkResult,
            isActive: true
          };
        }
        return { state, isActive: true };

      default:
        return { state, isActive: true };
    }
  }

  /**
   * Evaluate all calculation steps to get final result
   * Properly handles compound operations like +(5×3)=15 and +(2×3)=6
   * For 10+5×3+2×3: Step1=10, Step2=+(5×3)=15, Step3=+(2×3)=6 → 10+15+6=31
   * For standalone percentage: (200×10%)=20 → 20
   */
  private static evaluateAllSteps(steps: CalculationStep[]): number {
    if (steps.length === 0) return 0;
    
    // Special case: standalone operation like (200×10%)=20
    if (steps.length === 1 && steps[0].operationType === 'operation' && steps[0].displayValue.includes('(')) {
      return steps[0].result;
    }
    
    // Start with the first number (Step 1: "10" or "200" or "1")
    let result = steps[0].result;
    
    // Process each subsequent step
    for (let i = 1; i < steps.length; i++) {
      const step = steps[i];
      
      // For compound operations like "+(5×3)=15", we need to look at the displayValue to determine the operator
      // The displayValue contains the operator that should be used to combine with the previous result
      if (step.operationType === 'operation' && step.displayValue.includes('(')) {
        // Extract the operator from the beginning of the displayValue
        const displayValue = step.displayValue;
        if (displayValue.startsWith('+')) {
          result += step.result;
        } else if (displayValue.startsWith('-')) {
          result -= step.result;
        } else if (displayValue.startsWith('*') || displayValue.startsWith('×')) {
          result *= step.result;
        } else if (displayValue.startsWith('/') || displayValue.startsWith('÷')) {
          result = step.result !== 0 ? result / step.result : 0;
        } else {
          // If no operator at the beginning, assume addition (fallback)
          result += step.result;
        }
      } else if (step.operator) {
        // Handle any operator that might be stored directly in the step
        switch (step.operator) {
          case '+':
            result += step.result;
            break;
          case '-':
            result -= step.result;
            break;
          case '*':
          case '×':
            result *= step.result;
            break;
          case '/':
          case '÷':
            result = step.result !== 0 ? result / step.result : 0;
            break;
          default:
            // If unknown operator, assume addition (fallback)
            result += step.result;
        }
      } else {
        // If no operator specified, assume addition (fallback)
        result += step.result;
      }
    }

    return result;
  }

  /**
   * Get display symbol for operator
   */
  private static getOperatorSymbol(operation: string): string {
    switch (operation) {
      case '*': return '×';
      case '/': return '÷';
      default: return operation;
    }
  }

  /**
   * Extract current number from display
   */
  private static getCurrentNumber(display: string): number {
    const num = parseFloat(display);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Perform basic arithmetic operation
   */
  private static performBasicOperation(
    operand1: number,
    operand2: number,
    operation: string
  ): number {
    switch (operation) {
      case '+':
        return operand1 + operand2;
      case '-':
        return operand1 - operand2;
      case '*':
        return operand1 * operand2;
      case '/':
        return operand2 !== 0 ? operand1 / operand2 : 0;
      default:
        return operand2;
    }
  }

  /**
   * Format display value for presentation
   */
  private static formatDisplayValue(value: string, lastInput: string): string {
    if (value === 'Error' || value === '0.' || isNaN(parseFloat(value))) {
      return value;
    }

    const num = parseFloat(value);
    
    // Handle very large or very small numbers
    // Only use exponential notation for very small positive numbers or very large numbers (positive or negative)
    if (num > 999999999999 || (Math.abs(num) < 0.000001 && num !== 0)) {
      return num.toExponential(6);
    }

    // Smart decimal formatting for final results
    if (lastInput === '=' || lastInput === 'ENTER') {
      if (value.includes('.')) {
        const decimalPart = value.split('.')[1];
        if (decimalPart && decimalPart.length === 1) {
          return num.toFixed(2);
        }
        return num.toString();
      }
      return num.toString();
    }

    return value;
  }

  /**
   * Start auto replay sequence
   */
  private static startAutoReplay(state: KeypadState): KeypadState {
    if (state.calculationSteps.length === 0) return state;
    
    console.log('🎬 Starting auto replay with steps:', state.calculationSteps.length, state.calculationSteps);
    
    // Set up for auto replay
    localStorage.setItem('currentCheckIndex', '0');
    
    // Immediately show the first step and update counter
    if (state.calculationSteps.length > 0) {
      const firstStep = state.calculationSteps[0];
      // Dispatch event to update UI immediately
      window.dispatchEvent(new CustomEvent('autoReplayStep', {
        detail: {
          displayValue: firstStep.displayValue,
          stepIndex: 0,
          totalSteps: state.calculationSteps.length,
          currentStep: 1,
          articleCount: 1
        }
      }));
    }
    
    // Start the replay sequence with remaining steps after a short delay
    setTimeout(() => {
      if (state.calculationSteps.length > 1) {
        this.executeAutoReplaySequence(state.calculationSteps, 1);
      } else {
        // If only one step, show final result after delay
        setTimeout(() => {
          const finalResult = this.evaluateAllSteps(state.calculationSteps);
          console.log('🎥 Showing final result:', finalResult);
          window.dispatchEvent(new CustomEvent('autoReplayStep', {
            detail: {
              displayValue: `=${finalResult}`,
              stepIndex: 1,
              totalSteps: state.calculationSteps.length + 1,
              currentStep: 2,
              articleCount: state.calculationSteps.length
            }
          }));
          
          // Complete auto replay
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('autoReplayComplete'));
          }, 1500);
        }, 1500);
      }
    }, 1500);
    
    return {
      ...state,
      autoReplayActive: true,
      display: state.calculationSteps.length > 0 ? state.calculationSteps[0].displayValue : state.display
    };
  }

  /**
   * Execute auto replay sequence step by step
   */
  private static executeAutoReplaySequence(steps: CalculationStep[], currentIndex: number): void {
    console.log('🎥 executeAutoReplaySequence:', { currentIndex, totalSteps: steps.length, steps });
    
    if (currentIndex < steps.length) {
      const step = steps[currentIndex];
      console.log('🎥 Showing step:', {
        index: currentIndex,
        displayValue: step.displayValue,
        result: step.result,
        step
      });
      
      // Dispatch event to update UI
      window.dispatchEvent(new CustomEvent('autoReplayStep', {
        detail: {
          displayValue: step.displayValue,
          stepIndex: currentIndex,
          totalSteps: steps.length,
          currentStep: currentIndex + 1,
          articleCount: currentIndex + 1
        }
      }));
      
      localStorage.setItem('currentCheckIndex', currentIndex.toString());
      
      // Schedule next step
      if (currentIndex + 1 < steps.length) {
        console.log('🎥 Scheduling next step:', currentIndex + 1);
        setTimeout(() => {
          this.executeAutoReplaySequence(steps, currentIndex + 1);
        }, 1500); // Increased delay to ensure steps are visible
      } else {
        // Show final result
        setTimeout(() => {
          const finalResult = this.evaluateAllSteps(steps);
          console.log('🎥 Showing final result:', finalResult);
          window.dispatchEvent(new CustomEvent('autoReplayStep', {
            detail: {
              displayValue: `=${finalResult}`,
              stepIndex: currentIndex + 1,
              totalSteps: steps.length + 1,
              currentStep: currentIndex + 2,
              articleCount: steps.length
            }
          }));
          
          // Complete auto replay
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('autoReplayComplete'));
          }, 1500); // Increased delay for final result
        }, 1500);
      }
    } else {
      console.log('🎥 No more steps to show, currentIndex:', currentIndex, 'totalSteps:', steps.length);
    }
  }

  /**
   * Handle CHECK→ (forward navigation)
   */
  private static handleCheckForward(state: KeypadState): KeypadState {
    let currentIndex = parseInt(localStorage.getItem('currentCheckIndex') || '-1');
    const hasResult = state.calculationSteps.some(step => step.isComplete);
    const totalPositions = hasResult ? state.calculationSteps.length + 1 : state.calculationSteps.length;
    
    currentIndex++;
    if (currentIndex >= totalPositions) {
      currentIndex = 0; // Wrap to beginning
    }
    
    localStorage.setItem('currentCheckIndex', currentIndex.toString());
    
    let displayValue: string;
    let articleCount: number;
    
    if (hasResult && currentIndex === state.calculationSteps.length) {
      // Show result
      const result = this.evaluateAllSteps(state.calculationSteps);
      displayValue = `=${result}`;
      articleCount = state.calculationSteps.length;
    } else {
      // Show calculation step
      const step = state.calculationSteps[currentIndex];
      displayValue = step.displayValue;
      articleCount = currentIndex + 1;
    }
    
    // Dispatch event to update UI with step counter in the same format as auto replay
    window.dispatchEvent(new CustomEvent('checkNavigation', {
      detail: {
        displayValue: displayValue,
        stepIndex: currentIndex,
        totalSteps: totalPositions,
        currentStep: currentIndex + 1,
        articleCount: articleCount
      }
    }));
    
    return {
      ...state,
      display: displayValue,
      articleCount: articleCount
    };
  }

  /**
   * Handle CHECK← (backward navigation)
   */
  private static handleCheckBackward(state: KeypadState): KeypadState {
    let currentIndex = parseInt(localStorage.getItem('currentCheckIndex') || '0');
    const hasResult = state.calculationSteps.some(step => step.isComplete);
    const totalPositions = hasResult ? state.calculationSteps.length + 1 : state.calculationSteps.length;
    
    currentIndex--;
    if (currentIndex < 0) {
      currentIndex = totalPositions - 1; // Wrap to end
    }
    
    localStorage.setItem('currentCheckIndex', currentIndex.toString());
    
    let displayValue: string;
    let articleCount: number;
    
    if (hasResult && currentIndex === state.calculationSteps.length) {
      // Show result
      const result = this.evaluateAllSteps(state.calculationSteps);
      displayValue = `=${result}`;
      articleCount = state.calculationSteps.length;
    } else {
      // Show calculation step
      const step = state.calculationSteps[currentIndex];
      displayValue = step.displayValue;
      articleCount = currentIndex + 1;
    }
    
    // Dispatch event to update UI with step counter in the same format as auto replay
    window.dispatchEvent(new CustomEvent('checkNavigation', {
      detail: {
        displayValue: displayValue,
        stepIndex: currentIndex,
        totalSteps: totalPositions,
        currentStep: currentIndex + 1,
        articleCount: articleCount
      }
    }));
    
    return {
      ...state,
      display: displayValue,
      articleCount: articleCount
    };
  }

  /**
   * Get current calculation context
   */
  public static getCalculationContext(state: KeypadState): {
    hasActiveCalculation: boolean;
    isCompoundCalculation: boolean;
    canPerformEquals: boolean;
  } {
    return {
      hasActiveCalculation: state.calculationSteps.length > 0,
      isCompoundCalculation: state.calculationSteps.some(step => 
        step.expression.includes('*') || step.expression.includes('/')
      ),
      canPerformEquals: state.lastOperation !== null && state.lastOperand !== null
    };
  }
}