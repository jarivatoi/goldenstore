# Calculator Flows and Counter Logic Explanation

## Overview

The Golden Store calculator implements two distinct calculation flows based on the type of operations being performed. Understanding these flows is crucial for maintaining and extending the calculator functionality.

## 🔢 Simple Calculation Flow

### Definition
Simple calculations involve **only addition (+) and subtraction (-)** operations. These represent straightforward price accumulation scenarios.

### Examples
```
10 + 20 + 30 = 60    (3 items totaling Rs 60)
100 - 25 - 10 = 65   (Rs 100 minus Rs 35 in deductions)
50 + 15 - 5 = 60     (Mixed addition and subtraction)
```

### Step-by-Step Process

#### Input Sequence: `10 + 20 + 30 =`

**Step 1: First Number (10)**
```
Input: "10"
Display: "10"
Article Count: 1
Calculation Steps: [
  {
    expression: "10",
    result: 10,
    operationType: "number",
    displayValue: "10",
    isComplete: false
  }
]
```

**Step 2: Addition Operator (+)**
```
Input: "+"
Display: "10"
Article Count: 1 (unchanged)
Last Operation: "+"
Is New Number: true
```

**Step 3: Second Number (20)**
```
Input: "20"
Display: "20"
Article Count: 2 (incremented)
Calculation Steps: [
  {
    expression: "10",
    result: 10,
    operationType: "number",
    displayValue: "10",
    isComplete: false
  },
  {
    expression: "+20",
    result: 20,
    operationType: "operation",
    displayValue: "+20",
    isComplete: false,
    operator: "+"
  }
]
```

**Step 4: Addition Operator (+)**
```
Input: "+"
Display: "20"
Article Count: 2 (unchanged)
Last Operation: "+"
Is New Number: true
```

**Step 5: Third Number (30)**
```
Input: "30"
Display: "30"
Article Count: 3 (incremented)
Calculation Steps: [
  {
    expression: "10",
    result: 10,
    operationType: "number",
    displayValue: "10",
    isComplete: false
  },
  {
    expression: "+20",
    result: 20,
    operationType: "operation",
    displayValue: "+20",
    isComplete: false,
    operator: "+"
  },
  {
    expression: "+30",
    result: 30,
    operationType: "operation",
    displayValue: "+30",
    isComplete: false,
    operator: "+"
  }
]
```

**Step 6: Equals (=)**
```
Input: "="
Display: "60"
Article Count: 3 (unchanged)
Expression Built: "10+20+30"
Final Result: 60
All Steps Marked: isComplete = true
Grand Total: Previous GT + 60
Transaction History: [...previous, 60]
```

### Counter Logic for Simple Calculations
- **First number**: Article count = 1
- **Each operator**: Article count unchanged
- **Each subsequent number**: Article count incremented by 1
- **Final result**: Article count represents total items in calculation

---

## 🔄 Compound Calculation Flow

### Definition
Compound calculations involve **multiplication (×) or division (÷)** operations. These represent quantity-based pricing scenarios.

### Examples
```
5 × 3 = 15     (5 articles at Rs 3.00 each = Rs 15.00)
10 ÷ 2 = 5     (Rs 10 divided by 2 people = Rs 5.00 each)
100 × 10% = 10 (Rs 100 with 10% markup = Rs 10.00)
```

### Step-by-Step Process

#### Input Sequence: `5 × 3 =`

**Step 1: Quantity (5)**
```
Input: "5"
Display: "5"
Article Count: 1
Calculation Steps: [
  {
    expression: "5",
    result: 5,
    operationType: "number",
    displayValue: "5",
    isComplete: false
  }
]
```

**Step 2: Multiplication Operator (×)**
```
Input: "×" (or "*")
Display: "5"
Article Count: 1  (Unchanged - operators don't change count)
Last Operation: "*"
Is New Number: true
```

**Step 3: Unit Price (3)**
```
Input: "3"
Display: "3"
Article Count: 1  (Unchanged - numbers after × or ÷ don't increment)
Calculation Steps: [
  {
    expression: "5",
    result: 5,
    operationType: "number",
    displayValue: "5",
    isComplete: false
  },
  {
    expression: "*3",
    result: 3,
    operationType: "operation",
    displayValue: "×3",
    isComplete: false,
    operator: "*"
  }
]
```

**Step 4: Equals (=)**
```
Input: "="
Display: "15"
Article Count: 1 (unchanged - represents quantity of items)
Expression Built: "5*3"
Final Result: 15
All Steps Marked: isComplete = true
Grand Total: Previous GT + 15
Transaction History: [...previous, 15]
```

### Counter Logic for Compound Calculations
- **First number**: Article count = 1
- **Multiplication/Division operators**: Article count unchanged
- **Numbers after × or ÷**: Article count unchanged (represents unit price/divisor)
- **Final result**: Article count = 1 (represents one calculation result)

---

## 📊 Display Steps and Navigation

### CHECK→ (Forward Navigation)
Cycles through calculation steps in forward direction:

```
Calculation: 10 + 20 + 30 = 60

CHECK→ Press 1: Display "10"     (Step 1, Article Count: 1)
CHECK→ Press 2: Display "+20"    (Step 2, Article Count: 2)
CHECK→ Press 3: Display "+30"    (Step 3, Article Count: 3)
CHECK→ Press 4: Display "=60"    (Result, Article Count: 3)
CHECK→ Press 5: Display "10"     (Wraps to beginning)
```

### CHECK← (Backward Navigation)
Cycles through calculation steps in reverse direction:

```
Calculation: 5 × 3 = 15

CHECK← Press 1: Display "=15"    (Result, Article Count: 5)
CHECK← Press 2: Display "×3"     (Step 2, Article Count: 5)
CHECK← Press 3: Display "5"      (Step 1, Article Count: 1)
CHECK← Press 4: Display "=15"    (Wraps to end)
```

### AUTO Replay
Automatically cycles through all steps with 1-second intervals:

```
AUTO Press: Starts automatic sequence
Display "5" (1 sec) → Display "×3" (1 sec) → Display "=15" (1 sec) → Complete
```

---

## 🎯 Article Counter Behavior

### Simple Calculation Counter
```
Input Sequence: 10 + 20 + 30 =

10     → Article Count: 1  (First item)
+      → Article Count: 1  (Operator doesn't change count)
20     → Article Count: 2  (Second item added)
+      → Article Count: 2  (Operator doesn't change count)
30     → Article Count: 3  (Third item added)
=      → Article Count: 3  (Final count: 3 items)
```

### Compound Calculation Counter
```
Input Sequence: 5 × 3 =

5      → Article Count: 1  (Initial quantity input)
×      → Article Count: 1  (Operators don't change count)
3      → Article Count: 1  (Numbers after × or ÷ don't increment count)
=      → Article Count: 1  (Final count: 1 calculation result)
```

### Building Numbers (Multi-digit)
```
Input Sequence: 1, 2, 5 (building "125")

1      → Article Count: 1  (First digit)
2      → Article Count: 1  (Building same number)
5      → Article Count: 1  (Still building same number)
```

**Key Rule**: Article count only increments when starting a NEW number, not when building an existing number.

---

## 🔄 Flow Determination Logic

### How the Calculator Decides Which Flow to Use

```typescript
const isCompoundCalculation = (calculationSteps, lastOperation) => {
  // Check if any step contains multiplication or division
  const hasMultiplyDivide = calculationSteps.some(step => 
    step.expression.includes('*') || 
    step.expression.includes('/') || 
    step.expression.includes('×') || 
    step.expression.includes('÷') ||
    step.operator === '*' ||
    step.operator === '/' ||
    step.operator === '×' ||
    step.operator === '÷'
  );
  
  // Also check current operation
  const currentIsMultiplyDivide = (
    lastOperation === '*' || 
    lastOperation === '/' || 
    lastOperation === '×' || 
    lastOperation === '÷'
  );
  
  return hasMultiplyDivide || currentIsMultiplyDivide;
};
```

### Flow Selection Process
1. **Check current input**: Is it × or ÷?
2. **Check calculation history**: Any previous × or ÷ operations?
3. **If either is true**: Use Compound Flow
4. **If neither is true**: Use Simple Flow

---

## 💡 Special Cases and Edge Behaviors

### Decimal Numbers
```
Input: 0.5 + 1.25 =

0      → Article Count: 1
.      → Article Count: 1  (Building same number)
5      → Article Count: 1  (Still building same number)
+      → Article Count: 1  (Operator)
1      → Article Count: 2  (New number starts)
.      → Article Count: 2  (Building same number)
2      → Article Count: 2  (Still building same number)
5      → Article Count: 2  (Still building same number)
=      → Article Count: 2  (Final: 2 items)
```

### Percentage Calculations
```
Input: 100 × 10% =

100    → Article Count: 1
×      → Article Count: 100  (Set to quantity)
10     → Article Count: 100  (Unchanged)
%      → Article Count: 100  (Percentage applied)
       → Display: "10"      (100 × 10% = 10)
       → Calculation Complete
```

### Mixed Operations (Compound Flow)
```
Input: 5 × 3 + 2 =

1      → Article Count: 1    (First item)
+      → Article Count: 1    (Operator doesn't change count)
2      → Article Count: 2    (Second item - increment because after +)
×      → Article Count: 2    (Operator doesn't change count)
3      → Article Count: 2    (Unit price - no increment because after ×)
+      → Article Count: 2    (Operator doesn't change count)
5      → Article Count: 3    (Third item - increment because after +)
=      → Article Count: 3    (Final count: 3 distinct items)
```

---

## 🧮 Expression Building

### Simple Expression Building
```typescript
const buildSimpleExpression = (steps) => {
  let expression = '';
  
  for (const step of steps) {
    if (step.operationType === 'number') {
      expression += step.result;           // "10"
    } else if (step.operationType === 'operation') {
      expression += step.expression;       // "+20"
    }
  }
  
  return expression; // "10+20+30"
};
```

### Compound Expression Building
```typescript
const buildCompoundExpression = (steps) => {
  let expression = '';
  
  for (const step of steps) {
    if (step.operationType === 'number') {
      expression += step.result;           // "5"
    } else if (step.operationType === 'operation') {
      expression += step.operator + step.result; // "*3"
    }
  }
  
  return expression; // "5*3"
};
```

---

## 🎮 User Experience Examples

### Scenario 1: Adding Multiple Items (Simple)
**User Action**: Adding 3 different priced items
```
User Input: 25 + 30 + 45 =
Display Shows: "25" → "+30" → "+45" → "=100"
Article Count: 1 → 2 → 3 → 3
Meaning: 3 items totaling Rs 100
```

### Scenario 2: Quantity Pricing (Compound)
**User Action**: 8 cigarette packs at Rs 12 each
```
User Input: 8 × 12 =
Display Shows: "8" → "×12" → "=96"
Article Count: 1 → 8 → 8 → 8
Meaning: 8 articles at Rs 12 each = Rs 96
```

### Scenario 3: Building Multi-digit Numbers
**User Action**: Entering Rs 125.50
```
User Input: 1, 2, 5, ., 5, 0
Display Shows: "1" → "12" → "125" → "125." → "125.5" → "125.50"
Article Count: 1 → 1 → 1 → 1 → 1 → 1
Meaning: Still building the same number (1 item)
```

### Scenario 4: Mixed Calculation
**User Action**: 1 item + (2 items × Rs 3 each) + 5 more items
```
User Input: 1 + 2 × 3 + 5 =
Display Shows: "1" → "+2" → "×3" → "+5" → "=12"
Article Count: 1 → 2 → 2 → 3 → 3
Meaning: 3 distinct items combined (1 + (2×3) + 5 = 12)
```

### Scenario 5: Percentage Calculation
**User Action**: 10% of Rs 200
```
User Input: 200 × 10 % =
Display Shows: "200" → "×10" → "20" → "20"
Article Count: 1 → 1 → 1 → 1
Meaning: 1 calculation result (10% of Rs 200 = Rs 20)
```

---

## 🔍 Navigation and Review

### CHECK Navigation States
The calculator maintains a `currentCheckIndex` to track navigation position:

```typescript
// Forward navigation (CHECK→)
let currentStepIndex = parseInt(localStorage.getItem('currentCheckIndex') || '-1');
currentStepIndex++; // Move forward

// Backward navigation (CHECK←)
let currentStepIndex = parseInt(localStorage.getItem('currentCheckIndex') || '-1');
currentStepIndex--; // Move backward

// Wrap around logic
if (currentStepIndex >= totalPositions) currentStepIndex = 0;
if (currentStepIndex < 0) currentStepIndex = totalPositions - 1;
```

### Display During Navigation
```
Original Calculation: 10 + 20 + 30 = 60

Navigation Sequence:
Index 0: Display "10"     (First number)
Index 1: Display "+20"    (Second operation)
Index 2: Display "+30"    (Third operation)
Index 3: Display "=60"    (Final result)
```

---

## 🏗️ Implementation Architecture

### Flow Decision Tree
```
Input Received
    ↓
Is it × or ÷?
    ↓
   Yes → Use Compound Flow
    ↓
   No → Check History
    ↓
Any previous × or ÷?
    ↓
   Yes → Use Compound Flow
    ↓
   No → Use Simple Flow
```

### State Management
```typescript
interface CalculationStep {
  expression: string;      // "10", "+20", "×3"
  result: number;          // 10, 20, 3
  timestamp: number;       // When step was created
  stepNumber: number;      // 1, 2, 3...
  operationType: string;   // "number", "operation", "result"
  displayValue: string;    // What user sees: "10", "+20", "×3"
  isComplete: boolean;     // false during input, true after =
  operator?: string;       // "+", "-", "*", "/"
}
```

### Counter Update Rules
```typescript
// Rule 1: First number always sets count to 1
if (calculationSteps.length === 0) {
  articleCount = 1;
}

// Rule 2: New number after operator increments count (Simple Flow)
else if (lastOperation && isNewNumber && !isCompound) {
  articleCount = calculationSteps.length + 1;
}

// Rule 3: Multiplication sets count to quantity (Compound Flow)
// REMOVED: Operators no longer change article count

// Rule 3: Building existing number doesn't change count
else if (!isNewNumber) {
  // articleCount unchanged
}
```

---

## 🎯 Practical Business Logic

### Why Two Flows?

**Simple Flow Use Cases:**
- Adding multiple different items: "Bread Rs 25 + Milk Rs 30 + Rice Rs 45"
- Mixed transactions: "Sale Rs 100 - Discount Rs 10 - Tax Rs 5"
- Running totals: "Previous balance + New charges - Payments"

**Compound Flow Use Cases:**
- Quantity pricing: "8 cigarette packs × Rs 12 each" (2 items: quantity and price)
- Bulk calculations: "50 bottles × Rs 15 each" (2 items: quantity and price)
- Percentage calculations: "Rs 1000 × 15% VAT"
- Division scenarios: "Rs 100 bill ÷ 4 people" (2 items: total and divisor)

### Article Count Business Meaning

**Simple Flow**: Article count = **number of different items**
- 3 different products → Article count: 3
- Useful for inventory counting

**Compound Flow**: Article count = **quantity of same item**
- Quantity × Price → Article count: 2 (quantity and price are 2 separate items)
- Useful for understanding calculation complexity

---

## 🔧 Technical Implementation Details

### Expression Evaluation
```typescript
// Simple: Direct concatenation
"10" + "+20" + "+30" = "10+20+30" → eval() → 60

// Compound: Operator-based building
"5" + ("*" + "3") = "5*3" → eval() → 15
```

### Error Handling
```typescript
// Invalid operations return to safe state
try {
  result = evaluateExpression(expression);
} catch (error) {
  display = "Error";
  isError = true;
  // Require clear operation to continue
}
```

### Memory Integration
```typescript
// Memory operations work with current display value
M+ : memory += parseFloat(currentDisplay)
MR : display = memory.toString()
MC : memory = 0
```

---

## 🚀 Advanced Features

### Auto-Replay Functionality
```typescript
// Replays entire calculation sequence automatically
AUTO button → Step 1 (1 sec) → Step 2 (1 sec) → Result (1 sec) → Complete
```

### Grand Total Accumulation
```typescript
// Accumulates results across multiple calculations
Calculation 1: 10 + 20 = 30     → GT: 30
Calculation 2: 5 × 4 = 20       → GT: 50
Calculation 3: 100 - 25 = 75    → GT: 125
GT button shows: 125
```

### Transaction History
```typescript
// Maintains history of all completed calculations
transactionHistory: [30, 20, 75, ...]
// Used for statistics and review
```

---

## 🎨 Visual Feedback

### Display Formatting
```typescript
// During input: Show exact user input
"125.5" → Display: "125.5"

// After equals: Smart formatting
"125.50" → Display: "125.5" (remove trailing zero)
"125.00" → Display: "125" (remove unnecessary decimals)
"0.1234567" → Display: "0.123457" (round long decimals)
```

### Step Display Format
```typescript
// Numbers: Show value only
Step 1: "10"

// Operations: Show operator + value
Step 2: "+20"
Step 3: "×5"
Step 4: "÷2"

// Results: Show equals + value
Final: "=60"
```

This architecture ensures that users get intuitive feedback about their calculations while the system maintains accurate business logic for both simple item addition and complex quantity-based pricing scenarios.