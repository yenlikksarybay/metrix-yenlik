import { randomUUID } from 'node:crypto'
import { daysBetween, dailyMetrix, money, ticketAmount, type Report } from '#shared/reconciliation'
export default defineEventHandler(async event => {
  sameOrigin(event); setHeader(event, 'Cache-Control', 'no-store')
  const b = await readBody(event)
  let dates: string[]
  try { dates = daysBetween(b.from, b.to) } catch (e: any) { throw createError({ statusCode: 400, statusMessage: e.message }) }
  if (!b.mall || !Array.isArray(b.cashboxes) || !b.cashboxes.length || b.cashboxes.length > 30 || b.cashboxes.some((x: unknown) => typeof x !== 'string' || !/^[\w-]{1,64}$/.test(x)) || b.mode !== 'net') throw createError({ statusCode: 400, statusMessage: 'Проверьте выбор касс и режим расчета (до 30 касс)' })
  const boxes = [...new Set<string>(b.cashboxes)]
  const catalog = listData(await provider(event, 'metrix', '/ssp/statistic_tenant', undefined, statQuery(b.mall, b.tenant || '', b.from, b.to)))
  if (boxes.some(box => !catalog.some(x => x.cashbox_name === box))) throw createError({ statusCode: 400, statusMessage: 'Список касс изменился. Обновите выбор.' })
  const report: Report = { id: randomUUID(), createdAt: new Date().toISOString(), demo: false, mall: String(b.mallName || b.mall), tenant: String(b.tenantName || 'Все арендаторы'), cashboxes: boxes, from: b.from, to: b.to, mode: b.mode, rows: dates.map(date => ({ date, metrix: null, webkassa: null, tickets: 0 })) }
  const isAll = new Set(catalog.map(x => x.cashbox_name)).size === boxes.length
  if (isAll) {
    const stats: any = await provider(event, 'metrix', '/ssp/statistic_hourly', undefined, statQuery(b.mall, b.tenant || '', b.from, b.to))
    if (!Array.isArray(stats.daily_totals)) throw createError({ statusCode: 502, statusMessage: 'В ответе Metrix отсутствует daily_totals' })
    const daily = dailyMetrix(stats.daily_totals, dates)
    for (const row of report.rows) {
      row.metrix = daily.get(row.date) ?? null
      if (row.metrix === null) row.error = 'Нет однозначного дневного итога Metrix'
    }
  } else {
    for (const row of report.rows) {
      try {
        const data = listData(await provider(event, 'metrix', '/ssp/statistic_tenant', undefined, statQuery(b.mall, b.tenant || '', row.date, row.date)))
        row.metrix = boxes.reduce((sum, box) => { const matches = data.filter(x => x.cashbox_name === box); if (matches.length !== 1) throw new Error('Нет однозначной суммы выбранной кассы Metrix'); return sum + money(matches[0].main_total) }, 0)
      } catch { row.error = 'Не удалось получить дневную сумму выбранных касс Metrix' }
    }
  }
  const totals = new Map(dates.map(date => [date, { sum: 0, count: 0 }]))
  const apiDate = (date: string) => date.split('-').reverse().join('.')
  // Include the preceding day to capture a shift crossing midnight; filter by receipt date.
  const previous = new Date(Date.parse(b.from) - 86400000).toISOString().slice(0, 10)
  try {
    for (const box of boxes) {
      const shifts = await allPages(skip => provider(event, 'webkassa', '/Shift/ExternalHistory', { CashboxUniqueNumber: box, FromDate: `${apiDate(previous)} 00:00:00`, ToDate: `${apiDate(b.to)} 23:59:59`, Skip: skip, Take: 50 }), 'Shifts')
      const seen = new Set<string>()
      for (const shiftNumber of new Set(shifts.map(x => x.ShiftNumber))) {
        if (!Number.isInteger(shiftNumber)) throw new Error('Некорректный номер смены')
        const tickets = await allPages(skip => provider(event, 'webkassa', '/v4/Ticket/ExternalHistory', { cashboxUniqueNumber: box, ShiftNumber: shiftNumber, Skip: skip, Take: 50 }), 'Items')
        for (const ticket of tickets) {
          if (!ticket.Number) throw new Error('Отсутствует номер чека')
          const key = `${shiftNumber}:${ticket.Number}`; if (seen.has(key)) continue; seen.add(key)
          const match = /^(\d{2})\.(\d{2})\.(\d{4}) \d{2}:\d{2}:\d{2}$/.exec(ticket.RegistratedOn)
          if (!match) throw new Error('Некорректная дата чека')
          const date = `${match[3]}-${match[2]}-${match[1]}`; const day = totals.get(date); if (!day) continue
          day.sum += ticketAmount(ticket, b.mode)
          if (ticket.OperationType === 2 || (ticket.OperationType === 3 && b.mode === 'net')) day.count++
        }
      }
    }
    for (const row of report.rows) { row.webkassa = totals.get(row.date)!.sum; row.tickets = totals.get(row.date)!.count }
  } catch { for (const row of report.rows) row.error = [row.error, 'Webkassa: загрузка неполная. Повторите сверку.'].filter(Boolean).join('; ') }
  return report
})
