import { useState } from 'react'

interface Props {
  onText: (text: string) => void
  disabled?: boolean
}

export default function TextPaster({ onText, disabled }: Props) {
  const [text, setText] = useState('')

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    onText(trimmed)
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-0.5 bg-warm-border flex-1" />
        <span className="text-sm text-warm-muted font-medium">或者直接粘贴英文文本</span>
        <div className="w-6 h-0.5 bg-warm-border flex-1" />
      </div>

      <textarea
        className="w-full h-40 p-4 border-2 border-warm-border rounded-xl bg-white/50 resize-y focus:outline-none focus:border-warm-accent focus:bg-white transition-colors text-warm-text placeholder-warm-muted"
        placeholder="在此粘贴英语阅读文章的文本内容...&#10;&#10;例如：&#10;The notion of artificial intelligence has captivated researchers for decades. However, recent breakthroughs in deep learning have propelled the field forward at an unprecedented pace."
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled}
      />

      <button
        className="mt-3 px-6 py-2.5 bg-warm-accent text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={handleSubmit}
        disabled={disabled || !text.trim()}
      >
        ✨ 开始翻译
      </button>
    </div>
  )
}
