import { createError, type H3Event } from 'h3'
export async function provider(event: H3Event, service: 'metrix' | 'webkassa', path: string, body?: Record<string, unknown>, query?: Record<string, any>) {
  const config = useRuntimeConfig(event); const token = session(event)[service]
  if (!token) throw createError({ statusCode: 401, statusMessage: `Подключите ${service === 'metrix' ? 'Metrix' : 'Webkassa'}` })
  try {
    const result: any = await $fetch(`${service === 'metrix' ? config.metrixBase : config.webkassaBase}${path}`, {
      method: body ? 'POST' : 'GET', timeout: 30000, retry: 0, query,
      headers: service === 'metrix' ? { Authorization: `Bearer ${token}` } : { Token: token, ...(config.webkassaApiKey ? { 'x-api-key': config.webkassaApiKey } : {}) },
      body: body ? { ...body, ...(service === 'webkassa' ? { Token: token } : {}) } : undefined
    })
    if (result.Errors?.length || result.errors || result.success === false) throw new Error('API отклонил запрос')
    return result
  } catch (error: any) {
    if ([401, 403].includes(error.statusCode || error.response?.status)) { delete session(event)[service]; throw createError({ statusCode: 401, statusMessage: `Сессия ${service} истекла. Подключитесь повторно.` }) }
    throw createError({ statusCode: 502, statusMessage: `Не удалось получить данные ${service}. Проверьте доступ и параметры.` })
  }
}
export function statQuery(mall: string, tenant: string, from: string, to: string) {
  return { mall_id: mall, nds: 0, main_start_date: from, main_end_date: to, compare_start_date: from, compare_end_date: to, ...(tenant ? { 'tenant_ids[0]': tenant } : {}) }
}
export function listData(result: any): any[] { if (!Array.isArray(result.data)) throw createError({ statusCode: 502, statusMessage: 'Неизвестная структура ответа Metrix' }); return result.data }
export { allPages } from '#shared/pagination'
