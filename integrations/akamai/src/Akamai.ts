import NetaceaBase, {
  ComposeResultResponse,
  InjectResponse,
  MakeRequestArgs,
  MakeRequestResponse,
  MitigateResponse,
  NetaceaBaseArgs,
  NetaceaMitigationType,
  matchMitataCookie,
  createMitataCookie,
  checkMitataCookie,
  NetaceaIngestType
} from '@netacea/netaceaintegrationbase'
import * as pack from '../package.json'
import { httpRequest, HttpResponse } from 'http-request'
import { logger } from 'log'

const DEFAULT_MITIGATION_TYPE: NetaceaMitigationType = NetaceaMitigationType.MITIGATE
const DEFAULT_INGEST_TYPE: NetaceaIngestType = NetaceaIngestType.HTTP

export interface ResponseProperties {
  headers: Record<string, string>
  body?: string | undefined
  status?: number
  statusText?: string
  mitigation?: string
}

export interface AkamaiConstructorArgs extends Omit<NetaceaBaseArgs, 'apiKey'> {
  apiKey?: string
}

export type AkamaiMitigateResponse = MitigateResponse<ResponseProperties>

export interface UpstreamMitHeaders {
  'X-Netacea-User-Id': string
  'X-Netacea-BC-Type': string
  'X-Netacea-Integration-Type': string
  'X-Netacea-Integration-Version': string
}

// eslint-disable-next-line max-len
const warmupCookie = 'ZWNhZWM3YjZiYTQ3ZjQ4ZDdjYWU4YTg5OTIyNzM3MTg4YWUzN2Y5OGE4MWM1NTc1OTE5NzMwYjYzMjZhMDhlYg==_/@#/1646135174_/@#/cApaiSOf2cHo747u_/@#/YjJjNjhhYTE1NmRjOTI2MDM4YjE3ODljYWFlNTA5MjRkZmE3MDE3NTdiMzFlZTc2YzU5MjI2NDA2NTdkNzAzNQ==_/@#/000'

function configureMitataExpiry (
  mitigationType: NetaceaMitigationType,
  expirySeconds: number | undefined
): number {
  if (expirySeconds === undefined) {
    return mitigationType === NetaceaMitigationType.INGEST ? 3600 : 60
  }
  return expirySeconds
}

export default class Akamai extends NetaceaBase<EW.IngressClientRequest, ResponseProperties> {
  mitigationType: NetaceaMitigationType
  ingestType: NetaceaIngestType
  getOperationTypesFromVariables: boolean

  constructor (args: AkamaiConstructorArgs) {
    super({ apiKey: '', secretKey: '', ...args })

    this.mitigationType = args.mitigationType ?? DEFAULT_MITIGATION_TYPE
    this.ingestType = args.ingestType ?? DEFAULT_INGEST_TYPE
    this.getOperationTypesFromVariables = true

    if (args.secretKey !== undefined) {
      // Warm up expensive code during init phase
      checkMitataCookie(warmupCookie, '0.0.0.0', args.secretKey)
    }
  }

  /**
   *
   * @param request The request object provided by akamai
   * @returns An object containing the body, headers and status to be returned to client
   */
  public async requestHandler (request: EW.IngressClientRequest): Promise<void> {
    this.populateKeys(request)

    /* eslint-disable @typescript-eslint/consistent-type-assertions, max-len */
    if (this.getOperationTypesFromVariables) {
      this.ingestType = (<any>NetaceaIngestType)[String(request.getVariable('PMUSER_NETACEA_INGEST_TYPE'))] ?? this.ingestType

      const fetchedMitigationType = (<any>NetaceaMitigationType)[String(request.getVariable('PMUSER_NETACEA_MITIGATION_TYPE'))]
      if (fetchedMitigationType !== undefined) {
        this.mitigationType = fetchedMitigationType
        this.mitataCookieExpirySeconds = configureMitataExpiry(this.mitigationType, undefined)
      }

      this.getOperationTypesFromVariables = false
    }
    /* eslint-enable @typescript-eslint/consistent-type-assertions, max-len */

    if (this.isUrlCaptchaPost(request.path, request.method)) {
      this.verifyCaptcha(request)
    } else {
      await this.handleMitResult(request)
    }
  }

  private populateKeys (request: EW.IngressClientRequest): void {
    if (this.apiKey === '') {
      this.apiKey = request.getVariable('PMUSER_NETACEA_API_KEY') ?? ''
    }
    if (this.secretKey === '') {
      this.secretKey = request.getVariable('PMUSER_NETACEA_SECRET_KEY') ?? ''
    }
  }

  private async handleMitResult (request: EW.IngressClientRequest): Promise<void> {
    const mitResult = await this.runMitigation(request)
    if (mitResult === undefined) {
      throw new Error('Mitigation Service response "mitResult" was undefined.')
    }
    const mitigationAction = mitResult.response?.mitigation

    if (mitigationAction === 'block' || mitigationAction === 'captcha') {
      const status = mitResult.response?.status ?? 403
      const headers = { 'set-cookie': mitResult.setCookie }
      const body = mitResult.response?.body ?? ''
      // respondWith needs to be the last thing called by the worker as it will end the request.
      request.respondWith(status, headers, body)
    } else {
      this.addHeadersToRequest(mitResult, request)
    }
  }

  public async inject (request: EW.IngressClientRequest): Promise<InjectResponse> {
    const result = await this.getMitigationResponse(request)
    const responseHeaders: Record<string, string> = {}
    responseHeaders['set-cookie'] = result.setCookie.join('; ')
    return {
      injectHeaders: result.injectHeaders,
      sessionStatus: result.sessionStatus,
      setCookie: result.setCookie,
      response: {
        headers: responseHeaders
      }
    }
  }

  protected async mitigate (request: EW.IngressClientRequest): Promise<AkamaiMitigateResponse> {
    const result = await this.getMitigationResponse(request)
    const responseHeaders: Record<string, string> = {}
    let body
    let status
    if (result.mitigated) {
      body = result
      status = 403
      if (result.mitigation === 'captcha') {
        responseHeaders['content-type'] = 'text/html; charset=UTF-8' // We return captcha html
        body = result.body
      } else {
        // Blocked
        body = 'Forbidden'
      }
    }

    return {
      response: {
        body,
        status,
        statusText: status?.toString(),
        headers: responseHeaders,
        mitigation: result.mitigation
      },
      sessionStatus: result.sessionStatus,
      setCookie: result.setCookie
    }
  }

  // eslint-disable-next-line
  public async ingest (request: EW.IngressClientRequest, response: EW.EgressClientResponse): Promise<void> {
    const setCookie = response.getHeader('set-cookie') ?? []
    const cookieString = setCookie.length !== 0
      ? setCookie?.join('; ')
      : this.getHeaderValueOrDefault(request, 'cookie')
    const mitata = this.readCookie('_mitata', cookieString) ?? ''

    const {
      match, mitigate, captcha
    } = matchMitataCookie(mitata) ?? {
      match: 0,
      mitigate: 0,
      captcha: 0
    }

    const { sessionStatus } = this.findBestMitigation(
      match,
      mitigate,
      captcha,
      this.isUrlCaptchaPost(request.url, request.method)
    )

    try {
      // eslint-disable-next-line
      this.callIngest({
        bytesSent: this.getHeaderValueOrDefault(response, 'content-length', '0'),
        ip: this.getIP(request),
        method: request.method,
        path: request.url,
        protocol: this.getHeaderValueOrDefault(request, 'protocol', 'HTTP/1.1'),
        referer: this.getHeaderValueOrDefault(request, 'referer', ''),
        requestTime: '0',
        sessionStatus,
        status: String(response.status),
        userAgent: this.getHeaderValueOrDefault(request, 'user-agent', '-'),
        mitataCookie: mitata,
        integrationType: pack.name.replace('@netacea/', ''),
        integrationVersion: pack.version
      })
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      this.logError(`Error in callIngest(): ${e}`)
    }
  }

  public logError (msg: string): void {
    logger.log(msg)
  }

  protected async makeRequest ({
    host,
    method,
    path,
    headers,
    body
  }: MakeRequestArgs): Promise<MakeRequestResponse> {
    if (host.includes('mitigations')) {
      // This is in tandem with conditional origin rule in Akamai property config
      // In dev env, this is rule "Mitigation Origin"
      headers['X-Netacea-ProxyPass'] = 'mitigation'
    } else if (host.includes('ingest')) {
      // This is in tandem with conditional origin rule in Akamai property config
      // In dev env, this is rule "Ingest Origin"
      headers['X-Netacea-ProxyPass'] = 'ingest'
    } else {
      throw Error('Host not recognised. Currently only mitigation and ingest endpoints are supported.')
    }
    // As a restriction of akamai, we must loopback to worker url. We pass a X-Netacea-ProxyPass
    // header to describe the destination origin
    const response = await httpRequest(path, {
      body, headers, method, timeout: 1000
    })

    const responseHeadersEntries = Object.entries(response.getHeaders())
    const responseHeaders: {[key: string]: string} = {}
    for (const [key, value] of responseHeadersEntries) {
      responseHeaders[key] = value[0] // For some reason akamai header values are string[]
    }
    return {
      status: response.status,
      body: await response.text(),
      headers: responseHeaders
    }
  }

  public getCookieHeader (args: EW.IngressClientRequest): string | null | undefined {
    return args.getHeader('cookie')?.[0]
  }

  private getProtoMitataFromCookies (
    cookies: string[]
  ): any | undefined {
    const protoMitataString = this.readCookie('_proto-mitata', cookies?.join('; '))
    const protoMitata = protoMitataString !== undefined ? JSON.parse(protoMitataString) : undefined
    return protoMitata
  }

  private getProtoMitataFromResponseHeaders (
    request: EW.IngressClientRequest,
    response: EW.EgressClientResponse
  ): any | undefined {
    return {
      clientIP: request.getHeader('x-netacea-client-ip'),
      userId: request.getHeader('x-netacea-userid'),
      match: response.getHeader('x-netacea-match'),
      mitigate: response.getHeader('x-netacea-mitigate'),
      captcha: response.getHeader('x-netacea-captcha'),
      mitataMaxAge: response.getHeader('x-netacea-mitata-expiry')
    }
  }

  public async responseHandler (
    request: EW.IngressClientRequest,
    response: EW.EgressClientResponse
  ): Promise<void> {
    const isCaptchaPost = this.isUrlCaptchaPost(request.path, request.method)
    if (isCaptchaPost) {
      this.filterCookies(response)
    }

    // _proto-mitata will be set on request when origin is reached
    const requestCookies = request.getHeader('set-cookie') ?? []
    // _proto-mitata will be set on response when using respondWith()
    const responseCookies = response.getHeader('set-cookie') ?? []

    this.logError(`Request Cookies: ${requestCookies.join(', ')}`)
    this.logError(`Response Cookies: ${responseCookies.join(', ')}`)

    const setCookieHeaders = [...responseCookies, ...requestCookies]

    const protoMitata = isCaptchaPost
      ? this.getProtoMitataFromResponseHeaders(request, response)
      : this.getProtoMitataFromCookies(setCookieHeaders)

    if (protoMitata !== undefined) {
      const cookie = this.createAkamaiMitata(
        protoMitata.clientIP,
        protoMitata.userId,
        protoMitata.match,
        protoMitata.mitigate,
        protoMitata.captcha,
        protoMitata.mitataMaxAge
      )
      response.setHeader('set-cookie', [
        ...responseCookies.filter(c => !c.startsWith('_proto-mitata=')),
        cookie
      ])
    }

    this.removeNetaceaHeaders(response)

    if (this.ingestType === NetaceaIngestType.HTTP) {
      await this.ingest(request, response)
    }
  }

  private addHeadersToRequest (
    mitResult: AkamaiMitigateResponse | InjectResponse | undefined,
    request: EW.IngressClientRequest
  ): void {
    let injectHeaders = {}
    if (mitResult?.setCookie !== undefined) {
      const setCookie = mitResult?.setCookie?.[0]
      this.logError(`Request SetCookie: ${setCookie}`)
      request.setHeader('set-cookie', setCookie)
    }
    if (this.mitigationType === NetaceaMitigationType.INJECT) {
      const result = mitResult as InjectResponse
      injectHeaders = result.injectHeaders ?? {}
    }
    if (this.mitigationType !== NetaceaMitigationType.INGEST) {
      let mitHeaders = {}
      if (this.ingestType === NetaceaIngestType.ORIGIN) {
        mitHeaders = this.getMitHeaders(request, mitResult?.response)
      }
      for (const [key, value] of Object.entries({ ...injectHeaders, ...mitHeaders })) {
        request.addHeader(key, value as any)
      }
    }
  }

  private getHeaderValueOrDefault (
    readable: EW.IngressClientRequest | EW.EgressClientResponse | EW.Response | HttpResponse,
    key: string,
    defaultVal = ''
  ): string {
    const header = (readable.getHeader(key)?.[0] ?? '').trim()
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    return header || defaultVal
  }

  private getIP (request: EW.IngressClientRequest): string {
    return request.getVariable('PMUSER_CLIENT_IP') ?? ''
  }

  private async getMitigationResponse (request: EW.IngressClientRequest): Promise<ComposeResultResponse> {
    const cookies = this.getHeaderValueOrDefault(request, 'cookie')
    const mitataCookie = this.readCookie('_mitata', cookies) ?? ''
    const mitataCaptcha = this.readCookie('_mitatacaptcha', cookies)
    const clientIp = this.getIP(request)
    const userAgent = this.getHeaderValueOrDefault(request, 'user-agent')
    return await this.processMitigateRequest({
      clientIp,
      // eslint-disable-next-line @typescript-eslint/require-await
      getBodyFn: async () => '', // Cannot get body in akamai
      method: request.method,
      mitata: mitataCookie,
      mitataCaptcha,
      url: request.url,
      userAgent
    })
  }

  private getMitHeaders (request: EW.IngressClientRequest, response?: ResponseProperties): UpstreamMitHeaders {
    const setCookie = response?.headers['set-cookie'] ?? ''
    const cookieString = setCookie !== '' ? setCookie : this.getHeaderValueOrDefault(request, 'cookie')
    const mitata = this.readCookie('_mitata', cookieString) ?? ''
    const {
      match, mitigate, captcha
    } = matchMitataCookie(mitata) ?? {
      match: 0,
      mitigate: 0,
      captcha: 0
    }
    const { sessionStatus } = this.findBestMitigation(
      match,
      mitigate,
      captcha,
      this.isUrlCaptchaPost(request.url, request.method)
    )
    const userId = matchMitataCookie(mitata)?.userId ?? ''
    return {
      'X-Netacea-User-Id': userId,
      'X-Netacea-BC-Type': sessionStatus,
      'X-Netacea-Integration-Type': pack.name.replace('@netacea/', ''),
      'X-Netacea-Integration-Version': pack.version
    }
  }

  private createAkamaiMitata (
    clientIP: string,
    userId: string | undefined,
    match: number,
    mitigate: number,
    captcha: number,
    maxAge = 86400,
    expiry: number | undefined = undefined
  ): string {
    // serve, fail, cookiefail
    const isCaptchaServe = [1, 3, 5].includes(captcha)
    const expiryDelta = isCaptchaServe ? -this.mitataCookieExpirySeconds : this.mitataCookieExpirySeconds
    const mitataExpiry = expiry ?? Math.floor(Date.now() / 1000) + expiryDelta

    if (this.secretKey === undefined) {
      throw new Error('Cannot build cookie without secret key.')
    }
    const mitataCode = [match, mitigate, captcha].join('')
    const mitataValue = createMitataCookie(
      clientIP,
      userId,
      mitataExpiry,
      this.secretKey,
      mitataCode
    )
    return this.buildAkamaiCookieFromValues('_mitata', mitataValue, maxAge, '/')
  }

  private buildAkamaiCookieFromValues (
    cookieName: string,
    value: string,
    maxAge: number,
    path = '/'
  ): string {
    return `${cookieName}=${value}; Max-Age=${maxAge}; Path=${path}`
  }

  // Override createMitata so we can handle the expensive hash in onClientResponse
  protected createMitata (
    clientIP: string,
    userId: string | undefined,
    match: number,
    mitigate: number,
    captcha: number,
    maxAge = 86400,
    expiry: number | undefined = undefined
  ): string {
    const AkamaiCookieObj = {
      clientIP,
      userId,
      match,
      mitigate,
      captcha,
      mitataMaxAge: maxAge
    }
    return `_proto-mitata=${JSON.stringify(AkamaiCookieObj)}`
  }

  // Override readCookie to avoid expensive dynamic regex.
  protected readCookie (cookieName: string, cookies: string | null | undefined): string | undefined {
    if (cookies === null || cookies === undefined) {
      return undefined
    }
    const prefix = `${cookieName}=`
    for (const cookie of cookies.split(';')) {
      const trimmedCookie = cookie.trim()
      if (trimmedCookie.startsWith(prefix)) {
        return trimmedCookie.replace(prefix, '')
      }
    }
    return undefined
  }

  protected verifyCaptcha (request: EW.IngressClientRequest): void {
    const IP = request.getVariable('PMUSER_CLIENT_IP') ?? ''
    request.setHeader('x-netacea-api-key', this.apiKey)
    request.setHeader('x-netacea-client-ip', IP)

    const cookies = this.getHeaderValueOrDefault(request, 'cookie')
    const mitataCookie = this.readCookie('_mitata', cookies) ?? ''

    let userId = ''
    const cookieInfo = checkMitataCookie(mitataCookie, IP, this.secretKey ?? '')
    if (cookieInfo.isPrimaryHashValid) {
      userId = cookieInfo.mitata?.userId ?? ''
    }
    request.setHeader('x-netacea-userid', userId)
    request.route({ origin: 'mitigations' })
  }

  protected filterCookies (response: EW.EgressClientResponse): void {
    const resCookies = response.getHeader('set-cookie')
    const mitataCaptchaCookie = resCookies?.filter(cookie => cookie.startsWith('_mitatacaptcha'))
    response.setHeader('set-cookie', mitataCaptchaCookie ?? '')
  }

  protected removeNetaceaHeaders (response: EW.EgressClientResponse): void {
    response.removeHeader('x-netacea-match')
    response.removeHeader('x-netacea-mitigate')
    response.removeHeader('x-netacea-captcha')
    response.removeHeader('x-netacea-mitata-expiry')
    response.removeHeader('x-netacea-mitata-value')
    response.removeHeader('x-netacea-mitatacaptcha-expiry')
    response.removeHeader('x-netacea-mitatacaptcha-value')
  }
}
