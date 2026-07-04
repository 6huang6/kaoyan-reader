import { useState } from 'react'
import { ClipboardPaste, ArrowRight } from 'lucide-react'

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
    <div>
      {/* 分隔线 */}
      <div className="flex items-center gap-4 mb-5">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-sm text-gray-400 font-medium">或者直接粘贴文本</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* 粘贴区 */}
      <div className="relative">
        <textarea
          className="w-full h-44 p-5 border-2 border-gray-200 rounded-2xl bg-white resize-y
            focus:outline-none focus:border-warm-accent/40 focus:ring-4 focus:ring-warm-accent/5
            transition-all text-warm-text text-[15px] leading-relaxed placeholder:text-gray-300"
          placeholder="在此粘贴英语阅读文章的文本内容..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleSubmit()
            }
          }}
        />

        <button
          className="absolute bottom-4 right-4 px-5 py-2 bg-warm-accent text-white rounded-xl text-sm font-medium
            hover:bg-orange-600 transition-all duration-200 shadow-sm
            disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
          onClick={handleSubmit}
          disabled={disabled || !text.trim()}
        >
          <span>开始翻译</span>
          <ArrowRight size={14} />
        </button>
      </div>

      <p className="text-xs text-warm-muted/50 mt-2 text-right">
        <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Ctrl+Enter</kbd>
        <span className="ml-1">快捷提交</span>
      </p>
    </div>
  )
}
