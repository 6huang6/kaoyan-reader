import type { TranslationResult, SentencePair, WordAnnotation } from '../types'
import { extractWords, annotateWords } from './vocab'

/** 按句子分隔符拆分英文文本 */
export function splitSentences(text: string): string[] {
  // 先按换行分段
  const paragraphs = text.split(/\n+/).filter(p => p.trim())

  const sentences: string[] = []
  for (const para of paragraphs) {
    // 按 .!? 结尾拆分句子，保留分隔符
    const parts = para.match(/[^.!?]+[.!?]*/g) || [para]
    for (const part of parts) {
      const trimmed = part.trim()
      if (trimmed) sentences.push(trimmed)
    }
  }

  return sentences
}

/** 调用翻译 API（先尝试 Vercel Function，失败则直连 Google） */
async function translateOne(text: string): Promise<string> {
  // 先尝试 Vercel Function
  try {
    const resp = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (resp.ok) {
      const data = await resp.json() as { zh: string }
      return data.zh
    }
  } catch {
    // Vercel Function 不可用（本地开发），fall through
  }

  // Fallback: 直连 Google Translate
  return translateGoogleDirect(text)
}

/** Google Translate 直连（免费，无需 API key） */
async function translateGoogleDirect(text: string): Promise<string> {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`

  const resp = await fetch(url)
  if (!resp.ok) throw new Error('Google 翻译不可用')

  const data = await resp.json() as unknown[][]
  const parts: string[] = []
  for (const block of data[0] as [string][]) {
    if (block[0]) parts.push(block[0])
  }
  return parts.join('')
}

/** 翻译所有句子并标注词汇，生成完整 TranslationResult */
export async function translateAndAnnotate(
  rawText: string,
  onSentenceProgress?: (done: number, total: number) => void,
): Promise<TranslationResult> {
  const sentences = splitSentences(rawText)

  if (sentences.length === 0) {
    return { sentences: [], paragraphZh: '' }
  }

  // 1. 提取所有单词并标注考研词汇
  const allWords = extractWords(rawText)
  const wordAnnotations = await annotateWords(allWords)

  // 2. 逐句翻译
  const sentencePairs: SentencePair[] = []
  const translations: string[] = []

  for (let i = 0; i < sentences.length; i++) {
    const en = sentences[i]
    let zh = ''

    try {
      zh = await translateOne(en)
    } catch {
      zh = '[翻译失败]'
    }

    translations.push(zh)

    // 逐词标注
    const enWords = en.match(/\b[a-zA-Z]+(?:'[a-zA-Z]+)?\b/g) || []
    const words: WordAnnotation[] = enWords.map((w) => {
      const annotation = wordAnnotations.get(w)
      return annotation || {
        text: w,
        lemma: w.toLowerCase(),
        isVocab: false,
      }
    })

    sentencePairs.push({ index: i, en, zh, words })
    onSentenceProgress?.(i + 1, sentences.length)
  }

  // 3. 整段翻译
  let paragraphZh = ''
  try {
    paragraphZh = await translateOne(rawText)
  } catch {
    // 整段翻译失败时，用逐句译文拼接
    paragraphZh = translations.join('')
  }

  return { sentences: sentencePairs, paragraphZh }
}

/** 单词查词 — 用 Free Dictionary API */
export async function lookupDictionary(word: string): Promise<string | null> {
  try {
    const resp = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`,
    )
    if (!resp.ok) return null

    const data = await resp.json() as Array<{
      meanings: Array<{
        partOfSpeech: string
        definitions: Array<{ definition: string }>
      }>
    }>

    if (!data?.[0]?.meanings) return null

    const parts: string[] = []
    for (const m of data[0].meanings.slice(0, 2)) {
      const pos = m.partOfSpeech || ''
      const def = m.definitions[0]?.definition || ''
      if (def) parts.push(`${pos} ${def}`)
    }

    return parts.join('；') || null
  } catch {
    return null
  }
}
