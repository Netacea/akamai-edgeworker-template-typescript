/* eslint-disable max-lines */
import type {
  ComposeResultResponse,
  IngestArgs,
  InjectHeaders,
  InjectResponse,
  MakeRequestArgs,
  MakeRequestResponse,
  MitigateResponse,
  NetaceaBaseArgs,
  NetaceaMitigationResponse,
  WebLog,
  V2WebLog,
  NetaceaResponseBase
} from './NetaceaBase.types'
import {
  NetaceaIngestType,
  NetaceaLogVersion,
  NetaceaMitigationType
} from './NetaceaBase.enums'
import {
  netaceaHeaders, matchMap, mitigateMap,
  captchaMap, bestMitigationCaptchaMap,
  bestMitigationMap, mitigationTypes
} from './dictionary'
import {
  matchMitataCookie,
  createMitataCookie,
  checkMitataCookie,
  ingestIgnoredIpValue
} from './mitataCookie'
import NetaceaKinesis from '@netacea/kinesisingest'

const ONE_HOUR_IN_SECONDS = 60 * 60
const ONE_DAY_IN_SECONDS = ONE_HOUR_IN_SECONDS * 24

interface FindBestMitigationResponse {
  sessionStatus: string
  mitigation: string
  parts: NetaceaParts
}

interface NetaceaParts {
  match: number
  mitigate: number
  captcha: number
}

interface APICallResponse {
  status: number
  body?: any
}

interface MakeMitigateAPICallResponse extends NetaceaParts, APICallResponse {
  setCookie: string[]
  eventId?: string
  mitataMaxAge: number
}

type MakeCaptchaApiCallResponse = MakeMitigateAPICallResponse

interface ProcessMitigateRequestArgs {
  url: string
  method: string
  mitata: string | undefined
  mitataCaptcha: string | undefined
  clientIp: string
  userAgent: string
  getBodyFn: () => Promise<any>
}

function correctTimeout (timeout: number): number {
  return timeout <= 0 ? defaultTimeout : timeout
}

function correctRetries (retries: number): number {
  if (retries < 1) {
    return 1
  }
  return retries > maximumRetries ? maximumRetries : retries
}

function safeParseInt (value: string | number, defaultValue: number = 0): number {
  if (isNaN(value as number)) {
    return defaultValue
  }
  return parseInt(value as string)
}

const maximumRetries = 5
const defaultTimeout = 3000

function configureMitataExpiry (
  mitigationType: NetaceaMitigationType,
  expirySeconds: number | undefined
): number {
  if (expirySeconds === undefined) {
    return mitigationType === NetaceaMitigationType.INGEST ? ONE_HOUR_IN_SECONDS : 60
  }
  return expirySeconds
}

export default abstract class NetaceaBase<RequestArgs = any, Response = any> {
  protected apiKey: string
  protected secretKey?: string
  protected timeout: number
  protected retries: number
  protected captchaSiteKey?: string
  protected captchaSecretKey?: string
  protected ingestType: NetaceaIngestType
  protected readonly logVersion: NetaceaLogVersion
  protected mitataCookieExpirySeconds: number

  private readonly mitigationServiceUrl: string
  private readonly ingestServiceUrl: string
  protected readonly mitigationType: NetaceaMitigationType
  protected abstract makeRequest (args: MakeRequestArgs): Promise<MakeRequestResponse>
  protected abstract mitigate (args: RequestArgs): Promise<MitigateResponse<Response>>
  protected abstract inject (args: RequestArgs): Promise<InjectResponse>
  protected kinesis?: NetaceaKinesis
  abstract ingest (...args: any[]): Promise<any>
  abstract getCookieHeader (args: RequestArgs): string | null | undefined

  // eslint-disable-next-line max-lines-per-function
  constructor ({
    apiKey,
    secretKey,
    timeout = defaultTimeout,
    retries = maximumRetries,
    mitigationServiceUrl = 'https://mitigations.netacea.net',
    ingestServiceUrl = 'https://ingest.netacea.net',
    mitigationType = NetaceaMitigationType.INGEST,
    captchaSiteKey,
    captchaSecretKey,
    ingestType = NetaceaIngestType.HTTP,
    kinesis,
    logVersion,
    mitataCookieExpirySeconds
  }: NetaceaBaseArgs) {
    if (apiKey === null || apiKey === undefined) {
      throw new Error('apiKey is a required parameter')
    }
    this.apiKey = apiKey
    this.secretKey = secretKey
    this.mitigationServiceUrl = mitigationServiceUrl
    this.ingestServiceUrl = ingestServiceUrl
    this.mitigationType = mitigationType
    this.ingestType = ingestType ?? NetaceaIngestType.HTTP
    this.logVersion = logVersion ?? NetaceaLogVersion.V1
    if (this.ingestType === NetaceaIngestType.KINESIS) {
      if (kinesis === undefined) {
        // eslint-disable-next-line no-console
        console.warn(`NETACEA WARN: no kinesis args provided, when ingestType is ${this.ingestType}`)
      } else {
        this.kinesis = new NetaceaKinesis({
          ...kinesis,
          apiKey: this.apiKey
        })
      }
    }
    if (captchaSiteKey !== undefined || captchaSecretKey !== undefined) {
      this.captchaSiteKey = captchaSiteKey
      this.captchaSecretKey = captchaSecretKey
    }
    this.timeout = correctTimeout(timeout)
    this.retries = correctRetries(retries)

    this.mitataCookieExpirySeconds = configureMitataExpiry(mitigationType, mitataCookieExpirySeconds)
  }

  public async runMitigation (args: RequestArgs): Promise<NetaceaMitigationResponse<Response>> {
    try {
      switch (this.mitigationType) {
        case NetaceaMitigationType.MITIGATE:
          return await this.mitigate(args)
        case NetaceaMitigationType.INJECT:
          return await this.inject(args)
        case NetaceaMitigationType.INGEST:
          return this.processIngest(args)
        default:
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          throw new Error(`Netacea Error: Mitigation type ${this.mitigationType} not recognised`)
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Netacea FAILOPEN Error:', e)
      return {
        injectHeaders: {
          'x-netacea-captcha': '0',
          'x-netacea-match': '0',
          'x-netacea-mitigate': '0'
        },
        sessionStatus: ''
      }
    }
  }

  protected readCookie (cookieName: string, cookies: string | null | undefined): string | undefined {
    if (cookies === null || cookies === undefined) {
      return undefined
    }
    const re = new RegExp('[; ]' + cookieName + '=([^\\s;]*)')
    const cookieMatch = (' ' + cookies).match(re)
    if (cookieName !== null && cookieMatch !== null) return (cookieMatch[1])
    return undefined
  }

  protected async callIngest (args: IngestArgs): Promise<void> {
    const body = this.constructWebLog(args)
    if (this.ingestType === NetaceaIngestType.KINESIS) {
      if (this.kinesis === undefined) {
        // eslint-disable-next-line no-console
        console.error('Netacea Error: Unable to log as Kinesis has not been defined.')
        return
      }
      try {
        await this.kinesis.ingest({
          ...body,
          apiKey: this.apiKey
        }, this.makeRequest)
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('NETACEA Error: ', (e as Error).message)
      }
    } else {
      const headers = {
        'X-Netacea-API-Key': this.apiKey,
        'content-type': 'application/json'
      }
      const res = await this.makeIngestApiCall(headers, body)
      if (res.status !== 200) {
        throw this.APIError(res)
      }
    }
  }

  private async makeIngestApiCall (headers: {[key: string]: string}, body: WebLog | V2WebLog): Promise<any> {
    return await this.makeRequest({
      host: this.ingestServiceUrl,
      method: 'POST',
      path: '/',
      headers,
      body: JSON.stringify(body),
      timeout: this.timeout
    })
  }

  private constructV2WebLog ({
    ip,
    userAgent,
    status,
    method,
    path,
    protocol,
    referer,
    bytesSent,
    requestTime,
    mitataCookie,
    sessionStatus,
    integrationType,
    integrationVersion
  }: IngestArgs): V2WebLog {
    const now = new Date()
    // Paths must be prefixed with '/'
    if (path[0] !== '/') {
      path = `/${path}`
    }
    let actualQuery: string | undefined
    const splitPath = path.split('?')
    if (splitPath.length > 1) {
      actualQuery = `?${splitPath[1]}`
    }
    const actualPath: string = splitPath[0]
    const userId = matchMitataCookie(mitataCookie)?.userId
    const log: V2WebLog = {
      status,
      method,
      'bytes_sent': safeParseInt(bytesSent),
      'referrer': referer === '' ? undefined : referer,
      'request': `${method} ${actualPath}${actualQuery ?? ''} ${protocol}`,
      'request_time': safeParseInt(requestTime),
      'integration_type': integrationType,
      'integration_version': integrationVersion,
      'client': ip,
      'user_agent': userAgent,
      'bc_type': sessionStatus === '' ? undefined : sessionStatus,
      'hour': now.getUTCHours(),
      'minute': now.getUTCMinutes(),
      // '2021-08-04T14:22:41.155Z' = toISOString()
      '@timestamp': now.toISOString().replace('Z', '+00:00'),
      'path': actualPath,
      protocol,
      'query': actualQuery,
      'user_id': userId
    }
    return log
  }

  private constructV1WebLog ({
    ip,
    userAgent,
    status,
    method,
    path,
    protocol,
    referer,
    bytesSent,
    requestTime,
    mitataCookie,
    sessionStatus,
    integrationType,
    integrationVersion
  }: IngestArgs): WebLog {
    const timestamp = new Date().toUTCString()
    return {
      Request: `${method} ${path} ${protocol}`,
      TimeLocal: timestamp,
      RealIp: ip,
      UserAgent: userAgent,
      Status: status,
      RequestTime: requestTime?.toString(),
      BytesSent: bytesSent?.toString(),
      Referer: referer === '' ? '-' : referer,
      NetaceaUserIdCookie: mitataCookie ?? '',
      NetaceaMitigationApplied: sessionStatus ?? '',
      IntegrationType: integrationType ?? '',
      IntegrationVersion: integrationVersion ?? ''
    }
  }

  protected constructWebLog (args: IngestArgs): WebLog | V2WebLog {
    args.bytesSent = args.bytesSent === '' ? '0' : args.bytesSent
    if (this.logVersion === NetaceaLogVersion.V2) {
      return this.constructV2WebLog(args)
    }
    return this.constructV1WebLog(args)
  }

  protected async check (
    netaceaCookie: string | undefined,
    clientIP: string,
    userAgent: string,
    captchaCookie?: string
  ): Promise<ComposeResultResponse> {
    let status: number, match: number, mitigate: number, captcha: number,
      body: string | undefined, setCookie: string[], eventId: string | undefined
    if (this.secretKey === undefined) {
      throw new Error('Secret key is required to mitigate')
    }
    const cookieInfo = checkMitataCookie(netaceaCookie, clientIP, this.secretKey)
    if (!cookieInfo.isPrimaryHashValid || cookieInfo.requiresReissue) {
      // Get latest mitigation information
      const result = await this.makeMitigateAPICall(
        cookieInfo.mitata?.userId,
        clientIP,
        userAgent,
        captchaCookie
      )
      status = result.status
      match = result.match
      mitigate = result.mitigate
      captcha = result.captcha
      body = result.body
      setCookie = [
        this.createMitata(clientIP, cookieInfo.mitata?.userId, match, mitigate, captcha, result.mitataMaxAge)
      ]
      eventId = result.eventId
    } else {
      status = -1
      match = cookieInfo.match
      mitigate = cookieInfo.mitigate
      captcha = cookieInfo.captcha
      body = undefined
      setCookie = []
    }
    return this.composeResult(body, setCookie, status, match, mitigate, captcha, false, eventId)
  }

  protected createMitata (
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
    return this.buildCookieFromValues('_mitata', mitataValue, maxAge, '/')
  }

  private async processCaptcha (
    netaceaCookie: string | undefined,
    clientIP: string,
    userAgent: string,
    captchaData: any
  ): Promise<ComposeResultResponse> {
    const {
      status, match, mitigate, captcha, body, setCookie
    } = await this.makeCaptchaAPICall(netaceaCookie, clientIP, userAgent, captchaData)
    return this.composeResult(body, setCookie, status, match, mitigate, captcha, true)
  }

  private getMitataCaptchaFromHeaders (headers: {[key: string]: string}): string | undefined {
    if (Object.prototype.hasOwnProperty.call(headers, netaceaHeaders.mitataCaptcha)) {
      const mitataCaptcha = headers[netaceaHeaders.mitataCaptcha]
      const mitataCaptchaExpiry = parseInt(headers[netaceaHeaders.mitataCaptchaExpiry])
      const mitataCaptchaCookie = this.buildCookieFromValues(
        '_mitatacaptcha',
        mitataCaptcha,
        mitataCaptchaExpiry
      )

      if (mitataCaptchaCookie !== undefined) {
        return mitataCaptchaCookie
      }
    }
    return undefined
  }

  private async makeCaptchaAPICall (
    netaceaCookie: string | undefined,
    clientIP: string,
    userAgent: string,
    captchaData: any
  ): Promise<MakeCaptchaApiCallResponse> {
    const headers: {[key: string]: string} = {
      'X-Netacea-API-Key': this.apiKey,
      'X-Netacea-Client-IP': clientIP,
      'user-agent': userAgent,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    }

    const mitata = matchMitataCookie(netaceaCookie)
    if (mitata !== undefined) {
      headers['X-Netacea-UserId'] = mitata.userId
    }

    if (this.captchaSiteKey !== undefined && this.captchaSecretKey !== undefined) {
      headers['X-Netacea-Captcha-Site-Key'] = this.captchaSiteKey
      headers['X-Netacea-Captcha-Secret-Key'] = this.captchaSecretKey
    }

    const res = await this.makeRequest({
      host: this.mitigationServiceUrl,
      path: '/AtaVerifyCaptcha',
      headers,
      method: 'POST',
      body: captchaData,
      timeout: this.timeout
    })
    return this.getApiCallResponseFromResponse(res, mitata?.userId, clientIP)
  }

  private getApiCallResponseFromResponse (
    response: MakeRequestResponse,
    userId: string | undefined,
    clientIP: string
  ): MakeMitigateAPICallResponse {
    if (response.status !== 200) {
      throw this.APIError(response)
    }
    const match = parseInt(response.headers[netaceaHeaders.match])
    const mitigate = parseInt(response.headers[netaceaHeaders.mitigate])
    const captcha = parseInt(response.headers[netaceaHeaders.captcha])

    let mitataMaxAge = parseInt(response.headers[netaceaHeaders.mitataExpiry])
    if (isNaN(mitataMaxAge)) {
      mitataMaxAge = 86400
    }

    const mitata = this.createMitata(clientIP, userId, match, mitigate, captcha)
    const mitataCaptcha = this.getMitataCaptchaFromHeaders(response.headers)

    const setCookie = [
      mitata,
      mitataCaptcha
    ].filter(c => c !== undefined) as string[]

    const eventId: string | undefined = response.headers[netaceaHeaders.eventId]
    return {
      status: response.status,
      match,
      mitigate,
      captcha,
      setCookie,
      body: response.body,
      eventId,
      mitataMaxAge
    }
  }

  private buildCookieFromValues (
    cookieName: string,
    value: string,
    maxAge: number,
    path = '/'
  ): string {
    return `${cookieName}=${value}; Max-Age=${maxAge}; Path=${path}`
  }

  private buildCookieHeader (cookies: {[key: string]: string | undefined}): string {
    let cookiestr = ''
    let separator = ''
    for (const cookie in cookies) {
      const cookieValue = cookies[cookie]
      if (cookieValue !== undefined) {
        cookiestr = `${cookiestr}${separator}${cookie}=${cookieValue}`
        separator = '; '
      }
    }
    return cookiestr
  }

  private async makeMitigateAPICall (
    userId: string | undefined,
    clientIP: string,
    userAgent: string,
    captchaCookie: string | undefined
  ): Promise<MakeMitigateAPICallResponse> {
    const headers: {[key: string]: string} = {
      'X-Netacea-API-Key': this.apiKey,
      'X-Netacea-Client-IP': clientIP,
      'user-agent': userAgent,
      'cookie': this.buildCookieHeader({
        _mitatacaptcha: captchaCookie
      })
    }

    if (userId !== undefined) {
      headers['X-Netacea-UserId'] = userId
    }

    if (this.captchaSiteKey !== undefined && this.captchaSecretKey !== undefined) {
      headers['X-Netacea-Captcha-Site-Key'] = this.captchaSiteKey
      headers['X-Netacea-Captcha-Secret-Key'] = this.captchaSecretKey
    }

    const res = await this.makeRequest({
      host: this.mitigationServiceUrl,
      path: '/',
      headers,
      method: 'GET',
      timeout: this.timeout
    })

    return this.getApiCallResponseFromResponse(res, userId, clientIP)
  }

  private composeResult (body: string | undefined,
    setCookie: string[],
    status: number,
    match: number,
    mitigate: number,
    captcha: number,
    isCaptchaPost: boolean,
    eventId?: string
  ): ComposeResultResponse {
    const bestMitigation = this.findBestMitigation(match, mitigate, captcha, isCaptchaPost)
    const result: ComposeResultResponse = {
      body,
      apiCallStatus: status,
      setCookie,
      sessionStatus: bestMitigation.sessionStatus,
      mitigation: bestMitigation.mitigation,
      mitigated: [
        mitigationTypes.block,
        mitigationTypes.captcha,
        mitigationTypes.captchaPass
      ].includes(bestMitigation.mitigation)
    }
    if (this.mitigationType === NetaceaMitigationType.INJECT) {
      const injectHeaders: InjectHeaders = {
        'x-netacea-match': bestMitigation.parts.match.toString(),
        'x-netacea-mitigate': bestMitigation.parts.mitigate.toString(),
        'x-netacea-captcha': bestMitigation.parts.captcha.toString()
      }
      if (eventId !== undefined) {
        injectHeaders['x-netacea-event-id'] = eventId
      }
      result.injectHeaders = injectHeaders
    }
    return result
  }

  protected findBestMitigation (match: number,
    mitigate: number,
    captcha: number,
    isCaptchaPost: boolean
  ): FindBestMitigationResponse {
    const UNKNOWN = 'unknown'
    if (!isCaptchaPost) {
      if (captcha === 2) {
        captcha = 4
      } else if (captcha === 3) {
        captcha = 5
      }
    }

    let sessionStatus = matchMap[match] ?? (UNKNOWN + '_')
    sessionStatus += mitigateMap[mitigate] ?? UNKNOWN
    let mitigation = bestMitigationMap[mitigate]
    if (captcha !== 0) {
      sessionStatus += ',' + (captchaMap[captcha] ?? UNKNOWN)
      const bestCaptchaMitigation = bestMitigationCaptchaMap[captcha]
      if (bestCaptchaMitigation !== undefined) {
        mitigation = bestCaptchaMitigation
      }
    }
    if (this.mitigationType === NetaceaMitigationType.INJECT) {
      mitigation = mitigationTypes.none
    }
    return {
      sessionStatus,
      mitigation,
      parts: {
        match,
        mitigate,
        captcha
      }
    }
  }

  protected APIError (response: APICallResponse): Error {
    let message = 'Unknown error'
    switch (response.status) {
      case 403:
        message = 'Invalid credentials'
        break
      case 500:
        message = 'Server error'
        break
      case 502:
        message = 'Bad Gateway'
        break
      case 503:
        message = 'Service Unavailable'
        break
      case 400:
        message = 'Invalid request'
        break
    }
    return new Error(`Error reaching Netacea API (${message}), status: ${response.status}`)
  }

  protected isUrlCaptchaPost (url: string, method: string): boolean {
    return url.includes('/AtaVerifyCaptcha') && method.toLowerCase() === 'post'
  }

  protected async processMitigateRequest (args: ProcessMitigateRequestArgs): Promise<ComposeResultResponse> {
    return await (this.isUrlCaptchaPost(args.url, args.method)
      ? this.processCaptcha(args.mitata, args.clientIp, args.userAgent, await args.getBodyFn())
      : this.check(args.mitata, args.clientIp, args.userAgent, args.mitataCaptcha)
    )
  }

  protected setIngestOnlyMitataCookie (
    userId: string | undefined
  ): NetaceaResponseBase {
    const mitataCookie = this.createMitata(
      ingestIgnoredIpValue,
      userId,
      0, 0, 0,
      ONE_DAY_IN_SECONDS
    )

    return {
      sessionStatus: '',
      setCookie: [mitataCookie]
    }
  }

  protected processIngest (args: RequestArgs): NetaceaResponseBase {
    if (this.secretKey === undefined) {
      throw new Error('Secret key is required for ingest')
    }

    const cookies = this.getCookieHeader(args)
    const netaceaCookie = this.readCookie('_mitata', cookies)

    const cookieInfo = checkMitataCookie(netaceaCookie, ingestIgnoredIpValue, this.secretKey)
    if (!cookieInfo.isPrimaryHashValid) {
      return this.setIngestOnlyMitataCookie(undefined)
    }

    if (cookieInfo.requiresReissue) {
      return this.setIngestOnlyMitataCookie(cookieInfo.mitata?.userId)
    }

    return {
      sessionStatus: '',
      setCookie: []
    }
  }
}
