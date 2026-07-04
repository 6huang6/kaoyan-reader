import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { text } = req.body
  if (!text || typeof text !== 'string' || text.length > 5000) {
    return res.status(400).json({ error: 'text 参数无效或过长' })
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
    res.json({ zh: parts.join('') })
  } catch (err) {
    res.status(500).json({ error: '翻译失败' })
  }
}
