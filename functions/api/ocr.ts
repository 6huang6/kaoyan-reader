interface Env {
  OCR_SPACE_KEY?: string
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

export async function onRequestPost(
  context: { request: Request; env?: Env },
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  }

  let body: { base64?: string }
  try {
    body = await context.request.json() as { base64?: string }
  } catch {
    return new Response(JSON.stringify({ error: '请求格式错误' }), { status: 400, headers })
  }

  const { base64 } = body
  if (!base64 || typeof base64 !== 'string') {
    return new Response(JSON.stringify({ error: '缺少 base64 参数' }), { status: 400, headers })
  }

  if (base64.length > 1_500_000) {
    return new Response(JSON.stringify({ error: '图片太大，请压缩后再试' }), { status: 400, headers })
  }

  const API_KEY = context.env?.OCR_SPACE_KEY || 'helloworld'

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
      return new Response(JSON.stringify({ error: data.ErrorMessage }), { status: 500, headers })
    }

    const text = data.ParsedResults?.map(r => r.ParsedText).join('\n') || ''
    return new Response(JSON.stringify({ text: text.trim() }), { headers })
  } catch {
    return new Response(JSON.stringify({ error: 'OCR 服务异常' }), { status: 500, headers })
  }
}
