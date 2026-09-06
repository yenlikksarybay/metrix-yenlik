import { demoReport, daysBetween, type Report } from '#shared/reconciliation'
type Option = { id: string; name: string }
export function useReconciliation() {
  const demo = ref(true); const status = ref({ metrix: false, webkassa: false }); const busy = ref(false); const loading = ref(false); const error = ref('')
  const mall = ref('1'); const tenant = ref('10'); const selected = ref(['SWK00507912']); const from = ref('2026-08-31'); const to = ref('2026-09-06'); const mode = ref('net')
  const malls = ref<Option[]>([{ id: '1', name: 'Esentai Mall' }, { id: '2', name: 'MEGA Alma-Ata' }]); const tenants = ref<Option[]>([{ id: '10', name: 'Fellini' }, { id: '29', name: 'Paul' }]); const cashboxes = ref<Option[]>([{ id: '29', name: 'SWK00507912' }, { id: '30', name: 'SWK00501677' }])
  const mallName = computed(() => malls.value.find(x => x.id === mall.value)?.name || ''); const tenantName = computed(() => tenants.value.find(x => x.id === tenant.value)?.name || 'Все арендаторы')
  const initialReport = useState<Report>('initial-demo-report', () => demoReport(from.value, to.value, mallName.value, tenantName.value, selected.value, mode.value))
  const report = ref<Report | null>(initialReport.value)
  const signature = () => JSON.stringify([demo.value, mall.value, tenant.value, [...selected.value].sort(), from.value, to.value, mode.value])
  const reportSignature = ref(signature()); const stale = computed(() => !!report.value && reportSignature.value !== signature())
  const message = (e: any) => e?.data?.statusMessage || e?.message || 'Не удалось выполнить запрос'
  let generation = 0
  async function refresh(level: 'malls' | 'tenants' | 'cashboxes') {
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
  async function setDemo(value: boolean) { demo.value = value; report.value = null; await refresh('malls') }
  async function changeMall(value: string) { mall.value = value; await refresh('tenants'); if (mall.value) await refresh('cashboxes') }
  async function changeTenant(value: string) { tenant.value = value; await refresh('cashboxes') }
  async function changeDates() { if (mall.value) await refresh('cashboxes') }
  async function run() {
    error.value = ''
    try {
      daysBetween(from.value, to.value)
      if (!mall.value || !selected.value.length) throw new Error('Выберите торговый центр и хотя бы одну кассу')
      if (!demo.value && (!status.value.metrix || !status.value.webkassa)) throw new Error('Подключите оба сервиса перед сверкой')
      busy.value = true
      const startSignature = signature()
      const result = demo.value ? demoReport(from.value, to.value, mallName.value, tenantName.value, [...selected.value], mode.value) : await $fetch<Report>('/api/reconcile', { method: 'POST', body: { mall: mall.value, tenant: tenant.value, mallName: mallName.value, tenantName: tenantName.value, cashboxes: selected.value, from: from.value, to: to.value, mode: mode.value }, timeout: 1800000 })
      report.value = result; reportSignature.value = startSignature
    } catch (e) { error.value = message(e) } finally { busy.value = false }
  }
  onMounted(async () => { try { status.value = await $fetch('/api/auth/status') } catch { error.value = 'Сервер недоступен. Проверьте подключение.' } })
  return { demo, status, busy, loading, error, mall, tenant, selected, from, to, mode, malls, tenants, cashboxes, report, stale, refresh, setDemo, changeMall, changeTenant, changeDates, run }
}
