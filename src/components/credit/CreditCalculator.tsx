@@ .. @@
         onClose={() => {
           setShowClientSearch(false);
          // Preserve calculator state when closing modal
         }}
         onAddToClient={handleAddToClient}
         linkedClient={linkedClient}
        onResetCalculator={() => {
          // Only reset when explicitly requested (X button)
          handleResetCalculator();
        }}
       />
     )
   );

  const handleAddToClient = async (client: Client, description: string) => {
    try {
      const amount = parseFloat(calculatorValue);
      if (isNaN(amount) || !isFinite(amount) || amount <= 0) {
        alert('Please enter a valid amount');
        return;
      }

      await addTransaction(client, description, amount);
      
      // Show success feedback
      setRecentTransactionClient(client);
      setTimeout(() => setRecentTransactionClient(null), 3000);
      
      // Close modal but DON'T reset calculator
      setShowClientSearch(false);
      
      // Move client to front for better UX
      moveClientToFront(client.id);
    } catch (error) {
      console.error('Error adding transaction:', error);
      alert('Failed to add transaction');
    }
  };