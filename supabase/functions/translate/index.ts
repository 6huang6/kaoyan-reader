// Supabase Edge Function — 翻译代理
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  let body: { text?: string; context?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: "请求格式错误" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const { text, context } = body
  if (!text || typeof text !== "string" || text.length > 5000) {
    return new Response(JSON.stringify({ error: "text 参数无效或过长" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const fullText = context ? `${context}\n${text}` : text

  const url =
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const formBody = new URLSearchParams({ q: fullText })
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody.toString(),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!resp.ok) {
      return new Response(
        JSON.stringify({ error: `Google 返回 ${resp.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const data = await resp.json() as unknown[][]
    const parts: string[] = []
    for (const block of data[0]) {
      if (block === null || block === undefined) continue
      if (Array.isArray(block) && block[0]) {
        parts.push(block[0] as string)
      }
    }

    let zh = parts.join("")
    // 有上下文时，只取最后一句译文
    if (context) {
      const lines = zh.split(/\n+/)
      zh = lines[lines.length - 1] || zh
    }

    return new Response(JSON.stringify({ zh }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    clearTimeout(timeout)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "翻译失败" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})
