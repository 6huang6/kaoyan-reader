import { createWorker, type Worker } from 'tesseract.js'

let worker: Worker | null = null
let currentProgress: ((p: OcrProgress) => void) | null = null

export interface OcrProgress {
  status: 'idle' | 'loading' | 'recognizing' | 'done' | 'error'
  progress: number // 0-1
}

/** 初始化并获取 Worker（单例） */
async function getWorker(): Promise<Worker> {
  if (worker) return worker

  worker = await createWorker('eng', 1, {
    logger: (m) => {
      // 将 worker 的日志转发给当前识别任务的进度回调
      if (m.status === 'recognizing text' && m.progress && currentProgress) {
        currentProgress({ status: 'recognizing', progress: 0.1 + m.progress * 0.85 })
      }
    },
    langPath: '/',
    cachePath: '/tessdata',
  })

  return worker
}

/** OCR 识别图片 */
export async function recognize(
  file: File,
  onProgress?: (p: OcrProgress) => void,
): Promise<string> {
  onProgress?.({ status: 'loading', progress: 0 })

  // 限制图片大小，手机拍照通常 >4000px，缩到 2000px 以内
  const imageUrl = await resizeImage(file, 2000)

  onProgress?.({ status: 'recognizing', progress: 0.1 })

  // 设置当前进度回调
  currentProgress = onProgress || null

  try {
    const w = await getWorker()
    const { data } = await w.recognize(imageUrl)

    onProgress?.({ status: 'done', progress: 1 })

    return data.text
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  } finally {
    currentProgress = null
    URL.revokeObjectURL(imageUrl)
  }
}

/** 缩放图片到指定最大宽度，返回 Object URL */
function resizeImage(file: File, maxWidth: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      if (img.width <= maxWidth) {
        resolve(url)
        return
      }

      const ratio = maxWidth / img.width
      const canvas = document.createElement('canvas')
      canvas.width = maxWidth
      canvas.height = Math.round(img.height * ratio)

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(url)
        return
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(URL.createObjectURL(blob))
        } else {
          resolve(url)
        }
      }, 'image/jpeg', 0.85)
    }

    img.onerror = () => reject(new Error('图片加载失败，请确认文件是有效的图片格式'))
    img.src = url
  })
}

/** 销毁 Worker */
export async function terminateWorker(): Promise<void> {
  if (worker) {
    await worker.terminate()
    worker = null
  }
}
