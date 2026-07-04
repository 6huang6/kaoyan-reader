import { useState } from 'react'
import { Camera, FileText, Search, ChevronRight, ArrowLeft } from 'lucide-react'
import ImageUploader from '../components/ImageUploader'
import TextPaster from '../components/TextPaster'
import ProgressBar from '../components/ProgressBar'
import { useOcr } from '../hooks/useOcr'
import { translateAndAnnotate } from '../services/translate'
import type { TranslationResult } from '../types'

interface Props {
  onResult: (result: TranslationResult, rawText: string) => void
}

type Step = 'upload' | 'ocr' | 'review' | 'translate' | 'done'

export default function UploadPage({ onResult }: Props) {
  const { ocrText, ocrProgress, ocrError, runOcr, reset } = useOcr()
  const [step, setStep] = useState<Step>('upload')
  const [editedText, setEditedText] = useState('')
  const [translateProgress, setTranslateProgress] = useState({ done: 0, total: 0 })
  const [error, setError] = useState<string | null>(null)

  const handleImage = async (file: File) => {
    setError(null)
    setStep('ocr')
    const text = await runOcr(file)
    if (text) {
      setEditedText(text)
      setStep('review')
    }
  }

  const handleText = async (text: string) => {
    setError(null)
    setEditedText(text)
    setStep('review')
  }

  const handleReviewConfirm = async () => {
    if (!editedText.trim()) return
    setError(null)
    setStep('translate')
    setTranslateProgress({ done: 0, total: 0 })

    try {
      const result = await translateAndAnnotate(editedText, (done, total) => {
        setTranslateProgress({ done, total })
      })
      onResult(result, editedText)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '翻译失败，请重试'
      setError(msg)
      setStep('review')
    }
  }

  const handleBack = () => {
    reset()
    setStep('upload')
    setError(null)
    setEditedText('')
  }

  const steps = [
    { num: 1, label: '上传', icon: Camera },
    { num: 2, label: '校对', icon: Search },
    { num: 3, label: '学习', icon: FileText },
  ]

  return (
    <div className="min-h-screen bg-warm-bg flex flex-col">
      {/* 顶部 */}
      <header className="border-b border-warm-border/50 bg-white/60 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-warm-text rounded-lg flex items-center justify-center">
              <span className="text-white font-serif font-bold text-sm">研</span>
            </div>
            <h1 className="text-lg font-semibold text-warm-text tracking-tight">
              考研英语阅读助手
            </h1>
          </div>
          <span className="text-xs text-warm-muted">v1.0</span>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-10">
        {/* 步骤指示器 */}
        <div className="flex items-center justify-center mb-12">
          {steps.map((s, i) => {
            const isActive =
              (s.num === 1 && (step === 'upload' || step === 'ocr')) ||
              (s.num === 2 && (step === 'review' || step === 'translate')) ||
              (s.num === 3 && step === 'done')
            const isPast = step === 'done' && s.num < 3
            const Icon = s.icon

            return (
              <div key={s.num} className="flex items-center">
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300
                      ${isActive ? 'bg-warm-text text-white shadow-lg shadow-warm-text/20' :
                        isPast ? 'bg-warm-accent/10 text-warm-accent' :
                        'bg-gray-100 text-gray-400'}`}
                  >
                    <Icon size={18} strokeWidth={2} />
                  </div>
                  <span
                    className={`text-xs font-medium transition-colors
                      ${isActive ? 'text-warm-text' : isPast ? 'text-warm-accent' : 'text-gray-400'}`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-12 sm:w-20 h-px mx-3 mt-[-1rem] transition-colors
                    ${isActive || isPast ? 'bg-warm-accent/40' : 'bg-gray-200'}`} />
                )}
              </div>
            )
          })}
        </div>

        {/* 错误提示 */}
        {(error || ocrError) && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-3">
            <span className="shrink-0 mt-0.5 text-red-400">!</span>
            <div className="flex-1">{error || ocrError}</div>
            <button className="font-semibold hover:underline shrink-0" onClick={handleBack}>返回</button>
          </div>
        )}

        {/* OCR 进度 */}
        {step === 'ocr' && (
          <div className="mb-8 bg-white rounded-2xl p-6 shadow-sm border border-warm-border/50">
            <ProgressBar progress={ocrProgress} />
          </div>
        )}

        {/* 翻译进度 */}
        {step === 'translate' && (
          <div className="mb-8 bg-white rounded-2xl p-6 shadow-sm border border-warm-border/50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-warm-text">正在翻译...</span>
              <span className="text-sm text-warm-muted tabular-nums">
                {translateProgress.done}/{translateProgress.total} 句
              </span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-warm-accent rounded-full transition-all duration-500 ease-out"
                style={{
                  width: translateProgress.total > 0
                    ? `${(translateProgress.done / translateProgress.total) * 100}%`
                    : '0%',
                }}
              />
            </div>
          </div>
        )}

        {/* 上传区域 */}
        {step === 'upload' && (
          <div className="space-y-10">
            <ImageUploader onImage={handleImage} />
            <TextPaster onText={handleText} />
          </div>
        )}

        {/* 文本校对区 */}
        {step === 'review' && (
          <div className="space-y-5">
            <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4 text-sm text-blue-800 flex items-start gap-3">
              <Search size={16} className="shrink-0 mt-0.5 text-blue-400" />
              <span>
                OCR 识别可能存在误差，请在下方校对修改后再翻译。
                标点符号和段落分行不影响翻译结果。
              </span>
            </div>

            <textarea
              className="w-full h-80 p-5 border-2 border-warm-border/50 rounded-2xl bg-white resize-y
                focus:outline-none focus:border-warm-accent/50 focus:ring-4 focus:ring-warm-accent/5
                transition-all text-warm-text text-[15px] leading-relaxed placeholder:text-gray-300"
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              placeholder="在此校对修改英文文本..."
            />

            <div className="flex gap-3 justify-center">
              <button
                className="px-6 py-3 border-2 border-warm-border/50 text-warm-text rounded-xl font-medium
                  hover:bg-white hover:border-warm-border transition-all duration-200 inline-flex items-center gap-2"
                onClick={handleBack}
              >
                <ArrowLeft size={16} />
                返回
              </button>
              <button
                className="px-8 py-3 bg-warm-text text-white rounded-xl font-medium
                  hover:bg-warm-text/90 transition-all duration-200 shadow-lg shadow-warm-text/10
                  disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
                onClick={handleReviewConfirm}
                disabled={!editedText.trim()}
              >
                确认并翻译
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* 底部提示 */}
        <p className="text-center text-xs text-warm-muted/60 mt-12">
          图片仅在浏览器本地处理，不会上传到任何服务器
        </p>
      </main>
    </div>
  )
}
