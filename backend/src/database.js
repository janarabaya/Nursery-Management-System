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

export const execute = async (sql) => {
  console.log("⚡ Execute:", sql);
  try {
    const p = await getPool();
    await p.query(sql);
    console.log("✅ Execute successful");
    return true;
  } catch (err) {
    console.error("❌ Execute error:", err.message);
    throw err;
  }
};

// Close pool on exit
process.on('exit', async () => {
  if (pool) {
    await pool.close();
  }
});
