import { difference, percent, type Report } from '#shared/reconciliation'
export async function exportExcel(report: Report) {
  const { default: ExcelJS } = await import('exceljs')
  const book = new ExcelJS.Workbook(); book.creator = 'Metrix'; book.created = new Date(report.createdAt)
  if (report.source && report.source !== 'both') {
    const source = report.source; const name = source === 'metrix' ? 'Metrix' : 'Webkassa'
    const sheet = book.addWorksheet(name)
    const columns = source === 'webkassa' ? 4 : 3
    sheet.columns = [{ width: 20 }, { width: 25 }, { width: source === 'webkassa' ? 16 : 65 }, ...(source === 'webkassa' ? [{ width: 65 }] : [])]
    const info = [`Выручка ${name}${report.demo ? ' • ДЕМОНСТРАЦИОННЫЕ ДАННЫЕ' : ''}`, `${report.mall} / ${report.tenant}`, `Период: ${report.from} — ${report.to}`, `Кассы: ${report.cashboxes.join(', ')}`, 'Продажи − возвраты · KZT · Asia/Almaty', `Сформирован: ${report.createdAt}. ID: ${report.id}`]
    info.forEach((value, i) => { sheet.mergeCells(i + 1, 1, i + 1, columns); sheet.getCell(i + 1, 1).value = value })
    sheet.getCell('A1').font = { size: 18, bold: true, color: { argb: 'FF245BE8' } }; sheet.getRow(1).height = 38
    sheet.addRow([])
    sheet.addRow(['Дата', `${name}, ₸`, ...(source === 'webkassa' ? ['Чеки'] : []), 'Статус'])
    sheet.getRow(8).eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF245BE8' } }; cell.font = { bold: true, color: { argb: 'FFFFFFFF' } } })
    for (const row of report.rows) {
      const value = row[source]
      const added = sheet.addRow([row.date, value === null ? null : value / 100, ...(source === 'webkassa' ? [value === null ? null : row.tickets] : []), row.error || (value === null ? 'Нет данных' : 'Загружено')])
      added.getCell(2).numFmt = '#,##0.00'
    }
    const complete = report.rows.every(row => !row.error && row[source] !== null)
    const total = sheet.addRow([complete ? 'ИТОГО' : 'НЕПОЛНЫЙ ОТЧЕТ', complete ? report.rows.reduce((sum, row) => sum + (row[source] ?? 0), 0) / 100 : null, ...(source === 'webkassa' ? [complete ? report.rows.reduce((sum, row) => sum + row.tickets, 0) : null] : [])])
    total.font = { bold: true }; total.getCell(2).numFmt = '#,##0.00'
    sheet.views = [{ state: 'frozen', ySplit: 8 }]; sheet.autoFilter = { from: { row: 8, column: 1 }, to: { row: 8 + report.rows.length, column: columns } }
  } else {
  const sheet = book.addWorksheet('Сверка по дням')
  sheet.columns = [{ width: 18 }, { width: 24 }, { width: 24 }, { width: 22 }, { width: 16 }, { width: 18 }, { width: 65 }]
  sheet.mergeCells('A1:G1'); sheet.getCell('A1').value = `METRIX — Сверка выручки${report.demo ? ' • ДЕМОНСТРАЦИОННЫЕ ДАННЫЕ' : ''}`
  sheet.getCell('A1').font = { size: 18, bold: true, color: { argb: 'FF245BE8' } }; sheet.getRow(1).height = 38
  const info = [`${report.mall} / ${report.tenant}`, `Период: ${report.from} — ${report.to}. Кассы: ${report.cashboxes.join(', ')}`, `Расчет: ${report.mode === 'net' ? 'продажи минус возвраты' : 'продажи'}. Валюта: KZT. Дата чека: Asia/Almaty.`, 'Разница = Webkassa − Metrix; % = разница / |Metrix| × 100. При нулевой базе процент не определен.', `Сформирован: ${report.createdAt}. ID: ${report.id}`]
  info.forEach((s, i) => { sheet.mergeCells(i + 2, 1, i + 2, 7); sheet.getCell(i + 2, 1).value = s })
  sheet.addRow([]); sheet.addRow(['Дата', 'Metrix, ₸', 'Webkassa, ₸', 'Разница, ₸', 'Разница, %', 'Чеки', 'Статус'])
  const header = sheet.getRow(8); header.height = 28; header.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF245BE8' } }; cell.font = { bold: true, color: { argb: 'FFFFFFFF' } } })
  for (const r of report.rows) {
    const d = difference(r); const p = percent(r)
    const row = sheet.addRow([r.date, r.metrix === null ? null : r.metrix / 100, r.webkassa === null ? null : r.webkassa / 100, d === null ? null : d / 100, p === null ? null : p / 100, r.webkassa === null ? null : r.tickets, r.error || (d === null ? 'Нет данных' : d === 0 ? 'Совпадает' : 'Расхождение')])
    for (const n of [2, 3, 4]) row.getCell(n).numFmt = '#,##0.00'; row.getCell(5).numFmt = '0.00%'
    if (d !== 0 || r.error) row.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF0E8' } } })
  }
  const complete = report.rows.every(r => !r.error && difference(r) !== null)
  const metrix = report.rows.reduce((s, r) => s + (r.metrix || 0), 0); const web = report.rows.reduce((s, r) => s + (r.webkassa || 0), 0)
  const total = sheet.addRow([complete ? 'ИТОГО' : 'НЕПОЛНЫЙ ОТЧЕТ', complete ? metrix / 100 : null, complete ? web / 100 : null, complete ? (web - metrix) / 100 : null, complete && metrix !== 0 ? (web - metrix) / Math.abs(metrix) : null]); total.font = { bold: true }; [2, 3, 4].forEach(n => total.getCell(n).numFmt = '#,##0.00'); total.getCell(5).numFmt = '0.00%'
  sheet.views = [{ state: 'frozen', ySplit: 8 }]; sheet.autoFilter = `A8:G${8 + report.rows.length}`
  }
  const buffer = await book.xlsx.writeBuffer(); const url = URL.createObjectURL(new Blob([buffer as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })); const a = document.createElement('a'); a.href = url; a.download = `${report.source === 'webkassa' ? 'Webkassa' : 'Metrix'}_${report.demo ? 'DEMO_' : ''}${report.from}_${report.to}.xlsx`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
