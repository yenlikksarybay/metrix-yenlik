<script setup lang="ts">
const props = defineProps<{ label: string; modelValue: string; options: { id: string; name: string }[]; placeholder?: string; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const selected = computed({ get: () => props.modelValue, set: (value: string) => emit('update:modelValue', value) })
</script>
<template>
  <label class="field">
    <span>{{ label }}</span>
    <select v-model="selected" :disabled="disabled">
      <option value="">{{ placeholder || 'Выберите' }}</option>
      <option v-for="option in options" :key="option.id" :value="option.id">{{ option.name }}</option>
    </select>
  </label>
</template>
