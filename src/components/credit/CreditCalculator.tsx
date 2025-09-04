@@ .. @@
         onClose={() => {
           setShowClientSearch(false);
-          // Don't reset calculator when closing modal - preserve state
+          // Preserve calculator state when closing modal
         }}
         onAddToClient={handleAddToClient}
         linkedClient={linkedClient}
-        onResetCalculator={handleResetCalculator}
+        onResetCalculator={() => {
+          // Only reset when explicitly requested (X button)
+          handleResetCalculator();
+        }}
       />
     )
   );