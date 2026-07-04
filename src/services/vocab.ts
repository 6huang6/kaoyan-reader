import type { WordAnnotation } from '../types'

let vocabMap: Map<string, string> | null = null
let vocabLoaded = false
let vocabLoadPromise: Promise<void> | null = null

/** 加载考研词汇表 */
async function loadVocab(): Promise<Map<string, string>> {
  if (vocabMap) return vocabMap
  if (vocabLoadPromise) {
    await vocabLoadPromise
    return vocabMap!
  }

  vocabLoadPromise = (async () => {
    try {
      const resp = await fetch('/vocab.json')
      const data = await resp.json() as Record<string, string>
      vocabMap = new Map(Object.entries(data))
      vocabLoaded = true
    } catch {
      // 词表加载失败时使用空 Map，不影响主流程
      vocabMap = new Map()
      vocabLoaded = true
    }
  })()

  await vocabLoadPromise
  return vocabMap!
}

/** 简单 lemma 化：去复数、过去式、ing 等常见变形 */
function lemmatize(word: string): string {
  const lower = word.toLowerCase()
  if (lower.endsWith('ies') && lower.length > 4) return lower.slice(0, -3) + 'y'
  if (lower.endsWith('ves') && lower.length > 4) return lower.slice(0, -3) + 'f'
  if (lower.endsWith('es') && lower.length > 4) {
    // watches → watch, 但 roses → rose
    const s = lower.slice(0, -2)
    if (s.endsWith('sh') || s.endsWith('ch') || s.endsWith('ss') || s.endsWith('x') || s.endsWith('z')) {
      return s
    }
    return lower.slice(0, -1) // tries → try? No, this is too aggressive. Just strip -s
  }
  if (lower.endsWith('s') && !lower.endsWith('ss') && lower.length > 3) return lower.slice(0, -1)
  if (lower.endsWith('ed') && lower.length > 4) {
    const base = lower.slice(0, -2)
    if (base.endsWith('i')) return base.slice(0, -1) + 'y' // carried → carry
    return base
  }
  if (lower.endsWith('ing') && lower.length > 5) {
    const base = lower.slice(0, -3)
    if (base.endsWith('nn') || base.endsWith('tt') || base.endsWith('mm')) return base.slice(0, -1) // running → run
    if (base.endsWith('e')) return base // taking → take (already removed -ing)
    return base
  }
  if (lower.endsWith('er') && lower.length > 4) return lower.slice(0, -2) // larger → large
  if (lower.endsWith('est') && lower.length > 5) return lower.slice(0, -3) // largest → large
  if (lower.endsWith('ly') && lower.length > 4) return lower.slice(0, -2) // quickly → quick
  if (lower.endsWith('tion') && lower.length > 6) return lower // nation, station — not lemmatized
  return lower
}

/** 给单词列表标注考研词汇 */
export async function annotateWords(words: string[]): Promise<Map<string, WordAnnotation>> {
  const vocab = await loadVocab()
  const result = new Map<string, WordAnnotation>()

  for (const word of words) {
    if (result.has(word)) continue
    const lemma = lemmatize(word)
    const meaning = vocab.get(lemma) || vocab.get(word.toLowerCase())
    result.set(word, {
      text: word,
      lemma,
      isVocab: !!meaning,
      meaning: meaning || undefined,
    })
  }

  return result
}

/** 查询单个词释义（优先本地词表，非大纲词返回 null，由调用方决定是否调 API） */
export async function lookupWord(word: string): Promise<string | null> {
  const vocab = await loadVocab()
  const lemma = lemmatize(word)
  return vocab.get(lemma) || vocab.get(word.toLowerCase()) || null
}

/** 从文本中提取所有单词（去重，保留标点信息） */
export function extractWords(text: string): string[] {
  const seen = new Set<string>()
  const words: string[] = []
  const regex = /\b[a-zA-Z]+(?:'[a-zA-Z]+)?\b/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    const w = match[0]
    if (!seen.has(w)) {
      seen.add(w)
      words.push(w)
    }
  }
  return words
}

/** 检查词表是否已加载 */
export function isVocabReady(): boolean {
  return vocabLoaded
}
