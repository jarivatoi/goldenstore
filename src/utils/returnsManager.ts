/**
 * Returns Manager - Handles persistent storage of order returns
 * Uses IndexedDB (GoldenStoreDB) for data persistence
 */

import { appDBManager } from './appIndexedDB';

export interface ReturnData {
  id: string;
  orderId: string;
  baseAmount: number;
  vatPercentage: number;
  vatAmount: number;
  totalReturnAmount: number;
  createdAt: string;
  lastEditedAt?: string;
}

const RETURNS_STORAGE_KEY = 'order_returns'; // Kept for backward compatibility with localStorage

/**
 * Initialize IndexedDB (call this during app initialization)
 */
export const initReturnsDB = async (): Promise<void> => {
  await appDBManager.initDB();
};

/**
 * Get all returns from IndexedDB
 */
export const getAllReturns = async (): Promise<ReturnData[]> => {
  try {
    return await appDBManager.getAllReturns();
  } catch (error) {
    console.error('Failed to get returns:', error);
    return [];
  }
};

/**
 * Get returns for a specific order
 */
export const getReturnsForOrder = async (orderId: string): Promise<ReturnData[]> => {
  try {
    const allReturns = await getAllReturns();
    return allReturns.filter(ret => ret.orderId === orderId);
  } catch (error) {
    console.error('Failed to get returns for order:', error);
    return [];
  }
};

/**
 * Add a new return to an order
 */
export const addReturn = async (returnData: Omit<ReturnData, 'id' | 'createdAt'>): Promise<ReturnData> => {
  try {
    console.log('[addReturn] Starting to add return:', returnData);
    const newReturn: ReturnData = {
      ...returnData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };
    
    console.log('[addReturn] Calling appDBManager.addReturn with:', newReturn);
    await appDBManager.addReturn(newReturn);
    console.log('[addReturn] Return added successfully:', newReturn);
    return newReturn;
  } catch (error) {
    console.error('[addReturn] Failed to add return:', error);
    throw error;
  }
};

/**
 * Delete a return
 */
export const deleteReturn = async (returnId: string): Promise<void> => {
  try {
    await appDBManager.deleteReturn(returnId);
  } catch (error) {
    console.error('Failed to delete return:', error);
    throw error;
  }
};

/**
 * Clear all returns for an order (e.g., when order is deleted)
 */
export const clearReturnsForOrder = async (orderId: string): Promise<void> => {
  try {
    const allReturns = await getAllReturns();
    const returnsForOrder = allReturns.filter(ret => ret.orderId !== orderId);
    await appDBManager.importReturns(returnsForOrder);
  } catch (error) {
    console.error('Failed to clear returns for order:', error);
    throw error;
  }
};

/**
 * Calculate total return amount for an order
 */
export const getTotalReturnAmount = async (orderId: string): Promise<number> => {
  try {
    const returns = await getReturnsForOrder(orderId);
    return returns.reduce((sum, ret) => sum + ret.totalReturnAmount, 0);
  } catch (error) {
    console.error('Failed to calculate total return amount:', error);
    return 0;
  }
};
