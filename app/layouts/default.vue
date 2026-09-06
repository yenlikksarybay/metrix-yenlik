<script setup lang="ts">
import { ChartNoAxesCombined, ArrowLeftRight, Cable, CircleHelp, ChevronRight, ShieldCheck, PanelLeftClose, Building2 } from 'lucide-vue-next'
const help = ref(false)
</script>
<template>
  <div class="app-shell">
    <aside class="sidebar no-print">
      <a class="brand" href="/" aria-label="Metrix — главная"><span class="brand-mark"><ChartNoAxesCombined :size="24" /></span>metrix<span class="brand-dot">.</span></a>
      <div class="workspace"><span class="workspace-icon"><Building2 :size="18" /></span><div><b>Финансовый контроль</b><small>Рабочее пространство</small></div><ChevronRight :size="15" /></div>
      <p class="nav-label">РАБОЧАЯ ОБЛАСТЬ</p>
      <a href="#reconciliation" class="nav-item active"><ArrowLeftRight :size="19" />Сверка выручки<span class="nav-indicator" /></a>
      <a href="#connections" class="nav-item"><Cable :size="19" />Подключения<span class="nav-count">2</span></a>
      <div class="sidebar-bottom"><div class="secure-card"><ShieldCheck :size="23" /><b>Все цифры под контролем</b><p>Два источника данных.<br>Один прозрачный отчет.</p><span>METRIX RECONCILIATION</span></div><button class="nav-item" @click="help = true"><CircleHelp :size="19" />Как работает сверка</button><div class="sidebar-footer"><span>Metrix Workspace</span><PanelLeftClose :size="17" /></div></div>
    </aside>
    <div class="main-shell"><header class="topbar no-print"><div class="breadcrumbs">Рабочая область <ChevronRight :size="14" /><span>Сверка выручки</span></div><div class="topbar-right"><span class="timezone">Алматы · UTC+5</span><span class="avatar">ФК</span><div class="profile"><b>Финансовый контроль</b><small>Рабочее пространство</small></div></div></header><main><slot /></main></div>
    <div v-if="help" class="modal-backdrop" @click.self="help = false"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="help-title" @keydown.esc="help = false"><h2 id="help-title">Как работает сверка</h2><p>1. Подключите Metrix и Webkassa своими учетными данными.</p><p>2. Выберите ТЦ, арендатора, кассы и период до 31 дня.</p><p>3. Запустите сверку. Система загрузит все страницы смен и чеков, затем сопоставит дневные суммы.</p><p>Разница = Webkassa − Metrix. Процент рассчитывается от абсолютной суммы Metrix. День определяется датой регистрации чека по времени Алматы.</p><p>4. Скачайте Excel или выберите «Сохранить как PDF» в окне печати.</p><button class="btn primary" autofocus @click="help = false">Понятно</button></section></div>
  </div>
</template>
