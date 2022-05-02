import NetaceaBase, {
  MakeRequestArgs,
  MakeRequestResponse,
  MitigateResponse,
  ComposeResultResponse,
  IngestArgs
} from '../src'
import * as sinon from 'sinon'
import * as tape from 'tape'

class AbstractedBase extends NetaceaBase {
  async makeRequest (args: MakeRequestArgs): Promise<MakeRequestResponse> {
    return await Promise.reject(new Error('Method not implemented.'))
  }

  // eslint-disable-next-line @typescript-eslint/promise-function-async
  mitigate (...args: any[]): Promise<MitigateResponse<any>> {
    throw new Error('Method not implemented.')
  }

  // eslint-disable-next-line @typescript-eslint/promise-function-async
  ingest (...args: any[]): Promise<any> {
    throw new Error('Method not implemented.')
  }

  // eslint-disable-next-line @typescript-eslint/promise-function-async
  inject (...args: any[]): Promise<any> {
    throw new Error('Method not implemented.')
  }

  getCookieHeader (args: any): string | null {
    throw new Error('Method not implemented.')
  }

  public async callProtectedIngest (args: IngestArgs): Promise<void> {
    return await this.callIngest(args)
  }

  public async callCheck (netaceaCookie: string | undefined,
    clientIP: string,
    userAgent: string,
    captchaCookie?: string): Promise<ComposeResultResponse> {
    return await this.check(netaceaCookie, clientIP, userAgent, captchaCookie)
  }

  public getRetries (): number {
    return this.retries
  }

  public getTimeout (): number {
    return this.timeout
  }
}

tape('NetaceaBase :: throws error on undefined apiKey', (t: tape.Test) => {
  t.plan(1)
  try {
    // eslint-disable-next-line no-new
    new AbstractedBase({
      // @ts-ignore
      apiKey: undefined
    })
  } catch (err) {
    t.equals(err.message, 'apiKey is a required parameter', 'Expects correct error message')
  }
})

tape('NetaceaBase :: throws error on null apiKey', (t: tape.Test) => {
  t.plan(1)
  try {
    // eslint-disable-next-line no-new
    new AbstractedBase({
      // @ts-ignore
      apiKey: null
    })
  } catch (err) {
    t.equals(err.message, 'apiKey is a required parameter', 'Expects correct error message')
  }
})

tape('NetaceaBase :: doesn\'t throw error if apiKey is provided', (t: tape.Test) => {
  t.plan(1)
  try {
    // eslint-disable-next-line no-new
    new AbstractedBase({
      apiKey: 'apiKey'
    })
    t.pass('Error not thrown')
  } catch (e) {
    t.notOk(e, 'Error thrown')
  }
})

tape('NetaceaBase :: retries set to value if greater than 0', (t: tape.Test) => {
  t.plan(1)
  const retries = 3
  const base = new AbstractedBase({
    apiKey: 'apiKey',
    retries
  })
  t.equals(retries, base.getRetries(), 'Expects retries to be correct')
})

tape('NetaceaBase :: retries set to 5 if greater than maxRetries (5)', (t: tape.Test) => {
  t.plan(1)
  const retries = 6
  const base = new AbstractedBase({
    apiKey: 'apiKey',
    retries
  })
  t.equals(5, base.getRetries(), 'Expects retries to be correct')
})

tape('NetaceaBase :: retries set to 1 if less than 1', (t: tape.Test) => {
  t.plan(1)
  const retries = 0
  const base = new AbstractedBase({
    apiKey: 'apiKey',
    retries
  })
  t.equals(1, base.getRetries(), 'Expects retries to be correct')
})

tape('NetaceaBase :: timeout set to value if greater than 0', (t: tape.Test) => {
  t.plan(1)
  const timeout = 3
  const base = new AbstractedBase({
    apiKey: 'apiKey',
    timeout
  })
  t.equals(base.getTimeout(), timeout, 'Expects timeout to be correct')
})

tape('NetaceaBase :: timeout set to default if less than 1', (t: tape.Test) => {
  t.plan(1)
  const timeout = 0
  const base = new AbstractedBase({
    apiKey: 'apiKey',
    timeout
  })
  t.equals(base.getTimeout(), 3000, 'Expects timeout to be correct')
})

tape('NetaceaBase :: mitigationServiceUrl is respected', async (t: tape.Test) => {
  t.plan(2)
  const mitSvcUrl = 'https://test.com'
  const base = new AbstractedBase({
    apiKey: 'apiKey',
    mitigationServiceUrl: mitSvcUrl,
    secretKey: 'super secret'
  })
  const spy = sinon.spy(base, 'makeRequest')
  try {
    await base.callCheck(undefined, '', '')
  } catch (e) {
    // will throw error because AbstractedBase makes it
    t.equals(spy.callCount, 1, 'Expects makeRequest to be called once')
    t.equals(spy.firstCall.args[0].host, mitSvcUrl, 'Expects correct host')
  } finally {
    spy.restore()
  }
})

tape('NetaceaBase :: ingestServiceUrl is respected', async (t: tape.Test) => {
  t.plan(2)
  const ingestSvcUrl = 'https://test.com'
  const base = new AbstractedBase({
    apiKey: 'apiKey',
    ingestServiceUrl: ingestSvcUrl,
    secretKey: 'super secret'
  })
  const spy = sinon.spy(base, 'makeRequest')
  try {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    await base.callProtectedIngest({} as IngestArgs)
  } catch (e) {
    // will throw error because AbstractedBase makes it
    t.equals(spy.callCount, 1, 'Expects makeRequest to be called once')
    t.equals(spy.firstCall.args[0].host, ingestSvcUrl, 'Expects correct host')
  } finally {
    spy.restore()
  }
})
