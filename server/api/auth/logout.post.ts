export default defineEventHandler(event => { sameOrigin(event); const s = session(event); delete s.metrix; delete s.webkassa; return { ok: true } })
