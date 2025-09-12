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
    'AUTO', 'CHECK→', 'CHECK←', '%', '√', 'LINK'
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
      autoReplayActive: false
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
   * Handle numeric input (0-9, 00, 000)
   */
  private static handleNumberInput(state: KeypadState, input: string): KeypadState {
    if (state.isNewNumber || state.display === '0') {
      return {
        ...state,
        display: input,
        isNewNumber: false,
        isError: false
      };
    }

    return {
      ...state,
      display: state.display + input,
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
   * Handle operator input (+, -, *, /, ×, ÷)
   */
  private static handleOperatorInput(state: KeypadState, input: string): KeypadState {
    const currentNumber = this.getCurrentNumber(state.display);
    
    // Normalize operator symbols
    const normalizedOperator = input === '×' ? '*' : input === '÷' ? '/' : input;

    return {
      ...state,
      lastOperation: normalizedOperator,
      lastOperand: currentNumber,
      isNewNumber: true,
      isError: false
    };
  }

  /**
   * Handle equals input
   */
  private static handleEqualsInput(state: KeypadState): KeypadState {
    if (!state.lastOperation || state.lastOperand === null) {
      return state;
    }

    const currentNumber = this.getCurrentNumber(state.display);
    const result = this.performBasicOperation(
      state.lastOperand,
      currentNumber,
      state.lastOperation
    );

    return {
      ...state,
      display: result.toString(),
      grandTotal: state.grandTotal + result,
      transactionHistory: [...state.transactionHistory, result],
      lastOperation: null,
      lastOperand: null,
      isNewNumber: true,
      isError: false
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
        // Enhanced percentage function - context-sensitive like standard calculators
        if (state.lastOperation && state.lastOperand !== null) {
          // Contextual percentage based on last operation
          let percentResult: number;
          
          if (state.lastOperation === '+' || state.lastOperation === '-') {
            // For addition/subtraction: X + Y% = X + (X * Y/100)
            percentResult = state.lastOperand + (state.lastOperand * currentNumber / 100);
            if (state.lastOperation === '-') {
              percentResult = state.lastOperand - (state.lastOperand * currentNumber / 100);
            }
          } else if (state.lastOperation === '*' || state.lastOperation === '×') {
            // For multiplication: X × Y% = X * (Y/100)
            percentResult = state.lastOperand * (currentNumber / 100);
          } else if (state.lastOperation === '/' || state.lastOperation === '÷') {
            // For division: X ÷ Y% = X / (Y/100)
            percentResult = currentNumber !== 0 ? state.lastOperand / (currentNumber / 100) : 0;
          } else {
            // Fallback: just convert to percentage
            percentResult = currentNumber / 100;
          }
          
          return {
            state: { 
              ...state, 
              display: percentResult.toString(), 
              lastOperation: null,
              lastOperand: null,
              isNewNumber: true 
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

      default:
        return { state, isActive: true };
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
    if (num > 999999999999 || (num < 0.000001 && num !== 0)) {
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