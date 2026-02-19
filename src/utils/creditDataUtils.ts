/**
 * CREDIT DATA UTILITIES
 * =====================
 *
 * Utility functions for credit data management and export/import operations
 */

import { creditDBManager } from './creditIndexedDB';

export interface NotificationCallbacks {
  showAlert: (options: { type: 'success' | 'error'; message: string }) => void;
  showConfirm: (options: { title: string; message: string; type?: 'warning' }) => Promise<boolean>;
}

/**
 * Exports complete database from all modules
 */
export const exportCompleteDatabase = async (notifications?: NotificationCallbacks): Promise<void> => {
  try {
    const now = new Date();
    const day = now.getDate().toString().padStart(2, '0');
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear();
    const dateString = `${day}-${month}-${year}`;

    // Initialize IndexedDB for credit data
    await creditDBManager.initDB();

    // Get data from all modules
    const priceListData = localStorage.getItem('priceListItems');
    const creditClientsData = await creditDBManager.getAllClients();
    const creditTransactionsData = await creditDBManager.getAllTransactions();
    const creditPaymentsData = await creditDBManager.getAllPayments();
    const overItemsData = localStorage.getItem('overItems');
    const orderCategoriesData = localStorage.getItem('orderCategories');
    const orderTemplatesData = localStorage.getItem('orderItemTemplates');
    const ordersData = localStorage.getItem('orders');
    
    const exportData = {
      version: '2.0',
      appName: 'Golden Store',
      exportDate: new Date().toISOString(),

      // Price List data
      priceList: {
        items: priceListData ? JSON.parse(priceListData) : []
      },

      // Credit Management data (from IndexedDB)
      creditManagement: {
        clients: creditClientsData || [],
        transactions: creditTransactionsData || [],
        payments: creditPaymentsData || []
      },

      // Over Management data
      overManagement: {
        items: overItemsData ? JSON.parse(overItemsData) : []
      },

      // Order Management data
      orderManagement: {
        categories: orderCategoriesData ? JSON.parse(orderCategoriesData) : [],
        itemTemplates: orderTemplatesData ? JSON.parse(orderTemplatesData) : [],
        orders: ordersData ? JSON.parse(ordersData) : []
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
    if (notifications) {
      notifications.showAlert({ type: 'success', message: 'Complete database exported successfully!' });
    } else {
      alert('Complete database exported successfully!');
    }
  } catch (error) {
    if (notifications) {
      notifications.showAlert({ type: 'error', message: 'Error exporting complete database. Please try again.' });
    } else {
      alert('Error exporting complete database. Please try again.');
    }
  }
};

/**
 * Imports complete database to all modules
 */
export const importCompleteDatabase = (notifications?: NotificationCallbacks): Promise<void> => {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);
          
          // Validate file format
          if (!data.version || (!data.priceList && !data.creditManagement && !data.overManagement && !data.orderManagement)) {
            throw new Error('Invalid Golden Store database file format');
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

          const confirmImport = notifications
            ? await notifications.showConfirm({
                title: 'Confirm Import',
                message: `This will import a complete Golden Store database with ${totalItems} total records across all modules:\n\n• Price List: ${data.priceList?.items?.length || 0} items\n• Credit: ${data.creditManagement?.clients?.length || 0} clients, ${data.creditManagement?.transactions?.length || 0} transactions\n• Over Items: ${data.overManagement?.items?.length || 0} items\n• Orders: ${data.orderManagement?.categories?.length || 0} categories, ${data.orderManagement?.orders?.length || 0} orders\n\nThis will REPLACE ALL your current data. This action cannot be undone.\n\nAre you sure you want to continue?`,
                type: 'warning'
              })
            : window.confirm(
                `This will import a complete Golden Store database with ${totalItems} total records across all modules:\n\n` +
                `• Price List: ${data.priceList?.items?.length || 0} items\n` +
                `• Credit: ${data.creditManagement?.clients?.length || 0} clients, ${data.creditManagement?.transactions?.length || 0} transactions\n` +
                `• Over Items: ${data.overManagement?.items?.length || 0} items\n` +
                `• Orders: ${data.orderManagement?.categories?.length || 0} categories, ${data.orderManagement?.orders?.length || 0} orders\n\n` +
                `This will REPLACE ALL your current data. This action cannot be undone.\n\n` +
                `Are you sure you want to continue?`
              );

          if (confirmImport) {
            // Initialize IndexedDB for credit data
            await creditDBManager.initDB();

            // Import Price List data to localStorage
            if (data.priceList?.items) {
              localStorage.setItem('priceListItems', JSON.stringify(data.priceList.items));
            }

            // Import credit data to IndexedDB (NOT localStorage to avoid quota issues)
            if (data.creditManagement?.clients) {
              await creditDBManager.saveAllClients(data.creditManagement.clients);
            }
            if (data.creditManagement?.transactions) {
              await creditDBManager.saveAllTransactions(data.creditManagement.transactions);
            }
            if (data.creditManagement?.payments) {
              await creditDBManager.saveAllPayments(data.creditManagement.payments);
            }

            // Import Over Management data to localStorage
            if (data.overManagement?.items) {
              localStorage.setItem('overItems', JSON.stringify(data.overManagement.items));
            }

            // Import Order Management data to localStorage
            if (data.orderManagement?.categories) {
              localStorage.setItem('orderCategories', JSON.stringify(data.orderManagement.categories));
            }
            if (data.orderManagement?.itemTemplates) {
              localStorage.setItem('orderItemTemplates', JSON.stringify(data.orderManagement.itemTemplates));
            }
            if (data.orderManagement?.orders) {
              localStorage.setItem('orders', JSON.stringify(data.orderManagement.orders));
            }

            if (notifications) {
              notifications.showAlert({ type: 'success', message: `Successfully imported complete Golden Store database!\n\nPlease refresh the page to see all imported data.` });
            } else {
              alert(`Successfully imported complete Golden Store database!\n\nPlease refresh the page to see all imported data.`);
            }

            // Refresh the page to reload all data
            window.location.reload();
            resolve();
          } else {
            reject(new Error('Import cancelled by user'));
          }
        } catch (error) {
          // Handle parsing and validation errors
          if (notifications) {
            notifications.showAlert({ type: 'error', message: 'Error importing database file. Please check the file format and try again.' });
          } else {
            alert('Error importing database file. Please check the file format and try again.');
          }
          reject(error);
        }
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  });
};