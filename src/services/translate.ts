import type { TranslationResult, SentencePair, WordAnnotation, ParagraphPair } from '../types'
import { extractWords, annotateWords } from './vocab'

const ABBREVIATIONS = /\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|Co|Inc|Ltd|St|Ave|vs|etc|e\.g|i\.e)\.$/i
const TRANSLATE_API = 'https://eunyonsybejjqbzjrizt.supabase.co/functions/v1/translate'

export function splitSentences(text: string): string[] {
  const lines = text.split(/\n+/)
  const blocks: string[] = []
  let buf = ''

  for (const line of lines) {
    const t = line.trim()
    if (!t) continue
    if (/^Passage\s+\d+/i.test(t)) continue
    buf = buf ? buf + ' ' + t : t
    if (/[.!?]["”]?\s*$/.test(buf) && !ABBREVIATIONS.test(buf)) {
      blocks.push(buf)
      buf = ''
    }
  }
  if (buf) blocks.push(buf)

  const sentences: string[] = []
  for (const block of blocks) {
    const parts = block.match(/[^.!?]+[.!?]+["”]?\s*/g)
    if (!parts) { sentences.push(block.trim()); continue }
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

  const result: string[] = []
  for (const s of sentences) {
    if (s.split(/\s+/).length <= 2 && result.length > 0) {
      result[result.length - 1] += ' ' + s
    } else {
      result.push(s)
    }
  }
  return result
}

async function translateOne(text: string, context?: string): Promise<string> {
  const cleaned = text
    .replace(/[​-‍﻿]/g, '')
    .replace(/&:/g, '&')
    .replace(/\s+/g, ' ')
    .trim()

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const resp = await fetch(TRANSLATE_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleaned, context }),
      })
      if (resp.ok) {
        const data = await resp.json() as { zh: string; error?: string }
        if (data.zh) return data.zh
      }
    } catch { /* fall through */ }
    if (attempt < 3) {
      await new Promise(r => setTimeout(r, 500 * (2 ** attempt)))
    }
  }
  console.warn('翻译最终失败:', cleaned.slice(0, 50))
  return '[翻译失败]'
}

function isNoiseLine(raw: string): boolean {
  const t = raw.trim()
  if (!t) return false
  if (/[一-鿿]/.test(t)) return true
  if (/^(Passage|Section|Text|Part)\s+\d+/i.test(t)) return true
  if (/^\d+$/.test(t)) return true
  if (/^\[\d+[A-Z]?\]/.test(t) && t.length < 12) return true
  if (/\(\s*#\s*\d+/.test(t) && t.length < 50) return true
  if (/^\d{4}\s+[A-Z0-9]{3,}/.test(t) && t.length < 40) return true
  if (/[，。；：、《》【】]/.test(t)) return true
  if (/\(\s*\*\s*\d+/.test(t) && t.length < 50) return true
  const letters = (t.match(/[a-zA-Z]/g) || []).length
  return letters === 0
}

function detectParagraphs(text: string): string {
  const lines = text.split('\n')
  if (lines.length < 3) return text
  const lengths = lines.map(l => l.trim().length).filter(l => l > 10)
  if (lengths.length === 0) return text
  const sorted = [...lengths].sort((a, b) => a - b)
  const medianLen = sorted[Math.floor(sorted.length / 2)]
  if (medianLen < 20) return text

  const result: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const prev = lines[i - 1]?.trim() || ''
    const curr = lines[i].trim()
    const prevEnds = /[.!?]["”]?\s*$/.test(prev)
    const prevShort = prev.length > 0 && prev.length < medianLen * 0.9
    const currUpper = /^[A-Z]/.test(curr)
    if (i > 0 && prevEnds && prevShort && currUpper) {
      result.push('')
    }
    result.push(lines[i])
  }
  return result.join('\n')
}

function splitParagraphs(lines: string[]): string[] {
  const paragraphs: string[] = []
  let current: string[] = []
  for (const raw of lines) {
    const t = raw.trim()
    if (!t) {
      if (current.length > 0) { paragraphs.push(current.join(' ')); current = [] }
      continue
    }
    if (/^\s+/.test(raw) && current.length > 0) {
      paragraphs.push(current.join(' '))
      current = [t]
    } else {
      current.push(t)
    }
  }
  if (current.length > 0) paragraphs.push(current.join(' '))
  return paragraphs
}

export async function translateAndAnnotate(
  rawText: string,
  onSentenceProgress?: (done: number, total: number) => void,
): Promise<TranslationResult> {
  const withParagraphs = detectParagraphs(rawText)
  const rawLines = withParagraphs.split('\n')
  const cleanLines = rawLines.filter(l => !isNoiseLine(l))
  const paraTexts = splitParagraphs(cleanLines)
  if (paraTexts.length === 0) return { paragraphs: [], paragraphZh: '' }

  let totalSentences = 0
  for (const pt of paraTexts) totalSentences += splitSentences(pt).length

  const allWords = extractWords(rawText)
  const wordAnnotations = await annotateWords(allWords)

  const paragraphPairs: ParagraphPair[] = []
  let globalIdx = 0

  for (let pi = 0; pi < paraTexts.length; pi++) {
    const sentences = splitSentences(paraTexts[pi])
    if (sentences.length === 0) continue

    // 并排翻译，前一前作为上下文
    const zhResults = await Promise.all(
      sentences.map((en, si) =>
        translateOne(en, si > 0 ? sentences[si - 1] : undefined)
      ),
    )

    const pairs: SentencePair[] = []
    for (const en of sentences) {
      const zh = zhResults.shift()!
      const enWords = en.match(/\b[a-zA-Z]+(?:['‐-][a-zA-Z]+)*\b/g) || []
      const words: WordAnnotation[] = enWords.map((w) => {
        const a = wordAnnotations.get(w)
        return a || { text: w, lemma: w.toLowerCase(), isVocab: false, pos: undefined }
      })
      pairs.push({ index: globalIdx, en, zh, words })
      globalIdx++
      onSentenceProgress?.(globalIdx, totalSentences)
    }

    const zhParagraph = pairs.map(s => s.zh).join('')
    paragraphPairs.push({ index: pi, sentences: pairs, zhParagraph })
  }

  const paragraphZh = paragraphPairs.map(p => p.zhParagraph).join('\n\n')
  return { paragraphs: paragraphPairs, paragraphZh }
}

export interface DictEntry { pos: string; meaning: string }
export interface DictResult { phonetic?: string; inContext?: DictEntry; entries: DictEntry[] }

const POS_ZH: Record<string, string> = {
  noun: '名', verb: '动', adjective: '形', adverb: '副',
  preposition: '介', conjunction: '连', interjection: '叹',
  pronoun: '代', determiner: '限',
}

function translatePos(pos: string): string { return POS_ZH[pos.toLowerCase()] || pos }

// 词典缓存：同词只查一次
const dictCache = new Map<string, Promise<DictResult | null>>()

export async function lookupDictionary(word: string): Promise<DictResult | null> {
  const cleaned = word.replace(/[^a-zA-Z'‐-]/g, '')
  if (cleaned.length < 2 || cleaned.length > 30) return null

  const lower = cleaned.toLowerCase()
  if (dictCache.has(lower)) return dictCache.get(lower)!

  const promise = (async () => {
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
  })()

  dictCache.set(lower, promise)
  return promise
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
        if (!seen.has(key)) { seen.add(key); entries.push({ pos: m.partOfSpeech, meaning: d.definition }) }
      }
    }
    return entries.slice(0, 3)
  } catch { return [] }
}

async function translateDefinitions(entries: DictEntry[]): Promise<DictEntry[]> {
  if (entries.length === 0) return []
  // 合并为一次 API 调用：用 ||| 拼接所有释义
  const separator = ' ||| '
  const combined = entries.map(e => e.meaning).join(separator)

  let zhCombined = combined // fallback: 原文
  try {
    const zh = await translateOne(combined)
    if (zh !== '[翻译失败]') zhCombined = zh
  } catch { /* keep original */ }

  const zhParts = zhCombined.split(/\s*\|\|\|\s*/)
  return entries.map((e, i) => ({
    pos: translatePos(e.pos),
    meaning: zhParts[i]?.trim() || e.meaning,
  }))
}
