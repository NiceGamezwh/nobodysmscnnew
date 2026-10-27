const API_BASE = "https://api.haozhuma.com"

export interface LoginResponse {
  msg: string
  code: number
  token: string
}

export interface AccountInfo {
  msg: string
  code: number
  money: string
  num: number
}

export interface PhoneResponse {
  code: string
  msg: string
  sid: string
  shop_name?: string
  country_name: string
  country_code: string
  country_qu: string
  uid?: string | null
  phone: string
  sp: string
  phone_gsd: string
}

export interface MessageResponse {
  code: string
  msg: string
  sms?: string
  yzm?: string
}

export interface ReleaseResponse {
  code: string
  data: string
  msg: string
}

const LOGIN_FAIL_MSG = "登录失败，请使用购买的卡密登录"

/** 屏蔽上游官方文案（如请登录 h5.haozhuma.cn 提取 API），统一成卡密提示 */
function sanitizeLoginMsg(msg: unknown): string {
  const s = typeof msg === "string" ? msg : ""
  if (!s || /haozhuma|请登录网页版|提取\s*API/i.test(s)) return LOGIN_FAIL_MSG
  return s
}

export async function login(user: string, pass: string): Promise<LoginResponse> {
  const res = await fetch(
    `${API_BASE}/sms/?api=login&user=${encodeURIComponent(user)}&pass=${encodeURIComponent(pass)}`,
  )
  const data = (await res.json()) as LoginResponse
  if (data.code !== 0) {
    data.msg = sanitizeLoginMsg(data.msg)
  }
  return data
}

export async function getAccountInfo(token: string): Promise<AccountInfo> {
  const res = await fetch(`${API_BASE}/sms/?api=getSummary&token=${encodeURIComponent(token)}`)
  return res.json()
}

export async function getPhone(
  token: string,
  sid: string,
  options?: {
    isp?: string
    province?: string
    ascription?: string
    paragraph?: string
    exclude?: string
  },
): Promise<PhoneResponse> {
  let url = `${API_BASE}/sms/?api=getPhone&token=${encodeURIComponent(token)}&sid=${encodeURIComponent(sid)}`
  if (options?.isp) url += `&isp=${options.isp}`
  if (options?.province) url += `&Province=${options.province}`
  if (options?.ascription) url += `&ascription=${options.ascription}`
  if (options?.paragraph) url += `&paragraph=${options.paragraph}`
  if (options?.exclude) url += `&exclude=${options.exclude}`
  const res = await fetch(url)
  return res.json()
}

export async function specifyPhone(token: string, sid: string, phone: string): Promise<PhoneResponse> {
  const res = await fetch(
    `${API_BASE}/sms/?api=getPhone&token=${encodeURIComponent(token)}&sid=${encodeURIComponent(sid)}&phone=${encodeURIComponent(phone)}`,
  )
  return res.json()
}

export async function getMessage(token: string, sid: string, phone: string): Promise<MessageResponse> {
  const res = await fetch(
    `${API_BASE}/sms/?api=getMessage&token=${encodeURIComponent(token)}&sid=${encodeURIComponent(sid)}&phone=${encodeURIComponent(phone)}`,
  )
  return res.json()
}

export async function releasePhone(token: string, sid: string, phone: string): Promise<ReleaseResponse> {
  const res = await fetch(
    `${API_BASE}/sms/?api=cancelRecv&token=${encodeURIComponent(token)}&sid=${encodeURIComponent(sid)}&phone=${encodeURIComponent(phone)}`,
  )
  return res.json()
}

export async function releaseAllPhones(token: string): Promise<ReleaseResponse> {
  const res = await fetch(`${API_BASE}/sms/?api=cancelAllRecv&token=${encodeURIComponent(token)}`)
  return res.json()
}

export async function blacklistPhone(token: string, sid: string, phone: string): Promise<ReleaseResponse> {
  const res = await fetch(
    `${API_BASE}/sms/?api=addBlacklist&token=${encodeURIComponent(token)}&sid=${encodeURIComponent(sid)}&phone=${encodeURIComponent(phone)}`,
  )
  return res.json()
}

export const addBlack = blacklistPhone

// 项目搜索：按项目名搜索，返回项目ID + 项目名
// 调用本站服务端接口（服务端带 Veeto Bearer 请求 api.veeto.cn）
export interface SearchProject {
  id: string
  name: string
  // 十六进制 sid，用于「搜索对接」功能
  sid: string
}

export interface SearchProjectResponse {
  success: boolean
  msg?: string
  keyword?: string
  projects?: SearchProject[]
}

function getVeetoToken(): string {
  if (typeof window === "undefined") return ""
  try {
    return (sessionStorage.getItem("veeto_bearer") || "").trim()
  } catch {
    return ""
  }
}

/** SMS api账号 from login session (sessionStorage sms_user) */
function getSmsAccount(): string {
  if (typeof window === "undefined") return ""
  try {
    return (sessionStorage.getItem("sms_user") || "").trim()
  } catch {
    return ""
  }
}

function withAccountQs(qs: URLSearchParams) {
  const account = getSmsAccount()
  if (account) qs.set("account", account)
  return qs
}

export async function searchProjects(keyword: string): Promise<SearchProjectResponse> {
  const token = getVeetoToken()
  const qs = withAccountQs(new URLSearchParams({ keyword }))
  if (token) qs.set("token", token)
  const res = await fetch(`/api/search-project?${qs.toString()}`)
  return res.json()
}

// 搜索对接：根据项目 sid 加载对接码列表
export interface DockItem {
  uid: string
  name: string
  price: string
  available: string
  isp: string
  province: string
  segmentType: string
  segments: string
  contact: string
  top: boolean
  time: string
}

export interface DockResponse {
  success: boolean
  msg?: string
  sid?: string
  items?: DockItem[]
}

export async function dockProject(sid: string): Promise<DockResponse> {
  const token = getVeetoToken()
  const qs = withAccountQs(new URLSearchParams({ sid }))
  if (token) qs.set("token", token)
  const res = await fetch(`/api/dock?${qs.toString()}`)
  return res.json()
}

// ============================================================================
// 对接管理：仅用登录 api账号 的链上 Bearer（不回退配置 VEETO_BEARER）；可选粘贴 token 覆盖
// ============================================================================

export interface JoinDockResponse {
  success: boolean
  msg?: string
  djm?: string
}

/** cookie 参数现为可选 Veeto Bearer（兼容旧字段名）；正常流程传空即可，靠 sms_user 链上查找 */
export async function joinDock(cookie: string, djm: string): Promise<JoinDockResponse> {
  const account = getSmsAccount()
  const res = await fetch("/api/join-dock", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(account ? { "x-sms-user": account } : {}),
    },
    body: JSON.stringify({ token: cookie || undefined, djm, account: account || undefined }),
  })
  return res.json()
}

export interface MyDockItem {
  uid: string
  name: string
  price: string
  status: string
  available: string
  isp: string
  province: string
  segmentType: string
  segments: string
  contact: string
  time: string
}

export interface MyDocksResponse {
  success: boolean
  msg?: string
  page?: number
  keyword?: string
  items?: MyDockItem[]
}

/** cookie 参数现为可选 Veeto Bearer（兼容旧字段名） */
export async function getMyDocks(
  cookie: string,
  options?: { page?: number; keyword?: string },
): Promise<MyDocksResponse> {
  const account = getSmsAccount()
  const res = await fetch("/api/my-docks", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(account ? { "x-sms-user": account } : {}),
    },
    body: JSON.stringify({
      token: cookie || undefined,
      account: account || undefined,
      page: options?.page ?? 1,
      keyword: options?.keyword ?? "",
    }),
  })
  return res.json()
}

export interface DeleteDockResponse {
  success: boolean
  msg?: string
  uid?: string
}

/** cookie 参数现为可选 Veeto Bearer（兼容旧字段名） */
export async function deleteDock(cookie: string, uid: string): Promise<DeleteDockResponse> {
  const account = getSmsAccount()
  const res = await fetch("/api/delete-dock", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(account ? { "x-sms-user": account } : {}),
    },
    body: JSON.stringify({ token: cookie || undefined, uid, account: account || undefined }),
  })
  return res.json()
}


// ============================================================================
// 卡密充值：Veeto cardKey redeem（单码 hex，非 api账号----密码---安全密码）
// ============================================================================

export interface RedeemCardKeyData {
  amount?: string
  balance?: string
}

export interface RedeemCardKeyResponse {
  success: boolean
  code?: number
  msg?: string
  message?: string
  data?: RedeemCardKeyData
  upstream?: unknown
}

/** 兑换 Veeto 卡密；Bearer 由服务端按 sms_user 链上查找 / 可选 token 覆盖 */
export async function redeemCardKey(cardKey: string): Promise<RedeemCardKeyResponse> {
  const account = getSmsAccount()
  const token = getVeetoToken()
  const res = await fetch("/api/redeem-cardkey", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(account ? { "x-sms-user": account } : {}),
      ...(token ? { "x-veeto-token": token } : {}),
    },
    body: JSON.stringify({
      cardKey,
      token: token || undefined,
      account: account || undefined,
    }),
  })
  return res.json()
}

export const ISP_OPTIONS = [
  { value: "", label: "不限" },
  { value: "1", label: "中国移动" },
  { value: "5", label: "中国联通" },
  { value: "9", label: "中国电信" },
  { value: "14", label: "中国广电" },
  { value: "16", label: "虚拟运营商" },
]

export const PROVINCE_OPTIONS = [
  { value: "", label: "不限" },
  { value: "11", label: "北京" },
  { value: "12", label: "天津" },
  { value: "13", label: "河北" },
  { value: "14", label: "山西" },
  { value: "15", label: "内蒙古" },
  { value: "21", label: "辽宁" },
  { value: "22", label: "吉林" },
  { value: "23", label: "黑龙江" },
  { value: "31", label: "上海" },
  { value: "32", label: "江苏" },
  { value: "33", label: "浙江" },
  { value: "34", label: "安徽" },
  { value: "35", label: "福建" },
  { value: "36", label: "江西" },
  { value: "37", label: "山东" },
  { value: "41", label: "河南" },
  { value: "42", label: "湖北" },
  { value: "43", label: "湖南" },
  { value: "44", label: "广东" },
  { value: "45", label: "广西" },
  { value: "46", label: "海南" },
  { value: "50", label: "重庆" },
  { value: "51", label: "四川" },
  { value: "52", label: "贵州" },
  { value: "53", label: "云南" },
  { value: "54", label: "西藏" },
  { value: "61", label: "陕西" },
  { value: "62", label: "甘肃" },
  { value: "63", label: "青海" },
  { value: "64", label: "宁夏" },
  { value: "65", label: "新疆" },
]

export const ASCRIPTION_OPTIONS = [
  { value: "", label: "不限" },
  { value: "1", label: "仅虚拟卡" },
  { value: "2", label: "仅实体卡" },
]
