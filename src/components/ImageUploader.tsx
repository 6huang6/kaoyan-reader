import { useRef, useState, useCallback } from 'react'

interface Props {
  onImage: (file: File) => void
  disabled?: boolean
}

export default function ImageUploader({ onImage, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        alert('请上传图片文件')
        return
      }
      onImage(file)
    },
    [onImage],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
      // 重置 input 以便同一文件可重复选择
      e.target.value = ''
    },
    [handleFile],
  )

  return (
    <div className="w-full">
      <div
        className={`border-3 border-dashed rounded-2xl flex flex-col items-center justify-center p-12 cursor-pointer transition-all
          ${dragOver ? 'border-warm-accent bg-warm-accent/5 scale-[1.02]' : 'border-warm-border bg-white/50 hover:border-warm-accent/50 hover:bg-white/80'}
          ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="text-5xl mb-4">📷</div>
        <div className="font-semibold text-warm-text text-lg mb-1">
          {dragOver ? '松开即可上传' : '点击上传或拖拽图片到此处'}
        </div>
        <div className="text-warm-muted text-sm">支持 JPG / PNG / WebP</div>
      </div>

      <div className="flex justify-center gap-4 mt-4">
        <button
          className="px-6 py-2.5 bg-warm-accent text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors shadow-sm"
          onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
          disabled={disabled}
        >
          📁 选择文件
        </button>
        <button
          className="px-6 py-2.5 bg-warm-text text-white rounded-lg font-semibold hover:bg-opacity-80 transition-colors shadow-sm"
          onClick={(e) => {
            e.stopPropagation()
            // capture 属性触发手机相机
            inputRef.current?.setAttribute('capture', 'environment')
            inputRef.current?.click()
            inputRef.current?.removeAttribute('capture')
          }}
          disabled={disabled}
        >
          📷 拍照上传
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  )
}
