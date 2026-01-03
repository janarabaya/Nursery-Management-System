import odbc from "odbc";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFile = path.resolve(__dirname, "../", process.env.ACCESS_DB_PATH || "./db/NurseryDB1.accdb");

console.log("📁 Database path:", dbFile);

// Connection string for Microsoft Access
const connectionString = `Driver={Microsoft Access Driver (*.mdb, *.accdb)};DBQ=${dbFile};`;

let pool = null;

// Initialize connection pool
async function getPool() {
  if (!pool) {
    try {
      pool = await odbc.pool(connectionString);
      console.log("✅ Database pool created successfully");
    } catch (err) {
      console.error("❌ Failed to create database pool:", err.message);
      throw err;
    }
  }
  return pool;
}

export const dbPath = dbFile;

export const query = async (sql) => {
  console.log("🔍 SQL:", sql);
  try {
    const p = await getPool();
    const result = await p.query(sql);
    console.log("✅ Query successful, rows:", result?.length || 0);
    return result;
  } catch (err) {
    console.error("❌ Query error:", err.message);
    console.error("❌ Full error:", JSON.stringify(err, null, 2));
    console.error("❌ ODBC errors:", err.odbcErrors);
    throw err;
  }
};

export const execute = async (sql, params = []) => {
  console.log("⚡ Execute:", sql);
  if (params.length > 0) {
    console.log("⚡ Parameters:", params);
  }
  try {
    const p = await getPool();
    if (params.length > 0) {
      await p.query(sql, params);
    } else {
      await p.query(sql);
    }
    console.log("✅ Execute successful");
    return true;
  } catch (err) {
    console.error("❌ Execute error:", err.message);
    throw err;
  }
};

/**
 * Retrieve Order Progress from the Orders table
 * @param {number|string} orderID - The Order ID to search for
 * @returns {Promise<{orderID: number|string, orderProgress: string|null}>} Object with Order ID and Order Progress value
 */
export const getOrderProgress = async (orderID) => {
  console.log(`🔍 Retrieving Order Progress for OrderID: ${orderID}`);
  
  try {
    // First, try to get all columns to see what's available
    const p = await getPool();
    
    // Try different possible column names for Order Progress
    // Access Database column names can vary, so we'll try multiple variations
    const possibleColumnNames = [
      '[Order Progress]',
      'OrderProgress',
      '[OrderProgress]',
      'Order_Progress',
      '[Order_Progress]',
      'Progress',
      '[Progress]'
    ];
    
    // Try to get the order first
    const checkOrderSQL = `SELECT [OrderID] FROM [Orders] WHERE [OrderID] = ${orderID}`;
    console.log("🔍 Checking if order exists:", checkOrderSQL);
    
    const checkResult = await p.query(checkOrderSQL);
    
    if (!checkResult || checkResult.length === 0) {
      console.log(`⚠️ Order ID ${orderID} not found`);
      return {
        orderID: orderID,
        orderProgress: "Order not found"
      };
    }
    
    // Now try to get Order Progress with different column name variations
    let orderProgressValue = null;
    let foundColumn = null;
    
    for (const columnName of possibleColumnNames) {
      try {
        const sql = `SELECT ${columnName} FROM [Orders] WHERE [OrderID] = ${orderID}`;
        console.log(`🔍 Trying column: ${columnName}`);
        const result = await p.query(sql);
        
        if (result && result.length > 0) {
          // Try different ways to access the value
          const row = result[0];
          orderProgressValue = row[columnName] || 
                              row[columnName.replace(/[\[\]]/g, '')] || 
                              row[columnName.replace(/[\[\]]/g, '').replace(/\s+/g, '_')] ||
                              row[columnName.replace(/[\[\]]/g, '').replace(/\s+/g, '')] ||
                              null;
          
          if (orderProgressValue !== null && orderProgressValue !== undefined) {
            foundColumn = columnName;
            console.log(`✅ Found Order Progress using column: ${columnName}`);
            break;
          }
        }
      } catch (colError) {
        // Column doesn't exist with this name, try next
        console.log(`⚠️ Column ${columnName} not found, trying next...`);
        continue;
      }
    }
    
    // If still not found, try SELECT * and inspect all columns
    if (orderProgressValue === null || orderProgressValue === undefined) {
      try {
        console.log("🔍 Trying SELECT * to find Order Progress column...");
        const allColumnsSQL = `SELECT * FROM [Orders] WHERE [OrderID] = ${orderID}`;
        const allResult = await p.query(allColumnsSQL);
        
        if (allResult && allResult.length > 0) {
          const row = allResult[0];
          console.log("📋 Available columns:", Object.keys(row));
          
          // Look for any column that might be Order Progress
          for (const key of Object.keys(row)) {
            const keyLower = key.toLowerCase();
            if (keyLower.includes('progress') || 
                keyLower.includes('order progress') ||
                keyLower === 'orderprogress') {
              orderProgressValue = row[key];
              foundColumn = key;
              console.log(`✅ Found Order Progress in column: ${key}`);
              break;
            }
          }
        }
      } catch (allError) {
        console.log("⚠️ Could not retrieve all columns:", allError.message);
      }
    }
    
    // Format the result
    if (orderProgressValue === null || orderProgressValue === undefined) {
      console.log(`⚠️ Order Progress column not found for Order ID ${orderID}`);
      return {
        orderID: orderID,
        orderProgress: "Order Progress column not found in database"
      };
    }
    
    console.log(`✅ Order Progress retrieved: ${orderProgressValue} (from column: ${foundColumn})`);
    
    return {
      orderID: orderID,
      orderProgress: String(orderProgressValue)
    };
  } catch (err) {
    console.error("❌ Error retrieving Order Progress:", err.message);
    console.error("❌ Full error:", JSON.stringify(err, null, 2));
    if (err.odbcErrors) {
      console.error("❌ ODBC errors:", err.odbcErrors);
    }
    throw err;
  }
};

// Close pool on exit
process.on('exit', async () => {
  if (pool) {
    await pool.close();
  }
});
