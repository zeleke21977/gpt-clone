import db from "./db.config.js";

// ======================================================
// Creates every table / column that is missing, so a fresh
// database (deployment) or an older one (upgrade) both work.
// Safe to run on every start.
// ======================================================

const columnExists = async (table, column) => {
  const [rows] = await db.query(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column],
  );
  return rows.length > 0;
};

const addColumn = async (table, column, definition) => {
  if (!(await columnExists(table, column))) {
    await db.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
};

const addForeignKey = async (table, name, column, refTable) => {
  const [rows] = await db.query(
    `SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
       AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
    [table, name],
  );

  if (rows.length === 0) {
    await db.query(
      `ALTER TABLE ${table}
       ADD CONSTRAINT ${name} FOREIGN KEY (${column})
       REFERENCES ${refTable}(id) ON DELETE CASCADE`,
    );
  }
};

const addIndex = async (table, name, column) => {
  const [rows] = await db.query(
    `SELECT 1 FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [table, name],
  );

  if (rows.length === 0) {
    await db.query(`CREATE INDEX ${name} ON ${table}(${column})`);
  }
};

export default async function ensureSchema() {
  // ---------------- projects ----------------
  await db.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description VARCHAR(500) NOT NULL DEFAULT '',
      instructions TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // ---------------- chat sessions ----------------
  await db.query(`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL DEFAULT 'New chat',
      is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
      is_archived BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // ---------------- messages ----------------
  await db.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      conversation_id BIGINT UNSIGNED NULL,
      role ENUM('user', 'assistant') NOT NULL,
      content TEXT NOT NULL,
      token_count INT UNSIGNED NOT NULL DEFAULT 0,
      feedback ENUM('like', 'dislike') NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_conversation_session
        FOREIGN KEY (conversation_id) REFERENCES chat_sessions(id)
        ON DELETE CASCADE
    )
  `);

  // ---------------- images ----------------
  await db.query(`
    CREATE TABLE IF NOT EXISTS generated_images (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      prompt TEXT NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      mime_type VARCHAR(50) NOT NULL DEFAULT 'image/png',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ---------------- upgrades for older databases ----------------
  await addColumn("chat_sessions", "mode", "VARCHAR(40) NOT NULL DEFAULT 'chat'");
  await addColumn("chat_sessions", "project_id", "BIGINT UNSIGNED NULL");

  await addForeignKey("chat_sessions", "fk_session_project", "project_id", "projects");

  await addIndex("conversations", "idx_conversation_session", "conversation_id");
  await addIndex("chat_sessions", "idx_chat_sessions_updated", "updated_at");

  console.log("✅ Database schema is up to date");
}
