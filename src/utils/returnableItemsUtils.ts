import { CreditTransaction } from '../types';

const properCapitalize = (word: string): string => {
  if (!word) return word;
  const firstChar = word.charAt(0);
  if (/[a-zA-Z]/.test(firstChar)) {
    return firstChar.toUpperCase() + word.slice(1).toLowerCase();
  }
  return word.toLowerCase();
};

export const calculateReturnableItemsWithDates = (clientTransactions: CreditTransaction[]): {text: string, date: string, time: string}[] => {
  const returnableItems: {[key: string]: number} = {};

  clientTransactions.forEach(transaction => {
    if (transaction.type === 'payment' || transaction.description.toLowerCase().includes('returned') || transaction.description.toLowerCase().includes('return') || (transaction.description.toLowerCase().includes('caisse') && transaction.description.toLowerCase().includes('returned'))) {
      return;
    }

    const description = transaction.description.toLowerCase();

    if (!description.includes('chopine') && !description.includes('bouteille')) {
      return;
    }

    // Process quantified Chopines and collect for standalone detection
    const chopinePattern = /(\d+)\s+chopines?(?:\s+([^,]*))?/gi;
    let chopineMatch;
    const quantifiedChopineMatches: RegExpExecArray[] = [];

    while ((chopineMatch = chopinePattern.exec(description)) !== null) {
      quantifiedChopineMatches.push(chopineMatch);
      const quantity = parseInt(chopineMatch[1]);
      const brand = chopineMatch[2]?.trim() || '';

      const capitalizedBrand = brand ? brand.split(' ').map((word: string) =>
        properCapitalize(word)
      ).join(' ') : '';

      const key = capitalizedBrand ? `Chopine ${capitalizedBrand}` : 'Chopine';

      if (!returnableItems[key]) {
        returnableItems[key] = 0;
      }
      returnableItems[key] += quantity;
    }

    // Process standalone Chopines (those without a quantity number)
    const standaloneChopinePattern = /\bchopines?\b/gi;
    let standaloneChopineMatch: RegExpExecArray | null;

    while ((standaloneChopineMatch = standaloneChopinePattern.exec(description)) !== null) {
      const isChopinePartOfQuantified = quantifiedChopineMatches.some(match =>
        standaloneChopineMatch!.index >= match.index &&
        standaloneChopineMatch!.index < match.index + match[0].length
      );

      if (!isChopinePartOfQuantified) {
        const brandMatch = description.substring(standaloneChopineMatch.index).match(/^chopines?\s+(.+)$/i);
        let brand = brandMatch?.[1]?.trim() || '';

        brand = brand.replace(/[,()].*/, '').trim();

        if (brand) {
          const capitalizedBrand = brand.split(' ').map((word: string) =>
            properCapitalize(word)
          ).join(' ');

          const key = `Chopine ${capitalizedBrand}`;

          if (!returnableItems[key]) {
            returnableItems[key] = 0;
          }
          returnableItems[key] += 1;
        } else {
          const key = 'Chopine';

          if (!returnableItems[key]) {
            returnableItems[key] = 0;
          }
          returnableItems[key] += 1;
        }
      }
    }

    // Process quantified Bouteilles and collect for standalone detection
    const bouteillePattern = /(\d+)\s+bouteilles?(?:\s+([^,]*))?/gi;
    let bouteilleMatch;
    const quantifiedBouteilleMatches: RegExpExecArray[] = [];

    while ((bouteilleMatch = bouteillePattern.exec(description)) !== null) {
      quantifiedBouteilleMatches.push(bouteilleMatch);
      const quantity = parseInt(bouteilleMatch[1]);
      const brand = bouteilleMatch[2]?.trim() || '';

      const capitalizedBrand = brand ? brand.split(' ').map((word: string) =>
        properCapitalize(word)
      ).join(' ') : '';

      const key = capitalizedBrand ? `Bouteille ${capitalizedBrand}` : 'Bouteille';

      if (!returnableItems[key]) {
        returnableItems[key] = 0;
      }
      returnableItems[key] += quantity;
    }

    // Process standalone Bouteilles (those without a quantity number)
    const standaloneBouteillePattern = /\bbouteilles?\b/gi;
    let standaloneBouteilleMatch: RegExpExecArray | null;

    while ((standaloneBouteilleMatch = standaloneBouteillePattern.exec(description)) !== null) {
      const isBouteillePartOfQuantified = quantifiedBouteilleMatches.some(match =>
        standaloneBouteilleMatch!.index >= match.index &&
        standaloneBouteilleMatch!.index < match.index + match[0].length
      );

      if (!isBouteillePartOfQuantified) {
        const brandMatch = description.substring(standaloneBouteilleMatch.index).match(/^bouteilles?\s+(.+)$/i);
        let brand = brandMatch?.[1]?.trim() || '';

        brand = brand.replace(/[,()].*/, '').trim();

        if (brand) {
          const capitalizedBrand = brand.split(' ').map((word: string) =>
            properCapitalize(word)
          ).join(' ');

          const key = `Bouteille ${capitalizedBrand}`;

          if (!returnableItems[key]) {
            returnableItems[key] = 0;
          }
          returnableItems[key] += 1;
        } else {
          const key = 'Bouteille';

          if (!returnableItems[key]) {
            returnableItems[key] = 0;
          }
          returnableItems[key] += 1;
        }
      }
    }
  });

  const returnedQuantities: {[key: string]: number} = {};
  clientTransactions
    .filter(transaction => transaction.type === 'debt' && (transaction.description.toLowerCase().includes('returned') || transaction.description.toLowerCase().includes('return') || transaction.description.toLowerCase().includes('caisse')))
    .forEach(transaction => {
      const description = transaction.description.toLowerCase();
      Object.keys(returnableItems).forEach(itemType => {
        if (itemType.includes('Chopine')) {
          if (itemType === 'Chopine') {
            let isBrandedMatch = false;
            for (const checkItemType of Object.keys(returnableItems)) {
              if (checkItemType.includes('Chopine') && checkItemType !== 'Chopine') {
                const brandName = checkItemType.replace('Chopine', '').trim();
                if (brandName) {
                  const brandedPattern = new RegExp(`returned:\\s*(\\d+)\\s+chopines?\\s+${brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s*(?:-|$|\\s))`, 'i');
                  if (description.match(brandedPattern)) {
                    isBrandedMatch = true;
                    break;
                  }
                }
              }
            }

            if (!isBrandedMatch) {
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
            const brandName = itemType.replace(/^(Chopines?)/i, '').trim();
            if (brandName) {
              const brandedPattern = new RegExp(`returned:\\s*(\\d+)\\s+chopines?\\s+${brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$|,|\\.)`, 'i');
              const match = description.match(brandedPattern);
              if (match) {
                if (!returnedQuantities[itemType]) {
                  returnedQuantities[itemType] = 0;
                }
                returnedQuantities[itemType] += parseInt(match[1]);
              } else {
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
            let isBrandedMatch = false;
            for (const checkItemType of Object.keys(returnableItems)) {
              if (checkItemType.includes('Bouteille') && checkItemType !== 'Bouteille') {
                const brandName = checkItemType.replace('Bouteille', '').trim();
                if (brandName) {
                  const brandedPattern = new RegExp(`returned:\\s*(\\d+)\\s+bouteilles?\\s+${brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s*(?:-|$|\\s))`, 'i');
                  if (description.match(brandedPattern)) {
                    isBrandedMatch = true;
                    break;
                  }
                }
              }
            }

            if (!isBrandedMatch) {
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
            const brandName = itemType.replace(/^(Bouteilles?)/i, '').trim();
            if (brandName) {
              const brandedPattern = new RegExp(`returned:\\s*(\\d+)\\s+bouteilles?\\s+${brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$|,|\\.)`, 'i');
              const match = description.match(brandedPattern);
              if (match) {
                if (!returnedQuantities[itemType]) {
                  returnedQuantities[itemType] = 0;
                }
                returnedQuantities[itemType] += parseInt(match[1]);
              } else {
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

  const result: {text: string, date: string, time: string}[] = [];
  Object.keys(returnableItems).forEach(itemType => {
    const unreturned = (returnableItems[itemType] || 0) - (returnedQuantities[itemType] || 0);
    if (unreturned > 0) {
      result.push({
        text: `${unreturned} ${itemType}`,
        date: new Date().toLocaleDateString('en-US', { year: '2-digit', month: '2-digit', day: '2-digit' }),
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      });
    }
  });

  return result;
};

export const calculateReturnableItems = (clientTransactions: CreditTransaction[]): string[] => {
  return calculateReturnableItemsWithDates(clientTransactions).map(item => item.text);
};
