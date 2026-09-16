import { test } from 'node:test'
import assert from 'node:assert/strict'
import { money, daysBetween, difference, percent, ticketAmount } from '../shared/reconciliation.ts'
test('money parses Metrix grouped totals precisely', () => { assert.equal(money('1 285 059.00'), 128505900); assert.equal(money('1\u202f181,25'), 118125); assert.equal(money(0.29), 29); assert.throws(() => money(null)); assert.throws(() => money('')); assert.throws(() => money('abc')) })
test('inclusive dates cross month and reject invalid and oversized ranges', () => { assert.deepEqual(daysBetween('2026-08-31', '2026-09-01'), ['2026-08-31', '2026-09-01']); assert.throws(() => daysBetween('2026-02-30', '2026-03-01')); assert.throws(() => daysBetween('2026-09-02', '2026-09-01')); assert.throws(() => daysBetween('2026-01-01', '2026-03-01')) })
test('difference has explicit direction and missing values never become zero', () => { const r = { date: '', metrix: 10000, webkassa: 12000, tickets: 0 }; assert.equal(difference(r), 2000); assert.equal(percent(r), 20); assert.equal(difference({ ...r, metrix: null }), null); assert.equal(percent({ ...r, metrix: 0 }), null); assert.equal(percent({ ...r, metrix: 0, webkassa: 0 }), 0) })
test('sales, returns and purchase operations have distinct effects', () => { assert.equal(ticketAmount({ Total: 1181, OperationType: 2 }, 'net'), 118100); assert.equal(ticketAmount({ Total: 1181, OperationType: 3 }, 'net'), -118100); assert.equal(ticketAmount({ Total: 1181, OperationType: 3 }, 'sales'), 0); assert.equal(ticketAmount({ Total: 1181, OperationType: 0 }, 'net'), 0); assert.throws(() => ticketAmount({ Total: 1181, OperationType: 99 }, 'net')) })

import { dailyMetrix } from '../shared/reconciliation.ts'
import { allPages } from '../shared/pagination.ts'
test('provided daily_totals structure preserves a real zero and missing day', () => {
  const daily = dailyMetrix([{ date: '2026-08-31', main_count: '1 285 059.00' }, { date: '2026-09-06', main_count: '0.00' }], ['2026-08-31', '2026-09-01', '2026-09-06'])
  assert.equal(daily.get('2026-08-31'), 128505900); assert.equal(daily.get('2026-09-06'), 0); assert.equal(daily.get('2026-09-01'), null)
})
test('pagination fetches remaining 30 receipts after the first 50', async () => {
  const skips: number[] = []
  const data = await allPages(async skip => { skips.push(skip); return { Data: { Total: 80, Items: Array.from({ length: skip === 0 ? 50 : 30 }, (_, i) => skip + i) } } }, 'Items')
  assert.deepEqual(skips, [0, 50]); assert.equal(data.length, 80); assert.equal(data[79], 79)
})
test('pagination rejects a truncated dataset and accepts an actual empty set', async () => {
  await assert.rejects(allPages(async () => ({ Data: { Total: 80, Items: [] } }), 'Items'), /неполную/)
  assert.deepEqual(await allPages(async () => ({ Data: { Total: 0, Items: [] } }), 'Items'), [])
})

test('pagination rejects totals changing during a report', async () => {
  await assert.rejects(allPages(async skip => ({ Data: { Total: skip === 0 ? 80 : 81, Items: Array.from({ length: 50 }, (_, i) => skip + i) } }), 'Items'), /изменились/)
})

import { metrixDailyResponse } from '../shared/reconciliation.ts'
test('Metrix daily totals work at top level and inside data envelopes', () => {
  const payload = { daily_totals: [{ date: '2026-08-31', main_count: '1 285 059.00' }] }
  for (const response of [payload, { data: payload }, { Data: payload }, { data: { data: payload } }]) assert.equal(metrixDailyResponse(response, ['2026-08-31']).get('2026-08-31'), 128505900)
})
test('Metrix without daily_totals aggregates hours without counting the formatted and numeric fields twice', () => {
  const response = { data_hours: { '10:00': [{ date: '2026-08-31', hour: '10:00', main_count: '21 760.00', main_count2: 21760 }], '11:00': [{ date: '2026-08-31', main_count: '5 578.00' }] } }
  assert.equal(metrixDailyResponse(response, ['2026-08-31']).get('2026-08-31'), 2733800)
})
test('missing, incomplete, duplicate and conflicting hourly results require fallback rather than zero', () => {
  for (const response of [{}, { data_hours: {} }, { data_hours: { '10:00': [{ date: '2026-08-31', main_count: '1.00' }], '11:00': [] } }, { data_hours: { '10:00': [{ date: '2026-08-31', main_count: '1.00', main_count2: 2 }] } }, { daily_totals: [{ date: '2026-08-31', main_count: 1 }, { date: '2026-08-31', main_count: 2 }] }]) assert.equal(metrixDailyResponse(response, ['2026-08-31']).get('2026-08-31'), null)
  assert.equal(metrixDailyResponse({ data_hours: { '10:00': [{ date: '2026-08-31', main_count: '0.00' }] } }, ['2026-08-31']).get('2026-08-31'), 0)
})

test('legacy dailyMetrix no longer throws when daily_totals is absent', () => {
  for (const payload of [undefined, null, {}, [], { data: [] }, { daily_totals: null }]) {
    assert.equal(dailyMetrix(payload, ['2026-08-31']).get('2026-08-31'), null)
  }
  assert.equal(dailyMetrix({ data: { daily_totals: [{ date: '2026-08-31', main_count: '8 000.00' }] } }, ['2026-08-31']).get('2026-08-31'), 800000)
})
test('empty outer totals do not hide valid nested statistics', () => {
  for (const daily_totals of [null, [], {}]) {
    const result = dailyMetrix({ daily_totals, data: { daily_totals: [{ date: '2026-08-31', main_count: '0.00' }] } }, ['2026-08-31'])
    assert.equal(result.get('2026-08-31'), 0)
  }
})

test('shift pagination starts at a custom offset and loads remaining pages', async () => {
  const shifts = Array.from({ length: 7 }, (_, ShiftNumber) => ({ ShiftNumber }))
  const offsets: number[] = []
  const result = await allPages(async skip => {
    offsets.push(skip)
    return { Data: { Total: shifts.length, Shifts: shifts.slice(skip, skip + 2) } }
  }, 'Shifts', 2)
  assert.deepEqual(offsets, [2, 4, 6])
  assert.deepEqual(result, shifts.slice(2))
  assert.deepEqual(await allPages(async () => ({ Data: { Total: 7, Shifts: [] } }), 'Shifts', 10), [])
})
