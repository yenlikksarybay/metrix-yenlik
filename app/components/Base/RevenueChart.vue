<script setup lang="ts">
import { difference, type DayRow, type ReportSource } from '#shared/reconciliation'
import { formatMoney, formatDate } from '~/utils/format'
const props = withDefaults(defineProps<{ rows: DayRow[]; source?: ReportSource }>(), { source: 'both' })
const emit = defineEmits<{ detail: [row: DayRow] }>()
const chartMax = computed(() => Math.max(1, ...props.rows.flatMap(r => [Math.abs(r.metrix || 0), Math.abs(r.webkassa || 0)])))
const height = (n: number | null) => n === null ? 0 : Math.max(n === 0 ? 0 : 2, Math.abs(n) / chartMax.value * 100)
</script>
<template>
<section class="card chart-card">
<div class="section-heading">
<div>
<h2>Динамика выручки</h2>
<p class="muted small">{{ source === 'both' ? 'Ежедневное сравнение двух источников' : 'Выручка по дням · Продажи − возвраты' }}</p>
</div>
<div class="chart-tools">
<span v-if="source !== 'webkassa'" class="legend">
<i class="blue-dot" />Metrix</span>
<span v-if="source !== 'metrix'" class="legend">
<i class="cyan-dot" />Webkassa</span>
<span class="chart-unit">₸</span>
</div>
</div>
<div class="chart">
<div class="y-axis">
<span v-for="n in [1, .75, .5, .25, 0]" :key="n">{{ Math.round(chartMax * n / 100000) }} тыс.</span>
</div>
<div class="plot">
<div class="grid-lines">
<i v-for="n in 5" :key="n" />
</div>
<div class="bar-groups">
<button v-for="row in rows" :key="row.date" class="bar-group" :title="source === 'both' ? `${formatDate(row.date)}: Metrix ${formatMoney(row.metrix)} ₸, Webkassa ${formatMoney(row.webkassa)} ₸` : `${formatDate(row.date)}: ${formatMoney(row[source])} ₸`" @click="emit('detail', row)">
<div class="bar-pair">
<div v-if="source !== 'webkassa'" class="bar metrix-bar" :style="{ height: `${height(row.metrix)}%` }" />
<div v-if="source !== 'metrix'" class="bar webkassa-bar" :style="{ height: `${height(row.webkassa)}%` }" />
</div>
<span class="bar-label">{{ row.date.slice(8) }}.{{ row.date.slice(5, 7) }}<i v-if="difference(row) !== null && difference(row) !== 0" />
</span>
</button>
</div>
</div>
</div>
<div class="chart-note">
<span v-if="source === 'both'"><span class="orange-dot" />Дни с расхождениями отмечены оранжевым</span><span v-if="rows.some(r => (r.webkassa || 0) < 0 || (r.metrix || 0) < 0)"> · Высота столбцов показывает модуль суммы; знак указан в таблице.</span>
</div>
</section>
</template>
