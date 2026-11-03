import { ref, computed, type Ref } from 'vue'
import type { ScanConfig } from '@/utils/scan-renderer'
import { scanFileToPdf } from '@/utils/scan-renderer/scan-file'

export interface PdfQueueItem {
  id: string
  file: File
  /** Relative path inside the selected input folder, without file extension.
   *  Used to restore the multi-level directory structure on output. */
  relativePath: string
  /** Only the settings that differ from the global config (individual override). */
  overrideConfig: Partial<ScanConfig>
  status: 'pending' | 'processing' | 'done' | 'failed'
  progress: number
  output?: File
  error?: string
}

export function mergeConfig(
  global: ScanConfig,
  override: Partial<ScanConfig>
): ScanConfig {
  return { ...global, ...override }
}

/**
 * Derive the relative path of a file inside the chosen input folder.
 * browser-fs-access polyfills `webkitRelativePath` consistently across browsers,
 * e.g. "RootFolder/sub/a.pdf". We drop the first segment (the chosen root
 * folder name) so the output mirrors the inner structure only.
 */
export function getRelativePath(file: File): string {
  const wrp = (file as File).webkitRelativePath
  if (wrp) {
    const parts = wrp.split('/').filter(Boolean)
    parts.pop() // drop the file name itself
    const inner = parts.slice(1) // drop the chosen root folder name
    const base = file.name.replace(/\.[^/.]+$/, '')
    return inner.length ? `${inner.join('/')}/${base}` : base
  }
  return file.name.replace(/\.[^/.]+$/, '')
}

/** Build the output file path (preserves sub-directory structure). */
export function outputRelPath(relativePath: string): string {
  return `${relativePath}-scan.pdf`
}

/** Reject a promise as soon as the abort signal fires. */
function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (!signal) return promise
  return new Promise<T>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const onAbort = () => reject(new DOMException('Aborted', 'AbortError'))
    signal.addEventListener('abort', onAbort, { once: true })
    promise.then(
      (v) => {
        signal.removeEventListener('abort', onAbort)
        resolve(v)
      },
      (e) => {
        signal.removeEventListener('abort', onAbort)
        reject(e)
      }
    )
  })
}

export function useBatchScan(
  globalConfig: Ref<ScanConfig>,
  queue: Ref<PdfQueueItem[]>,
  concurrency = 3
) {
  const running = ref(false)
  const aborts = new Map<string, AbortController>()

  const totalFiles = computed(() => queue.value.length)
  const doneFiles = computed(() => queue.value.filter((i) => i.status === 'done').length)
  const failedFiles = computed(() => queue.value.filter((i) => i.status === 'failed').length)
  const processingFiles = computed(
    () => queue.value.filter((i) => i.status === 'processing').length
  )
  const overallProgress = computed(() => {
    if (!queue.value.length) return 0
    return queue.value.reduce((s, i) => s + i.progress, 0) / queue.value.length
  })

  async function processItem(item: PdfQueueItem) {
    const controller = new AbortController()
    aborts.set(item.id, controller)
    item.status = 'processing'
    item.progress = 0
    item.error = undefined
    try {
      const config = mergeConfig(globalConfig.value, item.overrideConfig)
      // CanvasScanner terminates its worker on abort but the in-flight promise
      // never settles, so we race it against the abort signal explicitly.
      const output = await abortable(
        scanFileToPdf(item.file, config, {
          signal: controller.signal,
          onProgress: (done, total) => {
            item.progress = done / total
          }
        }),
        controller.signal
      )
      item.output = output
      item.status = 'done'
      item.progress = 1
    } catch (e) {
      const err = e as Error
      if (err?.name === 'AbortError' || err?.message === 'Aborted') {
        item.status = 'pending'
        item.progress = 0
      } else {
        item.status = 'failed'
        item.error = err?.message ?? String(e)
      }
    } finally {
      aborts.delete(item.id)
    }
  }

  async function start() {
    if (running.value) return
    const pending = queue.value.filter((i) => i.status !== 'done')
    if (!pending.length) return
    running.value = true
    let cursor = 0
    const worker = async () => {
      while (cursor < pending.length) {
        const item = pending[cursor++]
        await processItem(item)
      }
    }
    const n = Math.min(concurrency, pending.length)
    await Promise.all(Array.from({ length: n }, worker))
    running.value = false
  }

  function cancel(item?: PdfQueueItem) {
    if (item) aborts.get(item.id)?.abort()
    else aborts.forEach((c) => c.abort())
  }

  function retry(item: PdfQueueItem) {
    return processItem(item)
  }

  /** Drop all individual overrides so every item uses the global config. */
  function applyGlobalToAll() {
    queue.value.forEach((i) => {
      i.overrideConfig = {}
    })
  }

  function resetItem(item: PdfQueueItem) {
    item.overrideConfig = {}
  }

  return {
    running,
    totalFiles,
    doneFiles,
    failedFiles,
    processingFiles,
    overallProgress,
    start,
    cancel,
    retry,
    applyGlobalToAll,
    resetItem,
    mergeConfig
  }
}
