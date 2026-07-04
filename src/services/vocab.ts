import type { WordAnnotation } from '../types'

let vocabMap: Map<string, Array<{ meaning: string; pos: string }>> | null = null
let vocabLoaded = false
let vocabLoadPromise: Promise<void> | null = null

type VocabEntry = { meaning: string; pos: string }

/** 加载考研词汇表 */
async function loadVocab(): Promise<Map<string, VocabEntry[]>> {
  if (vocabMap) return vocabMap
  if (vocabLoadPromise) {
    await vocabLoadPromise
    return vocabMap!
  }

  vocabLoadPromise = (async () => {
    try {
      const resp = await fetch(import.meta.env.BASE_URL + 'vocab.json')
      const data = await resp.json() as Record<string, string | VocabEntry | VocabEntry[]>
      vocabMap = new Map()
      for (const [word, entry] of Object.entries(data)) {
        if (typeof entry === 'string') {
          vocabMap.set(word, [{ meaning: entry, pos: '' }])
        } else if (Array.isArray(entry)) {
          vocabMap.set(word, entry)
        } else {
          vocabMap.set(word, [entry])
        }
      }
      vocabLoaded = true
    } catch {
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

  // -ation → -ate (discrimination→discriminate, humiliation→humiliate)
  if (lower.endsWith('ation') && lower.length > 8) {
    return lower.slice(0, -5) + 'ate'
  }
  // -tion → -t (action→act, construction→construct)
  if (lower.endsWith('tion') && lower.length > 7) {
    const base = lower.slice(0, -4)
    if (base.endsWith('c')) return base.slice(0, -1) // production→produce? no, too complex
    return base + 't'
  }
  // -ment → (punishment→punish)
  if (lower.endsWith('ment') && lower.length > 7) {
    return lower.slice(0, -4)
  }
  // -ness → (darkness→dark)
  if (lower.endsWith('ness') && lower.length > 7) {
    return lower.slice(0, -4)
  }
  // dis- 前缀：disadvantage→advantage
  if (lower.startsWith('dis') && lower.length > 6) {
    return lower.slice(3)
  }
  // -able → (avoidable→avoid)
  if (lower.endsWith('able') && lower.length > 7) {
    return lower.slice(0, -4)
  }
  // -ible → - (possible→poss? not great, but rare)
  if (lower.endsWith('ible') && lower.length > 7) {
    const base = lower.slice(0, -4)
    return base + 'e'
  }

  // 副词：-ally → -al + 后续 likely 再被裁（alphabetically→alphabetica...→alphabet)
  if (lower.endsWith('ally') && lower.length > 7) return lower.slice(0, -4)
  if (lower.endsWith('ly') && lower.length > 5) {
    const base = lower.slice(0, -2)
    if (base.endsWith('al') && base.length > 5) return base.slice(0, -2)
    return base
  }
  if (lower.endsWith('ies') && lower.length > 4) return lower.slice(0, -3) + 'y'
  if (lower.endsWith('ves') && lower.length > 4) return lower.slice(0, -3) + 'f'
  if (lower.endsWith('es') && lower.length > 4) {
    const s = lower.slice(0, -2)
    if (s.endsWith('sh') || s.endsWith('ch') || s.endsWith('ss') || s.endsWith('x') || s.endsWith('z')) {
      return s
    }
    return lower.slice(0, -1)
  }
  if (lower.endsWith('s') && !lower.endsWith('ss') && lower.length > 3) return lower.slice(0, -1)
  if (lower.endsWith('ed') && lower.length > 4) {
    const base = lower.slice(0, -2)
    if (base.endsWith('i')) return base.slice(0, -1) + 'y'
    return base
  }
  if (lower.endsWith('ing') && lower.length > 5) {
    const base = lower.slice(0, -3)
    if (base.endsWith('nn') || base.endsWith('tt') || base.endsWith('mm')) return base.slice(0, -1)
    if (base.endsWith('e')) return base
    return base
  }
  if (lower.endsWith('er') && lower.length > 4) return lower.slice(0, -2)
  if (lower.endsWith('est') && lower.length > 5) return lower.slice(0, -3)

  return lower
}

/** 给单词列表标注考研词汇 */
export async function annotateWords(words: string[]): Promise<Map<string, WordAnnotation>> {
  const vocab = await loadVocab()
  const result = new Map<string, WordAnnotation>()

  for (const word of words) {
    if (result.has(word)) continue
    const lemma = lemmatize(word)
    const entries = vocab.get(lemma) || vocab.get(word.toLowerCase())
    const first = entries?.[0]
    result.set(word, {
      text: word,
      lemma,
      isVocab: !!first,
      meaning: first?.meaning,
      pos: entries?.map(e => e.pos).join('/'),
      vocabEntries: entries || undefined,
    })
  }

  return result
}

/** 查询单个词释义（优先本地词表，非大纲词返回 null） */
export async function lookupWord(word: string): Promise<string | null> {
  const vocab = await loadVocab()
  const lemma = lemmatize(word)
  const entries = vocab.get(lemma) || vocab.get(word.toLowerCase())
  return entries?.[0]?.meaning || null
}

/** 从文本中提取所有单词（去重，保留标点信息） */
export function extractWords(text: string): string[] {
  const seen = new Set<string>()
  const words: string[] = []
  const regex = /\b[a-zA-Z]+(?:['-][a-zA-Z]+)*\b/g
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
