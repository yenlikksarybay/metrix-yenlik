import { daysBetween } from '#shared/reconciliation'
export default defineEventHandler(async event => {
  setHeader(event, 'Cache-Control', 'no-store')
  const kind = getRouterParam(event, 'kind'); const q = getQuery(event)
  if (kind === 'malls') return listData(await provider(event, 'metrix', '/ssp/mall', undefined, { filter: 'search', perPage: 10000 })).map(x => ({ id: String(x.id), name: x.name }))
  if (!q.mall) throw createError({ statusCode: 400, statusMessage: 'Выберите торговый центр' })
  if (kind === 'tenants') return listData(await provider(event, 'metrix', '/ssp/tenant', undefined, { filter: 'search', perPage: 10000, mall_id: q.mall, sortBy: 'name' })).map(x => ({ id: String(x.id), name: x.name }))
  if (kind === 'cashboxes') {
    try { daysBetween(String(q.from), String(q.to)) } catch (e: any) { throw createError({ statusCode: 400, statusMessage: e.message }) }
    return listData(await provider(event, 'metrix', '/ssp/statistic_tenant', undefined, statQuery(String(q.mall), String(q.tenant || ''), String(q.from), String(q.to)))).map(x => ({ id: String(x.cashbox_id), name: x.cashbox_name }))
  }
  throw createError({ statusCode: 404 })
})
