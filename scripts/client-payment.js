import hre from "hardhat";

const CONTRACT_ADDRESS = "0xbb534032083787277A0f254D7066Cb3144Cd5980";

async function main() {
  const connection = await hre.network.getOrCreate();
  const { ethers } = connection;

  const clientKey = process.env.CLIENT_PRIVATE_KEY;

  if (!clientKey) {
    throw new Error("CLIENT_PRIVATE_KEY is missing from .env");
  }

  const client = new ethers.Wallet(clientKey, ethers.provider);

  const token = await ethers.getContractAt(
    "AIGNV2",
    CONTRACT_ADDRESS,
    client
  );

  const owner = await token.owner();

  const amount = ethers.parseUnits("0.5", 18);
const taskId = process.env.GATEWAY_TASK_ID;

if (!taskId) {
  throw new Error("GATEWAY_TASK_ID is missing from .env");
}

  console.log("AIGN V2 LIVE CLIENT PAYMENT");
  console.log("--------------------------------");
  console.log("Client:", client.address);
  console.log("Owner:", owner);
  console.log("Contract:", CONTRACT_ADDRESS);
  console.log("Payment:", ethers.formatUnits(amount, 18), "AIGN");
  console.log("Task ID:", taskId);

  const clientBefore = await token.balanceOf(client.address);
  const ownerBefore = await token.balanceOf(owner);

  console.log("\nClient balance before:",
    ethers.formatUnits(clientBefore, 18), "AIGN");

  console.log("Owner balance before:",
    ethers.formatUnits(ownerBefore, 18), "AIGN");

  if (clientBefore < amount) {
    throw new Error("Client does not have enough AIGN.");
  }

  console.log("\nSending 0.5 AIGN payment...");

  const tx = await token.payForAITask(amount, taskId);

  console.log("Transaction:", tx.hash);

  const receipt = await tx.wait();

  console.log("Confirmed in block:", receipt.blockNumber);

  const clientAfter = await token.balanceOf(client.address);
  const ownerAfter = await token.balanceOf(owner);

  const taskHash = ethers.keccak256(
    ethers.toUtf8Bytes(taskId)
  );

  const processed = await token.processedTasks(taskHash);

  console.log("\nClient balance after:",
    ethers.formatUnits(clientAfter, 18), "AIGN");

  console.log("Owner balance after:",
    ethers.formatUnits(ownerAfter, 18), "AIGN");

  console.log("Task processed:", processed);

  if (clientBefore - clientAfter !== amount) {
    throw new Error("Client balance did not decrease by 0.5 AIGN.");
  }

  if (ownerAfter - ownerBefore !== amount) {
    throw new Error("Owner balance did not increase by 0.5 AIGN.");
  }

  if (!processed) {
    throw new Error("Task was not marked as processed.");
  }

  console.log("\nSUCCESS!");
  console.log("Client paid 0.5 AIGN to the owner.");
  console.log("The task was successfully recorded on-chain.");
}

main().catch((error) => {
  console.error("\nTEST FAILED");
  console.error(error);
  process.exitCode = 1;
});