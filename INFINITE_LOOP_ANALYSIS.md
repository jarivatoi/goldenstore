# Infinite Loop Analysis - Transaction Processing

## Problem Summary
When a transaction is added, the same transaction processing runs hundreds of times in a loop, particularly the regex matching for "chopine" and "bouteille" items, causing severe performance degradation.

## Root Cause

The infinite loop is caused by an **event handling mismatch** between event dispatchers and listeners:

### Event Flow:

1. **CreditContext.tsx (line 365-370)**: When `addTransaction()` is called, it dispatches:
   ```typescript
   window.dispatchEvent(new CustomEvent('creditDataChanged', {
     detail: {
       clientId: client.id,
       source: 'addTransaction'  // ← Note the source
     }
   }));
   ```

2. **CreditManagement.tsx (line 666-672)**: After transaction is added, dispatches AGAIN:
   ```typescript
   window.dispatchEvent(new CustomEvent('creditDataChanged', {
     detail: {
       clientId: client.id,
       source: 'transaction'  // ← Different source!
     }
   }));
   ```

3. **ScrollingTabs.tsx (line 160-164)**: Event handler ONLY ignores `'transaction'` source:
   ```typescript
   const isTransactionInteraction = event && event.detail && event.detail.source === 'transaction';
   if (isTransactionInteraction) {
     console.log('🔍 ScrollingTabs: Ignoring transaction interaction');
     return;  // ← Only ignores 'transaction', NOT 'addTransaction'!
   }
   ```

4. **ScrollingTabs.tsx (lines 190-224)**: Because `'addTransaction'` is NOT filtered:
   - Kills existing timeline
   - Kills existing draggable
   - Schedules timeline restart after 100ms
   - **Triggers complete re-render of all client tabs**

5. **returnableItemsUtils.ts (line 391+)**: During re-render, `calculateReturnableItems()` is called for EVERY client:
   - Processes each transaction with regex patterns (lines 410-465)
   - **Logs extensively** to console (lines 401, 416, 445, 460)
   - This is where the 🔍, 🍺, 🍾 emoji logging comes from

## Why It Loops Hundreds of Times

The cascading effect:
1. `addTransaction` dispatches event with source `'addTransaction'`
2. ScrollingTabs doesn't filter it → restarts timeline + re-renders
3. CreditManagement dispatches event with source `'transaction'`
4. ScrollingTabs DOES filter this one
5. BUT the state changes from step 2 trigger React re-renders
6. React re-renders trigger `useMemo` and `useCallback` recalculations
7. These recalculations check dependencies like `clients`, `getClientTransactions`, etc.
8. Some of these dependencies are recreated on each render
9. This causes `getFilteredClientsForTabs` to run again (CreditManagement.tsx line 243)
10. Which calls `hasUnreturnedItems` for each client (lines 271, 322)
11. Which calls `calculateReturnableItems` (line 336)
12. **Which processes all transactions and logs extensively**
13. The cycle repeats due to timing issues and state update batching

## Additional Contributing Factors

### 1. Duplicate Event Dispatching
Two separate places dispatch `creditDataChanged` for the same transaction:
- **CreditContext.tsx line 365**: source `'addTransaction'`
- **CreditManagement.tsx line 666**: source `'transaction'`

### 2. Complex Dependency Chains
**CreditManagement.tsx line 331**:
```typescript
const getFilteredClientsForTabs = React.useCallback(() => {
  // ... complex filtering logic
}, [clientFilter, getClientTransactions, getClientTotalDebt, searchClients]);
```
If any of these dependencies are recreated, the entire filtering function reruns for ALL clients.

### 3. Timeline Restart Scheduling
**ScrollingTabs.tsx line 217-224**:
```typescript
setTimeout(() => {
  if (stableSortedClients.length > 0) {
    setupContinuousScroll();  // ← Multiple restarts can be queued
  }
}, 100);
```
Multiple events within 100ms can queue multiple timeline restarts.

### 4. Expensive Calculations on Every Render
**ScrollingTabs.tsx line 573-627**: Inside the render loop for EACH client:
```typescript
const currentReturnableItems = (() => {
  const clientTransactions = getTransactions(client.id);
  const fullReturnableItems = calculateReturnableItems(clientTransactions, client.name);
  // ... truncation logic
  return truncatedItems.join(', ');
})();
```
This recalculates returnable items for EVERY client on EVERY render.

## Performance Impact

For a system with N clients and M transactions per client:
- **Before fix**: O(N * M) operations per event, multiplied by hundreds of loop iterations
- **With 10 clients and 10 transactions each**: 100+ operations × 100+ loop iterations = **10,000+ operations**
- Each operation includes:
  - Regex pattern matching (expensive)
  - String manipulation
  - Console logging
  - Array iterations

## The Fix

The solution has **two parts**:

### Part 1: Filter the `'addTransaction'` event in ScrollingTabs
**ScrollingTabs.tsx line 160-164** should be changed to:
```typescript
// Check if this is a transaction interaction - ignore BOTH sources
const isTransactionInteraction = event && event.detail &&
  (event.detail.source === 'transaction' || event.detail.source === 'addTransaction');
if (isTransactionInteraction) {
  console.log('🔍 ScrollingTabs: Ignoring transaction interaction');
  return;
}
```

### Part 2: Remove duplicate event dispatch from CreditManagement
**CreditManagement.tsx line 666-672** should be REMOVED:
```typescript
// REMOVE THIS - event is already dispatched by CreditContext
window.dispatchEvent(new CustomEvent('creditDataChanged', {
  detail: {
    clientId: client.id,
    source: 'transaction'
  }
}));
```

## Alternative Solution (More Comprehensive)

If the above doesn't fully resolve it, consider:

1. **Debounce the event handler** in ScrollingTabs to prevent rapid-fire processing
2. **Memoize** `calculateReturnableItems` results with stable dependencies
3. **Move expensive calculations** out of the render path
4. **Remove console.log** calls from production code in `returnableItemsUtils.ts`

## Files Affected

- `/src/context/CreditContext.tsx` - Dispatches event with source `'addTransaction'`
- `/src/components/CreditManagement.tsx` - Dispatches duplicate event with source `'transaction'`
- `/src/components/credit/ScrollingTabs.tsx` - Doesn't filter `'addTransaction'` source
- `/src/utils/returnableItemsUtils.ts` - Expensive calculations with console logging

## Verification

After applying the fix, the logs should show:
1. ✅ Single "🔍 Processing transaction" log per transaction
2. ✅ Single "🔍 ScrollingTabs: Restarting timeline" after transaction
3. ✅ No repeated regex matching for the same transaction
4. ✅ Timeline restarts smoothly without cascading events
