<template>
  <router-link
    :to="{
      name: 'scan-batch'
    }"
    #="{ navigate, href }"
    custom
  >
    <n-button round tag="a" :href="href" @click="navigate">
      <template #icon>
        <n-icon>
          <Stack16Regular />
        </n-icon>
      </template>
      {{ t('settings.batch.title') }}
    </n-button>
  </router-link>
</template>

<script setup lang="ts">
import { NButton, NIcon } from 'naive-ui'
import { Stack16Regular } from '@vicons/fluent'

import { RouterLink } from 'vue-router'

import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>
