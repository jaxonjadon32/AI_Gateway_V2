import hre from "hardhat";

const CONTRACT_ADDRESS = "0xbb534032083787277A0f254D7066Cb3144Cd5980";

async function main() {
  const { ethers } = await hre.network.connect();

  const [owner] = await ethers.getSigners();

  console.log("Testing AIGN V2 on Sepolia...");
  console.log("Owner:", owner.address);
  console.log("Contract:", CONTRACT_ADDRESS);

  const token = await ethers.getContractAt(
    "AIGNV2",
    CONTRACT_ADDRESS
  );

  const name = await token.name();
  const symbol = await token.symbol();
  const decimals = await token.decimals();
  const totalSupply = await token.totalSupply();
  const ownerBalance = await token.balanceOf(owner.address);
  const contractOwner = await token.owner();

  console.log("\n--- Token Info ---");
  console.log("Name:", name);
  console.log("Symbol:", symbol);
  console.log("Decimals:", decimals.toString());
  console.log("Total Supply:", ethers.formatUnits(totalSupply, 18));
  console.log(
    "Owner:",
    contractOwner
  );
  console.log(
    "Owner Balance:",
    ethers.formatUnits(ownerBalance, 18),
    symbol
  );

  if (contractOwner.toLowerCase() !== owner.address.toLowerCase()) {
    throw new Error("Connected wallet is NOT the contract owner.");
  }

  if (symbol !== "AIGN") {
    throw new Error("Unexpected token symbol.");
  }

  if (decimals !== 18n) {
    throw new Error("Unexpected decimals.");
  }

  if (totalSupply !== ethers.parseUnits("100000000", 18)) {
    throw new Error("Unexpected total supply.");
  }

  console.log("\nSUCCESS: Deployed contract passed basic checks.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});