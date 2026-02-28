const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MilestoneEscrow", function () {
  let escrow, client, freelancer, owner;
  const oneEther = ethers.parseEther("1");

  beforeEach(async function () {
    [owner, client, freelancer] = await ethers.getSigners();
    const MilestoneEscrow = await ethers.getContractFactory("MilestoneEscrow");
    escrow = await MilestoneEscrow.deploy();
    await escrow.waitForDeployment();
  });

  it("Should create project and deposit", async function () {
    await escrow.connect(client).createProject(
      freelancer.address,
      "Test Project",
      [oneEther, oneEther],
      ["Milestone 1", "Milestone 2"]
    );
    expect(await escrow.projectCounter()).to.equal(1);
    const p = await escrow.getProject(1);
    expect(p.client).to.equal(client.address);
    expect(p.freelancer).to.equal(freelancer.address);
    expect(p.totalAmount).to.equal(ethers.parseEther("2"));
    expect(p.status).to.equal(0); // Active

    await escrow.connect(client).deposit(1, { value: oneEther });
    const p2 = await escrow.getProject(1);
    expect(p2.depositedAmount).to.equal(oneEther);
  });

  it("Should submit, approve milestone and release payment", async function () {
    await escrow.connect(client).createProject(
      freelancer.address,
      "Pay project",
      [oneEther],
      ["Only milestone"]
    );
    await escrow.connect(client).deposit(1, { value: oneEther });
    const before = await ethers.provider.getBalance(freelancer.address);
    await escrow.connect(freelancer).submitMilestone(1, 0, "ipfs://proof");
    await escrow.connect(client).approveMilestone(1, 0);
    const after = await ethers.provider.getBalance(freelancer.address);
    // Freelancer receives full milestone amount (balance increase may be less due to their submitMilestone gas)
    expect(after > before).to.be.true;
    const p = await escrow.getProject(1);
    expect(p.status).to.equal(1); // Completed
    const [completed, earnings] = await escrow.getReputation(freelancer.address);
    expect(earnings).to.equal(oneEther);
    expect(completed).to.equal(1);
  });

  it("Should allow client to reject submitted milestone", async function () {
    await escrow.connect(client).createProject(
      freelancer.address,
      "Reject test",
      [oneEther],
      ["M1"]
    );
    await escrow.connect(client).deposit(1, { value: oneEther });
    await escrow.connect(freelancer).submitMilestone(1, 0, "proof");
    await escrow.connect(client).rejectMilestone(1, 0);
    const m = await escrow.getMilestone(1, 0);
    expect(m.status).to.equal(4); // Rejected
  });

  it("Should allow raising dispute", async function () {
    await escrow.connect(client).createProject(
      freelancer.address,
      "Dispute test",
      [oneEther],
      ["M1"]
    );
    await escrow.connect(client).deposit(1, { value: oneEther });
    await escrow.connect(freelancer).submitMilestone(1, 0, "proof");
    await escrow.connect(client).raiseDispute(1, 0, "Quality issue");
    expect(await escrow.disputeCounter()).to.equal(1);
    const p = await escrow.getProject(1);
    expect(p.status).to.equal(3); // Disputed
  });
});
