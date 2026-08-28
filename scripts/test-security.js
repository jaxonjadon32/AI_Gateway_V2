import hre from "hardhat";

const CONTRACT_ADDRESS = "0xbb534032083787277A0f254D7066Cb3144Cd5980";

async function main() {
  const connection = await hre.network.getOrCreate();
  const { ethers } = connection;

  const [owner] = await ethers.getSigners();

  const token = await ethers.getContractAt(
    "AIGNV2",
    CONTRACT_ADDRESS,
    owner
  );

  console.log("AIGN V2 LIVE SECURITY TEST");
  console.log("--------------------------------");
  console.log("Owner:", owner.address);
  console.log("Contract:", CONTRACT_ADDRESS);

  // ------------------------------------------------------------
  // 1. Verify minimum payment
  // ------------------------------------------------------------

  const minimum = await token.MINIMUM_TASK_PAYMENT();

  console.log(
    "\nMinimum payment:",
    ethers.formatUnits(minimum, 18),
    "AIGN"
  );

  if (minimum !== ethers.parseUnits("0.5", 18)) {
    throw new Error("Unexpected minimum payment.");
  }

  console.log("PASS: Minimum payment is 0.5 AIGN.");

  // ------------------------------------------------------------
  // 2. Pause contract
  // ------------------------------------------------------------

  console.log("\nPausing contract...");

  const pauseTx = await token.pause();
  await pauseTx.wait();

  console.log("Contract paused:", await token.paused());

  if (!(await token.paused())) {
    throw new Error("Contract did not pause.");
  }

  console.log("PASS: Contract paused.");

  // ------------------------------------------------------------
  // 3. Verify transfer is blocked
  // ------------------------------------------------------------

  console.log("\nTesting transfer while paused...");

  try {
    await token.transfer(
      owner.address,
      ethers.parseUnits("0.001", 18)
    );

    throw new Error("Transfer unexpectedly succeeded while paused.");
  } catch (error) {
    if (
      error.message.includes(
        "Transfer unexpectedly succeeded while paused"
      )
    ) {
      throw error;
    }

    console.log("PASS: Transfer blocked while paused.");
  }

  // ------------------------------------------------------------
  // 4. Verify approve is blocked
  // ------------------------------------------------------------

  console.log("\nTesting approve while paused...");

  try {
    await token.approve(
      owner.address,
      ethers.parseUnits("0.001", 18)
    );

    throw new Error("Approve unexpectedly succeeded while paused.");
  } catch (error) {
    if (
      error.message.includes(
        "Approve unexpectedly succeeded while paused"
      )
    ) {
      throw error;
    }

    console.log("PASS: Approve blocked while paused.");
  }

  // ------------------------------------------------------------
  // 5. Verify AI payment is blocked
  // ------------------------------------------------------------

  console.log("\nTesting AI payment while paused...");

  try {
    await token.payForAITask(
      minimum,
      `paused-test-${Date.now()}`
    );

    throw new Error(
      "AI payment unexpectedly succeeded while paused."
    );
  } catch (error) {
    if (
      error.message.includes(
        "AI payment unexpectedly succeeded while paused"
      )
    ) {
      throw error;
    }

    console.log("PASS: AI payment blocked while paused.");
  }

  // ------------------------------------------------------------
  // 6. Unpause
  // ------------------------------------------------------------

  console.log("\nUnpausing contract...");

  const unpauseTx = await token.unpause();
  await unpauseTx.wait();

  console.log("Contract paused:", await token.paused());

  if (await token.paused()) {
    throw new Error("Contract did not unpause.");
  }

  console.log("PASS: Contract unpaused.");

  // ------------------------------------------------------------
  // Final result
  // ------------------------------------------------------------

  console.log("\n================================");
  console.log("ALL LIVE SECURITY TESTS PASSED");
  console.log("================================");
}

main().catch((error) => {
  console.error("\nSECURITY TEST FAILED");
  console.error(error);
  process.exitCode = 1;
});