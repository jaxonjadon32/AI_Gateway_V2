import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDirectory = path.join(__dirname, "..", "data");

if (!fs.existsSync(dataDirectory)) {
  fs.mkdirSync(dataDirectory, { recursive: true });
}

const dbPath = path.join(dataDirectory, "gateway.db");

export const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    task_id TEXT PRIMARY KEY,
    client_address TEXT NOT NULL,
    task TEXT NOT NULL,
    required_payment TEXT NOT NULL,
    decimals INTEGER NOT NULL,
    token TEXT NOT NULL,
    network TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    payment_json TEXT,
    result TEXT,
    model TEXT,
    completed_at TEXT
  );
`);

export function createTask(task) {
  db.prepare(`
    INSERT INTO tasks (
      task_id,
      client_address,
      task,
      required_payment,
      decimals,
      token,
      network,
      status,
      created_at
    )
    VALUES (
      @taskId,
      @clientAddress,
      @task,
      @requiredPayment,
      @decimals,
      @token,
      @network,
      @status,
      @createdAt
    )
  `).run(task);
}

export function getTask(taskId) {
  return db.prepare(`
    SELECT
      task_id AS taskId,
      client_address AS clientAddress,
      task,
      required_payment AS requiredPayment,
      decimals,
      token,
      network,
      status,
      created_at AS createdAt,
      payment_json AS paymentJson,
      result,
      model,
      completed_at AS completedAt
    FROM tasks
    WHERE task_id = ?
  `).get(taskId);
}

export function updateTask(taskId, updates) {
  const allowedFields = {
    status: "status",
    payment: "payment_json",
    result: "result",
    model: "model",
    completedAt: "completed_at",
  };

  const fields = [];
  const values = { taskId };

  for (const [key, value] of Object.entries(updates)) {
    if (!(key in allowedFields)) continue;

    fields.push(`${allowedFields[key]} = @${key}`);
    values[key] =
      key === "payment"
        ? JSON.stringify(value)
        : value;
  }

  if (fields.length === 0) return;

  db.prepare(`
    UPDATE tasks
    SET ${fields.join(", ")}
    WHERE task_id = @taskId
  `).run(values);
}

export function closeDatabase() {
  db.close();
}
