import "dotenv/config";
import { ethers } from "ethers";

const RPC_URL = process.env.MAINNET_RPC_URL;

const CONTRACT_ADDRESS =
  "0xbb534032083787277A0f254D7066Cb3144Cd5980";

if (!RPC_URL) {
  throw new Error("MAINNET_RPC_URL is missing from environment variables.");
}

const provider = new ethers.JsonRpcProvider(RPC_URL);

const ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function owner() view returns (address)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function MINIMUM_TASK_PAYMENT() view returns (uint256)",
  "function processedTasks(bytes32) view returns (bool)",
  "event CIPaymentProcessed(address indexed client, uint256 amount, string taskId)",
];

export const token = new ethers.Contract(
  CONTRACT_ADDRESS,
  ABI,
  provider
);

export async function getGatewayInfo() {
  const [
    name,
    symbol,
    decimals,
    owner,
    totalSupply,
    minimumPayment,
  ] = await Promise.all([
    token.name(),
    token.symbol(),
    token.decimals(),
    token.owner(),
    token.totalSupply(),
    token.MINIMUM_TASK_PAYMENT(),
  ]);

  return {
    contract: CONTRACT_ADDRESS,
    name,
    symbol,
    decimals: Number(decimals),
    owner,
    totalSupply: ethers.formatUnits(totalSupply, decimals),
    minimumPayment: ethers.formatUnits(minimumPayment, decimals),
  };
}

export async function isTaskProcessed(taskId) {
  const taskHash = ethers.keccak256(
    ethers.toUtf8Bytes(taskId)
  );

  return token.processedTasks(taskHash);
}

export async function verifyPayment(
  transactionHash,
  expectedClient,
  expectedTaskId,
  expectedAmount
) {
  if (!ethers.isHexString(transactionHash, 32)) {
    throw new Error("Invalid transaction hash.");
  }

  if (!ethers.isAddress(expectedClient)) {
    throw new Error("Invalid client address.");
  }

  const receipt = await provider.getTransactionReceipt(
    transactionHash
  );

  if (!receipt) {
    return {
      verified: false,
      reason: "Transaction not found or not confirmed.",
    };
  }

  if (receipt.status !== 1) {
    return {
      verified: false,
      reason: "Transaction failed.",
    };
  }

  if (
    receipt.to?.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()
  ) {
    return {
      verified: false,
      reason: "Transaction was not sent to the AIGN contract.",
    };
  }

  const iface = token.interface;

  let paymentFound = false;

  for (const log of receipt.logs) {
    if (
      log.address.toLowerCase() !==
      CONTRACT_ADDRESS.toLowerCase()
    ) {
      continue;
    }

    try {
      const parsed = iface.parseLog(log);

      if (!parsed || parsed.name !== "CIPaymentProcessed") {
        continue;
      }

      const client = parsed.args.client;
      const amount = parsed.args.amount;
      const taskId = parsed.args.taskId;

      if (
        client.toLowerCase() === expectedClient.toLowerCase() &&
        taskId === expectedTaskId &&
        amount === expectedAmount
      ) {
        paymentFound = true;
        break;
      }
    } catch {
      // Ignore unrelated logs.
    }
  }

  if (!paymentFound) {
    return {
      verified: false,
      reason: "Matching AIGN payment event was not found.",
    };
  }

  const alreadyProcessed = await isTaskProcessed(
    expectedTaskId
  );

  if (!alreadyProcessed) {
    return {
      verified: false,
      reason: "Task is not marked as processed on-chain.",
    };
  }

  return {
    verified: true,
    transactionHash,
    client: expectedClient,
    amount: ethers.formatUnits(expectedAmount, 18),
    taskId: expectedTaskId,
  };
}

