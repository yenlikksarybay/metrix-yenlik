export type DayRow = { date: string; metrix: number | null; webkassa: number | null; tickets: number; error?: string }
export type Report = { id: string; createdAt: string; demo: boolean; mall: string; tenant: string; cashboxes: string[]; from: string; to: string; mode: string; rows: DayRow[] }
export function money(value: unknown): number {
  if (typeof value !== 'string' && typeof value !== 'number') throw new Error('Отсутствует сумма в ответе API');
  const normalized = String(value).replace(/[\s\u00a0\u202f]/g, '').replace(',', '.');
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) throw new Error('Неизвестный формат денежной суммы');
  const result = Math.round(Number(normalized) * 100);
  if (!Number.isSafeInteger(result)) throw new Error('Сумма вне допустимого диапазона');
  return result;
}
export function daysBetween(from: string, to: string): string[] {
  const valid = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;
  if (!valid(from) || !valid(to) || from > to) throw new Error('Укажите корректный период');
  const count = (Date.parse(to) - Date.parse(from)) / 86400000 + 1;
  if (count > 31) throw new Error('Выберите период не более 31 дня');
  return Array.from({ length: count }, (_, i) => new Date(Date.parse(from) + i * 86400000).toISOString().slice(0, 10));
}
export function difference(row: DayRow) { return row.metrix === null || row.webkassa === null ? null : row.webkassa - row.metrix }
export function percent(row: DayRow) { const delta = difference(row); return delta === null || row.metrix === null || (row.metrix === 0 && delta !== 0) ? null : row.metrix === 0 ? 0 : delta / Math.abs(row.metrix) * 100 }
export function ticketAmount(ticket: { Total: unknown; OperationType: number }, mode: string) {
  if (![0, 1, 2, 3].includes(ticket.OperationType)) throw new Error('Неизвестный тип операции Webkassa');
  if (ticket.OperationType === 2) return money(ticket.Total);
  if (ticket.OperationType === 3 && mode === 'net') return -money(ticket.Total);
  return 0;
}
export function demoReport(from: string, to: string, mall: string, tenant: string, cashboxes: string[], mode: string): Report {
  return { id: 'DEMO-001', createdAt: new Date().toISOString(), demo: true, mall, tenant, cashboxes, from, to, mode, rows: daysBetween(from, to).map((date, i) => {
    const metrix = (184200 + ((i * 37913) % 220000)) * 100 * cashboxes.length;
    return { date, metrix, webkassa: metrix + (i % 5 === 1 ? 1250000 : i % 5 === 3 ? -680000 : 0), tickets: 74 + i * 9 };
  }) };
}

/** Accept both the legacy daily_totals array and a complete Metrix response. */
export function dailyMetrix(data: unknown, dates: string[]): Map<string, number | null> {
  return metrixDailyResponse(Array.isArray(data) ? { daily_totals: data } : data, dates)
}

/** Accept known Metrix envelopes; an absent or incomplete day stays unknown. */
export function metrixDailyResponse(response: unknown, dates: string[]): Map<string, number | null> {
  const unknown = () => new Map<string, number | null>(dates.map(date => [date, null]))
  let data: any = response
  for (let depth = 0; depth < 4; depth++) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return unknown()
    const hasTotals = Array.isArray(data.daily_totals) && data.daily_totals.length > 0
    const hasHours = data.data_hours && typeof data.data_hours === 'object' && !Array.isArray(data.data_hours) && Object.keys(data.data_hours).length > 0
    if (hasTotals || hasHours) break
    data = data.data ?? data.Data
  }
  if (!data || typeof data !== 'object') return unknown()
  const result = unknown()
  const totals = Array.isArray(data.daily_totals) ? data.daily_totals : []
  const hours = data.data_hours && typeof data.data_hours === 'object' && !Array.isArray(data.data_hours) ? Object.entries(data.data_hours) : []
  for (const date of dates) {
    const daily = totals.filter((row: any) => row?.date === date)
    if (daily.length === 1) {
      try { result.set(date, money(daily[0].main_count)); continue } catch { /* Try the independent hourly breakdown. */ }
    }
    if (!hours.length) continue
    let sum = 0
    let complete = true
    for (const [hour, records] of hours) {
      if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(hour) || !Array.isArray(records)) { complete = false; break }
      const matches = records.filter((row: any) => row?.date === date)
      if (matches.length !== 1 || (matches[0].hour !== undefined && matches[0].hour !== hour)) { complete = false; break }
      try {
        const row = matches[0]
        const amount = money(row.main_count ?? row.main_count2)
        if (row.main_count != null && row.main_count2 != null && amount !== money(row.main_count2)) throw new Error('Несогласованная сумма часа')
        sum += amount
      } catch { complete = false; break }
    }
    if (complete && Number.isSafeInteger(sum)) result.set(date, sum)
  }
  return result
}
