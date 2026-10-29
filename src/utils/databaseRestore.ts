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
 * Does this device hold any business record at all?
 * Checks the small modules first and stops at the first hit, so a normal launch
 * never reads the whole database. Returns null when the database cannot be read,
 * so callers can decide to do nothing instead of risking a wrong answer.
 */
export const hasLocalData = async (): Promise<boolean | null> => {
  try {
    await appDBManager.initDB();
    await creditDBManager.initDB();

    const checks = [
      () => appDBManager.getPriceListItems(),
      () => creditDBManager.getAllClients(),
      () => appDBManager.getOrders(),
      () => appDBManager.getOverItems(),
      () => creditDBManager.getAllPayments(),
      () => creditDBManager.getAllTransactions(),
      () => appDBManager.getAllReturns(),
      () => appDBManager.getOrderCategories(),
      () => appDBManager.getOrderTemplates()
    ];

    for (const check of checks) {
      const rows = await check();
      if (Array.isArray(rows) && rows.length > 0) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('❌ Could not read local database:', error);
    return null;
  }
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
