<script setup lang="ts">
import { Download, FileSpreadsheet, Info, Wallet, ReceiptText } from 'lucide-vue-next'
import { type Report } from '#shared/reconciliation'
import { formatMoney, formatDate } from '~/utils/format'
const props = defineProps<{ report: Report; stale: boolean; busy: boolean; exporting: boolean }>()
defineEmits<{ excel: []; print: [] }>()
const source = computed(() => props.report.source === 'webkassa' ? 'webkassa' : 'metrix')
const name = computed(() => source.value === 'metrix' ? 'Metrix' : 'Webkassa')
const complete = computed(() => props.report.rows.every(row => !row.error && row[source.value] !== null))
const total = computed(() => complete.value ? props.report.rows.reduce((sum, row) => sum + (row[source.value] ?? 0), 0) : null)
const tickets = computed(() => props.report.rows.reduce((sum, row) => sum + row.tickets, 0))
</script>
<template>
  <div class="report-header"><div><h2>Выручка {{ name }} <span v-if="report.demo" class="demo-tag">ДЕМО</span></h2><p>{{ report.mall }} · {{ report.tenant }} · {{ formatDate(report.from) }} — {{ formatDate(report.to) }}</p></div><span class="report-timestamp">{{ complete ? 'Загрузка завершена' : 'Отчет неполный' }}</span></div>
  <div class="source-stats">
    <article class="stat-card"><div class="stat-top"><span>Выручка {{ name }}</span><Wallet :size="19" /></div><div class="stat-value">{{ formatMoney(total) }} <span>₸</span></div><div class="stat-foot">Продажи − возвраты за период</div></article>
    <article v-if="source === 'webkassa'" class="stat-card"><div class="stat-top"><span>Чеков учтено</span><ReceiptText :size="19" /></div><div class="stat-value">{{ complete ? tickets : '—' }}</div><div class="stat-foot">По выбранным кассам</div></article>
  </div>
  <BaseRevenueChart :rows="report.rows" :source="source" />
  <section class="card report-table source-table">
    <div class="section-heading"><div class="section-title"><h2>Детализация по дням</h2><span class="count-badge">{{ report.rows.length }}</span></div><div class="export-actions no-print"><button class="btn small-btn" :disabled="stale || busy || exporting" @click="$emit('excel')"><FileSpreadsheet :size="16" />{{ exporting ? 'Создаем…' : 'Excel' }}</button><button class="btn small-btn" :disabled="stale || busy" @click="$emit('print')"><Download :size="16" />PDF</button></div></div>
    <div class="table-scroll"><table><thead><tr><th>Дата</th><th>{{ name }}, ₸</th><th v-if="source === 'webkassa'">Чеки</th><th>Статус</th></tr></thead><tbody><tr v-for="row in report.rows" :key="row.date"><td><b>{{ formatDate(row.date) }}</b></td><td>{{ formatMoney(row[source]) }}</td><td v-if="source === 'webkassa'">{{ row.webkassa === null ? '—' : row.tickets }}</td><td><span :class="['row-status', row.error || row[source] === null ? 'unknown' : 'matched']">{{ row.error || (row[source] === null ? 'Нет данных' : 'Загружено') }}</span></td></tr></tbody><tfoot><tr><td>Итого за период</td><td>{{ formatMoney(total) }}</td><td v-if="source === 'webkassa'">{{ complete ? tickets : '—' }}</td><td>{{ complete ? 'Данные загружены' : 'Данные неполные' }}</td></tr></tfoot></table></div>
    <div class="table-footer"><span><Info :size="14" />Источник: {{ name }} · Продажи − возвраты</span></div>
  </section>
  <div class="report-context"><span>Кассы: {{ report.cashboxes.join(', ') }} · KZT</span><span>Сформирован: {{ new Date(report.createdAt).toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' }) }}</span></div>
</template>
<style scoped>
.source-stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin: 16px 0; }
.source-table th:last-child, .source-table td:last-child { text-align: left; padding-left: 18px; white-space: normal; }
@media (max-width: 620px) { .source-stats { grid-template-columns: 1fr; } }
</style>
