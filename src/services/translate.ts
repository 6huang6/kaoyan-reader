import type { TranslationResult, SentencePair, WordAnnotation, ParagraphPair } from '../types'
import { extractWords, annotateWords } from './vocab'

/** 不以句号结尾的常见缩写 */
const ABBREVIATIONS = /\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|Co|Inc|Ltd|St|Ave|vs|etc|e\.g|i\.e)\.$/i

/** 按句子拆分英文文本 */
export function splitSentences(text: string): string[] {
  // 1. 合并被 OCR 断开的行：行末无句号则与下一行合并
  const lines = text.split(/\n+/)
  const blocks: string[] = []
  let buf = ''

  for (const line of lines) {
    const t = line.trim()
    if (!t) continue
    if (/^Passage\s+\d+/i.test(t)) continue

    buf = buf ? buf + ' ' + t : t

    // 以 .!? 结尾且不是缩写 → 当前句组完整
    if (/[.!?]["”]?\s*$/.test(buf) && !ABBREVIATIONS.test(buf)) {
      blocks.push(buf)
      buf = ''
    }
  }
  if (buf) blocks.push(buf)

  // 2. 每个 block 可能含多句，按 .!? 二次拆分（避开缩写）
  const sentences: string[] = []
  for (const block of blocks) {
    const parts = block.match(/[^.!?]+[.!?]+["”]?\s*/g)
    if (!parts) {
      sentences.push(block.trim())
      continue
    }
    let fragment = ''
    for (const p of parts) {
      const t = p.trim()
      if (!t) continue
      fragment = fragment ? fragment + t : t
      if (!ABBREVIATIONS.test(fragment.trimEnd())) {
        sentences.push(fragment.trim())
        fragment = ''
      }
    }
    if (fragment) sentences.push(fragment.trim())
  }

  // 3. 合并过短的片段
  const result: string[] = []
  for (const s of sentences) {
    const words = s.split(/\s+/).length
    if (words <= 2 && result.length > 0) {
      result[result.length - 1] += ' ' + s
    } else {
      result.push(s)
    }
  }

  return result
}

/** 翻译一句话：MyMemory（国内可用）→ Google Translate（VPN）→ 失败提示 */
async function translateOne(text: string): Promise<string> {
  // 方式 1：MyMemory（免费，国内直连）
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|zh`
    const resp = await fetch(url)
    if (resp.ok) {
      const data = await resp.json() as { responseData: { translatedText: string; match: number } }
      if (data.responseData?.translatedText) {
        return data.responseData.translatedText
      }
    }
  } catch { /* fall through */ }

  // 方式 2：Google Translate（仅 VPN 用户可用）
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`
    const resp = await fetch(url)
    if (resp.ok) {
      const data = await resp.json() as unknown[][]
      const parts: string[] = []
      for (const block of data[0] as [string][]) {
        if (block[0]) parts.push(block[0])
      }
      const result = parts.join('')
      if (result) return result
    }
  } catch { /* fall through */ }

  return '[翻译失败]'
}

/** 判断是否为噪声行（页眉页脚/引用标记/OCR 乱码） */
function isNoiseLine(raw: string): boolean {
  const t = raw.trim()
  if (!t) return false // 空行不是噪声，用于段落分隔
  if (/[一-鿿]/.test(t)) return true
  if (/^(Passage|Section|Text|Part)\s+\d+/i.test(t)) return true
  if (/^\d+$/.test(t)) return true
  if (/^\[\d+[A-Z]?\]/.test(t) && t.length < 12) return true
  if (/\(\s*#\s*\d+/.test(t) && t.length < 50) return true
  if (/^\d{4}\s+[A-Z0-9]{3,}/.test(t) && t.length < 40) return true
  if (/[，。；：、》《【】]/.test(t)) return true
  const letters = (t.match(/[a-zA-Z]/g) || []).length
  return letters === 0
}

/** 按段首缩进拆分段落：行首有空格 → 新段开始 */
function splitParagraphs(lines: string[]): string[] {
  const paragraphs: string[] = []
  let current: string[] = []

  for (const raw of lines) {
    const t = raw.trim()
    if (!t) {
      // 空行：结束当前段落
      if (current.length > 0) {
        paragraphs.push(current.join(' '))
        current = []
      }
      continue
    }

    // 行首有空格 → 新段开始（英文印刷体段首缩进）
    if (/^ +/.test(raw) && current.length > 0) {
      paragraphs.push(current.join(' '))
      current = [t]
    } else {
      current.push(t)
    }
  }

  if (current.length > 0) paragraphs.push(current.join(' '))
  return paragraphs
}

/** 翻译所有句子并标注词汇，按段落分组 */
export async function translateAndAnnotate(
  rawText: string,
  onSentenceProgress?: (done: number, total: number) => void,
): Promise<TranslationResult> {
  // 1. 过滤噪声行
  const rawLines = rawText.split('\n')
  const cleanLines = rawLines.filter(l => !isNoiseLine(l))

  // 2. 按段首缩进 + 空行分段
  const paraTexts = splitParagraphs(cleanLines)
  if (paraTexts.length === 0) {
    return { paragraphs: [], paragraphZh: '' }
  }

  // 预计算总句数
  let totalSentences = 0
  for (const pt of paraTexts) totalSentences += splitSentences(pt).length

  // 提取所有单词并标注考研词汇
  const allWords = extractWords(rawText)
  const wordAnnotations = await annotateWords(allWords)

  const paragraphPairs: ParagraphPair[] = []
  let globalIdx = 0
  const batchSize = 2

  // 逐段处理
  for (let pi = 0; pi < paraTexts.length; pi++) {
    const sentences = splitSentences(paraTexts[pi])
    if (sentences.length === 0) continue

    const pairs: SentencePair[] = []

    for (let start = 0; start < sentences.length; start += batchSize) {
      const batch = sentences.slice(start, start + batchSize)
      // 2 句并发翻译
      const results = await Promise.all(
        batch.map(async (en) => {
          try { return await translateOne(en) }
          catch { return '[翻译失败]' }
        }),
      )
      // 批次间延迟，避免 429
      if (start + batchSize < sentences.length) {
        await new Promise(r => setTimeout(r, 400))
      }

      for (let j = 0; j < batch.length; j++) {
        const en = batch[j]
        const zh = results[j]

        const enWords = en.match(/\b[a-zA-Z]+(?:'[a-zA-Z]+)?\b/g) || []
        const words: WordAnnotation[] = enWords.map((w) => {
          const a = wordAnnotations.get(w)
          return a || { text: w, lemma: w.toLowerCase(), isVocab: false }
        })

        const pair: SentencePair = { index: globalIdx, en, zh, words }
        pairs.push(pair)
        globalIdx++
        onSentenceProgress?.(globalIdx, totalSentences)
      }
    }

    const zhParagraph = pairs.map(s => s.zh).join('')
    paragraphPairs.push({ index: pi, sentences: pairs, zhParagraph })
  }

  const paragraphZh = paragraphPairs.map(p => p.zhParagraph).join('\n\n')

  return { paragraphs: paragraphPairs, paragraphZh }
}

export interface DictEntry {
  pos: string
  meaning: string
}

export interface DictResult {
  phonetic?: string
  inContext?: DictEntry
  entries: DictEntry[]
}

const POS_ZH: Record<string, string> = {
  noun: '名', verb: '动', adjective: '形', adverb: '副',
  preposition: '介', conjunction: '连', interjection: '叹',
  pronoun: '代', determiner: '限',
}

function translatePos(pos: string): string {
  return POS_ZH[pos.toLowerCase()] || pos
}

/** 单词查词：词典 API + Google Translate 中文释义 */
export async function lookupDictionary(word: string): Promise<DictResult | null> {
  const cleaned = word.replace(/[^a-zA-Z']/g, '')
  if (cleaned.length < 2 || cleaned.length > 30) return null

  const lower = cleaned.toLowerCase()

  const [dictResult, gtMeaning] = await Promise.allSettled([
    fetchDict(lower),
    translateOne(cleaned),
  ])

  const rawEntries = dictResult.status === 'fulfilled' ? dictResult.value : []
  const inContext = gtMeaning.status === 'fulfilled' && gtMeaning.value !== '[翻译失败]'
    ? { pos: '', meaning: gtMeaning.value as string }
    : undefined

  if (rawEntries.length === 0 && !inContext) return null

  const entries = await translateDefinitions(rawEntries)
  return { entries, inContext }
}

async function fetchDict(word: string): Promise<DictEntry[]> {
  try {
    const resp = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`)
    if (!resp.ok) return []
    const data = await resp.json() as Array<{
      meanings: Array<{ partOfSpeech: string; definitions: Array<{ definition: string }> }>
    }>
    if (!data?.[0]?.meanings) return []
    const seen = new Set<string>()
    const entries: DictEntry[] = []
    for (const m of data[0].meanings) {
      for (const d of m.definitions.slice(0, 2)) {
        const key = `${m.partOfSpeech}:${d.definition}`
        if (!seen.has(key)) {
          seen.add(key)
          entries.push({ pos: m.partOfSpeech, meaning: d.definition })
        }
      }
    }
    return entries.slice(0, 8)
  } catch { return [] }
}

async function translateDefinitions(entries: DictEntry[]): Promise<DictEntry[]> {
  if (entries.length === 0) return []
  // 逐条翻译，避免拼接过长触发 MyMemory 500 字符限制
  const results: string[] = []
  for (const e of entries) {
    try {
      const zh = await translateOne(e.meaning)
      results.push(zh !== '[翻译失败]' ? zh : e.meaning)
    } catch { results.push(e.meaning) }
    // 避免 429
    if (results.length < entries.length) {
      await new Promise(r => setTimeout(r, 200))
    }
  }
  return entries.map((e, i) => ({
    pos: translatePos(e.pos),
    meaning: results[i],
  }))
}
