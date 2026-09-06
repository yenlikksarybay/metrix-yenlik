<script setup lang="ts">
import { Plug, ChevronRight, ArrowLeftRight, ShieldCheck } from 'lucide-vue-next'
defineProps<{ status: { metrix: boolean; webkassa: boolean } }>()
const emit = defineEmits<{ connect: [service: 'metrix' | 'webkassa']; disconnect: [] }>()
</script>
<template>
<div id="connections" class="connections no-print">
<div class="connection-label">
<Plug :size="16" />Источники данных</div>
<button class="connection" @click="emit('connect', 'metrix')">
<span class="source-logo metrix-logo">m</span>
<b>Metrix</b>
<span :class="['status-dot', { online: status.metrix }]" />
<span>{{ status.metrix ? 'Подключен' : 'Подключить' }}</span>
<ChevronRight :size="14" />
</button>
<span class="connection-link">
<ArrowLeftRight :size="16" />
</span>
<button class="connection" @click="emit('connect', 'webkassa')">
<span class="source-logo web-logo">w</span>
<b>Webkassa</b>
<span :class="['status-dot', { online: status.webkassa }]" />
<span>{{ status.webkassa ? 'Подключен' : 'Подключить' }}</span>
<ChevronRight :size="14" />
</button>
<button v-if="status.metrix || status.webkassa" class="text-btn" @click="emit('disconnect')">Отключить</button>
<span class="protected">
<ShieldCheck :size="14" />Защищенное соединение</span>
</div>
</template>
