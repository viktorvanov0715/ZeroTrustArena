import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { EncryptedDuelGame } from "../types";
import { expect } from "chai";

type Signers = {
  alice: HardhatEthersSigner;
};

describe("EncryptedDuelGameSepolia", function () {
  let signers: Signers;
  let duelContract: EncryptedDuelGame;
  let duelContractAddress: string;
  let step: number;
  let steps: number;

  function progress(message: string) {
    console.log(`${++step}/${steps} ${message}`);
  }

  before(async function () {
    if (fhevm.isMock) {
      console.warn(`This hardhat test suite can only run on Sepolia Testnet`);
      this.skip();
    }

    try {
      const duelDeployment = await deployments.get("EncryptedDuelGame");
      duelContractAddress = duelDeployment.address;
      duelContract = await ethers.getContractAt("EncryptedDuelGame", duelDeployment.address);
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia'";
      throw e;
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { alice: ethSigners[0] };
  });

  beforeEach(async () => {
    step = 0;
    steps = 0;
  });

  it("creates and resolves a round on Sepolia", async function () {
    steps = 9;

    this.timeout(4 * 40000);

    progress("Calling getOpenGames()...");
    const openGamesBefore = await duelContract.getOpenGames();
    progress(`Open games count: ${openGamesBefore.length}`);

    progress("Creating a new game from Sepolia deployer...");
    const createTx = await duelContract.connect(signers.alice).createGame();
    await createTx.wait();

    progress("Fetching latest open games...");
    const openGames = await duelContract.getOpenGames();
    expect(openGames.length).to.be.greaterThan(0);

    progress("Encrypting a stake of 5 for preview round...");
    const encryptedStake = await fhevm
      .createEncryptedInput(duelContractAddress, signers.alice.address)
      .add32(5)
      .encrypt();

    progress("Submitting stake (no opponent joined, expect revert)...");
    await expect(
      duelContract
        .connect(signers.alice)
        .submitStake(openGames[0], encryptedStake.handles[0], encryptedStake.inputProof),
    ).to.be.revertedWith("Game not started");
  });
});
