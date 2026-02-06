import "dotenv/config";
import { readFileSync } from "node:fs";
import solc from "solc";
import { ethers } from "ethers";

// --------------------------------------------------
// Compilar contrato Solidity (robusto + compatível)
// --------------------------------------------------
function compileContract(solPath, contractName = "MeuToken") {
  const source = readFileSync(solPath, "utf8");

  const input = {
    language: "Solidity",
    sources: {
      "MeuToken.sol": { content: source }, // nome lógico do source
    },
    settings: {
      evmVersion: "berlin", // importante p/ compatibilidade com hardfork antigo
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object"],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  // Mostrar warnings/erros do compilador
  if (output.errors?.length) {
    for (const e of output.errors) {
      console.log(`${e.severity.toUpperCase()}: ${e.formattedMessage}`);
    }
    const hasError = output.errors.some((e) => e.severity === "error");
    if (hasError) throw new Error("Falha na compilação do Solidity (veja erros acima).");
  }

  const fileKey = "MeuToken.sol";
  const contractsInFile = output.contracts?.[fileKey];
  if (!contractsInFile) {
    console.log("Chaves disponíveis em output.contracts:", Object.keys(output.contracts || {}));
    throw new Error(`Nenhum contrato encontrado em output.contracts["${fileKey}"].`);
  }

  console.log("Contratos compilados no arquivo:", Object.keys(contractsInFile));

  // se não achar pelo nome, pega o primeiro contrato do arquivo
  const chosenName = contractsInFile[contractName] ? contractName : Object.keys(contractsInFile)[0];
  console.log("Contrato selecionado:", chosenName);

  const contract = contractsInFile[chosenName];
  const abi = contract.abi;
  const obj = contract.evm?.bytecode?.object;

  if (!obj || obj.length === 0) {
    throw new Error(
      "Bytecode não foi gerado. Verifique: (1) nome do contrato, (2) arquivo correto, (3) versão do solc."
    );
  }

  const bytecode = "0x" + obj;

  console.log("Bytecode length:", bytecode.length);
  console.log("Bytecode prefix:", bytecode.slice(0, 12));

  return { abi, bytecode };
}

// --------------------------------------------------
// Assert simples
// --------------------------------------------------
function assert(condition, msg) {
  if (!condition) throw new Error("ASSERT FAILED: " + msg);
}

// --------------------------------------------------
// Main
// --------------------------------------------------
async function main() {
  const RPC_URL = process.env.RPC_URL || "http://localhost:8545";
  const CHAIN_ID = Number(process.env.CHAIN_ID || 1337);
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  const INITIAL_SUPPLY = BigInt(process.env.INITIAL_SUPPLY || "1000000");

  if (!PRIVATE_KEY) {
    throw new Error("Defina PRIVATE_KEY no .env");
  }

  // Provider + wallet
  const provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  const address = await wallet.getAddress();
  const balanceWei = await provider.getBalance(address);

  console.log("RPC:", RPC_URL);
  console.log("ChainId:", await provider.send("eth_chainId", []));
  console.log("Deployer:", address);
  console.log("Deployer ETH:", ethers.formatEther(balanceWei));

  assert(balanceWei > 0n, "Deployer sem ETH. Coloque saldo no genesis/alloc ou transfira ETH.");

  // Compilar contrato
  const { abi, bytecode } = compileContract("./MeuToken.sol", "MeuToken");

  // FeeData (debug)
  const feeData = await provider.getFeeData();
  console.log("FeeData:", {
    gasPrice: feeData.gasPrice?.toString(),
    maxFeePerGas: feeData.maxFeePerGas?.toString(),
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString(),
  });

  // Factory
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);

  console.log("\nDeploying MeuToken... initialSupply =", INITIAL_SUPPLY.toString());

  // Deploy (força legacy gasPrice=0 e evita estimateGas)
  const deployed = await factory.deploy(INITIAL_SUPPLY, {
    gasPrice: 0n,
    gasLimit: 8_000_000n,
  });

  console.log("Tx hash:", deployed.deploymentTransaction().hash);

  // Espera deploy
  await deployed.waitForDeployment();
  const contractAddress = await deployed.getAddress();
  console.log("Deployed at:", contractAddress);

  // Instância tipada pelo ABI (já é o deployed)
  const contract = deployed;

  // ===== TESTES BÁSICOS =====
  console.log("\nRunning tests...");

  const name = await contract.name();
  const symbol = await contract.symbol();
  const totalSupply = await contract.totalSupply();
  const deployerTokenBal = await contract.balanceOf(address);

  console.log({
    name,
    symbol,
    totalSupply: totalSupply.toString(),
    deployerTokenBal: deployerTokenBal.toString(),
  });

  assert(name === "MinhaMoeda", "name() inesperado");
  assert(symbol === "MMC", "symbol() inesperado");
  assert(totalSupply === INITIAL_SUPPLY, "totalSupply() != initialSupply");
  assert(deployerTokenBal === INITIAL_SUPPLY, "saldo do deployer != initialSupply");

  // Transferência simples para um endereço aleatório
  const to = ethers.Wallet.createRandom().address;

  console.log("\nTransferindo 123 tokens para:", to);

  const tx = await contract.transfer(to, 123n, {
    gasPrice: 0n,
    gasLimit: 200_000n,
  });
  await tx.wait();

  const toBal = await contract.balanceOf(to);
  const deployerBalAfter = await contract.balanceOf(address);

  console.log("Saldo destino:", toBal.toString());
  console.log("Saldo deployer:", deployerBalAfter.toString());

  assert(toBal === 123n, "saldo do destino deveria ser 123");
  assert(deployerBalAfter === INITIAL_SUPPLY - 123n, "saldo do deployer não bate após transfer");

  console.log("\n✅ Todos os testes passaram!");
}

// Run
main().catch((err) => {
  console.error("\n❌ Erro:", err?.shortMessage || err?.message || err);
  process.exit(1);
});
