<template>
  <!-- Compact two-row layout (used by the batch individual-adjustment panel) -->
  <n-grid
    v-if="compact"
    class="scan-settings-compact"
    :x-gap="16"
    :y-gap="10"
    cols="2 s:3 m:5 l:5"
    responsive="screen"
    item-responsive
  >
    <n-grid-item span="1">
      <ColorspaceSetting :colorspace="config.colorspace" @update:colorspace="setField('colorspace', $event)" />
    </n-grid-item>
    <n-grid-item span="1">
      <BorderSetting :border="config.border" @update:border="setField('border', $event)" />
    </n-grid-item>
    <n-grid-item span="1">
      <RotateSetting :rotate="config.rotate" @update:rotate="setField('rotate', $event)" />
    </n-grid-item>
    <n-grid-item span="1">
      <RotateVarianceSetting :rotate_var="config.rotate_var" @update:rotate_var="setField('rotate_var', $event)" />
    </n-grid-item>
    <n-grid-item span="1">
      <BrightnessSetting :brightness="config.brightness" @update:brightness="setField('brightness', $event)" />
    </n-grid-item>
    <n-grid-item span="1">
      <ContrastSetting :contrast="config.contrast" @update:contrast="setField('contrast', $event)" />
    </n-grid-item>
    <n-grid-item span="1">
      <BlurSetting :blur="config.blur" @update:blur="setField('blur', $event)" />
    </n-grid-item>
    <n-grid-item span="1">
      <NoiseSetting :noise="config.noise" @update:noise="setField('noise', $event)" />
    </n-grid-item>
    <n-grid-item span="1">
      <YellowishSetting :yellowish="config.yellowish" @update:yellowish="setField('yellowish', $event)" />
    </n-grid-item>
    <n-grid-item span="1">
      <ScaleSetting :scale="config.scale" @update:scale="setField('scale', $event)" />
    </n-grid-item>
  </n-grid>

  <!-- Full card layout (single-file / magica views) -->
  <n-card
    v-else
    :segmented="{
      content: true,
      footer: 'soft'
    }"
  >
    <n-collapse :default-expanded-names="['Settings']">
      <template #header-extra>
        <n-icon><ChevronDown12Regular /></n-icon>
      </template>
      <template #arrow>
        <n-icon style="margin-right: 2px">
          <AreaCustom />
        </n-icon>
      </template>
      <n-collapse-item :title="t('settings.settings')" name="Settings">
        <!-- Scan Settings -->
        <n-space :size="40" style="margin-bottom: 10px">
          <ColorspaceSetting :colorspace="config.colorspace" @update:colorspace="setField('colorspace', $event)" />
          <BorderSetting :border="config.border" @update:border="setField('border', $event)" />
        </n-space>

        <RotateSetting :rotate="config.rotate" @update:rotate="setField('rotate', $event)" />
        <RotateVarianceSetting :rotate_var="config.rotate_var" @update:rotate_var="setField('rotate_var', $event)" />
        <BrightnessSetting :brightness="config.brightness" @update:brightness="setField('brightness', $event)" />
        <YellowishSetting :yellowish="config.yellowish" @update:yellowish="setField('yellowish', $event)" />
        <ContrastSetting :contrast="config.contrast" @update:contrast="setField('contrast', $event)" />
        <BlurSetting :blur="config.blur" @update:blur="setField('blur', $event)" />
        <NoiseSetting :noise="config.noise" @update:noise="setField('noise', $event)" />
        <ScaleSetting :scale="config.scale" @update:scale="setField('scale', $event)" />
      </n-collapse-item>
    </n-collapse>
  </n-card>
</template>

<script lang="ts" setup>
import { NCard, NSpace, NCollapse, NCollapseItem, NIcon, NGrid, NGridItem } from 'naive-ui'
import { AreaCustom } from '@vicons/carbon'
import { ChevronDown12Regular } from '@vicons/fluent'

import BorderSetting from './settings/BorderSetting.vue'
import RotateSetting from './settings/RotateSetting.vue'
import RotateVarianceSetting from './settings/RotateVarianceSetting.vue'
import ColorspaceSetting from './settings/ColorspaceSetting.vue'
import BlurSetting from './settings/BlurSetting.vue'
import NoiseSetting from './settings/NoiseSetting.vue'
import ScaleSetting from './settings/ScaleSetting.vue'
import BrightnessSetting from './settings/BrightnessSetting.vue'
import YellowishSetting from './settings/YellowishSetting.vue'
import ContrastSetting from './settings/ContrastSetting.vue'

import type { ScanConfig } from '@/utils/scan-renderer'
import { useI18n } from 'vue-i18n'
import { useVModel } from '@vueuse/core'

const { t } = useI18n()

const props = defineProps<{
  config: ScanConfig
  /** Two-row compact grid (no card/collapse wrapper). For batch individual panel. */
  compact?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:config', config: ScanConfig): void
}>()

const config = useVModel(props, 'config', emit)

/** Replace the whole config object so the parent's v-model setter fires
 *  (the previous `config.rotate = $event` style mutated a throwaway clone
 *  in place and never reached the parent). */
function setField<K extends keyof ScanConfig>(key: K, value: ScanConfig[K]) {
  config.value = { ...config.value, [key]: value }
}
</script>
