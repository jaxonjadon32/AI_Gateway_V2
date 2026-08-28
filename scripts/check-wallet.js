import { network } from "hardhat";

async function main() {
  const { ethers } = await network.create();

  const [wallet] = await ethers.getSigners();

  const networkInfo = await ethers.provider.getNetwork();
  const balance = await ethers.provider.getBalance(wallet.address);

  console.log("Connected successfully");
  console.log("Chain ID:", networkInfo.chainId.toString());
  console.log("Wallet:", wallet.address);
  console.log("Sepolia ETH:", ethers.formatEther(balance));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});