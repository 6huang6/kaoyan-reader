// === 翻译结果数据结构 ===

export interface WordAnnotation {
  text: string
  lemma: string
  isVocab: boolean
  meaning?: string
}

export interface SentencePair {
  index: number
  en: string
  zh: string
  words: WordAnnotation[]
}

/** 段落：含序号、内部句子、整段译文 */
export interface ParagraphPair {
  index: number
  sentences: SentencePair[]
  zhParagraph: string  // 整个段落的连贯译文
}

export interface TranslationResult {
  paragraphs: ParagraphPair[]
  paragraphZh: string
}

// === OCR ===

export interface OcrState {
  status: 'idle' | 'loading' | 'success' | 'error'
  progress: number
  text: string | null
  error: string | null
}

// === 查词 ===

export interface WordDefinition {
  word: string
  phonetic?: string
  meanings: string[]
}

// === 页面 ===

export type AppPage = 'upload' | 'result'

export interface AppState {
  page: AppPage
  result: TranslationResult | null
  rawText: string | null
}
