import type { VercelRequest, VercelResponse } from '@vercel/node'

// OCR.space 免费 API key（需在 Vercel Dashboard 设置环境变量 OCR_SPACE_KEY）
const API_KEY = process.env.OCR_SPACE_KEY || 'helloworld'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { base64 } = req.body
  if (!base64 || typeof base64 !== 'string') {
    return res.status(400).json({ error: '缺少 base64 参数' })
  }

  // 限制大小（base64 编码后约 1MB = 原始 ~750KB）
  if (base64.length > 1_500_000) {
    return res.status(400).json({ error: '图片太大，请压缩后再试' })
  }

  try {
    const formData = new URLSearchParams()
    formData.append('apikey', API_KEY!)
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
      return res.status(500).json({ error: data.ErrorMessage })
    }

    const text = data.ParsedResults?.map(r => r.ParsedText).join('\n') || ''
    res.json({ text: text.trim() })
  } catch (err) {
    res.status(500).json({ error: 'OCR 服务异常' })
  }
}
