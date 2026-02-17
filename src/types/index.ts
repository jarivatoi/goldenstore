export interface PriceItem {
  id: string;
  name: string;
  price: number;
  grossPrice: number;
  createdAt: Date;
  lastEditedAt?: Date;
}
/**
 * TYPES/INDEX.TS - TYPE DEFINITIONS
 * =================================
 * 
 * OVERVIEW:
 * Central type definitions for the Golden Price List application.
 * Defines the core data structures and enums used throughout the app.
 * 
 * PURPOSE:
 * - Ensures type safety across all components
 * - Provides clear contracts for data structures
 * - Enables better IDE support and error catching
 * - Documents expected data shapes
 * 
 * USAGE:
 * Import these types in any component that needs them:
 * import { PriceItem, SortOption } from '../types';
 */

/**
 * PRICE ITEM INTERFACE
 * ===================
 * 
 * DESCRIPTION:
 * Core data structure representing a single item in the price list.
 * Used throughout the application for CRUD operations and display.
 * 
 * PROPERTIES:
 * @param id - Unique identifier (string timestamp)
 * @param name - Display name of the item (capitalized)
 * @param price - Price value in currency units (number with 2 decimals)
 * @param createdAt - Timestamp when item was first created
 * @param lastEditedAt - Optional timestamp of last modification
 * 
 * VALIDATION RULES:
 * - id: Must be unique, generated from Date.now().toString()
 * - name: Trimmed and capitalized, minimum 1 character
 * - price: Positive number, rounded to 2 decimal places
 * - createdAt: Set automatically on creation
 * - lastEditedAt: Set automatically on updates
 * 
 * STORAGE:
 * - Stored in IndexedDB for offline access
 * - Synchronized between memory and database
 * - Exported/imported as JSON with ISO date strings
 */
/**
 * SORT OPTION TYPE
 * ================
 * 
 * DESCRIPTION:
 * Union type defining all available sorting options for the price list.
 * Used by the search/filter component and context state management.
 * 
 * AVAILABLE OPTIONS:
 * - 'name-asc': Sort by name A to Z (alphabetical ascending)
 * - 'name-desc': Sort by name Z to A (alphabetical descending)
 * - 'price-asc': Sort by price low to high (numerical ascending)
 * - 'price-desc': Sort by price high to low (numerical descending)
 * - 'date-asc': Sort by creation date oldest first (chronological ascending)
 * - 'date-desc': Sort by creation date newest first (chronological descending)
 * 
 * DEFAULT:
 * The application defaults to 'date-desc' to show newest items first.
 * 
 * IMPLEMENTATION:
 * Used in PriceListContext.sortItems() method for array sorting logic.
 * Stored in component state and persisted during session.
 */
export type SortOption = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'date-asc' | 'date-desc';

/**
 * CREDIT MANAGEMENT TYPES
 * =======================
 */

/**
 * CLIENT INTERFACE
 * ================
 * 
 * Represents a client in the credit management system
 */
export interface Client {
  id: string; // Unique client ID (auto-generated)
  name: string; // Client name
  totalDebt: number; // Total outstanding amount
  bottlesOwed: {
    beer: number;
    guinness: number;
    malta: number;
    coca: number;
    chopines: number;
  }; // Bottles and chopines owed by client
  createdAt: Date; // When client was first added
  lastTransactionAt: Date; // Last transaction date
}

/**
 * CREDIT TRANSACTION INTERFACE
 * ============================
 * 
 * Represents individual transactions/items taken by clients
 */
export interface CreditTransaction {
  id: string; // Unique transaction ID
  clientId: string; // Reference to client
  description: string; // Item/article description
  amount: number; // Amount in Rs
  date: Date; // Date when item was taken
  type: 'debt' | 'payment'; // Transaction type
}

/**
 * PAYMENT RECORD INTERFACE
 * ========================
 * 
 * Represents partial payments made by clients
 */
export interface PaymentRecord {
  id: string; // Unique payment ID
  clientId: string; // Reference to client
  amount: number; // Payment amount in Rs
  date: Date; // Payment date
  type: 'partial' | 'full'; // Payment type
}

/**
 * OVER ITEM INTERFACE
 * ===================
 * 
 * Represents items that are over/out of stock and need to be bought
 */
export interface OverItem {
  id: string; // Unique item ID
  name: string; // Item name
  createdAt: Date; // When item was added to over list
  isCompleted: boolean; // Whether item has been bought/restocked
  completedAt?: Date; // When item was marked as completed
}

/**
 * ORDER MANAGEMENT TYPES
 * ======================
 */

/**
 * ORDER CATEGORY INTERFACE
 * ========================
 * 
 * Represents a category of orders (e.g., cigarette, rum, etc.)
 */
export interface OrderCategory {
  id: string; // Unique category ID
  name: string; // Category name (e.g., "Cigarette", "Rum")
  vatPercentage: number; // Global VAT percentage for this category (default 15)
  createdAt: Date; // When category was created
}

/**
 * ORDER ITEM TEMPLATE INTERFACE
 * ========================
 * 
 * Represents a product template within a category (e.g., "Matinee" in cigarette category)
 */
export interface OrderItemTemplate {
  id: string; // Unique template ID
  categoryId: string; // Reference to category
  name: string; // Product name (e.g., "Matinee", "Palmal")
  unitPrice: number; // Default unit price
  isVatNil: boolean; // Whether item is VAT exempt
  vatPercentage: number; // VAT percentage (default 15)
  createdAt: Date; // When template was created
}

/**
 * ORDER ITEM INTERFACE
 * ====================
 * 
 * Represents an actual order item with quantity, pricing, and availability
 */
export interface OrderItem {
  id: string; // Unique order item ID
  templateId: string; // Reference to item template
  quantity: number; // Quantity ordered
  unitPrice: number; // Price per unit
  isVatNil: boolean; // Whether item is VAT exempt
  vatAmount: number; // VAT amount (15% of unit price * quantity)
  totalPrice: number; // (quantity * unitPrice) + vatAmount
  isAvailable: boolean; // Whether item is available (affects calculation)
}

/**
 * ORDER INTERFACE
 * ===============
 * 
 * Represents a complete order with date and items
 */
export interface Order {
  id: string; // Unique order ID
  categoryId: string; // Reference to category
  orderDate: Date; // Date of the order
  items: OrderItem[]; // Array of order items
  totalCost: number; // Sum of all item total prices
  createdAt: Date; // When order was created
  lastEditedAt?: Date; // When order was last modified
}