<template>
  <n-card size="small" :title="item.relativePath">
    <template #header-extra>
      <n-tag :type="statusType" size="small">{{ statusLabel }}</n-tag>
    </template>

    <n-space vertical :size="6">
      <n-progress
        type="line"
        :percentage="Math.round(item.progress * 100)"
        :status="progressStatus"
        :show-indicator="item.status !== 'pending'"
        indicator-placement="inside"
      />

      <n-text v-if="item.status === 'failed'" type="error" depth="3">
        {{ item.error }}
      </n-text>

      <n-space justify="space-between" align="center">
        <n-button
          text
          size="small"
          @click="expanded = !expanded"
          :type="overrideCount > 0 ? 'warning' : 'default'"
        >
          <template #icon>
            <n-icon><Settings16Regular /></n-icon>
          </template>
          {{
            overrideCount > 0
              ? t('settings.batch.individualAdjustWithCount', { n: overrideCount })
              : t('settings.batch.individualAdjust')
          }}
        </n-button>

        <n-space size="small">
          <n-button
            v-if="item.status === 'failed'"
            text
            size="small"
            type="error"
            @click="emit('retry', item)"
          >
            <template #icon><n-icon><ArrowClockwise16Regular /></n-icon></template>
            {{ t('settings.batch.retry') }}
          </n-button>
          <n-button
            v-if="item.status === 'done' && item.output"
            text
            size="small"
            type="primary"
            @click="downloadSingle"
          >
            <template #icon><n-icon><DocumentDownload /></n-icon></template>
            {{ t('settings.batch.download') }}
          </n-button>
          <n-button
            v-if="overrideCount > 0"
            text
            size="small"
            type="warning"
            @click="emit('resetItem', item)"
          >
            {{ t('settings.batch.resetIndividual') }}
          </n-button>
        </n-space>
      </n-space>

      <div v-if="expanded" class="individual-panel">
        <div class="individual-toolbar">
          <n-button text size="small" @click="openFullscreen">
            <template #icon><n-icon><Maximize /></n-icon></template>
            {{ t('settings.batch.fullscreen') }}
          </n-button>
        </div>
        <ScanSettingsCard v-model:config="itemConfig" compact />
        <div class="panel-label">{{ t('settings.batch.preview') }}</div>
        <PreviewCompare
          :pdf-renderer="pdfRenderer"
          :scan-renderer="scanRenderer"
          :scale="itemConfig.scale"
        />
      </div>

      <div v-if="fullscreen" class="fs-root" ref="fsRoot">
        <div class="fs-bar">
          <span class="fs-title">{{ item.relativePath }}</span>
          <n-button text size="small" @click="closeFullscreen">
            <template #icon><n-icon><Close /></n-icon></template>
            {{ t('settings.batch.exitFullscreen') }}
          </n-button>
        </div>
        <div class="fs-body">
          <div class="fs-left">
            <ScanSettingsCard v-model:config="itemConfig" />
          </div>
          <div class="fs-right">
            <PreviewCompare
              :pdf-renderer="pdfRenderer"
              :scan-renderer="scanRenderer"
              :scale="itemConfig.scale"
            />
          </div>
        </div>
      </div>
    </n-space>
  </n-card>
</template>

<script lang="ts" setup>
import { NCard, NSpace, NTag, NProgress, NText, NButton, NIcon } from 'naive-ui'
import { Settings16Regular, ArrowClockwise16Regular } from '@vicons/fluent'
import { DocumentDownload, Maximize, Close } from '@vicons/carbon'
import { computed, ref, nextTick, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { fileSave } from 'browser-fs-access'

import ScanSettingsCard from '@/components/scan-settings/ScanSettingsCard.vue'
import PreviewCompare from '@/components/page-preview/PreviewCompare.vue'
import { PDF } from '@/utils/pdf-renderer/pdfjs'
import { CanvasScanner } from '@/utils/scan-renderer/canvas-scan'
import { ScanCacher } from '@/utils/scan-renderer/scan-cacher'
import type { ScanConfig } from '@/utils/scan-renderer'
import type { PdfQueueItem } from '@/composables/use-batch-scan'

const { t } = useI18n()

const props = defineProps<{
  item: PdfQueueItem
  globalConfig: ScanConfig
}>()

const emit = defineEmits<{
  (e: 'retry', item: PdfQueueItem): void
  (e: 'resetItem', item: PdfQueueItem): void
  (e: 'update:override', item: PdfQueueItem, override: Partial<ScanConfig>): void
}>()

const expanded = ref(false)
const fullscreen = ref(false)
const fsRoot = ref<HTMLElement | null>(null)

/** Open a real browser-fullscreen preview (Fullscreen API) and fall back to a
 *  fixed full-viewport overlay if the API is unavailable (e.g. inside an iframe). */
async function openFullscreen() {
  fullscreen.value = true
  await nextTick()
  try {
    await fsRoot.value?.requestFullscreen?.()
  } catch {
    /* keep the fixed overlay as the fullscreen experience */
  }
}

function closeFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {})
  }
  fullscreen.value = false
}

function onFsChange() {
  if (!document.fullscreenElement) fullscreen.value = false
}

onMounted(() => document.addEventListener('fullscreenchange', onFsChange))
onUnmounted(() => document.removeEventListener('fullscreenchange', onFsChange))

const overrideCount = computed(() => Object.keys(props.item.overrideConfig).length)

/** Lazy per-file preview renderers, created while the inline panel or the
 *  fullscreen view is open (so it keeps working even if inline collapses). */
const pdfRenderer = computed(() => {
  if (!expanded.value && !fullscreen.value) return undefined
  return new PDF(props.item.file)
})

const scanRenderer = computed(() => {
  if (!expanded.value && !fullscreen.value) return undefined
  return new ScanCacher(new CanvasScanner(itemConfig.value))
})

/** Unified + individual: shows the merged result, but only stores the diff. */
const itemConfig = computed<ScanConfig>({
  get: () => ({ ...props.globalConfig, ...props.item.overrideConfig }),
  set: (val) => {
    const overrides: Partial<ScanConfig> = {}
    for (const k of Object.keys(val) as (keyof ScanConfig)[]) {
      if (val[k] !== props.globalConfig[k]) {
        // @ts-expect-error index assignment across union of primitive types
        overrides[k] = val[k]
      }
    }
    emit('update:override', props.item, overrides)
  }
})

const statusType = computed(() => {
  switch (props.item.status) {
    case 'done':
      return 'success'
    case 'failed':
      return 'error'
    case 'processing':
      return 'warning'
    default:
      return 'default'
  }
})

const progressStatus = computed(() => {
  switch (props.item.status) {
    case 'done':
      return 'success'
    case 'failed':
      return 'error'
    case 'processing':
      return 'warning'
    default:
      return 'default'
  }
})

const statusLabel = computed(
  () => t(`settings.batch.status.${props.item.status}`) as string
)

async function downloadSingle() {
  if (!props.item.output) return
  await fileSave(props.item.output, {
    fileName: props.item.output.name,
    extensions: ['.pdf'],
    mimeTypes: ['application/pdf'],
    startIn: 'downloads',
    description: 'PDF File'
  })
}
</script>

<style scoped>
.individual-panel {
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.individual-toolbar {
  display: flex;
  justify-content: flex-end;
}

.panel-label {
  margin: 2px 0 2px;
  font-size: 13px;
  font-weight: 600;
}

.fs-root {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: var(--n-color-body, #fff);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.fs-bar {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--n-border-color, rgba(0, 0, 0, 0.12));
}

.fs-title {
  font-size: 14px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fs-body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  gap: 16px;
  padding: 12px 16px;
}

.fs-left {
  width: 360px;
  flex: none;
  overflow-y: auto;
  padding-right: 8px;
}

.fs-right {
  flex: 1;
  min-width: 0;
  overflow: auto;
}

.fs-right > :deep(.n-space) {
  width: 100%;
}
</style>
