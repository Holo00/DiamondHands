const { ethers, network } = require("hardhat");
const { expect } = require("chai");

const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;

async function latest() {
  const block = await ethers.provider.getBlock('latest');
  return block.timestamp;
}

async function increaseTime(seconds) {
  await network.provider.request({
    method: "evm_increaseTime",
    params: [seconds],
  });
  await network.provider.request({
    method: "evm_mine",
    params: [],
  });
}

describe("Lock", function () {
  let lock;
  let unlockTime;

  beforeEach(async function () {
    unlockTime = (await latest()) + ONE_YEAR_IN_SECS;
    const lockedAmount = ethers.parseEther("1");

    const Lock = await ethers.getContractFactory("Lock");
    lock = await Lock.deploy(unlockTime, { value: lockedAmount });

    await lock.deploymentTransaction().wait();
  });

  // it("Should set the right unlockTime", async function () {
  //   expect(await lock.unlockTime()).to.equal(unlockTime);
  // });

  // it("Should not allow withdrawal before unlock time", async function () {
  //   await expect(lock.withdraw()).to.be.revertedWith("You can't withdraw yet");
  // });

  // it("Should only allow the owner to withdraw", async function () {
  //   await increaseTime(ONE_YEAR_IN_SECS + 1);
  //   const otherAccount = (await ethers.getSigners())[1];
  //   await expect(lock.connect(otherAccount).withdraw()).to.be.revertedWith("You aren't the owner");
  // });

  // it("Should allow withdrawal after unlock time", async function () {
  //   await increaseTime(ONE_YEAR_IN_SECS + 1);

  //   const currentTime = await latest();
  //   const lockAddress = lock.getAddress(); // Directly access the contract address
  //   console.log(`Contract address for balance check: ${lockAddress}`);
  //   expect(lockAddress).to.not.be.null;
  //   const lockBalanceBefore = await ethers.provider.getBalance(lockAddress);

  //   console.log(`Lock address: ${lockAddress}`);
  //   console.log(`Balance before withdrawal: ${lockBalanceBefore.toString()}`);

  //   const tx = await lock.withdraw();
  //   const receipt = await ethers.provider.getTransactionReceipt(tx.hash);

  //   // Decode the event from the transaction receipt
  //   const iface = new ethers.Interface(["event Withdrawal(uint256 amount, uint256 when)"]);
  //   const event = iface.decodeEventLog("Withdrawal", receipt.logs[0].data, receipt.logs[0].topics);

  //   // Ensure the Withdrawal event was captured
  //   expect(event.amount).to.equal(lockBalanceBefore);
  //   expect(event.when).to.be.at.least(currentTime); // Allowing for slight variation in timestamp

  //   const lockBalanceAfter = await ethers.provider.getBalance(lockAddress);
  //   console.log(`Balance after withdrawal: ${lockBalanceAfter.toString()}`);
  //   expect(lockBalanceAfter).to.equal(0);
  // });
});
