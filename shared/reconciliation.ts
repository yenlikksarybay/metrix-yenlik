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

export function dailyMetrix(data: unknown, dates: string[]): Map<string, number | null> {
  if (!Array.isArray(data)) throw new Error('В ответе Metrix отсутствует daily_totals');
  return new Map(dates.map(date => {
    const matches = data.filter(x => x?.date === date);
    return [date, matches.length === 1 ? money(matches[0].main_count) : null];
  }));
}
