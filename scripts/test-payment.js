import hre from "hardhat";

const CONTRACT_ADDRESS = "0xbb534032083787277A0f254D7066Cb3144Cd5980";

async function main() {
  const connection = await hre.network.getOrCreate();
  const { ethers } = connection;

  const [owner] = await ethers.getSigners();

  const token = await ethers.getContractAt(
    "AIGNV2",
    CONTRACT_ADDRESS
  );

  const amount = ethers.parseUnits("0.5", 18);
  const taskId = `sepolia-test-${Date.now()}`;

  console.log("AIGN V2 live payment test");
  console.log("Wallet:", owner.address);
  console.log("Contract:", CONTRACT_ADDRESS);
  console.log("Payment:", ethers.formatUnits(amount, 18), "AIGN");
  console.log("Task ID:", taskId);

  const before = await token.balanceOf(owner.address);

  console.log("\nOwner balance before:", ethers.formatUnits(before, 18), "AIGN");

  console.log("\nSending payment...");

  const tx = await token.payForAITask(amount, taskId);

  console.log("Transaction:", tx.hash);

  const receipt = await tx.wait();

  console.log("Confirmed in block:", receipt.blockNumber);

  const after = await token.balanceOf(owner.address);

  console.log("\nOwner balance after:", ethers.formatUnits(after, 18), "AIGN");

  const processed = await token.processedTasks(
    ethers.keccak256(ethers.toUtf8Bytes(taskId))
  );

  console.log("Task processed:", processed);

  if (!processed) {
    throw new Error("Task was not marked as processed.");
  }

  if (before - after !== amount) {
    throw new Error("Unexpected token balance change.");
  }

  console.log("\nSUCCESS: Live Sepolia AI task payment worked.");
}

main().catch((error) => {
  console.error("\nTEST FAILED");
  console.error(error);
  process.exitCode = 1;
});