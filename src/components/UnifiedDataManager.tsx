import React, { useState } from 'react';
import { Download, Upload, Database, X, AlertTriangle } from 'lucide-react';
import { usePriceList } from '../context/PriceListContext';
import { useCredit } from '../context/CreditContext';
import { useOver } from '../context/OverContext';
import { useOrder } from '../context/OrderContext';

interface UnifiedDataManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * UNIFIED DATA MANAGER COMPONENT
 * ==============================
 * 
 * Handles import/export of ALL app data across all modules
 */
const UnifiedDataManager: React.FC<UnifiedDataManagerProps> = ({ isOpen, onClose }) => {
  const { items: priceItems, importItems: importPriceItems } = usePriceList();
  const { clients, transactions, payments } = useCredit();
  const { items: overItems } = useOver();
  const { categories, itemTemplates, orders } = useOrder();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [showExportSuccess, setShowExportSuccess] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [importData, setImportData] = useState<any>(null);

  if (!isOpen) return null;

  // Enhanced export handler
  const handleExportAllEnhanced = async () => {
    await handleExportAll();
    setShowExportSuccess(true);
  };

  // Export all data from all modules
  const handleExportAll = async () => {
    try {
      setIsProcessing(true);
      
      const now = new Date();
      const day = now.getDate().toString().padStart(2, '0');
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const year = now.getFullYear();
      const dateString = `${day}-${month}-${year}`;
      
      // Collect all data from all modules
      const exportData = {
        version: '2.0',
        appName: 'Golden Store',
        exportDate: new Date().toISOString(),
        
        // Price List data
        priceList: {
          items: priceItems.map(item => ({
            ...item,
            createdAt: item.createdAt.toISOString(),
            lastEditedAt: item.lastEditedAt?.toISOString()
          }))
        },
        
        // Credit Management data
        creditManagement: {
          clients: clients.map(client => ({
            ...client,
            createdAt: client.createdAt.toISOString(),
            lastTransactionAt: client.lastTransactionAt.toISOString()
          })),
          transactions: transactions.map(transaction => ({
            ...transaction,
            date: transaction.date.toISOString()
          })),
          payments: payments.map(payment => ({
            ...payment,
            date: payment.date.toISOString()
          }))
        },
        
        // Over Management data
        overManagement: {
          items: overItems.map(item => ({
            ...item,
            createdAt: item.createdAt.toISOString(),
            completedAt: item.completedAt?.toISOString()
          }))
        },
        
        // Order Management data
        orderManagement: {
          categories: categories.map(category => ({
            ...category,
            createdAt: category.createdAt.toISOString()
          })),
          itemTemplates: itemTemplates.map(template => ({
            ...template,
            createdAt: template.createdAt.toISOString()
          })),
          orders: orders.map(order => ({
            ...order,
            orderDate: order.orderDate.toISOString(),
            createdAt: order.createdAt.toISOString(),
            lastEditedAt: order.lastEditedAt?.toISOString()
          }))
        }
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `GoldenStore_Complete_${dateString}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      onClose();
    } catch (error) {
      console.error('Error exporting complete database:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Import all data to all modules
  const handleImportAll = () => {
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
          
          // Validate file format
          if (!data.version || (!data.priceList && !data.creditManagement && !data.overManagement && !data.orderManagement)) {
            console.error('Invalid Golden Store database file format');
            return;
          }

          // Store import data and show confirmation modal
          setImportData(data);
          setShowImportConfirm(true);
        } catch (error) {
          console.error('Error parsing import file:', error);
        }
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  };

  const confirmImport = async () => {
    if (!importData) return;
    
    try {
      setIsProcessing(true);
      
      const data = importData;
      
      // Import all data
      if (true) {
            // Import Price List data
            if (data.priceList?.items) {
              const priceListItems = data.priceList.items.map((item: any) => ({
                ...item,
                createdAt: new Date(item.createdAt),
                lastEditedAt: item.lastEditedAt ? new Date(item.lastEditedAt) : undefined
              }));
              await importPriceItems(priceListItems);
            }
            
            // Import Credit Management data
            if (data.creditManagement) {
              if (data.creditManagement.clients) {
                const creditClients = data.creditManagement.clients.map((client: any) => ({
                  ...client,
                  createdAt: new Date(client.createdAt),
                  lastTransactionAt: new Date(client.lastTransactionAt)
                }));
                localStorage.setItem('creditClients', JSON.stringify(creditClients.map(client => ({
                  ...client,
                  createdAt: client.createdAt.toISOString(),
                  lastTransactionAt: client.lastTransactionAt.toISOString()
                }))));
              }
              
              if (data.creditManagement.transactions) {
                const creditTransactions = data.creditManagement.transactions.map((transaction: any) => ({
                  ...transaction,
                  date: new Date(transaction.date)
                }));
                localStorage.setItem('creditTransactions', JSON.stringify(creditTransactions.map(transaction => ({
                  ...transaction,
                  date: transaction.date.toISOString()
                }))));
              }
              
              if (data.creditManagement.payments) {
                const creditPayments = data.creditManagement.payments.map((payment: any) => ({
                  ...payment,
                  date: new Date(payment.date)
                }));
                localStorage.setItem('creditPayments', JSON.stringify(creditPayments.map(payment => ({
                  ...payment,
                  date: payment.date.toISOString()
                }))));
              }
            }
            
            // Import Over Management data
            if (data.overManagement?.items) {
              const overItemsData = data.overManagement.items.map((item: any) => ({
                ...item,
                createdAt: new Date(item.createdAt),
                completedAt: item.completedAt ? new Date(item.completedAt) : undefined
              }));
              localStorage.setItem('overItems', JSON.stringify(overItemsData.map(item => ({
                ...item,
                createdAt: item.createdAt.toISOString(),
                completedAt: item.completedAt?.toISOString()
              }))));
            }
            
            // Import Order Management data
            if (data.orderManagement) {
              if (data.orderManagement.categories) {
                const orderCategories = data.orderManagement.categories.map((category: any) => ({
                  ...category,
                  createdAt: new Date(category.createdAt)
                }));
                localStorage.setItem('orderCategories', JSON.stringify(orderCategories.map(category => ({
                  ...category,
                  createdAt: category.createdAt.toISOString()
                }))));
              }
              
              if (data.orderManagement.itemTemplates) {
                const orderTemplates = data.orderManagement.itemTemplates.map((template: any) => ({
                  ...template,
                  createdAt: new Date(template.createdAt)
                }));
                localStorage.setItem('orderItemTemplates', JSON.stringify(orderTemplates.map(template => ({
                  ...template,
                  createdAt: template.createdAt.toISOString()
                }))));
              }
              
              if (data.orderManagement.orders) {
                const orderData = data.orderManagement.orders.map((order: any) => ({
                  ...order,
                  orderDate: new Date(order.orderDate),
                  createdAt: new Date(order.createdAt),
                  lastEditedAt: order.lastEditedAt ? new Date(order.lastEditedAt) : undefined
                }));
                localStorage.setItem('orders', JSON.stringify(orderData.map(order => ({
                  ...order,
                  orderDate: order.orderDate.toISOString(),
                  createdAt: order.createdAt.toISOString(),
                  lastEditedAt: order.lastEditedAt?.toISOString()
                }))));
              }
            }
            
            onClose();
            setShowImportConfirm(false);
            setImportData(null);
            
            // Refresh the page to reload all data
            window.location.reload();
      }
    } catch (error) {
      console.error('Error importing database:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Calculate import statistics
  const getImportStats = () => {
    if (!importData) return null;
    
    return {
      priceList: importData.priceList?.items?.length || 0,
      creditClients: importData.creditManagement?.clients?.length || 0,
      creditTransactions: importData.creditManagement?.transactions?.length || 0,
      overItems: importData.overManagement?.items?.length || 0,
      orderCategories: importData.orderManagement?.categories?.length || 0,
      orders: importData.orderManagement?.orders?.length || 0,
      total: (importData.priceList?.items?.length || 0) +
             (importData.creditManagement?.clients?.length || 0) +
             (importData.creditManagement?.transactions?.length || 0) +
             (importData.creditManagement?.payments?.length || 0) +
             (importData.overManagement?.items?.length || 0) +
             (importData.orderManagement?.categories?.length || 0) +
             (importData.orderManagement?.itemTemplates?.length || 0) +
             (importData.orderManagement?.orders?.length || 0)
    };
  };

  const importStats = getImportStats();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-hidden select-none" style={{ height: '100vh' }}>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden select-none">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 select-none">
          <div className="flex items-center gap-3 select-none">
            <div className="bg-blue-100 p-2 rounded-full select-none">
              <Database size={20} className="text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 select-none">Database Manager</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors select-none"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 select-none">
          <p className="text-sm text-gray-600 mb-6 select-none">
            Manage your complete Golden Store database including Price List, Credit, Over Items, and Orders.
          </p>

          <div className="space-y-4 select-none">
            {/* Export All Data */}
            <button
              onClick={handleExportAllEnhanced}
              disabled={isProcessing}
              className="w-full flex items-center gap-4 p-4 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors disabled:opacity-50 select-none"
            >
              <div className="bg-green-500 p-2 rounded-full select-none">
                <Upload size={20} className="text-white" />
              </div>
              <div className="text-left flex-1 select-none">
                <h4 className="font-medium text-gray-800 select-none">Export Complete Database</h4>
                <p className="text-sm text-gray-600 select-none">Download all data from all modules</p>
              </div>
            </button>

            {/* Import All Data */}
            <button
              onClick={handleImportAll}
              disabled={isProcessing}
              className="w-full flex items-center gap-4 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors disabled:opacity-50 select-none"
            >
              <div className="bg-blue-500 p-2 rounded-full select-none">
                <Download size={20} className="text-white" />
              </div>
              <div className="text-left flex-1 select-none">
                <h4 className="font-medium text-gray-800 select-none">Import Complete Database</h4>
                <p className="text-sm text-gray-600 select-none">Replace all data with imported file</p>
              </div>
            </button>
          </div>

          {/* Warning */}
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 select-none">
            <div className="flex items-start gap-3 select-none">
              <AlertTriangle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="select-none">
                <h4 className="font-medium text-yellow-800 mb-1 select-none">Important Notes</h4>
                <ul className="text-sm text-yellow-700 space-y-1 select-none">
                  <li className="select-none">• Export includes ALL modules: Price List, Credit, Over Items, Orders</li>
                  <li className="select-none">• Import will REPLACE all existing data</li>
                  <li className="select-none">• Always backup before importing</li>
                  <li className="select-none">• Page refresh required after import</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Processing State */}
          {isProcessing && (
            <div className="mt-4 text-center select-none">
              <div className="inline-flex items-center gap-2 text-blue-600 select-none">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="select-none">Processing...</span>
              </div>
            </div>
          )}
        </div>

        {/* Export Success Modal */}
        <ConfirmationModal
          isOpen={showExportSuccess}
          title="Export Successful"
          message="Your complete database has been exported successfully!"
          confirmText="OK"
          cancelText=""
          type="success"
          onConfirm={() => setShowExportSuccess(false)}
          onCancel={() => setShowExportSuccess(false)}
          details={[
            'The file has been downloaded to your device',
            'You can use this file to restore your data later',
            'Keep this file safe as a backup'
          ]}
        />

        {/* Import Confirmation Modal */}
        <ConfirmationModal
          isOpen={showImportConfirm}
          title="Import Database"
          message="This will replace ALL your current data with the imported database."
          confirmText="Import Database"
          cancelText="Cancel"
          type="warning"
          onConfirm={confirmImport}
          onCancel={() => {
            setShowImportConfirm(false);
            setImportData(null);
          }}
          details={importStats ? [
            `Total records: ${importStats.total}`,
            `• Price List: ${importStats.priceList} items`,
            `• Credit: ${importStats.creditClients} clients, ${importStats.creditTransactions} transactions`,
            `• Over Items: ${importStats.overItems} items`,
            `• Orders: ${importStats.orderCategories} categories, ${importStats.orders} orders`,
            '',
            'This action cannot be undone',
            'Page will refresh after import'
          ] : []}
          isProcessing={isProcessing}
        />
      </div>
    </div>
  );
};

export default UnifiedDataManager;