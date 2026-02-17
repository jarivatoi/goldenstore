import React from 'react';
import { BarChart3, List, ShoppingCart, CreditCard, Download, Upload } from 'lucide-react';

type TabType = 'Over' | 'PriceList' | 'Order' | 'Credit';

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'Over' as TabType, label: 'Over', icon: BarChart3 },
    { id: 'PriceList' as TabType, label: 'PriceList', icon: List },
    { id: 'Order' as TabType, label: 'Order', icon: ShoppingCart },
    { id: 'Credit' as TabType, label: 'Credit', icon: CreditCard },
  ];

  return (
    <div className="sticky top-0 bg-white border-b border-gray-200 shadow-sm z-20 w-full">
      <div className="w-full">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex-1 min-w-0 flex items-center justify-center py-3 px-4 text-sm sm:text-base font-medium transition-colors duration-200 whitespace-nowrap ${
                  isActive
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 transform scale-105'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <Icon size={isActive ? 20 : 18} className="mr-1 sm:mr-2 flex-shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TabNavigation;