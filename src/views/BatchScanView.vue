<template>
  <MainContainer>
    <div class="batch-layout">
      <div class="batch-head">
        <BackToIndex />
      </div>

      <n-grid
        class="batch-grid"
        x-gap="25"
        y-gap="25"
        :cols="12"
        item-responsive
        responsive="screen"
      >
        <n-grid-item span="12 s:5 m:4 l:3" class="pane">
          <div class="pane-scroll">
            <n-space vertical>
              <FolderPicker @update:files="onFiles" />

              <ScanSettingsCard v-model:config="globalConfig" />

              <n-card size="small">
                <n-space vertical :size="12">
                  <n-button
                    block
                    type="primary"
                    :loading="running"
                    :disabled="!queue.length || running"
                    @click="start"
                  >
                    {{ t('settings.batch.start') }}
                  </n-button>
                  <n-button block :disabled="!running" @click="cancel()">
                    {{ t('settings.batch.cancel') }}
                  </n-button>
                  <n-button
                    block
                    :disabled="!queue.length"
                    @click="applyGlobalToAll"
                  >
                    {{ t('settings.batch.applyGlobalToAll') }}
                  </n-button>
                  <n-button
                    block
                    type="success"
                    :disabled="doneFiles === 0"
                    @click="downloadZip"
                  >
                    {{ t('settings.batch.downloadZip') }}
                  </n-button>
                </n-space>
              </n-card>
            </n-space>
          </div>
        </n-grid-item>

        <n-grid-item span="12 s:7 m:8 l:9" class="pane">
          <div class="pane-col">
            <n-card size="small" v-if="queue.length" class="pane-pinned">
              <n-space vertical :size="10">
                <div class="stat-row">
                  <n-text strong>{{ t('settings.batch.overall') }}</n-text>
                  <n-text depth="3">
                    {{ t('settings.batch.filesStat', { done: doneFiles, total: totalFiles }) }}
                    <template v-if="failedFiles"> ·
                      {{ t('settings.batch.failedStat', { n: failedFiles }) }}</template>
                  </n-text>
                </div>
                <n-progress
                  type="line"
                  :percentage="Math.round(overallProgress * 100)"
                  :status="doneFiles < totalFiles ? 'default' : failedFiles > 0 ? 'error' : 'success'"
                  indicator-placement="inside"
                />
              </n-space>
            </n-card>

            <n-empty
              v-if="!queue.length"
              :description="t('settings.batch.noFiles')"
              style="margin-top: 40px"
            />

            <div v-else class="pane-scroll pane-scroll--flex">
              <PdfQueueList
                :queue="queue"
                :global-config="globalConfig"
                @retry="retry"
                @reset-item="resetItem"
                @update:override="onUpdateOverride"
              />
            </div>
          </div>
        </n-grid-item>
      </n-grid>
    </div>
  </MainContainer>
</template>

<script lang="ts" setup>
import { NGrid, NGridItem, NSpace, NCard, NButton, NText, NProgress, NEmpty } from 'naive-ui'
import MainContainer from '@/components/MainContainer.vue'
import BackToIndex from '@/components/buttons/BackToIndex.vue'
import FolderPicker from '@/components/pdf-upload/FolderPicker.vue'
import ScanSettingsCard from '@/components/scan-settings/ScanSettingsCard.vue'
import PdfQueueList from '@/components/batch/PdfQueueList.vue'
import { type ScanConfig, defaultConfig } from '@/utils/scan-renderer/canvas-scan'
import { useBatchScan, getRelativePath, outputRelPath, type PdfQueueItem } from '@/composables/use-batch-scan'
import { fileSave } from 'browser-fs-access'
import JSZip from 'jszip'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useHead } from '@unhead/vue'

const { t } = useI18n()

useHead({
  title: t('settings.batch.title') + ' - ' + t('base.title'),
  meta: [{ name: 'description', content: t('base.description') }]
})

const globalConfig = ref<ScanConfig>({ ...defaultConfig })
const queue = ref<PdfQueueItem[]>([])

const { running, totalFiles, doneFiles, failedFiles, overallProgress, start, cancel, retry, applyGlobalToAll, resetItem } =
  useBatchScan(globalConfig, queue)

function onFiles(files: File[]) {
  queue.value = files.map((file, i) => ({
    id: `${i}-${file.name}`,
    file,
    relativePath: getRelativePath(file),
    overrideConfig: {},
    status: 'pending',
    progress: 0
  }))
}

function onUpdateOverride(item: PdfQueueItem, override: Partial<ScanConfig>) {
  item.overrideConfig = override
}

async function downloadZip() {
  const zip = new JSZip()
  for (const item of queue.value) {
    if (item.status === 'done' && item.output) {
      zip.file(outputRelPath(item.relativePath), item.output)
    }
  }
  const blob = await zip.generateAsync({ type: 'blob' })
  const file = new File([blob], 'scan-results.zip', { type: 'application/zip' })
  await fileSave(file, {
    fileName: 'scan-results.zip',
    extensions: ['.zip'],
    mimeTypes: ['application/zip'],
    startIn: 'downloads',
    description: 'ZIP Archive'
  })
}
</script>

<style scoped>
.stat-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

/* Mobile: keep the file list in its own scroll area; the rest scrolls with the page. */
.pane-scroll--flex {
  max-height: 70vh;
  overflow-y: auto;
  padding-right: 8px;
}

/* Desktop (two columns): each column fills the viewport and scrolls on its own. */
@media (min-width: 640px) {
  .batch-layout {
    height: calc(100vh - 55px);
    display: flex;
    flex-direction: column;
  }
  .batch-head {
    flex-shrink: 0;
    margin-bottom: 25px;
  }
  .batch-grid {
    flex: 1;
    min-height: 0;
    grid-template-rows: minmax(0, 1fr);
  }
  .pane {
    height: 100%;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .pane-scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    max-height: none;
    padding-right: 8px;
  }
  .pane-col {
    height: 100%;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .pane-pinned {
    flex-shrink: 0;
  }
  .pane-scroll--flex {
    margin-top: 16px;
  }
}
</style>
