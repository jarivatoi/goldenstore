/**
 * DUPLICATE CLIENT FIX UTILITY
 * =============================
 *
 * This utility removes duplicate clients that may have been created during migration
 */

import { creditDBManager } from './creditIndexedDB';

export async function removeDuplicateClients() {
  try {
    console.log('Starting duplicate client removal...');

    // Initialize DB
    await creditDBManager.initDB();

    // Get all clients
    const allClients = await creditDBManager.getAllClients();
    console.log(`Total clients found: ${allClients.length}`);

    // Group clients by their numeric ID
    const clientGroups = new Map<number, typeof allClients>();

    for (const client of allClients) {
      const match = client.id.match(/^G(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);

        if (!clientGroups.has(num)) {
          clientGroups.set(num, []);
        }
        clientGroups.get(num)!.push(client);
      }
    }

    // Find and remove duplicates
    let duplicatesRemoved = 0;

    for (const [num, group] of clientGroups.entries()) {
      if (group.length > 1) {
        console.log(`Found ${group.length} clients with number ${num}:`);
        group.forEach(c => console.log(`  - ${c.id}: ${c.name}`));

        // Keep the one without leading zeros (e.g., G1 over G001)
        const correctFormat = group.find(c => c.id === `G${num}`);
        const oldFormats = group.filter(c => c.id !== `G${num}`);

        if (correctFormat && oldFormats.length > 0) {
          // Delete old format clients
          for (const oldClient of oldFormats) {
            console.log(`Deleting duplicate: ${oldClient.id}`);
            await creditDBManager.deleteClient(oldClient.id);
            duplicatesRemoved++;
          }
        }
      }
    }

    console.log(`✅ Removed ${duplicatesRemoved} duplicate clients`);

    // Get updated count
    const remainingClients = await creditDBManager.getAllClients();
    console.log(`✅ Remaining clients: ${remainingClients.length}`);

    return {
      success: true,
      duplicatesRemoved,
      remainingClients: remainingClients.length
    };
  } catch (error) {
    console.error('Error removing duplicates:', error);
    throw error;
  }
}
