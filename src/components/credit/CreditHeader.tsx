import React from 'react';
import { Users, UserCheck, Database, Settings, ArrowUpDown, Calculator } from 'lucide-react';
import MiniCalculatorManager from './MiniCalculatorManager';

interface CreditHeaderProps {
  totalDebtAllClients: number;
  showAllClients: boolean;
  onToggleAllClients: () => void;
  clientFilter: 'all' | 'returnables' | 'overdue' | 'overlimit';
  onFilterChange: (filter: 'all' | 'returnables' | 'overdue' | 'overlimit') => void;
  showFilterDropdown: boolean;
  onToggleFilterDropdown: () => void;
  onShowSettings: () => void;
  onShowUnifiedDataManager: () => void;
  sortOption: 'name' | 'date' | 'date-oldest' | 'debt';
  onSortChange: (sort: 'name' | 'date' | 'date-oldest' | 'debt') => void;
  showSortDropdown: boolean;
  onToggleSortDropdown: () => void;
  onAddToClientFromMini: (client: any, description: string) => Promise<void>;
}

/**
 * CREDIT HEADER COMPONENT
 * =======================
 * 
 * Header section with title, filters, and action buttons
 */
const CreditHeader: React.FC<CreditHeaderProps> = ({
  totalDebtAllClients,
  showAllClients,
  onToggleAllClients,
  clientFilter,
  onFilterChange,
  showFilterDropdown,
  onToggleFilterDropdown,
  onShowSettings,
  onShowUnifiedDataManager,
  sortOption,
  onSortChange,
  showSortDropdown,
  onToggleSortDropdown,
  onAddToClientFromMini
}) => {
  return (
    <div className="mb-4">
      {/* Title Row */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg lg:text-xl font-semibold text-gray-800">
          Active Clients{totalDebtAllClients > 0 ? ` (Rs ${totalDebtAllClients.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` : ''}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onShowUnifiedDataManager}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            title="Database Import/Export"
          >
            <Database size={20} />
          </button>
          
          <button
            onClick={onShowSettings}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            title="Settings"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>
      
      {/* Left-aligned Filter Dropdown Row */}
      <div className="flex justify-start gap-3">
        <div className="relative">
          <button
            onClick={onToggleFilterDropdown}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2 border border-gray-200"
            title="Filter clients"
          >
            <span className="text-sm font-medium capitalize">Filter: {clientFilter}</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {/* Filter Dropdown Menu */}
          {showFilterDropdown && (
            <div className="absolute left-0 top-full mt-2 w-44 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
              <div className="py-1">
                <button
                  onClick={() => {
                    onFilterChange('all');
                    onToggleFilterDropdown();
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                    clientFilter === 'all' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => {
                    onFilterChange('returnables');
                    onToggleFilterDropdown();
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                    clientFilter === 'returnables' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                  }`}
                >
                  Returnables
                </button>
                <button
                  onClick={() => {
                    onFilterChange('overdue');
                    onToggleFilterDropdown();
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                    clientFilter === 'overdue' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                  }`}
                >
                  Overdue
                </button>
                <button
                  onClick={() => {
                    onFilterChange('overlimit');
                    onToggleFilterDropdown();
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                    clientFilter === 'overlimit' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                  }`}
                >
                  Overlimit
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Sort Dropdown */}
        <div className="relative">
          <button
            onClick={onToggleSortDropdown}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2 border border-gray-200"
            title="Sort clients"
          >
            <ArrowUpDown size={16} />
            <span className="text-sm font-medium capitalize">Sort: {sortOption}</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {/* Sort Dropdown Menu */}
          {showSortDropdown && (
            <div className="absolute left-0 top-full mt-2 w-36 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
              <div className="py-1">
                <button
                  onClick={() => {
                    onSortChange('name');
                    onToggleSortDropdown();
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                    sortOption === 'name' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                  }`}
                >
                  Name (A-Z)
                </button>
                <button
                  onClick={() => {
                    onSortChange('date');
                    onToggleSortDropdown();
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                    sortOption === 'date' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                  }`}
                >
                  Date (Recent)
                </button>
                <button
                  onClick={() => {
                    onSortChange('date-oldest');
                    onToggleSortDropdown();
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                    sortOption === 'date-oldest' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                  }`}
                >
                  Date (Oldest)
                </button>
                <button
                  onClick={() => {
                    onSortChange('debt');
                    onToggleSortDropdown();
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                    sortOption === 'debt' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                  }`}
                >
                  Debt (High-Low)
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Invisible overlay to close dropdown when clicking outside */}
        {(showFilterDropdown || showSortDropdown) && (
          <div 
            className="fixed inset-0 z-40"
            onClick={() => {
              if (showFilterDropdown) onToggleFilterDropdown();
              if (showSortDropdown) onToggleSortDropdown();
            }}
          />
        )}
      </div>
    </div>
  );
};

export default CreditHeader;