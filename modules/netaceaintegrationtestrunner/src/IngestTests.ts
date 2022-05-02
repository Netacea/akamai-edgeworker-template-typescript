/**
 * LEGACY TEST FRAMEWORK
 * Refer to README.md for a guide on implementing new tests.
*/

import * as sinon from 'sinon'
import { TransformRequestArgs, buildMitata, StubXhrCallArgs } from '../src'
import * as tape from 'tape'
import NetaceaBase, { MakeRequestArgs, NetaceaMitigationType } from '@netacea/netaceaintegrationbase'
import { apiKey } from './MitigationTests'

const ipAddress = '255.255.255.255'
const userAgent = 'user-agent'
const ingestTestsSecret = 'ingest-tests-secret'
const mitata = {
  valid: buildMitata({
    expiry: 1601993684,
    userId: 'm123456789abcdef',
    type: '000',
    secret: ingestTestsSecret
  }),
  ipBlocked: buildMitata({
    expiry: 1601993604,
    userId: 'm123456789abcdef',
    type: '210',
    secret: ingestTestsSecret
  })
}

export interface StubIngestXhrCallArgs {
  status: 200
}

export interface RunIngestTestArgs<T> {
  tape: tape.Test
  createWorker: (args: any, xhrArgs?: StubXhrCallArgs) => NetaceaBase
  transformRequest: (request: TransformRequestArgs, response: TransformResponseArgs, worker: NetaceaBase) => any[]
  transformResponse: (response?: T) => any
  stubXhrCalls: (args: StubIngestXhrCallArgs) => sinon.SinonSandbox | undefined
  usesMakeRequest?: boolean
  customAssertions?: (t: tape.Test, scenario: IngestScenario, runTest: () => Promise<any>) => Promise<void>
}
export interface TransformResponseArgs {
  status: number
  headers: {[key: string]: string}
  body?: any
}
const ingestExpectedHeaders = {
  'X-Netacea-API-Key': apiKey,
  'content-type': 'application/json'
}
export interface IngestScenario {
  xhrArgs?: StubIngestXhrCallArgs
  request: TransformRequestArgs
  response: TransformResponseArgs
  expectedMakeRequestArgs: MakeRequestArgs
  comment: string
}

// eslint-disable-next-line
const ingestScenarios = (): IngestScenario[] => [
  {
    comment: 'Ingest - 1',
    xhrArgs: {
      status: 200
    },
    expectedMakeRequestArgs: {
      headers: ingestExpectedHeaders,
      host: 'https://ingest.netacea.net',
      method: 'POST',
      path: '/',
      body: {
        BytesSent: '100',
        NetaceaMitigationApplied: '',
        NetaceaUserIdCookie: '',
        RealIp: ipAddress,
        Referer: '-',
        Request: 'GET / HTTP/1.0',
        RequestTime: '0',
        Status: '200',
        TimeLocal: new Date().toUTCString(),
        UserAgent: userAgent
      }
    },
    response: {
      headers: {
        'content-length': '100'
      },
      status: 200
    },
    request: {
      protocol: 'HTTP/1.0',
      ipAddress,
      method: 'GET',
      url: '/',
      userAgent
    }
  },
  {
    comment: 'Ingest - 2',
    xhrArgs: {
      status: 200
    },
    expectedMakeRequestArgs: {
      headers: ingestExpectedHeaders,
      host: 'https://ingest.netacea.net',
      method: 'POST',
      path: '/',
      body: {
        BytesSent: '100000',
        NetaceaMitigationApplied: '',
        NetaceaUserIdCookie: '',
        RealIp: ipAddress,
        Referer: '/Referer-url',
        Request: 'POST /URL HTTP/1.1',
        RequestTime: '0',
        Status: '400',
        TimeLocal: new Date().toUTCString(),
        UserAgent: userAgent
      }
    },
    response: {
      headers: {
        'content-length': '100000'
      },
      status: 400
    },
    request: {
      headers: {
        referer: '/Referer-url'
      },
      protocol: 'HTTP/1.1',
      ipAddress,
      method: 'POST',
      url: '/URL',
      userAgent
    }
  },
  {
    comment: 'Ingest - 3 Valid cookie provided',
    xhrArgs: {
      status: 200
    },
    expectedMakeRequestArgs: {
      headers: ingestExpectedHeaders,
      host: 'https://ingest.netacea.net',
      method: 'POST',
      path: '/',
      body: {
        BytesSent: '100000',
        NetaceaMitigationApplied: '',
        NetaceaUserIdCookie: mitata.valid,
        RealIp: ipAddress,
        Referer: '/Referer-url',
        Request: 'POST /URL HTTP/1.1',
        RequestTime: '0',
        Status: '400',
        TimeLocal: new Date().toUTCString(),
        UserAgent: userAgent
      }
    },
    response: {
      headers: {
        'content-length': '100000'
      },
      status: 400
    },
    request: {
      headers: {
        referer: '/Referer-url'
      },
      cookieHeader: `_mitata=${mitata.valid}`,
      protocol: 'HTTP/1.1',
      ipAddress,
      method: 'POST',
      url: '/URL',
      userAgent
    }
  },
  {
    comment: 'Ingest - 4 Blocked cookie provided',
    xhrArgs: {
      status: 200
    },
    expectedMakeRequestArgs: {
      headers: ingestExpectedHeaders,
      host: 'https://ingest.netacea.net',
      method: 'POST',
      path: '/',
      body: {
        BytesSent: '100000',
        NetaceaMitigationApplied: 'ip_blocked',
        NetaceaUserIdCookie: mitata.ipBlocked,
        RealIp: ipAddress,
        Referer: '/Referer-url',
        Request: 'POST /URL HTTP/1.1',
        RequestTime: '0',
        Status: '400',
        TimeLocal: new Date().toUTCString(),
        UserAgent: userAgent
      }
    },
    response: {
      headers: {
        'content-length': '100000'
      },
      status: 400
    },
    request: {
      headers: {
        referer: '/Referer-url'
      },
      cookieHeader: `_mitata=${mitata.ipBlocked}`,
      protocol: 'HTTP/1.1',
      ipAddress,
      method: 'POST',
      url: '/URL',
      userAgent
    }
  },
  {
    comment: 'Ingest - 5 Mitigations provided cookie',
    xhrArgs: {
      status: 200
    },
    expectedMakeRequestArgs: {
      headers: ingestExpectedHeaders,
      host: 'https://ingest.netacea.net',
      method: 'POST',
      path: '/',
      body: {
        BytesSent: '100000',
        NetaceaMitigationApplied: 'ip_blocked',
        NetaceaUserIdCookie: mitata.ipBlocked,
        RealIp: ipAddress,
        Referer: '/Referer-url',
        Request: 'POST /URL HTTP/1.1',
        RequestTime: '0',
        Status: '400',
        TimeLocal: new Date().toUTCString(),
        UserAgent: userAgent
      }
    },
    response: {
      headers: {
        'content-length': '100000',
        'set-cookie': `_mitata=${mitata.ipBlocked}; Max-Age=86400; Path=/;`
      },
      status: 400
    },
    request: {
      headers: {
        referer: '/Referer-url'
      },
      protocol: 'HTTP/1.1',
      ipAddress,
      method: 'POST',
      url: '/URL',
      userAgent
    }
  }
]
// eslint-disable-next-line
export function runIngestTests<T> ({
  tape, createWorker, transformRequest, stubXhrCalls, usesMakeRequest,
  customAssertions
}: RunIngestTestArgs<T>): void {
  if (usesMakeRequest === undefined) {
    usesMakeRequest = true
  }
  // This is important so we don't need to rebuild cookies
  sinon.useFakeTimers(1601993624000)
  for (const scenario of ingestScenarios()) {
    const { xhrArgs, request, response, expectedMakeRequestArgs, comment } = scenario
    tape.test(comment, async (t: tape.Test): Promise<void> => {
      const worker = createWorker({
        mitigationType: NetaceaMitigationType.INGEST,
        secretKey: 'some-secret-key'
      }, xhrArgs)
      const runTest = async (): Promise<void> => await worker.ingest(...transformRequest(request, response, worker))
      let stub: sinon.SinonSandbox | undefined
      if (xhrArgs !== undefined) {
        stub = stubXhrCalls(xhrArgs)
      }
      if (usesMakeRequest === true) {
        // @ts-ignore
        const makeRequestSpy = sinon.spy(worker, 'makeRequest')
        t.plan(3)
        await runTest()
        t.equals(makeRequestSpy.callCount, 1, 'Expects makeRequest to be called once')
        const makeRequestArgs = makeRequestSpy.firstCall.args[0] as unknown as MakeRequestArgs
        if (process.env.CDN === 'AKAMAI') {
          expectedMakeRequestArgs.headers['X-Netacea-ProxyPass'] = 'ingest'
        }
        t.deepEquals(makeRequestArgs.headers, expectedMakeRequestArgs.headers, 'Expects correct apiKey')
        const workerName = worker.constructor.name.toLowerCase()
        const workerVersion = require(`@netacea/${workerName}/package.json`).version
        const expectedMakeRequestBody = {
          ...expectedMakeRequestArgs.body,
          IntegrationType: workerName,
          IntegrationVersion: workerVersion
        }

        t.deepEquals(JSON.parse(makeRequestArgs.body), expectedMakeRequestBody, 'Expects correct body')
        makeRequestSpy.restore()
      } else {
        if (customAssertions === undefined) {
          throw new Error('If usesMakeRequest is false, customAssertions function must be provided')
        }
        await customAssertions(t, scenario, runTest)
      }
      stub?.restore()
    })
  }
}
