import { createPublicClient, http, type PublicClient } from "viem"
import { sepolia } from "viem/chains"
import abiJson from "./veeto-bearer-registry-abi.json"

type CacheEntry = { value: string; expiresAt: number }

const CACHE_TTL_MS = 120_000
const cache = new Map<string, CacheEntry>()

let client: PublicClient | null = null

function getRpcUrl(): string {
  return (process.env.SEPOLIA_RPC_URL || "").trim()
}

function getContractAddress(): `0x${string}` | null {
  const a = (process.env.VEETO_BEARER_CONTRACT || "").trim()
  if (!a || !/^0x[0-9a-fA-F]{40}$/.test(a)) return null
  return a as `0x${string}`
}

function getClient(): PublicClient | null {
  const rpc = getRpcUrl()
  if (!rpc) return null
  if (!client) {
    client = createPublicClient({
      chain: sepolia,
      transport: http(rpc),
    })
  }
  return client
}

/**
 * Read Veeto Bearer for an SMS api账号 from the Sepolia registry.
 * Returns null if unset / missing config / RPC error.
 */
export async function getBearerFromChain(account: string): Promise<string | null> {
  const key = (account || "").trim()
  if (!key) return null

  const hit = cache.get(key)
  if (hit && hit.expiresAt > Date.now()) {
    return hit.value || null
  }

  const address = getContractAddress()
  const pub = getClient()
  if (!address || !pub) return null

  try {
    const bearer = (await pub.readContract({
      address,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      abi: abiJson as any,
      functionName: "getBearer",
      args: [key],
    })) as string
    const value = (bearer || "").trim()
    cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS })
    return value || null
  } catch {
    return null
  }
}

export function clearBearerChainCache(account?: string) {
  if (account) cache.delete(account.trim())
  else cache.clear()
}
