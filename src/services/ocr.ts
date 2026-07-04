export interface OcrProgress {
  status: 'idle' | 'loading' | 'recognizing' | 'done' | 'error'
  progress: number
}

/** OCR 识别：浏览器压缩 → Vercel Function → OCR.space API（国内无需 VPN） */
export async function recognize(
  file: File,
  onProgress?: (p: OcrProgress) => void,
): Promise<string> {
  onProgress?.({ status: 'loading', progress: 0 })

  try {
    // 预处理：缩放 + 压缩 + base64
    onProgress?.({ status: 'loading', progress: 0.1 })
    const base64 = await compressToBase64(file, 1500, 0.75)

    // 调用 Vercel Function
    onProgress?.({ status: 'recognizing', progress: 0.3 })
    const resp = await fetch('/api/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64 }),
    })

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: 'OCR 失败' }))
      throw new Error(err.error || 'OCR 服务异常')
    }

    const data = await resp.json() as { text: string }
    onProgress?.({ status: 'done', progress: 1 })

    if (!data.text || data.text.trim().length < 5) {
      return '[OCR 未能识别到有效文本，请重新拍摄或粘贴文本]'
    }

    return data.text.trim()
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'OCR 识别失败'
    throw new Error(msg)
  }
}

/** 压缩图片并返回 base64（去掉 data URI 前缀） */
function compressToBase64(file: File, maxWidth: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const ratio = Math.min(1, maxWidth / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * ratio)
      canvas.height = Math.round(img.height * ratio)

      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas 不可用')); return }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('压缩失败')); return }
          const reader = new FileReader()
          reader.onload = () => {
            const dataUrl = reader.result as string
            // 去掉 "data:image/jpeg;base64," 前缀
            resolve(dataUrl.split(',')[1])
          }
          reader.onerror = () => reject(new Error('读取失败'))
          reader.readAsDataURL(blob)
        },
        'image/jpeg',
        quality,
      )
    }
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = URL.createObjectURL(file)
  })
}

export async function terminateWorker(): Promise<void> {}
