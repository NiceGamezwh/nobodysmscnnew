# 链上 Veeto Bearer 更新

合约（Sepolia）：`0x668abf17783ADb0F26cdD9049736C6954a6378CF`

Explorer: https://sepolia.etherscan.io/address/0x668abf17783ADb0F26cdD9049736C6954a6378CF

## 前置

1. 在 `scripts/.env.deploy` 配置（已 gitignore）：
   - `DEPLOYER_PRIVATE_KEY`
   - `SEPOLIA_RPC_URL`
   - `VEETO_BEARER_CONTRACT`
2. 项目根目录已安装 `viem`（`pnpm add viem`）。

## 更新某个 api账号 的 Bearer

```bat
cd /d E:\zwhnb\nobodysmscn-main
node scripts\set-veeto-bearer-onchain.mjs <api账号> <新Bearer>
```

或：

```bat
node scripts\set-veeto-bearer-onchain.mjs <api账号>---<新Bearer>
```

约每 7 天更新一次即可。Next 运行时只读链，不需要私钥。
