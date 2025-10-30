import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

const CONTRACT_NAME = "EncryptedDuelGame";

function resolveDeployment(taskArguments: TaskArguments, deployments: any) {
  if (taskArguments.address) {
    return { address: taskArguments.address };
  }
  return deployments.get(CONTRACT_NAME);
}

task("task:address", "Prints the EncryptedDuelGame address").setAction(async function (_taskArguments, hre) {
  const { deployments } = hre;
  const deployment = await deployments.get(CONTRACT_NAME);
  console.log(`${CONTRACT_NAME} address is ${deployment.address}`);
});

task("task:create-game", "Creates a new duel game")
  .addOptionalParam("address", "Optionally specify the contract address")
  .setAction(async function (taskArguments, hre) {
    const { ethers, deployments } = hre;
    const deployment = await resolveDeployment(taskArguments, deployments);
    const contract = await ethers.getContractAt(CONTRACT_NAME, deployment.address);
    const signer = (await ethers.getSigners())[0];
    const tx = await contract.connect(signer).createGame();
    const receipt = await tx.wait();
    console.log(`Created game with tx: ${receipt?.hash ?? tx.hash}`);
  });

task("task:join-game", "Join an existing duel game")
  .addParam("game", "Game identifier")
  .addOptionalParam("address", "Optionally specify the contract address")
  .setAction(async function (taskArguments, hre) {
    const { ethers, deployments } = hre;
    const deployment = await resolveDeployment(taskArguments, deployments);
    const contract = await ethers.getContractAt(CONTRACT_NAME, deployment.address);
    const signer = (await ethers.getSigners())[1];
    const tx = await contract.connect(signer).joinGame(Number(taskArguments.game));
    const receipt = await tx.wait();
    console.log(`Joined game ${taskArguments.game} with tx: ${receipt?.hash ?? tx.hash}`);
  });

task("task:start-game", "Start a duel game that has two players")
  .addParam("game", "Game identifier")
  .addOptionalParam("address", "Optionally specify the contract address")
  .setAction(async function (taskArguments, hre) {
    const { ethers, deployments } = hre;
    const deployment = await resolveDeployment(taskArguments, deployments);
    const contract = await ethers.getContractAt(CONTRACT_NAME, deployment.address);
    const signer = (await ethers.getSigners())[0];
    const tx = await contract.connect(signer).startGame(Number(taskArguments.game));
    const receipt = await tx.wait();
    console.log(`Started game ${taskArguments.game} with tx: ${receipt?.hash ?? tx.hash}`);
  });

task("task:submit-stake", "Submit an encrypted stake for the current round")
  .addParam("game", "Game identifier")
  .addParam("value", "Stake value as an integer between 0 and 100")
  .addOptionalParam("player", "Signer index to use (default 0)")
  .addOptionalParam("address", "Optionally specify the contract address")
  .setAction(async function (taskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;
    if (!Number.isInteger(Number(taskArguments.value))) {
      throw new Error("Argument --value must be an integer");
    }

    const deployment = await resolveDeployment(taskArguments, deployments);
    const contract = await ethers.getContractAt(CONTRACT_NAME, deployment.address);
    const signerIndex = taskArguments.player ? Number(taskArguments.player) : 0;
    const signer = (await ethers.getSigners())[signerIndex];

    await fhevm.initializeCLIApi();

    const encryptedStake = await fhevm
      .createEncryptedInput(deployment.address, signer.address)
      .add32(Number(taskArguments.value))
      .encrypt();

    const tx = await contract
      .connect(signer)
      .submitStake(Number(taskArguments.game), encryptedStake.handles[0], encryptedStake.inputProof);

    const receipt = await tx.wait();
    console.log(
      `Submitted stake ${taskArguments.value} for game ${taskArguments.game} with tx: ${receipt?.hash ?? tx.hash}`,
    );
  });

task("task:decrypt-game", "Decrypt balances and scores for a player")
  .addParam("game", "Game identifier")
  .addOptionalParam("player", "Signer index to use (default 0)")
  .addOptionalParam("address", "Optionally specify the contract address")
  .setAction(async function (taskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;
    await fhevm.initializeCLIApi();

    const deployment = await resolveDeployment(taskArguments, deployments);
    const contract = await ethers.getContractAt(CONTRACT_NAME, deployment.address);
    const signerIndex = taskArguments.player ? Number(taskArguments.player) : 0;
    const signer = (await ethers.getSigners())[signerIndex];

    const state = await contract.getGameState(Number(taskArguments.game));

    const creatorBalance = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      state.creatorBalance,
      deployment.address,
      signer,
    );
    const opponentBalance = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      state.opponentBalance,
      deployment.address,
      signer,
    );
    const creatorScore = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      state.creatorScore,
      deployment.address,
      signer,
    );
    const opponentScore = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      state.opponentScore,
      deployment.address,
      signer,
    );

    console.log(`Round: ${state.round}`);
    console.log(`Creator: ${state.creator}`);
    console.log(`Opponent: ${state.opponent}`);
    console.log(`Encrypted balances -> creator: ${creatorBalance}, opponent: ${opponentBalance}`);
    console.log(`Encrypted scores   -> creator: ${creatorScore}, opponent: ${opponentScore}`);
  });
