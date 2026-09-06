export default defineEventHandler(async event => {
  sameOrigin(event)
  const body = await readBody(event)
  if (!['metrix', 'webkassa'].includes(body?.service) || typeof body.login !== 'string' || !body.login.trim() || typeof body.password !== 'string' || !body.password || body.password.length > 500) throw createError({ statusCode: 400, statusMessage: 'Введите логин и пароль' })
  const config = useRuntimeConfig(event); const web = body.service === 'webkassa'
  try {
    const result: any = await $fetch(`${web ? config.webkassaBase : config.metrixBase}${web ? '/Authorize' : '/crm/auth/login'}`, { method: 'POST', retry: 0, timeout: 20000, headers: web && config.webkassaApiKey ? { 'x-api-key': config.webkassaApiKey } : {}, body: web ? { Login: body.login, Password: body.password } : { phone: body.login, password: body.password, remember: false } })
    const token = web ? result.Data?.Token : result.token ?? result.data?.token
    if (typeof token !== 'string' || !token || result.Errors?.length) throw new Error('No token')
    session(event)[body.service as 'metrix' | 'webkassa'] = token
    return { connected: true }
  } catch { throw createError({ statusCode: 401, statusMessage: 'Не удалось подключиться. Проверьте учетные данные и доступность сервиса.' }) }
})
