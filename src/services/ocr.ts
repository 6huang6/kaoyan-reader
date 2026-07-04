export interface OcrProgress {
  status: 'idle' | 'loading' | 'recognizing' | 'done' | 'error'
  progress: number
}

/** OCR 识别：OCR.space 直连 */
export async function recognize(
  file: File,
  onProgress?: (p: OcrProgress) => void,
): Promise<string> {
  onProgress?.({ status: 'loading', progress: 0 })

  try {
    const base64 = await compressToBase64(file, 1500, 0.75)
    onProgress?.({ status: 'recognizing', progress: 0.3 })

    const formData = new URLSearchParams()
    formData.append('apikey', 'helloworld')
    formData.append('base64Image', `data:image/jpeg;base64,${base64}`)
    formData.append('language', 'eng')
    formData.append('OCREngine', '2')
    formData.append('isOverlayRequired', 'false')
    formData.append('scale', 'true')

    const resp = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    })

    if (!resp.ok) throw new Error(`OCR API error ${resp.status}`)

    const data = await resp.json() as {
      ParsedResults?: Array<{ ParsedText: string }>
      ErrorMessage?: string
    }

    if (data.ErrorMessage) throw new Error(data.ErrorMessage)

    const text = data.ParsedResults?.map(r => r.ParsedText).join('\n') || ''
    if (text.trim().length >= 5) {
      onProgress?.({ status: 'done', progress: 1 })
      return text.trim()
    }

    onProgress?.({ status: 'error', progress: 0 })
    return '[OCR 未能识别到有效文本，请重新拍摄或粘贴文本]'
  } catch (err) {
    onProgress?.({ status: 'error', progress: 0 })
    const msg = err instanceof Error ? err.message : 'OCR 识别失败'
    throw new Error(msg)
  }
}

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
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error('压缩失败')); return }
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = () => reject(new Error('读取失败'))
        reader.readAsDataURL(blob)
      }, 'image/jpeg', quality)
    }
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = URL.createObjectURL(file)
  })
}

export async function terminateWorker(): Promise<void> {}
