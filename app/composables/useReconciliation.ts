import { demoReport, daysBetween, type Report, type ReportSource } from '#shared/reconciliation'
type Option = { id: string; name: string }
export function useReconciliation() {
  const demo = ref(true); const status = ref({ metrix: false, webkassa: false }); const busy = ref(false); const loading = ref(false); const error = ref('')
  const mall = ref('1'); const tenant = ref('10'); const selected = ref(['SWK00507912']); const from = ref('2026-08-31'); const to = ref('2026-09-06'); const mode = ref('net')
  const source = ref<ReportSource>('both'); const webCashboxes = ref('')
  const requestedBoxes = computed(() => source.value === 'webkassa' ? [...new Set(webCashboxes.value.split(/[\s,;]+/).filter(Boolean))] : selected.value)
  const shiftSkip = ref<number | string>(0); const shiftTake = ref<number | string>(50)
  const malls = ref<Option[]>([{ id: '1', name: 'Esentai Mall' }, { id: '2', name: 'MEGA Alma-Ata' }]); const tenants = ref<Option[]>([{ id: '10', name: 'Fellini' }, { id: '29', name: 'Paul' }]); const cashboxes = ref<Option[]>([{ id: '29', name: 'SWK00507912' }, { id: '30', name: 'SWK00501677' }])
  const mallName = computed(() => malls.value.find(x => x.id === mall.value)?.name || ''); const tenantName = computed(() => tenants.value.find(x => x.id === tenant.value)?.name || 'Все арендаторы')
  const initialReport = useState<Report>('initial-demo-report', () => demoReport(from.value, to.value, mallName.value, tenantName.value, selected.value, mode.value))
  const report = ref<Report | null>(initialReport.value)
  const signature = () => JSON.stringify([source.value, webCashboxes.value, demo.value, mall.value, tenant.value, [...selected.value].sort(), from.value, to.value, mode.value, shiftSkip.value, shiftTake.value])
  const reportSignature = ref(signature()); const stale = computed(() => !!report.value && reportSignature.value !== signature())
  const message = (e: any) => e?.data?.statusMessage || e?.message || 'Не удалось выполнить запрос'
  let generation = 0
  async function refresh(level: 'malls' | 'tenants' | 'cashboxes') {
    if (source.value === 'webkassa') return
    const current = ++generation; error.value = ''; loading.value = true
    if (level === 'malls') { malls.value = []; mall.value = '' }
    if (level !== 'cashboxes') { tenants.value = []; tenant.value = '' }
    cashboxes.value = []; selected.value = []
    try {
      if (demo.value) {
        if (level === 'malls') malls.value = [{ id: '1', name: 'Esentai Mall' }, { id: '2', name: 'MEGA Alma-Ata' }]
        else if (level === 'tenants') tenants.value = mall.value === '1' ? [{ id: '10', name: 'Fellini' }, { id: '29', name: 'Paul' }] : [{ id: '41', name: 'Coffee Boom' }]
        else cashboxes.value = [{ id: '29', name: tenant.value === '41' ? 'SWK00508901' : 'SWK00507912' }, { id: '30', name: 'SWK00501677' }]
      } else {
        if (!status.value.metrix) return
        const data = await $fetch<Option[]>(`/api/catalog/${level}`, { query: { mall: mall.value, tenant: tenant.value, from: from.value, to: to.value } })
        if (current !== generation) return
        if (level === 'malls') malls.value = data; else if (level === 'tenants') tenants.value = data; else cashboxes.value = data
      }
    } catch (e) { if (current === generation) error.value = message(e) } finally { if (current === generation) loading.value = false }
  }
  async function changeSource(value: ReportSource) {
    if (busy.value || loading.value || value === source.value) return
    source.value = value; report.value = null; error.value = ''
    if (value === 'webkassa' && !webCashboxes.value) webCashboxes.value = selected.value.join(', ')
    if (value !== 'webkassa' && !malls.value.length) await refresh('malls')
  }
  async function setDemo(value: boolean) { demo.value = value; report.value = null; malls.value = []; tenants.value = []; cashboxes.value = []; mall.value = ''; tenant.value = ''; selected.value = []; await refresh('malls') }
  async function changeMall(value: string) { mall.value = value; await refresh('tenants'); if (mall.value) await refresh('cashboxes') }
  async function changeTenant(value: string) { tenant.value = value; await refresh('cashboxes') }
  async function changeDates() { if (mall.value) await refresh('cashboxes') }
  async function run() {
    error.value = ''
    try {
      const Skip = shiftSkip.value === '' ? 0 : Number(shiftSkip.value); const Take = shiftTake.value === '' ? 50 : Number(shiftTake.value)
      if (source.value !== 'metrix' && (!Number.isSafeInteger(Skip) || Skip < 0 || !Number.isSafeInteger(Take) || Take < 1)) throw new Error('Skip должен быть целым числом от 0, Take — целым числом от 1')
      daysBetween(from.value, to.value)
      if (source.value !== 'webkassa' && !mall.value) throw new Error('Выберите торговый центр')
      if (!requestedBoxes.value.length || requestedBoxes.value.length > 30 || requestedBoxes.value.some(box => !/^[\w-]{1,64}$/.test(box))) throw new Error('Укажите от 1 до 30 корректных ЗНК касс')
      if (!demo.value && source.value !== 'webkassa' && !status.value.metrix) throw new Error('Подключите Metrix')
      if (!demo.value && source.value !== 'metrix' && !status.value.webkassa) throw new Error('Подключите Webkassa')
      busy.value = true
      const startSignature = signature()
      const result = demo.value ? demoReport(from.value, to.value, mallName.value, tenantName.value, [...requestedBoxes.value], mode.value) : await $fetch<Report, '/api/reconcile'>('/api/reconcile', { method: 'POST', body: { mall: mall.value, tenant: tenant.value, mallName: mallName.value, tenantName: tenantName.value, source: source.value, cashboxes: requestedBoxes.value, from: from.value, to: to.value, mode: mode.value, Skip, Take }, timeout: 1800000 })
      result.source = source.value
      if (source.value === 'webkassa') { result.mall = 'Webkassa'; result.tenant = 'Выбранные кассы' }
      if (demo.value && source.value !== 'both') for (const row of result.rows) { if (source.value === 'metrix') { row.webkassa = null; row.tickets = 0 } else row.metrix = null }
      report.value = result; reportSignature.value = startSignature
    } catch (e) { error.value = message(e) } finally { busy.value = false }
  }
  onMounted(async () => { try { status.value = await $fetch<{ metrix: boolean; webkassa: boolean }>('/api/auth/status') } catch { error.value = 'Сервер недоступен. Проверьте подключение.' } })
  return { source, webCashboxes, requestedBoxes, changeSource, shiftSkip, shiftTake, demo, status, busy, loading, error, mall, tenant, selected, from, to, mode, malls, tenants, cashboxes, report, stale, refresh, setDemo, changeMall, changeTenant, changeDates, run }
}
