/**
 * DATABASE RESTORE
 * =================
 *
 * Shared restore path used by the Data Manager import and by the automatic
 * first-launch restore. Replaces the content of every module in IndexedDB.
 */

import { appDBManager } from './appIndexedDB';
import { creditDBManager } from './creditIndexedDB';

export interface SnapshotCounts {
  priceList: number;
  clients: number;
  transactions: number;
  payments: number;
  overItems: number;
  orderCategories: number;
  orderTemplates: number;
  orders: number;
  returns: number;
  total: number;
}

/**
 * Count the records contained in a backup snapshot
 */
export const countSnapshotRecords = (data: any): SnapshotCounts => {
  const counts = {
    priceList: data?.priceList?.items?.length || 0,
    clients: data?.creditManagement?.clients?.length || 0,
    transactions: data?.creditManagement?.transactions?.length || 0,
    payments: data?.creditManagement?.payments?.length || 0,
    overItems: data?.overManagement?.items?.length || 0,
    orderCategories: data?.orderManagement?.categories?.length || 0,
    orderTemplates: data?.orderManagement?.itemTemplates?.length || 0,
    orders: data?.orderManagement?.orders?.length || 0,
    returns: Array.isArray(data?.returns) ? data.returns.length : 0,
    total: 0
  };

  counts.total =
    counts.priceList +
    counts.clients +
    counts.transactions +
    counts.payments +
    counts.overItems +
    counts.orderCategories +
    counts.orderTemplates +
    counts.orders +
    counts.returns;

  return counts;
};

/**
 * Records held by each store on this device
 */
export interface LocalDataSummary {
  priceList: number;
  clients: number;
  transactions: number;
  payments: number;
  overItems: number;
  orders: number;
  returns: number;
  orderCategories: number;
  orderTemplates: number;
  total: number;
}

const STORE_LABELS: Array<[keyof Omit<LocalDataSummary, 'total'>, string, string]> = [
  ['clients', 'client', 'clients'],
  ['transactions', 'transaction', 'transactions'],
  ['payments', 'payment', 'payments'],
  ['priceList', 'price item', 'price items'],
  ['orders', 'order', 'orders'],
  ['overItems', 'over item', 'over items'],
  ['returns', 'return', 'returns'],
  ['orderCategories', 'order category', 'order categories'],
  ['orderTemplates', 'order template', 'order templates']
];

/**
 * Short human summary such as "256 clients, 1193 transactions, 99 price items"
 */
export const describeLocalDataSummary = (summary: LocalDataSummary): string => {
  const parts = STORE_LABELS.filter(([key]) => summary[key] > 0)
    .sort((a, b) => summary[b[0]] - summary[a[0]])
    .slice(0, 3)
    .map(([key, singular, plural]) => `${summary[key]} ${summary[key] === 1 ? singular : plural}`);

  return parts.length > 0 ? parts.join(', ') : 'no records';
};

/**
 * What does this device already hold? Counts only, so nothing large is read.
 * Returns null when the database cannot be read, so callers can decide to do
 * nothing instead of risking a wrong answer.
 */
export const describeLocalData = async (): Promise<LocalDataSummary | null> => {
  try {
    await appDBManager.initDB();
    await creditDBManager.initDB();

    const [priceList, clients, transactions, payments, overItems, orders, returns, orderCategories, orderTemplates] =
      await Promise.all([
        appDBManager.countRecords('priceList'),
        creditDBManager.countRecords('clients'),
        creditDBManager.countRecords('transactions'),
        creditDBManager.countRecords('payments'),
        appDBManager.countRecords('overItems'),
        appDBManager.countRecords('orders'),
        appDBManager.countRecords('orderReturns'),
        appDBManager.countRecords('orderCategories'),
        appDBManager.countRecords('orderTemplates')
      ]);

    const summary: LocalDataSummary = {
      priceList,
      clients,
      transactions,
      payments,
      overItems,
      orders,
      returns,
      orderCategories,
      orderTemplates,
      total: 0
    };

    summary.total =
      priceList + clients + transactions + payments + overItems + orders + returns + orderCategories + orderTemplates;

    return summary;
  } catch (error) {
    console.error('❌ Could not read local database:', error);
    return null;
  }
};

/**
 * Does this device hold any business record at all?
 */
export const hasLocalData = async (): Promise<boolean | null> => {
  const summary = await describeLocalData();
  return summary === null ? null : summary.total > 0;
};

/**
 * Write a snapshot into IndexedDB, replacing the current data module by module.
 */
export const restoreDatabase = async (
  data: any,
  onProgress?: (percent: number, label: string) => void
): Promise<SnapshotCounts> => {
  const counts = countSnapshotRecords(data);
  const report = (percent: number, label: string) => onProgress?.(percent, label);

  await creditDBManager.initDB();
  await appDBManager.initDB();

  report(5, 'Preparing local database...');

  if (data?.priceList?.items) {
    await appDBManager.savePriceListItems(data.priceList.items);
  }
  report(15, `Restoring price list (${counts.priceList})...`);

  if (data?.creditManagement?.clients) {
    await creditDBManager.saveAllClients(data.creditManagement.clients);
  }
  report(30, `Restoring clients (${counts.clients})...`);

  if (data?.creditManagement?.transactions) {
    await creditDBManager.saveAllTransactions(data.creditManagement.transactions);
  }
  report(45, `Restoring transactions (${counts.transactions})...`);

  if (data?.creditManagement?.payments) {
    await creditDBManager.saveAllPayments(data.creditManagement.payments);
  }
  report(58, `Restoring payments (${counts.payments})...`);

  if (data?.overManagement?.items) {
    await appDBManager.saveOverItems(data.overManagement.items);
  }
  report(68, `Restoring over items (${counts.overItems})...`);

  if (data?.orderManagement?.categories) {
    await appDBManager.saveOrderCategories(data.orderManagement.categories);
  }
  if (data?.orderManagement?.itemTemplates) {
    await appDBManager.saveOrderTemplates(data.orderManagement.itemTemplates);
  }
  report(78, 'Restoring order templates...');

  if (data?.orderManagement?.orders) {
    await appDBManager.saveOrders(data.orderManagement.orders);
  }
  report(90, `Restoring orders (${counts.orders})...`);

  if (Array.isArray(data?.returns)) {
    await appDBManager.importReturns(data.returns);
  }
  report(100, `Restored ${counts.total} records`);

  return counts;
};
