import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { EncryptedDuelGame, EncryptedDuelGame__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("EncryptedDuelGame")) as EncryptedDuelGame__factory;
  const duelContract = (await factory.deploy()) as EncryptedDuelGame;
  const duelContractAddress = await duelContract.getAddress();

  return { duelContract, duelContractAddress };
}

describe("EncryptedDuelGame", function () {
  let signers: Signers;
  let duelContract: EncryptedDuelGame;
  let duelContractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ duelContract, duelContractAddress } = await deployFixture());
  });

  it("runs a full duel round and updates encrypted state", async function () {
    const creator = signers.alice;
    const opponent = signers.bob;

    const createTx = await duelContract.connect(creator).createGame();
    await createTx.wait();

    await duelContract.connect(opponent).joinGame(0);
    await duelContract.connect(creator).startGame(0);

    const initialState = await duelContract.getGameState(0);

    const initialCreatorBalance = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      initialState.creatorBalance,
      duelContractAddress,
      creator,
    );
    const initialOpponentBalance = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      initialState.opponentBalance,
      duelContractAddress,
      opponent,
    );

    expect(initialCreatorBalance).to.eq(100);
    expect(initialOpponentBalance).to.eq(100);

    const creatorStake = await fhevm
      .createEncryptedInput(duelContractAddress, creator.address)
      .add32(25)
      .encrypt();
    const opponentStake = await fhevm
      .createEncryptedInput(duelContractAddress, opponent.address)
      .add32(10)
      .encrypt();

    await duelContract
      .connect(creator)
      .submitStake(0, creatorStake.handles[0], creatorStake.inputProof);
    await duelContract
      .connect(opponent)
      .submitStake(0, opponentStake.handles[0], opponentStake.inputProof);

    const updatedState = await duelContract.getGameState(0);

    const creatorBalance = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      updatedState.creatorBalance,
      duelContractAddress,
      creator,
    );
    const opponentBalance = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      updatedState.opponentBalance,
      duelContractAddress,
      opponent,
    );

    const creatorScore = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      updatedState.creatorScore,
      duelContractAddress,
      creator,
    );
    const opponentScore = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      updatedState.opponentScore,
      duelContractAddress,
      opponent,
    );

    expect(creatorBalance).to.eq(110);
    expect(opponentBalance).to.eq(90);
    expect(creatorScore).to.eq(1);
    expect(opponentScore).to.eq(0);
    expect(updatedState.round).to.eq(2);
  });
});
