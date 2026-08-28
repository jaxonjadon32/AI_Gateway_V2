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

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

app.use(apiLimiter);

import { createTask, getTask, updateTask } from "./database.js";

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
      error: error.message,
    });
  }
});

app.get("/info", async (req, res) => {
  try {
    const info = await getGatewayInfo();
    res.json(info);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});

app.post("/tasks", async (req, res) => {
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

    const taskId = crypto.randomUUID();
    const info = await getGatewayInfo();

    const taskRecord = {
      taskId,
      clientAddress,
      task,
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
    res.status(500).json({
      error: error.message,
    });
  }
});

app.get("/tasks/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
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
    res.status(500).json({
      error: error.message,
    });
  }
});

app.post("/payments/verify", async (req, res) => {
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

    if (!clientAddress) {
      return res.status(400).json({
        error: "clientAddress is required",
      });
    }

    if (!taskId) {
      return res.status(400).json({
        error: "taskId is required",
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
    res.status(500).json({
      error: error.message,
    });
  }
});

/*
 * Execute a paid AI task.
 *
 * A task MUST have:
 *   1. A valid task ID
 *   2. A verified on-chain payment
 *
 * Only then will Gemini be called.
 */
app.post("/tasks/:taskId/execute", async (req, res) => {
  try {
    const { taskId } = req.params;

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

    if (task.status !== "paid") {
      return res.status(402).json({
        error: "Payment required",
        status: task.status,
      });
    }


    await updateTask(taskId, { status: "processing" });

    const aiResult = await runAI(task.task);

    const completedAt = new Date().toISOString();

    await updateTask(taskId, {
      status: "completed",
      result: aiResult.result,
      model: aiResult.model,
      completedAt,
    });

    task.status = "completed";
    task.result = aiResult.result;
    task.model = aiResult.model;
    task.completedAt = completedAt;

    res.json({
      success: true,
      taskId: task.taskId,
      status: task.status,
      result: task.result,
      model: task.model,
    });
  } catch (error) {
    const task = await getTask(req.params.taskId);

    if (task && task.status === "processing") {
      await updateTask(req.params.taskId, { status: "paid" });
    }

    res.status(500).json({
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log("=================================");
  console.log("AI Agent Gateway");
  console.log("=================================");
  console.log(`Server: http://localhost:${PORT}`);
  console.log("Network: Ethereum Sepolia");
  console.log("Token: AIGN");
  console.log("AI: Gemini");
  console.log("Status: ONLINE");
});























