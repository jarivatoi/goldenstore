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
    if (transaction.type === 'payment' || transaction.description.toLowerCase().includes('returned')) {
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
    
    // Look for Bouteille items
    const bouteillePattern = /(\d+)\s+(?:(\d+(?:\.\d+)?[Ll])\s+)?bouteilles?(?:\s+([^,()]*))?/gi;
    let bouteilleMatch;
    
    while ((bouteilleMatch = bouteillePattern.exec(description)) !== null) {
      const quantity = parseInt(bouteilleMatch[1]);
      const size = bouteilleMatch[2]?.trim().replace(/l$/gi, 'L') || '';
      const brand = bouteilleMatch[3]?.trim() || '';
      
      // Capitalize brand name properly
      const capitalizedBrand = brand ? brand.split(' ').map((word: string) => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ') : '';
      
      let key;
      if (size && capitalizedBrand) {
        key = `${size} ${capitalizedBrand}`;
      } else if (capitalizedBrand) {
        key = `Bouteille ${capitalizedBrand}`;
      } else if (size) {
        key = `${size} Bouteille`;
      } else {
        key = 'Bouteille';
      }
      
      if (!returnableItems[key]) {
        returnableItems[key] = 0;
      }
      returnableItems[key] += quantity;
    }
    
    // Handle items without explicit numbers (assume quantity 1)
    // For multiple items in a single description, we need to count all occurrences
    if (description.includes('bouteille')) {
      // Find all pattern matches first
      const bouteilleMatches: RegExpExecArray[] = [];
      let bouteilleMatch: RegExpExecArray | null;
      const tempBouteillePattern = /(\d+)\s+(?:(\d+(?:\.\d+)?[Ll])\s+)?bouteilles?(?:\s+([^,()]*))?/gi;
      while ((bouteilleMatch = tempBouteillePattern.exec(description)) !== null) {
        bouteilleMatches.push(bouteilleMatch);
      }
      
      // Count standalone 'bouteille' occurrences
      const standaloneBouteillePattern = /\bbouteilles?\b/gi;
      let standaloneMatch: RegExpExecArray | null;
      while ((standaloneMatch = standaloneBouteillePattern.exec(description)) !== null) {
        // Check if this match is part of a pattern match
        const isPartOfPattern = bouteilleMatches.some(match => 
          standaloneMatch!.index >= match.index && 
          standaloneMatch!.index < match.index + match[0].length
        );
        
        if (!isPartOfPattern) {
          const sizeMatch = description.substring(0, standaloneMatch.index).match(/(\d+(?:\.\d+)?[Ll])$/i);
          const brandMatch = description.substring(standaloneMatch.index).match(/^bouteilles?\s+([^,]*)/i);
          const brand = brandMatch?.[1]?.trim() || '';
          
          // Capitalize brand name properly
          const capitalizedBrand = brand ? brand.split(' ').map((word: string) => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          ).join(' ') : '';
          
          let key;
          if (sizeMatch && capitalizedBrand) {
            key = `${sizeMatch[1].replace(/l$/gi, 'L')} ${capitalizedBrand}`;
          } else if (capitalizedBrand) {
            key = `Bouteille ${capitalizedBrand}`;
          } else if (sizeMatch) {
            key = `${sizeMatch[1].replace(/l$/gi, 'L')} Bouteille`;
          } else {
            key = 'Bouteille';
          }
          
          if (!returnableItems[key]) {
            returnableItems[key] = 0;
          }
          returnableItems[key] += 1;
        }
      }
    }
    
    if (description.includes('chopine')) {
      // Find all pattern matches first
      const chopineMatches: RegExpExecArray[] = [];
      let chopineMatch: RegExpExecArray | null;
      const tempChopinePattern = /(\d+)\s+chopines?(?:\s+([^,]*))?/gi;
      while ((chopineMatch = tempChopinePattern.exec(description)) !== null) {
        chopineMatches.push(chopineMatch);
      }
      
      // Count standalone 'chopine' occurrences
      const standaloneChopinePattern = /\bchopines?\b/gi;
      let standaloneMatch: RegExpExecArray | null;
      while ((standaloneMatch = standaloneChopinePattern.exec(description)) !== null) {
        // Check if this match is part of a pattern match
        const isPartOfPattern = chopineMatches.some(match => 
          standaloneMatch!.index >= match.index && 
          standaloneMatch!.index < match.index + match[0].length
        );
        
        if (!isPartOfPattern) {
          const brandMatch = description.substring(standaloneMatch.index).match(/^chopines?\s+([^,]*)/i);
          const brand = brandMatch?.[1]?.trim() || '';
          
          // Capitalize brand name properly
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
    }
  });
  
  // Calculate returned quantities with improved matching
  const returnedQuantities: {[key: string]: number} = {};
  clientTransactions
    .filter(transaction => transaction.type === 'debt' && transaction.description.toLowerCase().includes('returned'))
    .forEach(transaction => {
      const description = transaction.description.toLowerCase();
      Object.keys(returnableItems).forEach(itemType => {
        // Use more precise matching to avoid substring conflicts
        if (itemType.includes('Chopine')) {
          if (itemType === 'Chopine') {
            // For generic Chopine, match "Returned: X Chopine" but not "Chopine Brand"
            const genericChopinePattern = /returned:\s*(\d+)\s+chopines?(?!\s+\w)/i;
            const match = description.match(genericChopinePattern);
            if (match) {
              if (!returnedQuantities[itemType]) {
                returnedQuantities[itemType] = 0;
              }
              returnedQuantities[itemType] += parseInt(match[1]);
            }
          } else {
            // For branded Chopine like "Chopine Vin", match the exact brand
            const brandedChopinePattern = new RegExp(`returned:\\s*(\\d+)\\s+${itemType.replace('Chopine', 'Chopines?')}`, 'i');
            const match = description.match(brandedChopinePattern);
            if (match) {
              if (!returnedQuantities[itemType]) {
                returnedQuantities[itemType] = 0;
              }
              returnedQuantities[itemType] += parseInt(match[1]);
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
                  const brandedPattern = new RegExp(`returned:\\s*(\\d+)\\s+bouteilles?\\s+${brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s*(?:-|$))`, 'i');
                  if (description.match(brandedPattern)) {
                    isBrandedMatch = true;
                    break;
                  }
                }
              }
            }
            
            // Only match generic if it's not a branded match
            if (!isBrandedMatch) {
              // More precise pattern: match "Bouteille" or "Bouteilles" only when followed by a non-word character
              // or end of string, but not when followed by a space and another word
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
            const brandName = itemType.replace('Bouteille', '').trim();
            if (brandName) {
              // Create pattern that matches both "Bouteille Brand" and "Bouteilles Brand"
              const brandedPattern = new RegExp(`returned:\\s*(\\d+)\\s+bouteilles?\\s+${brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s*(?:-|$))`, 'i');
              const match = description.match(brandedPattern);
              if (match) {
                if (!returnedQuantities[itemType]) {
                  returnedQuantities[itemType] = 0;
                }
                returnedQuantities[itemType] += parseInt(match[1]);
              } else {
                // Handle cases where items were added without explicit quantities (e.g., "bouteille vin")
                // Try a more flexible pattern that matches the brand name anywhere in the return description
                const flexiblePattern = new RegExp(`returned:\\s*(\\d+).*?${brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
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
        const brand = itemType.replace('Chopine', '').trim();
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
        // For Bouteille items: check if it has a size (like "1.5L Green")
        const sizeMatch = itemType.match(/(\d+(?:\.\d+)?[Ll])/i);
        if (sizeMatch) {
          // For sized bottles, ensure size is properly formatted with uppercase L
          const formattedSize = sizeMatch[1].replace(/l$/gi, 'L');
          const itemTypeWithoutSize = itemType.replace(sizeMatch[1], '').replace('Bouteille', '').trim();
          if (itemTypeWithoutSize) {
            // Format as "3 1.5L Bouteilles Green"
            displayText = `${remaining} ${formattedSize} Bouteille${remaining > 1 ? 's' : ''} ${itemTypeWithoutSize}`;
          } else {
            // Format as "3 1.5L Bouteilles"
            displayText = `${remaining} ${formattedSize} Bouteille${remaining > 1 ? 's' : ''}`;
          }
        } else {
          // For regular bottles: "3 Bouteilles Green" (with proper pluralization)
          const brand = itemType.replace('Bouteille', '').trim();
          // Ensure brand is title case
          const titleCaseBrand = brand ? brand.split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          ).join(' ') : '';
          if (titleCaseBrand) {
            displayText = `${remaining} Bouteille${remaining > 1 ? 's' : ''} ${titleCaseBrand}`;
          } else {
            displayText = `${remaining} Bouteille${remaining > 1 ? 's' : ''}`;
          }
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
    if (transaction.type === 'payment' || transaction.description.toLowerCase().includes('returned')) {
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
    
    // Look for Bouteille items
    const bouteillePattern = /(\d+)\s+(?:(\d+(?:\.\d+)?[Ll])\s+)?bouteilles?(?:\s+([^,()]*))?/gi;
    let bouteilleMatch;
    
    while ((bouteilleMatch = bouteillePattern.exec(description)) !== null) {
      const quantity = parseInt(bouteilleMatch[1]);
      const size = bouteilleMatch[2]?.trim().replace(/l$/gi, 'L') || '';
      const brand = bouteilleMatch[3]?.trim() || '';
      
      // Capitalize brand name properly
      const capitalizedBrand = brand ? brand.split(' ').map((word: string) => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ') : '';
      
      let key;
      if (size && capitalizedBrand) {
        key = `${size} ${capitalizedBrand}`;
      } else if (capitalizedBrand) {
        key = `Bouteille ${capitalizedBrand}`;
      } else if (size) {
        key = `${size} Bouteille`;
      } else {
        key = 'Bouteille';
      }
      
      if (!returnableItems[key]) {
        returnableItems[key] = 0;
      }
      returnableItems[key] += quantity;
    }
    
    // Handle items without explicit numbers (assume quantity 1)
    // For multiple items in a single description, we need to count all occurrences
    if (description.includes('bouteille')) {
      // Find all pattern matches first
      const bouteilleMatches: RegExpExecArray[] = [];
      let bouteilleMatch: RegExpExecArray | null;
      const tempBouteillePattern = /(\d+)\s+(?:(\d+(?:\.\d+)?[Ll])\s+)?bouteilles?(?:\s+([^,()]*))?/gi;
      while ((bouteilleMatch = tempBouteillePattern.exec(description)) !== null) {
        bouteilleMatches.push(bouteilleMatch);
      }
      
      // Count standalone 'bouteille' occurrences
      const standaloneBouteillePattern = /\bbouteilles?\b/gi;
      let standaloneMatch: RegExpExecArray | null;
      while ((standaloneMatch = standaloneBouteillePattern.exec(description)) !== null) {
        // Check if this match is part of a pattern match
        const isPartOfPattern = bouteilleMatches.some(match => 
          standaloneMatch!.index >= match.index && 
          standaloneMatch!.index < match.index + match[0].length
        );
        
        if (!isPartOfPattern) {
          const sizeMatch = description.substring(0, standaloneMatch.index).match(/(\d+(?:\.\d+)?[Ll])$/i);
          const brandMatch = description.substring(standaloneMatch.index).match(/^bouteilles?\s+([^,]*)/i);
          const brand = brandMatch?.[1]?.trim() || '';
          
          // Capitalize brand name properly
          const capitalizedBrand = brand ? brand.split(' ').map((word: string) => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          ).join(' ') : '';
          
          let key;
          if (sizeMatch && capitalizedBrand) {
            key = `${sizeMatch[1].replace(/l$/gi, 'L')} ${capitalizedBrand}`;
          } else if (capitalizedBrand) {
            key = `Bouteille ${capitalizedBrand}`;
          } else if (sizeMatch) {
            key = `${sizeMatch[1].replace(/l$/gi, 'L')} Bouteille`;
          } else {
            key = 'Bouteille';
          }
          
          if (!returnableItems[key]) {
            returnableItems[key] = 0;
          }
          returnableItems[key] += 1;
        }
      }
    }
    
    if (description.includes('chopine')) {
      // Find all pattern matches first
      const chopineMatches: RegExpExecArray[] = [];
      let chopineMatch: RegExpExecArray | null;
      const tempChopinePattern = /(\d+)\s+chopines?(?:\s+([^,]*))?/gi;
      while ((chopineMatch = tempChopinePattern.exec(description)) !== null) {
        chopineMatches.push(chopineMatch);
      }
      
      // Count standalone 'chopine' occurrences
      const standaloneChopinePattern = /\bchopines?\b/gi;
      let standaloneMatch: RegExpExecArray | null;
      while ((standaloneMatch = standaloneChopinePattern.exec(description)) !== null) {
        // Check if this match is part of a pattern match
        const isPartOfPattern = chopineMatches.some(match => 
          standaloneMatch!.index >= match.index && 
          standaloneMatch!.index < match.index + match[0].length
        );
        
        if (!isPartOfPattern) {
          const brandMatch = description.substring(standaloneMatch.index).match(/^chopines?\s+([^,]*)/i);
          const brand = brandMatch?.[1]?.trim() || '';
          
          // Capitalize brand name properly
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
    }
  });
  
  // Calculate returned quantities with improved matching
  const returnedQuantities: {[key: string]: number} = {};
  clientTransactions
    .filter(transaction => transaction.type === 'debt' && transaction.description.toLowerCase().includes('returned'))
    .forEach(transaction => {
      const description = transaction.description.toLowerCase();
      Object.keys(returnableItems).forEach(itemType => {
        // Use more precise matching to avoid substring conflicts
        if (itemType.includes('Chopine')) {
          if (itemType === 'Chopine') {
            // For generic Chopine, match "Returned: X Chopine" but not "Chopine Brand"
            const genericChopinePattern = /returned:\s*(\d+)\s+chopines?(?!\s+\w)/i;
            const match = description.match(genericChopinePattern);
            if (match) {
              if (!returnedQuantities[itemType]) {
                returnedQuantities[itemType] = 0;
              }
              returnedQuantities[itemType] += parseInt(match[1]);
            }
          } else {
            // For branded Chopine like "Chopine Vin", match the exact brand
            const brandedChopinePattern = new RegExp(`returned:\\s*(\\d+)\\s+${itemType.replace('Chopine', 'Chopines?')}`, 'i');
            const match = description.match(brandedChopinePattern);
            if (match) {
              if (!returnedQuantities[itemType]) {
                returnedQuantities[itemType] = 0;
              }
              returnedQuantities[itemType] += parseInt(match[1]);
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
                  const brandedPattern = new RegExp(`returned:\\s*(\\d+)\\s+bouteilles?\\s+${brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s*(?:-|$))`, 'i');
                  if (description.match(brandedPattern)) {
                    isBrandedMatch = true;
                    break;
                  }
                }
              }
            }
            
            // Only match generic if it's not a branded match
            if (!isBrandedMatch) {
              // More precise pattern: match "Bouteille" or "Bouteilles" only when followed by a non-word character
              // or end of string, but not when followed by a space and another word
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
            const brandName = itemType.replace('Bouteille', '').trim();
            if (brandName) {
              // Create pattern that matches both "Bouteille Brand" and "Bouteilles Brand"
              const brandedPattern = new RegExp(`returned:\\s*(\\d+)\\s+bouteilles?\\s+${brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s*(?:-|$))`, 'i');
              const match = description.match(brandedPattern);
              if (match) {
                if (!returnedQuantities[itemType]) {
                  returnedQuantities[itemType] = 0;
                }
                returnedQuantities[itemType] += parseInt(match[1]);
              } else {
                // Handle cases where items were added without explicit quantities (e.g., "bouteille vin")
                // Try a more flexible pattern that matches the brand name anywhere in the return description
                const flexiblePattern = new RegExp(`returned:\\s*(\\d+).*?${brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
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
        const brand = itemType.replace('Chopine', '').trim();
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
        // For Bouteille items: check if it has a size (like "1.5L Green")
        const sizeMatch = itemType.match(/(\d+(?:\.\d+)?[Ll])/i);
        if (sizeMatch) {
          // For sized bottles, ensure size is properly formatted with uppercase L
          const formattedSize = sizeMatch[1].replace(/l$/gi, 'L');
          const itemTypeWithoutSize = itemType.replace(sizeMatch[1], '').replace('Bouteille', '').trim();
          if (itemTypeWithoutSize) {
            // Format as "3 1.5L Bouteilles Green"
            displayText = `${remaining} ${formattedSize} Bouteille${remaining > 1 ? 's' : ''} ${itemTypeWithoutSize}`;
          } else {
            // Format as "3 1.5L Bouteilles"
            displayText = `${remaining} ${formattedSize} Bouteille${remaining > 1 ? 's' : ''}`;
          }
        } else {
          // For regular bottles: "3 Bouteilles Green" (with proper pluralization)
          const brand = itemType.replace('Bouteille', '').trim();
          // Ensure brand is title case
          const titleCaseBrand = brand ? brand.split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          ).join(' ') : '';
          if (titleCaseBrand) {
            displayText = `${remaining} Bouteille${remaining > 1 ? 's' : ''} ${titleCaseBrand}`;
          } else {
            displayText = `${remaining} Bouteille${remaining > 1 ? 's' : ''}`;
          }
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