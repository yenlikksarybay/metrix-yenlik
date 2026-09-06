import { randomBytes } from 'node:crypto'
import { getCookie, setCookie, createError, getHeader, type H3Event } from 'h3'
type Session = { metrix?: string; webkassa?: string; expires: number }
const sessions = new Map<string, Session>()
export function session(event: H3Event): Session {
  for (const [key, value] of sessions) if (value.expires < Date.now()) sessions.delete(key)
  const id = getCookie(event, 'metrix-session'); const existing = id && sessions.get(id)
  if (existing) return existing
  const key = randomBytes(32).toString('hex'); const value = { expires: Date.now() + 8 * 3600000 }
  sessions.set(key, value)
  setCookie(event, 'metrix-session', key, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 8 * 3600 })
  return value
}
export function sameOrigin(event: H3Event) {
  const origin = getHeader(event, 'origin')
  if (origin && new URL(origin).host !== getHeader(event, 'host')) throw createError({ statusCode: 403, statusMessage: 'Недопустимый источник запроса' })
}
