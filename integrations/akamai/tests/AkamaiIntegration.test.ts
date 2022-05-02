import {
  apiKey,
  runIntegrationTests,
  RunWorkerArgs,
  RunWorkerResult,
  HttpResponse,
  HttpRequest,
  ClientRequest,
  scenarios
} from '@netacea/netaceaintegrationtestrunner'
import { NetaceaMitigationType, NetaceaIngestType } from '@netacea/netaceaintegrationbase'
import Akamai, { ResponseProperties } from '../src/Akamai'
import { createIngressClientRequestMock, IngressClientRequestMock } from './mocks/IngressClientRequestMock'
import { createEgressClientResponseMock, EgressClientResponseMock } from './mocks/EgressClientResponseMock'
import type { HttpResponse as AkamaiHttpResponse } from 'http-request'
import tape from 'tape'
import sinon from 'sinon'
import proxyquire from 'proxyquire'

interface CreateStubbedWorkerArgs {
  workerArgs: any
  mitSvcResponse?: HttpResponse | Error
  ingestSvcResponse?: Error
}

function getUrlFromProxyPassHeader (proxyPassHeader: string[] | undefined): string {
  const unique = new Set(proxyPassHeader ?? [])
  if (unique.size === 0) {
    throw new Error('No ProxyPass set!')
  }
  if (unique.size > 1) {
    throw new Error(`Ambiguous ProxyPass setting ${String(unique)}`)
  }
  const proxyPassValue = Array.from(unique)[0]
  if (proxyPassValue === 'mitigation') {
    return 'https://mitigations.netacea-uat.net'
  } else if (proxyPassValue === 'ingest') {
    return 'https://ingest.netacea-uat.net'
  }
  throw new Error(`Unknown proxyPass value! ${proxyPassValue}`)
}

function transformHttpRequestsMade (stubbedHttp: sinon.SinonStub): HttpRequest[] {
  return stubbedHttp.getCalls().map(call => {
    const [path, options] = call.args as [ string, AkamaiHttpRequestOptions]

    if (options.method === undefined || !(options.method === 'GET' || options.method === 'POST')) {
      throw new Error(`Http method cannot be ${String(options.method)}!`)
    }

    const headers = {}
    for (const [name, value] of Object.entries(options.headers ?? {})) {
      headers[name] = Array.isArray(value) ? value : [value]
    }

    const request: HttpRequest = {
      url: getUrlFromProxyPassHeader(headers['X-Netacea-ProxyPass']) + path,
      method: options.method,
      headers,
      body: options.body ?? ''
    }
    return request
  })
}

function getResolveObject (mitSvcResponse: HttpResponse): AkamaiHttpResponse {
  return {
    status: mitSvcResponse.status,
    ok: mitSvcResponse.status < 300,
    body: undefined as any, // too complex to mock ReadableStream unless we really need it
    text: async () => mitSvcResponse.body ?? '', // eslint-disable-line @typescript-eslint/require-await
    json: async () => JSON.parse(mitSvcResponse.body ?? '{}'), // eslint-disable-line @typescript-eslint/require-await
    getHeaders: () => {
      return mitSvcResponse.headers
    },
    getHeader: (name: string) => {
      return mitSvcResponse.headers?.[name.toLowerCase()]
    }
  }
}

function createHttpRequestModuleStub (
  mitSvcResponse: HttpResponse | Error | undefined,
  ingestSvcResponse: Error | undefined
): sinon.SinonStub {
  return sinon.stub()
    .callsFake((path, options) => {
      const mitigationServiceStub = (): AkamaiHttpResponse => {
        if (mitSvcResponse === undefined) {
          throw new Error('The Mitigation Service Should not be called for this test!')
        } else if (mitSvcResponse instanceof Error) {
          throw mitSvcResponse
        }
        return getResolveObject(mitSvcResponse)
      }
      const proxyPass = options.headers['X-Netacea-ProxyPass']
      if (proxyPass === 'ingest') {
        if (ingestSvcResponse instanceof Error) {
          throw ingestSvcResponse
        }
        return getResolveObject({
          status: 200,
          headers: {},
          body: undefined
        })
      }
      if (proxyPass === 'mitigation') {
        return mitigationServiceStub()
      }
      throw new Error(`Unsupported ProxyPass destination! ${String(proxyPass)}`)
    })
}

function createStubbedWorker ({ workerArgs, mitSvcResponse, ingestSvcResponse }: CreateStubbedWorkerArgs): {
  stubs: {
    httpRequest: sinon.SinonStub
  }
  worker: Akamai
} {
  const httpRequestStub = createHttpRequestModuleStub(mitSvcResponse, ingestSvcResponse)
  const AkamaiModule = proxyquire.noCallThru()('../src/Akamai', {
    'http-request': {
      httpRequest: httpRequestStub
    },
    'create-response': {
      createResponse: sinon.stub()
    },
    'log': {
      logger: {
        log: sinon.stub()
      }
    }
  }).default

  return {
    stubs: {
      httpRequest: httpRequestStub
    },
    worker: new AkamaiModule({
      ...workerArgs,
      apiKey
    })
  }
}

// eslint-disable-next-line max-lines-per-function
tape('Akamai', (t: tape.Test) => {
  const transformRequest = (
    args: ClientRequest,
    ingestType: NetaceaIngestType,
    mitigationType: NetaceaMitigationType
  ): IngressClientRequestMock => {
    const mockIngressClientRequest = createIngressClientRequestMock(args, ingestType, mitigationType)

    // init starting headers
    if (args.userAgent !== undefined) mockIngressClientRequest.setHeader('user-agent', args.userAgent)
    if (args.cookieHeader !== undefined) mockIngressClientRequest.setHeader('cookie', args.cookieHeader)
    if (args.ipAddress !== undefined) mockIngressClientRequest.setHeader('true-client-ip', args.ipAddress)
    if (args.protocol !== undefined) mockIngressClientRequest.setHeader('protocol', args.protocol)

    return mockIngressClientRequest
  }

  const transformOriginResponse = (response: HttpResponse | undefined): EgressClientResponseMock => {
    if (response === undefined) throw new Error('Response must not be undefined for Akamai Ingest')
    return createEgressClientResponseMock(response)
  }

  async function runWorker (args: RunWorkerArgs): Promise<RunWorkerResult> {
    const workerArgs = {
      ...args.workerArgs,
      mitigationType: args.workerArgs?.mitigationType ?? NetaceaMitigationType.MITIGATE,
      ingestType: args.workerArgs?.ingestType ?? NetaceaIngestType.HTTP
    }

    const { worker, stubs } = createStubbedWorker({
      workerArgs,
      mitSvcResponse: args.mitigationServiceResponse,
      ingestSvcResponse: args.ingestResponse
    })

    const request = transformRequest(args.request, workerArgs.ingestType, workerArgs.mitigationType)
    await worker.requestHandler(request)

    // Response may come from calling respondWith() in worker or from origin.
    const response = request.getResponse() ?? transformOriginResponse(args.originResponse)
    await worker.responseHandler(request, response)

    const httpRequestsMade = transformHttpRequestsMade(stubs.httpRequest)

    return {
      clientResponse: {
        status: response.status,
        headers: response.getHeaders(),
        body: response.getBody()
      },
      mitSvcRequestsMade: httpRequestsMade
        .filter(req => req.url.startsWith('https://mitigations.')),
      ingestSvcRequestsMade: transformHttpRequestsMade(stubs.httpRequest)
        .filter(req => req.url.startsWith('https://ingest.'))
    }
  }

  runIntegrationTests<ResponseProperties>({
    tape: t,
    runWorker,
    testScenarios: scenarios.mitigation({
      blocked: 403,
      captcha: 403
    })
  })

  runIntegrationTests<ResponseProperties>({
    tape: t,
    runWorker,
    testScenarios: scenarios.ingestOnly()
  })
})

interface AkamaiHttpRequestOptions {
  method?: string | undefined
  headers?: {
    [others: string]: string | string[]
  } | undefined
  body?: string | undefined
  timeout?: number | undefined
}
