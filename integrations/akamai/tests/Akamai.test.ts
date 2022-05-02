import {
  runIngestTests,
  runIngestOnlyTests,
  StubXhrCallArgs,
  TransformRequestArgs,
  TransformResponseArgs,
  apiKey,
  runInjectTests
} from '@netacea/netaceaintegrationtestrunner'
import tape from 'tape'
import * as fetch from 'node-fetch'
import Akamai, { ResponseProperties } from '../src/Akamai'
import { createIngressClientRequestMock } from './mocks/IngressClientRequestMock'

import sinon from 'sinon'
import proxyquire from 'proxyquire'
/// <reference types="akamai-edgeworkers"/>
// @ts-ignore
global.Request = fetch.Request
// @ts-ignore
global.Response = fetch.Response
// @ts-ignore
global.Headers = fetch.Headers
// @ts-ignore
global.fetch = fetch

// eslint-disable-next-line max-lines-per-function
tape('Akamai', (t: tape.Test) => {
  process.env.CDN = 'AKAMAI'

  // eslint-disable-next-line max-lines-per-function
  const getResolveObject = (xhrArgs?: StubXhrCallArgs): any => {
    if (xhrArgs === undefined) {
      return {
        text: () => ''
      }
    }
    return {
      status: xhrArgs.status,
      ok: xhrArgs.status < 300,
      body: sinon.stub(),
      text: async () => await new Promise<string>((resolve, reject) => resolve(xhrArgs.body ?? '')),
      json: async () => await new Promise<any>(() => {}),
      // eslint-disable-next-line complexity
      getHeaders: () => {
        const headers: EW.Headers = {}
        if (xhrArgs.match !== undefined) {
          headers['x-netacea-match'] = [xhrArgs.match]
        }
        if (xhrArgs.mitigate !== undefined) {
          headers['x-netacea-mitigate'] = [xhrArgs.mitigate]
        }
        if (xhrArgs.captcha !== undefined) {
          headers['x-netacea-captcha'] = [xhrArgs.captcha]
        }
        if (xhrArgs.mitata !== undefined) {
          headers['x-netacea-mitata-value'] = [xhrArgs.mitata]
        }
        if (xhrArgs.mitataExpiry !== undefined) {
          headers['x-netacea-mitata-expiry'] = [xhrArgs.mitataExpiry]
        }
        if (xhrArgs.eventId !== undefined) {
          headers['x-netacea-event-id'] = [xhrArgs.eventId]
        }
        return headers
      },
      // eslint-disable-next-line complexity
      getHeader: (name: string) => {
        switch (name) {
          case 'x-netacea-match':
            return xhrArgs.match !== undefined ? [xhrArgs.match] : null
          case 'x-netacea-mitigate':
            return xhrArgs.mitigate !== undefined ? [xhrArgs.mitigate] : null
          case 'x-netacea-captcha':
            return xhrArgs.captcha !== undefined ? [xhrArgs.captcha] : null
          case 'x-netacea-mitata-value':
            return xhrArgs.mitata !== undefined ? [xhrArgs.mitata] : null
          case 'x-netacea-mitata-expiry':
            return xhrArgs.mitataExpiry !== undefined ? [xhrArgs.mitataExpiry] : null
          case 'x-netacea-event-id':
            return xhrArgs.eventId !== undefined ? [xhrArgs.eventId] : null
        }
        return null
      }
    }
  }

  const createWorker = (args: any, xhrArgs?: StubXhrCallArgs): Akamai => {
    const akamaiModule = proxyquire.noCallThru()('../src/Akamai', {
      'http-request': {
        httpRequest: sinon.stub().resolves(getResolveObject(xhrArgs))
      },
      'create-response': {
        createResponse: sinon.stub()
      },
      'log': {
        logger: {
          log: sinon.stub()
        }
      }
    })
    // eslint-disable-next-line new-cap
    return new akamaiModule.default({
      ...args,
      apiKey
    })
  }

  const transformRequest = (args: TransformRequestArgs): EW.IngressClientRequest => {
    const mockIngressClientRequest = createIngressClientRequestMock(args)

    // init starting headers
    if (args.userAgent !== undefined) mockIngressClientRequest.setHeader('user-agent', args.userAgent)
    if (args.cookieHeader !== undefined) mockIngressClientRequest.setHeader('cookie', args.cookieHeader)
    if (args.ipAddress !== undefined) mockIngressClientRequest.setHeader('true-client-ip', args.ipAddress)
    if (args.protocol !== undefined) mockIngressClientRequest.setHeader('protocol', args.protocol)
    if (args.headers !== undefined) {
      for (const [header, value] of Object.entries(args.headers)) {
        mockIngressClientRequest.setHeader(header, value)
      }
    }

    return mockIngressClientRequest
  }

  const transformIngestRequest = (
    request: TransformRequestArgs,
    response: TransformResponseArgs
  ): [EW.IngressClientRequest, EW.EgressClientResponse] => {
    const requestObject = transformRequest(request)

    const responseObject = transformResponse({
      status: response?.status !== undefined ? response?.status : undefined,
      body: typeof response?.body === 'string' ? response?.body : undefined,
      headers: response.headers
    })
    return [
      requestObject,
      responseObject
    ]
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  const transformResponse = (response: ResponseProperties | undefined): EW.EgressClientResponse => {
    if (response === undefined) throw new Error('Response must not be undefined for Akamai Ingest')
    return {
      status: response.status ?? 999,
      setHeader (name: string, value: string | string[]): void {
        // Need some test logic in this one?
      },
      addHeader (name: string, value: string | string[]): void {
        throw new Error('Method not implemented.')
      },
      removeHeader (name: string): void {
        throw new Error('Method not implemented.')
      },
      getHeader: (name: string): string[] | null => {
        const header = response.headers[name]
        return header !== undefined ? [header] : []
      }
    }
  }

  // This is redundant for now - have to use http-request which doesn't play nice with sinon
  const stubXhrCalls = (args: StubXhrCallArgs): sinon.SinonSandbox => {
    const sandbox = sinon.createSandbox()
    return sandbox
  }

  runIngestTests<ResponseProperties>({
    createWorker,
    transformRequest: transformIngestRequest,
    transformResponse,
    stubXhrCalls,
    tape: t
  })

  runIngestOnlyTests<ResponseProperties>({
    createWorker,
    transformRequest,
    transformResponse,
    stubXhrCalls,
    tape: t
  })

  runInjectTests<ResponseProperties>({
    createWorker,
    transformRequest,
    transformResponse,
    stubXhrCalls,
    tape: t
  })

  t.test('After integration tests', t => {
    process.env.CDN = undefined
    t.end()
  })
})
