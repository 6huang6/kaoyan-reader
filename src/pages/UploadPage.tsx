import { useState } from 'react'
import ImageUploader from '../components/ImageUploader'
import TextPaster from '../components/TextPaster'
import ProgressBar from '../components/ProgressBar'
import { useOcr } from '../hooks/useOcr'
import { translateAndAnnotate } from '../services/translate'
import type { TranslationResult } from '../types'

interface Props {
  onResult: (result: TranslationResult, rawText: string) => void
}

type Step = 'upload' | 'ocr' | 'translate'

export default function UploadPage({ onResult }: Props) {
  const { ocrText, ocrProgress, ocrError, runOcr, reset } = useOcr()
  const [step, setStep] = useState<Step>('upload')
  const [translateProgress, setTranslateProgress] = useState({ done: 0, total: 0 })
  const [error, setError] = useState<string | null>(null)

  // 图片上传 → OCR
  const handleImage = async (file: File) => {
    setError(null)
    setStep('ocr')
    const text = await runOcr(file)
    if (text) {
      await doTranslate(text)
    }
  }

  // 文本粘贴 → 直接翻译
  const handleText = async (text: string) => {
    setError(null)
    setStep('translate')
    await doTranslate(text)
  }

  // 执行翻译
  const doTranslate = async (rawText: string) => {
    setStep('translate')
    setTranslateProgress({ done: 0, total: 0 })

    try {
      const result = await translateAndAnnotate(rawText, (done, total) => {
        setTranslateProgress({ done, total })
      })
      onResult(result, rawText)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '翻译失败，请重试'
      setError(msg)
      setStep('upload')
    }
  }

  const handleBack = () => {
    reset()
    setStep('upload')
    setError(null)
  }

  return (
    <div className="min-h-screen bg-warm-bg flex flex-col">
      {/* 顶部导航 */}
      <header className="bg-warm-text text-white py-4 px-6 shadow-md">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <span className="text-2xl">📖</span>
          <h1 className="text-xl font-bold tracking-wide">考研英语阅读助手</h1>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        {/* 步骤引导 */}
        <div className="flex justify-center gap-4 sm:gap-8 mb-10 text-center">
          {[
            { num: 1, label: '拍照/粘贴', icon: '📷' },
            { num: 2, label: '智能识别', icon: '🔍' },
            { num: 3, label: '对照学习', icon: '📝' },
          ].map((s) => (
            <div key={s.num} className="flex flex-col items-center gap-1">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl
                ${s.num === 1 && step === 'upload' ? 'bg-warm-accent text-white' : ''}
                ${s.num === 2 && (step === 'ocr' || step === 'translate') ? 'bg-warm-accent text-white' : ''}
                ${s.num === 3 && ocrText ? 'bg-warm-accent text-white' : ''}
                ${(s.num > (ocrText ? 3 : step === 'translate' ? 2 : step === 'ocr' ? 2 : 1)) ? 'bg-gray-200 text-gray-400' : 'bg-warm-bg text-warm-text'}
              `}>
                {s.icon}
              </div>
              <div className="text-xs text-warm-muted font-medium">{s.label}</div>
            </div>
          ))}
        </div>

        {/* 错误提示 */}
        {(error || ocrError) && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-3">
            <span>⚠️</span>
            <div className="flex-1">{error || ocrError}</div>
            <button className="font-semibold hover:underline" onClick={handleBack}>返回</button>
          </div>
        )}

        {/* OCR 进度 */}
        {step === 'ocr' && ocrProgress.status !== 'error' && (
          <div className="mb-6 bg-white rounded-xl p-6 shadow-sm border border-warm-border">
            <ProgressBar progress={ocrProgress} />
          </div>
        )}

        {/* 翻译进度 */}
        {step === 'translate' && (
          <div className="mb-6 bg-white rounded-xl p-6 shadow-sm border border-warm-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-warm-text">正在翻译...</span>
              <span className="text-sm text-warm-muted">
                {translateProgress.done}/{translateProgress.total} 句
              </span>
            </div>
            <div className="w-full h-2 bg-warm-border rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
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
          <div className="space-y-8">
            <ImageUploader onImage={handleImage} />
            <TextPaster onText={handleText} />
          </div>
        )}

        {/* 提示 */}
        <p className="text-center text-xs text-warm-muted mt-8">
          💡 图片仅在浏览器本地处理，不会上传到任何服务器
        </p>
      </main>
    </div>
  )
}
