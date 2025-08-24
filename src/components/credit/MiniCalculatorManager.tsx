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
    const baseX = 50;
    const baseY = 100;
    const offset = calculators.length * 30; // Stagger by 30px
    
    const newCalculator: MiniCalculatorInstance = {
      id: `mini-calc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      label: `Quick Calc ${calculators.length + 1}`,
      position: { 
        x: baseX + offset, 
        y: baseY + offset 
      }
    };

    setCalculators(prev => [...prev, newCalculator]);
  };

  const closeCalculator = (id: string) => {
    setCalculators(prev => prev.filter(calc => calc.id !== id));
  };

  const handleAddToClient = (amount: number, description: string, label: string) => {
    // For now, just show an alert with the transaction details
    // In a real implementation, this would integrate with the client search modal
    alert(`Transaction from ${label}:\nAmount: Rs ${amount.toFixed(2)}\nDescription: ${description}\n\nNote: This would normally open the client search modal to select a client.`);
    
    // Call the parent callback
    onAddToClient(amount, description, label);
  };

  return (
    <>
      {/* Mini Calculator Button */}
      <button
        onClick={createNewCalculator}
        className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        title="Create Mini Calculator"
      >
        <Calculator size={20} />
      </button>

      {/* Render all mini calculators */}
      {calculators.map((calc) => (
        <MiniCalculator
          key={calc.id}
          id={calc.id}
          initialLabel={calc.label}
          initialPosition={calc.position}
          onClose={() => closeCalculator(calc.id)}
          onAddToClient={handleAddToClient}
        />
      ))}
    </>
  );
};

export default MiniCalculatorManager;