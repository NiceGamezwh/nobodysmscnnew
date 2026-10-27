import { type NextRequest, NextResponse } from "next/server"
import { resolveVeetoBearer, veetoFetch } from "@/lib/veeto"

/**
 * 卡密充值（Veeto cardKey redeem）
 * POST { cardKey, token|bearer|cookie?, account? }
 * 也可 header x-sms-user / x-veeto-token
 *
 * 上游: POST https://api.veeto.cn/v1/cardkeys/redeem
 * Body: { cardKey }
 */
export async function POST(request: NextRequest) {
  let body: {
    cardKey?: string
    cookie?: string
    token?: string
    bearer?: string
    account?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, msg: "请求格式错误" }, { status: 400 })
  }

  const cardKey = (body.cardKey || "").trim()
  if (!cardKey) {
    return NextResponse.json({ success: false, msg: "请输入兑换码/卡密" }, { status: 400 })
  }

  const account = body.account || request.headers.get("x-sms-user")
  const bearer = await resolveVeetoBearer({
    fromRequest: body.token || body.bearer || body.cookie || request.headers.get("x-veeto-token"),
    account,
  })
  if (!bearer) {
    return NextResponse.json(
      {
        success: false,
        msg: "缺少 Veeto Bearer：请登录后由链上映射提供，或粘贴 Bearer / 配置 VEETO_BEARER",
      },
      { status: 400 },
    )
  }

  try {
    const { ok, json } = await veetoFetch("/cardkeys/redeem", bearer, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardKey }),
    })

    // 透传上游 JSON，便于展示 message；并附带 success 便于前端判断
    return NextResponse.json({
      success: ok,
      code: json.code,
      msg: json.message || json.msg || (ok ? "兑换成功" : "兑换失败"),
      message: json.message || json.msg,
      data: json.data ?? {},
      // 完整上游响应当需要时可供调试
      upstream: json,
    })
  } catch (e) {
    return NextResponse.json(
      { success: false, msg: e instanceof Error ? e.message : "网络错误" },
      { status: 500 },
    )
  }
}
