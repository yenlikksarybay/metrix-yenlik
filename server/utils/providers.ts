import { createError, type H3Event } from 'h3'
export async function provider(event: H3Event, service: 'metrix' | 'webkassa', path: string, body?: Record<string, unknown>, query?: Record<string, any>) {
  const config = useRuntimeConfig(event); const token = session(event)[service]
  if (!token) throw createError({ statusCode: 401, statusMessage: `Подключите ${service === 'metrix' ? 'Metrix' : 'Webkassa'}` })
  const headers = service === 'metrix' ? { Authorization: `Bearer ${token}` } : webkassaHeaders(event, token)
  try {
    const result: any = await $fetch(`${service === 'metrix' ? config.metrixBase : config.webkassaBase}${path}`, {
      method: body ? 'POST' : 'GET', timeout: 30000, retry: 0, query,
      headers,
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

export function webkassaHeaders(event: H3Event, token?: string): Record<string, string> {
  const key = useRuntimeConfig(event).webkassaApiKey.trim()
  if (!key) throw createError({ statusCode: 500, statusMessage: 'Укажите NUXT_WEBKASSA_API_KEY в .env и перезапустите сервер' })
  return { 'x-api-key': key, ...(token ? { Token: token } : {}) }
}
