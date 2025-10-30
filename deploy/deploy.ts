import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedDuel = await deploy("EncryptedDuelGame", {
    from: deployer,
    log: true,
  });

  console.log(`EncryptedDuelGame contract deployed at: `, deployedDuel.address);
};
export default func;
func.id = "deploy_encryptedDuelGame"; // id required to prevent reexecution
func.tags = ["EncryptedDuelGame"];
