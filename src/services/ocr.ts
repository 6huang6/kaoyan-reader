import { LensCore } from '@rxliuli/chrome-lens-ocr/core'

export interface OcrProgress {
  status: 'idle' | 'loading' | 'recognizing' | 'done' | 'error'
  progress: number
}

// 将 File 转为 Uint8Array + 获取图片尺寸
function readFileData(file: File): Promise<{ data: Uint8Array; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = async () => {
      const w = img.naturalWidth
      const h = img.naturalHeight
      URL.revokeObjectURL(url)

      const buffer = await file.arrayBuffer()
      resolve({ data: new Uint8Array(buffer), width: w, height: h })
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片加载失败'))
    }
    img.src = url
  })
}

/** 根据 segment 坐标插入段落分隔符（段首缩进检测） */
function joinWithParagraphs(result: { segments: Array<{ text: string; boundingBox: { pixelCoords: { x: number; y: number; height: number } } }> }): string {
  const segs = result.segments
  if (segs.length <= 1) return segs.map(s => s.text).join('\n')

  // 计算最常见左边界（正文行基准 x）
  const xValues = segs.map(s => s.boundingBox.pixelCoords.x)
  const avgX = xValues.reduce((a, b) => a + b, 0) / xValues.length

  // 统计：最接近 avgX 的区间是正文基准
  const baseX = xValues.sort((a, b) => a - b)[Math.floor(xValues.length / 2)]

  const lines: string[] = [segs[0].text]

  for (let i = 1; i < segs.length; i++) {
    const currX = segs[i].boundingBox.pixelCoords.x
    const prevIsShort = segs[i - 1].text.trim().length < 20

    // 段首条件：x 明显大于基准（缩进 ≥ 15px）或前一行很短（上一段结束）
    const isIndented = currX > baseX + 15
    const isNewPara = isIndented || prevIsShort

    if (isNewPara) {
      lines.push('', segs[i].text)
    } else {
      lines.push(segs[i].text)
    }
  }

  return lines.join('\n')
}

export async function recognize(
  file: File,
  onProgress?: (p: OcrProgress) => void,
): Promise<string> {
  onProgress?.({ status: 'loading', progress: 0 })

  try {
    onProgress?.({ status: 'loading', progress: 0.3 })
    const { data, width, height } = await readFileData(file)

    onProgress?.({ status: 'recognizing', progress: 0.5 })

    const lens = new LensCore(undefined, fetch.bind(window))
    const mime = (file.type && ['image/jpeg','image/png','image/webp','image/bmp'].includes(file.type))
      ? file.type as 'image/jpeg'
      : 'image/jpeg'

    const result = await lens.scanByData(data, mime, [width, height])

    onProgress?.({ status: 'done', progress: 1 })

    // 用坐标检测段落间距：相邻 segment 垂直间距 > 平均行高 1.5 倍 → 段落边界
    const text = joinWithParagraphs(result)
    if (!text.trim() || text.trim().length < 5) {
      return '[OCR 未能识别到有效文本，请尝试重新拍摄]'
    }

    return text
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'OCR 识别失败'

    // 区分网络错误
    if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed to fetch')) {
      throw new Error('Google Lens 连接失败，请确认代理已开启（端口 7897）或检查网络')
    }

    throw new Error(`OCR 失败: ${msg}`)
  }
}

export async function terminateWorker(): Promise<void> {
  // Google Lens OCR 无需清理
}
