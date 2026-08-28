import { network } from "hardhat";

async function main() {
  const { ethers } = await network.create();

  console.log("Deploying AIGNV2...");

  const token = await ethers.deployContract("AIGNV2", [
    (await ethers.getSigners())[0].address,
  ]);

  await token.waitForDeployment();

  const deployer = (await ethers.getSigners())[0];
  const address = await token.getAddress();

  console.log("");
  console.log("AIGNV2 deployed successfully");
  console.log("Deployer:", deployer.address);
  console.log("Contract:", address);
  console.log("Owner:", await token.owner());
  console.log(
    "Deployer balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address))
  );
  console.log(
    "Total supply:",
    ethers.formatEther(await token.totalSupply())
  );
  console.log("Symbol:", await token.symbol());
  console.log("Decimals:", await token.decimals());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

