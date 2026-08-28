import "dotenv/config";
import express from "express";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import { ethers } from "ethers";

import {
  getGatewayInfo,
  isTaskProcessed,
  verifyPayment,
} from "./blockchain.js";

import { runAI } from "./ai.js";

import {
  createTask,
  getTask,
  updateTask,
} from "./database.js";

const app = express();

const PORT = process.env.PORT || 3000;
const GATEWAY_API_KEY = process.env.GATEWAY_API_KEY;

if (!GATEWAY_API_KEY) {
  throw new Error(
    "GATEWAY_API_KEY is missing from environment variables."
  );
}

app.use(express.json({ limit: "32kb" }));

// --------------------------------------------------
// RATE LIMITING
// --------------------------------------------------

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: "Too many requests. Please try again later.",
  },
});

const taskLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: "Too many task requests. Please try again later.",
  },
});

const executeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: "Too many AI execution requests. Please try again later.",
  },
});

app.use(apiLimiter);

// --------------------------------------------------
// API KEY AUTHENTICATION
// --------------------------------------------------

function requireApiKey(req, res, next) {
  const providedKey = req.get("x-api-key");

  if (!providedKey || providedKey !== GATEWAY_API_KEY) {
    return res.status(401).json({
      error: "Unauthorized",
    });
  }

  next();
}

// --------------------------------------------------
// PUBLIC ROUTES
// --------------------------------------------------

app.get("/", (req, res) => {
  res.json({
    name: "AI Agent Gateway",
    version: "2.0.0",
    network: "Ethereum Sepolia",
    token: "AIGN",
    contract: "0xbb534032083787277A0f254D7066Cb3144Cd5980",
    status: "online",
  });
});

app.get("/health", async (req, res) => {
  try {
    const info = await getGatewayInfo();

    res.json({
      status: "healthy",
      blockchain: "connected",
      network: "Ethereum Sepolia",
      token: info.symbol,
      contract: info.contract,
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      blockchain: "disconnected",
      error: "Blockchain connection unavailable.",
    });
  }
});

app.get("/info", async (req, res) => {
  try {
    const info = await getGatewayInfo();

    res.json(info);
  } catch (error) {
    res.status(500).json({
      error: "Unable to retrieve gateway information.",
    });
  }
});

// --------------------------------------------------
// CREATE TASK
// --------------------------------------------------

app.post(
  "/tasks",
  requireApiKey,
  taskLimiter,
  async (req, res) => {
    try {
      const { clientAddress, task } = req.body;

      if (!clientAddress) {
        return res.status(400).json({
          error: "clientAddress is required",
        });
      }

      if (!ethers.isAddress(clientAddress)) {
        return res.status(400).json({
          error: "Invalid Ethereum address",
        });
      }

      if (!task || typeof task !== "string") {
        return res.status(400).json({
          error: "task is required",
        });
      }

      const trimmedTask = task.trim();

      if (trimmedTask.length === 0) {
        return res.status(400).json({
          error: "task cannot be empty",
        });
      }

      if (trimmedTask.length > 10000) {
        return res.status(400).json({
          error: "task is too long. Maximum length is 10,000 characters.",
        });
      }

      const taskId = crypto.randomUUID();
      const info = await getGatewayInfo();

      const taskRecord = {
        taskId,
        clientAddress,
        task: trimmedTask,
        requiredPayment: info.minimumPayment,
        decimals: info.decimals,
        token: info.symbol,
        network: "sepolia",
        status: "awaiting_payment",
        createdAt: new Date().toISOString(),
      };

      await createTask(taskRecord);

      res.status(201).json(taskRecord);
    } catch (error) {
      console.error("Create task error:", error);

      res.status(500).json({
        error: "Unable to create task.",
      });
    }
  }
);

// --------------------------------------------------
// GET TASK
// --------------------------------------------------

app.get(
  "/tasks/:taskId",
  requireApiKey,
  async (req, res) => {
    try {
      const { taskId } = req.params;

      if (!taskId || taskId.length > 100) {
        return res.status(400).json({
          error: "Invalid task ID",
        });
      }

      const task = await getTask(taskId);

      if (!task) {
        return res.status(404).json({
          error: "Task not found",
        });
      }

      const processed = await isTaskProcessed(taskId);

      res.json({
        ...task,
        onChainProcessed: processed,
      });
    } catch (error) {
      console.error("Get task error:", error);

      res.status(500).json({
        error: "Unable to retrieve task.",
      });
    }
  }
);

// --------------------------------------------------
// VERIFY PAYMENT
// --------------------------------------------------

app.post(
  "/payments/verify",
  requireApiKey,
  async (req, res) => {
    try {
      const {
        transactionHash,
        clientAddress,
        taskId,
      } = req.body;

      if (!transactionHash) {
        return res.status(400).json({
          error: "transactionHash is required",
        });
      }

      if (!ethers.isHexString(transactionHash, 32)) {
        return res.status(400).json({
          error: "Invalid transaction hash",
        });
      }

      if (!clientAddress) {
        return res.status(400).json({
          error: "clientAddress is required",
        });
      }

      if (!ethers.isAddress(clientAddress)) {
        return res.status(400).json({
          error: "Invalid Ethereum address",
        });
      }

      if (!taskId) {
        return res.status(400).json({
          error: "taskId is required",
        });
      }

      if (taskId.length > 100) {
        return res.status(400).json({
          error: "Invalid task ID",
        });
      }

      const task = await getTask(taskId);

      if (!task) {
        return res.status(404).json({
          error: "Task not found",
        });
      }

      if (
        task.clientAddress.toLowerCase() !==
        clientAddress.toLowerCase()
      ) {
        return res.status(403).json({
          error: "Client address does not match task.",
        });
      }

      if (task.status === "completed") {
        return res.status(409).json({
          error: "Task already completed.",
        });
      }

      if (task.status === "paid" || task.status === "processing") {
        return res.status(409).json({
          error: "Payment has already been verified for this task.",
        });
      }

      const amount = ethers.parseUnits(
        task.requiredPayment,
        task.decimals ?? 18
      );

      const result = await verifyPayment(
        transactionHash,
        clientAddress,
        taskId,
        amount
      );

      if (!result.verified) {
        return res.status(400).json(result);
      }

      await updateTask(taskId, {
        status: "paid",
        payment: result,
      });

      task.status = "paid";
      task.payment = result;

      res.json({
        success: true,
        task,
      });
    } catch (error) {
      console.error("Payment verification error:", error);

      res.status(500).json({
        error: "Unable to verify payment.",
      });
    }
  }
);

// --------------------------------------------------
// EXECUTE PAID AI TASK
// --------------------------------------------------

app.post(
  "/tasks/:taskId/execute",
  requireApiKey,
  executeLimiter,
  async (req, res) => {
    const { taskId } = req.params;

    try {
      if (!taskId || taskId.length > 100) {
        return res.status(400).json({
          error: "Invalid task ID",
        });
      }

      const task = await getTask(taskId);

      if (!task) {
        return res.status(404).json({
          error: "Task not found",
        });
      }

      if (task.status === "completed") {
        return res.status(409).json({
          error: "Task already completed",
        });
      }

      if (task.status === "processing") {
        return res.status(409).json({
          error: "Task is already being processed",
        });
      }

      if (task.status !== "paid") {
        return res.status(402).json({
          error: "Payment required",
          status: task.status,
        });
      }

      await updateTask(taskId, {
        status: "processing",
      });

      const aiResult = await runAI(task.task);

      const completedAt = new Date().toISOString();

      await updateTask(taskId, {
        status: "completed",
        result: aiResult.result,
        model: aiResult.model,
        completedAt,
      });

      res.json({
        success: true,
        taskId,
        status: "completed",
        result: aiResult.result,
        model: aiResult.model,
        completedAt,
      });
    } catch (error) {
      console.error("AI execution error:", error);

      try {
        const task = await getTask(taskId);

        if (task && task.status === "processing") {
          await updateTask(taskId, {
            status: "paid",
          });
        }
      } catch (recoveryError) {
        console.error(
          "Failed to restore task state:",
          recoveryError
        );
      }

      res.status(500).json({
        error: "AI task execution failed.",
      });
    }
  }
);

// --------------------------------------------------
// SERVER
// --------------------------------------------------

app.listen(PORT, () => {
  console.log("=================================");
  console.log("AI Agent Gateway");
  console.log("=================================");
  console.log(`Server: http://localhost:${PORT}`);
  console.log("Network: Ethereum Sepolia");
  console.log("Token: AIGN");
  console.log("AI: Gemini");
  console.log("Authentication: API key");
  console.log("Status: ONLINE");
});

