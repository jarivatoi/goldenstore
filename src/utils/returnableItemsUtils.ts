import { CreditTransaction } from '../types';

/**
 * SIMPLIFIED RETURNABLE ITEMS PROCESSING
 * =====================================
 *
 * Rules:
 * 1. Split description by comma
 * 2. For each segment, look for "Chopine" or "Bouteille"
 * 3. Everything BEFORE = quantity (default 1 if no number)
 * 4. Everything AFTER = brand
 * 5. Format: [quantity] Chopine/Bouteille [brand]
 */

interface ReturnableItem {
  quantity: number;
  type: 'Chopine' | 'Bouteille';
  brand: string;
}

/**
 * Parses a description segment and extracts returnable items
 */
function parseReturnableSegment(segment: string): ReturnableItem | null {
  const cleaned = segment.trim();

  // Check if contains Chopine or Bouteille
  const hasChopine = /chopine/i.test(cleaned);
  const hasBouteille = /bouteille/i.test(cleaned);

  if (!hasChopine && !hasBouteille) {
    return null;
  }

  const type = hasChopine ? 'Chopine' : 'Bouteille';
  const keyword = hasChopine ? 'chopine' : 'bouteille';

  // Split by the keyword (case insensitive)
  const regex = new RegExp(keyword, 'i');
  const parts = cleaned.split(regex);

  if (parts.length < 2) {
    return null;
  }

  // Everything before keyword = quantity
  const beforeKeyword = parts[0].trim();
  let quantity = 1;

  // Extract number from before part
  const numberMatch = beforeKeyword.match(/(\d+)/);
  if (numberMatch) {
    quantity = parseInt(numberMatch[1]);
  }

  // Everything after keyword = brand
  const brand = parts[1].trim();

  return {
    quantity,
    type,
    brand
  };
}

/**
 * Process description and extract all returnable items
 */
function extractReturnableItems(description: string): { [key: string]: number } {
  const items: { [key: string]: number } = {};

  // Split by comma
  const segments = description.split(',');

  for (const segment of segments) {
    const item = parseReturnableSegment(segment);

    if (item) {
      // Create key: "Chopine Brand" or "Bouteille Brand"
      const key = item.brand ? `${item.type} ${item.brand}` : item.type;

      if (!items[key]) {
        items[key] = 0;
      }
      items[key] += item.quantity;
    }
  }

  return items;
}

/**
 * Process "Returned:" transactions to extract returned quantities
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
      // Pattern: [number] chopine/bouteille brand
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
 * @returns Array of returnable items with text, date, and time
 */
export const calculateReturnableItemsWithDates = (clientTransactions: CreditTransaction[]): {text: string, date: string, time: string}[] => {
  const returnableItems: {[key: string]: number} = {};

  // Step 1: Extract all returnable items from debt transactions
  clientTransactions.forEach(transaction => {
    // Skip payments and return transactions
    if (transaction.type === 'payment' ||
        transaction.description.toLowerCase().includes('returned')) {
      return;
    }

    const description = transaction.description;

    // Only process if contains Chopine or Bouteille
    if (!description.toLowerCase().includes('chopine') &&
        !description.toLowerCase().includes('bouteille')) {
      return;
    }

    const items = extractReturnableItems(description);

    // Add to total
    for (const [key, quantity] of Object.entries(items)) {
      if (!returnableItems[key]) {
        returnableItems[key] = 0;
      }
      returnableItems[key] += quantity;
    }
  });

  // Step 2: Extract returned quantities
  const returnedQuantities: {[key: string]: number} = {};
  const returnableKeys = Object.keys(returnableItems);

  clientTransactions
    .filter(transaction => transaction.description.toLowerCase().includes('returned'))
    .forEach(transaction => {
      const returned = extractReturnedItems(transaction.description, returnableKeys);

      for (const [key, quantity] of Object.entries(returned)) {
        if (!returnedQuantities[key]) {
          returnedQuantities[key] = 0;
        }
        returnedQuantities[key] += quantity;
      }
    });

  // Step 3: Calculate net quantities and format output
  const result: {text: string, date: string, time: string}[] = [];

  for (const [itemType, total] of Object.entries(returnableItems)) {
    const returned = returnedQuantities[itemType] || 0;
    const remaining = Math.max(0, total - returned);

    if (remaining > 0) {
      // Get most recent transaction date for this item
      const recentTransaction = clientTransactions
        .filter(transaction => {
          if (transaction.type !== 'debt' || transaction.description.toLowerCase().includes('returned')) {
            return false;
          }
          // Check if this transaction contains this exact item (case-insensitive)
          const lowerDesc = transaction.description.toLowerCase();
          const lowerItemType = itemType.toLowerCase();
          return lowerDesc.includes(lowerItemType);
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

      const transactionDate = recentTransaction ? new Date(recentTransaction.date) : new Date();

      // Format date and time
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
      const [type, ...brandParts] = itemType.split(' ');
      const brand = brandParts.join(' ');

      let displayText: string;
      if (brand) {
        // Use brand as-is, preserving original case
        displayText = `${remaining} ${type}${remaining > 1 ? 's' : ''} ${brand}`;
      } else {
        displayText = `${remaining} ${type}${remaining > 1 ? 's' : ''}`;
      }

      result.push({
        text: displayText,
        date: formattedDate,
        time: formattedTime
      });
    }
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
