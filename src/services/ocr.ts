export interface OcrProgress {
  status: 'idle' | 'loading' | 'recognizing' | 'done' | 'error'
  progress: number
}

/** OCR 识别：OCR.space 直连 → Google Lens（VPN 用户 fallback） */
export async function recognize(
  file: File,
  onProgress?: (p: OcrProgress) => void,
): Promise<string> {
  onProgress?.({ status: 'loading', progress: 0 })

  // 方式 1：OCR.space 直连（国内可用，无需代理）
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

    if (resp.ok) {
      const data = await resp.json() as {
        ParsedResults?: Array<{ ParsedText: string }>
        ErrorMessage?: string
      }
      if (!data.ErrorMessage) {
        const text = data.ParsedResults?.map(r => r.ParsedText).join('\n') || ''
        if (text.trim().length >= 5) {
          onProgress?.({ status: 'done', progress: 1 })
          return text.trim()
        }
      }
    }
  } catch { /* fallback */ }

  // 方式 2：Google Lens 直连（仅 VPN 用户可用）
  try {
    onProgress?.({ status: 'recognizing', progress: 0.3 })
    const { LensCore } = await import('@rxliuli/chrome-lens-ocr/core')
    const { data, width, height } = await readImageData(file)

    onProgress?.({ status: 'recognizing', progress: 0.5 })
    const mime = (['image/jpeg','image/png','image/webp','image/bmp'].includes(file.type)
      ? file.type : 'image/jpeg') as 'image/jpeg'
    const lens = new LensCore(undefined, fetch.bind(window))
    const result = await lens.scanByData(data, mime, [width, height])

    const segs = result.segments as Array<{ text: string; boundingBox: { pixelCoords: { x: number; y: number; height: number } } }>
    const text = joinWithParagraphs(segs)

    onProgress?.({ status: 'done', progress: 1 })
    if (text.trim().length < 5) {
      return '[OCR 未能识别到有效文本，请重新拍摄或粘贴文本]'
    }
    return text.replace(/\n{3,}/g, '\n\n').trim()
  } catch (err) {
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

function readImageData(file: File): Promise<{ data: Uint8Array; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = async () => {
      const w = img.naturalWidth; const h = img.naturalHeight
      resolve({ data: new Uint8Array(await file.arrayBuffer()), width: w, height: h })
    }
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = URL.createObjectURL(file)
  })
}

interface Segment {
  text: string
  boundingBox: { pixelCoords: { x: number; y: number; height: number } }
}

function joinWithParagraphs(segs: Segment[]): string {
  if (segs.length <= 1) return segs.map(s => s.text).join('\n')

  const xVals = segs.map(s => s.boundingBox.pixelCoords.x)
  const baseX = xVals.sort((a, b) => a - b)[Math.floor(xVals.length / 2)]
  const lines: string[] = [segs[0].text]

  for (let i = 1; i < segs.length; i++) {
    const isIndented = segs[i].boundingBox.pixelCoords.x > baseX + 15
    const prevIsShort = segs[i - 1].text.trim().length < 20
    if (isIndented || prevIsShort) lines.push('')
    lines.push(segs[i].text)
  }
  return lines.join('\n')
}

export async function terminateWorker(): Promise<void> {}
