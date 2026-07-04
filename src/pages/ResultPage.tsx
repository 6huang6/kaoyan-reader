import OriginalText from '../components/OriginalText'
import TranslationView from '../components/TranslationView'
import VocabPanel from '../components/VocabPanel'
import type { TranslationResult } from '../types'

interface Props {
  result: TranslationResult
  onBack: () => void
  onNew: () => void
}

export default function ResultPage({ result, onBack, onNew }: Props) {
  return (
    <div className="min-h-screen bg-warm-bg flex flex-col">
      {/* 顶部导航 */}
      <header className="bg-warm-text text-white py-4 px-6 shadow-md">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📖</span>
            <h1 className="text-xl font-bold tracking-wide">考研英语阅读助手</h1>
          </div>
          <div className="flex gap-2">
            <button
              className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors"
              onClick={onBack}
            >
              ← 返回
            </button>
            <button
              className="px-4 py-1.5 bg-warm-accent hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
              onClick={onNew}
            >
              + 新文章
            </button>
          </div>
        </div>
      </header>

      {/* 三段式内容 */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 space-y-4">
        <OriginalText sentences={result.sentences} />
        <TranslationView sentences={result.sentences} paragraphZh={result.paragraphZh} />
        <VocabPanel sentences={result.sentences} />
      </main>

      {/* 底部 */}
      <footer className="text-center py-6 text-xs text-warm-muted">
        考研英语阅读助手 · 图片仅在浏览器本地处理
      </footer>
    </div>
  )
}
