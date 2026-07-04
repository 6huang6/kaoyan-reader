import { useRef, useState, useCallback } from 'react'
import { Upload, Camera, Image } from 'lucide-react'

interface Props {
  onImage: (file: File) => void
  disabled?: boolean
}

export default function ImageUploader({ onImage, disabled }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
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
      e.target.value = ''
    },
    [handleFile],
  )

  return (
    <div>
      {/* 拖拽区 */}
      <div
        className={`relative border-2 border-dashed rounded-2xl flex flex-col items-center justify-center py-16 px-6 cursor-pointer transition-all duration-200
          ${dragOver
            ? 'border-warm-accent bg-warm-accent/5 scale-[1.01]'
            : 'border-gray-300 hover:border-warm-accent/40 hover:bg-white/60'
          }
          ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors
          ${dragOver ? 'bg-warm-accent/10 text-warm-accent' : 'bg-gray-100 text-gray-400'}`}>
          <Upload size={24} strokeWidth={1.5} />
        </div>
        <p className="text-[15px] font-medium text-warm-text mb-1">
          {dragOver ? '松开以上传图片' : '拖拽图片到此处，或点击上传'}
        </p>
        <p className="text-sm text-warm-muted">支持 JPG、PNG、WebP 格式</p>
      </div>

      {/* 按钮组 */}
      <div className="flex justify-center gap-3 mt-5">
        <button
          className="px-5 py-2.5 bg-white border border-gray-200 text-warm-text rounded-xl text-sm font-medium
            hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 inline-flex items-center gap-2"
          onClick={(e) => { e.stopPropagation(); fileRef.current?.click() }}
          disabled={disabled}
        >
          <Image size={16} strokeWidth={1.5} />
          选择文件
        </button>
        <button
          className="px-5 py-2.5 bg-warm-text text-white rounded-xl text-sm font-medium
            hover:bg-warm-text/90 transition-all duration-200 inline-flex items-center gap-2 shadow-sm"
          onClick={(e) => { e.stopPropagation(); cameraRef.current?.click() }}
          disabled={disabled}
        >
          <Camera size={16} strokeWidth={1.5} />
          拍照上传
        </button>
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleChange} />
    </div>
  )
}
