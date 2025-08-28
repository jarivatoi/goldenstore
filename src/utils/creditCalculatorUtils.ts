import React from 'react';
import { Calculator, Plus, X } from 'lucide-react';
import { Client } from '../../types';

interface CreditCalculatorProps {
  calculatorValue: string;
  calculatorMemory: number;
  linkedClient: Client | null;
  onCalculatorInput: (value: string) => void;
  onCalculatorCancel: () => void;
  onAddToClient: () => void;
  isDisabled: boolean;
}

/**
 * CREDIT CALCULATOR COMPONENT
 * ===========================
 * 
 * Calculator interface for credit transactions
 */
const CreditCalculator: React.FC<CreditCalculatorProps> = ({
  calculatorValue,
  calculatorMemory,
  linkedClient,
  onCalculatorInput,
  onCalculatorCancel,
  onAddToClient,
  isDisabled
}) => {
  return (
    <div className="w-full lg:w-80 bg-white rounded-lg shadow-lg p-4 lg:p-6 order-1 lg:order-2 flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1">
          <h3 className="text-lg lg:text-xl font-semibold text-gray-800">Calculator</h3>
        </div>
        {linkedClient && (
          <>
            <p className="text-xs lg:text-sm text-green-600 font-medium">
              Adding to: {linkedClient.name}
            </p>
            <button
              onClick={onCalculatorCancel}
              className="text-gray-500 hover:text-gray-700 transition-colors"
              title="Cancel link to client"
            >
              <X size={20} />
            </button>
          </>
        )}
      </div>

      {/* Calculator Display */}
      <div className="mb-4">
        <div className="bg-gray-100 rounded-lg p-4 text-right relative">
          {calculatorMemory !== 0 && (
            <div className="absolute top-2 left-3 text-xs text-blue-600 font-semibold">
              M
            </div>
          )}
          <div className="text-xl sm:text-2xl font-mono text-gray-800 min-h-[2rem] flex items-center justify-end overflow-hidden">
            <div className="truncate max-w-full" title={calculatorValue}>
              {calculatorValue}
            </div>
          </div>
        </div>
      </div>

      {/* Calculator Buttons */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        {/* Row 0 - Memory Functions */}
        <button
          onClick={() => onCalculatorInput('M+')}
          className="bg-purple-500 hover:bg-purple-600 text-white p-3 rounded-lg font-semibold text-sm"
        >
          M+
        </button>
        <button
          onClick={() => onCalculatorInput('MR')}
          className="bg-purple-500 hover:bg-purple-600 text-white p-3 rounded-lg font-semibold text-sm"
        >
          MR
        </button>
        <button
          onClick={() => onCalculatorInput('MC')}
          className="bg-purple-500 hover:bg-purple-600 text-white p-3 rounded-lg font-semibold text-sm"
        >
          MC
        </button>
        <button
          onClick={() => onCalculatorInput('CE')}
          className="bg-orange-500 hover:bg-orange-600 text-white p-3 rounded-lg font-semibold text-sm"
        >
          CE
        </button>
        <button
          onClick={() => onCalculatorInput('C')}
          className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-lg font-semibold text-sm"
        >
          C
        </button>

        {/* Row 1 */}
        <button
          onClick={() => onCalculatorInput('7')}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-4 rounded-lg font-semibold text-lg"
        >
          7
        </button>
        <button
          onClick={() => onCalculatorInput('8')}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-3 rounded-lg font-semibold"
        >
          8
        </button>
        <button
          onClick={() => onCalculatorInput('9')}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-3 rounded-lg font-semibold"
        >
          9
        </button>
        <button
          onClick={() => onCalculatorInput('/')}
          className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-lg font-semibold"
        >
          ÷
        </button>
        <button
          onClick={() => onCalculatorInput('⌫')}
          className="bg-gray-500 hover:bg-gray-600 text-white p-3 rounded-lg font-semibold"
        >
          ⌫
        </button>

        {/* Row 2 */}
        <button
          onClick={() => onCalculatorInput('4')}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-3 rounded-lg font-semibold"
        >
          4
        </button>
        <button
          onClick={() => onCalculatorInput('5')}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-3 rounded-lg font-semibold"
        >
          5
        </button>
        <button
          onClick={() => onCalculatorInput('6')}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-3 rounded-lg font-semibold"
        >
          6
        </button>
        <button
          onClick={() => onCalculatorInput('*')}
          className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-lg font-semibold"
        >
          ×
        </button>
        <button
          onClick={() => onCalculatorInput('-')}
          className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-lg font-semibold row-span-2"
        >
          −
        </button>

        {/* Row 3 */}
        <button
          onClick={() => onCalculatorInput('1')}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-3 rounded-lg font-semibold"
        >
          1
        </button>
        <button
          onClick={() => onCalculatorInput('2')}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-3 rounded-lg font-semibold"
        >
          2
        </button>
        <button
          onClick={() => onCalculatorInput('3')}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-3 rounded-lg font-semibold"
        >
          3
        </button>
        <button
          onClick={() => onCalculatorInput('+')}
          className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-lg font-semibold row-span-2"
        >
          +
        </button>

        {/* Row 4 */}
        <button
          onClick={() => onCalculatorInput('0')}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-3 rounded-lg font-semibold col-span-2"
        >
          0
        </button>
        <button
          onClick={() => onCalculatorInput('.')}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-3 rounded-lg font-semibold"
        >
          .
        </button>
        <button
          onClick={() => onCalculatorInput('=')}
          className="bg-green-500 hover:bg-green-600 text-white p-3 rounded-lg font-semibold"
        >
          =
        </button>
      </div>

      {/* Add Button */}
      <button
        onClick={onAddToClient}
        disabled={isDisabled}
        className={`w-full ${linkedClient ? 'bg-blue-500 hover:bg-blue-600' : 'bg-green-500 hover:bg-green-600'} disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-4 rounded-lg font-semibold text-lg flex items-center justify-center gap-2`}
      >
        <Plus size={20} />
        {linkedClient ? `Add to ${linkedClient.name}` : 'Add to Client'}
      </button>
    </div>
  );
};

export default CreditCalculator;