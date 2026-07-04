import { useState } from 'react'
import type { SentencePair } from '../types'

interface Props {
  sentences: SentencePair[]
  paragraphZh: string
}

type TabMode = 'sentence' | 'paragraph'

export default function TranslationView({ sentences, paragraphZh }: Props) {
  const [mode, setMode] = useState<TabMode>('sentence')

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-warm-border">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-blue-600 font-semibold">🇨🇳 译文</div>

        {/* Tab 切换 */}
        <div className="flex bg-warm-bg rounded-lg p-0.5 text-sm">
          <button
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              mode === 'sentence'
                ? 'bg-white text-warm-text shadow-sm'
                : 'text-warm-muted hover:text-warm-text'
            }`}
            onClick={() => setMode('sentence')}
          >
            逐句对照
          </button>
          <button
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              mode === 'paragraph'
                ? 'bg-white text-warm-text shadow-sm'
                : 'text-warm-muted hover:text-warm-text'
            }`}
            onClick={() => setMode('paragraph')}
          >
            整段译文
          </button>
        </div>
      </div>

      {mode === 'sentence' ? (
        <div className="space-y-3">
          {sentences.map((s) => (
            <div key={s.index} className="flex gap-2">
              <span className="text-warm-muted text-xs mt-1 shrink-0">[{s.index + 1}]</span>
              <p className="text-[15px] text-gray-700 leading-8">{s.zh}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[15px] text-gray-700 leading-8">{paragraphZh}</p>
      )}
    </div>
  )
}
