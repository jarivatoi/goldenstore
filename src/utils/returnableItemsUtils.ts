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
    
    // Only process items that contain "chopine" or "bouteille"
    if (!description.includes('chopine') && !description.includes('bouteille')) {
      return;
    }
    
    // Look for Chopine items
    const chopinePattern = /(\d+)\s+chopines?(?:\s+([^,]*))?/gi;
    let chopineMatch;
    
    while ((chopineMatch = chopinePattern.exec(description)) !== null) {
      const quantity = parseInt(chopineMatch[1]);
      const brand = chopineMatch[2]?.trim() || '';
      // Capitalize brand name properly
      const capitalizedBrand = brand ? brand.split(' ').map((word: string) => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ') : '';
      const key = capitalizedBrand ? `Chopine ${capitalizedBrand}` : 'Chopine';
      
      if (!returnableItems[key]) {
        returnableItems[key] = 0;
      }
      returnableItems[key] += quantity;
    }
    
    // Look for Bouteille items - just extract brand, ignore sizes
    const bouteillePattern = /(\d+)\s+bouteilles?(?:\s+([^,()]+))?(?=\s|$|,|\.)/gi;
    let bouteilleMatch;

    while ((bouteilleMatch = bouteillePattern.exec(description)) !== null) {
      const quantity = parseInt(bouteilleMatch[1]);
      let brand = bouteilleMatch[2]?.trim() || '';

      // Remove any size patterns from the brand
      brand = brand.replace(/^\d+(?:\.\d+)?[Ll]\s*/, '').trim();

      // Capitalize brand name properly
      const capitalizedBrand = brand ? brand.split(' ').map((word: string) =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ') : '';

      const key = capitalizedBrand ? `Bouteille ${capitalizedBrand}` : 'Bouteille';

      if (!returnableItems[key]) {
        returnableItems[key] = 0;
      }
      returnableItems[key] += quantity;
    }

    // Handle standalone bouteille (not part of quantified pattern)
    const tempBouteillePattern = /(\d+)\s+bouteilles?(?:\s+([^,()]+))?(?=\s|$|,|\.)/gi;
    let tempBouteilleMatch;
    const quantifiedBouteilleMatches: RegExpExecArray[] = [];
    while ((tempBouteilleMatch = tempBouteillePattern.exec(description)) !== null) {
      quantifiedBouteilleMatches.push(tempBouteilleMatch);
    }

    const standaloneBouteillePattern = /\bbouteilles?\b/gi;
    let standaloneBouteilleMatch: RegExpExecArray | null;
    while ((standaloneBouteilleMatch = standaloneBouteillePattern.exec(description)) !== null) {
      const isBouteillePartOfQuantified = quantifiedBouteilleMatches.some(match =>
        standaloneBouteilleMatch!.index >= match.index &&
        standaloneBouteilleMatch!.index < match.index + match[0].length
      );

      if (!isBouteillePartOfQuantified) {
        const afterBouteilleMatch = description.substring(standaloneBouteilleMatch.index).match(/^bouteilles?\s*(.*)$/i);
        let brand = afterBouteilleMatch?.[1]?.trim() || '';

        // Remove any size patterns
        brand = brand.replace(/^\d+(?:\.\d+)?[Ll]\s*/, '').trim();
        brand = brand.replace(/[,()].*/, '').trim();

        const capitalizedBrand = brand ? brand.split(' ').map((word: string) =>
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ') : '';

        const key = capitalizedBrand ? `Bouteille ${capitalizedBrand}` : 'Bouteille';

        if (!returnableItems[key]) {
          returnableItems[key] = 0;
        }
        returnableItems[key] += 1;
      }
    }

    const tempChopinePattern = /(\d+)\s+chopines?(?:\s+([^,]*))?/gi;
    let tempChopineMatch;
    const quantifiedChopineMatches: RegExpExecArray[] = [];
    while ((tempChopineMatch = tempChopinePattern.exec(description)) !== null) {
      quantifiedChopineMatches.push(tempChopineMatch);
    }

    const standaloneChopinePattern = /\bchopines?\b/gi;
    let standaloneChopineMatch: RegExpExecArray | null;
    while ((standaloneChopineMatch = standaloneChopinePattern.exec(description)) !== null) {
      const isChopinePartOfQuantified = quantifiedChopineMatches.some(match =>
        standaloneChopineMatch!.index >= match.index &&
        standaloneChopineMatch!.index < match.index + match[0].length
      );

      if (!isChopinePartOfQuantified) {
        const brandMatch = description.substring(standaloneChopineMatch.index).match(/^chopines?\s*([^,()]*)/i);
        const brand = brandMatch?.[1]?.trim() || '';

        const capitalizedBrand = brand ? brand.split(' ').map((word: string) =>
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ') : '';

        const key = capitalizedBrand ? `Chopine ${capitalizedBrand}` : 'Chopine';

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
            // For generic Bouteille, match "Returned: X Bouteille" but not "Bouteille Brand"
            // First check if any branded Bouteille would match this description
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
              // More precise pattern: match "Bouteille" or "Bouteilles" only when NOT followed by a space and additional word
              // This prevents matching "bouteille" in "bouteille vin"
              const genericBouteillePattern = /returned:\s*(\d+)\s+(bouteille|bouteilles)(?=\s*(?:-|$))/i;
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
        // For Bouteille items: just show quantity and brand
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
    
    // Only process items that contain "chopine" or "bouteille"
    if (!description.includes('chopine') && !description.includes('bouteille')) {
      return;
    }
    
    // Look for Chopine items
    const chopinePattern = /(\d+)\s+chopines?(?:\s+([^,]*))?/gi;
    let chopineMatch;
    
    while ((chopineMatch = chopinePattern.exec(description)) !== null) {
      const quantity = parseInt(chopineMatch[1]);
      const brand = chopineMatch[2]?.trim() || '';
      // Capitalize brand name properly
      const capitalizedBrand = brand ? brand.split(' ').map((word: string) => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ') : '';
      const key = capitalizedBrand ? `Chopine ${capitalizedBrand}` : 'Chopine';
      
      if (!returnableItems[key]) {
        returnableItems[key] = 0;
      }
      returnableItems[key] += quantity;
    }
    
    // Look for Bouteille items - just extract brand, ignore sizes
    const bouteillePattern = /(\d+)\s+bouteilles?(?:\s+([^,()]+))?(?=\s|$|,|\.)/gi;
    let bouteilleMatch;

    while ((bouteilleMatch = bouteillePattern.exec(description)) !== null) {
      const quantity = parseInt(bouteilleMatch[1]);
      let brand = bouteilleMatch[2]?.trim() || '';

      // Remove any size patterns from the brand
      brand = brand.replace(/^\d+(?:\.\d+)?[Ll]\s*/, '').trim();

      // Capitalize brand name properly
      const capitalizedBrand = brand ? brand.split(' ').map((word: string) =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ') : '';

      const key = capitalizedBrand ? `Bouteille ${capitalizedBrand}` : 'Bouteille';

      if (!returnableItems[key]) {
        returnableItems[key] = 0;
      }
      returnableItems[key] += quantity;
    }

    // Handle standalone bouteille (not part of quantified pattern)
    const tempBouteillePattern = /(\d+)\s+bouteilles?(?:\s+([^,()]+))?(?=\s|$|,|\.)/gi;
    let tempBouteilleMatch;
    const quantifiedBouteilleMatches: RegExpExecArray[] = [];
    while ((tempBouteilleMatch = tempBouteillePattern.exec(description)) !== null) {
      quantifiedBouteilleMatches.push(tempBouteilleMatch);
    }

    const standaloneBouteillePattern = /\bbouteilles?\b/gi;
    let standaloneBouteilleMatch: RegExpExecArray | null;
    while ((standaloneBouteilleMatch = standaloneBouteillePattern.exec(description)) !== null) {
      const isBouteillePartOfQuantified = quantifiedBouteilleMatches.some(match =>
        standaloneBouteilleMatch!.index >= match.index &&
        standaloneBouteilleMatch!.index < match.index + match[0].length
      );

      if (!isBouteillePartOfQuantified) {
        const afterBouteilleMatch = description.substring(standaloneBouteilleMatch.index).match(/^bouteilles?\s*(.*)$/i);
        let brand = afterBouteilleMatch?.[1]?.trim() || '';

        // Remove any size patterns
        brand = brand.replace(/^\d+(?:\.\d+)?[Ll]\s*/, '').trim();
        brand = brand.replace(/[,()].*/, '').trim();

        const capitalizedBrand = brand ? brand.split(' ').map((word: string) =>
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ') : '';

        const key = capitalizedBrand ? `Bouteille ${capitalizedBrand}` : 'Bouteille';

        if (!returnableItems[key]) {
          returnableItems[key] = 0;
        }
        returnableItems[key] += 1;
      }
    }

    const tempChopinePattern = /(\d+)\s+chopines?(?:\s+([^,]*))?/gi;
    let tempChopineMatch;
    const quantifiedChopineMatches: RegExpExecArray[] = [];
    while ((tempChopineMatch = tempChopinePattern.exec(description)) !== null) {
      quantifiedChopineMatches.push(tempChopineMatch);
    }

    const standaloneChopinePattern = /\bchopines?\b/gi;
    let standaloneChopineMatch: RegExpExecArray | null;
    while ((standaloneChopineMatch = standaloneChopinePattern.exec(description)) !== null) {
      const isChopinePartOfQuantified = quantifiedChopineMatches.some(match =>
        standaloneChopineMatch!.index >= match.index &&
        standaloneChopineMatch!.index < match.index + match[0].length
      );

      if (!isChopinePartOfQuantified) {
        const brandMatch = description.substring(standaloneChopineMatch.index).match(/^chopines?\s*([^,()]*)/i);
        const brand = brandMatch?.[1]?.trim() || '';

        const capitalizedBrand = brand ? brand.split(' ').map((word: string) =>
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ') : '';

        const key = capitalizedBrand ? `Chopine ${capitalizedBrand}` : 'Chopine';

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
            // For generic Bouteille, match "Returned: X Bouteille" but not "Bouteille Brand"
            // First check if any branded Bouteille would match this description
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
              // More precise pattern: match "Bouteille" or "Bouteilles" only when NOT followed by a space and additional word
              // This prevents matching "bouteille" in "bouteille vin"
              const genericBouteillePattern = /returned:\s*(\d+)\s+(bouteille|bouteilles)(?=\s*(?:-|$))/i;
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
        // For Bouteille items: just show quantity and brand
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