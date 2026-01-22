import React, { useState } from 'react';
import { Calculator } from 'lucide-react';
import MiniCalculator from './MiniCalculator';

interface MiniCalculatorInstance {
  id: string;
  label: string;
  position: { x: number; y: number };
}

interface MiniCalculatorManagerProps {
  onAddToClient: (amount: number, description: string, label: string) => void;
}

/**
 * MINI CALCULATOR MANAGER COMPONENT
 * =================================
 * 
 * Manages multiple floating mini calculators
 */
const MiniCalculatorManager: React.FC<MiniCalculatorManagerProps> = ({ onAddToClient }) => {
  const [calculators, setCalculators] = useState<MiniCalculatorInstance[]>([]);

  const createNewCalculator = () => {
    // Calculate position for new calculator (staggered)
    const baseX = 100;
    const baseY = 150;
    const offset = calculators.length * 40; // Stagger by 40px
    
    const newCalculator: MiniCalculatorInstance = {
      id: `mini-calc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      label: `Quick Calc ${calculators.length + 1}`,
      position: { 
        x: baseX + offset, 
        y: baseY + offset 
      }
    };

    setCalculators(prev => {
      const updated = [...prev, newCalculator];
      return updated;
    });
  };

  const closeCalculator = (id: string) => {
    setCalculators(prev => prev.filter(calc => calc.id !== id));
  };

  return (
    <>
      {/* Mini Calculator Button */}
      <button
        onClick={createNewCalculator}
        className="p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-100 rounded-lg transition-colors border border-purple-200"
        title="Create Mini Calculator"
      >
        <Calculator size={20} />
      </button>

      {/* Render all mini calculators */}
      {calculators.map((calc) => {
        return (
          <MiniCalculator
            key={calc.id}
            id={calc.id}
            initialLabel={calc.label}
            initialPosition={calc.position}
            onClose={() => closeCalculator(calc.id)}
            onAddToClient={onAddToClient}
          />
        );
      })}
    </>
  );
};

export default MiniCalculatorManager;