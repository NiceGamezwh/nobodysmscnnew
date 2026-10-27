#!/usr/bin/env node
/**
 * Admin: set Veeto Bearer on Sepolia registry.
 *
 * Usage:
 *   node scripts/set-veeto-bearer-onchain.mjs <账号> <Bearer>
 *   node scripts/set-veeto-bearer-onchain.mjs <账号>---<Bearer>
 *
 * Reads scripts/.env.deploy (DEPLOYER_PRIVATE_KEY, SEPOLIA_RPC_URL, VEETO_BEARER_CONTRACT).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createPublicClient, createWalletClient, http, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv(file) {
  const text = fs.readFileSync(file, "utf8");
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i), l.slice(i + 1)];
      }),
  );
}

const env = loadEnv(path.join(__dirname, ".env.deploy"));
const pk = env.DEPLOYER_PRIVATE_KEY;
const rpc = env.SEPOLIA_RPC_URL;
const contract = env.VEETO_BEARER_CONTRACT;
if (!pk || !rpc || !contract) {
  console.error("Missing DEPLOYER_PRIVATE_KEY / SEPOLIA_RPC_URL / VEETO_BEARER_CONTRACT in scripts/.env.deploy");
  process.exit(1);
}

const arg = process.argv.slice(2).join(" ").trim();
let account = "";
let bearer = "";
if (arg.includes("---")) {
  const parts = arg.split("---");
  account = (parts[0] || "").trim();
  bearer = parts.slice(1).join("---").trim();
} else {
  account = (process.argv[2] || "").trim();
  bearer = (process.argv[3] || "").trim();
}
if (!account || !bearer) {
  console.error("Usage: node scripts/set-veeto-bearer-onchain.mjs <账号> <Bearer>");
  console.error("   or: node scripts/set-veeto-bearer-onchain.mjs <账号>---<Bearer>");
  process.exit(1);
}

const abi = [
  {
    type: "function",
    name: "setBearer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "account", type: "string" },
      { name: "bearer", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getBearer",
    stateMutability: "view",
    inputs: [{ name: "account", type: "string" }],
    outputs: [{ name: "", type: "string" }],
  },
];

const sepolia = defineChain({
  id: 11155111,
  name: "Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [rpc] } },
});

const walletAccount = privateKeyToAccount(pk);
const publicClient = createPublicClient({ chain: sepolia, transport: http(rpc) });
const walletClient = createWalletClient({
  account: walletAccount,
  chain: sepolia,
  transport: http(rpc),
});

console.log("owner", walletAccount.address);
console.log("contract", contract);
console.log("account", account);
console.log("bearer length", bearer.length);

const hash = await walletClient.writeContract({
  address: contract,
  abi,
  functionName: "setBearer",
  args: [account, bearer],
  account: walletAccount,
});
console.log("tx", hash);
const receipt = await publicClient.waitForTransactionReceipt({ hash });
console.log("status", receipt.status);
const got = await publicClient.readContract({
  address: contract,
  abi,
  functionName: "getBearer",
  args: [account],
});
console.log("verify", got === bearer ? "OK" : "FAIL");
console.log("explorer", `https://sepolia.etherscan.io/tx/${hash}`);
