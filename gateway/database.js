import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing from environment variables.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

await pool.query(`
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

export const db = pool;

export async function createTask(task) {
  await pool.query(
    `
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
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
    [
      task.taskId,
      task.clientAddress,
      task.task,
      task.requiredPayment,
      task.decimals,
      task.token,
      task.network,
      task.status,
      task.createdAt,
    ]
  );
}

export async function getTask(taskId) {
  const result = await pool.query(
    `
      SELECT
        task_id AS "taskId",
        client_address AS "clientAddress",
        task,
        required_payment AS "requiredPayment",
        decimals,
        token,
        network,
        status,
        created_at AS "createdAt",
        payment_json AS "paymentJson",
        result,
        model,
        completed_at AS "completedAt"
      FROM tasks
      WHERE task_id = $1
    `,
    [taskId]
  );

  return result.rows[0];
}

export async function updateTask(taskId, updates) {
  const allowedFields = {
    status: "status",
    payment: "payment_json",
    result: "result",
    model: "model",
    completedAt: "completed_at",
  };

  const fields = [];
  const values = [];
  let parameterIndex = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (!(key in allowedFields)) continue;

    fields.push(
      `${allowedFields[key]} = $${parameterIndex}`
    );

    values.push(
      key === "payment"
        ? JSON.stringify(value)
        : value
    );

    parameterIndex++;
  }

  if (fields.length === 0) return;

  values.push(taskId);

  await pool.query(
    `
      UPDATE tasks
      SET ${fields.join(", ")}
      WHERE task_id = $${parameterIndex}
    `,
    values
  );
}

export async function closeDatabase() {
  await pool.end();
}