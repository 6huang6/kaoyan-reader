import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { image, mime, width, height } = req.body
  if (!image || !width || !height) {
    return res.status(400).json({ error: '缺少 image/mime/width/height 参数' })
  }

  // 限制图片大小（base64 编码后约 4MB = 原始 3MB）
  if (image.length > 4_000_000) {
    return res.status(400).json({ error: '图片太大，请压缩后再试' })
  }

  const mimeType = (['image/jpeg', 'image/png', 'image/webp', 'image/bmp'].includes(mime)
    ? mime : 'image/jpeg') as string

  try {
    // 调用 Google Lens API
    const formData = new FormData()

    // 解码 base64 → Blob
    const binaryStr = atob(image)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)
    const blob = new Blob([bytes], { type: mimeType })

    formData.append('image', blob, 'image.' + mimeType.split('/')[1])

    const lensResp = await fetch('https://lensfrontend-pa.googleapis.com/v1/crupload', {
      method: 'POST',
      headers: {
        'x-goog-api-key': 'AIzaSyDr2UxVnv_U85AbhhY8XSHSIavUW0DC-sY',
      },
      body: formData,
    })

    if (!lensResp.ok) {
      throw new Error(`Lens API error: ${lensResp.status}`)
    }

    const result = await lensResp.json() as { segments?: Array<{ text: string }> }
    const text = (result.segments || []).map((s: { text: string }) => s.text).join('\n')

    res.json({ text })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'OCR failed'
    res.status(500).json({ error: msg })
  }
}
