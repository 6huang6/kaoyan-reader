interface Env {
  // 无需环境变量
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function onRequestPost(context: { request: Request }): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  }

  let body: { text?: string }
  try {
    body = await context.request.json() as { text?: string }
  } catch {
    return new Response(JSON.stringify({ error: '请求格式错误' }), { status: 400, headers })
  }

  const { text } = body
  if (!text || typeof text !== 'string' || text.length > 5000) {
    return new Response(JSON.stringify({ error: 'text 参数无效或过长' }), { status: 400, headers })
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
    return new Response(JSON.stringify({ zh: parts.join('') }), { headers })
  } catch {
    return new Response(JSON.stringify({ error: '翻译失败' }), { status: 500, headers })
  }
}
