import { CreditTransaction } from '../types';

/**
 * SIMPLIFIED RETURNABLE ITEMS PROCESSING
 * =====================================
 *
 * Rules:
 * 1. Split description by comma
 * 2. For each segment, look for "Chopine", "Bouteille", or "Caisse"
 * 3. Everything BEFORE = quantity (default 1 if no number)
 * 4. Everything AFTER = brand
 * 5. Format: [quantity] Chopine/Bouteille/Caisse [brand]
 */

interface ReturnableItem {
  quantity: number;
  type: 'Chopine' | 'Bouteille' | 'Caisse';
  brand: string;
  displayBrand: string; // Preserve original case for display
}

/**
 * Parses a description segment and extracts returnable items
 * IMPROVED: Handles typos and variations (e.g., "Bouteiiles", numeric brands)
 */
function parseReturnableSegment(segment: string, debug = false): ReturnableItem | null {
  const cleaned = segment.trim();
  const lowerCleaned = cleaned.toLowerCase();

  if (debug) console.log('[parseReturnableSegment] Segment:', segment);

  // Match exact keywords (case insensitive, optional plural 's')
  const chopineMatch = lowerCleaned.match(/chopines?/i);
  const bouteilleMatch = lowerCleaned.match(/bouteilles?/i);
  const caisseMatch = lowerCleaned.match(/caisses?/i);

  if (!chopineMatch && !bouteilleMatch && !caisseMatch) {
    if (debug) console.log('[parseReturnableSegment] No match found');
    return null;
  }

  let type: 'Chopine' | 'Bouteille' | 'Caisse';
  let matchedKeyword: string;
  let matchIndex: number;

  if (chopineMatch) {
    type = 'Chopine';
    matchedKeyword = chopineMatch[0];
    matchIndex = lowerCleaned.indexOf(matchedKeyword);
  } else if (bouteilleMatch) {
    type = 'Bouteille';
    matchedKeyword = bouteilleMatch[0];
    matchIndex = lowerCleaned.indexOf(matchedKeyword);
  } else {
    type = 'Caisse';
    matchedKeyword = caisseMatch![0];
    matchIndex = lowerCleaned.indexOf(matchedKeyword);
  }

  // Split by the matched position
  const beforeKeyword = cleaned.substring(0, matchIndex).trim();
  const afterKeyword = cleaned.substring(matchIndex + matchedKeyword.length).trim();

  // Extract quantity from before part
  let quantity = 1;
  const numberMatch = beforeKeyword.match(/(\d+)/);
  if (numberMatch) {
    quantity = parseInt(numberMatch[1]);
  }

  // Everything after keyword = brand
  let brandOriginal = afterKeyword;
  const brandNormalized = afterKeyword.toLowerCase();

  // Capitalize brands starting with digits (e.g., "7seas" -> "7Seas", "7Seas" -> "7Seas")
  // This ensures consistent display format
  if (brandOriginal && /^\d/.test(brandOriginal)) {
    // Check if this is a unit measurement (e.g., "1L", "1.5L", "2L") - preserve uppercase L
    if (/^\d+\.?\d*[lL]$/i.test(brandOriginal)) {
      // Format as number + uppercase L (e.g., "1l" â†’ "1L", "1.5l" â†’ "1.5L")
      brandOriginal = brandOriginal.slice(0, -1) + 'L';
    } else {
      const match = brandOriginal.match(/^(\d+)(.*)$/);
      if (match && match[2]) {
        const digits = match[1];
        const letters = match[2];
        // Handle unit measurements followed by brand names (e.g., "1L Coca")
        // Look for patterns like "1L", "1.5L", etc. followed by a space and brand
        const unitBrandMatch = letters.match(/^([\d.]*[lL])\s+(.+)$/i);
        if (unitBrandMatch) {
          // Extract unit measurement and brand separately
          const unit = unitBrandMatch[1];
          const brand = unitBrandMatch[2];
          // Preserve original case of the brand name, format unit properly
          brandOriginal = digits + unit.toUpperCase().replace(/l$/, 'L') + ' ' + brand;
        } else {
          // No unit measurement pattern - treat as single word
          brandOriginal = digits + letters.charAt(0).toUpperCase() + letters.slice(1).toLowerCase();
        }
      }
    }
  }

  const result = {
    quantity,
    type,
    brand: brandNormalized,        // Normalized for key matching
    displayBrand: brandOriginal     // Original case for display (fixed if starts with digit)
  };

  if (debug) console.log('[parseReturnableSegment] Parsed item:', result);

  return result;
}

/**
 * Process description and extract all returnable items
 */
function extractReturnableItems(description: string, debug = false): {
  items: { [key: string]: number };
  displayBrands: { [key: string]: string }; // Map normalized key to display brand
} {
  const items: { [key: string]: number } = {};
  const displayBrands: { [key: string]: string } = {};

  if (debug) console.log('[extractReturnableItems] Description:', description);

  // Split by comma
  const segments = description.split(',');

  for (const segment of segments) {
    const item = parseReturnableSegment(segment, debug);

    if (item) {
      // Create key using normalized brand: "Chopine brand" or "Bouteille brand"
      const key = item.brand ? `${item.type} ${item.brand}` : item.type;

      if (debug) console.log('[extractReturnableItems] Parsed item:', item);

      if (!items[key]) {
        items[key] = 0;
      }
      items[key] += item.quantity;

      // Store the display brand (original case) for this key
      if (item.brand) {
        displayBrands[key] = item.displayBrand;
      }
    }
  }

  return { items, displayBrands };
}

/**
 * Process "Returned:" transactions to extract returned quantities
 * IMPROVED: Handles typos and numeric brands better
 */
function extractReturnedItems(description: string, returnableKeys: string[]): { [key: string]: number } {
  const returned: { [key: string]: number } = {};
  const lowerDesc = description.toLowerCase();

  // Must contain "returned:"
  if (!lowerDesc.includes('returned:')) {
    return returned;
  }

  // Extract the part after "returned:"
  const returnedPart = lowerDesc.split('returned:')[1];
  if (!returnedPart) {
    return returned;
  }

  // For each returnable key, check if it was returned
  for (const key of returnableKeys) {
    const lowerKey = key.toLowerCase();
    const [type, ...brandParts] = lowerKey.split(' ');
    const brand = brandParts.join(' ');

    // Build pattern: look for quantity + type (+ optional brand)
    let pattern: RegExp;

    if (brand) {
      // Pattern: exact type match + brand
      const escapedBrand = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      pattern = new RegExp(`(\\d+)\\s+${type}s?\\s+${escapedBrand}`, 'i');
    } else {
      // Pattern: [number] chopine/bouteille (but not followed by a brand)
      pattern = new RegExp(`(\\d+)\\s+${type}s?(?=\\s*(?:-|$))`, 'i');
    }

    const match = returnedPart.match(pattern);
    if (match) {
      returned[key] = parseInt(match[1]);
    }
  }

  return returned;
}

/**
 * Calculates returnable items for a client with dates
 * @param clientTransactions - Array of client transactions
 * @param clientName - Client name (optional, used for debugging)
 * @returns Array of returnable items with text, date, and time
 *
 * OPTIMIZED: Single-pass algorithm for better performance
 */
export const calculateReturnableItemsWithDates = (clientTransactions: CreditTransaction[], clientName?: string): {text: string, date: string, time: string}[] => {
  const DEBUG_CLIENT = 'Viraj';
  const shouldLog = clientName === DEBUG_CLIENT;
  const returnableItems: {[key: string]: number} = {};
  const returnedQuantities: {[key: string]: number} = {};
  const displayBrands: {[key: string]: string} = {};
  const recentTransactionDates: {[key: string]: Date} = {};

  // CRITICAL FIX: Sort transactions by date to ensure returns are processed after debts
  const sortedTransactions = [...clientTransactions].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateA - dateB; // Oldest first
  });

  // OPTIMIZED: Single pass through all transactions
  for (const transaction of sortedTransactions) {
    const descLower = transaction.description.toLowerCase();
    const isReturned = descLower.includes('returned');
    const isPayment = transaction.type === 'payment';

    // Skip payments
    if (isPayment) continue;

    // Check for exact returnable keywords only
    const hasReturnableKeyword = /chopines?/i.test(descLower) ||
                                  /bouteilles?/i.test(descLower) ||
                                  /caisses?/i.test(descLower);

    if (!hasReturnableKeyword) continue;

    if (isReturned) {
      // Process returned items
      const returnableKeys = Object.keys(returnableItems);
      if (returnableKeys.length === 0) continue; // Skip if no items to return yet

      const returned = extractReturnedItems(transaction.description, returnableKeys);

      for (const [key, quantity] of Object.entries(returned)) {
        returnedQuantities[key] = (returnedQuantities[key] || 0) + quantity;
      }
    } else {
      // Process debt transactions with returnable items
      if (shouldLog) console.log('[calculateReturnableItemsWithDates] Processing transaction:', transaction);
      const result = extractReturnableItems(transaction.description, shouldLog);
      const transactionDate = new Date(transaction.date);

      if (shouldLog) console.log('[calculateReturnableItemsWithDates] Extracted items:', result);

      for (const [key, quantity] of Object.entries(result.items)) {
        // Keys are already normalized (Chopine/Bouteille/Caisse)
        returnableItems[key] = (returnableItems[key] || 0) + quantity;

        // Store display brand
        if (result.displayBrands[key]) {
          displayBrands[key] = result.displayBrands[key];
        }

        // Track most recent transaction date
        if (!recentTransactionDates[key] || transactionDate > recentTransactionDates[key]) {
          recentTransactionDates[key] = transactionDate;
        }
      }
    }
  }

  // OPTIMIZED: Build result array with pre-calculated values
  const result: {text: string, date: string, time: string}[] = [];

  for (const [itemType, total] of Object.entries(returnableItems)) {
    const returned = returnedQuantities[itemType] || 0;
    const remaining = total - returned;

    if (remaining <= 0) continue;

    const transactionDate = recentTransactionDates[itemType] || new Date();

    // Format date and time once
    const formattedDate = transactionDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit'
    });

    const formattedTime = transactionDate.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    // Format display text with pluralization
    const spaceIndex = itemType.indexOf(' ');
    const type = spaceIndex > 0 ? itemType.substring(0, spaceIndex) : itemType;
    const brandNormalized = spaceIndex > 0 ? itemType.substring(spaceIndex + 1) : '';

    let displayText: string;
    if (brandNormalized) {
      const brandToDisplay = displayBrands[itemType] || brandNormalized;
      displayText = `${remaining} ${type}${remaining > 1 ? 's' : ''} ${brandToDisplay}`;
    } else {
      displayText = `${remaining} ${type}${remaining > 1 ? 's' : ''}`;
    }

    result.push({
      text: displayText,
      date: formattedDate,
      time: formattedTime
    });
  }

  return result;
};

/**
 * Calculates net returnable items count for a client (without dates)
 * @param clientTransactions - Array of client transactions
 * @returns Array of returnable item strings
 */
export const calculateReturnableItems = (clientTransactions: CreditTransaction[]): string[] => {
  const withDates = calculateReturnableItemsWithDates(clientTransactions);
  return withDates.map(item => item.text);
};
