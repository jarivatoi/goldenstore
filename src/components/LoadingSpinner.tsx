import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 select-none">
      <Loader2 className="animate-spin text-blue-500 mb-4" size={32} />
      <p className="text-gray-600 text-center select-none">{message}</p>
    </div>
  );
};

export default LoadingSpinner;