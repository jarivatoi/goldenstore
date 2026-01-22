import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, Upload, Database, X, AlertTriangle, Cloud, HardDrive } from 'lucide-react';
import { usePriceList } from '../context/PriceListContext';
import { useCredit } from '../context/CreditContext';
import { useOver } from '../context/OverContext';
import { useOrder } from '../context/OrderContext';
import { SupabaseBackupManager } from '../utils/supabaseBackupManager';
import AutoBackupSettings from './AutoBackupSettings';
import { automaticBackupManager } from '../utils/automaticBackupManager';

interface UnifiedDataManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ModalState {
  type: 'success' | 'error' | 'confirm' | 'storage-choice' | null;
  title: string;
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  onLocalChoice?: () => void;
  onServerChoice?: () => void;
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
  const [modal, setModal] = useState<ModalState>({ type: null, title: '', message: '' });
  const [pendingExportData, setPendingExportData] = useState<any>(null);
  const [pendingImportData, setPendingImportData] = useState<any>(null);
  const [lastBackupDate, setLastBackupDate] = useState<Date | null>(null);
  const [lastManualBackupDate, setLastManualBackupDate] = useState<Date | null>(null);

  // Load last backup date on component mount
  useEffect(() => {
    const backupStatus = automaticBackupManager.getBackupStatus();
    setLastBackupDate(backupStatus.lastBackup);
    setLastManualBackupDate(backupStatus.lastManualBackup);
  }, []);

  if (!isOpen) return null;

  // Prepare export data
  const prepareExportData = () => {
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

    return exportData;
  };

  // Export all data
  const handleExportAll = () => {
    const exportData = prepareExportData();
    setPendingExportData(exportData);
    
    // Show storage choice modal
    setModal({
      type: 'storage-choice',
      title: 'Choose Export Destination',
      message: 'Where would you like to save your database backup?',
      onLocalChoice: () => handleExportToLocal(),
      onServerChoice: () => handleExportToServer(),
      onCancel: () => {
        setModal({ type: null, title: '', message: '' });
        setPendingExportData(null);
      }
    });
  };

  // Export to local file
  const handleExportToLocal = () => {
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
      
      setModal({
        type: 'success',
        title: 'Local Export Successful',
        message: 'Database exported to your device successfully!',
        onConfirm: () => {
          setModal({ type: null, title: '', message: '' });
          setPendingExportData(null);
          onClose();
        }
      });
    } catch (error) {
      setModal({
        type: 'error',
        title: 'Local Export Failed',
        message: 'Error exporting to local file. Please try again.',
        onConfirm: () => setModal({ type: null, title: '', message: '' })
      });
    } finally {
      setIsProcessing(false);
      setPendingExportData(null);
    }
  };

  // Export to Supabase server
  const handleExportToServer = async () => {
    try {
      setIsProcessing(true);
      setModal({ type: null, title: '', message: '' });
      
      // Prepare export data if not already prepared
      const exportData = pendingExportData || prepareExportData();
      
      const backupName = `Golden Store Backup ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
      
      await SupabaseBackupManager.saveToSupabase(exportData, backupName);
      
      // Update manual backup timestamp
      automaticBackupManager.setLastManualBackupDate(new Date());
      
      setModal({
        type: 'success',
        title: 'Server Backup Successful',
        message: 'Database backed up to server successfully!\n\nYour data is now safely stored in the cloud and can be accessed from any device.',
        onConfirm: () => {
          setModal({ type: null, title: '', message: '' });
          setPendingExportData(null);
          // Update last backup date
          const backupStatus = automaticBackupManager.getBackupStatus();
          setLastBackupDate(backupStatus.lastBackup);
          setLastManualBackupDate(backupStatus.lastManualBackup);
          onClose();
        }
      });
    } catch (error) {
      setModal({
        type: 'error',
        title: 'Server Backup Failed',
        message: `Error backing up to server: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease check your internet connection and try again.`,
        onConfirm: () => setModal({ type: null, title: '', message: '' })
      });
    } finally {
      setIsProcessing(false);
      setPendingExportData(null);
    }
  };

  // Process import data
  const processImportData = async (data: any) => {
    try {
      setIsProcessing(true);
      setModal({ type: null, title: '', message: '' });
      
      // Import all data to localStorage (since contexts don't have import methods)
      if (data.priceList?.items) {
        localStorage.setItem('priceListItems', JSON.stringify(data.priceList.items));
      }
      
      // Import Credit Management data
      if (data.creditManagement?.clients) {
        localStorage.setItem('creditClients', JSON.stringify(data.creditManagement.clients));
      }
      if (data.creditManagement?.transactions) {
        localStorage.setItem('creditTransactions', JSON.stringify(data.creditManagement.transactions));
      }
      if (data.creditManagement?.payments) {
        localStorage.setItem('creditPayments', JSON.stringify(data.creditManagement.payments));
      }
      
      // Import Over Management data
      if (data.overManagement?.items) {
        localStorage.setItem('overItems', JSON.stringify(data.overManagement.items));
      }
      
      // Import Order Management data
      if (data.orderManagement?.categories) {
        localStorage.setItem('orderCategories', JSON.stringify(data.orderManagement.categories));
      }
      if (data.orderManagement?.itemTemplates) {
        localStorage.setItem('orderItemTemplates', JSON.stringify(data.orderManagement.itemTemplates));
      }
      if (data.orderManagement?.orders) {
        localStorage.setItem('orders', JSON.stringify(data.orderManagement.orders));
      }
      
      setModal({
        type: 'success',
        title: 'Import Successful',
        message: 'Database imported successfully! All your data has been restored.\n\nPlease refresh the page to see all imported data.',
        onConfirm: () => {
          setModal({ type: null, title: '', message: '' });
          // Refresh the page to reload all data
          window.location.reload();
          onClose();
        }
      });
    } catch (error) {
      setModal({
        type: 'error',
        title: 'Import Failed',
        message: `Error importing database: ${error instanceof Error ? error.message : 'Unknown error'}`,
        onConfirm: () => setModal({ type: null, title: '', message: '' })
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Import all data to all modules
  const handleImportAll = () => {
    // Show storage choice modal for import
    setModal({
      type: 'storage-choice',
      title: 'Choose Import Source',
      message: 'Where would you like to import your database from?',
      onLocalChoice: () => handleImportFromLocal(),
      onServerChoice: () => handleImportFromServer(),
      onCancel: () => setModal({ type: null, title: '', message: '' })
    });
  };

  // Import from local file
  const handleImportFromLocal = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          setIsProcessing(true);
          setModal({ type: null, title: '', message: '' });
          
          const content = e.target?.result as string;
          const data = JSON.parse(content);
          
          // Validate file format
          if (!data.version || (!data.priceList && !data.creditManagement && !data.overManagement && !data.orderManagement)) {
            setModal({
              type: 'error',
              title: 'Invalid File',
              message: 'Invalid Golden Store database file format. Please select a valid backup file.',
              onConfirm: () => setModal({ type: null, title: '', message: '' })
            });
            return;
          }

          // Count total items for confirmation
          const totalItems = 
            (data.priceList?.items?.length || 0) +
            (data.creditManagement?.clients?.length || 0) +
            (data.creditManagement?.transactions?.length || 0) +
            (data.creditManagement?.payments?.length || 0) +
            (data.overManagement?.items?.length || 0) +
            (data.orderManagement?.categories?.length || 0) +
            (data.orderManagement?.itemTemplates?.length || 0) +
            (data.orderManagement?.orders?.length || 0);

          // Show confirmation modal
          setModal({
            type: 'confirm',
            title: 'Import from Local File',
            message: `This will import a complete Golden Store database with ${totalItems} total records across all modules:

• Price List: ${data.priceList?.items?.length || 0} items
• Credit: ${data.creditManagement?.clients?.length || 0} clients, ${data.creditManagement?.transactions?.length || 0} transactions
• Over Items: ${data.overManagement?.items?.length || 0} items
• Orders: ${data.orderManagement?.categories?.length || 0} categories, ${data.orderManagement?.orders?.length || 0} orders

This will REPLACE ALL your current data. This action cannot be undone.`,
            onConfirm: () => processImportData(data),
            onCancel: () => setModal({ type: null, title: '', message: '' })
          });
        } catch (importError) {
          console.error('❌ File processing failed:', importError);
          setModal({
            type: 'error',
            title: 'Import Failed',
            message: `Error processing database file:

${importError instanceof Error ? importError.message : 'Unknown error'}

Please check the file format and try again.`,
            onConfirm: () => setModal({ type: null, title: '', message: '' })
          });
        } finally {
          setIsProcessing(false);
        }
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  };

  // Import from Supabase server
  const handleImportFromServer = async () => {
    try {
      setIsProcessing(true);
      setModal({ type: null, title: '', message: '' });
      
      // Check if backup exists
      const hasBackup = await SupabaseBackupManager.hasBackupOnSupabase();
      if (!hasBackup) {
        setModal({
          type: 'error',
          title: 'No Server Backup Found',
          message: 'No backup found on the server. Please create a server backup first or import from a local file.',
          onConfirm: () => setModal({ type: null, title: '', message: '' })
        });
        return;
      }
      
      // Get backup info
      const backupInfo = await SupabaseBackupManager.getBackupInfo();
      
      // Load backup data
      const data = await SupabaseBackupManager.loadFromSupabase();
      
      if (!data) {
        setModal({
          type: 'error',
          title: 'No Server Backup Found',
          message: 'No valid backup found on the server. Please create a server backup first or import from a local file.',
          onConfirm: () => setModal({ type: null, title: '', message: '' })
        });
        return;
      }
      
      // Count total items for confirmation
      const totalItems = 
        (data.priceList?.items?.length || 0) +
        (data.creditManagement?.clients?.length || 0) +
        (data.creditManagement?.transactions?.length || 0) +
        (data.creditManagement?.payments?.length || 0) +
        (data.overManagement?.items?.length || 0) +
        (data.orderManagement?.categories?.length || 0) +
        (data.orderManagement?.itemTemplates?.length || 0) +
        (data.orderManagement?.orders?.length || 0);

      // Show confirmation modal
      setModal({
        type: 'confirm',
        title: 'Import from Server Backup',
        message: `Found server backup: ${backupInfo?.backup_name || 'Unknown'}
Created: ${backupInfo?.created_at ? new Date(backupInfo.created_at).toLocaleString() : 'Unknown'}

This will import ${totalItems} total records across all modules:

• Price List: ${data.priceList?.items?.length || 0} items
• Credit: ${data.creditManagement?.clients?.length || 0} clients, ${data.creditManagement?.transactions?.length || 0} transactions
• Over Items: ${data.overManagement?.items?.length || 0} items
• Orders: ${data.orderManagement?.categories?.length || 0} categories, ${data.orderManagement?.orders?.length || 0} orders

This will REPLACE ALL your current data. This action cannot be undone.`,
        onConfirm: () => processImportData(data),
        onCancel: () => setModal({ type: null, title: '', message: '' })
      });
    } catch (error) {
      setModal({
        type: 'error',
        title: 'Server Import Failed',
        message: `Error loading from server: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease check your internet connection and try again.`,
        onConfirm: () => setModal({ type: null, title: '', message: '' })
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    createPortal(
      <>
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 select-none"
          style={{
            touchAction: 'none',
            overscrollBehavior: 'contain'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
        >
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md max-h-[90vh] flex flex-col select-none"
            style={{
              touchAction: 'auto',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200 select-none flex-shrink-0">
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
            <div className="p-6 overflow-y-auto flex-1 select-none"
              style={{ 
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-y pinch-zoom'
              }}
            >
              <p className="text-sm text-gray-600 mb-6 select-none">
                Manage your complete Golden Store database including Price List, Credit, Over Items, and Orders.
              </p>

              <div className="space-y-4 select-none">
                {/* Export All Data */}
                <button
                  onClick={handleExportAll}
                  disabled={isProcessing}
                  className="w-full flex items-center gap-4 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors disabled:opacity-50 select-none"
                >
                  <div className="bg-blue-500 p-2 rounded-full select-none">
                    <Download size={20} className="text-white" />
                  </div>
                  <div className="text-left flex-1 select-none">
                    <h4 className="font-medium text-gray-800 select-none">Export Database</h4>
                    <p className="text-sm text-gray-600 select-none">Save to local file or server backup</p>
                  </div>
                </button>

                {/* Import All Data */}
                <button
                  onClick={handleImportAll}
                  disabled={isProcessing}
                  className="w-full flex items-center gap-4 p-4 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors disabled:opacity-50 select-none"
                >
                  <div className="bg-green-500 p-2 rounded-full select-none">
                    <Upload size={20} className="text-white" />
                  </div>
                  <div className="text-left flex-1 select-none">
                    <h4 className="font-medium text-gray-800 select-none">Import Database</h4>
                    <p className="text-sm text-gray-600 select-none">Load from local file or server backup</p>
                  </div>
                </button>
              </div>

              {/* Auto Backup Settings */}
              <AutoBackupSettings />

              {/* Last Automatic Backup Info */}
              {lastBackupDate && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 select-none">
                  <div className="flex items-center gap-3 select-none">
                    <div className="bg-blue-500 p-2 rounded-full select-none">
                      <Database size={16} className="text-white" />
                    </div>
                    <div className="select-none">
                      <h4 className="font-medium text-blue-800 select-none">Last Automatic Backup</h4>
                      <p className="text-sm text-blue-700 select-none">
                        {lastBackupDate.toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        }).replace(/\s/g, '-')} at {lastBackupDate.toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Last Manual Backup Info */}
              {lastManualBackupDate && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 select-none">
                  <div className="flex items-center gap-3 select-none">
                    <div className="bg-green-500 p-2 rounded-full select-none">
                      <Database size={16} className="text-white" />
                    </div>
                    <div className="select-none">
                      <h4 className="font-medium text-green-800 select-none">Last Manual Backup</h4>
                      <p className="text-sm text-green-700 select-none">
                        {lastManualBackupDate.toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        }).replace(/\s/g, '-')} at {lastManualBackupDate.toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Warning */}
              <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 select-none">
                <div className="flex items-start gap-3 select-none">
                  <AlertTriangle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="select-none">
                    <h4 className="font-medium text-yellow-800 mb-1 select-none">Important Notes</h4>
                    <ul className="text-sm text-yellow-700 space-y-1 select-none">
                      <li className="select-none">• <strong>Local:</strong> Downloads file to your device</li>
                      <li className="select-none">• <strong>Server:</strong> Saves to cloud (overwrites old backup)</li>
                      <li className="select-none">• Server backups can be accessed from any device</li>
                      <li className="select-none">• Import will REPLACE all existing data</li>
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
          </div>
        </div>

        {/* Modal Dialogs */}
        {modal.type && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999] select-none">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md max-h-[90vh] overflow-hidden select-none">
              
              {modal.type === 'storage-choice' ? (
                <>
                  {/* Storage Choice Modal */}
                  <div className="flex justify-between items-center p-6 border-b border-gray-200 select-none">
                    <h2 className="text-xl font-semibold text-gray-900 select-none">{modal.title}</h2>
                    <button onClick={modal.onCancel} className="text-gray-500 hover:text-gray-700 transition-colors select-none">
                      <X size={24} />
                    </button>
                  </div>
                  
                  <div className="p-6 select-none">
                    <p className="text-gray-700 mb-6 select-none">{modal.message}</p>
                    
                    <div className="space-y-3 select-none">
                      {/* Local Storage Option */}
                      <button
                        onClick={modal.onLocalChoice}
                        disabled={isProcessing}
                        className="w-full flex items-center gap-4 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors disabled:opacity-50 select-none"
                      >
                        <div className="bg-blue-500 p-2 rounded-full select-none">
                          <HardDrive size={20} className="text-white" />
                        </div>
                        <div className="text-left flex-1 select-none">
                          <h4 className="font-medium text-gray-800 select-none">Local Device</h4>
                          <p className="text-sm text-gray-600 select-none">Save/load from your device storage</p>
                        </div>
                      </button>
                      
                      {/* Server Storage Option */}
                      <button
                        onClick={modal.onServerChoice}
                        disabled={isProcessing}
                        className="w-full flex items-center gap-4 p-4 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors disabled:opacity-50 select-none"
                      >
                        <div className="bg-green-500 p-2 rounded-full select-none">
                          <Cloud size={20} className="text-white" />
                        </div>
                        <div className="text-left flex-1 select-none">
                          <h4 className="font-medium text-gray-800 select-none">Server Backup</h4>
                          <p className="text-sm text-gray-600 select-none">Save/load from cloud server</p>
                        </div>
                      </button>
                    </div>
                    
                    {isProcessing && (
                      <div className="mt-4 text-center select-none">
                        <div className="inline-flex items-center gap-2 text-blue-600 select-none">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          <span className="select-none">Processing...</span>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Standard Modal Header */}
                  <div className="flex justify-between items-center p-6 border-b border-gray-200 select-none">
                    <div className="flex items-center gap-3 select-none">
                      <div className={`p-2 rounded-full select-none ${
                        modal.type === 'success' ? 'bg-green-100' :
                        modal.type === 'error' ? 'bg-red-100' :
                        'bg-yellow-100'
                      }`}>
                        {modal.type === 'success' ? (
                          <Database size={20} className="text-green-600" />
                        ) : modal.type === 'error' ? (
                          <X size={20} className="text-red-600" />
                        ) : (
                          <AlertTriangle size={20} className="text-yellow-600" />
                        )}
                      </div>
                      <h2 className="text-xl font-semibold text-gray-900 select-none">{modal.title}</h2>
                    </div>
                  </div>

                  {/* Standard Modal Content */}
                  <div className="p-6 select-none">
                    <p className="text-gray-700 whitespace-pre-line select-none">{modal.message}</p>
                    
                    <div className="flex gap-3 mt-6 select-none">
                      {modal.type === 'confirm' && modal.onCancel && (
                        <button
                          onClick={modal.onCancel}
                          className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors select-none"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        onClick={modal.onConfirm}
                        className={`${modal.type === 'confirm' ? 'flex-1' : 'w-full'} px-4 py-2 rounded-lg transition-colors select-none ${
                          modal.type === 'success' ? 'bg-green-500 hover:bg-green-600 text-white' :
                          modal.type === 'error' ? 'bg-red-500 hover:bg-red-600 text-white' :
                          'bg-blue-500 hover:bg-blue-600 text-white'
                        }`}
                      >
                        {modal.type === 'confirm' ? 'Continue' : 'OK'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          , document.body
        )}
      </>
      , document.body
    )
  );
};

export default UnifiedDataManager;