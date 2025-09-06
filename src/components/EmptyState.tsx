import React from 'react';
import { List, ArrowUp } from 'lucide-react';

const EmptyState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-yellow-50 rounded-lg mx-4 border border-yellow-200">
      <ArrowUp size={32} className="text-blue-500 animate-bounce mb-6" />
      <div className="bg-yellow-100 p-6 rounded-full mb-6 border border-yellow-300">
        <List size={48} className="text-yellow-600" />
      </div>
      <h2 className="text-2xl font-semibold text-yellow-800 mb-3">Your price list is empty</h2>
      <p className="text-yellow-700 mb-8 max-w-md text-lg">
        Add your first item using the "Add New Item" button above
      </p>
    </div>
  );
};

export default EmptyState;