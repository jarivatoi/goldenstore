import React, { useEffect, useState } from 'react';
import { useIndependentCalculator } from '../hooks/useIndependentCalculator';

/**
 * Independent Calculator Component
 * 
 * A self-contained calculator that maintains its own state and is not affected
 * by database imports or credit management operations.
 */
const IndependentCalculator: React.FC = () => {
  // Use the independent calculator hook
  const {
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
    handleCalculatorInput,
    handleResetCalculator
  } = useIndependentCalculator();

  // Local state for auto replay display
  const [autoReplayDisplay, setAutoReplayDisplay] = useState<string>('');
  const [autoReplayStepInfo, setAutoReplayStepInfo] = useState<{currentStep: number, totalSteps: number} | null>(null);
  const [autoReplayCompleted, setAutoReplayCompleted] = useState<boolean>(false);

  // Handle auto replay events
  useEffect(() => {
    const handleAutoReplayStep = (event: CustomEvent) => {
      setAutoReplayDisplay(event.detail.displayValue);
      // Update step info for display during auto replay
      if (event.detail.currentStep !== undefined && event.detail.totalSteps !== undefined) {
        setAutoReplayStepInfo({
          currentStep: event.detail.currentStep,
          totalSteps: event.detail.totalSteps
        });
      }
      // Reset the completed flag when a new step starts
      setAutoReplayCompleted(false);
    };

    const handleCheckNavigation = (event: CustomEvent) => {
      // Update step info for display during check navigation
      if (event.detail.currentStep !== undefined && event.detail.totalSteps !== undefined) {
        setAutoReplayStepInfo({
          currentStep: event.detail.currentStep,
          totalSteps: event.detail.totalSteps
        });
      }
      
      // Update calculator display with the navigation step value
      if (event.detail.displayValue) {
        setAutoReplayDisplay(event.detail.displayValue);
      }
    };

    const handleAutoReplayComplete = () => {
      // Handle auto replay completion
      // Instead of resetting, keep the last display value to maintain result state
      console.log('Auto replay complete');
      
      // Set a flag to indicate that auto replay has completed
      setAutoReplayCompleted(true);
    };

    window.addEventListener('autoReplayStep', handleAutoReplayStep as EventListener);
    window.addEventListener('checkNavigation', handleCheckNavigation as EventListener);
    window.addEventListener('autoReplayComplete', handleAutoReplayComplete as EventListener);

    return () => {
      window.removeEventListener('autoReplayStep', handleAutoReplayStep as EventListener);
      window.removeEventListener('checkNavigation', handleCheckNavigation as EventListener);
      window.removeEventListener('autoReplayComplete', handleAutoReplayComplete as EventListener);
    };
  }, []);

  const handleLocalCalculatorInput = (value: string) => {
    // If AC is pressed during auto replay, reset everything immediately
    if (value === 'AC') {
      // Interrupt auto replay if it's active
      if (autoReplayActive || autoReplayDisplay) {
        window.dispatchEvent(new CustomEvent('interruptAutoReplay'));
      }
      
      // Reset auto replay state
      setAutoReplayDisplay('');
      setAutoReplayStepInfo(null);
      setAutoReplayCompleted(false);
      
      // Reset calculator
      handleResetCalculator();
      return;
    }
    
    // If any other input is pressed after auto replay completed, reset auto replay state
    if (autoReplayCompleted && value !== 'AC') {
      setAutoReplayDisplay('');
      setAutoReplayStepInfo(null);
      setAutoReplayCompleted(false);
    }
    
    // Use the independent calculator hook's input handler
    handleCalculatorInput(value);
  };

  // Helper function to render formatted calculator value with styled operators
  const renderFormattedValue = (value: string) => {
    // Split the value into numbers and operators
    // Handle both display symbols (×, ÷) and input symbols (*, /)
    const parts = value.split(/([+\-×÷*/])/);
    
    return parts.map((part, index) => {
      // Check if the part is an operator (handle both display and input symbols)
      if (part === '+' || part === '-' || part === '×' || part === '÷' || part === '*' || part === '/') {
        return (
          <span 
            key={index} 
            className="calculator-operator"
          >
            {/* Display the proper symbol regardless of what was input */}
            {part === '*' ? '×' : part === '/' ? '÷' : part}
          </span>
        );
      }
      // Return regular text for numbers and other characters
      return part;
    });
  };

  // Determine what to display in the calculator
  const displayValue = (autoReplayActive || (autoReplayDisplay && autoReplayDisplay.startsWith('=')) && !autoReplayCompleted) && autoReplayDisplay ? autoReplayDisplay : 
                     (autoReplayStepInfo && autoReplayDisplay) ? autoReplayDisplay : calculatorValue;
  
  // Determine what to display as the step counter
  const displayStepInfo = ((autoReplayActive && autoReplayStepInfo) || (autoReplayDisplay && autoReplayDisplay.startsWith('=')) && !autoReplayCompleted) || autoReplayStepInfo
    ? autoReplayStepInfo 
    : { currentStep: articleCount, totalSteps: articleCount };

  return (
    <div className="w-full lg:w-[32rem] calculator-container-landscape bg-white rounded-lg shadow-lg p-4 lg:p-6 flex flex-col">
      {/* Calculator Header */}
      <div className="grid grid-cols-3 items-center gap-2 mb-4">
        <div className="justify-self-start">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 p-2 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg lg:text-xl font-semibold text-gray-800">
              Independent Calculator
            </h3>
          </div>
        </div>
        <div className="justify-self-center">
          <button
            onClick={handleResetCalculator}
            className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition-colors"
          >
            Reset
          </button>
        </div>
        <div className="justify-self-end">
          <div className="text-xs text-gray-500">
            Standalone
          </div>
        </div>
      </div>

      {/* Calculator Display */}
      <div className="mb-4">
        <div className="bg-black rounded-lg p-4 mb-2">
          {/* Main Display with inline counter */}
          <div className="text-2xl sm:text-3xl font-mono text-green-400 min-h-[3rem] flex items-center overflow-hidden bg-black rounded px-3 py-2 relative">
            {/* Memory Indicator - Top Left */}
            {calculatorMemory !== 0 && (
              <div className="absolute top-0 left-0 text-xs text-blue-400 font-semibold">
                {isMarkupMode ? 'MU' : 'M'}
              </div>
            )}
            {/* Article Count Circle - Left side */}
            {displayStepInfo && displayStepInfo.currentStep > 0 && (
              <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0 mr-2">
                {autoReplayActive || (autoReplayDisplay && autoReplayDisplay.startsWith('=')) || autoReplayStepInfo
                  ? (autoReplayDisplay && autoReplayDisplay.startsWith('=') ? 'R' : `${displayStepInfo.currentStep}/${displayStepInfo.totalSteps}`)
                  : displayStepInfo.currentStep}
              </div>
            )}
            {/* Calculator Value - Right side */}
            <div className="truncate text-right flex-1 flex items-center justify-end" title={displayValue}>
              {renderFormattedValue(displayValue)}
            </div>

          </div>
          {/* Secondary Display */}
          <div className="text-xs text-gray-400 font-mono mt-1 text-center">
            {autoReplayActive || (autoReplayDisplay && autoReplayDisplay.startsWith('=')) || autoReplayStepInfo ? (
              autoReplayDisplay.startsWith('=') ? 'RESULT' : `STEP ${displayStepInfo!.currentStep}/${displayStepInfo!.totalSteps}`
            ) : 'READY'}
          </div>
        </div>
      </div>

      {/* Calculator Buttons */}
      <div className="grid grid-cols-6 gap-1 sm:gap-2 mb-6 p-2 sm:p-4 bg-gray-200 rounded-lg border-2 border-gray-400 shadow-inner">
        {/* Row 1: MU, MRC, M-, M+, →, AUTO */}
        <button
          onClick={() => handleLocalCalculatorInput('MU')}
          className="bg-blue-400 hover:bg-blue-500 text-white p-2 sm:p-3 rounded-lg font-bold text-xs sm:text-sm shadow-md border border-blue-500 flex items-center justify-center"
        >
          MU
        </button>
        <button
          onClick={() => handleLocalCalculatorInput('MRC')}
          className="bg-blue-400 hover:bg-blue-500 text-white p-2 sm:p-3 rounded-lg font-bold text-xs sm:text-sm shadow-md border border-blue-500 flex items-center justify-center"
        >
          MRC
        </button>
        <button
          onClick={() => handleLocalCalculatorInput('M-')}
          className="bg-blue-400 hover:bg-blue-500 text-white p-2 sm:p-3 rounded-lg font-bold text-xs sm:text-sm shadow-md border border-blue-500 flex items-center justify-center"
        >
          M-
        </button>
        <button
          onClick={() => handleLocalCalculatorInput('M+')}
          className="bg-blue-400 hover:bg-blue-500 text-white p-2 sm:p-3 rounded-lg font-bold text-xs sm:text-sm shadow-md border border-blue-500 flex items-center justify-center"
        >
          M+
        </button>
        <button
          onClick={() => handleLocalCalculatorInput('AUTO')}
          className="bg-gray-400 hover:bg-gray-500 text-white p-2 sm:p-3 rounded-lg font-bold text-xs sm:text-sm shadow-md border border-gray-500 flex items-center justify-center"
        >
          AUTO
        </button>
        <button
          onClick={() => handleLocalCalculatorInput('→')}
         className="bg-red-500 hover:bg-red-600 text-white p-2 sm:p-3 rounded-lg font-bold text-xs sm:text-sm shadow-md border border-red-600 flex items-center justify-center"
        >
          ⌫
        </button>

        {/* Row 2: %, 7, 8, 9, (, ) */}
        <button
          onClick={() => handleLocalCalculatorInput('%')}
          className="bg-blue-400 hover:bg-blue-500 text-white p-2 sm:p-3 rounded-lg font-bold text-sm sm:text-lg shadow-md border border-blue-500 flex items-center justify-center"
        >
          %
        </button>
        <button
          onClick={() => handleLocalCalculatorInput('7')}
          className="bg-gray-800 hover:bg-gray-900 text-white p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border border-gray-600 flex items-center justify-center"
        >
          7
        </button>
        <button
          onClick={() => handleLocalCalculatorInput('8')}
          className="bg-gray-800 hover:bg-gray-900 text-white p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border border-gray-600 flex items-center justify-center"
        >
          8
        </button>
        <button
          onClick={() => handleLocalCalculatorInput('9')}
          className="bg-gray-800 hover:bg-gray-900 text-white p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border border-gray-600 flex items-center justify-center"
        >
          9
        </button>
        <button
          onClick={() => handleLocalCalculatorInput('(')}
          className="bg-gray-600 hover:bg-gray-700 text-white p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border border-gray-700 flex items-center justify-center"
        >
          (
        </button>
        <button
          onClick={() => handleLocalCalculatorInput(')')}
          className="bg-gray-600 hover:bg-gray-700 text-white p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border border-gray-700 flex items-center justify-center"
        >
          )
        </button>

        {/* Row 3: √, 4, 5, 6, ×, ÷ */}
        <button
          onClick={() => handleLocalCalculatorInput('√')}
          className="bg-blue-400 hover:bg-blue-500 text-white p-2 sm:p-3 rounded-lg font-bold text-sm sm:text-lg shadow-md border border-blue-500 flex items-center justify-center"
        >
          √
        </button>
        <button
          onClick={() => handleLocalCalculatorInput('4')}
          className="bg-gray-800 hover:bg-gray-900 text-white p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border border-gray-600 flex items-center justify-center"
        >
          4
        </button>
        <button
          onClick={() => handleLocalCalculatorInput('5')}
          className="bg-gray-800 hover:bg-gray-900 text-white p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border border-gray-600 flex items-center justify-center"
        >
          5
        </button>
        <button
          onClick={() => handleLocalCalculatorInput('6')}
          className="bg-gray-800 hover:bg-gray-900 text-white p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border border-gray-600 flex items-center justify-center"
        >
          6
        </button>
        <button
          onClick={() => handleLocalCalculatorInput('*')}
          className={`p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border flex items-center justify-center ${
            lastPressedButton === '*' 
              ? 'bg-blue-700 text-white border-blue-800' 
              : 'bg-blue-400 hover:bg-blue-500 text-white border-blue-500'
          }`}
        >
          ×
        </button>
        <button
          onClick={() => handleLocalCalculatorInput('÷')}
          className={`p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border flex items-center justify-center ${
            lastPressedButton === '/' 
              ? 'bg-blue-700 text-white border-blue-800' 
              : 'bg-blue-400 hover:bg-blue-500 text-white border-blue-500'
          }`}
        >
          ÷
        </button>

        {/* Row 4: CE, 1, 2, 3, -, +/- */}
        <button
          onClick={() => handleLocalCalculatorInput('CE')}
          className={`p-2 sm:p-3 rounded-lg font-bold text-xs sm:text-sm shadow-md border flex items-center justify-center ${
            lastPressedButton === 'CE' 
              ? 'bg-yellow-700 text-white border-yellow-800' 
              : 'bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-600'
          }`}
        >
          CE
        </button>
        <button
          onClick={() => handleLocalCalculatorInput('1')}
          className="bg-gray-800 hover:bg-gray-900 text-white p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border border-gray-600 flex items-center justify-center"
        >
          1
        </button>
        <button
          onClick={() => handleLocalCalculatorInput('2')}
          className="bg-gray-800 hover:bg-gray-900 text-white p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border border-gray-600 flex items-center justify-center"
        >
          2
        </button>
        <button
          onClick={() => handleLocalCalculatorInput('3')}
          className="bg-gray-800 hover:bg-gray-900 text-white p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border border-gray-600 flex items-center justify-center"
        >
          3
        </button>
        <button
          onClick={() => handleLocalCalculatorInput('-')}
          className={`p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border flex items-center justify-center ${
            lastPressedButton === '-' 
              ? 'bg-blue-700 text-white border-blue-800' 
              : 'bg-blue-400 hover:bg-blue-500 text-white border-blue-500'
          }`}
        >
          −
        </button>
        <button
          onClick={() => handleLocalCalculatorInput('+/-')}
          className="bg-blue-400 hover:bg-blue-500 text-white p-2 sm:p-3 rounded-lg font-bold text-sm sm:text-lg shadow-md border border-blue-500 flex items-center justify-center"
        >
          +/−
        </button>

        {/* Row 5: AC, 0, 00, •, +, = */}
        <button
          onClick={() => handleLocalCalculatorInput('AC')}
          className={`p-2 sm:p-3 rounded-lg font-bold text-xs sm:text-sm shadow-md border flex items-center justify-center ${
            lastPressedButton === 'AC' 
              ? 'bg-red-700 text-white border-red-800' 
              : 'bg-red-500 hover:bg-red-600 text-white border-red-600'
          }`}
        >
          AC
        </button>
        <button
          onClick={() => handleLocalCalculatorInput('0')}
          className="bg-gray-800 hover:bg-gray-900 text-white p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border border-gray-600 flex items-center justify-center"
        >
          0
        </button>
        <button
          onClick={() => handleLocalCalculatorInput('00')}
          className="bg-gray-800 hover:bg-gray-900 text-white p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border border-gray-600 flex items-center justify-center"
        >
          00
        </button>
        <button
          onClick={() => handleLocalCalculatorInput('.')}
          className="bg-gray-800 hover:bg-gray-900 text-white p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border border-gray-600 flex items-center justify-center"
        >
          •
        </button>
        <button
          onClick={() => handleLocalCalculatorInput('+')}
          className={`p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border flex items-center justify-center ${
            lastPressedButton === '+' 
              ? 'bg-blue-700 text-white border-blue-800' 
              : 'bg-blue-400 hover:bg-blue-500 text-white border-blue-500'
          }`}
          style={{ gridRow: 'span 1' }}
        >
          +
        </button>
        <button
          onClick={() => handleLocalCalculatorInput('=')}
          className={`p-2 sm:p-3 rounded-lg font-bold text-lg sm:text-xl shadow-md border flex items-center justify-center ${
            lastPressedButton === '=' 
              ? 'bg-green-700 text-white border-green-800' 
              : 'bg-green-500 hover:bg-green-600 text-white border-green-600'
          }`}
        >
          =
        </button>
      </div>
    </div>
  );
};

export default IndependentCalculator;