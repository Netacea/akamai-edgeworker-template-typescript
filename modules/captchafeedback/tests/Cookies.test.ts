import * as tape from 'tape'
import Netacea from '../src'

tape('Cookies :: Correct cookies are returned', async t => {
  t.plan(4)
  const mitataValue = 'mitatavalue'
  const mitataExpiry = '5678'
  const mitataCaptchaValue = 'mitatacaptchavalue'
  const mitataCaptchaExpiry = '1234'
  const netacea = new Netacea({
    apiKey: 'xxx',
    makeRequest: async () => {
      return await Promise.resolve({
        headers: {
          'x-netacea-mitata-value': mitataValue,
          'x-netacea-mitatacaptcha-value': mitataCaptchaValue,
          'x-netacea-mitata-expiry': mitataExpiry,
          'x-netacea-mitatacaptcha-expiry': mitataCaptchaExpiry
        },
        status: 200
      })
    }
  })
  const { cookies } = await netacea.updateCaptcha({
    clientIp: '',
    cookieHeader: '',
    eventId: '',
    result: true,
    userAgent: ''
  })
  const mitata = cookies.find(f => f.includes('_mitata=')) ?? ''
  const mitataCaptcha = cookies.find(f => f.includes('_mitatacaptcha')) ?? ''
  t.ok(mitata.includes(mitataValue), '_mitata includes correct value')
  t.ok(mitata.includes(mitataExpiry), '_mitata includes correct expiry')
  t.ok(mitataCaptcha.includes(mitataCaptchaValue), '_mitataCaptcha includes correct value')
  t.ok(mitataCaptcha.includes(mitataCaptchaExpiry), '_mitataCaptcha includes correct expiry')
})
