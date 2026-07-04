import type { TranslationResult, SentencePair, WordAnnotation, ParagraphPair } from '../types'
import { extractWords, annotateWords } from './vocab'

/** 拆分中文句子（按 。！？），合并过短片段 */
function splitChineseSentences(zh: string): string[] {
  if (!zh) return []
  const parts = zh.match(/[^。！？]+[。！？]/g)
  if (!parts) return [zh]

  const raw = parts.map(p => p.trim()).filter(Boolean)

  // 合并短片段（≤5 字，如"不再。"）到前一句
  const merged: string[] = []
  for (const s of raw) {
    if (s.length <= 5 && merged.length > 0) {
      merged[merged.length - 1] += s
    } else {
      merged.push(s)
    }
  }
  return merged
}

/** 不以句号结尾的常见缩写 */
const ABBREVIATIONS = /\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|Co|Inc|Ltd|St|Ave|vs|etc|e\.g|i\.e)\.$/i

/** 在缩写后补空格（OCR 可能丢失），如 "Greenspan&Co.may" → "Greenspan&Co. may" */
function fixAbbreviationSpacing(text: string): string {
  return text.replace(/\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|Co|Inc|Ltd|St|Ave|vs|etc)\.([A-Z])/g, '$1. $2')
}

/** 按句子拆分英文文本 */
export function splitSentences(text: string): string[] {
  const fixed = fixAbbreviationSpacing(text)

  // 1. 合并被 OCR 断开的行：行末无句号则与下一行合并
  const lines = fixed.split(/\n+/)
  const blocks: string[] = []
  let buf = ''

  for (const line of lines) {
    const t = line.trim()
    if (!t) continue
    if (/^Passage\s+\d+/i.test(t)) continue

    buf = buf ? buf + ' ' + t : t

    // 以 .!? 结尾（可带引号），且不是缩写 → 当前句组完整
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

    // 合并被缩写误拆的片段
    let fragment = ''
    for (const p of parts) {
      const t = p.trim()
      if (!t) continue

      fragment = fragment ? fragment + t : t

      // 如果当前片段以缩写结尾 → 不是真句号，继续合并
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

/** 翻译一句话：Vercel Function → Google 直连 */
async function translateOne(text: string): Promise<string> {
  // 方式 1：Vercel Function（国内可用）
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
  } catch { /* fallback */ }

  // 方式 2：Google Translate 直连（本地 dev / VPN）
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
  } catch { /* fallback */ }

  return '[翻译失败]'
}

/** 清理 OCR 结果：过滤中文行、标题行、纯符号行，保留段落空行 */
function cleanOcrOutput(text: string): string {
  return text
    .split('\n')
    .map(line => {
      const t = line.trim()
      // 空行保留（段落分隔）
      if (!t) return ''
      // 过滤中文行（覆盖 CJK 所有区块）
      if (/[一-鿿㐀-䶿豈-﫿]/.test(t)) return ''
      // 过滤含中文标点的行
      if (/[。！？，、；：""''（）《》【】]/.test(t)) return ''
      // 过滤文章标题（Passage 3, Text B 等）
      if (/^(Passage|Section|Text|Part)\s+\d+/i.test(t)) return ''
      // 过滤纯数字行（题号、页码）
      if (/^\d+$/.test(t)) return ''
      // 过滤纯符号行
      const letters = (t.match(/[a-zA-Z]/g) || []).length
      if (letters === 0) return ''
      return line
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n') // 多余空行合并
    .trim()
}

/** 翻译所有句子并标注词汇，按段落分组 */
export async function translateAndAnnotate(
  rawText: string,
  onSentenceProgress?: (done: number, total: number) => void,
): Promise<TranslationResult> {
  const cleanedText = cleanOcrOutput(rawText)

  // 1. 提取所有单词并标注考研词汇（一次性）
  const allWords = extractWords(rawText)
  const wordAnnotations = await annotateWords(allWords)

  // 2. 按段落拆分（双换行 = 段落边界）
  const paraTexts = cleanedText.split(/\n\n+/).filter(p => p.trim())

  // 3. 预先计算总句数（用于进度显示）
  let totalSentences = 0
  for (const pt of paraTexts) {
    totalSentences += splitSentences(pt).length
  }

  // 4. 每个段落独立处理：整段翻译 → 拆分回句子（利用上下文）
  const allSentences: SentencePair[] = []
  const paragraphPairs: ParagraphPair[] = []
  let globalIdx = 0

  for (let pi = 0; pi < paraTexts.length; pi++) {
    const enSentences = splitSentences(paraTexts[pi])
    if (enSentences.length === 0) continue

    // 判断是否需要分块翻译（Google Translate 限制 ~500 chars）
    const paraText = enSentences.join(' ')
    let zhParagraph = ''

    if (paraText.length <= 400) {
      // 短段落：直接整段翻译
      try { zhParagraph = await translateOne(paraText) }
      catch { /* fallback to per-sentence */ }
    } else {
      // 长段落：分块翻译（每块 2-3 句保持上下文）
      let chunk = ''
      const chunkResults: string[] = []
      for (const s of enSentences) {
        if (chunk && (chunk + ' ' + s).length > 400) {
          try { chunkResults.push(await translateOne(chunk)) }
          catch { chunkResults.push('') }
          chunk = s
        } else {
          chunk = chunk ? chunk + ' ' + s : s
        }
      }
      if (chunk) {
        try { chunkResults.push(await translateOne(chunk)) }
        catch { chunkResults.push('') }
      }
      zhParagraph = chunkResults.join('')
    }

    // 拆分中文为句子
    const zhSentences = splitChineseSentences(zhParagraph)

    const pairs: SentencePair[] = []
    for (let j = 0; j < enSentences.length; j++) {
      const en = enSentences[j]
      let zh = zhSentences[j] || ''

      if (!zh) {
        try { zh = await translateOne(en) }
        catch { zh = '[翻译失败]' }
      }

      const enWords = en.match(/\b[a-zA-Z]+(?:'[a-zA-Z]+)?\b/g) || []
      const words: WordAnnotation[] = enWords.map((w) => {
        const a = wordAnnotations.get(w)
        return a || { text: w, lemma: w.toLowerCase(), isVocab: false }
      })

      pairs.push({ index: globalIdx, en, zh, words })
      allSentences.push({ index: globalIdx, en, zh, words })
      globalIdx++
      onSentenceProgress?.(globalIdx, totalSentences)
    }

    // 每段的整段译文：除了拆句对齐的中文，也为整段生成连贯译文
    if (!zhParagraph) {
      zhParagraph = pairs.map(s => s.zh).join('')
    }

    paragraphPairs.push({ index: pi, sentences: pairs, zhParagraph })
  }

  // 4. 全文整段译文 = 各段落连贯译文拼接
  const paragraphZh = paragraphPairs.map(p => p.zhParagraph).join('\n\n')

  return { paragraphs: paragraphPairs, paragraphZh }
}

export interface DictEntry {
  pos: string      // 词性，如 "n." "v." "adj." "adv."
  meaning: string  // 释义
}

export interface DictResult {
  phonetic?: string
  inContext?: DictEntry
  entries: DictEntry[]
}

/** 查词：词典 API 获取释义 + 翻译成中文 */
export async function lookupDictionary(word: string): Promise<DictResult | null> {
  const cleaned = word.replace(/[^a-zA-Z']/g, '')
  if (cleaned.length < 2 || cleaned.length > 30) return null

  const lower = cleaned.toLowerCase()

  // 1. 获取词典数据 + Google 中文翻译（并行）
  const [dictResult, gtMeaning] = await Promise.allSettled([
    fetchDict(lower),
    fetchGoogleMeaning(cleaned),
  ])

  const rawEntries = dictResult.status === 'fulfilled' ? dictResult.value : []
  const inContext = gtMeaning.status === 'fulfilled' && gtMeaning.value
    ? { pos: '', meaning: gtMeaning.value }
    : undefined

  if (rawEntries.length === 0 && !inContext) return null

  // 2. 将英文释义批量翻译成中文
  const entries = await translateDefinitions(rawEntries)

  return { entries, inContext }
}

/** 英文词性 → 中文 */
const POS_ZH: Record<string, string> = {
  noun: '名', verb: '动', adjective: '形', adverb: '副',
  preposition: '介', conjunction: '连', interjection: '叹',
  pronoun: '代', determiner: '限', numeral: '数',
  article: '冠', particle: '助', aux: '助动',
}

function translatePos(pos: string): string {
  const key = pos.toLowerCase()
  return POS_ZH[key] || pos
}

/** 批量翻译英文释义为中文 */
async function translateDefinitions(entries: DictEntry[]): Promise<DictEntry[]> {
  if (entries.length === 0) return []

  const separator = ' ||| '
  const combined = entries.map(e => e.meaning).join(separator)

  try {
    const zh = await fetchGoogleMeaning(combined)
    if (!zh) return entries

    const zhParts = zh.split(/\s*\|\|\|\s*/)

    return entries.map((e, i) => ({
      pos: translatePos(e.pos),
      meaning: zhParts[i] || e.meaning,
    }))
  } catch {
    return entries
  }
}

/** 从 Free Dictionary API 获取词性和多个释义 */
async function fetchDict(word: string): Promise<DictEntry[]> {
  const resp = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`)
  if (!resp.ok) return []

  const data = await resp.json() as Array<{
    phonetic?: string
    meanings: Array<{
      partOfSpeech: string
      definitions: Array<{ definition: string }>
    }>
  }>

  if (!data?.[0]?.meanings) return []

  const seen = new Set<string>()
  const entries: DictEntry[] = []

  for (const m of data[0].meanings) {
    const pos = m.partOfSpeech || ''
    for (const d of m.definitions.slice(0, 2)) {
      const def = d.definition
      const key = `${pos}:${def}`
      if (!seen.has(key)) {
        seen.add(key)
        entries.push({ pos, meaning: def })
      }
    }
  }

  return entries.slice(0, 8) // 最多 8 条
}

/** 获取单词中文释义：Vercel → Google 直连 */
async function fetchGoogleMeaning(word: string): Promise<string | null> {
  // Vercel Function
  try {
    const resp = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: word }),
    })
    if (resp.ok) {
      const data = await resp.json() as { zh: string }
      if (data.zh) return data.zh
    }
  } catch { /* fallback */ }

  // Google 直连
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(word)}`
    const resp = await fetch(url)
    if (resp.ok) {
      const data = await resp.json() as unknown[][]
      const parts: string[] = []
      for (const block of data[0] as [string][]) {
        if (block[0]) parts.push(block[0])
      }
      return parts.join('；') || null
    }
  } catch { /* fail */ }
  return null
}
