const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  const MilestoneEscrow = await hre.ethers.getContractFactory("MilestoneEscrow");
  const escrow = await MilestoneEscrow.deploy();
  await escrow.waitForDeployment();
  const addr = await escrow.getAddress();
  console.log("MilestoneEscrow deployed to:", addr);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
