import { useState, useCallback } from 'react'
import { recognize, type OcrProgress } from '../services/ocr'

export function useOcr() {
  const [ocrText, setOcrText] = useState<string | null>(null)
  const [ocrProgress, setOcrProgress] = useState<OcrProgress>({ status: 'idle', progress: 0 })
  const [ocrError, setOcrError] = useState<string | null>(null)

  const runOcr = useCallback(async (file: File) => {
    setOcrText(null)
    setOcrError(null)
    setOcrProgress({ status: 'loading', progress: 0 })

    try {
      const text = await recognize(file, (p) => {
        setOcrProgress({ ...p })
      })
      setOcrText(text)
      setOcrProgress({ status: 'done', progress: 1 })
      return text
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'OCR 识别失败，请重试'
      setOcrError(msg)
      setOcrProgress({ status: 'error', progress: 0 })
      return null
    }
  }, [])

  const reset = useCallback(() => {
    setOcrText(null)
    setOcrProgress({ status: 'idle', progress: 0 })
    setOcrError(null)
  }, [])

  return {
    ocrText,
    ocrProgress,
    ocrError,
    runOcr,
    reset,
  }
}
