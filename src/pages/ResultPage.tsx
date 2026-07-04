import { useState, useMemo, useCallback } from 'react'
import { ArrowLeft, Plus } from 'lucide-react'
import { lookupDictionary, type DictResult } from '../services/translate'
import { lookupWord } from '../services/vocab'
import type { TranslationResult, SentencePair } from '../types'

interface Props {
  result: TranslationResult
  onBack: () => void
  onNew: () => void
}

type TabMode = 'bilingual' | 'paragraph'

export default function ResultPage({ result, onBack, onNew }: Props) {
  const [mode, setMode] = useState<TabMode>('bilingual')

  // 收集所有考研词汇（去重）
  const vocabWords = useMemo(() => {
    const seen = new Set<string>()
    const list: Array<{ word: string; meaning: string }> = []
    for (const para of result.paragraphs) {
      for (const s of para.sentences) {
        for (const w of s.words) {
          if (w.isVocab && w.meaning && !seen.has(w.lemma)) {
            seen.add(w.lemma)
            list.push({ word: w.text, meaning: w.meaning })
          }
        }
      }
    }
    return list
  }, [result])

  // 计算总句数
  const totalSentences = result.paragraphs.reduce((sum, p) => sum + p.sentences.length, 0)

  return (
    <div className="min-h-screen bg-warm-bg flex flex-col">
      <header className="border-b border-warm-border/50 bg-white/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-warm-text rounded-lg flex items-center justify-center">
              <span className="text-white font-serif font-bold text-sm">研</span>
            </div>
            <h1 className="text-lg font-semibold text-warm-text tracking-tight">
              考研英语阅读助手
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              className="px-4 py-2 border border-gray-200 text-warm-text rounded-xl text-sm font-medium
                hover:bg-gray-50 transition-all duration-200 inline-flex items-center gap-1.5"
              onClick={onBack}
            >
              <ArrowLeft size={14} />
              返回
            </button>
            <button
              className="px-4 py-2 bg-warm-text text-white rounded-xl text-sm font-medium
                hover:bg-warm-text/90 transition-all duration-200 inline-flex items-center gap-1.5 shadow-sm"
              onClick={onNew}
            >
              <Plus size={14} />
              新文章
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 space-y-6">
        {/* Tab 切换 */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-warm-muted">
            {result.paragraphs.length} 段 · {totalSentences} 句
          </div>
          <div className="flex bg-white rounded-lg p-0.5 shadow-sm border border-warm-border text-sm">
            <button
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                mode === 'bilingual' ? 'bg-warm-accent text-white' : 'text-warm-muted hover:text-warm-text'
              }`}
              onClick={() => setMode('bilingual')}
            >
              逐句对照
            </button>
            <button
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                mode === 'paragraph' ? 'bg-warm-accent text-white' : 'text-warm-muted hover:text-warm-text'
              }`}
              onClick={() => setMode('paragraph')}
            >
              整段译文
            </button>
          </div>
        </div>

        {/* 内容区 */}
        {mode === 'bilingual' ? (
          <BilingualView paragraphs={result.paragraphs} />
        ) : (
          <ParagraphView paragraphs={result.paragraphs} paragraphZh="" />
        )}

        {/* 词汇面板 */}
        {vocabWords.length > 0 && <VocabPanel words={vocabWords} />}
      </main>

      <footer className="text-center py-8 text-xs text-warm-muted/50">
        考研英语阅读助手 · 图片仅在浏览器本地处理
      </footer>
    </div>
  )
}

// ─── 逐句对照视图 ───

function BilingualView({ paragraphs }: { paragraphs: TranslationResult['paragraphs'] }) {
  return (
    <div className="space-y-8">
      {paragraphs.map((para) => (
        <div key={para.index}>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-warm-border" />
            <span className="text-sm font-semibold text-warm-accent">
              第 {para.index + 1} 段
            </span>
            <div className="flex-1 h-px bg-warm-border" />
          </div>

          <div className="space-y-3">
            {para.sentences.map((s) => (
              <SentenceRow key={s.index} sentence={s} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── 单句行：EN 上 ZH 下 ───

function SentenceRow({ sentence: s }: { sentence: SentencePair }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-warm-border overflow-hidden">
      {/* 英文 */}
      <div className="text-[15px] text-warm-text leading-8 mb-2 break-words">
        <span className="text-warm-muted text-xs mr-1.5 font-mono shrink-0">[{s.index + 1}]</span>
        {renderEnWords(s)}
      </div>
      {/* 中文 */}
      <div className="text-[15px] text-gray-600 leading-8 pl-6 border-l-2 border-warm-accent/30 break-words">
        {s.zh}
      </div>
    </div>
  )
}

// ─── 英文单词渲染（考研词下划线 + 点击查词） ───

function renderEnWords(sentence: SentencePair): React.ReactNode[] {
  const parts = sentence.en.split(/(\b[a-zA-Z]+(?:'[a-zA-Z]+)?\b)/g)

  return parts.map((part, i) => {
    const word = sentence.words.find(
      (w) => w.text.toLowerCase() === part.toLowerCase(),
    )
    if (!word) return <span key={i}>{part}</span>

    return <ClickableWord key={i} word={word} />
  })
}

function ClickableWord({ word }: { word: SentencePair['words'][number] }) {
  const [dict, setDict] = useState<DictResult | null>(null)
  const [loading, setLoading] = useState(false)

  const handleClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (dict) { setDict(null); return }

    // 先检查本地词表（大纲词的快速释义）
    const local = await lookupWord(word.text)

    setLoading(true)
    const result = await lookupDictionary(word.text)
    setLoading(false)

    if (result) {
      // 如果有大纲词释义，优先作为文中释义
      if (local && !result.inContext) {
        result.inContext = { pos: '', meaning: local }
      }
      setDict(result)
    } else if (local) {
      setDict({ entries: [], inContext: { pos: '', meaning: local } })
    } else {
      setDict({ entries: [], inContext: { pos: '', meaning: '未找到释义' } })
    }
  }, [word, dict])

  return (
    <span className="relative inline">
      <span
        className={`cursor-pointer transition-colors rounded px-0.5
          ${word.isVocab
            ? 'border-b-2 border-vocab-underline text-red-700 hover:bg-red-50'
            : 'border-b border-dashed border-gray-300 hover:bg-gray-100'
          }
          ${loading ? 'animate-pulse bg-gray-100' : ''}`}
        onClick={handleClick}
        title={word.isVocab ? word.meaning : '点击查词'}
      >
        {word.text}
      </span>

      {dict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={() => setDict(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-[320px] max-h-[75vh] overflow-y-auto border border-warm-border"
            style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 词头区域 */}
            <div className="bg-gradient-to-br from-warm-text to-gray-800 px-5 py-4 rounded-t-2xl">
              <div className="flex items-baseline gap-3">
                <span className="font-bold text-2xl text-white tracking-wide">{word.text}</span>
                {dict.phonetic && (
                  <span className="text-sm text-white/60 font-mono">{dict.phonetic}</span>
                )}
              </div>
              {word.isVocab && (
                <span className="inline-block mt-1.5 text-[11px] bg-warm-accent/80 text-white px-2 py-0.5 rounded-full">
                  考研词汇
                </span>
              )}
            </div>

            <div className="p-4 space-y-3">
              {/* 文中释义 */}
              {dict.inContext && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-xs font-semibold text-warm-accent uppercase tracking-wide">文中释义</span>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <p className="text-sm text-warm-text leading-relaxed">{dict.inContext.meaning}</p>
                  </div>
                </div>
              )}

              {/* 词典释义 */}
              {dict.entries.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-xs font-semibold text-warm-muted uppercase tracking-wide">常用释义</span>
                  </div>
                  <ul className="space-y-2">
                    {dict.entries.map((e, i) => (
                      <li key={i} className="flex items-baseline gap-2 text-sm leading-relaxed">
                        <span className="text-warm-muted font-mono text-xs shrink-0 w-5 text-right">
                          {i + 1}
                        </span>
                        {e.pos && (
                          <span className="shrink-0 bg-warm-bg text-warm-accent text-[11px] font-semibold w-6 text-center py-0.5 rounded">
                            {e.pos}
                          </span>
                        )}
                        <span className="text-gray-700 flex-1">{e.meaning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 关闭 */}
              <button
                className="w-full text-center text-xs text-warm-muted hover:text-warm-accent transition-colors pt-1"
                onClick={() => setDict(null)}
              >
                点击空白处关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </span>
  )
}

// ─── 整段译文视图：逐段显示 ───

function ParagraphView({
  paragraphs,
}: {
  paragraphs: TranslationResult['paragraphs']
  paragraphZh: string
}) {
  return (
    <div className="space-y-8">
      {paragraphs.map((para) => (
        <div key={para.index} className="bg-white rounded-xl p-6 shadow-sm border border-warm-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-warm-border" />
            <span className="text-sm font-semibold text-warm-accent">
              第 {para.index + 1} 段
            </span>
            <div className="flex-1 h-px bg-warm-border" />
          </div>
          <p className="text-[15px] text-gray-700 leading-8">{para.zhParagraph}</p>
        </div>
      ))}
    </div>
  )
}

// ─── 词汇面板 ───

function VocabPanel({ words }: { words: Array<{ word: string; meaning: string }> }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="bg-vocab-bg rounded-xl p-6 border border-warm-border">
      <button
        className="flex items-center justify-between w-full text-left"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span className="text-sm text-warm-accent font-semibold">
          考研词汇标注 ({words.length} 个)
        </span>
        <span
          className="text-warm-muted text-sm transition-transform duration-200"
          style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
        >
          ▼
        </span>
      </button>

      {!collapsed && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-2">
          {words.map((v) => (
            <div key={v.word} className="flex items-baseline gap-2 text-sm py-1">
              <span className="font-semibold text-warm-text whitespace-nowrap">{v.word}</span>
              <span className="text-warm-muted text-xs truncate">{v.meaning}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
