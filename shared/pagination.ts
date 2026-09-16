export async function allPages(fetchPage: (skip: number) => Promise<any>, field: string, initialSkip = 0) {
  const items: any[] = []; let total = Infinity
  while (items.length < total) {
    const response = await fetchPage(initialSkip + items.length); const data = response.Data
    if (!data || !Array.isArray(data[field]) || !Number.isInteger(data.Total) || data.Total < 0) throw new Error('Некорректная пагинация Webkassa')
    if (total !== Infinity && total !== Math.max(0, data.Total - initialSkip)) throw new Error('Данные Webkassa изменились во время загрузки. Повторите сверку.')
    total = Math.max(0, data.Total - initialSkip)
    if (total > 100000) throw new Error('Слишком большой объем данных. Сократите период.')
    if (!data[field].length && items.length < total) throw new Error('Webkassa вернула неполную страницу')
    items.push(...data[field])
    if (items.length > total) throw new Error('Webkassa вернула противоречивое количество записей')
  }
  return items
}
