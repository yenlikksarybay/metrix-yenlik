export async function allPages(fetchPage: (skip: number) => Promise<any>, field: string) {
  const items: any[] = []; let total = Infinity
  while (items.length < total) {
    const response = await fetchPage(items.length); const data = response.Data
    if (!data || !Array.isArray(data[field]) || !Number.isInteger(data.Total) || data.Total < 0) throw new Error('Некорректная пагинация Webkassa')
    if (total !== Infinity && total !== data.Total) throw new Error('Данные Webkassa изменились во время загрузки. Повторите сверку.')
    total = data.Total
    if (total > 100000) throw new Error('Слишком большой объем данных. Сократите период.')
    if (!data[field].length && items.length < total) throw new Error('Webkassa вернула неполную страницу')
    items.push(...data[field])
    if (items.length > total) throw new Error('Webkassa вернула противоречивое количество записей')
  }
  return items
}
