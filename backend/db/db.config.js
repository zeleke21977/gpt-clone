import "dotenv/config";
import mysql from "mysql2/promise";

const db = mysql.createPool({
  host: process.env.db_host,
  port: Number(process.env.db_port || 3306),
  user: process.env.db_user,
  password: process.env.db_password,
  database: process.env.db_database,
  charset: "utf8mb4", // Support for emojis and special characters

  // Many hosted MySQL services (Aiven, PlanetScale, Railway...) require SSL.
  // Set db_ssl=true to turn it on.
  ssl: process.env.db_ssl === "true" ? { rejectUnauthorized: false } : undefined,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

try {
  await db.query("SELECT 1");
  console.log("✅ MySQL connected successfully!");
} catch (error) {
  console.error("❌ MySQL connection failed:", error.message);
}

export default db;
