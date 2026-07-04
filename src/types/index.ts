// === 翻译结果数据结构 ===

/** 单个词的标注信息 */
export interface WordAnnotation {
  text: string       // 原词（保持原文大小写）
  lemma: string      // 词元（小写，用于匹配和查询）
  isVocab: boolean   // 是否考研大纲词汇
  meaning?: string   // 中文释义（大纲词从 vocab.json 获取，非大纲词从 API 获取）
}

/** 单句的原文+译文+逐词标注 */
export interface SentencePair {
  index: number
  en: string
  zh: string
  words: WordAnnotation[]
}

/** 完整翻译结果 */
export interface TranslationResult {
  sentences: SentencePair[]
  paragraphZh: string  // 整段连贯译文
}

// === OCR 相关 ===

export interface OcrState {
  status: 'idle' | 'loading' | 'success' | 'error'
  progress: number   // 0-1
  text: string | null
  error: string | null
}

// === 查词相关 ===

export interface WordDefinition {
  word: string
  phonetic?: string
  meanings: string[]  // 中文释义列表
}

// === 页面状态 ===

export type AppPage = 'upload' | 'result'

export interface AppState {
  page: AppPage
  result: TranslationResult | null
  rawText: string | null  // OCR 识别后的原始文本
}
