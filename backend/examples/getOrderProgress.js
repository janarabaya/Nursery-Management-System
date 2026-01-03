/**
 * Example: Get Order Progress from Access Database
 * 
 * This example demonstrates how to retrieve Order Progress
 * for a specific Order ID from the Access database.
 * 
 * Usage:
 *   node examples/getOrderProgress.js <OrderID>
 * 
 * Example:
 *   node examples/getOrderProgress.js 1
 */

import { getOrderProgress } from '../src/database.js';

// Get Order ID from command line arguments
const orderID = process.argv[2];

if (!orderID) {
  console.error('❌ Error: Order ID is required');
  console.log('\nUsage: node examples/getOrderProgress.js <OrderID>');
  console.log('Example: node examples/getOrderProgress.js 1\n');
  process.exit(1);
}

// Parse Order ID
const parsedOrderID = parseInt(orderID);

if (isNaN(parsedOrderID)) {
  console.error('❌ Error: Order ID must be a number');
  process.exit(1);
}

// Retrieve Order Progress
(async () => {
  try {
    console.log(`\n🔍 Retrieving Order Progress for Order ID: ${parsedOrderID}\n`);
    
    const result = await getOrderProgress(parsedOrderID);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Order ID: ${result.orderID}`);
    console.log(`Order Progress: ${result.orderProgress}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Exit successfully
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
})();




