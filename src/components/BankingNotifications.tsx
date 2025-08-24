import React, { useState, useEffect } from 'react';
import { Bell, DollarSign, ArrowDownLeft, ArrowUpRight, CreditCard, User, Clock, Hash } from 'lucide-react';

interface BankingTransaction {
  id: string;
  type: 'RECEIVED' | 'SENT' | 'WITHDRAWAL' | 'UNKNOWN';
  amount: number;
  fromName?: string;
  toName?: string;
  reference: string;
  balance: number;
  timestamp: number;
  rawMessage: string;
}

interface BankingNotificationsProps {
  onTransactionReceived?: (transaction: BankingTransaction) => void;
}

/**
 * BANKING NOTIFICATIONS COMPONENT
 * ===============================
 * 
 * Displays real-time banking notifications from MCB SMS messages
 */
const BankingNotifications: React.FC<BankingNotificationsProps> = ({ onTransactionReceived }) => {
  const [transactions, setTransactions] = useState<BankingTransaction[]>([]);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Check if running on Android with SMS capabilities
  const isAndroidApp = () => {
    return typeof (window as any).AndroidSMS !== 'undefined';
  };

  // Check SMS permissions
  useEffect(() => {
    if (isAndroidApp()) {
      const hasPermission = (window as any).AndroidSMS.isSmsPermissionGranted();
      setIsPermissionGranted(hasPermission);
    }
  }, []);

  // Set up global handler for new banking transactions
  useEffect(() => {
    // Global function that Android will call
    (window as any).handleNewBankingTransaction = (transactionData: any) => {
      console.log('📨 New banking transaction received:', transactionData);
      
      const newTransaction: BankingTransaction = {
        id: `txn_${transactionData.timestamp}_${Math.random().toString(36).substr(2, 9)}`,
        type: transactionData.type,
        amount: transactionData.amount,
        fromName: transactionData.fromName,
        toName: transactionData.toName,
        reference: transactionData.reference,
        balance: transactionData.balance,
        timestamp: transactionData.timestamp,
        rawMessage: transactionData.rawMessage
      };
      
      // Add to transactions list
      setTransactions(prev => [newTransaction, ...prev.slice(0, 49)]); // Keep last 50
      
      // Show notification popup
      setShowNotifications(true);
      
      // Auto-hide after 5 seconds
      setTimeout(() => setShowNotifications(false), 5000);
      
      // Call callback if provided
      if (onTransactionReceived) {
        onTransactionReceived(newTransaction);
      }
      
      // Store in localStorage for persistence
      const stored = localStorage.getItem('bankingTransactions');
      const existingTransactions = stored ? JSON.parse(stored) : [];
      const updatedTransactions = [newTransaction, ...existingTransactions.slice(0, 99)]; // Keep last 100
      localStorage.setItem('bankingTransactions', JSON.stringify(updatedTransactions));
    };

    // Load existing transactions from localStorage
    const loadStoredTransactions = () => {
      const stored = localStorage.getItem('bankingTransactions');
      if (stored) {
        const storedTransactions = JSON.parse(stored);
        setTransactions(storedTransactions);
      }
    };

    loadStoredTransactions();

    // Cleanup
    return () => {
      delete (window as any).handleNewBankingTransaction;
    };
  }, [onTransactionReceived]);

  // Request SMS permissions
  const requestPermissions = () => {
    if (isAndroidApp()) {
      (window as any).AndroidSMS.requestSmsPermissions();
      // Check again after a delay
      setTimeout(() => {
        const hasPermission = (window as any).AndroidSMS.isSmsPermissionGranted();
        setIsPermissionGranted(hasPermission);
      }, 1000);
    }
  };

  // Get transaction icon
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'RECEIVED':
        return <ArrowDownLeft size={20} className="text-green-600" />;
      case 'SENT':
        return <ArrowUpRight size={20} className="text-red-600" />;
      case 'WITHDRAWAL':
        return <CreditCard size={20} className="text-orange-600" />;
      default:
        return <DollarSign size={20} className="text-gray-600" />;
    }
  };

  // Format transaction for display
  const formatTransaction = (transaction: BankingTransaction) => {
    const date = new Date(transaction.timestamp);
    const timeStr = date.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    const dateStr = date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short'
    });

    return {
      title: transaction.type === 'RECEIVED' 
        ? `Rs ${transaction.amount.toFixed(2)} received`
        : transaction.type === 'SENT'
        ? `Rs ${transaction.amount.toFixed(2)} sent`
        : `Rs ${transaction.amount.toFixed(2)} withdrawn`,
      subtitle: transaction.fromName || transaction.toName || 'MCB Transaction',
      time: `${timeStr} • ${dateStr}`,
      balance: `Balance: Rs ${transaction.balance.toFixed(2)}`
    };
  };

  if (!isAndroidApp()) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 m-4">
        <div className="flex items-center gap-3">
          <Bell size={20} className="text-yellow-600" />
          <div>
            <h4 className="font-medium text-yellow-800">Banking Notifications</h4>
            <p className="text-sm text-yellow-700">
              SMS banking notifications are only available in the Android app version.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Permission Request */}
      {!isPermissionGranted && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 m-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell size={20} className="text-blue-600" />
              <div>
                <h4 className="font-medium text-blue-800">Enable Banking Notifications</h4>
                <p className="text-sm text-blue-700">
                  Allow SMS access to automatically track MCB transactions
                </p>
              </div>
            </div>
            <button
              onClick={requestPermissions}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Enable
            </button>
          </div>
        </div>
      )}

      {/* Live Notification Popup */}
      {showNotifications && transactions.length > 0 && (
        <div className="fixed top-20 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50 animate-fade-in max-w-sm">
          <div className="flex items-center gap-3">
            {getTransactionIcon(transactions[0].type)}
            <div className="flex-1">
              <h4 className="font-medium text-gray-800">
                {formatTransaction(transactions[0]).title}
              </h4>
              <p className="text-sm text-gray-600">
                {formatTransaction(transactions[0]).subtitle}
              </p>
              <p className="text-xs text-gray-500">
                {formatTransaction(transactions[0]).balance}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Banking Transactions Panel */}
      {isPermissionGranted && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 m-4">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-full">
                  <DollarSign size={20} className="text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Banking Notifications</h3>
                  <p className="text-sm text-gray-600">Live MCB transaction tracking</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">{transactions.length} transactions</div>
                {transactions.length > 0 && (
                  <div className="text-xs text-green-600">
                    Last: {new Date(transactions[0].timestamp).toLocaleTimeString('en-GB', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Transactions List */}
          <div className="max-h-96 overflow-y-auto">
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="text-lg">No banking notifications yet</p>
                <p className="text-sm">MCB SMS messages will appear here automatically</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {transactions.map((transaction) => {
                  const formatted = formatTransaction(transaction);
                  return (
                    <div key={transaction.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getTransactionIcon(transaction.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium text-gray-800 truncate">
                              {formatted.title}
                            </h4>
                            <span className="text-xs text-gray-500 ml-2">
                              {formatted.time}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                            {(transaction.fromName || transaction.toName) && (
                              <div className="flex items-center gap-1">
                                <User size={14} />
                                <span className="truncate">
                                  {transaction.fromName || transaction.toName}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Hash size={14} />
                              <span>{transaction.reference}</span>
                            </div>
                          </div>
                          
                          <div className="text-xs text-gray-500">
                            {formatted.balance}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default BankingNotifications;