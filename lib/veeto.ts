/**
 * Veeto (h5.haozhuma.com 新后台) 公共辅助。
 * 官方 ShowDoc 只管 api.haozhuma.com 取号；对接相关走 https://api.veeto.cn/v1
 */
import { getBearerFromChain } from "./veeto-bearer-chain"

export const VEETO_BASE = "https://api.veeto.cn/v1"

/** 用户对接链路统一失败文案（无链上 Bearer / Bearer 无效过期） */
export const DOCK_BEARER_FAIL_MSG = "对接失败，请联系客服"

export type ResolveVeetoBearerOptions = {
  /** Optional request override (query/body/header paste). */
  fromRequest?: string | null
  /** SMS api账号 (sessionStorage sms_user) for on-chain lookup. */
  account?: string | null
  /**
   * When false, never fall back to process.env.VEETO_BEARER.
   * User-facing 对接 / 对接管理 must pass false so missing per-account
   * Bearer cannot silently use the shared config token.
   * Default true (e.g. admin/system helpers that still allow env).
   */
  allowEnvFallback?: boolean
}

/**
 * Resolve Veeto Bearer:
 * 1) request token override (if present)
 * 2) chain lookup by account (if account present)
 * 3) env VEETO_BEARER fallback (only when allowEnvFallback !== false)
 */
export async function resolveVeetoBearer(
  fromRequestOrOpts?: string | null | ResolveVeetoBearerOptions,
  accountMaybe?: string | null,
): Promise<string | null> {
  let fromRequest: string | null | undefined
  let account: string | null | undefined
  let allowEnvFallback = true

  if (fromRequestOrOpts && typeof fromRequestOrOpts === "object") {
    fromRequest = fromRequestOrOpts.fromRequest
    account = fromRequestOrOpts.account
    if (fromRequestOrOpts.allowEnvFallback === false) allowEnvFallback = false
  } else {
    fromRequest = fromRequestOrOpts as string | null | undefined
    account = accountMaybe
  }

  const fromReq = (fromRequest || "").trim()
  if (fromReq) return fromReq

  const acct = (account || "").trim()
  if (acct) {
    const fromChain = await getBearerFromChain(acct)
    if (fromChain) return fromChain
  }

  if (!allowEnvFallback) return null

  const fromEnv = (process.env.VEETO_BEARER || "").trim()
  return fromEnv || null
}

export function isVeetoAuthFailure(json: VeetoJson, status?: number): boolean {
  if (status === 401) return true
  if (json.code === 401) return true
  const msg = `${json.message || ""} ${json.msg || ""}`.toLowerCase()
  return msg.includes("unauthorized") || msg.includes("invalid token") || msg.includes("token expired")
}

export function veetoHeaders(bearer: string): HeadersInit {
  return {
    Authorization: `Bearer ${bearer}`,
    Accept: "application/json",
    Origin: "https://h5.haozhuma.com",
    Referer: "https://h5.haozhuma.com/",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36",
  }
}

export function triplePrice(raw: string): string {
  const text = (raw || "").trim()
  if (!text) return ""
  const num = Number.parseFloat(text)
  if (Number.isNaN(num)) return text
  return String(Number.parseFloat((num * 3).toFixed(2)))
}

export type VeetoJson = {
  code?: number
  message?: string
  msg?: string
  data?: unknown
}

export async function veetoFetch(
  path: string,
  bearer: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; json: VeetoJson }> {
  const res = await fetch(`${VEETO_BASE}${path}`, {
    ...init,
    headers: {
      ...veetoHeaders(bearer),
      ...(init?.headers || {}),
    },
    cache: "no-store",
  })
  let json: VeetoJson = {}
  try {
    json = (await res.json()) as VeetoJson
  } catch {
    json = { code: res.status, message: "响应不是 JSON" }
  }
  return { ok: res.ok && json.code === 0, status: res.status, json }
}
