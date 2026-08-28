import { network } from "hardhat";
import assert from "node:assert/strict";

describe("AIGNV2 integration", function () {
  let ethers;
  let owner;
  let user;
  let recipient;
  let spender;
  let token;

  const ONE = 10n ** 18n;
  const HALF = 5n * 10n ** 17n;
  const TOTAL_SUPPLY = 100_000_000n * ONE;

  beforeEach(async function () {
    ({ ethers } = await network.create());

    [owner, user, recipient, spender] = await ethers.getSigners();

    token = await ethers.deployContract("AIGNV2", [
      owner.address,
    ]);

    await token.waitForDeployment();
  });

  it("has the correct fixed supply and owner", async function () {
    assert.equal(await token.totalSupply(), TOTAL_SUPPLY);
    assert.equal(await token.balanceOf(owner.address), TOTAL_SUPPLY);
    assert.equal(await token.owner(), owner.address);
  });

  it("supports normal ERC-20 transfers", async function () {
    await token.transfer(user.address, ONE);

    assert.equal(await token.balanceOf(user.address), ONE);
    assert.equal(
      await token.balanceOf(owner.address),
      TOTAL_SUPPLY - ONE
    );
  });

  it("supports approve and transferFrom", async function () {
    await token.transfer(user.address, ONE);

    const userToken = token.connect(user);

    await userToken.approve(spender.address, ONE);

    assert.equal(
      await token.allowance(user.address, spender.address),
      ONE
    );

    const spenderToken = token.connect(spender);

    await spenderToken.transferFrom(
      user.address,
      recipient.address,
      ONE
    );

    assert.equal(
      await token.balanceOf(recipient.address),
      ONE
    );

    assert.equal(
      await token.balanceOf(user.address),
      0n
    );
  });

  it("processes a valid AI task payment", async function () {
    const payment = HALF;
    const taskId = "TASK-001";

    await token.transfer(user.address, payment);

    const ownerBefore = await token.balanceOf(owner.address);

    const userToken = token.connect(user);

    await userToken.payForAITask(payment, taskId);

    assert.equal(
      await token.balanceOf(user.address),
      0n
    );

    assert.equal(
      await token.balanceOf(owner.address),
      ownerBefore + payment
    );

    const taskHash = ethers.keccak256(
      ethers.toUtf8Bytes(taskId)
    );

    assert.equal(
      await token.processedTasks(taskHash),
      true
    );
  });

  it("rejects duplicate task IDs", async function () {
    const payment = HALF;
    const taskId = "DUPLICATE-001";

    await token.transfer(
      user.address,
      payment * 2n
    );

    const userToken = token.connect(user);

    await userToken.payForAITask(
      payment,
      taskId
    );

    await assert.rejects(
      userToken.payForAITask(
        payment,
        taskId
      )
    );
  });

  it("rejects payments below 0.5 AIGN", async function () {
    await token.transfer(user.address, HALF);

    const userToken = token.connect(user);

    await assert.rejects(
      userToken.payForAITask(
        HALF - 1n,
        "TOO-SMALL"
      )
    );
  });

  it("rejects an empty task ID", async function () {
    await token.transfer(user.address, HALF);

    const userToken = token.connect(user);

    await assert.rejects(
      userToken.payForAITask(
        HALF,
        ""
      )
    );
  });

  it("rejects task IDs longer than 100 bytes", async function () {
    await token.transfer(user.address, HALF);

    const longTaskId = "A".repeat(101);

    const userToken = token.connect(user);

    await assert.rejects(
      userToken.payForAITask(
        HALF,
        longTaskId
      )
    );
  });

  it("prevents a non-owner from pausing", async function () {
    const userToken = token.connect(user);

    await assert.rejects(
      userToken.pause()
    );

    assert.equal(await token.paused(), false);
  });

  it("prevents a non-owner from unpausing", async function () {
    await token.pause();

    const userToken = token.connect(user);

    await assert.rejects(
      userToken.unpause()
    );

    assert.equal(await token.paused(), true);
  });

  it("blocks transfers while paused", async function () {
    await token.pause();

    await assert.rejects(
      token.transfer(user.address, ONE)
    );
  });

  it("blocks approvals while paused", async function () {
    await token.pause();

    await assert.rejects(
      token.approve(spender.address, ONE)
    );
  });

  it("blocks AI payments while paused", async function () {
    await token.transfer(user.address, HALF);

    await token.pause();

    const userToken = token.connect(user);

    await assert.rejects(
      userToken.payForAITask(
        HALF,
        "PAUSED-TASK"
      )
    );
  });

  it("restores functionality after unpause", async function () {
    await token.pause();
    await token.unpause();

    await token.transfer(user.address, ONE);

    assert.equal(
      await token.balanceOf(user.address),
      ONE
    );
  });

  it("cannot mint additional tokens", async function () {
    assert.equal(
      await token.totalSupply(),
      TOTAL_SUPPLY
    );

    assert.equal(
      await token.balanceOf(owner.address),
      TOTAL_SUPPLY
    );
  });
});

