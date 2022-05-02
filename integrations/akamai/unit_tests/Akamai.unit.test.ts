/* eslint-disable max-lines-per-function, max-lines */
import Akamai from '../src/Akamai'
import {
  NetaceaMitigationType,
  NetaceaIngestType,
  NetaceaBaseArgs,
  WebLog,
  V2WebLog
} from '@netacea/netaceaintegrationbase'
import { createIngressClientRequestMock, IngressClientRequestMock } from '../tests/mocks/IngressClientRequestMock'
import { createEgressClientResponseMock } from '../tests/mocks/EgressClientResponseMock'
import tape from 'tape'
import sinon, { SinonStub, SinonSpy } from 'sinon'
import * as pack from '../package.json'

interface AkamaiConstructorArgsMock extends NetaceaBaseArgs {
  mitigationType: NetaceaMitigationType
  ingestType: NetaceaIngestType
}

class AkamaiMock extends Akamai {
  apiKey: string
  secretKey: string
  mitigationType: NetaceaMitigationType
  ingestType: NetaceaIngestType

  constructor (args: AkamaiConstructorArgsMock) {
    super(args)

    this.mitigationType = args.mitigationType
    this.ingestType = args.ingestType
    this.apiKey = args.apiKey
    this.secretKey = String(args.secretKey)

    // @ts-ignore
    this.makeIngestApiCall = this.makeIngestApiCallMock
  }

  /* eslint-disable @typescript-eslint/require-await */
  protected async processMitigateRequest (_: any): Promise<ComposeResultResponse> {
    return {
      body: 'bodyexample',
      apiCallStatus: 202,
      setCookie: ['cookie1', 'cookie2', 'cookie3'],
      sessionStatus: 'OK',
      mitigation: '',
      mitigated: false
    }
  }

  private async makeIngestApiCallMock (headers: {[key: string]: string}, body: WebLog | V2WebLog): Promise<any> {
    return { status: 200 }
  }
  /* eslint-enable @typescript-eslint/require-await */
}

export interface ComposeResultResponse {
  body?: string
  apiCallStatus: number
  setCookie: string[]
  sessionStatus: string
  mitigation: string
  mitigated: boolean
  injectHeaders?: any
}

const protocol = 'HTTP/1.1' as const
const method = 'GET' as const

const requestArgs = {
  url: 'https://www.google.com',
  userAgent: 'netacea-bot',
  method,
  ipAddress: '192.168.0.1',
  protocol
}

const httpRes = {
  url: 'https://www.google.com',
  method: 'GET',
  body: '',
  headers: { 'set-cookie': ['value'] },
  status: 200
}

function createAkamaiArgs (args: any = {}): AkamaiConstructorArgsMock {
  return {
    ingestType: args.ingestType ?? NetaceaIngestType.HTTP,
    mitigationType: args.mitigationType ?? NetaceaMitigationType.MITIGATE,
    apiKey: args.apiKey ?? '',
    secretKey: args.secretKey ?? ''
  }
}

function stubMethod (instance: any, methodName: keyof (typeof instance)): SinonStub {
  return sinon.stub(instance, methodName)
}

function spyMethod (instance: any, methodName: keyof (typeof instance)): SinonSpy {
  return sinon.spy(instance, methodName)
}

function testInitialization (t: tape.Test): void {
  return t.test('new Akamai without secret and api key', (t: tape.Test) => {
    const args = {
      mitigationType: NetaceaMitigationType.MITIGATE,
      ingestType: NetaceaIngestType.HTTP
    }

    /* eslint-disable no-new */
    new AkamaiMock(args as AkamaiConstructorArgsMock)
    /* eslint-enable no-new */

    t.end()
  })
}

function testRequestHandler (t: tape.Test): void {
  return t.test('Akamai.requestHandler', (t: tape.Test) => {
    const requestMock: IngressClientRequestMock = createIngressClientRequestMock(requestArgs)

    t.test('the secret and API key are populated from akamai variables', (t: tape.Test) => {
      const akamaiInstance: AkamaiMock = new AkamaiMock(createAkamaiArgs())
      const getVariableSpy = spyMethod(requestMock, 'getVariable')

      const logErrorSub = stubMethod(akamaiInstance, 'logError')

      t.equal(akamaiInstance.apiKey, '')
      t.equal(akamaiInstance.secretKey, '')

      akamaiInstance.requestHandler(requestMock)

      t.equal(getVariableSpy.getCall(0).firstArg, 'PMUSER_NETACEA_API_KEY')
      t.equal(getVariableSpy.getCall(1).firstArg, 'PMUSER_NETACEA_SECRET_KEY')
      t.equal(akamaiInstance.apiKey, 'API_KEY')
      t.equal(akamaiInstance.secretKey, 'SECRET_KEY')

      // @ts-ignore
      t.equal(akamaiInstance.mitataCookieExpirySeconds, 60)
      // In Mitigate type MITIGATE, the expiry seconds change to 60

      getVariableSpy.restore()
      logErrorSub.restore()

      t.end()
    })

    t.test('does not overwrite any existing apikey and secretkeys', (t: tape.Test) => {
      const apiKey: string = 'deoFa3Fs4F4sfvs'
      const secretKey: string = '42f3fs4t4fseSetSgSG'
      const akamaiInstance: AkamaiMock = new AkamaiMock(createAkamaiArgs({ apiKey, secretKey }))
      const logErrorSub = stubMethod(akamaiInstance, 'logError')

      akamaiInstance.requestHandler(requestMock)

      t.equal(akamaiInstance.apiKey, apiKey)
      t.equal(akamaiInstance.secretKey, secretKey)

      logErrorSub.restore()

      t.end()
    })

    t.test('mit and ingest types are fetched from akamai overwriting args only once', (t: tape.Test) => {
      const akamaiInstance: AkamaiMock = new AkamaiMock(
        createAkamaiArgs({ ingestType: NetaceaIngestType.ORIGIN, mitigationType: NetaceaMitigationType.INGEST })
      )
      const getVariableSpy = spyMethod(requestMock, 'getVariable')
      const logErrorSub = stubMethod(akamaiInstance, 'logError')

      akamaiInstance.requestHandler(requestMock)

      t.equal(akamaiInstance.mitigationType, NetaceaMitigationType.MITIGATE)
      t.equal(akamaiInstance.ingestType, NetaceaIngestType.HTTP)
      t.equal(getVariableSpy.getCall(3).firstArg, 'PMUSER_NETACEA_MITIGATION_TYPE')
      t.equal(getVariableSpy.getCall(2).firstArg, 'PMUSER_NETACEA_INGEST_TYPE')

      t.equal(getVariableSpy.callCount, 5)

      akamaiInstance.requestHandler(requestMock)

      // Client IP is fetched every call
      t.equal(getVariableSpy.callCount, 6)

      getVariableSpy.restore()
      logErrorSub.restore()
      t.end()
    })

    t.test('the correct handler is called based on the type of post', (t: tape.Test) => {
      const akamaiInstance = new AkamaiMock(createAkamaiArgs())
      const isUrlCaptchaPostMock = stubMethod(akamaiInstance, 'isUrlCaptchaPost').returns(true)
      const verifyCaptchaStub = stubMethod(akamaiInstance, 'verifyCaptcha')
      const handleMitResultSpy = spyMethod(akamaiInstance, 'handleMitResult')
      const logErrorSub = stubMethod(akamaiInstance, 'logError')

      akamaiInstance.requestHandler(requestMock)

      t.equal(handleMitResultSpy.callCount, 0)
      t.equal(verifyCaptchaStub.callCount, 1)

      isUrlCaptchaPostMock.returns(false)

      akamaiInstance.requestHandler(requestMock)

      t.equal(handleMitResultSpy.callCount, 1)
      t.equal(verifyCaptchaStub.callCount, 1)

      isUrlCaptchaPostMock.restore()
      verifyCaptchaStub.restore()
      handleMitResultSpy.restore()
      logErrorSub.restore()
      t.end()
    })
  })
}

function testhandleMitResult (t: tape.Test): void {
  return t.test('Akamai.handleMitResult', (t: tape.Test) => {
    const requestMock: IngressClientRequestMock = createIngressClientRequestMock(requestArgs)

    t.test('an undefined mit result throws an error', async (t: tape.Test) => {
      const akamaiInstance = new AkamaiMock(createAkamaiArgs())
      const runMitigationStub = stubMethod(akamaiInstance, 'runMitigation')
        .returns(undefined)
      const logErrorSub = stubMethod(akamaiInstance, 'logError')
      let error

      try {
        // @ts-ignore
        await akamaiInstance.handleMitResult(requestMock)
      } catch (e) {
        error = e
      }

      t.assert(error !== undefined)

      runMitigationStub.restore()
      logErrorSub.restore()
      t.end()
    })

    t.test('block or captcha mit results respond with the correct arguements', async (t: tape.Test) => {
      const akamaiInstance = new AkamaiMock(createAkamaiArgs())

      const mitResult = {
        setCookie: 'cookie',
        response: {
          mitigation: 'block',
          body: 'example',
          status: 999
        }
      }
      const runMitigationStub = stubMethod(akamaiInstance, 'runMitigation').returns(mitResult)
      const logErrorSub = stubMethod(akamaiInstance, 'logError')
      const respondWithSpy = spyMethod(requestMock, 'respondWith')

      // @ts-ignore
      await akamaiInstance.handleMitResult(requestMock)

      t.deepEqual(respondWithSpy.firstCall.args, [999, { 'set-cookie': 'cookie' }, 'example'])

      runMitigationStub.restore()
      respondWithSpy.restore()
      logErrorSub.restore()
      t.end()
    })

    t.test('pass mit results only add headers', async (t: tape.Test) => {
      const akamaiInstance = new AkamaiMock(createAkamaiArgs())

      const mitResult = {
        setCookie: 'cookie',
        response: {
          mitigation: 'pass',
          body: 'example',
          status: 999
        }
      }
      const runMitigationStub = stubMethod(akamaiInstance, 'runMitigation').returns(mitResult)
      const addHeadersToRequestSpy = spyMethod(akamaiInstance, 'addHeadersToRequest')
      const logErrorSub = stubMethod(akamaiInstance, 'logError')

      // @ts-ignore
      await akamaiInstance.handleMitResult(requestMock)

      t.deepEqual(addHeadersToRequestSpy.firstCall.args, [mitResult, requestMock])

      runMitigationStub.restore()
      addHeadersToRequestSpy.restore()
      logErrorSub.restore()
      t.end()
    })
  })
}

function testInject (t: tape.Test): void {
  return t.test('Akamai.inject', (t: tape.Test) => {
    const requestMock: IngressClientRequestMock = createIngressClientRequestMock(requestArgs)

    t.test('a valid inject response is returned', async (t: tape.Test) => {
      const akamaiInstance = new AkamaiMock(createAkamaiArgs())
      const logErrorSub = stubMethod(akamaiInstance, 'logError')
      const injectResponse = await akamaiInstance.inject(requestMock)

      t.deepEqual(injectResponse, {
        injectHeaders: undefined,
        sessionStatus: 'OK',
        setCookie: ['cookie1', 'cookie2', 'cookie3'],
        response: {
          headers: { 'set-cookie': 'cookie1; cookie2; cookie3' }
        }
      })

      logErrorSub.restore()
    })
  })
}

function testMitigate (t: tape.Test): void {
  return t.test('Akamai.mitigate', (t: tape.Test) => {
    const requestMock: IngressClientRequestMock = createIngressClientRequestMock(requestArgs)

    t.test('the body and status are unset on non-mitigated responses', async (t: tape.Test) => {
      const akamaiInstance = new AkamaiMock(createAkamaiArgs())
      const getMitigationResponseStub = stubMethod(akamaiInstance, 'getMitigationResponse')
        .returns({ mitigated: false, mitigation: '' })
      const logErrorSub = stubMethod(akamaiInstance, 'logError')

      // @ts-ignore
      const mitigateResponse = await akamaiInstance.mitigate(requestMock)

      t.equal(mitigateResponse.response?.body, undefined)
      t.equal(mitigateResponse.response?.status, undefined)

      getMitigationResponseStub.restore()
      logErrorSub.restore()

      t.end()
    })

    t.test('the body and status are populated on mitigated responses', async (t: tape.Test) => {
      const akamaiInstance = new AkamaiMock(createAkamaiArgs())
      const getMitigationResponseStub = stubMethod(akamaiInstance, 'getMitigationResponse')
        .returns({ mitigated: true, mitigation: 'block' })
      const logErrorSub = stubMethod(akamaiInstance, 'logError')

      // @ts-ignore
      const mitigateResponse = await akamaiInstance.mitigate(requestMock)

      t.equal(mitigateResponse.response?.body, 'Forbidden')
      t.equal(mitigateResponse.response?.status, 403)

      getMitigationResponseStub.restore()
      logErrorSub.restore()

      t.end()
    })

    t.test('the response headers populated on mitigate captcha responses', async (t: tape.Test) => {
      const akamaiInstance = new AkamaiMock(createAkamaiArgs())
      const getMitigationResponseStub = stubMethod(akamaiInstance, 'getMitigationResponse')
        .returns({ mitigated: true, mitigation: 'captcha', body: 'captcha html' })
      const logErrorSub = stubMethod(akamaiInstance, 'logError')

      // @ts-ignore
      const mitigateResponse = await akamaiInstance.mitigate(requestMock)

      t.equal(mitigateResponse.response?.headers['content-type'], 'text/html; charset=UTF-8')
      t.equal(mitigateResponse.response?.body, 'captcha html')

      getMitigationResponseStub.restore()
      logErrorSub.restore()

      t.end()
    })
  })
}

function createExampleMitata (match: string, mitigate: string, captcha: string): string {
  // eslint-disable-next-line max-len
  return `ZWNhZWM3YjZiYTQ3ZjQ4ZDdjYWU4YTg5OTIyNzM3MTg4YWUzN2Y5OGE4MWM1NTc1OTE5NzMwYjYzMjZhMDhlYg==_/@#/1646135174_/@#/cApaiSOf2cHo747u_/@#/YjJjNjhhYTE1NmRjOTI2MDM4YjE3ODljYWFlNTA5MjRkZmE3MDE3NTdiMzFlZTc2YzU5MjI2NDA2NTdkNzAzNQ==_/@#/${match}${mitigate}${captcha}`
}

function testIngest (t: tape.Test): void {
  return t.test('Akamai.ingest', (t: tape.Test) => {
    const requestMock: IngressClientRequestMock = createIngressClientRequestMock(requestArgs)

    t.test('the sessionStatus shows blocks dependant on the response properties', async (t: tape.Test) => {
      const akamaiInstance = new AkamaiMock(createAkamaiArgs())
      const callIngestSpy = spyMethod(akamaiInstance, 'callIngest')
      const responseMock = createEgressClientResponseMock({
        ...httpRes,
        headers: { 'set-cookie': [`_mitata=${createExampleMitata('3', '3', '3')}`, 'value2'] }
      })
      const logErrorSub = stubMethod(akamaiInstance, 'logError')

      await akamaiInstance.ingest(requestMock, responseMock)

      t.equal(callIngestSpy.firstCall.args[0].sessionStatus, 'visitor_hardblocked,captcha_cookiefail')
      t.equal(callIngestSpy.firstCall.args[0].protocol, 'HTTP/1.1')
      t.equal(callIngestSpy.firstCall.args[0].path, 'https://www.google.com')

      callIngestSpy.restore()
      logErrorSub.restore()

      t.end()
    })

    t.test('the sessionStatus shows nothing dependant on the response properties', async (t: tape.Test) => {
      const akamaiInstance = new AkamaiMock(createAkamaiArgs())
      const makeIngestApiCallStub = stubMethod(akamaiInstance, 'makeIngestApiCall')
        .returns({ status: 200 })
      const callIngestSpy = spyMethod(akamaiInstance, 'callIngest')
      const logErrorSub = stubMethod(akamaiInstance, 'logError')
      const responseMock = createEgressClientResponseMock({
        ...httpRes,
        headers: {
          'set-cookie': [`_mitata=${createExampleMitata('0', '0', '0')}`, 'value2']
        }
      })

      await akamaiInstance.ingest(requestMock, responseMock)

      t.equal(callIngestSpy.firstCall.args[0].sessionStatus, '')

      makeIngestApiCallStub.restore()
      callIngestSpy.restore()
      logErrorSub.restore()

      t.end()
    })
  })
}

function testGetCookieHeader (t: tape.Test): void {
  return t.test('Akamai.getCookieHeader', (t: tape.Test) => {
    t.test('the cookie header is returned', (t: tape.Test) => {
      const requestMock = createIngressClientRequestMock(requestArgs)
      const akamaiInstance = new AkamaiMock(createAkamaiArgs())
      const logErrorSub = stubMethod(akamaiInstance, 'logError')

      requestMock.addHeader('cookie', ['example_test_cookie'])
      const cookie = akamaiInstance.getCookieHeader(requestMock)

      t.equal(cookie, 'example_test_cookie')

      logErrorSub.restore()
      t.end()
    })
  })
}

function testGetProtoMitataFromCookies (t: tape.Test): void {
  return t.test('Akamai.getProtoMitataFromCookies', (t: tape.Test) => {
    t.test('the protomitata cookie is returned', (t: tape.Test) => {
      const akamaiInstance = new AkamaiMock(createAkamaiArgs())
      const logErrorSub = stubMethod(akamaiInstance, 'logError')
      // @ts-ignore
      const cookie = akamaiInstance.getProtoMitataFromCookies(['_proto-mitata={"example": "example"}'])

      t.deepEqual(cookie, { example: 'example' })
      logErrorSub.restore()
      t.end()
    })
  })
}

function testGetProtoMitataFromResponseHeaders (t: tape.Test): void {
  return t.test('Akamai.getProtoMitataFromResponseHeaders', (t: tape.Test) => {
    t.test('', (t: tape.Test) => {
      const akamaiInstance = new AkamaiMock(createAkamaiArgs())
      const requestMock = createIngressClientRequestMock(requestArgs)
      const responseMock = createEgressClientResponseMock(httpRes)
      const logErrorSub = stubMethod(akamaiInstance, 'logError')

      requestMock.setHeader('x-netacea-client-ip', 'client_ip')
      requestMock.setHeader('x-netacea-userid', 'user_id')
      responseMock.setHeader('x-netacea-match', '2')
      responseMock.setHeader('x-netacea-mitigate', '3')
      responseMock.setHeader('x-netacea-captcha', '3')
      responseMock.setHeader('x-netacea-mitata-expiry', '2022-03-31')

      // @ts-ignore
      const protoMitataResponse = akamaiInstance.getProtoMitataFromResponseHeaders(requestMock, responseMock)

      t.deepEqual(protoMitataResponse, {
        clientIP: ['client_ip'],
        userId: ['user_id'],
        match: ['2'],
        mitigate: ['3'],
        captcha: ['3'],
        mitataMaxAge: ['2022-03-31']
      })

      logErrorSub.restore()

      t.end()
    })
  })
}

function testResponseHandler (t: tape.Test): void {
  return t.test('Akamai.responseHandler', (t: tape.Test) => {
    const responseMock = createEgressClientResponseMock(httpRes)

    t.test('when the URL is captcha cookies get filtered and mit fetched from headers', async (t: tape.Test) => {
      const responseMock = createEgressClientResponseMock(httpRes)
      const requestMock = createIngressClientRequestMock({
        ...requestArgs,
        url: '/AtaVerifyCaptcha',
        method: 'POST'
      })
      const akamaiInstance = new AkamaiMock(createAkamaiArgs())
      const filterCookiesSpy = spyMethod(akamaiInstance, 'filterCookies')
      const getProtoMitataFromResponseHeadersSpy = spyMethod(akamaiInstance, 'getProtoMitataFromResponseHeaders')
      const logErrorSub = stubMethod(akamaiInstance, 'logError')

      await akamaiInstance.responseHandler(requestMock, responseMock)

      t.equal(filterCookiesSpy.callCount, 1)
      t.equal(getProtoMitataFromResponseHeadersSpy.callCount, 1)

      filterCookiesSpy.restore()
      logErrorSub.restore()
      getProtoMitataFromResponseHeadersSpy.restore()

      t.end()
    })

    t.test('Netacea ingest is ran in ingest HTTP mode', (t: tape.Test) => {
      const akamaiInstance: AkamaiMock = new AkamaiMock(createAkamaiArgs())
      const ingestSpy = spyMethod(akamaiInstance, 'ingest')
      const requestMock = createIngressClientRequestMock(requestArgs)

      const logErrorSub = stubMethod(akamaiInstance, 'logError')

      akamaiInstance.responseHandler(requestMock, responseMock)

      t.equal(ingestSpy.callCount, 1)

      ingestSpy.restore()
      logErrorSub.restore()

      t.end()
    })

    t.test('Netacea ingest is not ran in ingest ORIGIN mode', (t: tape.Test) => {
      const akamaiInstance: AkamaiMock = new AkamaiMock(createAkamaiArgs({ ingestType: 'ORIGIN' }))
      const requestMock = createIngressClientRequestMock(requestArgs)

      const getVariableStub = stubMethod(requestMock, 'getVariable')

      getVariableStub.withArgs('PMUSER_INGEST_TYPE').returns('ORIGIN')

      const ingestSpy = stubMethod(akamaiInstance, 'ingest')
      const logErrorSub = stubMethod(akamaiInstance, 'logError')

      akamaiInstance.responseHandler(requestMock, responseMock)

      t.equal(ingestSpy.callCount, 0)

      getVariableStub.restore()
      ingestSpy.restore()
      logErrorSub.restore()

      t.end()
    })
  })
}

function testAddHeadersToRequest (t: tape.Test): void {
  return t.test('Akamai.addHeadersToRequest', (t: tape.Test) => {
    const mitResult = {
      setCookie: ['example'],
      response: {
        headers: {

        },
        body: '',
        status: 200,
        statusText: 'OK',
        mitigation: 'captcha'
      },
      injectHeaders: {
        'x-netacea-match': '0',
        'x-netacea-mitigate': '3',
        'x-netacea-captcha': '5',
        'x-netacea-event-id': 'event_id'
      }
    }

    t.test('the correct mitigation headers are added to the request', (t: tape.Test) => {
      const akamaiInstance = new AkamaiMock(createAkamaiArgs())
      const requestMock = createIngressClientRequestMock(requestArgs)
      akamaiInstance.mitigationType = NetaceaMitigationType.INJECT
      const logErrorSub = stubMethod(akamaiInstance, 'logError')

      // @ts-ignore
      akamaiInstance.addHeadersToRequest(mitResult, requestMock)

      t.deepEqual(requestMock.getHeaders(), {
        'set-cookie': ['example'],
        'x-netacea-match': ['0'],
        'x-netacea-mitigate': ['3'],
        'x-netacea-captcha': ['5'],
        'x-netacea-event-id': ['event_id']
      })

      logErrorSub.restore()

      t.end()
    })
  })
}

function testGetHeaderValueOrDefault (t: tape.Test): void {
  return t.test('Akamai.getHeaderValueOrDefault', (t: tape.Test) => {
    const requestMock = createIngressClientRequestMock(requestArgs)
    requestMock.addHeader('example', ['example_test_header'])

    t.test('the header value is returned correctly', (t: tape.Test) => {
      const akamaiInstance = new AkamaiMock(createAkamaiArgs())
      const logErrorSub = stubMethod(akamaiInstance, 'logError')

      // @ts-ignore
      const header = akamaiInstance.getHeaderValueOrDefault(requestMock, 'example', 'false')

      t.equal(header, 'example_test_header')

      logErrorSub.restore()
      t.end()
    })

    t.test('a default value is fallen back on correctly', (t: tape.Test) => {
      const akamaiInstance = new AkamaiMock(createAkamaiArgs())
      const logErrorSub = stubMethod(akamaiInstance, 'logError')

      // @ts-ignore
      const header = akamaiInstance.getHeaderValueOrDefault(requestMock, 'not_exist', 'default_value')

      t.equal(header, 'default_value')
      logErrorSub.restore()

      t.end()
    })
  })
}

function testGetIp (t: tape.Test): void {
  return t.test('Akamai.getIp', (t: tape.Test) => {
    const requestMock = createIngressClientRequestMock(requestArgs)

    t.test('the client ip is returned', (t: tape.Test) => {
      const akamaiInstance = new AkamaiMock(createAkamaiArgs({ }))
      const logErrorSub = stubMethod(akamaiInstance, 'logError')

      // @ts-ignore
      const ip = akamaiInstance.getIP(requestMock)

      t.equal(ip, '192.168.0.1')
      logErrorSub.restore()

      t.end()
    })
  })
}

function testGetMitHeaders (t: tape.Test): void {
  return t.test('Akamai.getMitHeaders', (t: tape.Test) => {
    const requestMock = createIngressClientRequestMock(requestArgs)

    t.test('the mit headers are returned', (t: tape.Test) => {
      const akamaiInstance = new AkamaiMock(createAkamaiArgs({ }))
      const mitataHeader = `_mitata=${createExampleMitata('1', '1', '1')};_mitatacaptcha=1`
      requestMock.setHeader('cookie', mitataHeader)
      const logErrorSub = stubMethod(akamaiInstance, 'logError')

      // @ts-ignore
      const mitHeaders = akamaiInstance.getMitHeaders(requestMock)

      t.deepEqual(mitHeaders, {
        'X-Netacea-User-Id': 'cApaiSOf2cHo747u',
        'X-Netacea-BC-Type': 'ua_blocked,captcha_serve',
        'X-Netacea-Integration-Type': 'akamai',
        'X-Netacea-Integration-Version': pack.version
      })
      logErrorSub.restore()

      t.end()
    })
  })
}

function testCreateAkamaiMitata (t: tape.Test): void {
  return t.test('Akamai.createAkamaiMitata', (t: tape.Test) => {
    t.test('the mit headers are returned', (t: tape.Test) => {
      const akamaiInstance = new AkamaiMock(createAkamaiArgs({ }))
      const mitataArgs = {
        clientIP: '192.168.0.1',
        userId: 'UUID',
        match: 1,
        mitigate: 1,
        captcha: 1,
        maxAge: 86400,
        expiry: undefined
      }
      const logErrorSub = stubMethod(akamaiInstance, 'logError')

      // @ts-ignore
      const akamaiMitata = akamaiInstance.createAkamaiMitata(...Object.values(mitataArgs))

      // eslint-disable-next-line max-len
      t.assert(akamaiMitata.match(/_mitata=[a-zA-Z0-9]+==_\/@#\/\d+_\/@#\/UUID_\/@#\/[a-zA-Z0-9]+==_\/@#\/111; Max-Age=86400; Path=\/+/g))

      logErrorSub.restore()
      t.end()
    })
  })
}

function testBuildAkamaiCookieFromValues (t: tape.Test): void {
  return t.test('Akamai.buildAkamaiCookieFromValues', (t: tape.Test) => {
    t.test('the values are used correctly in the cookie format', (t: tape.Test) => {
      const akamaiInstance = new AkamaiMock(createAkamaiArgs())
      const logErrorSub = stubMethod(akamaiInstance, 'logError')

      // @ts-ignore
      const cookie = akamaiInstance.buildAkamaiCookieFromValues('name', 'value', 1776, 'path')

      t.equal(cookie, 'name=value; Max-Age=1776; Path=path')

      logErrorSub.restore()

      t.end()
    })
  })
}

tape('Akamai', (t: tape.Test) => {
  testInitialization(t)
  testRequestHandler(t)
  testhandleMitResult(t)
  testInject(t)
  testMitigate(t)
  testIngest(t)
  testGetCookieHeader(t)
  testGetProtoMitataFromCookies(t)
  testGetProtoMitataFromResponseHeaders(t)
  testResponseHandler(t)
  testAddHeadersToRequest(t)
  testGetHeaderValueOrDefault(t)
  testGetIp(t)
  testGetMitHeaders(t)
  testCreateAkamaiMitata(t)
  testBuildAkamaiCookieFromValues(t)

  t.end()
})
