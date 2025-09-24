import React from 'react';
import { Search, Filter } from 'lucide-react';
import { usePriceList } from '../context/PriceListContext';
import { SortOption } from '../types';

const SearchBar: React.FC = () => {
  const { searchQuery, setSearchQuery, sortOption, setSortOption } = usePriceList();
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'name-asc', label: 'Name (A-Z)' },
    { value: 'name-desc', label: 'Name (Z-A)' },
    { value: 'price-asc', label: 'Price (Low to High)' },
    { value: 'price-desc', label: 'Price (High to Low)' },
    { value: 'date-asc', label: 'Oldest First' },
    { value: 'date-desc', label: 'Newest First' },
  ];

  return (
    <div className="bg-white border-b border-gray-200 p-4 shadow-sm sticky top-[64px] z-30">
      <div className="w-full">
      <div className="relative flex items-center">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={20} className="text-gray-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search items..."
          className="block w-full pl-12 pr-12 py-4 text-xl border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-3 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
        />
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className="absolute inset-y-0 right-0 pr-3 flex items-center"
        >
          <Filter 
            size={24} 
            className={`${sortOption !== 'date-desc' ? 'text-blue-500' : 'text-gray-400'}`} 
          />
        </button>
      </div>

      {isFilterOpen && (
        <div className="mt-3 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden animate-fade-in">
          <div className="p-3">
            <p className="text-base font-medium text-gray-700 mb-2 px-3">Sort by:</p>
            {sortOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setSortOption(option.value);
                  setIsFilterOpen(false);
                }}
                className={`w-full text-left px-4 py-3 text-base rounded-md transition-colors ${
                  sortOption === option.value
                    ? 'bg-blue-50 text-blue-700'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default SearchBar;