import { PDF } from '@/utils/pdf-renderer/pdfjs'
import { CanvasScanner, type ScanConfig } from '@/utils/scan-renderer/canvas-scan'
import { buildPDF } from '@/utils/pdf-builder/pdf-lib'

export interface ScanFileOptions {
  onProgress?: (done: number, total: number) => void
  signal?: AbortSignal
}

/**
 * Process a single PDF file into a "scanned" PDF using the exact same
 * pipeline as the single-file view (pdfjs render -> CanvasScanner -> buildPDF).
 * This is the shared engine reused by the batch runner.
 */
export async function scanFileToPdf(
  file: File,
  config: ScanConfig,
  options: ScanFileOptions = {}
): Promise<File> {
  const pdfRenderer = new PDF(file)
  const scanRenderer = new CanvasScanner(config)

  const numPages = await pdfRenderer.getNumPages()
  const pages = Array.from({ length: numPages }, (_, i) => i + 1)

  const scanPages = await Promise.all(
    pages.map(async (page) => {
      const { blob: pdfPage, height, width } = await pdfRenderer.renderPage(page, config.scale)
      const { blob: scanPage } = await scanRenderer.renderPage(pdfPage, {
        signal: options.signal
      })
      options.onProgress?.(page, numPages)
      return {
        blob: scanPage,
        width,
        height,
        ppi: config.scale * 72
      }
    })
  )

  const pdfDocument = await buildPDF(scanPages)
  const name = `${file.name.replace(/\.[^/.]+$/, '')}-scan.pdf`
  return new File([pdfDocument], name, { type: 'application/pdf' })
}
