import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'
import ExcelJS from 'exceljs'
import { spawn } from 'node:child_process'
const baseURL = process.env.BASE_URL || 'http://127.0.0.1:3188'
const app = process.env.BASE_URL ? null : spawn(process.execPath, ['.output/server/index.mjs'], { env: { ...process.env, HOST: '127.0.0.1', PORT: '3188' }, stdio: 'ignore' })
let browser
try {
  for (let i = 0; i < 100; i++) { try { await fetch(baseURL + '/api/auth/status'); break } catch { await new Promise(resolve => setTimeout(resolve, 100)) } }
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } }); const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(baseURL, { waitUntil: 'networkidle' })
  assert.equal((await page.locator('h1').innerText()).replace(/\s+/g, ' '), 'Сверка выручки WORKSPACE')
  assert.equal(await page.locator('tbody tr').count(), 7)
  assert.equal(await page.locator('select').first().inputValue(), '1'); assert.equal(await page.locator('select').nth(1).inputValue(), '10')
  await page.screenshot({ path: '/tmp/metrix-desktop.png', fullPage: true })
  await page.getByRole('button', { name: /^Расхождения/ }).click(); assert.equal(await page.locator('tbody tr').count(), 3)
  await page.getByRole('button', { name: /^Совпадения/ }).click(); assert.equal(await page.locator('tbody tr').count(), 4)
  const downloadPromise = page.waitForEvent('download'); await page.getByRole('button', { name: 'Excel', exact: true }).click(); const download = await downloadPromise
  const path = await download.path(); const book = new ExcelJS.Workbook(); await book.xlsx.readFile(path); const sheet = book.worksheets[0]; assert.equal(sheet.getCell('A9').value, '2026-08-31'); assert.equal(typeof sheet.getCell('B9').value, 'number'); assert.match(sheet.getCell('A1').value, /ДЕМОНСТРАЦИОННЫЕ/); assert.equal(sheet.getCell('A16').value, 'ИТОГО')
  await page.getByRole('button', { name: /^Все дни/ }).click(); await page.getByLabel('Поиск по дате').fill('01.09'); assert.equal(await page.locator('tbody tr').count(), 1); await page.getByLabel('Поиск по дате').fill('')
  await page.getByRole('button', { name: 'Подробности за 01.09.2026' }).click(); assert.ok(await page.getByRole('dialog').isVisible()); await page.getByRole('button', { name: 'Закрыть', exact: true }).last().click()
  await page.locator('.cashbox-select summary').click(); await page.getByLabel('SWK00501677', { exact: true }).check(); await page.locator('.cashbox-select summary').click(); assert.ok(await page.getByRole('button', { name: 'Excel', exact: true }).isDisabled()); await page.getByRole('button', { name: 'Запустить сверку' }).click(); assert.ok(await page.getByRole('button', { name: 'Excel', exact: true }).isEnabled())
  await page.emulateMedia({ media: 'print' }); await page.pdf({ path: '/tmp/metrix-report.pdf', format: 'A4', landscape: true, printBackground: true }); await page.emulateMedia({ media: 'screen' })
  await page.setViewportSize({ width: 390, height: 844 }); await page.screenshot({ path: '/tmp/metrix-mobile.png', fullPage: true }); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  for (const source of ['Metrix', 'Webkassa']) {
    await page.getByRole('navigation', { name: 'Источник отчета' }).getByRole('button', { name: source, exact: true }).click()
    assert.equal(await page.locator('tbody tr').count(), 0)
    if (source === 'Webkassa') await page.getByPlaceholder('Например, SWK00507912').fill('SWK00507912, SWK00501677')
    await page.getByRole('button', { name: 'Загрузить данные', exact: true }).click()
    assert.equal(await page.locator('tbody tr').count(), 7)
    assert.equal(await page.locator('thead th').count(), source === 'Webkassa' ? 4 : 3)
    assert.equal(await page.getByRole('button', { name: /^Расхождения/ }).count(), 0)
    const singleDownload = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Excel', exact: true }).click()
    const file = await singleDownload; const singleBook = new ExcelJS.Workbook(); await singleBook.xlsx.readFile(await file.path())
    assert.equal(singleBook.worksheets[0].name, source)
    assert.equal(singleBook.worksheets[0].getCell('A16').value, 'ИТОГО')
    assert.equal(singleBook.worksheets[0].getCell('B8').value, `${source}, ₸`)
    await page.emulateMedia({ media: 'print' }); await page.pdf({ path: `/tmp/metrix-${source}-report.pdf`, format: 'A4' }); await page.emulateMedia({ media: 'screen' })
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await page.screenshot({ path: `/tmp/metrix-${source}-mobile.png`, fullPage: true })
  }
  await page.getByRole('switch').uncheck(); assert.ok(await page.getByText('Загрузите данные за выбранный период').isVisible())
  assert.deepEqual(errors, []); console.log('Browser passed: rendering, tabs, search, details, XLSX data, stale export, rerun, PDF, mobile, mode switch.')
} finally { await browser?.close(); app?.kill('SIGTERM') }
