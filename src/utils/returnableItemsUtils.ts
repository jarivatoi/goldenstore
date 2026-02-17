import { CreditTransaction } from '../types';

/**
 * Calculates returnable items for a client
 * @param clientTransactions - Array of client transactions
 * @returns Array of returnable items with text, date, and time
 */
export const calculateReturnableItemsWithDates = (clientTransactions: CreditTransaction[]): {text: string, date: string, time: string}[] => {
  const returnableItems: {[key: string]: number} = {};
  
  clientTransactions.forEach(transaction => {
    // Only process debt transactions (not payments) AND exclude return transactions
    if (transaction.type === 'payment' || transaction.description.toLowerCase().includes('returned') || transaction.description.toLowerCase().includes('return') || (transaction.description.toLowerCase().includes('caisse') && transaction.description.toLowerCase().includes('returned'))) {
      return;
    }

    const description = transaction.description.toLowerCase();
    console.log('🔍 Processing transaction:', transaction.description, '→', description);

    // Only process items that contain "chopine" or "bouteille"
    if (!description.includes('chopine') && !description.includes('bouteille')) {
      console.log('⏭️ Skipping - no chopine/bouteille:', description);
      return;
    }

    // Look for Chopine items
    const chopinePattern = /(\d+)\s+chopines?(?:\s+([^,]*))?/gi;
    let chopineMatch;

    while ((chopineMatch = chopinePattern.exec(description)) !== null) {
      const quantity = parseInt(chopineMatch[1]);
      const brand = chopineMatch[2]?.trim() || '';
      console.log('🍺 Chopine match:', { quantity, brand, fullMatch: chopineMatch[0] });
      // Capitalize brand name properly - handle alphanumeric strings like "7seas"
      const capitalizedBrand = brand ? brand.split(' ').map((word: string) => {
        const firstLetterIndex = word.search(/[a-zA-Z]/);
        if (firstLetterIndex === -1) return word;
        if (firstLetterIndex === 0) {
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        } else {
          return word.slice(0, firstLetterIndex) +
                 word.charAt(firstLetterIndex).toUpperCase() +
                 word.slice(firstLetterIndex + 1).toLowerCase();
        }
      }).join(' ') : '';
      const key = capitalizedBrand ? `Chopine ${capitalizedBrand}` : 'Chopine';
      console.log('🔑 Chopine key:', key);

      if (!returnableItems[key]) {
        returnableItems[key] = 0;
      }
      returnableItems[key] += quantity;
    }

    // Look for Bouteille items
    const bouteillePattern = /(\d+)\s+bouteilles?(?:\s+([^,]*))?/gi;
    let bouteilleMatch;

    while ((bouteilleMatch = bouteillePattern.exec(description)) !== null) {
      const quantity = parseInt(bouteilleMatch[1]);
      const brand = bouteilleMatch[2]?.trim() || '';
      console.log('🍾 Bouteille match:', { quantity, brand, fullMatch: bouteilleMatch[0] });
      // Capitalize brand name properly - handle alphanumeric strings like "7seas"
      const capitalizedBrand = brand ? brand.split(' ').map((word: string) => {
        const firstLetterIndex = word.search(/[a-zA-Z]/);
        if (firstLetterIndex === -1) return word;
        if (firstLetterIndex === 0) {
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        } else {
          return word.slice(0, firstLetterIndex) +
                 word.charAt(firstLetterIndex).toUpperCase() +
                 word.slice(firstLetterIndex + 1).toLowerCase();
        }
      }).join(' ') : '';
      const key = capitalizedBrand ? `Bouteille ${capitalizedBrand}` : 'Bouteille';
      console.log('🔑 Bouteille key:', key);

      if (!returnableItems[key]) {
        returnableItems[key] = 0;
      }
      returnableItems[key] += quantity;
    }
    
    // Count standalone 'chopine' occurrences - for items without explicit numbers
    // First find all quantified matches to avoid double-counting
    const tempChopinePattern = /(\d+)\s+chopines?(?:\s+([^,]*))?/gi;
    let tempChopineMatch;
    const quantifiedChopineMatches: RegExpExecArray[] = [];
    while ((tempChopineMatch = tempChopinePattern.exec(description)) !== null) {
      quantifiedChopineMatches.push(tempChopineMatch);
    }

    const standaloneChopinePattern = /\bchopines?\b/gi;
    let standaloneChopineMatch: RegExpExecArray | null;
    while ((standaloneChopineMatch = standaloneChopinePattern.exec(description)) !== null) {
      // Skip if this match is part of a quantified match
      const isPartOfQuantified = quantifiedChopineMatches.some(match =>
        standaloneChopineMatch!.index >= match.index &&
        standaloneChopineMatch!.index < match.index + match[0].length
      );

      if (!isPartOfQuantified) {
        // Look for brand after the chopine word
        const brandMatch = description.substring(standaloneChopineMatch.index).match(/^chopines?\s+([^,()]*)/i);
        const brand = brandMatch?.[1]?.trim() || '';

        // Capitalize brand name properly - handle alphanumeric strings like "7seas"
        const capitalizedBrand = brand ? brand.split(' ').map((word: string) => {
          const firstLetterIndex = word.search(/[a-zA-Z]/);
          if (firstLetterIndex === -1) return word;
          if (firstLetterIndex === 0) {
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
          } else {
            return word.slice(0, firstLetterIndex) +
                   word.charAt(firstLetterIndex).toUpperCase() +
                   word.slice(firstLetterIndex + 1).toLowerCase();
          }
        }).join(' ') : '';

        const key = capitalizedBrand ? `Chopine ${capitalizedBrand}` : 'Chopine';

        if (!returnableItems[key]) {
          returnableItems[key] = 0;
        }
        returnableItems[key] += 1;
      }
    }

    // Count standalone 'bouteille' occurrences - for items without explicit numbers
    // First find all quantified matches to avoid double-counting
    const tempBouteillePattern = /(\d+)\s+bouteilles?(?:\s+([^,]*))?/gi;
    let tempBouteilleMatch;
    const quantifiedBouteilleMatches: RegExpExecArray[] = [];
    while ((tempBouteilleMatch = tempBouteillePattern.exec(description)) !== null) {
      quantifiedBouteilleMatches.push(tempBouteilleMatch);
    }

    const standaloneBouteillePattern = /\bbouteilles?\b/gi;
    let standaloneBouteilleMatch: RegExpExecArray | null;
    while ((standaloneBouteilleMatch = standaloneBouteillePattern.exec(description)) !== null) {
      // Skip if this match is part of a quantified match
      const isPartOfQuantified = quantifiedBouteilleMatches.some(match =>
        standaloneBouteilleMatch!.index >= match.index &&
        standaloneBouteilleMatch!.index < match.index + match[0].length
      );

      if (!isPartOfQuantified) {
        // Look for brand after the bouteille word
        const brandMatch = description.substring(standaloneBouteilleMatch.index).match(/^bouteilles?\s+([^,()]*)/i);
        const brand = brandMatch?.[1]?.trim() || '';

        // Capitalize brand name properly - handle alphanumeric strings like "7seas"
        const capitalizedBrand = brand ? brand.split(' ').map((word: string) => {
          const firstLetterIndex = word.search(/[a-zA-Z]/);
          if (firstLetterIndex === -1) return word;
          if (firstLetterIndex === 0) {
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
          } else {
            return word.slice(0, firstLetterIndex) +
                   word.charAt(firstLetterIndex).toUpperCase() +
                   word.slice(firstLetterIndex + 1).toLowerCase();
          }
        }).join(' ') : '';

        const key = capitalizedBrand ? `Bouteille ${capitalizedBrand}` : 'Bouteille';

        if (!returnableItems[key]) {
          returnableItems[key] = 0;
        }
        returnableItems[key] += 1;
      }
    }
  });
  
  // Calculate returned quantities with improved matching
  const returnedQuantities: {[key: string]: number} = {};
  clientTransactions
    .filter(transaction => transaction.type === 'debt' && (transaction.description.toLowerCase().includes('returned') || transaction.description.toLowerCase().includes('return') || transaction.description.toLowerCase().includes('caisse')))
    .forEach(transaction => {
      const description = transaction.description.toLowerCase();
      Object.keys(returnableItems).forEach(itemType => {
        // Use more precise matching to avoid substring conflicts
        if (itemType.includes('Chopine')) {
          if (itemType === 'Chopine') {
            // For generic Chopine, first check if any branded Chopine would match this description
            let isBrandedMatch = false;
            for (const checkItemType of Object.keys(returnableItems)) {
              if (checkItemType.includes('Chopine') && checkItemType !== 'Chopine') {
                const brandName = checkItemType.replace('Chopine', '').trim();
                if (brandName) {
                  // Create pattern that matches both "Chopine Brand" and "Chopines Brand"
                  const brandedPattern = new RegExp(`returned:\\s*(\\d+)\\s+chopines?\\s+${brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s*(?:-|$|\\s))`, 'i');
                  if (description.match(brandedPattern)) {
                    isBrandedMatch = true;
                    break;
                  }
                }
              }
            }
            
            // Only match generic if it's not a branded match
            if (!isBrandedMatch) {
              // For generic Chopine, match "Returned: X Chopine" but not "Chopine Brand"
              const genericChopinePattern = /returned:\s*(\d+)\s+chopines?(?=\s*(?:-|$))/i;
              const match = description.match(genericChopinePattern);
              if (match) {
                if (!returnedQuantities[itemType]) {
                  returnedQuantities[itemType] = 0;
                }
                returnedQuantities[itemType] += parseInt(match[1]);
              }
            }
          } else {
            // For branded Chopine like "Chopine Vin", match the exact brand
            const brandName = itemType.replace(/^(Chopines?)/i, '').trim();
            if (brandName) {
              // Create pattern that matches both "Chopine Brand" and "Chopines Brand"
              const brandedPattern = new RegExp(`returned:\\s*(\\d+)\\s+chopines?\\s+${brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$|,|\\.)`, 'i');
              const match = description.match(brandedPattern);
              if (match) {
                if (!returnedQuantities[itemType]) {
                  returnedQuantities[itemType] = 0;
                }
                returnedQuantities[itemType] += parseInt(match[1]);
              } else {
                // Handle cases where items were added without explicit quantities (e.g., "chopine vin")
                // Try a more flexible pattern that matches the brand name anywhere in the return description
                const flexiblePattern = new RegExp(`returned:\\s*(\\d+).*?${brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$|,|\\.)`, 'i');
                const flexibleMatch = description.match(flexiblePattern);
                if (flexibleMatch) {
                  if (!returnedQuantities[itemType]) {
                    returnedQuantities[itemType] = 0;
                  }
                  returnedQuantities[itemType] += parseInt(flexibleMatch[1]);
                }
              }
            }
          }
        } else if (itemType.includes('Bouteille')) {
          if (itemType === 'Bouteille') {
            // For generic Bouteille, first check if any branded Bouteille would match this description
            let isBrandedMatch = false;
            for (const checkItemType of Object.keys(returnableItems)) {
              if (checkItemType.includes('Bouteille') && checkItemType !== 'Bouteille') {
                const brandName = checkItemType.replace('Bouteille', '').trim();
                if (brandName) {
                  // Create pattern that matches both "Bouteille Brand" and "Bouteilles Brand"
                  const brandedPattern = new RegExp(`returned:\\s*(\\d+)\\s+bouteilles?\\s+${brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s*(?:-|$|\\s))`, 'i');
                  if (description.match(brandedPattern)) {
                    isBrandedMatch = true;
                    break;
                  }
                }
              }
            }

            // Only match generic if it's not a branded match
            if (!isBrandedMatch) {
              // For generic Bouteille, match "Returned: X Bouteille" but not "Bouteille Brand"
              const genericBouteillePattern = /returned:\s*(\d+)\s+bouteilles?(?=\s*(?:-|$))/i;
              const match = description.match(genericBouteillePattern);
              if (match) {
                if (!returnedQuantities[itemType]) {
                  returnedQuantities[itemType] = 0;
                }
                returnedQuantities[itemType] += parseInt(match[1]);
              }
            }
          } else {
            // For branded Bouteille like "Bouteille Vin", match the exact brand
            const brandName = itemType.replace(/^(Bouteilles?)/i, '').trim();
            if (brandName) {
              // Create pattern that matches both "Bouteille Brand" and "Bouteilles Brand"
              const brandedPattern = new RegExp(`returned:\\s*(\\d+)\\s+bouteilles?\\s+${brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$|,|\\.)`, 'i');
              const match = description.match(brandedPattern);
              if (match) {
                if (!returnedQuantities[itemType]) {
                  returnedQuantities[itemType] = 0;
                }
                returnedQuantities[itemType] += parseInt(match[1]);
              } else {
                // Handle cases where items were added without explicit quantities (e.g., "bouteille vin")
                // Try a more flexible pattern that matches the brand name anywhere in the return description
                const flexiblePattern = new RegExp(`returned:\\s*(\\d+).*?${brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$|,|\\.)`, 'i');
                const flexibleMatch = description.match(flexiblePattern);
                if (flexibleMatch) {
                  if (!returnedQuantities[itemType]) {
                    returnedQuantities[itemType] = 0;
                  }
                  returnedQuantities[itemType] += parseInt(flexibleMatch[1]);
                }
              }
            }
          }
        } else {
          // For other items, use word boundary matching
          const escapedItemType = itemType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const pattern = new RegExp(`returned:\\s*(\\d+)\\s+${escapedItemType}`, 'i');
          const match = description.match(pattern);
          if (match) {
            if (!returnedQuantities[itemType]) {
              returnedQuantities[itemType] = 0;
            }
            returnedQuantities[itemType] += parseInt(match[1]);
          }
        }
      });
    });
  
  // Calculate net returnable quantities
  const netReturnableItems: {text: string, date: string, time: string}[] = [];
  Object.entries(returnableItems).forEach(([itemType, total]) => {
    const returned = returnedQuantities[itemType] || 0;
    const remaining = Math.max(0, total - returned);
    if (remaining > 0) {
      // Get the most recent transaction date for this item type
      const recentTransaction = clientTransactions
        .filter(transaction => 
          transaction.type === 'debt' && 
          !transaction.description.toLowerCase().includes('returned') &&
          transaction.description.toLowerCase().includes(itemType.toLowerCase().split(' ')[0])
        )
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      
      const transactionDate = recentTransaction ? new Date(recentTransaction.date) : new Date();
      
      // Format the display text properly
      let displayText = '';
      
      // Format date and time for flip card
      const formattedDate = transactionDate.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit'
      });
      
      const formattedTime = transactionDate.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      
      if (itemType.includes('Chopine')) {
        // For Chopine items: "8 Chopines Beer" (with proper pluralization and capitalization)
        const brand = itemType.replace(/^(Chopines?)/i, '').trim();
        // Ensure brand is title case
        const titleCaseBrand = brand ? brand.split(' ').map(word =>
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ') : '';
        if (titleCaseBrand) {
          displayText = `${remaining} Chopine${remaining > 1 ? 's' : ''} ${titleCaseBrand}`;
        } else {
          displayText = `${remaining} Chopine${remaining > 1 ? 's' : ''}`;
        }
      } else if (itemType.includes('Bouteille')) {
        // For Bouteille items: "8 Bouteilles Beer" (with proper pluralization and capitalization)
        const brand = itemType.replace(/^(Bouteilles?)/i, '').trim();
        // Ensure brand is title case
        const titleCaseBrand = brand ? brand.split(' ').map(word =>
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ') : '';
        if (titleCaseBrand) {
          displayText = `${remaining} Bouteille${remaining > 1 ? 's' : ''} ${titleCaseBrand}`;
        } else {
          displayText = `${remaining} Bouteille${remaining > 1 ? 's' : ''}`;
        }
      } else {
        // For other items: use parentheses format with title case
        const titleCaseItemType = itemType.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
        displayText = `${remaining} (${titleCaseItemType})`;
      }
      
      // Create the returnable item with flip card for date
      netReturnableItems.push({
        text: displayText,
        date: formattedDate,
        time: formattedTime
      });
    }
  });
  
  return netReturnableItems;
};

/**
 * Calculates net returnable items count for a client (without dates)
 * @param clientTransactions - Array of client transactions
 * @returns Array of returnable item strings
 */
export const calculateReturnableItems = (clientTransactions: CreditTransaction[]): string[] => {
  const returnableItems: {[key: string]: number} = {};
  
  clientTransactions.forEach(transaction => {
    // Only process debt transactions (not payments) AND exclude return transactions
    if (transaction.type === 'payment' || transaction.description.toLowerCase().includes('returned') || transaction.description.toLowerCase().includes('return') || (transaction.description.toLowerCase().includes('caisse') && transaction.description.toLowerCase().includes('returned'))) {
      return;
    }

    const description = transaction.description.toLowerCase();
    console.log('🔍 Processing transaction:', transaction.description, '→', description);

    // Only process items that contain "chopine" or "bouteille"
    if (!description.includes('chopine') && !description.includes('bouteille')) {
      console.log('⏭️ Skipping - no chopine/bouteille:', description);
      return;
    }

    // Look for Chopine items
    const chopinePattern = /(\d+)\s+chopines?(?:\s+([^,]*))?/gi;
    let chopineMatch;

    while ((chopineMatch = chopinePattern.exec(description)) !== null) {
      const quantity = parseInt(chopineMatch[1]);
      const brand = chopineMatch[2]?.trim() || '';
      console.log('🍺 Chopine match:', { quantity, brand, fullMatch: chopineMatch[0] });
      // Capitalize brand name properly - handle alphanumeric strings like "7seas"
      const capitalizedBrand = brand ? brand.split(' ').map((word: string) => {
        const firstLetterIndex = word.search(/[a-zA-Z]/);
        if (firstLetterIndex === -1) return word;
        if (firstLetterIndex === 0) {
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        } else {
          return word.slice(0, firstLetterIndex) +
                 word.charAt(firstLetterIndex).toUpperCase() +
                 word.slice(firstLetterIndex + 1).toLowerCase();
        }
      }).join(' ') : '';
      const key = capitalizedBrand ? `Chopine ${capitalizedBrand}` : 'Chopine';
      console.log('🔑 Chopine key:', key);

      if (!returnableItems[key]) {
        returnableItems[key] = 0;
      }
      returnableItems[key] += quantity;
    }

    // Look for Bouteille items
    const bouteillePattern = /(\d+)\s+bouteilles?(?:\s+([^,]*))?/gi;
    let bouteilleMatch;

    while ((bouteilleMatch = bouteillePattern.exec(description)) !== null) {
      const quantity = parseInt(bouteilleMatch[1]);
      const brand = bouteilleMatch[2]?.trim() || '';
      console.log('🍾 Bouteille match:', { quantity, brand, fullMatch: bouteilleMatch[0] });
      // Capitalize brand name properly - handle alphanumeric strings like "7seas"
      const capitalizedBrand = brand ? brand.split(' ').map((word: string) => {
        const firstLetterIndex = word.search(/[a-zA-Z]/);
        if (firstLetterIndex === -1) return word;
        if (firstLetterIndex === 0) {
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        } else {
          return word.slice(0, firstLetterIndex) +
                 word.charAt(firstLetterIndex).toUpperCase() +
                 word.slice(firstLetterIndex + 1).toLowerCase();
        }
      }).join(' ') : '';
      const key = capitalizedBrand ? `Bouteille ${capitalizedBrand}` : 'Bouteille';
      console.log('🔑 Bouteille key:', key);

      if (!returnableItems[key]) {
        returnableItems[key] = 0;
      }
      returnableItems[key] += quantity;
    }
    
    // Count standalone 'chopine' occurrences - for items without explicit numbers
    // First find all quantified matches to avoid double-counting
    const tempChopinePattern = /(\d+)\s+chopines?(?:\s+([^,]*))?/gi;
    let tempChopineMatch;
    const quantifiedChopineMatches: RegExpExecArray[] = [];
    while ((tempChopineMatch = tempChopinePattern.exec(description)) !== null) {
      quantifiedChopineMatches.push(tempChopineMatch);
    }

    const standaloneChopinePattern = /\bchopines?\b/gi;
    let standaloneChopineMatch: RegExpExecArray | null;
    while ((standaloneChopineMatch = standaloneChopinePattern.exec(description)) !== null) {
      // Skip if this match is part of a quantified match
      const isPartOfQuantified = quantifiedChopineMatches.some(match =>
        standaloneChopineMatch!.index >= match.index &&
        standaloneChopineMatch!.index < match.index + match[0].length
      );

      if (!isPartOfQuantified) {
        // Look for brand after the chopine word
        const brandMatch = description.substring(standaloneChopineMatch.index).match(/^chopines?\s+([^,()]*)/i);
        const brand = brandMatch?.[1]?.trim() || '';

        // Capitalize brand name properly - handle alphanumeric strings like "7seas"
        const capitalizedBrand = brand ? brand.split(' ').map((word: string) => {
          const firstLetterIndex = word.search(/[a-zA-Z]/);
          if (firstLetterIndex === -1) return word;
          if (firstLetterIndex === 0) {
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
          } else {
            return word.slice(0, firstLetterIndex) +
                   word.charAt(firstLetterIndex).toUpperCase() +
                   word.slice(firstLetterIndex + 1).toLowerCase();
          }
        }).join(' ') : '';

        const key = capitalizedBrand ? `Chopine ${capitalizedBrand}` : 'Chopine';

        if (!returnableItems[key]) {
          returnableItems[key] = 0;
        }
        returnableItems[key] += 1;
      }
    }

    // Count standalone 'bouteille' occurrences - for items without explicit numbers
    // First find all quantified matches to avoid double-counting
    const tempBouteillePattern = /(\d+)\s+bouteilles?(?:\s+([^,]*))?/gi;
    let tempBouteilleMatch;
    const quantifiedBouteilleMatches: RegExpExecArray[] = [];
    while ((tempBouteilleMatch = tempBouteillePattern.exec(description)) !== null) {
      quantifiedBouteilleMatches.push(tempBouteilleMatch);
    }

    const standaloneBouteillePattern = /\bbouteilles?\b/gi;
    let standaloneBouteilleMatch: RegExpExecArray | null;
    while ((standaloneBouteilleMatch = standaloneBouteillePattern.exec(description)) !== null) {
      // Skip if this match is part of a quantified match
      const isPartOfQuantified = quantifiedBouteilleMatches.some(match =>
        standaloneBouteilleMatch!.index >= match.index &&
        standaloneBouteilleMatch!.index < match.index + match[0].length
      );

      if (!isPartOfQuantified) {
        // Look for brand after the bouteille word
        const brandMatch = description.substring(standaloneBouteilleMatch.index).match(/^bouteilles?\s+([^,()]*)/i);
        const brand = brandMatch?.[1]?.trim() || '';

        // Capitalize brand name properly - handle alphanumeric strings like "7seas"
        const capitalizedBrand = brand ? brand.split(' ').map((word: string) => {
          const firstLetterIndex = word.search(/[a-zA-Z]/);
          if (firstLetterIndex === -1) return word;
          if (firstLetterIndex === 0) {
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
          } else {
            return word.slice(0, firstLetterIndex) +
                   word.charAt(firstLetterIndex).toUpperCase() +
                   word.slice(firstLetterIndex + 1).toLowerCase();
          }
        }).join(' ') : '';

        const key = capitalizedBrand ? `Bouteille ${capitalizedBrand}` : 'Bouteille';

        if (!returnableItems[key]) {
          returnableItems[key] = 0;
        }
        returnableItems[key] += 1;
      }
    }
  });
  
  // Calculate returned quantities with improved matching
  const returnedQuantities: {[key: string]: number} = {};
  clientTransactions
    .filter(transaction => transaction.type === 'debt' && (transaction.description.toLowerCase().includes('returned') || transaction.description.toLowerCase().includes('return') || transaction.description.toLowerCase().includes('caisse')))
    .forEach(transaction => {
      const description = transaction.description.toLowerCase();
      Object.keys(returnableItems).forEach(itemType => {
        // Use more precise matching to avoid substring conflicts
        if (itemType.includes('Chopine')) {
          if (itemType === 'Chopine') {
            // For generic Chopine, first check if any branded Chopine would match this description
            let isBrandedMatch = false;
            for (const checkItemType of Object.keys(returnableItems)) {
              if (checkItemType.includes('Chopine') && checkItemType !== 'Chopine') {
                const brandName = checkItemType.replace('Chopine', '').trim();
                if (brandName) {
                  // Create pattern that matches both "Chopine Brand" and "Chopines Brand"
                  const brandedPattern = new RegExp(`returned:\\s*(\\d+)\\s+chopines?\\s+${brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s*(?:-|$|\\s))`, 'i');
                  if (description.match(brandedPattern)) {
                    isBrandedMatch = true;
                    break;
                  }
                }
              }
            }
            
            // Only match generic if it's not a branded match
            if (!isBrandedMatch) {
              // For generic Chopine, match "Returned: X Chopine" but not "Chopine Brand"
              const genericChopinePattern = /returned:\s*(\d+)\s+chopines?(?=\s*(?:-|$))/i;
              const match = description.match(genericChopinePattern);
              if (match) {
                if (!returnedQuantities[itemType]) {
                  returnedQuantities[itemType] = 0;
                }
                returnedQuantities[itemType] += parseInt(match[1]);
              }
            }
          } else {
            // For branded Chopine like "Chopine Vin", match the exact brand
            const brandName = itemType.replace(/^(Chopines?)/i, '').trim();
            if (brandName) {
              // Create pattern that matches both "Chopine Brand" and "Chopines Brand"
              const brandedPattern = new RegExp(`returned:\\s*(\\d+)\\s+chopines?\\s+${brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$|,|\\.)`, 'i');
              const match = description.match(brandedPattern);
              if (match) {
                if (!returnedQuantities[itemType]) {
                  returnedQuantities[itemType] = 0;
                }
                returnedQuantities[itemType] += parseInt(match[1]);
              } else {
                // Handle cases where items were added without explicit quantities (e.g., "chopine vin")
                // Try a more flexible pattern that matches the brand name anywhere in the return description
                const flexiblePattern = new RegExp(`returned:\\s*(\\d+).*?${brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$|,|\\.)`, 'i');
                const flexibleMatch = description.match(flexiblePattern);
                if (flexibleMatch) {
                  if (!returnedQuantities[itemType]) {
                    returnedQuantities[itemType] = 0;
                  }
                  returnedQuantities[itemType] += parseInt(flexibleMatch[1]);
                }
              }
            }
          }
        } else if (itemType.includes('Bouteille')) {
          if (itemType === 'Bouteille') {
            // For generic Bouteille, first check if any branded Bouteille would match this description
            let isBrandedMatch = false;
            for (const checkItemType of Object.keys(returnableItems)) {
              if (checkItemType.includes('Bouteille') && checkItemType !== 'Bouteille') {
                const brandName = checkItemType.replace('Bouteille', '').trim();
                if (brandName) {
                  // Create pattern that matches both "Bouteille Brand" and "Bouteilles Brand"
                  const brandedPattern = new RegExp(`returned:\\s*(\\d+)\\s+bouteilles?\\s+${brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s*(?:-|$|\\s))`, 'i');
                  if (description.match(brandedPattern)) {
                    isBrandedMatch = true;
                    break;
                  }
                }
              }
            }

            // Only match generic if it's not a branded match
            if (!isBrandedMatch) {
              // For generic Bouteille, match "Returned: X Bouteille" but not "Bouteille Brand"
              const genericBouteillePattern = /returned:\s*(\d+)\s+bouteilles?(?=\s*(?:-|$))/i;
              const match = description.match(genericBouteillePattern);
              if (match) {
                if (!returnedQuantities[itemType]) {
                  returnedQuantities[itemType] = 0;
                }
                returnedQuantities[itemType] += parseInt(match[1]);
              }
            }
          } else {
            // For branded Bouteille like "Bouteille Vin", match the exact brand
            const brandName = itemType.replace(/^(Bouteilles?)/i, '').trim();
            if (brandName) {
              // Create pattern that matches both "Bouteille Brand" and "Bouteilles Brand"
              const brandedPattern = new RegExp(`returned:\\s*(\\d+)\\s+bouteilles?\\s+${brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$|,|\\.)`, 'i');
              const match = description.match(brandedPattern);
              if (match) {
                if (!returnedQuantities[itemType]) {
                  returnedQuantities[itemType] = 0;
                }
                returnedQuantities[itemType] += parseInt(match[1]);
              } else {
                // Handle cases where items were added without explicit quantities (e.g., "bouteille vin")
                // Try a more flexible pattern that matches the brand name anywhere in the return description
                const flexiblePattern = new RegExp(`returned:\\s*(\\d+).*?${brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$|,|\\.)`, 'i');
                const flexibleMatch = description.match(flexiblePattern);
                if (flexibleMatch) {
                  if (!returnedQuantities[itemType]) {
                    returnedQuantities[itemType] = 0;
                  }
                  returnedQuantities[itemType] += parseInt(flexibleMatch[1]);
                }
              }
            }
          }
        } else {
          // For other items, use word boundary matching
          const escapedItemType = itemType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const pattern = new RegExp(`returned:\\s*(\\d+)\\s+${escapedItemType}`, 'i');
          const match = description.match(pattern);
          if (match) {
            if (!returnedQuantities[itemType]) {
              returnedQuantities[itemType] = 0;
            }
            returnedQuantities[itemType] += parseInt(match[1]);
          }
        }
      });
    });
  
  // Calculate net returnable quantities - format to match client card display exactly
  const netReturnableItems: string[] = [];
  Object.entries(returnableItems).forEach(([itemType, total]) => {
    const returned = returnedQuantities[itemType] || 0;
    const remaining = Math.max(0, total - returned);
    if (remaining > 0) {
      // Format the display text properly to match ClientCard exactly
      let displayText = '';
      
      if (itemType.includes('Chopine')) {
        // For Chopine items: "8 Chopines Beer" (with proper pluralization and capitalization)
        const brand = itemType.replace(/^(Chopines?)/i, '').trim();
        // Ensure brand is title case
        const titleCaseBrand = brand ? brand.split(' ').map(word =>
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ') : '';
        if (titleCaseBrand) {
          displayText = `${remaining} Chopine${remaining > 1 ? 's' : ''} ${titleCaseBrand}`;
        } else {
          displayText = `${remaining} Chopine${remaining > 1 ? 's' : ''}`;
        }
      } else if (itemType.includes('Bouteille')) {
        // For Bouteille items: "8 Bouteilles Beer" (with proper pluralization and capitalization)
        const brand = itemType.replace(/^(Bouteilles?)/i, '').trim();
        // Ensure brand is title case
        const titleCaseBrand = brand ? brand.split(' ').map(word =>
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ') : '';
        if (titleCaseBrand) {
          displayText = `${remaining} Bouteille${remaining > 1 ? 's' : ''} ${titleCaseBrand}`;
        } else {
          displayText = `${remaining} Bouteille${remaining > 1 ? 's' : ''}`;
        }
      } else {
        // For other items: use parentheses format with title case
        const titleCaseItemType = itemType.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
        displayText = `${remaining} (${titleCaseItemType})`;
      }
      
      netReturnableItems.push(displayText);
    }
  });
  
  return netReturnableItems;
};