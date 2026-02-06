import { ethers } from "ethers";

// =========================
// CONFIGURAÇÕES
// =========================
const RPC_URL = "http://localhost:8545";

// ⚠️ USE A CHAVE PRIVADA DO DEPLOYER
const PRIVATE_KEY = "0x61b1961069787f4b230dc195d7d0536dfae89c1260831744d233d90a6678fa2e";

// Conta destino (pode ser qualquer uma do genesis)
const TO_ADDRESS = "0xea069ebd1d399f01204fa9fd5b29b510887908cd";

// Valor a enviar (em ETH)
const AMOUNT_ETH = "10";

// =========================
// SCRIPT
// =========================
async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log("🔗 RPC:", RPC_URL);
  console.log("🔑 From:", wallet.address);
  console.log("🎯 To:", TO_ADDRESS);

  // ChainId
  const network = await provider.getNetwork();
  console.log("🌐 ChainId:", network.chainId.toString());

  // Saldos antes
  const balanceFromBefore = await provider.getBalance(wallet.address);
  const balanceToBefore = await provider.getBalance(TO_ADDRESS);

  console.log("\n💰 Saldo ANTES:");
  console.log("From:", ethers.formatEther(balanceFromBefore), "ETH");
  console.log("To  :", ethers.formatEther(balanceToBefore), "ETH");

  // Criar transação
  const tx = {
    to: TO_ADDRESS,
    value: ethers.parseEther(AMOUNT_ETH),
    gasPrice: 0n,          // Besu com zeroBaseFee
    gasLimit: 21000n,      // transferência simples
  };

  console.log("\n🚀 Enviando transação...");
  const sentTx = await wallet.sendTransaction(tx);
  console.log("📨 Tx hash:", sentTx.hash);

  // Aguardar confirmação
  const receipt = await sentTx.wait();
  console.log("⛏️ Minerada no bloco:", receipt.blockNumber);
  console.log("✅ Status:", receipt.status === 1 ? "SUCESSO" : "FALHA");

  // Saldos depois
  const balanceFromAfter = await provider.getBalance(wallet.address);
  const balanceToAfter = await provider.getBalance(TO_ADDRESS);

  console.log("\n💰 Saldo DEPOIS:");
  console.log("From:", ethers.formatEther(balanceFromAfter), "ETH");
  console.log("To  :", ethers.formatEther(balanceToAfter), "ETH");
}

main().catch((err) => {
  console.error("❌ Erro:", err);
  process.exit(1);
});
