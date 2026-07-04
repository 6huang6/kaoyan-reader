import type { OcrProgress } from '../services/ocr'

interface Props {
  progress: OcrProgress
}

const STAGE_LABELS: Record<string, string> = {
  loading: '正在加载 OCR 引擎...',
  recognizing: '正在识别文字...',
  done: '识别完成！',
}

export default function ProgressBar({ progress }: Props) {
  const pct = Math.round(progress.progress * 100)
  const label = STAGE_LABELS[progress.status] || '处理中...'

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-warm-text">{label}</span>
        <span className="text-sm text-warm-muted">{pct}%</span>
      </div>
      <div className="w-full h-2 bg-warm-border rounded-full overflow-hidden">
        <div
          className="h-full bg-warm-accent rounded-full transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
