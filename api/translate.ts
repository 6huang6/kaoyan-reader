import type { VercelRequest, VercelResponse } from '@vercel/node'

const RATE_LIMIT = new Map<string, number[]>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const window = 1000 // 1 second
  const maxRequests = 10

  let timestamps = RATE_LIMIT.get(ip) || []
  timestamps = timestamps.filter(t => now - t < window)

  if (timestamps.length >= maxRequests) return false

  timestamps.push(now)
  RATE_LIMIT.set(ip, timestamps)
  return true
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const ip = (req.headers['x-forwarded-for'] as string) || 'unknown'
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: '请求太频繁，请稍后再试' })
  }

  const { text } = req.body
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: '缺少 text 参数' })
  }

  if (text.length > 5000) {
    return res.status(400).json({ error: '文本过长，单次最多 5000 字符' })
  }

  try {
    // 优先用 MyMemory 免费翻译 API（无需 API key，1000 words/day）
    const zh = await translateWithMyMemory(text)
    return res.json({ zh })
  } catch {
    // fallback: 用 Google Translate 非官方接口
    try {
      const zh = await translateWithGoogle(text)
      return res.json({ zh })
    } catch {
      return res.status(500).json({ error: '翻译服务暂时不可用，请稍后重试' })
    }
  }
}

async function translateWithMyMemory(text: string): Promise<string> {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|zh`

  const response = await fetch(url)
  if (!response.ok) throw new Error(`MyMemory error: ${response.status}`)

  const data = await response.json() as { responseData: { translatedText: string } }
  return data.responseData.translatedText
}

async function translateWithGoogle(text: string): Promise<string> {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`

  const response = await fetch(url)
  if (!response.ok) throw new Error(`Google translate error: ${response.status}`)

  const data = await response.json() as unknown[][]
  const parts: string[] = []
  for (const block of data[0] as [string][]) {
    if (block[0]) parts.push(block[0])
  }
  return parts.join('')
}
