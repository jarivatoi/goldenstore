/**
 * APP.TSX - MAIN APPLICATION COMPONENT
 * ====================================
 * 
 * OVERVIEW:
 * This is the root component of the Golden Price List application, a React-based
 * Progressive Web App (PWA) for managing price lists with offline capabilities.
 * 
 * MAIN FEATURES:
 * - Offline-first architecture using IndexedDB
 * - Swipeable list items with edit/delete actions
 * - Real-time search and sorting
 * - Import/export functionality
 * - PWA installation prompts
 * - Responsive mobile-first design
 * 
 * TECHNOLOGIES USED:
 * - React 18 with TypeScript
 * - Tailwind CSS for styling
 * - Lucide React for icons
 * - IndexedDB for offline storage
 * - Context API for state management
 * 
 * COMPONENT HIERARCHY:
 * App (this file)
 * ├── PriceListProvider (Context wrapper)
 * ├── Header (Navigation and menu)
 * ├── AddItemForm (Add new items)
 * ├── PriceList (Display items)
 * ├── SearchBar (Search and filter)
 * └── AddToHomeScreen (PWA installation)
 */

import React from 'react';
import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Auth from './components/Auth';
import AddItemForm from './components/AddItemForm';
import PriceList from './components/PriceList';
import SearchBar from './components/SearchBar';
import { PriceListProvider, usePriceList } from './context/PriceListContext';
import { CreditProvider } from './context/CreditContext';
import AddToHomeScreen from './components/AddToHomeScreen';
import TabNavigation from './components/TabNavigation';
import CreditManagement from './components/CreditManagement';
import OverManagement from './components/OverManagement';
import { OverProvider } from './context/OverContext';
import OrderManagement from './components/OrderManagement';
import { OrderProvider } from './context/OrderContext';
import LoadingSpinner from './components/LoadingSpinner';
import SyncStatusIndicator from './components/SyncStatusIndicator';
import OnDeviceConsole from './components/OnDeviceConsole';

function MainAppContent() {
  const [activeTab, setActiveTab] = useState<'Over' | 'PriceList' | 'Order' | 'Credit'>(() => {
    const savedTab = localStorage.getItem('activeTab');
    return (savedTab as 'Over' | 'PriceList' | 'Order' | 'Credit') || 'PriceList';
  });
  const { signOut } = useAuth();

  // Save active tab to localStorage whenever it changes
  const handleTabChange = (tab: 'Over' | 'PriceList' | 'Order' | 'Credit') => {
    setActiveTab(tab);
    localStorage.setItem('activeTab', tab);
  };

  // Import/Export functionality moved from Header
  const { items, importItems } = usePriceList();

  const handleExport = () => {
    try {
      const now = new Date();
      const day = now.getDate().toString().padStart(2, '0');
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const year = now.getFullYear();
      const dateString = `${day}-${month}-${year}`;
      
      const dataToExport = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        items: items.map(item => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
          lastEditedAt: item.lastEditedAt?.toISOString()
        }))
      };

      const dataStr = JSON.stringify(dataToExport, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Goldenpricelist_${dateString}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Error exporting data. Please try again.');
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);
          
          if (!data.items || !Array.isArray(data.items)) {
            throw new Error('Invalid file format');
          }

          const importedItems = data.items.map((item: any) => ({
            ...item,
            createdAt: new Date(item.createdAt),
            lastEditedAt: item.lastEditedAt ? new Date(item.lastEditedAt) : undefined
          }));

          const confirmImport = window.confirm(
            `This will import ${importedItems.length} items and replace your current data. This will also create an automatic backup. Are you sure you want to continue?`
          );

          if (confirmImport) {
            await importItems(importedItems);
            alert(`Successfully imported ${importedItems.length} items!`);
          }
        } catch (error) {
          alert('Error importing file. Please check the file format and try again.');
        }
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Over':
        return (
          <OverManagement />
        );
      case 'PriceList':
        return (
          <>
            <AddItemForm />
            <SearchBar />
            <PriceList />
          </>
        );
      case 'Order':
        return (
          <OrderManagement />
        );
      case 'Credit':
        return (
          <CreditManagement />
        );
      default:
        return null;
    }
  };

  return (
    /* Main Container: Full height with gray background */
    <div className="min-h-screen bg-gray-50 flex flex-col w-full">
      {/* Header with Sign Out */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center">
        <div className="flex items-center gap-4 flex-1">
          <h1 className="text-xl font-semibold text-gray-900">Golden Store</h1>
          <SyncStatusIndicator />
        </div>
      </div>
      
      {/* Tab Navigation: Sticky tabs below header */}
      <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />
      
      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {renderTabContent()}
      </div>
      
      {/* PWA Installation Prompt */}
      <AddToHomeScreen />
      
      {/* Development Console */}
      <OnDeviceConsole />
    </div>
  );
}

/**
 * MAIN APP COMPONENT
 * ==================
 * 
 * PURPOSE:
 * Renders the complete application layout with all major components.
 * Wraps everything in PriceListProvider for global state management.
 * 
 * LAYOUT STRUCTURE:
 * - Full height container with gray background
 * - Sticky header at top
 * - Sticky add form below header
 * - Scrollable price list in middle
 * - Sticky search bar at bottom
 * - PWA installation prompt (conditional)
 * 
 * STYLING APPROACH:
 * - Mobile-first responsive design
 * - Flexbox layout for proper spacing
 * - Sticky positioning for key UI elements
 * - Consistent spacing and shadows
 * 
 * STATE MANAGEMENT:
 * All state is managed through PriceListContext, including:
 * - Items array with CRUD operations
 * - Search query and filtering
 * - Sort options
 * - Loading and error states
 * - IndexedDB synchronization
 */
function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner message="Initializing app..." />
      </div>
    );
  }

  // Always show the main app content, no authentication required
  return (
    <PriceListProvider>
      <OverProvider>
        <OrderProvider>
          <CreditProvider>
            <MainAppContent />
          </CreditProvider>
        </OrderProvider>
      </OverProvider>
    </PriceListProvider>
  );
}

export default App;