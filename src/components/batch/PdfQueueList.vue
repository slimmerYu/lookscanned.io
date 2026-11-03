<template>
  <n-space vertical :size="10">
    <PdfQueueItemRow
      v-for="item in queue"
      :key="item.id"
      :item="item"
      :global-config="globalConfig"
      @retry="(i) => emit('retry', i)"
      @reset-item="(i) => emit('resetItem', i)"
      @update:override="(i, o) => emit('update:override', i, o)"
    />
  </n-space>
</template>

<script lang="ts" setup>
import { NSpace } from 'naive-ui'
import PdfQueueItemRow from './PdfQueueItemRow.vue'
import type { ScanConfig } from '@/utils/scan-renderer'
import type { PdfQueueItem } from '@/composables/use-batch-scan'

defineProps<{
  queue: PdfQueueItem[]
  globalConfig: ScanConfig
}>()

const emit = defineEmits<{
  (e: 'retry', item: PdfQueueItem): void
  (e: 'resetItem', item: PdfQueueItem): void
  (e: 'update:override', item: PdfQueueItem, override: Partial<ScanConfig>): void
}>()
</script>
