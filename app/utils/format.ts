export const formatMoney = (value: number | null) => value === null ? '—' : new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value / 100)
export const formatDate = (value: string) => new Date(value + 'T12:00:00Z').toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Almaty' })
export const formatPercent = (value: number | null) => value === null ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
