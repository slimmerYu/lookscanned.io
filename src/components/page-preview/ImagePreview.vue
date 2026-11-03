<template>
  <n-image :src="imageURL" v-if="imageURL" class="image-box" />
  <div v-else class="image-placeholder" :style="skeletonStyle">
    <n-skeleton width="100%" height="100%" />
  </div>
</template>

<script lang="ts" setup>
import { NImage, NSkeleton } from 'naive-ui'
import { toRef, computed } from 'vue'
import { useObjectUrl } from '@vueuse/core'

const props = defineProps<{
  image?: Blob
  width?: number
  height?: number
}>()

const image = toRef(props, 'image')

const imageURL = useObjectUrl(image)

const skeletonStyle = computed(() => {
  if (!props.width || !props.height) return {}
  return {
    'aspect-ratio': `${props.width} / ${props.height}`
  }
})
</script>

<style scoped>
.image-box {
  display: block;
  width: 100%;
}

.image-box :deep(.n-image__img),
.image-box :deep(img) {
  display: block;
  width: 100%;
  max-width: 100%;
  height: auto;
}

.image-placeholder {
  width: 100%;
  aspect-ratio: 409.88 / 530.42;
}
</style>
