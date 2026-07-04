// Cloudflare Worker — API 代理 + 静态资源

interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> }
  OCR_SPACE_KEY?: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const { pathname } = url

    // API 路由
    if (pathname === '/api/translate') {
      return handleTranslate(request)
    }
    if (pathname === '/api/ocr') {
      return handleOcr(request, env)
    }

    // 静态资源 — SPA fallback: 非文件路径返回 index.html
    try {
      const assetResp = await env.ASSETS.fetch(request)
      // 如果 assets 返回 404 且路径不像静态文件 → SPA fallback
      if (assetResp.status === 404 && !/\.[a-z0-9]+$/i.test(pathname)) {
        const index = new URL('/', request.url)
        return env.ASSETS.fetch(new Request(index, request))
      }
      return assetResp
    } catch {
      return new Response('Not Found', { status: 404 })
    }
  },
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

async function handleTranslate(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() })
  }
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    })
  }

  let body: { text?: string }
  try { body = await request.json() as { text?: string } } catch {
    return new Response(JSON.stringify({ error: '请求格式错误' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    })
  }

  const { text } = body
  if (!text || typeof text !== 'string' || text.length > 5000) {
    return new Response(JSON.stringify({ error: 'text 参数无效或过长' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    })
  }

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`
    const resp = await fetch(url)
    if (!resp.ok) throw new Error(`Google error ${resp.status}`)

    const data = await resp.json() as unknown[][]
    const parts: string[] = []
    for (const block of data[0] as [string][]) {
      if (block[0]) parts.push(block[0])
    }
    return new Response(JSON.stringify({ zh: parts.join('') }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    })
  } catch {
    return new Response(JSON.stringify({ error: '翻译失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    })
  }
}

async function handleOcr(request: Request, env: Env): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() })
  }
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    })
  }

  let body: { base64?: string }
  try { body = await request.json() as { base64?: string } } catch {
    return new Response(JSON.stringify({ error: '请求格式错误' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    })
  }

  const { base64 } = body
  if (!base64 || typeof base64 !== 'string') {
    return new Response(JSON.stringify({ error: '缺少 base64 参数' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    })
  }
  if (base64.length > 1_500_000) {
    return new Response(JSON.stringify({ error: '图片太大，请压缩后再试' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    })
  }

  const API_KEY = env.OCR_SPACE_KEY || 'helloworld'

  try {
    const formData = new URLSearchParams()
    formData.append('apikey', API_KEY)
    formData.append('base64Image', `data:image/jpeg;base64,${base64}`)
    formData.append('language', 'eng')
    formData.append('OCREngine', '2')
    formData.append('isOverlayRequired', 'false')
    formData.append('scale', 'true')

    const ocrResp = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    })

    const data = await ocrResp.json() as {
      ParsedResults?: Array<{ ParsedText: string }>
      ErrorMessage?: string
    }
    if (data.ErrorMessage) {
      return new Response(JSON.stringify({ error: data.ErrorMessage }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      })
    }
    const text = data.ParsedResults?.map(r => r.ParsedText).join('\n') || ''
    return new Response(JSON.stringify({ text: text.trim() }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    })
  } catch {
    return new Response(JSON.stringify({ error: 'OCR 服务异常' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    })
  }
}
