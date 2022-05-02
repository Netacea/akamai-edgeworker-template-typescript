import * as tape from 'tape'
import Netacea, { MakeRequestArgs } from '../src/'

tape('Constructor :: Throws error is apiKey is undefined', t => {
  t.plan(1)
  try {
    // eslint-disable-next-line no-new
    new Netacea({
      // @ts-ignore
      apiKey: undefined
    })
  } catch (e) {
    const _err: Error = e as Error
    t.equals(_err.message, 'Netacea: apiKey is a required parameter')
  }
})

tape('Constructor :: Throws error is apiKey is null', t => {
  t.plan(1)
  try {
    // eslint-disable-next-line no-new
    new Netacea({
      // @ts-ignore
      apiKey: null
    })
  } catch (e) {
    const _err: Error = e as Error
    t.equals(_err.message, 'Netacea: apiKey is a required parameter')
  }
})

tape('Constructor :: Uses mitigationUrl if provided', async t => {
  const mitigationServiceUrl = 'MITIGATIONSERVICEURL'
  t.plan(1)
  // eslint-disable-next-line no-new
  const netacea = new Netacea({
    // @ts-ignore
    apiKey: 'apikey',
    mitigationServiceUrl,
    makeRequest: async (args: MakeRequestArgs) => {
      t.equals(args.url, `${mitigationServiceUrl}/UpdateCaptcha`, 'Correct URL provided')
      return await Promise.resolve({
        headers: {},
        status: 200
      })
    }
  })
  await netacea.updateCaptcha({
    clientIp: '',
    cookieHeader: '',
    eventId: '',
    result: true,
    userAgent: ''
  })
  t.end()
})
