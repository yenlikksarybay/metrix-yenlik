export default defineEventHandler(event => { setHeader(event, 'Cache-Control', 'no-store'); const s = session(event); return { metrix: !!s.metrix, webkassa: !!s.webkassa } })
