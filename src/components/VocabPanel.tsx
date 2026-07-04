import { useState, useMemo } from 'react'
import type { SentencePair } from '../types'

interface Props {
  sentences: SentencePair[]
}

export default function VocabPanel({ sentences }: Props) {
  const [collapsed, setCollapsed] = useState(false)

  // 从所有句子中提取考研词汇（去重）
  const vocabWords = useMemo(() => {
    const seen = new Set<string>()
    const result: Array<{ word: string; meaning: string }> = []

    for (const s of sentences) {
      for (const w of s.words) {
        if (w.isVocab && w.meaning && !seen.has(w.lemma)) {
          seen.add(w.lemma)
          result.push({ word: w.text, meaning: w.meaning })
        }
      }
    }

    return result
  }, [sentences])

  if (vocabWords.length === 0) return null

  return (
    <div className="bg-vocab-bg rounded-xl p-6 border border-warm-border">
      <button
        className="flex items-center justify-between w-full text-left"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="text-sm text-warm-accent font-semibold">
          📝 考研词汇标注 ({vocabWords.length} 个)
        </div>
        <span className="text-warm-muted text-sm transition-transform duration-200"
          style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
        >
          ▼
        </span>
      </button>

      {!collapsed && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-2">
          {vocabWords.map((v) => (
            <div key={v.word} className="flex items-baseline gap-2 text-sm py-1">
              <span className="font-semibold text-warm-text whitespace-nowrap">
                {v.word}
              </span>
              <span className="text-warm-muted text-xs truncate">
                {v.meaning}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
