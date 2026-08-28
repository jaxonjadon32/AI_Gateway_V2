import { network } from "hardhat";

const AIGN = "0xbb534032083787277A0f254D7066Cb3144Cd5980";

async function main() {
  const { ethers } = await network.create();

  const [wallet] = await ethers.getSigners();
  const ethBalance = await ethers.provider.getBalance(wallet.address);

  const token = await ethers.getContractAt("AIGNV2", AIGN);

  const aignBalance = await token.balanceOf(wallet.address);

  console.log("Connected successfully");
  console.log("Network: Ethereum Mainnet");
  console.log("Chain ID: 1");
  console.log("Wallet:", wallet.address);
  console.log("ETH balance:", ethers.formatEther(ethBalance));
  console.log("AIGN balance:", ethers.formatUnits(aignBalance, 18));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
