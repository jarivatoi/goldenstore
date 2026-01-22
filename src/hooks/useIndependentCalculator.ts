import { useState, useRef, useEffect } from 'react';
import { CalculatorEngine } from '../calculator/CalculatorEngine';

interface CalculatorState {
  calculatorValue: string;
  calculatorMemory: number;
  lastOperation: string | null;
  lastOperand: number | null;
  isNewNumber: boolean;
  calculationSteps: any[];
  articleCount: number;
  isMarkupMode: boolean;
  autoReplayActive: boolean;
  transactionHistory: number[];
  calculatorGrandTotal: number;
}

/**
 * Custom hook for managing an independent calculator state
 * This hook ensures the calculator state is completely isolated from
 * the main application state and persists across sessions using localStorage
 */
export const useIndependentCalculator = () => {
  const calculatorEngineRef = useRef(new CalculatorEngine());
  
  const [calculatorValue, setCalculatorValue] = useState('0');
  const [calculatorMemory, setCalculatorMemory] = useState(0);
  const [lastOperation, setLastOperation] = useState<string | null>(null);
  const [lastOperand, setLastOperand] = useState<number | null>(null);
  const [isNewNumber, setIsNewNumber] = useState(true);
  const [calculationSteps, setCalculationSteps] = useState<any[]>([]);
  const [articleCount, setArticleCount] = useState(0);
  const [isMarkupMode, setIsMarkupMode] = useState(false);
  const [lastPressedButton, setLastPressedButton] = useState<string | null>(null);
  const [autoReplayActive, setAutoReplayActive] = useState(false);
  const [transactionHistory, setTransactionHistory] = useState<number[]>([]);
  const [calculatorGrandTotal, setCalculatorGrandTotal] = useState(0);

  // Load calculator state from localStorage on component mount
  useEffect(() => {
    const savedState = localStorage.getItem('independentCalculatorState');
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        setCalculatorValue(parsedState.calculatorValue || '0');
        setCalculatorMemory(parsedState.calculatorMemory || 0);
        setLastOperation(parsedState.lastOperation || null);
        setLastOperand(parsedState.lastOperand || null);
        setIsNewNumber(parsedState.isNewNumber ?? true);
        setCalculationSteps(parsedState.calculationSteps || []);
        setArticleCount(parsedState.articleCount || 0);
        setIsMarkupMode(parsedState.isMarkupMode || false);
        setAutoReplayActive(parsedState.autoReplayActive || false);
        setTransactionHistory(parsedState.transactionHistory || []);
        setCalculatorGrandTotal(parsedState.calculatorGrandTotal || 0);
      } catch (error) {
        console.error('Failed to load calculator state:', error);
      }
    }
    
    // Handle auto replay complete event
    const handleAutoReplayComplete = () => {
      setAutoReplayActive(false);
    };
    
    window.addEventListener('autoReplayComplete', handleAutoReplayComplete as EventListener);
    
    return () => {
      window.removeEventListener('autoReplayComplete', handleAutoReplayComplete as EventListener);
    };
  }, []);

  // Save calculator state to localStorage whenever it changes
  useEffect(() => {
    const stateToSave = {
      calculatorValue,
      calculatorMemory,
      lastOperation,
      lastOperand,
      isNewNumber,
      calculationSteps,
      articleCount,
      isMarkupMode,
      autoReplayActive,
      transactionHistory,
      calculatorGrandTotal
    };
    
    localStorage.setItem('independentCalculatorState', JSON.stringify(stateToSave));
  }, [calculatorValue, calculatorMemory, lastOperation, lastOperand, isNewNumber, calculationSteps, articleCount, isMarkupMode, autoReplayActive, transactionHistory, calculatorGrandTotal]);

  // Handle calculator input independently
  const handleCalculatorInput = (value: string) => {
    // Set current state in calculator engine
    calculatorEngineRef.current.setState({
      display: calculatorValue,
      memory: calculatorMemory,
      grandTotal: calculatorGrandTotal,
      lastOperation: lastOperation,
      lastOperand: lastOperand,
      isNewNumber: isNewNumber,
      transactionHistory: transactionHistory,
      calculationSteps: calculationSteps,
      articleCount: articleCount,
      isError: calculatorValue === 'Error',
      autoReplayActive: autoReplayActive,
      isMarkupMode: isMarkupMode
    });

    // Track the last pressed button
    setLastPressedButton(value);

    // Process the input with the calculator engine
    const result = calculatorEngineRef.current.processInput(value);
    
    // Update state independently
    setCalculatorValue(result.value);
    setCalculatorMemory(result.memory);
    setLastOperation(result.lastOperation);
    setLastOperand(result.lastOperand);
    setIsNewNumber(result.isNewNumber);
    setCalculationSteps(result.calculationSteps);
    setArticleCount(result.articleCount);
    setIsMarkupMode(result.isMarkupMode);
    setAutoReplayActive(result.autoReplayActive);
    setTransactionHistory(result.transactionHistory);
    setCalculatorGrandTotal(result.grandTotal);
    
    // Reset button press effect after 150ms for better visual feedback
    setTimeout(() => {
      setLastPressedButton(null);
    }, 150);
    
    return result;
  };

  // Reset calculator independently
  const handleResetCalculator = () => {
    calculatorEngineRef.current.reset();
    setCalculatorValue('0');
    setCalculatorMemory(0);
    setLastOperation(null);
    setLastOperand(null);
    setIsNewNumber(true);
    setCalculationSteps([]);
    setArticleCount(0);
    setIsMarkupMode(false);
    setAutoReplayActive(false);
    setTransactionHistory([]);
    setCalculatorGrandTotal(0);
    
    // Clear localStorage state
    localStorage.removeItem('independentCalculatorState');
  };

  // Export calculator state
  const exportCalculatorState = (): CalculatorState => {
    return {
      calculatorValue,
      calculatorMemory,
      lastOperation,
      lastOperand,
      isNewNumber,
      calculationSteps,
      articleCount,
      isMarkupMode,
      autoReplayActive,
      transactionHistory,
      calculatorGrandTotal
    };
  };

  // Import calculator state
  const importCalculatorState = (state: CalculatorState) => {
    setCalculatorValue(state.calculatorValue);
    setCalculatorMemory(state.calculatorMemory);
    setLastOperation(state.lastOperation);
    setLastOperand(state.lastOperand);
    setIsNewNumber(state.isNewNumber);
    setCalculationSteps(state.calculationSteps);
    setArticleCount(state.articleCount);
    setIsMarkupMode(state.isMarkupMode);
    setAutoReplayActive(state.autoReplayActive);
    setTransactionHistory(state.transactionHistory);
    setCalculatorGrandTotal(state.calculatorGrandTotal);
  };

  return {
    // State
    calculatorValue,
    calculatorMemory,
    lastOperation,
    lastOperand,
    isNewNumber,
    calculationSteps,
    articleCount,
    isMarkupMode,
    lastPressedButton,
    autoReplayActive,
    transactionHistory,
    calculatorGrandTotal,
    
    // Actions
    handleCalculatorInput,
    handleResetCalculator,
    exportCalculatorState,
    importCalculatorState
  };
};