<script setup lang="ts">
const props = defineProps<{
  open: boolean
  photo: Photo
}>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  saved: []
}>()
const toast = useToast()
const saving = ref(false)
const form = reactive({
  title: '',
  description: '',
  tags: '',
  rating: 0,
})

watch(
  () => [props.open, props.photo] as const,
  ([open, photo]) => {
    if (!open) return
    form.title = photo.title || ''
    form.description = photo.description || ''
    form.tags = (photo.tags || []).join(', ')
    form.rating = Number(photo.exif?.Rating || 0)
  },
  { immediate: true },
)

const save = async () => {
  saving.value = true
  try {
    await $fetch(`/api/photos/${props.photo.id}`, {
      method: 'PUT',
      body: {
        title: form.title,
        description: form.description,
        tags: form.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        rating: form.rating || null,
      },
    })
    emit('saved')
    emit('update:open', false)
    toast.add({
      title: $t('photoDetail.editor.saved'),
      color: 'success',
      icon: 'lucide:check',
    })
  } catch (error) {
    toast.add({
      title: $t('photoDetail.editor.failed'),
      description: (error as Error).message,
      color: 'error',
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <template #content>
      <form
        class="space-y-5 p-6"
        @submit.prevent="save"
      >
        <div class="flex items-center justify-between gap-3">
          <div>
            <h3 class="text-lg font-semibold">
              {{ $t('photoDetail.editor.title') }}
            </h3>
            <p class="mt-1 text-sm text-neutral-500">
              {{ $t('photoDetail.editor.description') }}
            </p>
          </div>
          <UButton
            icon="lucide:x"
            color="neutral"
            variant="ghost"
            :aria-label="$t('common.close')"
            @click="emit('update:open', false)"
          />
        </div>
        <UFormField :label="$t('dashboard.albums.form.title')">
          <UInput
            v-model="form.title"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="$t('dashboard.albums.form.description')">
          <UTextarea
            v-model="form.description"
            :rows="4"
            class="w-full"
          />
        </UFormField>
        <UFormField
          :label="$t('photoDetail.editor.tags')"
          :hint="$t('photoDetail.editor.tagsHint')"
        >
          <UInput
            v-model="form.tags"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="$t('exif.sections.rating')">
          <Rating v-model="form.rating" />
        </UFormField>
        <div
          class="flex justify-end gap-2 border-t border-neutral-200 pt-5 dark:border-neutral-800"
        >
          <UButton
            color="neutral"
            variant="ghost"
            @click="emit('update:open', false)"
          >
            {{ $t('dashboard.albums.slideover.cancel') }}
          </UButton>
          <UButton
            type="submit"
            color="neutral"
            icon="lucide:save"
            :loading="saving"
          >
            {{ $t('common.save') }}
          </UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>
