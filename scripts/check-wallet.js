import { network } from "hardhat";

async function main() {
  const { ethers } = await network.create();

  const [wallet] = await ethers.getSigners();

  const networkInfo = await ethers.provider.getNetwork();
  const balance = await ethers.provider.getBalance(wallet.address);

  let networkName = "Unknown";

  if (networkInfo.chainId === 1n) {
    networkName = "Ethereum Mainnet";
  } else if (networkInfo.chainId === 11155111n) {
    networkName = "Ethereum Sepolia";
  }

  console.log("Connected successfully");
  console.log("Network:", networkName);
  console.log("Chain ID:", networkInfo.chainId.toString());
  console.log("Wallet:", wallet.address);
  console.log("ETH balance:", ethers.formatEther(balance));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

