import "dotenv/config";
import mysql from "mysql2/promise";

const db = mysql.createPool({
  host: process.env.db_host?.trim(),
  port: Number(process.env.db_port || 3306),
  user: process.env.db_user?.trim(),
  password: process.env.db_password,
  database: process.env.db_database?.trim(),
  charset: "utf8mb4",

  ssl:
    process.env.db_ssl?.trim().toLowerCase() === "true"
      ? { rejectUnauthorized: false }
      : undefined,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test the database connection without exposing credentials.
try {
  const connection = await db.getConnection();

  try {
    await connection.query("SELECT 1");
    console.log("✅ MySQL connected successfully!");
  } finally {
    connection.release();
  }
} catch (error) {
  console.error("❌ MySQL connection failed:", {
    code: error.code,
    message: error.message,
  });

  // Stop startup if the database is unavailable.
  throw error;
}

export default db;
