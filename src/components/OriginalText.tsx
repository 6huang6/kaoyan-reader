import { useState, useCallback } from 'react'
import type { SentencePair } from '../types'
import { lookupDictionary, type DictResult } from '../services/translate'
import { lookupWord } from '../services/vocab'

interface Props {
  sentences: SentencePair[]
}

interface PopupState {
  word: string
  meaning: string
  x: number
  y: number
}

export default function OriginalText({ sentences }: Props) {
  const [popup, setPopup] = useState<PopupState | null>(null)
  const [loadingWord, setLoadingWord] = useState<string | null>(null)

  const handleWordClick = useCallback(async (e: React.MouseEvent, word: string) => {
    e.stopPropagation()
    const rect = (e.target as HTMLElement).getBoundingClientRect()

    // 先查本地词表
    const localMeaning = await lookupWord(word)
    if (localMeaning) {
      setPopup({
        word,
        meaning: localMeaning,
        x: rect.left + rect.width / 2,
        y: rect.bottom + 4,
      })
      return
    }

    // 非大纲词，调 API
    setLoadingWord(word)
    const dictResult = await lookupDictionary(word)
    setLoadingWord(null)

    if (dictResult) {
      const dictMeaning = dictResult.inContext?.meaning || dictResult.entries[0]?.meaning || '未找到'
      setPopup({
        word,
        meaning: dictMeaning,
        x: rect.left + rect.width / 2,
        y: rect.bottom + 4,
      })
    } else {
      setPopup({
        word,
        meaning: '未找到释义',
        x: rect.left + rect.width / 2,
        y: rect.bottom + 4,
      })
    }
  }, [])

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-warm-border">
      <div className="text-sm text-warm-accent font-semibold mb-4">📖 原文</div>

      <div className="space-y-3">
        {sentences.map((s) => (
          <p key={s.index} className="leading-8 text-[15px] text-warm-text">
            <span className="text-warm-muted text-xs mr-1">[{s.index + 1}]</span>
            {renderWords(s, handleWordClick, loadingWord)}
          </p>
        ))}
      </div>

      {/* 弹窗 */}
      {popup && (
        <WordPopup popup={popup} onClose={() => setPopup(null)} />
      )}

      {/* 点击遮罩关闭弹窗 */}
      {popup && (
        <div className="fixed inset-0 z-40" onClick={() => setPopup(null)} />
      )}
    </div>
  )
}

/** 渲染带标注的单词 */
function renderWords(
  sentence: SentencePair,
  onWordClick: (e: React.MouseEvent, word: string) => void,
  loadingWord: string | null,
): React.ReactNode[] {
  // 用正则拆分句子，保留标点和空格
  const parts = sentence.en.split(/(\b[a-zA-Z]+(?:['-][a-zA-Z]+)*\b)/g)

  return parts.map((part, i) => {
    const word = sentence.words.find(
      (w) => w.text.toLowerCase() === part.toLowerCase(),
    )
    if (!word) return <span key={i}>{part}</span>

    const isLoading = loadingWord === word.text

    return (
      <span
        key={i}
        className={`relative cursor-pointer transition-colors rounded px-0.5
          ${word.isVocab
            ? 'border-b-2 border-vocab-underline text-red-700 hover:bg-red-50'
            : 'hover:bg-gray-100 border-b border-dashed border-gray-300'
          }
          ${isLoading ? 'animate-pulse bg-gray-100' : ''}`}
        onClick={(e) => onWordClick(e, word.text)}
        title={word.isVocab ? word.meaning : '点击查词'}
      >
        {part}
      </span>
    )
  })
}

/** 单词释义弹窗 */
function WordPopup({ popup, onClose }: { popup: PopupState; onClose: () => void }) {
  return (
    <div
      className="fixed z-50 bg-white border border-warm-border rounded-xl shadow-lg p-4 max-w-xs animate-in fade-in zoom-in"
      style={{
        left: Math.min(popup.x, window.innerWidth - 280),
        top: Math.min(popup.y, window.innerHeight - 120),
        transform: 'translateX(-50%)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-bold text-warm-text text-lg">{popup.word}</div>
          <div className="text-sm text-warm-muted mt-1 leading-relaxed">
            {popup.meaning}
          </div>
        </div>
        <button
          className="text-warm-muted hover:text-warm-text text-lg leading-none"
          onClick={onClose}
        >
          ×
        </button>
      </div>
    </div>
  )
}
