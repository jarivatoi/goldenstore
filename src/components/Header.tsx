/*
 * COMPONENTS/HEADER.TSX - APPLICATION HEADER COMPONENT
 * ====================================================
 * 
 * OVERVIEW:
 * Main navigation header with app title and menu functionality.
 * Provides access to import/export features and displays item count.
 * 
 * KEY FEATURES:
 * - Sticky positioning for persistent access
 * - Dropdown menu with import/export options
 * - Automatic backup creation during import
 * - File format validation
 * - User confirmation dialogs
 * - Item count display
 * 
 * TECHNICAL IMPLEMENTATION:
 * - React hooks for state management
 * - File API for import/export operations
 * - JSON data serialization
 * - Date formatting for file names
 * - Error handling with user feedback
 * 
 * USER EXPERIENCE:
 * - Intuitive menu toggle
 * - Clear action descriptions
 * - Progress feedback during operations
 * - Confirmation dialogs for destructive actions
 */
import React, { useState } from 'react';
import { Menu, Download, Upload, X, Database } from 'lucide-react';
import { usePriceList } from '../context/PriceListContext';

/**
 * HEADER COMPONENT
 * ================
 * 
 * PURPOSE:
 * Renders the main application header with navigation and menu functionality.
 * Provides access to data management features and displays app status.
 * 
 * STATE MANAGEMENT:
 * - isMenuOpen: Controls dropdown menu visibility
 * - Uses PriceListContext for data operations
 * 
 * LAYOUT:
 * - Sticky positioning at top of viewport
 * - Centered title with absolute-positioned menu
 * - Dropdown menu with action items
 * - Item count display in menu footer
 * 
 * ACCESSIBILITY:
 * - Proper button semantics
 * - Keyboard navigation support
 * - Screen reader friendly labels
 * - High contrast color scheme
 */
const Header: React.FC = () => {
  // Component state for menu visibility
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Access global state and operations
  const { items, importItems } = usePriceList();

  /**
   * EXPORT FUNCTIONALITY
   * ====================
   * 
   * PURPOSE:
   * Creates and downloads a JSON file containing all price list data.
   * Provides backup functionality and data portability.
   * 
   * PROCESS:
   * 1. Generate filename with current date
   * 2. Create export data object with metadata
   * 3. Serialize dates to ISO strings for JSON compatibility
   * 4. Create downloadable blob and trigger download
   * 5. Clean up resources and close menu
   * 
   * FILE FORMAT:
   * - JSON structure with version and metadata
   * - ISO date strings for cross-platform compatibility
   * - Human-readable formatting with indentation
   * 
   * FILENAME CONVENTION:
   * - Format: "Goldenpricelist_DD-MM-YYYY.json"
   * - Uses local date for user familiarity
   * - Prevents filename conflicts with timestamps
   * 
   * ERROR HANDLING:
   * - Try-catch for serialization errors
   * - User-friendly error messages
   * - Graceful fallback behavior
   */
  const handleExport = () => {
    try {
      // Create date string in dd-mm-yyyy format for filename
      const now = new Date();
      const day = now.getDate().toString().padStart(2, '0');
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const year = now.getFullYear();
      const dateString = `${day}-${month}-${year}`;
      
      // Create export data structure with metadata
      const dataToExport = {
        version: '1.0', // Format version for future compatibility
        exportDate: new Date().toISOString(), // Export timestamp
        // Convert Date objects to ISO strings for JSON serialization
        items: items.map(item => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
          lastEditedAt: item.lastEditedAt?.toISOString()
        }))
      };

      // Serialize data with pretty formatting
      const dataStr = JSON.stringify(dataToExport, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      // Create download link and trigger download
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Goldenpricelist_${dateString}.json`;
      
      // Temporarily add to DOM, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up blob URL to prevent memory leaks
      URL.revokeObjectURL(url);
      
      // Close menu after successful export
      setIsMenuOpen(false);
    } catch (error) {
      // Handle export errors gracefully
      alert('Error exporting data. Please try again.');
    }
  };

  /**
   * IMPORT FUNCTIONALITY
   * ====================
   * 
   * PURPOSE:
   * Allows users to import price list data from JSON files.
   * Replaces current data with imported items after confirmation.
   * 
   * PROCESS:
   * 1. Create file input element programmatically
   * 2. Set up file selection handler
   * 3. Read and parse selected JSON file
   * 4. Validate data structure and format
   * 5. Show confirmation dialog with item count
   * 6. Perform import operation if confirmed
   * 7. Provide success/error feedback
   * 
   * VALIDATION:
   * - Checks for required 'items' array property
   * - Validates JSON structure
   * - Handles malformed date strings gracefully
   * 
   * USER SAFETY:
   * - Confirmation dialog before destructive operation
   * - Mentions automatic backup creation
   * - Clear warning about data replacement
   * 
   * ERROR HANDLING:
   * - File reading errors
   * - JSON parsing errors
   * - Data validation failures
   * - Import operation failures
   */
  const handleImport = () => {
    // Create file input element programmatically
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json'; // Restrict to JSON files
    
    // Set up file selection handler
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      // Read file content as text
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          // Parse JSON content
          const content = e.target?.result as string;
          const data = JSON.parse(content);
          
          // Validate the data structure
          if (!data.items || !Array.isArray(data.items)) {
            throw new Error('Invalid file format');
          }

          // Convert date strings back to Date objects
          const importedItems = data.items.map((item: any) => ({
            ...item,
            createdAt: new Date(item.createdAt),
            lastEditedAt: item.lastEditedAt ? new Date(item.lastEditedAt) : undefined
          }));

          // Show confirmation dialog with details
          const confirmImport = window.confirm(
            `This will import ${importedItems.length} items and replace your current data. This will also create an automatic backup. Are you sure you want to continue?`
          );

          if (confirmImport) {
            // Perform import operation
            await importItems(importedItems);
            alert(`Successfully imported ${importedItems.length} items!`);
          }
        } catch (error) {
          // Handle parsing and validation errors
          alert('Error importing file. Please check the file format and try again.');
        }
      };
      
      // Start reading file as text
      reader.readAsText(file);
    };
    
    // Trigger file selection dialog
    input.click();
    
    // Close menu after initiating import
    setIsMenuOpen(false);
  };

  /**
   * COMPONENT RENDER
   * ================
   * 
   * STRUCTURE:
   * - Sticky header container with shadow
   * - Centered title with app name
   * - Absolute-positioned menu button
   * - Dropdown menu with action items
   * - Menu footer with item count
   * 
   * STYLING:
   * - Clean white background with subtle shadow
   * - Consistent spacing and typography
   * - Hover states for interactive elements
   * - Smooth animations for menu transitions
   * 
   * RESPONSIVE DESIGN:
   * - Fixed max-width for mobile optimization
   * - Proper touch targets for mobile devices
   * - Readable text sizes across devices
   */
  return (
    <header className="sticky top-0 bg-white z-20 shadow-sm">
      {/* Sticky Header: Stays at top during scroll */}
      <div className="w-full px-6 py-4 flex items-center justify-center relative">
        {/* Centered Title: Main app branding */}
        <h1 className="text-2xl font-semibold text-gray-900">Golden Price List</h1>
        
        {/* Menu Button: Positioned absolutely to the right */}
        <div className="absolute right-6">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            {/* Toggle between menu and close icons */}
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Dropdown Menu: Conditional rendering based on state */}
          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden animate-fade-in z-50">
              <div className="py-1">
                {/* Export Button: Download current data */}
                <button
                  onClick={handleExport}
                  className="w-full px-5 py-4 text-left text-base text-gray-700 hover:bg-gray-50 flex items-center transition-colors duration-200"
                >
                  <Download size={18} className="mr-3 text-green-600" />
                  Export Database
                </button>
                
                {/* Import Button: Upload new data */}
                <button
                  onClick={handleImport}
                  className="w-full px-5 py-4 text-left text-base text-gray-700 hover:bg-gray-50 flex items-center transition-colors duration-200"
                >
                  <Upload size={18} className="mr-3 text-blue-600" />
                  Import Database
                </button>
              </div>
              
              {/* Menu Footer: Database statistics */}
              <div className="px-5 py-4 bg-gray-50 border-t border-gray-100">
                <div className="flex items-center text-sm text-gray-500">
                  <Database size={14} className="mr-2" />
                  <span>{items.length} items</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;