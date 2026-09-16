import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import assert from 'node:assert/strict'
import { once } from 'node:events'
const calls = []; let broken = false; let hourlyMode = 'direct'
const mock = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost'); let body = ''; for await (const part of req) body += part
  const data = body ? JSON.parse(body) : {}; calls.push({ path: url.pathname, data, query: url.searchParams })
  res.setHeader('Content-Type', 'application/json')
  const send = value => res.end(JSON.stringify(value))
  if (url.pathname.endsWith('/Authorize') || url.pathname.includes('/ExternalHistory')) assert.equal(req.headers['x-api-key'], 'test-required-key')
  if (url.pathname.endsWith('/Authorize')) return send({ Data: { Token: 'fake-web-token' } })
  if (url.pathname.endsWith('/auth/login')) return send({ token: 'fake-metrix-token' })
  if (url.pathname.includes('/ssp/') && req.headers.authorization !== 'Bearer fake-metrix-token') { res.statusCode = 401; return send({}) }
  if (url.pathname.endsWith('/mall')) return send({ data: [{ id: 1, name: 'Test Mall' }] })
  if (url.pathname.endsWith('/tenant')) return send({ data: [{ id: 10, name: 'Test Tenant' }] })
  if (url.pathname.endsWith('/statistic_tenant')) return send({ data: [{ cashbox_id: 1, cashbox_name: 'SWK001', main_total: '8 000.00' }, { cashbox_id: 2, cashbox_name: 'SWK002', main_total: '0.00' }] })
  if (url.pathname.endsWith('/statistic_hourly')) {
    const totals = { daily_totals: [{ date: '2026-08-31', main_count: '8 000.00' }] }
    if (hourlyMode === 'missing') return send({ data: [] })
    if (hourlyMode === 'nested') return send({ data: totals })
    if (hourlyMode === 'outer-empty') return send({ daily_totals: null, data: totals })
    if (hourlyMode === 'hours') return send({ data_hours: { '10:00': [{ date: '2026-08-31', main_count: '3 000.00' }], '11:00': [{ date: '2026-08-31', main_count: '5 000.00' }] } })
    return send(totals)
  }
  if (url.pathname.endsWith('/Shift/ExternalHistory')) return send({ Data: { Total: data.CashboxUniqueNumber === 'SWK002' ? 0 : 1, Shifts: data.CashboxUniqueNumber === 'SWK002' ? [] : [{ ShiftNumber: 226 }] } })
  if (url.pathname.endsWith('/Ticket/ExternalHistory')) {
    assert.equal(data.Token, 'fake-web-token'); assert.equal(req.headers.token, 'fake-web-token')
    if (broken) return send({ Data: { Total: 80, Items: [] } })
    return send({ Data: { Total: 80, Items: Array.from({ length: data.Skip === 0 ? 50 : 30 }, (_, i) => ({ Number: String(i + data.Skip + 1), ShiftNumber: 226, RegistratedOn: '31.08.2026 12:00:00', OperationType: 2, Total: 100 })) } })
  }
  res.statusCode = 404; send({})
})
mock.listen(0, '127.0.0.1'); await once(mock, 'listening'); const mockPort = mock.address().port
const app = spawn(process.execPath, ['.output/server/index.mjs'], { env: { ...process.env, NUXT_WEBKASSA_API_KEY: 'test-required-key', PORT: '3199', HOST: '127.0.0.1', NUXT_WEBKASSA_BASE: `http://127.0.0.1:${mockPort}/api`, NUXT_METRIX_BASE: `http://127.0.0.1:${mockPort}/api/v1` }, stdio: ['ignore', 'pipe', 'pipe'] })
let cookie = ''; const base = 'http://127.0.0.1:3199'
const request = async (path, body, extra = {}) => { const response = await fetch(base + path, { method: body ? 'POST' : 'GET', headers: { Cookie: cookie, ...(body ? { 'Content-Type': 'application/json', Origin: base } : {}), ...extra }, body: body ? JSON.stringify(body) : undefined }); const set = response.headers.get('set-cookie'); if (set) cookie = set.split(';')[0]; return { status: response.status, data: await response.json() } }
try {
  for (let i = 0; i < 100; i++) { try { await fetch(base + '/api/auth/status'); break } catch { await new Promise(r => setTimeout(r, 100)) } }
  assert.equal((await request('/api/auth/status')).data.metrix, false)
  assert.equal((await request('/api/catalog/malls')).status, 401)
  for (const service of ['metrix', 'webkassa']) assert.equal((await request('/api/auth/login', { service, login: 'test', password: 'test' })).status, 200)
  assert.deepEqual((await request('/api/auth/status')).data, { metrix: true, webkassa: true })
  assert.equal((await request('/api/catalog/malls')).data[0].name, 'Test Mall')
  const body = { mall: '1', tenant: '10', mallName: 'Test Mall', tenantName: 'Test Tenant', from: '2026-08-31', to: '2026-08-31', mode: 'net', cashboxes: ['SWK001', 'SWK002'] }
  const all = await request('/api/reconcile', body)
  assert.equal(all.status, 200); assert.equal(all.data.rows[0].webkassa, 800000); assert.equal(all.data.rows[0].metrix, 800000); assert.equal(all.data.rows[0].tickets, 80)
  assert.ok(calls.some(x => x.path.endsWith('/statistic_hourly'))); assert.ok(calls.some(x => x.data.Skip === 50))
  calls.length = 0
  const subset = await request('/api/reconcile', { ...body, cashboxes: ['SWK001'] }); assert.equal(subset.data.rows[0].metrix, 800000); assert.ok(!calls.some(x => x.path.endsWith('/statistic_hourly')))
  for (const mode of ['nested', 'outer-empty', 'hours', 'missing']) {
    hourlyMode = mode; calls.length = 0
    const recovered = await request('/api/reconcile', body)
    assert.equal(recovered.status, 200); assert.equal(recovered.data.rows[0].metrix, 800000); assert.equal(recovered.data.rows[0].error, undefined)
    if (mode === 'missing') assert.equal(calls.filter(x => x.path.endsWith('/statistic_tenant')).length, 2)
  }
  calls.length = 0
  const metrixOnly = await request('/api/reconcile', { ...body, source: 'metrix', Take: 0 })
  assert.equal(metrixOnly.status, 200); assert.equal(metrixOnly.data.rows[0].metrix, 800000); assert.equal(metrixOnly.data.rows[0].webkassa, null)
  assert.ok(!calls.some(call => call.path.includes('/ExternalHistory')))
  calls.length = 0
  const webOnly = await request('/api/reconcile', { ...body, source: 'webkassa', mall: undefined, Take: 25 })
  assert.equal(webOnly.status, 200); assert.equal(webOnly.data.rows[0].webkassa, 800000); assert.equal(webOnly.data.rows[0].metrix, null)
  assert.ok(!calls.some(call => call.path.includes('/ssp/')))
  assert.ok(calls.filter(call => call.path.endsWith('/Shift/ExternalHistory')).every(call => call.data.Take === 25))
  assert.ok(calls.filter(call => call.path.endsWith('/Ticket/ExternalHistory')).every(call => call.data.Take === 50))
  assert.equal((await request('/api/reconcile', { ...body, source: 'invalid' })).status, 400)
  broken = true
  const partial = await request('/api/reconcile', body); assert.equal(partial.data.rows[0].webkassa, null); assert.ok(partial.data.rows[0].error)
  assert.equal((await request('/api/reconcile', { ...body, to: '2027-01-01' })).status, 400)
  assert.equal((await request('/api/auth/logout', {}, { Origin: 'https://foreign.example' })).status, 403)
  await request('/api/auth/logout', {}); assert.equal((await request('/api/auth/status')).data.webkassa, false)
  broken = false
  for (const service of ['metrix', 'webkassa']) {
    await request('/api/auth/login', { service, login: 'test', password: 'test' })
    calls.length = 0
    const single = await request('/api/reconcile', { ...body, source: service, ...(service === 'webkassa' ? { mall: undefined } : {}) })
    assert.equal(single.status, 200); assert.equal(single.data.rows[0][service], 800000); assert.equal(single.data.rows[0].error, undefined)
    assert.ok(calls.every(call => service === 'metrix' ? !call.path.includes('/ExternalHistory') : !call.path.includes('/ssp/')))
    await request('/api/auth/logout', {})
  }
  console.log('Integration passed: auth, catalogs, all/subset scope, 80 receipts, nested/hourly/daily fallback, required API key, partial failure, dates, CSRF, logout.')
} finally { app.kill('SIGTERM'); mock.close() }
