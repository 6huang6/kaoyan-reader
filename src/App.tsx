import { useState, useCallback } from 'react'
import UploadPage from './pages/UploadPage'
import ResultPage from './pages/ResultPage'
import type { TranslationResult } from './types'

export default function App() {
  const [result, setResult] = useState<TranslationResult | null>(null)
  const [rawText, setRawText] = useState<string | null>(null)

  const handleResult = useCallback((r: TranslationResult, text: string) => {
    setResult(r)
    setRawText(text)
  }, [])

  const handleBack = useCallback(() => {
    // 回到上传页但保留上次的结果？（如果需要完全重新开始则清空）
  }, [])

  const handleNew = useCallback(() => {
    setResult(null)
    setRawText(null)
  }, [])

  if (result) {
    return <ResultPage result={result} onBack={handleBack} onNew={handleNew} />
  }

  return <UploadPage onResult={handleResult} />
}
