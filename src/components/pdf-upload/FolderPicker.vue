<template>
  <n-card>
    <n-space vertical>
      <n-button text @click="onClick">
        <template #icon>
          <n-icon>
            <FolderOpen16Regular />
          </n-icon>
        </template>
        <n-text>
          {{ t('settings.batch.selectInputFolder') }}
        </n-text>
      </n-button>
      <n-text depth="3" v-if="lastCount">
        {{ t('settings.batch.folderSelected', { n: lastCount }) }}
      </n-text>
    </n-space>
  </n-card>
</template>

<script lang="ts" setup>
import { NButton, NIcon, NText, NCard, NSpace } from 'naive-ui'
import { FolderOpen16Regular } from '@vicons/fluent'
import { directoryOpen } from 'browser-fs-access'
import { useI18n } from 'vue-i18n'
import { ref } from 'vue'

const { t } = useI18n()

const emit = defineEmits<{
  (e: 'update:files', files: File[]): void
}>()

const lastCount = ref(0)

async function onClick() {
  const result = await directoryOpen({
    recursive: true
  })

  // directoryOpen returns either files or directory handles; keep only PDF files.
  const files = (result as unknown as File[]).filter(
    (f) => 'arrayBuffer' in f && (f.type === 'application/pdf' || /\.pdf$/i.test(f.name))
  )
  lastCount.value = files.length
  emit('update:files', files)
}
</script>
