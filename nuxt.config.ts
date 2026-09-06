export default defineNuxtConfig({
  compatibilityDate: '2026-03-01',
  css: ['~/assets/css/main.css'],
  devtools: { enabled: false },
  app: { head: { link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }], title: 'Metrix · Сверка выручки', htmlAttrs: { lang: 'ru' }, meta: [{ name: 'description', content: 'Ежедневная сверка выручки Metrix и Webkassa' }] } },
  runtimeConfig: { webkassaBase: 'https://api.webkassa.kz/api', metrixBase: 'https://api.cashier.metrix.com.ai/api/v1', webkassaApiKey: '' }
})
